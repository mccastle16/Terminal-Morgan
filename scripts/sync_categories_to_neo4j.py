#!/usr/bin/env python3
"""
Sync corrected category_primary from master_all_businesses.csv into live Neo4j.
Updates BOTH the node property (b.category_primary) and the CLASSIFIED_AS
relationship to the Category node (used by the graph explorer + analytics).

Only touches businesses whose DB category differs from the CSV AND whose target
category has an existing Category node (so the special buckets government /
media_entertainment / transportation are left untouched). Backs up the affected
rows' prior state first.

  python3 scripts/sync_categories_to_neo4j.py            # backup + sync
  python3 scripts/sync_categories_to_neo4j.py --dry-run  # report only
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
    csv_cat = {}
    names = {}
    with open(MASTER, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            bid = (r.get("business_id", "") or "").strip()
            if bid:
                csv_cat[bid] = (r.get("category_primary", "") or "").strip()
                names[bid] = r.get("business_name", "")

    with driver.session() as s:
        slugs = {r["slug"] for r in s.run("MATCH (c:Category) RETURN c.slug AS slug").data()}
        db_prop = {r["bid"]: (r["cat"] or "") for r in
                   s.run("MATCH (b:Business) RETURN b.business_id AS bid, b.category_primary AS cat").data() if r["bid"]}
        db_rel = {r["bid"]: (r["slug"] or "") for r in
                  s.run("MATCH (b:Business)-[:CLASSIFIED_AS]->(c:Category) RETURN b.business_id AS bid, c.slug AS slug").data() if r["bid"]}

        # Businesses to change: DB differs from CSV, and target category exists as a node
        targets = []
        skipped_no_node = []
        for bid, cat in csv_cat.items():
            if bid not in db_prop:
                continue
            differs = db_prop[bid].strip() != cat or db_rel.get(bid, "").strip() != cat
            if not differs:
                continue
            if cat not in slugs:
                skipped_no_node.append((bid, cat))
                continue
            targets.append({"bid": bid, "cat": cat})

        print(f"Businesses needing category sync: {len(targets)}")
        if skipped_no_node:
            print(f"Skipped (no Category node for target): {len(skipped_no_node)} "
                  f"-> {sorted(set(c for _, c in skipped_no_node))}")

        # Backup affected rows' prior state
        BACKUP.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        snap = BACKUP / f"neo4j_categories_backup_{ts}.csv"
        with open(snap, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["business_id", "business_name", "old_category_primary", "old_classified_as", "new_category"])
            for t in targets:
                bid = t["bid"]
                w.writerow([bid, names.get(bid, ""), db_prop.get(bid, ""), db_rel.get(bid, ""), t["cat"]])
        print(f"Backup of prior state -> {snap.relative_to(ROOT)}")

        if DRY:
            print("DRY RUN — no writes.")
            return

        updated = 0
        for i in range(0, len(targets), 500):
            batch = targets[i:i + 500]
            res = s.run(
                """
                UNWIND $batch AS row
                MATCH (b:Business {business_id: row.bid})
                SET b.category_primary = row.cat
                WITH b, row
                OPTIONAL MATCH (b)-[old:CLASSIFIED_AS]->(:Category)
                DELETE old
                WITH b, row
                MATCH (c:Category {slug: row.cat})
                MERGE (b)-[:CLASSIFIED_AS]->(c)
                RETURN count(b) AS n
                """,
                batch=batch,
            ).single()
            updated += res["n"]
        print(f"Synced category_primary + CLASSIFIED_AS on {updated} Business nodes.")

    driver.close()


if __name__ == "__main__":
    main()
