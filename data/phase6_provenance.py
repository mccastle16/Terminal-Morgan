"""Phase 6 provenance: the final reviewable output. Consolidates every
decision from Phases 3-5 into one table per Google Place, with raw source
values kept clearly separate from curated/derived values, full reason-code
evidence carried through, and source attribution on every field group --
so any status can be traced back to exactly what produced it.

Also produces the reciprocal report: SunBiz businesses that were retained
(never deleted, per Phase 3) but never surfaced as a candidate for any
Google place -- a real gap list, since a SunBiz filing with no matching
Google Places presence may be a business the Chamber doesn't know is
missing from its digital footprint, or may just be a non-storefront
registration (holding company, registered-agent artifact, etc.) --
`is_mailbox_or_agent` is included so that distinction is visible, not
guessed at.

Exports both as CSV (the literal "reviewable output" a human opens) in
addition to the SQLite tables (for further querying).

Run from the `data/` directory:  python phase6_provenance.py
"""
import csv
import sqlite3
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = "ingest.db"
VALIDATION_REPORT_CSV = "validation_report.csv"
UNMATCHED_SUNBIZ_CSV = "sunbiz_unmatched_report.csv"

# Confidence dimensions below this are "worth a second look" even for an
# otherwise LIKELY_MATCH -- e.g. a mailbox/agent address or a lapsed SunBiz
# filing shouldn't quietly pass as fully verified just because the name and
# address text lined up.
REVIEW_THRESHOLD = 0.5


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


SCHEMA = """
CREATE TABLE IF NOT EXISTS validation_report (
    place_id TEXT PRIMARY KEY,

    -- RAW: Google Places, unmodified
    google_name TEXT,
    google_formatted_address TEXT,
    google_phone TEXT,
    google_website TEXT,
    google_business_status TEXT,
    google_rating REAL,
    google_user_rating_count INTEGER,

    -- RAW: matched SunBiz record, unmodified (NULL if no candidate at all)
    sunbiz_source_table TEXT,
    sunbiz_doc_number TEXT,
    sunbiz_name TEXT,
    sunbiz_status TEXT,
    sunbiz_address_raw TEXT,

    -- CURATED / DERIVED: nothing here overwrites a raw value above: every
    -- decision is a NEW field, so a reviewer can always compare "what the
    -- sources said" against "what the pipeline concluded"
    validation_status TEXT NOT NULL,
    match_classification TEXT,
    match_confidence REAL,
    entity_confidence REAL,
    location_confidence REAL,
    operational_confidence REAL,

    -- EVIDENCE: reason codes from every phase that contributed to the
    -- decision above, concatenated so the full trail is in one place
    block_reason TEXT,
    match_reason_codes TEXT,
    entity_reason_codes TEXT,
    location_reason_codes TEXT,
    operational_reason_codes TEXT,

    -- SOURCE ATTRIBUTION
    source_attribution TEXT NOT NULL
);
"""

SOURCE_ATTRIBUTION = (
    "google_*: Google Places API (combined.csv), Phase 1 raw ingest | "
    "sunbiz_*: FL Division of Corporations cordata/ficdata extract, Phase 1 raw ingest | "
    "match_classification/confidence/*_reason_codes: Phase 4 deterministic scoring "
    "(phase4_matching.py) + Phase 5 confidence scoring (phase5_confidence.py), fully "
    "reproducible from the raw fields above, no LLM/manual input | "
    "validation_status: Phase 6 rollup of the above (phase6_provenance.py)"
)


def build_schema(conn):
    conn.execute("DROP TABLE IF EXISTS validation_report")
    conn.executescript(SCHEMA)
    conn.commit()


