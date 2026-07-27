"""Phase 1 ingest: load Google Places (combined.csv) + SunBiz cordata/ficdata
into a single SQLite database (ingest.db) with consistent column names.

The target ZIP set is DERIVED from combined.csv (the Google pull already
defines the neighborhood footprint); config/neighborhoods.json is a manual
escape hatch only. Reuses Phase 0's parser.py / config/layouts.json for all
SunBiz fixed-width parsing -- no re-implementation of field offsets here.

Run from the `data/` directory:  python phase1_ingest.py
"""
import csv
import glob
import json
import os
import sqlite3
import sys
import time

import parser as sunbiz_parser

NEIGHBORHOODS_PATH = os.path.join("config", "neighborhoods.json")
LAYOUTS_PATH = os.path.join("config", "layouts.json")
COMBINED_CSV_PATH = "combined.csv"
CORDATA_GLOB = "cordata/cordata*.txt"
FICDATA_PATH = "ficdata/FICFILE.TXT"
DB_PATH = "ingest.db"

QUARANTINE_FILE_THRESHOLD_PCT = 3.0
BATCH_SIZE = 5000
PROGRESS_EVERY = 500000

csv.field_size_limit(min(sys.maxsize, 2 ** 31 - 1))  # C long is 32-bit on Windows


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


def zip5(raw):
    """First 5 characters of a raw zip-ish string. Not digit-validated on
    purpose -- garbage input just won't match anything in the target set.
    """
    return (raw or "").strip()[:5]


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS places (
    place_id TEXT PRIMARY KEY,
    name TEXT,
    formatted_address TEXT,
    street_number TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    zip5 TEXT,
    phone TEXT,
    phone_international TEXT,
    website TEXT,
    google_maps_url TEXT,
    business_status TEXT,
    primary_type TEXT,
    types TEXT,
    latitude REAL,
    longitude REAL,
    rating REAL,
    user_rating_count INTEGER
);

CREATE TABLE IF NOT EXISTS sunbiz_corp (
    doc_number TEXT PRIMARY KEY,
    name TEXT,
    status TEXT,
    filing_type TEXT,
    princ_addr1 TEXT,
    princ_addr2 TEXT,
    princ_city TEXT,
    princ_state TEXT,
    princ_zip TEXT,
    zip5 TEXT,
    file_date TEXT,
    fei TEXT,
    last_transaction_date TEXT,
    report_year_1 TEXT
);
CREATE INDEX IF NOT EXISTS idx_sunbiz_corp_zip5 ON sunbiz_corp(zip5);

CREATE TABLE IF NOT EXISTS sunbiz_fic (
    doc_number TEXT PRIMARY KEY,
    fic_name TEXT,
    status TEXT,
    county TEXT,
    addr1 TEXT,
    addr2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    zip5 TEXT,
    filing_date TEXT,
    expiration_date TEXT,
    num_owners TEXT,
    owner1_name TEXT,
    owner1_name_format TEXT,
    owner1_charter_number TEXT
);
CREATE INDEX IF NOT EXISTS idx_sunbiz_fic_zip5 ON sunbiz_fic(zip5);
CREATE INDEX IF NOT EXISTS idx_sunbiz_fic_owner1_charter ON sunbiz_fic(owner1_charter_number);

CREATE TABLE IF NOT EXISTS quarantine (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT,
    line_number INTEGER,
    reason TEXT,
    raw_line TEXT
);

