"""Phase 3 candidate generation: for every Google Place, find a reasonable
set of SunBiz candidates (both sunbiz_corp and sunbiz_fic) via blocking.

Blocking keys, per the approved architecture:
  - ZIP        (hard filter -- SunBiz was already ingested pre-filtered to
                the target zip set in Phase 1, so this is implicit in every
                lookup below rather than a separate check)
  - street number match within that zip (in practice: full normalized
    address match -- number AND street name. Number alone is a weak signal
    since house numbers restart on every street; see MIN_SHARED_TOKENS_
    WITHOUT_STREET_MATCH's docstring for the false-positive this caused
    before the fix)
  - significant name token overlap within that zip

A candidate is kept if EITHER the full address matches OR at least
MIN_SHARED_TOKENS_WITHOUT_STREET_MATCH significant name tokens overlap (zip
alone, or a single shared token alone, is too broad to be "reasonable" per
the acceptance criterion -- a zip has tens of thousands of SunBiz rows).
Google Places drives the loop; every place gets a candidate row count (even
zero), and every SunBiz row not picked up by any place is still sitting in
sunbiz_corp/sunbiz_fic untouched -- nothing is deleted, so "retain unmatched
SunBiz" falls out for free. `has_candidate_match` flags are added so that
retention is queryable without a join.

Run from the `data/` directory:  python phase3_candidates.py
"""
import collections
import sqlite3
import sys
import time

# See phase1_ingest.py for why: Windows console cp1252 can't encode every
# real business name, and would otherwise crash the run on the first one.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = "ingest.db"
BATCH_SIZE = 5000

# A token whose postings within a single zip exceed this count is too
# common to be a useful blocking key there (e.g. a generic word that
# happens to appear in hundreds of unrelated SunBiz filings in one zip) --
# skipped for blocking to keep candidate sets "reasonable", counted and
# reported rather than silently dropped.
TOKEN_MAX_POSTINGS_PER_ZIP = 300

# A single shared token is not enough evidence on its own -- measured on the
# real data (see conversation record), one shared common-but-not-quite-
# stopword-list word (e.g. "BAY" from "Biscayne Bay Company") pulled in
# candidates from six unrelated Google places, and the run overall produced
# 3.48M candidate rows for 8,395 places (~415/place -- not "reasonable" by
# the Phase 3 acceptance bar). Requiring either a street-number match or 2+
# shared significant tokens is a second, general-purpose backstop on top of
# the geo/category stopword list in normalize.py -- it doesn't rely on the
# stopword list having caught every possible generic word.
MIN_SHARED_TOKENS_WITHOUT_STREET_MATCH = 2


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


SCHEMA = """
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id TEXT NOT NULL,
    source_table TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    block_address_match INTEGER NOT NULL,
    block_shared_tokens TEXT NOT NULL,
    block_reason TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidates_place ON candidates(place_id);
CREATE INDEX IF NOT EXISTS idx_candidates_source_doc ON candidates(source_table, doc_number);
"""


def build_schema(conn):
    # candidates is fully derived/regenerable (not raw source data) --
    # drop and recreate rather than trying to migrate columns across schema
    # changes between re-runs.
    conn.execute("DROP TABLE IF EXISTS candidates")
    conn.executescript(SCHEMA)
    conn.commit()


def _add_column_if_missing(conn, table, column, sqltype):
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {sqltype}")
    conn.commit()


# ---------------------------------------------------------------------------
# Index building (one pass over each SunBiz source table)
# ---------------------------------------------------------------------------

def _load_source_rows(conn, table):
    return conn.execute(
        f"SELECT doc_number, zip5, street_number_norm, street_norm, unit_norm, name_tokens FROM {table}"
    ).fetchall()


def _build_indexes(rows):
    """Returns (street_index, token_index, skipped_tokens_count).
    street_index: (zip5, street_number_norm, street_norm, unit_norm) ->
                  [doc_number, ...] -- keyed on the FULL normalized address
                  INCLUDING unit. House numbers restart on every street, so
                  number alone is nearly meaningless within a zip (measured:
                  it matched a business on Salzedo St to an unrelated one on
                  a different street that just happened to also start with
                  3001). Unit matters just as much: a single large office
                  building with dozens of real, distinct tenants in
                  different suites was collapsing into one bucket without it
                  -- one SunBiz filing at "8585 Sunset Dr" (no unit parsed)
                  was matching 7 unrelated medical practices in different
                  suites of that same building (see conversation record).
                  Google Places has no separate unit field, so it's
                  extracted from formatted_address in Phase 2
                  (extract_unit_from_text) -- "" is itself a meaningful
                  bucket (no suite indicated on either side), not a
                  wildcard.
    token_index:  zip5 -> token -> [doc_number, ...]  (over-common tokens dropped)
    """
    street_index = collections.defaultdict(list)
    raw_token_index = collections.defaultdict(lambda: collections.defaultdict(list))

    for doc_number, zip5, street_number_norm, street_norm, unit_norm, name_tokens in rows:
        if street_number_norm and street_norm:
            street_index[(zip5, street_number_norm, street_norm, unit_norm or "")].append(doc_number)
        if name_tokens:
            for tok in name_tokens.split(" "):
                raw_token_index[zip5][tok].append(doc_number)

    token_index = collections.defaultdict(dict)
    skipped = 0
    for zip5, toks in raw_token_index.items():
        for tok, postings in toks.items():
            if len(postings) > TOKEN_MAX_POSTINGS_PER_ZIP:
                skipped += 1
                continue
            token_index[zip5][tok] = postings

    return street_index, token_index, skipped