def _validation_status(best_classification, m, e, l, o):
    if best_classification is None:
        return "NO_SUNBIZ_CANDIDATE"
    if best_classification == "NO_MATCH":
        return "NO_MATCH"
    if best_classification == "AMBIGUOUS":
        return "AMBIGUOUS_NEEDS_REVIEW"
    # LIKELY_MATCH from here down
    weak_dims = [v for v in (e, l, o) if v is not None and v < REVIEW_THRESHOLD]
    if weak_dims:
        return "LIKELY_MATCH_NEEDS_REVIEW"
    return "VERIFIED_MATCH"


def build_validation_report(conn):
    places = conn.execute(
        "SELECT place_id, name, formatted_address, phone, website, business_status, "
        "rating, user_rating_count FROM places"
    ).fetchall()

    summaries = {r[0]: r[1:] for r in conn.execute(
        "SELECT place_id, best_source_table, best_doc_number, best_classification "
        "FROM place_match_summary"
    )}
    confidences = {r[0]: r[1:] for r in conn.execute(
        "SELECT place_id, source_table, doc_number, match_confidence, entity_confidence, "
        "location_confidence, operational_confidence, match_reason_codes, entity_reason_codes, "
        "location_reason_codes, operational_reason_codes FROM confidence_scores"
    )}
    block_reasons = {}
    for place_id, source_table, doc_number, block_reason in conn.execute(
        "SELECT place_id, source_table, doc_number, block_reason FROM candidates"
    ):
        block_reasons[(place_id, source_table, doc_number)] = block_reason

    corp = {r[0]: r[1:] for r in conn.execute(
        "SELECT doc_number, name, status, princ_addr1, princ_addr2, princ_city, princ_state, princ_zip "
        "FROM sunbiz_corp"
    )}
    fic = {r[0]: r[1:] for r in conn.execute(
        "SELECT doc_number, fic_name, status, addr1, addr2, city, state, zip "
        "FROM sunbiz_fic"
    )}
    sources = {"sunbiz_corp": corp, "sunbiz_fic": fic}

    rows = []
    for (place_id, name, addr, phone, website, business_status, rating, rating_count) in places:
        summary = summaries.get(place_id)
        sunbiz_source, sunbiz_doc, best_class = (None, None, None)
        sunbiz_name = sunbiz_status = sunbiz_addr_raw = None
        m = e = l = o = None
        match_reasons = entity_reasons = loc_reasons = op_reasons = None
        block_reason = None

        if summary:
            sunbiz_source, sunbiz_doc, best_class = summary
            src = sources.get(sunbiz_source, {})
            rec = src.get(sunbiz_doc)
            if rec:
                sunbiz_name, sunbiz_status = rec[0], rec[1]
                sunbiz_addr_raw = ", ".join(x for x in rec[2:] if x)
            block_reason = block_reasons.get((place_id, sunbiz_source, sunbiz_doc))

            conf = confidences.get(place_id)
            if conf:
                (conf_source, conf_doc, m, e, l, o,
                 match_reasons, entity_reasons, loc_reasons, op_reasons) = conf

        status = _validation_status(best_class, m, e, l, o)

        rows.append((
            place_id, name, addr, phone, website, business_status, rating, rating_count,
            sunbiz_source, sunbiz_doc, sunbiz_name, sunbiz_status, sunbiz_addr_raw,
            status, best_class, m, e, l, o,
            block_reason, match_reasons, entity_reasons, loc_reasons, op_reasons,
            SOURCE_ATTRIBUTION,
        ))

    conn.executemany(
        "INSERT INTO validation_report VALUES (" + ",".join("?" * 25) + ")", rows
    )
    conn.commit()
    return rows


