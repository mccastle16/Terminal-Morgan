"""Phase 5 confidence: four SEPARATE confidence measures for every place
that has a best candidate from Phase 4, using only data already ingested/
computed in Phases 1-4. No external calls -- website validation, GIS
polygon validation, and business-status re-verification are explicitly
deferred per the approved architecture (they need new data sources SunBiz/
Google don't currently give us).

  - match confidence:       how strong Phase 4's score is, normalized 0-1
  - entity confidence:      how confident we are the SunBiz record is a
                             distinct, identifiable entity (not blurred by a
                             registered-agent address, not a lapsed filing)
  - location confidence:    how confident we are the matched address is the
                             real operating location (not just a paperwork
                             address)
  - operational confidence: how confident we are the business is currently
                             operating, from Google's business_status and
                             SunBiz's filing status already on file

Each is deterministic, point-based, and carries its own reason codes, same
philosophy as Phase 4. Kept separate on purpose (not collapsed into one
score) because the four questions are genuinely different and a reviewer
needs to see which one is weak, not just an average.

Run from the `data/` directory:  python phase5_confidence.py
"""
import sqlite3
import sys
import time

import phase4_matching as p4

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = "ingest.db"
BATCH_SIZE = 5000

MATCH_MAX_SCORE = (p4.NAME_SIM_MAX_POINTS + p4.TOKEN_OVERLAP_MAX_POINTS
                   + p4.ADDRESS_FULL_MATCH_POINTS + p4.ZIP_MATCH_POINTS)

ACTIVE_CORP_STATUS = {"A"}
ACTIVE_FIC_STATUS = {"A"}

GOOGLE_OPERATIONAL = "OPERATIONAL"
GOOGLE_CLOSED_PERMANENTLY = "CLOSED_PERMANENTLY"
GOOGLE_CLOSED_TEMPORARILY = "CLOSED_TEMPORARILY"


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


SCHEMA = """
CREATE TABLE IF NOT EXISTS confidence_scores (
    place_id TEXT PRIMARY KEY,
    source_table TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    match_confidence REAL NOT NULL,
    entity_confidence REAL NOT NULL,
    location_confidence REAL NOT NULL,
    operational_confidence REAL NOT NULL,
    match_reason_codes TEXT NOT NULL,
    entity_reason_codes TEXT NOT NULL,
    location_reason_codes TEXT NOT NULL,
    operational_reason_codes TEXT NOT NULL
);
"""


def build_schema(conn):
    conn.execute("DROP TABLE IF EXISTS confidence_scores")
    conn.executescript(SCHEMA)
    conn.commit()


def _clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


# ---------------------------------------------------------------------------
# Confidence dimensions
# ---------------------------------------------------------------------------

def match_confidence(best_score):
    reasons = [f"SCORE_{best_score:.1f}_OF_{MATCH_MAX_SCORE:.0f}"]
    return _clamp(best_score / MATCH_MAX_SCORE), reasons


def entity_confidence(source_table, sunbiz):
    reasons = []
    score = 0.6
    reasons.append(f"BASE_{source_table.upper()}")

    if source_table == "sunbiz_fic":
        if sunbiz.get("bridge_status") == "resolved":
            score += 0.15
            reasons.append("DBA_BRIDGE_RESOLVED")
        elif sunbiz.get("bridge_status") == "unresolved":
            score -= 0.05
            reasons.append("DBA_BRIDGE_UNRESOLVED")
        else:
            reasons.append("DBA_NO_CHARTER_NUMBER")

    if sunbiz.get("is_mailbox_or_agent"):
        score -= 0.3
        reasons.append("MAILBOX_OR_AGENT_ADDRESS")

    status = (sunbiz.get("status") or "").strip()
    active_set = ACTIVE_CORP_STATUS if source_table == "sunbiz_corp" else ACTIVE_FIC_STATUS
    if status in active_set:
        reasons.append("SUNBIZ_STATUS_ACTIVE")
    elif status:
        score -= 0.1
        reasons.append(f"SUNBIZ_STATUS_INACTIVE_{status}")
    else:
        reasons.append("SUNBIZ_STATUS_UNKNOWN")

    return _clamp(score), reasons


