"""Phase 2 normalization driver: reads ingest.db (Phase 1's output),
computes normalized name/address fields for places, sunbiz_corp, and
sunbiz_fic using normalize.py, and writes them back as new columns.

Also generates:
  - significant name tokens (for Phase 3 blocking)
  - DBA bridge resolution (sunbiz_fic -> sunbiz_corp via owner1_charter_number)
  - mailbox / registered-agent address indicators (keyword match OR an
    address shared by an unusual number of distinct SunBiz filings)

Run from the `data/` directory:  python phase2_normalize.py
"""
import collections
import sqlite3
import sys
import time

import normalize as norm

# See phase1_ingest.py for why: Windows console cp1252 can't encode every
# real business name, and would otherwise crash the run on the first one.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = "ingest.db"
BATCH_SIZE = 5000

# An exact (street_number + street_norm + unit + city/state) combo shared by
# this many or more distinct SunBiz filings is treated as a likely
# registered-agent / mailbox / office-suite-provider address rather than a
# real single-business location. Grouping includes unit/suite deliberately:
# without it, a single large office tower with hundreds of legitimately
# distinct tenants (each in their own suite) looks identical to one law
# firm's single suite representing hundreds of client LLCs -- both produce
# "many filings at this street address," but only the latter is actually a
# registered-agent signal. Threshold of 20 was picked empirically against
# the real data (see conversation record): the distribution is fat-tailed
# with a large legitimate population at count 2-10 (a family or investor
# holding a handful of single-property LLCs at their own address is normal
# in FL and shouldn't be flagged), while the top of the tail (400-1300+
# filings at one suite) is unambiguously a corporate service provider.
SHARED_ADDRESS_THRESHOLD = 20


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


def _add_columns(conn, table, columns):
    """columns: dict of name -> SQL type. Skips any that already exist so
    the script is safely re-runnable.
    """
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, sqltype in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {sqltype}")
    conn.commit()


PLACES_NORM_COLUMNS = {
    "name_norm": "TEXT", "name_core": "TEXT", "name_tokens": "TEXT",
    "street_norm": "TEXT", "street_number_norm": "TEXT", "unit_norm": "TEXT",
    "city_norm": "TEXT", "state_norm": "TEXT",
}
CORP_NORM_COLUMNS = {
    "name_norm": "TEXT", "name_core": "TEXT", "name_tokens": "TEXT",
    "street_norm": "TEXT", "street_number_norm": "TEXT", "unit_norm": "TEXT",
    "city_norm": "TEXT", "state_norm": "TEXT",
    "addr_used_line": "TEXT", "is_care_of": "INTEGER",
    "is_mailbox_or_agent": "INTEGER", "shared_address_count": "INTEGER",
}
FIC_NORM_COLUMNS = {
    "name_norm": "TEXT", "name_core": "TEXT", "name_tokens": "TEXT",
    "street_norm": "TEXT", "street_number_norm": "TEXT", "unit_norm": "TEXT",
    "city_norm": "TEXT", "state_norm": "TEXT",
    "addr_used_line": "TEXT", "is_care_of": "INTEGER",
    "is_mailbox_or_agent": "INTEGER", "shared_address_count": "INTEGER",
    "bridge_doc_number": "TEXT", "bridge_status": "TEXT",
}


def _name_fields(raw_name):
    name_norm = norm.normalize_name(raw_name)
    core, _removed = norm.strip_legal_suffix(name_norm)
    tokens = norm.significant_tokens(core)
    return name_norm, core, " ".join(tokens)


# ---------------------------------------------------------------------------
# places
# ---------------------------------------------------------------------------

def normalize_places(conn):
    _add_columns(conn, "places", PLACES_NORM_COLUMNS)
    log("normalizing places")
    rows = conn.execute(
        "SELECT place_id, name, street_number, street, city, state, formatted_address FROM places"
    ).fetchall()

    batch = []
    for place_id, name, street_number, street, city, state, formatted_address in rows:
        name_norm, name_core, name_tokens = _name_fields(name)
        street_norm = norm.normalize_street_name(street)
        street_number_norm = norm.normalize_street_number(street_number) or (street_number or "").strip()
        unit_norm = norm.extract_unit_from_text(formatted_address)
        city_norm = norm.normalize_city(city)
        state_norm = norm.normalize_state(state)
        batch.append((name_norm, name_core, name_tokens, street_norm, street_number_norm, unit_norm,
                       city_norm, state_norm, place_id))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "UPDATE places SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
                "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=? WHERE place_id=?", batch)
            batch.clear()
    if batch:
        conn.executemany(
            "UPDATE places SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
            "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=? WHERE place_id=?", batch)
    conn.commit()
    log(f"places normalized: {len(rows)} rows")


# ---------------------------------------------------------------------------
# sunbiz_corp
# ---------------------------------------------------------------------------

