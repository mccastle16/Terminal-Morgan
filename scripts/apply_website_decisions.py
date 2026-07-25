#!/usr/bin/env python3
"""
Apply manual website-review decisions (from website_review/_decisions.json) to
the CSVs and to Neo4j.

  replace -> website = <user URL>,  website_verified = 'verified'   (human-confirmed)
  delete  -> website = '',          website_verified = ''           (no website)

Backs up every file it touches. Also updates the live Neo4j nodes.

  python3 scripts/apply_website_decisions.py --dry-run
  python3 scripts/apply_website_decisions.py --apply
"""
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEW = ROOT / "data" / "website_review"
DECISIONS = REVIEW / "_decisions.json"
MASTER = ROOT / "data" / "master_all_businesses.csv"
UNION = ROOT / "dashboard" / "public" / "data" / "union_all_businesses.csv"
LITE = ROOT / "dashboard" / "public" / "data" / "businesses_lite.csv"
BACKUP = ROOT / "data" / "snapshots"
APPLY = "--apply" in sys.argv

# The 8th decision that never got saved when the review paused.
EXTRA = {"Allied North America Insurance Brokerage Of FL LLC": {"action": "delete", "value": ""}}


def load_decisions():
    d = json.loads(DECISIONS.read_text(encoding="utf-8")) if DECISIONS.exists() else {}
    for k, v in EXTRA.items():
        d.setdefault(k, v)
    DECISIONS.write_text(json.dumps(d, indent=2), encoding="utf-8")
    return d


def resolve(action, value):
    """Return (website, website_verified) for a decision."""
    if action == "replace":
        return value.strip(), "verified"
    if action == "delete":
        return "", ""
    return None  # leave -> no change


def apply_csv(path, decisions, ts):
    with open(path, newline="", encoding="utf-8") as f:
        rdr = csv.DictReader(f); fields = list(rdr.fieldnames); rows = list(rdr)
    has_wv = "website_verified" in fields
    changed = []
    for r in rows:
        name = r.get("business_name", "")
        if name in decisions:
            res = resolve(decisions[name]["action"], decisions[name]["value"])
            if res is None:
                continue
            site, wv = res
            before = r.get("website", "")
            r["website"] = site
            if has_wv:
                r["website_verified"] = wv
            changed.append((name, before, site, wv))
    if APPLY and changed:
        BACKUP.mkdir(parents=True, exist_ok=True)
        (BACKUP / f"{path.stem}_pre_decisions_{ts}.csv").write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields); w.writeheader(); w.writerows(rows)
    print(f"  {path.name}: {len(changed)} rows {'updated' if APPLY else 'would update'}")
    return changed


def sync_neo4j(decisions):
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    from neo4j import GraphDatabase
    drv = GraphDatabase.driver(os.environ["NEO4J_URI"], auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]))
    # map name -> business_id from master
    ids = {}
    with open(MASTER, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("business_name") in decisions and r.get("business_id"):
                ids[r["business_name"]] = r["business_id"]
    batch = []
    for name, dec in decisions.items():
        res = resolve(dec["action"], dec["value"])
        if res is None or name not in ids:
            continue
        site, wv = res
        batch.append({"bid": ids[name], "site": site, "wv": wv})
    if not APPLY:
        print(f"  neo4j: would update {len(batch)} nodes")
        return
    with drv.session() as s:
        n = s.run(
            """
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            SET b.website = row.site, b.website_verified = row.wv
            RETURN count(b) AS n
            """, batch=batch).single()["n"]
    drv.close()
    print(f"  neo4j: updated {n} nodes")


def main():
    decisions = load_decisions()
    print(f"Decisions: {len(decisions)}")
    for name, d in decisions.items():
        tgt = d["value"] if d["action"] == "replace" else "(clear)"
        print(f"  {name[:42]:42s} {d['action']:8s} -> {tgt}")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    print("\nCSV updates:")
    apply_csv(MASTER, decisions, ts)
    apply_csv(UNION, decisions, ts)
    apply_csv(LITE, decisions, ts)
    print("\nNeo4j:")
    sync_neo4j(decisions)
    if not APPLY:
        print("\nDRY RUN — pass --apply to write.")


if __name__ == "__main__":
    main()