def location_confidence(match_reason_codes, sunbiz, place):
    reasons = []
    if "ADDRESS_FULL_MATCH" in match_reason_codes:
        score = 0.9
        reasons.append("ADDRESS_FULL_MATCH")
    elif "ADDRESS_PARTIAL_MATCH_UNIT_DIFFERS" in match_reason_codes:
        score = 0.6
        reasons.append("ADDRESS_PARTIAL_MATCH_UNIT_DIFFERS")
    elif "STREET_NUMBER_ONLY_MATCH" in match_reason_codes:
        score = 0.4
        reasons.append("STREET_NUMBER_ONLY_MATCH")
    else:
        score = 0.1
        reasons.append("ADDRESS_NO_MATCH")

    if sunbiz.get("is_mailbox_or_agent"):
        score -= 0.3
        reasons.append("MAILBOX_OR_AGENT_ADDRESS")

    if place.get("latitude") is not None and place.get("longitude") is not None:
        score += 0.05
        reasons.append("GOOGLE_GEOCODE_PRESENT")
    else:
        reasons.append("GOOGLE_GEOCODE_MISSING")

    return _clamp(score), reasons


def operational_confidence(place, source_table, sunbiz):
    reasons = []
    score = 0.5

    business_status = (place.get("business_status") or "").strip()
    if business_status == GOOGLE_OPERATIONAL:
        score += 0.3
        reasons.append("GOOGLE_STATUS_OPERATIONAL")
    elif business_status == GOOGLE_CLOSED_PERMANENTLY:
        score -= 0.4
        reasons.append("GOOGLE_STATUS_CLOSED_PERMANENTLY")
    elif business_status == GOOGLE_CLOSED_TEMPORARILY:
        score -= 0.2
        reasons.append("GOOGLE_STATUS_CLOSED_TEMPORARILY")
    else:
        reasons.append("GOOGLE_STATUS_UNKNOWN")

    status = (sunbiz.get("status") or "").strip()
    active_set = ACTIVE_CORP_STATUS if source_table == "sunbiz_corp" else ACTIVE_FIC_STATUS
    if status in active_set:
        score += 0.2
        reasons.append("SUNBIZ_STATUS_ACTIVE")
    elif status:
        score -= 0.3
        reasons.append(f"SUNBIZ_STATUS_INACTIVE_{status}")
    else:
        reasons.append("SUNBIZ_STATUS_UNKNOWN")

    return _clamp(score), reasons


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

def run_confidence(conn):
    summaries = conn.execute(
        "SELECT place_id, best_source_table, best_doc_number, best_score, best_classification "
        "FROM place_match_summary WHERE best_classification IN ('LIKELY_MATCH', 'AMBIGUOUS')"
    ).fetchall()
    log(f"computing confidence for {len(summaries)} places with a candidate match")

    place_cols = ["place_id", "latitude", "longitude", "business_status"]
    places = {
        r[0]: dict(zip(place_cols, r))
        for r in conn.execute(f"SELECT {', '.join(place_cols)} FROM places")
    }

    corp_cols = ["doc_number", "status", "is_mailbox_or_agent"]
    corp = {r[0]: dict(zip(corp_cols, r))
            for r in conn.execute(f"SELECT {', '.join(corp_cols)} FROM sunbiz_corp")}
    fic_cols = ["doc_number", "status", "is_mailbox_or_agent", "bridge_status"]
    fic = {r[0]: dict(zip(fic_cols, r))
           for r in conn.execute(f"SELECT {', '.join(fic_cols)} FROM sunbiz_fic")}
    sources = {"sunbiz_corp": corp, "sunbiz_fic": fic}

    # match_scores.reason_codes for the best (place, source, doc) triple --
    # needed for location_confidence's address-tier lookup.
    reason_lookup = {}
    for place_id, source_table, doc_number, reason_codes in conn.execute(
        "SELECT place_id, source_table, doc_number, reason_codes FROM match_scores"
    ):
        reason_lookup[(place_id, source_table, doc_number)] = reason_codes.split(" ")

    batch = []
    for place_id, source_table, doc_number, best_score, _cls in summaries:
        place = places.get(place_id, {})
        sunbiz = sources[source_table].get(doc_number, {})
        match_reasons_list = reason_lookup.get((place_id, source_table, doc_number), [])

        m_score, m_reasons = match_confidence(best_score)
        e_score, e_reasons = entity_confidence(source_table, sunbiz)
        l_score, l_reasons = location_confidence(match_reasons_list, sunbiz, place)
        o_score, o_reasons = operational_confidence(place, source_table, sunbiz)

        batch.append((
            place_id, source_table, doc_number,
            m_score, e_score, l_score, o_score,
            " ".join(m_reasons), " ".join(e_reasons), " ".join(l_reasons), " ".join(o_reasons),
        ))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "INSERT INTO confidence_scores (place_id, source_table, doc_number, "
                "match_confidence, entity_confidence, location_confidence, operational_confidence, "
                "match_reason_codes, entity_reason_codes, location_reason_codes, operational_reason_codes) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)", batch)
            batch.clear()
    if batch:
        conn.executemany(
            "INSERT INTO confidence_scores (place_id, source_table, doc_number, "
            "match_confidence, entity_confidence, location_confidence, operational_confidence, "
            "match_reason_codes, entity_reason_codes, location_reason_codes, operational_reason_codes) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)", batch)
    conn.commit()
    log(f"wrote confidence scores for {len(summaries)} places")
    return len(summaries)


