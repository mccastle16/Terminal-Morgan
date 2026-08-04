#!/usr/bin/env python3
"""Comprehensive data integrity checker for the Terminal project."""

import csv
import json
import os
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUB = ROOT / "dashboard" / "public" / "data"

def load_csv(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def check_master_csv():
    print("=" * 70)
    print("MASTER CSV INTEGRITY CHECK")
    print("=" * 70)
    rows = load_csv(DATA / "master_all_businesses.csv")
    print(f"Total rows: {len(rows)}")
    print(f"Columns: {len(rows[0].keys())}")

    # Duplicate IDs
    ids = [r.get("business_id", "") for r in rows]
    unique_ids = set(ids)
    print(f"\nUnique business_ids: {len(unique_ids)} (dupes: {len(ids) - len(unique_ids)})")
    blank_ids = sum(1 for i in ids if not i.strip())
    print(f"Blank business_ids: {blank_ids}")

    # Duplicate names
    names = [r.get("business_name", "").strip().lower() for r in rows]
    name_counts = Counter(names)
    dupe_names = [(n, c) for n, c in name_counts.most_common(20) if c >= 2 and n]
    print(f"Duplicate business_names (2+): {len(dupe_names)}")
    for n, c in dupe_names[:10]:
        print(f"  '{n[:50]}' x{c}")

    # Field coverage
    print("\n--- FIELD COVERAGE ---")
    fields = [
        "phone", "website", "address", "latitude", "longitude", "postcode",
        "category_primary", "neighborhood_area", "rating_primary_value",
        "rating_primary_review_count", "chamber_member", "price_tier",
        "validation_tier", "red_flag_present", "source_file",
        "last_reviewed_date", "corroboration_count", "osint_confidence",
        "price_tier_source", "category_secondary",
    ]
    coverage = {}
    for f_name in fields:
        filled = sum(1 for r in rows if r.get(f_name, "").strip())
        pct = filled / len(rows) * 100
        coverage[f_name] = pct
        flag = " *** LOW" if pct < 50 else ""
        print(f"  {f_name:35s}: {filled:5d}/{len(rows)} ({pct:5.1f}%){flag}")

    # Suspicious patterns
    print("\n--- SUSPICIOUS PATTERNS ---")

    # Addresses with many businesses
    addrs = [r.get("address", "").strip().lower() for r in rows if r.get("address", "").strip()]
    addr_counts = Counter(addrs)
    heavy_addrs = [(a, c) for a, c in addr_counts.most_common(15) if c >= 5]
    print(f"Addresses with 5+ businesses: {len(heavy_addrs)}")
    for a, c in heavy_addrs[:5]:
        print(f"  {a[:60]}: {c}")

    # Rating anomalies
    rated = []
    for r in rows:
        try:
            v = float(r.get("rating_primary_value", 0) or 0)
            if v > 0:
                rated.append(v)
        except (ValueError, TypeError):
            pass
    perfect = sum(1 for x in rated if x == 5.0)
    low = sum(1 for x in rated if x < 2.0)
    no_rating = len(rows) - len(rated)
    print(f"\nRating stats: {len(rated)} rated, {no_rating} unrated ({no_rating/len(rows)*100:.1f}%)")
    print(f"  Perfect 5.0: {perfect} ({perfect/max(len(rated),1)*100:.1f}%)")
    print(f"  Below 2.0: {low}")
    print(f"  Out of range (>5 or <0): {sum(1 for x in rated if x > 5 or x < 0)}")

    # Review count vs rating cross-check
    rated_no_reviews = 0
    reviews_no_rating = 0
    for r in rows:
        try:
            rat = float(r.get("rating_primary_value", 0) or 0)
        except:
            rat = 0
        try:
            rev = int(float(r.get("rating_primary_review_count", 0) or 0))
        except:
            rev = 0
        if rat > 0 and rev == 0:
            rated_no_reviews += 1
        if rev > 0 and rat == 0:
            reviews_no_rating += 1
    print(f"  Has rating but 0 reviews: {rated_no_reviews}")
    print(f"  Has reviews but 0 rating: {reviews_no_rating}")

    # Category health
    cats = Counter(r.get("category_primary", "").strip().lower() for r in rows)
    others = cats.get("other", 0) + cats.get("", 0)
    print(f"\nCategory: 'other' or blank: {others} ({others/len(rows)*100:.1f}%)")

    # Membership unknown  
    unk = sum(1 for r in rows if r.get("chamber_member", "").strip() not in ("Y", "N"))
    print(f"Membership unknown: {unk} ({unk/len(rows)*100:.1f}%)")

    # OSINT confidence type inconsistency
    conf_vals = set(r.get("osint_confidence", "") for r in rows)
    text_vals = sorted([v for v in conf_vals if v and not v.replace(".", "").replace("-", "").isdigit()])
    if text_vals:
        print(f"Non-numeric osint_confidence: {text_vals}")

    # Geo validation
    out_of_bounds = 0
    has_geo = 0
    for r in rows:
        try:
            lat = float(r.get("latitude", 0) or 0)
            lon = float(r.get("longitude", 0) or 0)
            if lat != 0 and lon != 0:
                has_geo += 1
                # Coral Gables rough bounds: lat 25.68-25.78, lon -80.32 to -80.24
                if not (25.60 <= lat <= 25.85 and -80.40 <= lon <= -80.15):
                    out_of_bounds += 1
        except:
            pass
    print(f"\nGeo: {has_geo} with coordinates, {out_of_bounds} outside Coral Gables bounds")

    # Red flags analysis
    flagged = [r for r in rows if r.get("red_flag_present", "").strip() == "Y"]
    print(f"\nRed flags: {len(flagged)} flagged ({len(flagged)/len(rows)*100:.1f}%)")
    if flagged:
        sev = Counter(r.get("red_flag_severity", "unknown") for r in flagged)
        print(f"  Severity: {dict(sev)}")

    # Price tier check
    pt = Counter(r.get("price_tier", "") for r in rows)
    pts = Counter(r.get("price_tier_source", "") for r in rows)
    print(f"\nPrice tiers: {dict(pt)}")
    print(f"Price tier sources: {dict(pts)}")

    return rows


def check_json_outputs():
    print("\n" + "=" * 70)
    print("JSON OUTPUT INTEGRITY")
    print("=" * 70)

    json_files = {
        "sentiment_profiles.json": "business_id",
        "sentiment_themes.json": None,
        "network_centrality.json": None,
        "predictions.json": "business_id",
        "prediction_summary.json": None,
        "graph_data.json": None,
        "graph_stats.json": None,
    }

    for fn, id_field in json_files.items():
        path = PUB / fn
        if not path.exists():
            print(f"\n  {fn}: MISSING!")
            continue

        with open(path) as f:
            data = json.load(f)

        size_kb = path.stat().st_size / 1024
        if isinstance(data, list):
            print(f"\n  {fn}: {len(data)} records, {size_kb:.0f} KB")
            if id_field and data:
                ids = [d.get(id_field, "") for d in data]
                unique = len(set(ids))
                print(f"    Unique {id_field}: {unique} (dupes: {len(ids) - unique})")
                blanks = sum(1 for i in ids if not i)
                if blanks:
                    print(f"    Blank {id_field}: {blanks}")
        elif isinstance(data, dict):
            print(f"\n  {fn}: dict with {len(data)} top-level keys, {size_kb:.0f} KB")
            for k in list(data.keys())[:8]:
                v = data[k]
                if isinstance(v, list):
                    print(f"    {k}: list[{len(v)}]")
                elif isinstance(v, dict):
                    print(f"    {k}: dict[{len(v)}]")
                else:
                    print(f"    {k}: {str(v)[:60]}")


def check_csv_json_alignment():
    """Verify that JSON outputs align with the master CSV."""
    print("\n" + "=" * 70)
    print("CSV <-> JSON ALIGNMENT")
    print("=" * 70)

    rows = load_csv(DATA / "master_all_businesses.csv")
    csv_ids = set(r.get("business_id", "").strip() for r in rows if r.get("business_id", "").strip())
    print(f"Master CSV unique IDs: {len(csv_ids)}")

    for fn in ["sentiment_profiles.json", "predictions.json"]:
        path = PUB / fn
        if not path.exists():
            print(f"  {fn}: MISSING")
            continue
        with open(path) as f:
            data = json.load(f)

        json_ids = set()
        for d in data:
            bid = d.get("business_id", "")
            if bid:
                json_ids.add(bid)

        in_csv_not_json = csv_ids - json_ids
        in_json_not_csv = json_ids - csv_ids
        overlap = csv_ids & json_ids
        print(f"\n  {fn}:")
        print(f"    JSON IDs: {len(json_ids)}")
        print(f"    Overlap with CSV: {len(overlap)}")
        print(f"    In CSV but not JSON: {len(in_csv_not_json)}")
        print(f"    In JSON but not CSV: {len(in_json_not_csv)} {'*** ORPHANS' if in_json_not_csv else ''}")

    # Check graph_data alignment
    gpath = PUB / "graph_data.json"
    if gpath.exists():
        with open(gpath) as f:
            graph = json.load(f)
        biz_nodes = [n for n in graph.get("nodes", []) if n.get("type") == "business"]
        graph_ids = set(n.get("id", "") for n in biz_nodes)
        print(f"\n  graph_data.json business nodes: {len(graph_ids)}")
        not_in_csv = graph_ids - csv_ids
        not_in_graph = csv_ids - graph_ids
        print(f"    Graph businesses not in CSV: {len(not_in_csv)}")
        print(f"    CSV businesses not in graph: {len(not_in_graph)}")


def check_dashboard_csv():
    """Check dashboard's copy of the CSV matches master."""
    print("\n" + "=" * 70)
    print("DASHBOARD CSV vs MASTER CSV")
    print("=" * 70)

    master = load_csv(DATA / "master_all_businesses.csv")
    
    for fn in ["businesses_lite.csv", "union_all_businesses.csv"]:
        path = PUB / fn
        if not path.exists():
            print(f"  {fn}: MISSING")
            continue
        dash = load_csv(path)
        print(f"\n  {fn}: {len(dash)} rows (master: {len(master)})")
        print(f"    Columns: {len(dash[0].keys())}")
        
        # Check if IDs match
        master_ids = set(r.get("business_id", "") for r in master)
        dash_ids = set(r.get("business_id", "") for r in dash)
        only_master = master_ids - dash_ids
        only_dash = dash_ids - master_ids
        if only_master:
            print(f"    In master but not dashboard: {len(only_master)}")
        if only_dash:
            print(f"    In dashboard but not master: {len(only_dash)}")
        if not only_master and not only_dash:
            print(f"    ID sets match perfectly")


if __name__ == "__main__":
    check_master_csv()
    check_json_outputs()
    check_csv_json_alignment()
    check_dashboard_csv()
    print("\n" + "=" * 70)
    print("INTEGRITY CHECK COMPLETE")
    print("=" * 70)