# ---------------------------------------------------------------------------
# Candidate generation for one place against one source table's indexes
# ---------------------------------------------------------------------------

def _candidates_for_place(zip5, street_number_norm, street_norm, unit_norm, name_tokens,
                           street_index, token_index):
    """Returns {doc_number: {"address": bool, "tokens": set(str)}} for hits
    that clear the bar: a full address match (number + street name + unit)
    on its own is sufficient, but token overlap alone needs >=
    MIN_SHARED_TOKENS_WITHOUT_STREET_MATCH tokens (see its docstring for why
    one token isn't enough evidence).
    """
    hits = {}
    if street_number_norm and street_norm:
        for doc in street_index.get((zip5, street_number_norm, street_norm, unit_norm or ""), ()):
            hits.setdefault(doc, {"address": False, "tokens": set()})["address"] = True
    if name_tokens:
        zip_tokens = token_index.get(zip5, {})
        for tok in name_tokens.split(" "):
            for doc in zip_tokens.get(tok, ()):
                hits.setdefault(doc, {"address": False, "tokens": set()})["tokens"].add(tok)
    return {
        doc: hit for doc, hit in hits.items()
        if hit["address"] or len(hit["tokens"]) >= MIN_SHARED_TOKENS_WITHOUT_STREET_MATCH
    }


def _reason_string(hit):
    parts = []
    if hit["address"]:
        parts.append("address")
    if hit["tokens"]:
        parts.append(f"tokens:{','.join(sorted(hit['tokens']))}")
    return "+".join(parts) if parts else "none"