def build_unmatched_sunbiz(conn):
    rows = []
    for doc_number, name, status, addr1, addr2, city, state, zip5, is_mailbox in conn.execute(
        "SELECT doc_number, name, status, princ_addr1, princ_addr2, princ_city, princ_state, "
        "zip5, is_mailbox_or_agent FROM sunbiz_corp WHERE has_candidate_match = 0"
    ):
        rows.append(("sunbiz_corp", doc_number, name, status,
                      ", ".join(x for x in (addr1, addr2, city, state, zip5) if x), bool(is_mailbox)))
    for doc_number, name, status, addr1, addr2, city, state, zip5, is_mailbox in conn.execute(
        "SELECT doc_number, fic_name, status, addr1, addr2, city, state, "
        "zip5, is_mailbox_or_agent FROM sunbiz_fic WHERE has_candidate_match = 0"
    ):
        rows.append(("sunbiz_fic", doc_number, name, status,
                      ", ".join(x for x in (addr1, addr2, city, state, zip5) if x), bool(is_mailbox)))
    return rows


def export_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def print_summary(conn, report_rows, unmatched_rows):
    print("\n" + "#" * 78)
    print("# PHASE 6 PROVENANCE / REVIEWABLE OUTPUT SUMMARY")
    print("#" * 78)

    print(f"\nvalidation_report: {len(report_rows)} rows (one per Google place) -> {VALIDATION_REPORT_CSV}")
    status_counts = {}
    for r in report_rows:
        status_counts[r[13]] = status_counts.get(r[13], 0) + 1
    for status, n in sorted(status_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {status:28} {n:6d}  ({n / len(report_rows) * 100:.1f}%)")

    print(f"\nsunbiz_unmatched_report: {len(unmatched_rows)} rows -> {UNMATCHED_SUNBIZ_CSV}")
    n_mailbox = sum(1 for r in unmatched_rows if r[5])
    print(f"  of which flagged mailbox/registered-agent (not a distinct physical business): {n_mailbox}")
    print(f"  of which NOT flagged (real gap candidates -- may be genuinely missing from Google Places): "
          f"{len(unmatched_rows) - n_mailbox}")

    print("\n--- sample: VERIFIED_MATCH ---")
    for r in [x for x in report_rows if x[13] == "VERIFIED_MATCH"][:5]:
        print(f"  {r[1]!r:40} <-> {r[10]!r}  (m={r[15]:.2f} e={r[16]:.2f} l={r[17]:.2f} o={r[18]:.2f})")

    print("\n--- sample: LIKELY_MATCH_NEEDS_REVIEW (why review is needed) ---")
    for r in [x for x in report_rows if x[13] == "LIKELY_MATCH_NEEDS_REVIEW"][:5]:
        print(f"  {r[1]!r:40} <-> {r[10]!r}")
        print(f"    entity_reasons: {r[21]}")
        print(f"    operational_reasons: {r[23]}")

    print("\n--- sample: unmatched SunBiz, not mailbox-flagged (candidates for Chamber outreach) ---")
    for source, doc, name, status, addr, is_mailbox in [r for r in unmatched_rows if not r[5]][:6]:
        print(f"  {name!r:45} status={status}  {addr}")

    print("\n" + "#" * 78)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    build_schema(conn)

    log("building validation_report")
    report_rows = build_validation_report(conn)
    log("building sunbiz_unmatched_report")
    unmatched_rows = build_unmatched_sunbiz(conn)

    export_csv(VALIDATION_REPORT_CSV, [
        "place_id", "google_name", "google_formatted_address", "google_phone", "google_website",
        "google_business_status", "google_rating", "google_user_rating_count",
        "sunbiz_source_table", "sunbiz_doc_number", "sunbiz_name", "sunbiz_status", "sunbiz_address_raw",
        "validation_status", "match_classification", "match_confidence", "entity_confidence",
        "location_confidence", "operational_confidence",
        "block_reason", "match_reason_codes", "entity_reason_codes", "location_reason_codes",
        "operational_reason_codes", "source_attribution",
    ], report_rows)
    export_csv(UNMATCHED_SUNBIZ_CSV, [
        "source_table", "doc_number", "name", "status", "address", "is_mailbox_or_agent",
    ], unmatched_rows)

    print_summary(conn, report_rows, unmatched_rows)
    conn.close()


if __name__ == "__main__":
    main()