CREATE TABLE IF NOT EXISTS ingest_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT,
    lines_read INTEGER,
    kept_in_zip INTEGER,
    rejected_out_of_zip INTEGER,
    quarantined INTEGER,
    decode_replacements INTEGER,
    started_at TEXT,
    finished_at TEXT
);
"""


def build_schema(conn):
    conn.executescript(SCHEMA)
    conn.commit()


# ---------------------------------------------------------------------------
# Step 1: load combined.csv (Google Places) -- full load, no zip filter
# ---------------------------------------------------------------------------

PLACES_COLUMNS = [
    "place_id", "name", "formatted_address", "street_number", "street",
    "city", "state", "zip5", "phone", "phone_international", "website",
    "google_maps_url", "business_status", "primary_type", "types",
    "latitude", "longitude", "rating", "user_rating_count",
]

PLACES_INSERT = f"""
INSERT OR REPLACE INTO places ({', '.join(PLACES_COLUMNS)})
VALUES ({', '.join('?' for _ in PLACES_COLUMNS)})
"""


def _to_float(v):
    v = (v or "").strip()
    return float(v) if v else None


def _to_int(v):
    v = (v or "").strip()
    return int(v) if v else None


def load_places(conn):
    log(f"loading Google Places from {COMBINED_CSV_PATH}")
    conn.execute("DELETE FROM places")
    rows = 0
    batch = []
    t0 = time.time()
    with open(COMBINED_CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            batch.append((
                row.get("place_id", ""),
                row.get("name", ""),
                row.get("formatted_address", ""),
                row.get("street_number", ""),
                row.get("street", ""),
                row.get("city", ""),
                row.get("state", ""),
                zip5(row.get("postal_code", "")),
                row.get("phone", ""),
                row.get("phone_international", ""),
                row.get("website", ""),
                row.get("google_maps_url", ""),
                row.get("business_status", ""),
                row.get("primary_type", ""),
                row.get("types", ""),
                _to_float(row.get("latitude")),
                _to_float(row.get("longitude")),
                _to_float(row.get("rating")),
                _to_int(row.get("user_rating_count")),
            ))
            rows += 1
            if len(batch) >= BATCH_SIZE:
                conn.executemany(PLACES_INSERT, batch)
                batch.clear()
    if batch:
        conn.executemany(PLACES_INSERT, batch)
    conn.commit()
    log(f"places loaded: {rows} rows in {round(time.time() - t0, 1)}s")
    return rows


# ---------------------------------------------------------------------------
# Step 2: derive target zip set
# ---------------------------------------------------------------------------

def derive_target_zips(conn, config):
    zip_source = config.get("zip_source", "derive_from_csv")
    active = config["active_neighborhood"]
    neighborhood = config["neighborhoods"][active]
    min_rows = config.get("min_google_rows_per_zip", 5)

    cur = conn.execute(
        "SELECT zip5, COUNT(*) AS n FROM places WHERE zip5 != '' GROUP BY zip5 ORDER BY n DESC"
    )
    counts = {row[0]: row[1] for row in cur.fetchall()}

    override = neighborhood.get("zips_override")
    if override:
        mode = "manual override"
        target = set(override)
        print(f"\n=== ZIP mode: {mode} (neighborhood={active!r}) ===")
        print(f"zips_override in config/neighborhoods.json takes precedence over derivation.")
        rows = []
        for z in sorted(target):
            rows.append((z, counts.get(z, 0), "yes", "in zips_override list"))
        for z, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            if z not in target:
                rows.append((z, n, "no", "not in zips_override list"))
    else:
        mode = f"derive_from_csv (min_google_rows_per_zip={min_rows})"
        print(f"\n=== ZIP mode: {mode} (neighborhood={active!r}) ===")
        print("zip_source == 'derive_from_csv': building target set from combined.csv postal_code, "
              f"keeping zips with >= {min_rows} Google rows.")
        target = {z for z, n in counts.items() if n >= min_rows}
        rows = []
        for z, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            if n >= min_rows:
                rows.append((z, n, "yes", f"{n} >= min_google_rows_per_zip ({min_rows})"))
            else:
                rows.append((z, n, "no", f"excluded — likely grid spillover ({n} < {min_rows})"))

    print(f"\n{'zip5':<8}{'google_rows':>12}  included?  reason")
    for z, n, incl, reason in rows:
        print(f"{z:<8}{n:>12}  {incl:<9}  {reason}")

    print(f"\ntarget zip set ({len(target)} zips): {sorted(target)}")
    return target


# ---------------------------------------------------------------------------
# Quarantine / threshold helpers, shared by cordata + ficdata streaming
# ---------------------------------------------------------------------------

def _reason_for(rec):
    err = rec["_error"]
    if err["kind"] == "length_mismatch":
        return f"length_mismatch: expected {err['expected_length']}, got {err['actual_length']}"
    return f"decode_error: {err['message']}"


def _flush_quarantine(conn, batch):
    if batch:
        conn.executemany(
            "INSERT INTO quarantine (source_file, line_number, reason, raw_line) VALUES (?, ?, ?, ?)",
            batch,
        )
        batch.clear()


def _log_ingest(conn, source_file, lines_read, kept, rejected, quarantined, decode_replacements, started_at):
    conn.execute(
        """INSERT INTO ingest_log
           (source_file, lines_read, kept_in_zip, rejected_out_of_zip, quarantined, decode_replacements,
            started_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (source_file, lines_read, kept, rejected, quarantined, decode_replacements,
         started_at, time.strftime("%Y-%m-%d %H:%M:%S")),
    )
    conn.commit()


