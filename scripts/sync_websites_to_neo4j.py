#!/usr/bin/env python3
"""
Sync corrected `website` values (and the `website_verified` flag) from
master_all_businesses.csv into the live Neo4j :Business nodes.

Backs up the current DB website values to data/snapshots/ first (rollback point),
then SET b.website / b.website_verified by business_id.

  python3 scripts/sync_websites_to_neo4j.py            # backup + sync
  python3 scripts/sync_websites_to_neo4j.py --dry-run  # report only, no writes
"""
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "data" / "master_all_businesses.csv"
BACKUP = ROOT / "data" / "snapshots"
DRY = "--dry-run" in sys.argv

for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    os.environ["NEO4J_URI"],
    auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
)


def main():
    rows = []
    with open(MASTER, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            bid = (r.get("business_id", "") or "").strip()
            if bid:
                rows.append({
                    "bid": bid,
                    "site": (r.get("website", "") or "").strip(),
                    "wv": (r.get("website_verified", "") or "").strip(),
                })
    print(f"Master businesses with id: {len(rows)}")

    with driver.session() as s:
        # Snapshot current DB state
        db = {r["bid"]: {"name": r["name"], "site": r["site"] or ""}
              for r in s.run("MATCH (b:Business) RETURN b.business_id AS bid, b.name AS name, b.website AS site").data()
              if r["bid"]}
        BACKUP.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        snap = BACKUP / f"neo4j_websites_backup_{ts}.csv"
        with open(snap, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["business_id", "business_name", "website"])
            for bid, v in db.items():
                w.writerow([bid, v["name"], v["site"]])
        print(f"DB website snapshot -> {snap.relative_to(ROOT)} ({len(db)} nodes)")

        # How many will actually change
        changing = sum(1 for r in rows if r["bid"] in db and db[r["bid"]]["site"] != r["site"])
        print(f"Websites that will change: {changing}")

        if DRY:
            print("DRY RUN — no writes.")
            return

        updated = 0
        for i in range(0, len(rows), 500):
            batch = rows[i:i + 500]
            res = s.run(
                """
                UNWIND $batch AS row
                MATCH (b:Business {business_id: row.bid})
                SET b.website = row.site, b.website_verified = row.wv
                RETURN count(b) AS n
                """,
                batch=batch,
            ).single()
            updated += res["n"]
        print(f"Synced website + website_verified on {updated} Business nodes ({changing} website values changed).")

    driver.close()


if __name__ == "__main__":
    main()