def normalize_sunbiz_corp(conn):
    _add_columns(conn, "sunbiz_corp", CORP_NORM_COLUMNS)
    log("normalizing sunbiz_corp")
    rows = conn.execute(
        "SELECT doc_number, name, princ_addr1, princ_addr2, princ_city, princ_state "
        "FROM sunbiz_corp"
    ).fetchall()

    computed = {}
    address_counts = collections.Counter()
    for doc_number, name, addr1, addr2, city, state in rows:
        name_norm, name_core, name_tokens = _name_fields(name)
        addr = norm.normalize_street_address(addr1, addr2)
        city_norm = norm.normalize_city(city)
        state_norm = norm.normalize_state(state)
        is_mailbox_kw = norm.looks_like_mailbox_address(addr["street_norm"], addr["unit"])
        computed[doc_number] = {
            "name_norm": name_norm, "name_core": name_core, "name_tokens": name_tokens,
            "street_norm": addr["street_norm"], "street_number_norm": addr["street_number"],
            "unit_norm": addr["unit"], "city_norm": city_norm, "state_norm": state_norm,
            "addr_used_line": addr["used_line"], "is_care_of": int(addr["is_care_of"]),
            "is_mailbox_kw": is_mailbox_kw,
        }
        addr_key = (addr["street_number"], addr["street_norm"], addr["unit"], city_norm, state_norm)
        if addr["street_number"] or addr["street_norm"]:
            address_counts[addr_key] += 1

    batch = []
    for doc_number, c in computed.items():
        addr_key = (c["street_number_norm"], c["street_norm"], c["unit_norm"], c["city_norm"], c["state_norm"])
        shared = address_counts.get(addr_key, 0)
        is_mailbox_or_agent = int(c["is_mailbox_kw"] or shared >= SHARED_ADDRESS_THRESHOLD)
        batch.append((
            c["name_norm"], c["name_core"], c["name_tokens"], c["street_norm"],
            c["street_number_norm"], c["unit_norm"], c["city_norm"], c["state_norm"],
            c["addr_used_line"], c["is_care_of"], is_mailbox_or_agent, shared, doc_number,
        ))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "UPDATE sunbiz_corp SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
                "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=?, addr_used_line=?, "
                "is_care_of=?, is_mailbox_or_agent=?, shared_address_count=? WHERE doc_number=?", batch)
            batch.clear()
    if batch:
        conn.executemany(
            "UPDATE sunbiz_corp SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
            "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=?, addr_used_line=?, "
            "is_care_of=?, is_mailbox_or_agent=?, shared_address_count=? WHERE doc_number=?", batch)
    conn.commit()
    log(f"sunbiz_corp normalized: {len(rows)} rows")


# ---------------------------------------------------------------------------
# sunbiz_fic (+ DBA bridge to sunbiz_corp)
# ---------------------------------------------------------------------------

def normalize_sunbiz_fic(conn):
    _add_columns(conn, "sunbiz_fic", FIC_NORM_COLUMNS)
    log("normalizing sunbiz_fic")
    rows = conn.execute(
        "SELECT doc_number, fic_name, addr1, addr2, city, state, owner1_charter_number "
        "FROM sunbiz_fic"
    ).fetchall()

    known_corp_docs = {row[0] for row in conn.execute("SELECT doc_number FROM sunbiz_corp")}

    computed = {}
    address_counts = collections.Counter()
    for doc_number, fic_name, addr1, addr2, city, state, owner1_charter_number in rows:
        name_norm, name_core, name_tokens = _name_fields(fic_name)
        addr = norm.normalize_street_address(addr1, addr2)
        city_norm = norm.normalize_city(city)
        state_norm = norm.normalize_state(state)
        is_mailbox_kw = norm.looks_like_mailbox_address(addr["street_norm"], addr["unit"])

        charter = (owner1_charter_number or "").strip()
        if charter and charter in known_corp_docs:
            bridge_doc_number, bridge_status = charter, "resolved"
        elif charter:
            bridge_doc_number, bridge_status = None, "unresolved"
        else:
            bridge_doc_number, bridge_status = None, "no_charter_number"

        computed[doc_number] = {
            "name_norm": name_norm, "name_core": name_core, "name_tokens": name_tokens,
            "street_norm": addr["street_norm"], "street_number_norm": addr["street_number"],
            "unit_norm": addr["unit"], "city_norm": city_norm, "state_norm": state_norm,
            "addr_used_line": addr["used_line"], "is_care_of": int(addr["is_care_of"]),
            "is_mailbox_kw": is_mailbox_kw,
            "bridge_doc_number": bridge_doc_number, "bridge_status": bridge_status,
        }
        addr_key = (addr["street_number"], addr["street_norm"], addr["unit"], city_norm, state_norm)
        if addr["street_number"] or addr["street_norm"]:
            address_counts[addr_key] += 1

    batch = []
    for doc_number, c in computed.items():
        addr_key = (c["street_number_norm"], c["street_norm"], c["unit_norm"], c["city_norm"], c["state_norm"])
        shared = address_counts.get(addr_key, 0)
        is_mailbox_or_agent = int(c["is_mailbox_kw"] or shared >= SHARED_ADDRESS_THRESHOLD)
        batch.append((
            c["name_norm"], c["name_core"], c["name_tokens"], c["street_norm"],
            c["street_number_norm"], c["unit_norm"], c["city_norm"], c["state_norm"],
            c["addr_used_line"], c["is_care_of"], is_mailbox_or_agent, shared,
            c["bridge_doc_number"], c["bridge_status"], doc_number,
        ))
        if len(batch) >= BATCH_SIZE:
            conn.executemany(
                "UPDATE sunbiz_fic SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
                "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=?, addr_used_line=?, "
                "is_care_of=?, is_mailbox_or_agent=?, shared_address_count=?, "
                "bridge_doc_number=?, bridge_status=? WHERE doc_number=?", batch)
            batch.clear()
    if batch:
        conn.executemany(
            "UPDATE sunbiz_fic SET name_norm=?, name_core=?, name_tokens=?, street_norm=?, "
            "street_number_norm=?, unit_norm=?, city_norm=?, state_norm=?, addr_used_line=?, "
            "is_care_of=?, is_mailbox_or_agent=?, shared_address_count=?, "
            "bridge_doc_number=?, bridge_status=? WHERE doc_number=?", batch)
    conn.commit()
    log(f"sunbiz_fic normalized: {len(rows)} rows")


