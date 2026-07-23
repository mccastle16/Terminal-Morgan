#!/usr/bin/env python3
"""
Push the `website_verified` flag from master_all_businesses.csv onto existing
Neo4j :Business nodes (no full reload). Run this after the website re-validation
so the dashboard can badge unverified websites.

  python3 scripts/push_website_verified.py

Reads NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD from the repo-root .env.
"""
import csv
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "data" / "master_all_businesses.csv"

# Load .env
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from neo4j import GraphDatabase

URI = os.environ["NEO4J_URI"]
USER = os.environ["NEO4J_USER"]
PW = os.environ["NEO4J_PASSWORD"]


def main():
    rows = []
    with open(MASTER, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            bid = (r.get("business_id", "") or "").strip()
            if bid:
                rows.append({"bid": bid, "wv": (r.get("website_verified", "") or "").strip()})

    from collections import Counter
    dist = Counter(x["wv"] or "none" for x in rows)
    print(f"Pushing website_verified for {len(rows)} businesses: {dict(dist)}")

    driver = GraphDatabase.driver(URI, auth=(USER, PW))
    updated = 0
    with driver.session() as s:
        for i in range(0, len(rows), 500):
            batch = rows[i:i + 500]
            res = s.run(
                """
                UNWIND $batch AS row
                MATCH (b:Business {business_id: row.bid})
                SET b.website_verified = row.wv
                RETURN count(b) AS n
                """,
                batch=batch,
            ).single()
            updated += res["n"]
    driver.close()
    print(f"Updated website_verified on {updated} Business nodes.")


if __name__ == "__main__":
    main()
