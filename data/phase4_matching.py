"""Phase 4 deterministic matching: score every Phase 3 candidate pair
(Google Place <-> SunBiz corp/fic record) with a transparent, reproducible
point system and classify it Likely Match / Ambiguous / No Match, with a
reason code for every component of the score.

No randomness, no LLM -- same inputs always produce the same score, which is
the Phase 4 acceptance bar ("matching results are reviewable and
reproducible").

Features scored (per the approved architecture's list):
  - name similarity        (fuzzywuzzy token_sort_ratio on name_core)
  - token overlap           (Jaccard on significant name tokens)
  - street-number agreement (part of address scoring below)
  - address similarity      (full normalized address: number+street+unit)
  - ZIP agreement            (always true here -- Phase 3 blocked on it --
                              recorded as a reason code anyway per spec)
  - phone agreement          NOT AVAILABLE: SunBiz's fixed-width extract has
  - website agreement        no phone/website fields at all (see
                              config/layouts.json) -- recorded explicitly as
                              "not available" rather than silently skipped.

Run from the `data/` directory:  python phase4_matching.py
"""
import collections
import sqlite3
import sys
import time

from fuzzywuzzy import fuzz

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = "ingest.db"
BATCH_SIZE = 5000

# Point weights -- deliberately simple and additive so every score is
# hand-checkable from its reason codes. Max possible = 40+20+30+5 = 95.
NAME_SIM_MAX_POINTS = 40
TOKEN_OVERLAP_MAX_POINTS = 20
ADDRESS_FULL_MATCH_POINTS = 30
ADDRESS_PARTIAL_MATCH_POINTS = 15   # number+street match, unit differs/blank
ZIP_MATCH_POINTS = 5

# An address match at a known registered-agent/mailbox suite (Phase 2's
# is_mailbox_or_agent) is much weaker evidence -- it just means this
# business's SunBiz filing is administered from a service provider's
# office, not that the SunBiz record IS this business. Reduced to ~1/4
# weight rather than dropped entirely, since it's still real corroboration
# (a genuinely unrelated candidate wouldn't share the address at all).
MAILBOX_ADDRESS_WEIGHT = 0.25

LIKELY_MATCH_THRESHOLD = 65
AMBIGUOUS_THRESHOLD = 30
# score >= LIKELY_MATCH_THRESHOLD          -> Likely Match
# AMBIGUOUS_THRESHOLD <= score < LIKELY... -> Ambiguous
# score < AMBIGUOUS_THRESHOLD              -> No Match


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


SCHEMA = """
CREATE TABLE IF NOT EXISTS match_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    place_id TEXT NOT NULL,
    source_table TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    name_sim_ratio REAL NOT NULL,
    name_sim_points REAL NOT NULL,
    token_jaccard REAL NOT NULL,
    token_overlap_points REAL NOT NULL,
    address_points REAL NOT NULL,
    zip_points REAL NOT NULL,
    total_score REAL NOT NULL,
    classification TEXT NOT NULL,
    reason_codes TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_match_scores_place ON match_scores(place_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_doc ON match_scores(source_table, doc_number);

CREATE TABLE IF NOT EXISTS place_match_summary (
    place_id TEXT PRIMARY KEY,
    best_source_table TEXT,
    best_doc_number TEXT,
    best_score REAL,
    best_classification TEXT,
    n_likely_match INTEGER,
    n_ambiguous INTEGER,
    n_no_match INTEGER
);
"""