# ---------------------------------------------------------------------------
# Summary / acceptance evidence
# ---------------------------------------------------------------------------

def print_summary(conn, n_scored):
    print("\n" + "#" * 78)
    print("# PHASE 5 CONFIDENCE SUMMARY")
    print("#" * 78)

    n_places = conn.execute("SELECT COUNT(*) FROM places").fetchone()[0]
    print(f"\nplaces with a candidate match: {n_scored}/{n_places}")

    for dim in ("match_confidence", "entity_confidence", "location_confidence", "operational_confidence"):
        avg, lo, hi = conn.execute(f"SELECT AVG({dim}), MIN({dim}), MAX({dim}) FROM confidence_scores").fetchone()
        print(f"  {dim:24} avg={avg:.2f}  min={lo:.2f}  max={hi:.2f}")

    print("\n--- sample: high confidence across all four dimensions ---")
    rows = conn.execute(
        "SELECT p.name, COALESCE(s.name, f.fic_name), "
        "c.match_confidence, c.entity_confidence, c.location_confidence, c.operational_confidence "
        "FROM confidence_scores c JOIN places p ON p.place_id = c.place_id "
        "LEFT JOIN sunbiz_corp s ON c.source_table='sunbiz_corp' AND s.doc_number = c.doc_number "
        "LEFT JOIN sunbiz_fic f ON c.source_table='sunbiz_fic' AND f.doc_number = c.doc_number "
        "ORDER BY (c.match_confidence + c.entity_confidence + c.location_confidence + c.operational_confidence) DESC "
        "LIMIT 6"
    ).fetchall()
    for name, sunbiz_name, mc, ec, lc, oc in rows:
        print(f"  {name!r:40} <-> {sunbiz_name!r}")
        print(f"    match={mc:.2f} entity={ec:.2f} location={lc:.2f} operational={oc:.2f}")

    print("\n--- sample: low entity or operational confidence (worth a human look) ---")
    rows = conn.execute(
        "SELECT p.name, COALESCE(s.name, f.fic_name), "
        "c.entity_confidence, c.operational_confidence, c.entity_reason_codes, c.operational_reason_codes "
        "FROM confidence_scores c JOIN places p ON p.place_id = c.place_id "
        "LEFT JOIN sunbiz_corp s ON c.source_table='sunbiz_corp' AND s.doc_number = c.doc_number "
        "LEFT JOIN sunbiz_fic f ON c.source_table='sunbiz_fic' AND f.doc_number = c.doc_number "
        "WHERE c.entity_confidence < 0.4 OR c.operational_confidence < 0.4 "
        "ORDER BY (c.entity_confidence + c.operational_confidence) ASC LIMIT 6"
    ).fetchall()
    for name, sunbiz_name, ec, oc, ereasons, oreasons in rows:
        print(f"  {name!r:40} <-> {sunbiz_name!r}  entity={ec:.2f} operational={oc:.2f}")
        print(f"    entity: {ereasons}")
        print(f"    operational: {oreasons}")

    print("\n" + "#" * 78)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    build_schema(conn)

    n_scored = run_confidence(conn)
    print_summary(conn, n_scored)
    conn.close()


if __name__ == "__main__":
    main()