# ---------------------------------------------------------------------------
# Summary / acceptance evidence
# ---------------------------------------------------------------------------

def print_summary(conn):
    print("\n" + "#" * 78)
    print("# PHASE 2 NORMALIZATION SUMMARY")
    print("#" * 78)

    for table in ("places", "sunbiz_corp", "sunbiz_fic"):
        total = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        populated = conn.execute(
            f"SELECT COUNT(*) FROM {table} WHERE name_norm IS NOT NULL AND name_norm != ''"
        ).fetchone()[0]
        print(f"\n{table}: {populated}/{total} rows with non-empty name_norm")

    print("\n--- sample: places name normalization ---")
    for name, name_core, tokens in conn.execute(
        "SELECT name, name_core, name_tokens FROM places LIMIT 8"
    ):
        print(f"  {name!r:60} -> core={name_core!r:45} tokens={tokens!r}")

    print("\n--- sample: sunbiz_corp name + address normalization ---")
    for name, core, street_num, street, unit, used_line, care_of in conn.execute(
        "SELECT name, name_core, street_number_norm, street_norm, unit_norm, addr_used_line, is_care_of "
        "FROM sunbiz_corp LIMIT 8"
    ):
        print(f"  {name!r:50} -> core={core!r:35} addr=[{street_num} {street}] unit={unit!r} "
              f"line={used_line} care_of={bool(care_of)}")

    n_mailbox_corp = conn.execute(
        "SELECT COUNT(*) FROM sunbiz_corp WHERE is_mailbox_or_agent = 1"
    ).fetchone()[0]
    n_mailbox_fic = conn.execute(
        "SELECT COUNT(*) FROM sunbiz_fic WHERE is_mailbox_or_agent = 1"
    ).fetchone()[0]
    n_care_of = conn.execute("SELECT COUNT(*) FROM sunbiz_corp WHERE is_care_of = 1").fetchone()[0]
    print(f"\nmailbox/registered-agent flagged: sunbiz_corp={n_mailbox_corp}, sunbiz_fic={n_mailbox_fic}")
    print(f"care-of (C/O) addresses detected in sunbiz_corp: {n_care_of}")

    print("\ntop shared address+unit combos in sunbiz_corp (likely registered-agent suites):")
    for street_num, street, unit, city, n in conn.execute(
        "SELECT street_number_norm, street_norm, unit_norm, city_norm, shared_address_count "
        "FROM sunbiz_corp WHERE shared_address_count >= ? "
        "GROUP BY street_number_norm, street_norm, unit_norm, city_norm "
        "ORDER BY shared_address_count DESC LIMIT 8",
        (SHARED_ADDRESS_THRESHOLD,),
    ):
        print(f"  {street_num} {street} {unit!r}, {city}  (shared by {n} filings)")

    print("\n--- DBA bridge (sunbiz_fic -> sunbiz_corp) ---")
    for status, n in conn.execute(
        "SELECT bridge_status, COUNT(*) FROM sunbiz_fic GROUP BY bridge_status ORDER BY 2 DESC"
    ):
        print(f"  {status}: {n}")

    print("\n" + "#" * 78)


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL")

    normalize_places(conn)
    normalize_sunbiz_corp(conn)
    normalize_sunbiz_fic(conn)

    print_summary(conn)
    conn.close()


if __name__ == "__main__":
    main()