def build_schema(conn):
    # Both tables are fully derived/regenerable -- drop and recreate rather
    # than migrate columns across schema changes between re-runs.
    conn.execute("DROP TABLE IF EXISTS match_scores")
    conn.execute("DROP TABLE IF EXISTS place_match_summary")
    conn.executescript(SCHEMA)
    conn.commit()


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _jaccard(tokens_a, tokens_b):
    a, b = set(tokens_a), set(tokens_b)
    if not a and not b:
        return 0.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def score_candidate(place, sunbiz):
    """place / sunbiz: dicts with name_core, name_tokens (space-joined),
    street_number_norm, street_norm, unit_norm, zip5, and (sunbiz only)
    is_mailbox_or_agent.
    Returns (total_score, classification, reason_codes:list[str], components:dict).
    """
    reasons = []
    components = {}

    # --- name similarity ---
    name_a = place.get("name_core") or ""
    name_b = sunbiz.get("name_core") or ""
    ratio = fuzz.token_sort_ratio(name_a, name_b) if (name_a and name_b) else 0
    name_points = round((ratio / 100.0) * NAME_SIM_MAX_POINTS, 1)
    components["name_sim_ratio"] = ratio / 100.0
    components["name_sim_points"] = name_points
    if ratio >= 85:
        reasons.append("NAME_SIM_HIGH")
    elif ratio >= 60:
        reasons.append("NAME_SIM_MODERATE")
    elif ratio > 0:
        reasons.append("NAME_SIM_LOW")
    else:
        reasons.append("NAME_SIM_NONE")

    # --- significant token overlap (Jaccard) ---
    toks_a = (place.get("name_tokens") or "").split(" ") if place.get("name_tokens") else []
    toks_b = (sunbiz.get("name_tokens") or "").split(" ") if sunbiz.get("name_tokens") else []
    jaccard = _jaccard(toks_a, toks_b)
    token_points = round(jaccard * TOKEN_OVERLAP_MAX_POINTS, 1)
    components["token_jaccard"] = jaccard
    components["token_overlap_points"] = token_points
    if jaccard >= 0.5:
        reasons.append("TOKEN_OVERLAP_STRONG")
    elif jaccard > 0:
        reasons.append("TOKEN_OVERLAP_WEAK")
    else:
        reasons.append("TOKEN_OVERLAP_NONE")

    # --- address (street-number agreement + full address similarity) ---
    num_a, num_b = place.get("street_number_norm") or "", sunbiz.get("street_number_norm") or ""
    street_a, street_b = place.get("street_norm") or "", sunbiz.get("street_norm") or ""
    unit_a, unit_b = place.get("unit_norm") or "", sunbiz.get("unit_norm") or ""

    is_mailbox = bool(sunbiz.get("is_mailbox_or_agent"))
    weight = MAILBOX_ADDRESS_WEIGHT if is_mailbox else 1.0

    if num_a and num_a == num_b and street_a == street_b and unit_a == unit_b:
        address_points = round(ADDRESS_FULL_MATCH_POINTS * weight, 1)
        reasons.append("ADDRESS_FULL_MATCH")
    elif num_a and num_a == num_b and street_a == street_b:
        address_points = round(ADDRESS_PARTIAL_MATCH_POINTS * weight, 1)
        reasons.append("ADDRESS_PARTIAL_MATCH_UNIT_DIFFERS")
    elif num_a and num_a == num_b:
        address_points = round(ADDRESS_PARTIAL_MATCH_POINTS * 0.5 * weight, 1)
        reasons.append("STREET_NUMBER_ONLY_MATCH")
    else:
        address_points = 0.0
        reasons.append("ADDRESS_NO_MATCH")
    if is_mailbox:
        reasons.append("MAILBOX_OR_AGENT_ADDRESS")
    components["address_points"] = address_points

    # --- zip agreement (always true given Phase 3 blocking; stated for
    # transparency/completeness per the approved feature list) ---
    zip_points = ZIP_MATCH_POINTS if place.get("zip5") and place.get("zip5") == sunbiz.get("zip5") else 0.0
    components["zip_points"] = zip_points
    reasons.append("ZIP_MATCH" if zip_points else "ZIP_MISMATCH")

    # --- features SunBiz structurally cannot provide ---
    reasons.append("PHONE_NOT_AVAILABLE")
    reasons.append("WEBSITE_NOT_AVAILABLE")

    total = round(name_points + token_points + address_points + zip_points, 1)
    if total >= LIKELY_MATCH_THRESHOLD:
        classification = "LIKELY_MATCH"
    elif total >= AMBIGUOUS_THRESHOLD:
        classification = "AMBIGUOUS"
    else:
        classification = "NO_MATCH"

    return total, classification, reasons, components


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

