#!/usr/bin/env python3
"""Quick gap audit of master CSV."""
import csv
from collections import Counter

rows = list(csv.DictReader(open("data/master_all_businesses.csv")))
n = len(rows)

print("=== REMAINING GAPS ===")
for f in ["address","website","phone","latitude","rating_primary_value","neighborhood_area"]:
    v = sum(1 for r in rows if not r.get(f,"").strip())
    print(f"  {f:35s}: {v:4d} missing ({v/n*100:.1f}%)")

print("\n=== CATEGORY DISTRIBUTION ===")
cats = Counter(r.get("category_primary","other") for r in rows)
for c, v in cats.most_common():
    print(f"  {c:30s}: {v:4d} ({v/n*100:.1f}%)")

print("\n=== VALIDATION TIERS ===")
tiers = Counter(r.get("validation_tier","") for r in rows)
for t, v in tiers.most_common():
    print(f"  {(t or 'blank'):15s}: {v:4d}")

print("\n=== CORROBORATION ===")
corr = [int(float(r.get("corroboration_count",0) or 0)) for r in rows]
print(f"  0 sources: {corr.count(0)} | 1: {sum(1 for c in corr if c==1)} | 2+: {sum(1 for c in corr if c>=2)}")

print("\n=== NEO4J vs CSV CATEGORY SYNC ===")
# Check if Neo4j categories match CSV categories
neo4j_cats = set()
try:
    import json
    graph = json.load(open("dashboard/public/data/graph_data.json"))
    for node in graph["nodes"]:
        if node.get("type") == "category":
            neo4j_cats.add(node.get("name",""))
    csv_cats = set(cats.keys())
    only_csv = csv_cats - neo4j_cats
    only_neo = neo4j_cats - csv_cats
    if only_csv: print(f"  In CSV but not graph: {only_csv}")
    if only_neo: print(f"  In graph but not CSV: {only_neo}")
    if not only_csv and not only_neo: print(f"  Perfectly synced ({len(csv_cats)} categories)")
    else: print(f"  CSV: {len(csv_cats)} | Graph: {len(neo4j_cats)}")
except Exception as e:
    print(f"  Error: {e}")

print("\n=== BUSINESSES WITH MOST MISSING FIELDS ===")
for r in rows:
    missing = 0
    for f in ["address","website","phone","latitude","rating_primary_value","neighborhood_area","postcode"]:
        if not r.get(f,"").strip():
            missing += 1
    r["_missing"] = missing
high_missing = [r for r in rows if r["_missing"] >= 5]
print(f"  5+ missing fields: {len(high_missing)} businesses")
high_missing.sort(key=lambda r: -r["_missing"])
for r in high_missing[:10]:
    print(f"    [{r['_missing']}] {r.get('business_name','?')} | src={r.get('source_file','?')}")

print("\n=== SOURCE FILE QUALITY ===")
sources = Counter(r.get("source_file","") for r in rows)
for s, cnt in sources.most_common(10):
    avg_missing = sum(r["_missing"] for r in rows if r.get("source_file","")==s) / max(cnt,1)
    print(f"  {s:50s}: {cnt:4d} rows, avg {avg_missing:.1f} missing fields")

print("\n=== PHONE FORMAT ISSUES ===")
import re
phones = [r.get("phone","").strip() for r in rows if r.get("phone","").strip()]
bad = [p for p in phones if not re.match(r"^\+?\d[\d\s\-().]{7,}$", p)]
print(f"  Total with phone: {len(phones)} | Bad format: {len(bad)}")
if bad:
    print(f"  Samples: {bad[:10]}")