def generate_candidates(conn):
    places = conn.execute(
        "SELECT place_id, zip5, street_number_norm, street_norm, unit_norm, name_tokens FROM places"
    ).fetchall()

    corp_rows = _load_source_rows(conn, "sunbiz_corp")
    fic_rows = _load_source_rows(conn, "sunbiz_fic")
    log(f"indexing sunbiz_corp ({len(corp_rows)} rows) and sunbiz_fic ({len(fic_rows)} rows)")

    corp_street_idx, corp_token_idx, corp_skipped = _build_indexes(corp_rows)
    fic_street_idx, fic_token_idx, fic_skipped = _build_indexes(fic_rows)
    log(f"sunbiz_corp: skipped {corp_skipped} over-common tokens (>{TOKEN_MAX_POSTINGS_PER_ZIP} postings/zip)")
    log(f"sunbiz_fic: skipped {fic_skipped} over-common tokens (>{TOKEN_MAX_POSTINGS_PER_ZIP} postings/zip)")

    matched_corp_docs = set()
    matched_fic_docs = set()
    places_with_candidates = 0
    batch = []
    total_candidates = 0

    for i, (place_id, zip5, street_number_norm, street_norm, unit_norm, name_tokens) in enumerate(places):
        if i and i % 2000 == 0:
            log(f"  processed {i}/{len(places)} places, {total_candidates} candidates so far")
        corp_hits = _candidates_for_place(
            zip5, street_number_norm, street_norm, unit_norm, name_tokens, corp_street_idx, corp_token_idx)
        fic_hits = _candidates_for_place(
            zip5, street_number_norm, street_norm, unit_norm, name_tokens, fic_street_idx, fic_token_idx)

        if corp_hits or fic_hits:
            places_with_candidates += 1

        for doc_number, hit in corp_hits.items():
            matched_corp_docs.add(doc_number)
            batch.append((place_id, "sunbiz_corp", doc_number, int(hit["address"]),
                          " ".join(sorted(hit["tokens"])), _reason_string(hit)))
            total_candidates += 1
        for doc_number, hit in fic_hits.items():
            matched_fic_docs.add(doc_number)
            batch.append((place_id, "sunbiz_fic", doc_number, int(hit["address"]),
                          " ".join(sorted(hit["tokens"])), _reason_string(hit)))
            total_candidates += 1

        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "INSERT INTO candidates (place_id, source_table, doc_number, "
                "block_address_match, block_shared_tokens, block_reason) "
                "VALUES (?, ?, ?, ?, ?, ?)", batch)
            batch.clear()

    if batch:
        conn.executemany(
            "INSERT INTO candidates (place_id, source_table, doc_number, "
            "block_address_match, block_shared_tokens, block_reason) "
            "VALUES (?, ?, ?, ?, ?, ?)", batch)
    conn.commit()

    log(f"generated {total_candidates} candidate rows for {places_with_candidates}/{len(places)} places")

    # Retain-unmatched-SunBiz bookkeeping: flag which corp/fic rows were
    # ever picked up as a candidate for any place. Nothing is deleted from
    # sunbiz_corp/sunbiz_fic regardless -- this just makes "was this
    # business ever surfaced as a candidate" queryable without a join.
    _add_column_if_missing(conn, "sunbiz_corp", "has_candidate_match", "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "sunbiz_fic", "has_candidate_match", "INTEGER DEFAULT 0")
    conn.execute("UPDATE sunbiz_corp SET has_candidate_match = 0")
    conn.execute("UPDATE sunbiz_fic SET has_candidate_match = 0")
    conn.executemany(
        "UPDATE sunbiz_corp SET has_candidate_match = 1 WHERE doc_number = ?",
        [(d,) for d in matched_corp_docs],
    )
    conn.executemany(
        "UPDATE sunbiz_fic SET has_candidate_match = 1 WHERE doc_number = ?",
        [(d,) for d in matched_fic_docs],
    )
    conn.commit()

    return {
        "n_places": len(places),
        "places_with_candidates": places_with_candidates,
        "total_candidates": total_candidates,
        "matched_corp_docs": len(matched_corp_docs),
        "matched_fic_docs": len(matched_fic_docs),
    }


# ---------------------------------------------------------------------------
# Summary / acceptance evidence
# ---------------------------------------------------------------------------

def print_summary(conn, stats):
    print("\n" + "#" * 78)
    print("# PHASE 3 CANDIDATE GENERATION SUMMARY")
    print("#" * 78)

    print(f"\nplaces: {stats['n_places']}")
    print(f"places with >=1 candidate: {stats['places_with_candidates']} "
          f"({stats['places_with_candidates'] / stats['n_places'] * 100:.1f}%)")
    print(f"places with 0 candidates: {stats['n_places'] - stats['places_with_candidates']}")
    print(f"total candidate rows: {stats['total_candidates']}")

    n_corp = conn.execute("SELECT COUNT(*) FROM sunbiz_corp").fetchone()[0]
    n_fic = conn.execute("SELECT COUNT(*) FROM sunbiz_fic").fetchone()[0]
    print(f"\nsunbiz_corp matched (retained, surfaced as a candidate): "
          f"{stats['matched_corp_docs']}/{n_corp} ({stats['matched_corp_docs'] / n_corp * 100:.1f}%)")
    print(f"sunbiz_corp unmatched (retained, never surfaced): {n_corp - stats['matched_corp_docs']}")
    print(f"sunbiz_fic matched: {stats['matched_fic_docs']}/{n_fic} "
          f"({stats['matched_fic_docs'] / n_fic * 100:.1f}%)")
    print(f"sunbiz_fic unmatched (retained, never surfaced): {n_fic - stats['matched_fic_docs']}")

    print("\ncandidates-per-place distribution:")
    dist = collections.Counter()
    counts_by_place = dict(conn.execute(
        "SELECT place_id, COUNT(*) FROM candidates GROUP BY place_id"
    ).fetchall())
    for place_id, in conn.execute("SELECT place_id FROM places"):
        dist[counts_by_place.get(place_id, 0)] += 1
    for n in sorted(dist)[:15]:
        print(f"  {n:3d} candidates: {dist[n]} places")
    if len(dist) > 15:
        print(f"  ... ({len(dist) - 15} more distinct candidate-counts, up to {max(dist)})")

    print("\n--- sample: places with candidates ---")
    rows = conn.execute(
        "SELECT p.name, p.formatted_address, c.source_table, c.doc_number, c.block_reason, s.name "
        "FROM places p JOIN candidates c ON c.place_id = p.place_id "
        "JOIN sunbiz_corp s ON s.doc_number = c.doc_number AND c.source_table='sunbiz_corp' "
        "LIMIT 8"
    ).fetchall()
    for name, addr, source, doc, reason, sunbiz_name in rows:
        print(f"  GOOGLE: {name!r:45} @ {addr}")
        print(f"    -> {source} {doc}  {sunbiz_name!r}  [{reason}]")

    print("\n--- sample: places with ZERO candidates ---")
    rows = conn.execute(
        "SELECT p.name, p.formatted_address, p.zip5 FROM places p "
        "WHERE p.place_id NOT IN (SELECT DISTINCT place_id FROM candidates) LIMIT 8"
    ).fetchall()
    for name, addr, zip5 in rows:
        print(f"  {name!r:45} @ {addr}  (zip5={zip5!r})")

    print("\n" + "#" * 78)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    build_schema(conn)

    stats = generate_candidates(conn)
    print_summary(conn, stats)
    conn.close()


if __name__ == "__main__":
    main()