def _row_to_dict(row, cols):
    return dict(zip(cols, row))


def run_matching(conn):
    place_cols = ["place_id", "name_core", "name_tokens", "street_number_norm",
                  "street_norm", "unit_norm", "zip5"]
    places = {
        r[0]: _row_to_dict(r, place_cols)
        for r in conn.execute(f"SELECT {', '.join(place_cols)} FROM places")
    }

    corp_cols = ["doc_number", "name_core", "name_tokens", "street_number_norm",
                 "street_norm", "unit_norm", "zip5", "is_mailbox_or_agent"]
    corp = {
        r[0]: _row_to_dict(r, corp_cols)
        for r in conn.execute(f"SELECT {', '.join(corp_cols)} FROM sunbiz_corp")
    }
    fic = {
        r[0]: _row_to_dict(r, corp_cols)
        for r in conn.execute(f"SELECT {', '.join(corp_cols)} FROM sunbiz_fic")
    }
    sources = {"sunbiz_corp": corp, "sunbiz_fic": fic}

    candidates = conn.execute(
        "SELECT id, place_id, source_table, doc_number FROM candidates"
    ).fetchall()
    log(f"scoring {len(candidates)} candidates")

    batch = []
    class_counts = collections.Counter()
    per_place = collections.defaultdict(list)  # place_id -> [(score, classification, source, doc)]

    for i, (cand_id, place_id, source_table, doc_number) in enumerate(candidates):
        if i and i % 50000 == 0:
            log(f"  scored {i}/{len(candidates)}")
        place = places.get(place_id)
        sunbiz = sources[source_table].get(doc_number)
        if place is None or sunbiz is None:
            continue

        total, classification, reasons, comp = score_candidate(place, sunbiz)
        class_counts[classification] += 1
        per_place[place_id].append((total, classification, source_table, doc_number))

        batch.append((
            cand_id, place_id, source_table, doc_number,
            comp["name_sim_ratio"], comp["name_sim_points"],
            comp["token_jaccard"], comp["token_overlap_points"],
            comp["address_points"], comp["zip_points"],
            total, classification, " ".join(reasons),
        ))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "INSERT INTO match_scores (candidate_id, place_id, source_table, doc_number, "
                "name_sim_ratio, name_sim_points, token_jaccard, token_overlap_points, "
                "address_points, zip_points, total_score, classification, reason_codes) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
            batch.clear()
    if batch:
        conn.executemany(
            "INSERT INTO match_scores (candidate_id, place_id, source_table, doc_number, "
            "name_sim_ratio, name_sim_points, token_jaccard, token_overlap_points, "
            "address_points, zip_points, total_score, classification, reason_codes) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
    conn.commit()
    log(f"scored {len(candidates)} candidates: {dict(class_counts)}")

    # per-place best-candidate summary
    summary_batch = []
    for place_id, rows in per_place.items():
        rows.sort(key=lambda r: r[0], reverse=True)
        best_score, best_class, best_source, best_doc = rows[0]
        n_likely = sum(1 for r in rows if r[1] == "LIKELY_MATCH")
        n_ambig = sum(1 for r in rows if r[1] == "AMBIGUOUS")
        n_no = sum(1 for r in rows if r[1] == "NO_MATCH")
        summary_batch.append((place_id, best_source, best_doc, best_score, best_class,
                               n_likely, n_ambig, n_no))
    conn.executemany(
        "INSERT INTO place_match_summary (place_id, best_source_table, best_doc_number, "
        "best_score, best_classification, n_likely_match, n_ambiguous, n_no_match) "
        "VALUES (?,?,?,?,?,?,?,?)", summary_batch)
    conn.commit()

    return class_counts


# ---------------------------------------------------------------------------
# Summary / acceptance evidence
# ---------------------------------------------------------------------------

def print_summary(conn, class_counts):
    print("\n" + "#" * 78)
    print("# PHASE 4 DETERMINISTIC MATCHING SUMMARY")
    print("#" * 78)

    total = sum(class_counts.values())
    print(f"\ntotal candidate scores: {total}")
    for cls in ("LIKELY_MATCH", "AMBIGUOUS", "NO_MATCH"):
        n = class_counts.get(cls, 0)
        print(f"  {cls:15} {n:8d}  ({n / total * 100:.1f}%)" if total else f"  {cls}: 0")

    n_places = conn.execute("SELECT COUNT(*) FROM places").fetchone()[0]
    print(f"\nplace_match_summary (best candidate per place, {n_places} places total):")
    for cls, n in conn.execute(
        "SELECT best_classification, COUNT(*) FROM place_match_summary GROUP BY best_classification"
    ):
        print(f"  best={cls:15} {n:6d} places")
    n_no_candidates = n_places - conn.execute("SELECT COUNT(*) FROM place_match_summary").fetchone()[0]
    print(f"  (no candidate at all): {n_no_candidates} places")

    print("\n--- sample: LIKELY_MATCH ---")
    for name, sunbiz_name, score, reasons in conn.execute(
        "SELECT p.name, COALESCE(s.name, f.fic_name), m.total_score, m.reason_codes "
        "FROM match_scores m JOIN places p ON p.place_id = m.place_id "
        "LEFT JOIN sunbiz_corp s ON m.source_table='sunbiz_corp' AND s.doc_number = m.doc_number "
        "LEFT JOIN sunbiz_fic f ON m.source_table='sunbiz_fic' AND f.doc_number = m.doc_number "
        "WHERE m.classification='LIKELY_MATCH' ORDER BY m.total_score DESC LIMIT 8"
    ):
        print(f"  {score:5.1f}  GOOGLE: {name!r:40} <-> SUNBIZ: {sunbiz_name!r}")
        print(f"         reasons: {reasons}")

    print("\n--- sample: AMBIGUOUS ---")
    for name, sunbiz_name, score, reasons in conn.execute(
        "SELECT p.name, COALESCE(s.name, f.fic_name), m.total_score, m.reason_codes "
        "FROM match_scores m JOIN places p ON p.place_id = m.place_id "
        "LEFT JOIN sunbiz_corp s ON m.source_table='sunbiz_corp' AND s.doc_number = m.doc_number "
        "LEFT JOIN sunbiz_fic f ON m.source_table='sunbiz_fic' AND f.doc_number = m.doc_number "
        "WHERE m.classification='AMBIGUOUS' ORDER BY m.total_score DESC LIMIT 5"
    ):
        print(f"  {score:5.1f}  GOOGLE: {name!r:40} <-> SUNBIZ: {sunbiz_name!r}")
        print(f"         reasons: {reasons}")

    print("\n--- sample: NO_MATCH (highest-scoring, i.e. closest misses) ---")
    for name, sunbiz_name, score, reasons in conn.execute(
        "SELECT p.name, COALESCE(s.name, f.fic_name), m.total_score, m.reason_codes "
        "FROM match_scores m JOIN places p ON p.place_id = m.place_id "
        "LEFT JOIN sunbiz_corp s ON m.source_table='sunbiz_corp' AND s.doc_number = m.doc_number "
        "LEFT JOIN sunbiz_fic f ON m.source_table='sunbiz_fic' AND f.doc_number = m.doc_number "
        "WHERE m.classification='NO_MATCH' ORDER BY m.total_score DESC LIMIT 5"
    ):
        print(f"  {score:5.1f}  GOOGLE: {name!r:40} <-> SUNBIZ: {sunbiz_name!r}")
        print(f"         reasons: {reasons}")

    print("\n" + "#" * 78)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    build_schema(conn)

    class_counts = run_matching(conn)
    print_summary(conn, class_counts)
    conn.close()


if __name__ == "__main__":
    main()