def _check_quarantine_threshold(source_file, lines_read, quarantined):
    if lines_read == 0:
        return
    pct = quarantined / lines_read * 100.0
    if pct > QUARANTINE_FILE_THRESHOLD_PCT:
        print(f"\n!!! HALT: {source_file} quarantined {quarantined}/{lines_read} lines "
              f"({pct:.2f}%) > {QUARANTINE_FILE_THRESHOLD_PCT:.0f}% threshold -- probable format change.")
        print("Ingest stopped. Fix the format issue (or update config/layouts.json) and re-run; "
              "already-ingested rows are safe to keep (INSERT OR REPLACE is resumable).")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Step 3: stream sunbiz_corp (cordata0..9)
# ---------------------------------------------------------------------------

CORP_COLUMNS = [
    "doc_number", "name", "status", "filing_type", "princ_addr1", "princ_addr2",
    "princ_city", "princ_state", "princ_zip", "zip5", "file_date", "fei",
    "last_transaction_date", "report_year_1",
]
CORP_INSERT = f"""
INSERT OR REPLACE INTO sunbiz_corp ({', '.join(CORP_COLUMNS)})
VALUES ({', '.join('?' for _ in CORP_COLUMNS)})
"""


def stream_cordata(conn, layouts, target_zips):
    files = sorted(glob.glob(CORDATA_GLOB))
    if not files:
        log(f"WARNING: no files matched {CORDATA_GLOB}")
    for path in files:
        fname = os.path.basename(path)
        started_at = time.strftime("%Y-%m-%d %H:%M:%S")
        t0 = time.time()
        log(f"streaming cordata file {fname}")

        lines_read = kept = rejected = quarantined = decode_replacements = 0
        corp_batch = []
        q_batch = []

        for rec in sunbiz_parser.iter_records(path, "cordata", layouts=layouts):
            lines_read += 1
            if not rec["_ok"]:
                quarantined += 1
                q_batch.append((fname, rec["_line_number"], _reason_for(rec), rec.get("_raw")))
                if len(q_batch) >= BATCH_SIZE:
                    _flush_quarantine(conn, q_batch)
                continue

            z5 = zip5(rec.get("princ_zip", ""))
            if z5 not in target_zips:
                rejected += 1
                continue

            kept += 1
            if rec.get("_had_decode_replacement"):
                decode_replacements += 1
            corp_batch.append((
                rec["doc_number"], rec["name"], rec["status"], rec["filing_type"],
                rec["princ_addr1"], rec["princ_addr2"], rec["princ_city"], rec["princ_state"],
                rec["princ_zip"], z5, rec["file_date"], rec["fei"],
                rec["last_transaction_date"], rec["report_year_1"],
            ))
            if len(corp_batch) >= BATCH_SIZE:
                conn.executemany(CORP_INSERT, corp_batch)
                corp_batch.clear()

            if lines_read % PROGRESS_EVERY == 0:
                log(f"  {fname}: {lines_read} lines read, {kept} kept, {rejected} rejected, "
                    f"{quarantined} quarantined ({round(time.time() - t0, 1)}s)")

        if corp_batch:
            conn.executemany(CORP_INSERT, corp_batch)
        _flush_quarantine(conn, q_batch)
        conn.commit()

        log(f"finished {fname}: {lines_read} lines, {kept} kept, {rejected} rejected, "
            f"{quarantined} quarantined, {decode_replacements} decode_replacements ({round(time.time() - t0, 1)}s)")
        _log_ingest(conn, fname, lines_read, kept, rejected, quarantined, decode_replacements, started_at)
        _check_quarantine_threshold(fname, lines_read, quarantined)


# ---------------------------------------------------------------------------
# Step 4: stream sunbiz_fic (FICFILE.TXT)
# ---------------------------------------------------------------------------

FIC_COLUMNS = [
    "doc_number", "fic_name", "status", "county", "addr1", "addr2", "city",
    "state", "zip", "zip5", "filing_date", "expiration_date", "num_owners",
    "owner1_name", "owner1_name_format", "owner1_charter_number",
]
FIC_INSERT = f"""
INSERT OR REPLACE INTO sunbiz_fic ({', '.join(FIC_COLUMNS)})
VALUES ({', '.join('?' for _ in FIC_COLUMNS)})
"""


def stream_ficdata(conn, layouts, target_zips):
    fname = os.path.basename(FICDATA_PATH)
    started_at = time.strftime("%Y-%m-%d %H:%M:%S")
    t0 = time.time()
    log(f"streaming ficdata file {fname}")

    lines_read = kept = rejected = quarantined = decode_replacements = 0
    fic_batch = []
    q_batch = []

    for rec in sunbiz_parser.iter_records(FICDATA_PATH, "ficdata", layouts=layouts):
        lines_read += 1
        if not rec["_ok"]:
            quarantined += 1
            q_batch.append((fname, rec["_line_number"], _reason_for(rec), rec.get("_raw")))
            if len(q_batch) >= BATCH_SIZE:
                _flush_quarantine(conn, q_batch)
            continue

        z5 = zip5(rec.get("zip", ""))
        if z5 not in target_zips:
            rejected += 1
            continue

        kept += 1
        if rec.get("_had_decode_replacement"):
            decode_replacements += 1
        fic_batch.append((
            rec["doc_number"], rec["fic_name"], rec["status"], rec["county"],
            rec["addr1"], rec["addr2"], rec["city"], rec["state"], rec["zip"], z5,
            rec["filing_date"], rec["expiration_date"], rec["num_owners"],
            rec["owner1_name"], rec["owner1_name_format"], rec["owner1_charter_number"],
        ))
        if len(fic_batch) >= BATCH_SIZE:
            conn.executemany(FIC_INSERT, fic_batch)
            fic_batch.clear()

        if lines_read % PROGRESS_EVERY == 0:
            log(f"  {fname}: {lines_read} lines read, {kept} kept, {rejected} rejected, "
                f"{quarantined} quarantined ({round(time.time() - t0, 1)}s)")

    if fic_batch:
        conn.executemany(FIC_INSERT, fic_batch)
    _flush_quarantine(conn, q_batch)
    conn.commit()

    log(f"finished {fname}: {lines_read} lines, {kept} kept, {rejected} rejected, "
        f"{quarantined} quarantined, {decode_replacements} decode_replacements ({round(time.time() - t0, 1)}s)")
    _log_ingest(conn, fname, lines_read, kept, rejected, quarantined, decode_replacements, started_at)
    _check_quarantine_threshold(fname, lines_read, quarantined)


# ---------------------------------------------------------------------------
# Step 6: summary
# ---------------------------------------------------------------------------

def print_summary(conn, target_zips):
    print("\n" + "#" * 78)
    print("# PHASE 1 INGEST SUMMARY")
    print("#" * 78)

    places_n = conn.execute("SELECT COUNT(*) FROM places").fetchone()[0]
    corp_n = conn.execute("SELECT COUNT(*) FROM sunbiz_corp").fetchone()[0]
    fic_n = conn.execute("SELECT COUNT(*) FROM sunbiz_fic").fetchone()[0]
    q_n = conn.execute("SELECT COUNT(*) FROM quarantine").fetchone()[0]

    print(f"\nrow counts: places={places_n}  sunbiz_corp={corp_n}  sunbiz_fic={fic_n}  quarantine={q_n}")

    print(f"\ntarget zip set ({len(target_zips)}): {sorted(target_zips)}")

    print(f"\n{'source_file':<20}{'lines_read':>12}{'kept_in_zip':>14}{'rejected':>12}{'quarantined':>13}{'decode_repl':>13}")
    for row in conn.execute(
        "SELECT source_file, lines_read, kept_in_zip, rejected_out_of_zip, quarantined, decode_replacements "
        "FROM ingest_log ORDER BY id"
    ):
        print(f"{row[0]:<20}{row[1]:>12}{row[2]:>14}{row[3]:>12}{row[4]:>13}{row[5]:>13}")
    print("(decode_repl = kept rows where a field had an undecodable byte for the file's encoding, "
          "recovered as U+FFFD rather than quarantined -- not a length problem, flagged for visibility)")

    bridge_n = conn.execute(
        "SELECT COUNT(*) FROM sunbiz_fic f "
        "WHERE f.owner1_charter_number != '' "
        "AND EXISTS (SELECT 1 FROM sunbiz_corp c WHERE c.doc_number = f.owner1_charter_number)"
    ).fetchone()[0]
    print(f"\nsunbiz_fic rows whose owner1_charter_number matches an existing sunbiz_corp.doc_number "
          f"(in-zip DBA -> entity bridge preview): {bridge_n} / {fic_n}")
    print("\n" + "#" * 78)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    with open(NEIGHBORHOODS_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    layouts = sunbiz_parser.load_layouts(LAYOUTS_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")
    build_schema(conn)

    load_places(conn)
    target_zips = derive_target_zips(conn, config)

    stream_cordata(conn, layouts, target_zips)
    stream_ficdata(conn, layouts, target_zips)

    print_summary(conn, target_zips)
    conn.close()


if __name__ == "__main__":
    main()
