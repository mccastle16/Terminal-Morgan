#!/usr/bin/env python3
"""
Enhancement Script 20: Neo4j Sync + Geocode + Neighborhood Fill
================================================================
1. Sync Neo4j categories with CSV (update Neo4j nodes for new categories)
2. Geocode missing lat/lon from Neo4j geo data + postcode centroids
3. Fill missing neighborhoods from postcode mapping
4. Push updated geo/neighborhood back to Neo4j

Run: python3 scripts/20.\ neo4j_sync_and_geocode.py [--dry-run]
"""
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUB = ROOT / "dashboard" / "public" / "data"
MASTER = DATA / "master_all_businesses.csv"

DRY_RUN = "--dry-run" in sys.argv

NEO4J_URI = "bolt://localhost:7688"
NEO4J_USER = "neo4j"
NEO4J_PASS = "cgcc2024graph"


def load_master():
    with open(MASTER, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def save_master(rows, fieldnames):
    if DRY_RUN:
        print("  [DRY RUN] Would write master CSV")
        return
    with open(MASTER, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  Saved master CSV ({len(rows)} rows)")


def safe_float(val, default=0.0):
    try:
        return float(str(val).strip()) if val else default
    except (ValueError, TypeError):
        return default


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: SYNC NEO4J CATEGORIES WITH CSV
# ═══════════════════════════════════════════════════════════════════════════════

def sync_neo4j_categories(rows):
    """Create missing Neo4j Category nodes for new CSV categories and
    update CLASSIFIED_AS edges to match current CSV assignments."""
    from neo4j import GraphDatabase

    print("\n[1/3] SYNCING Neo4j categories with CSV...")

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))

    with driver.session() as s:
        # Get existing Neo4j categories
        existing = s.run("MATCH (c:Category) RETURN c.slug AS slug").data()
        neo4j_slugs = {r["slug"] for r in existing}
        print(f"  Neo4j has {len(neo4j_slugs)} categories: {sorted(neo4j_slugs)}")

        # Get CSV categories
        csv_cats = set(r.get("category_primary", "") for r in rows if r.get("category_primary", ""))
        print(f"  CSV has {len(csv_cats)} categories: {sorted(csv_cats)}")

        # Find new categories to create
        new_cats = csv_cats - neo4j_slugs
        if new_cats:
            print(f"  Creating {len(new_cats)} new category nodes: {sorted(new_cats)}")
            if not DRY_RUN:
                for cat in sorted(new_cats):
                    display = cat.replace("_", " ").title()
                    s.run(
                        "CREATE (c:Category {slug: $slug, display_name: $display, node_type: 'category'})",
                        slug=cat, display=display
                    )
        else:
            print("  No new categories needed")

        # Now update business CLASSIFIED_AS edges to match current CSV
        # First get current CSV assignments
        csv_assignments = {}
        for r in rows:
            bid = r.get("business_id", "").strip()
            cat = r.get("category_primary", "").strip()
            if bid and cat:
                csv_assignments[bid] = cat

        # Get current Neo4j assignments
        neo4j_assignments = {}
        result = s.run("""
            MATCH (b:Business)-[:CLASSIFIED_AS]->(c:Category)
            RETURN b.business_id AS bid, c.slug AS cat
        """).data()
        for r in result:
            neo4j_assignments[r["bid"]] = r["cat"]

        # Find mismatches
        mismatches = 0
        for bid, csv_cat in csv_assignments.items():
            neo_cat = neo4j_assignments.get(bid, "")
            if neo_cat != csv_cat:
                mismatches += 1

        print(f"  Category edge mismatches: {mismatches}")

        if mismatches > 0 and not DRY_RUN:
            # Batch update: delete old edges, create new ones for mismatched businesses
            updated = 0
            batch_size = 500
            mismatch_list = [
                (bid, csv_cat) for bid, csv_cat in csv_assignments.items()
                if neo4j_assignments.get(bid, "") != csv_cat
            ]
            for i in range(0, len(mismatch_list), batch_size):
                batch = mismatch_list[i:i+batch_size]
                for bid, cat in batch:
                    s.run("""
                        MATCH (b:Business {business_id: $bid})
                        OPTIONAL MATCH (b)-[r:CLASSIFIED_AS]->()
                        DELETE r
                        WITH b
                        MATCH (c:Category {slug: $cat})
                        CREATE (b)-[:CLASSIFIED_AS]->(c)
                    """, bid=bid, cat=cat)
                    updated += 1
            print(f"  Updated {updated} CLASSIFIED_AS edges")

        # Also update the category_primary property on Business nodes
        if not DRY_RUN:
            updated_props = 0
            for bid, cat in csv_assignments.items():
                s.run(
                    "MATCH (b:Business {business_id: $bid}) SET b.category_primary = $cat",
                    bid=bid, cat=cat
                )
                updated_props += 1
            print(f"  Updated category_primary property on {updated_props} Business nodes")

    driver.close()
    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: GEOCODE MISSING LAT/LON
# ═══════════════════════════════════════════════════════════════════════════════

def geocode_missing(rows):
    """Fill missing lat/lon using:
    1. Neo4j geo data (businesses that have lat/lon in Neo4j)
    2. Postcode centroid lookup from existing data
    3. Neighborhood centroid as last resort
    """
    from neo4j import GraphDatabase

    print("\n[2/3] GEOCODING missing coordinates...")

    before_missing = sum(1 for r in rows if not r.get("latitude", "").strip())
    print(f"  Missing geo before: {before_missing}")

    # Source 1: Pull geo from Neo4j for businesses that have it there
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    neo4j_geo = {}
    with driver.session() as s:
        result = s.run("""
            MATCH (b:Business)
            WHERE b.lat IS NOT NULL AND b.lat <> 0
            RETURN b.business_id AS bid, b.lat AS lat, b.lon AS lon
        """).data()
        for r in result:
            neo4j_geo[r["bid"]] = (r["lat"], r["lon"])
    driver.close()
    print(f"  Neo4j has geo for {len(neo4j_geo)} businesses")

    filled_neo4j = 0
    for r in rows:
        bid = r.get("business_id", "").strip()
        if not r.get("latitude", "").strip() and bid in neo4j_geo:
            lat, lon = neo4j_geo[bid]
            if lat and lon:
                r["latitude"] = str(round(lat, 6))
                r["longitude"] = str(round(lon, 6))
                filled_neo4j += 1
    print(f"  Filled from Neo4j: {filled_neo4j}")

    # Source 2: Postcode centroid lookup from businesses that already have coords
    postcode_coords = defaultdict(list)
    for r in rows:
        pc = r.get("postcode", "").strip()
        lat = safe_float(r.get("latitude", ""))
        lon = safe_float(r.get("longitude", ""))
        if pc and lat != 0 and lon != 0:
            postcode_coords[pc].append((lat, lon))

    # Compute centroid per postcode
    postcode_centroids = {}
    for pc, coords in postcode_coords.items():
        avg_lat = sum(c[0] for c in coords) / len(coords)
        avg_lon = sum(c[1] for c in coords) / len(coords)
        postcode_centroids[pc] = (round(avg_lat, 6), round(avg_lon, 6))
    print(f"  Postcode centroids available: {len(postcode_centroids)}")

    filled_postcode = 0
    for r in rows:
        if not r.get("latitude", "").strip():
            pc = r.get("postcode", "").strip()
            if pc and pc in postcode_centroids:
                lat, lon = postcode_centroids[pc]
                r["latitude"] = str(lat)
                r["longitude"] = str(lon)
                filled_postcode += 1
    print(f"  Filled from postcode centroids: {filled_postcode}")

    # Source 3: Neighborhood centroid for the rest
    hood_coords = defaultdict(list)
    for r in rows:
        hood = r.get("neighborhood_area", "").strip()
        lat = safe_float(r.get("latitude", ""))
        lon = safe_float(r.get("longitude", ""))
        if hood and lat != 0 and lon != 0:
            hood_coords[hood].append((lat, lon))

    hood_centroids = {}
    for hood, coords in hood_coords.items():
        avg_lat = sum(c[0] for c in coords) / len(coords)
        avg_lon = sum(c[1] for c in coords) / len(coords)
        hood_centroids[hood] = (round(avg_lat, 6), round(avg_lon, 6))
    print(f"  Neighborhood centroids available: {len(hood_centroids)}")

    filled_hood = 0
    for r in rows:
        if not r.get("latitude", "").strip():
            hood = r.get("neighborhood_area", "").strip()
            if hood and hood in hood_centroids:
                lat, lon = hood_centroids[hood]
                r["latitude"] = str(lat)
                r["longitude"] = str(lon)
                filled_hood += 1
    print(f"  Filled from neighborhood centroids: {filled_hood}")

    after_missing = sum(1 for r in rows if not r.get("latitude", "").strip())
    total_filled = filled_neo4j + filled_postcode + filled_hood
    print(f"\n  GEOCODE SUMMARY:")
    print(f"    Before: {before_missing} missing ({before_missing/len(rows)*100:.1f}%)")
    print(f"    After:  {after_missing} missing ({after_missing/len(rows)*100:.1f}%)")
    print(f"    Filled: {total_filled} (Neo4j: {filled_neo4j}, Postcode: {filled_postcode}, Neighborhood: {filled_hood})")

    # Push new geo back to Neo4j
    if not DRY_RUN and total_filled > 0:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        with driver.session() as s:
            pushed = 0
            for r in rows:
                bid = r.get("business_id", "").strip()
                lat = safe_float(r.get("latitude", ""))
                lon = safe_float(r.get("longitude", ""))
                if bid and lat != 0 and lon != 0 and bid not in neo4j_geo:
                    s.run(
                        "MATCH (b:Business {business_id: $bid}) SET b.lat = $lat, b.lon = $lon",
                        bid=bid, lat=lat, lon=lon
                    )
                    pushed += 1
            print(f"  Pushed {pushed} new coordinates back to Neo4j")
        driver.close()

    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: FILL MISSING NEIGHBORHOODS
# ═══════════════════════════════════════════════════════════════════════════════

def fill_neighborhoods(rows):
    """Fill missing neighborhoods from:
    1. Neo4j LOCATED_IN edges
    2. Postcode → neighborhood mapping from existing data
    3. Nearest geo match
    """
    from neo4j import GraphDatabase

    print("\n[3/3] FILLING missing neighborhoods...")

    before_missing = sum(1 for r in rows if not r.get("neighborhood_area", "").strip())
    print(f"  Missing neighborhoods before: {before_missing}")

    # Source 1: Neo4j LOCATED_IN edges
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    neo4j_hoods = {}
    with driver.session() as s:
        result = s.run("""
            MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood)
            RETURN b.business_id AS bid, n.name AS hood
        """).data()
        for r in result:
            neo4j_hoods[r["bid"]] = r["hood"]
    driver.close()
    print(f"  Neo4j has neighborhood for {len(neo4j_hoods)} businesses")

    filled_neo4j = 0
    for r in rows:
        bid = r.get("business_id", "").strip()
        if not r.get("neighborhood_area", "").strip() and bid in neo4j_hoods:
            r["neighborhood_area"] = neo4j_hoods[bid]
            filled_neo4j += 1
    print(f"  Filled from Neo4j: {filled_neo4j}")

    # Source 2: Postcode → neighborhood mapping
    postcode_hood = defaultdict(list)
    for r in rows:
        pc = r.get("postcode", "").strip()
        hood = r.get("neighborhood_area", "").strip()
        if pc and hood:
            postcode_hood[pc].append(hood)

    # Most common neighborhood per postcode
    postcode_hood_map = {}
    for pc, hoods in postcode_hood.items():
        counter = Counter(hoods)
        postcode_hood_map[pc] = counter.most_common(1)[0][0]
    print(f"  Postcode→neighborhood mappings: {len(postcode_hood_map)}")

    filled_postcode = 0
    for r in rows:
        if not r.get("neighborhood_area", "").strip():
            pc = r.get("postcode", "").strip()
            if pc and pc in postcode_hood_map:
                r["neighborhood_area"] = postcode_hood_map[pc]
                filled_postcode += 1
    print(f"  Filled from postcode mapping: {filled_postcode}")

    # Source 3: Nearest geo neighbor
    # Build lookup of businesses with known neighborhoods + geo
    known = []
    for r in rows:
        hood = r.get("neighborhood_area", "").strip()
        lat = safe_float(r.get("latitude", ""))
        lon = safe_float(r.get("longitude", ""))
        if hood and lat != 0 and lon != 0:
            known.append((lat, lon, hood))

    filled_geo = 0
    for r in rows:
        if not r.get("neighborhood_area", "").strip():
            lat = safe_float(r.get("latitude", ""))
            lon = safe_float(r.get("longitude", ""))
            if lat != 0 and lon != 0:
                # Find nearest known business
                best_dist = float("inf")
                best_hood = ""
                for klat, klon, khood in known:
                    dist = (lat - klat) ** 2 + (lon - klon) ** 2
                    if dist < best_dist:
                        best_dist = dist
                        best_hood = khood
                if best_hood and best_dist < 0.001:  # ~100m threshold
                    r["neighborhood_area"] = best_hood
                    filled_geo += 1
    print(f"  Filled from nearest geo match: {filled_geo}")

    after_missing = sum(1 for r in rows if not r.get("neighborhood_area", "").strip())
    total_filled = filled_neo4j + filled_postcode + filled_geo
    print(f"\n  NEIGHBORHOOD SUMMARY:")
    print(f"    Before: {before_missing} missing ({before_missing/len(rows)*100:.1f}%)")
    print(f"    After:  {after_missing} missing ({after_missing/len(rows)*100:.1f}%)")
    print(f"    Filled: {total_filled} (Neo4j: {filled_neo4j}, Postcode: {filled_postcode}, Geo: {filled_geo})")

    # Push new neighborhoods back to Neo4j
    if not DRY_RUN and total_filled > 0:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        with driver.session() as s:
            pushed = 0
            for r in rows:
                bid = r.get("business_id", "").strip()
                hood = r.get("neighborhood_area", "").strip()
                if bid and hood and bid not in neo4j_hoods:
                    # Update property
                    s.run(
                        "MATCH (b:Business {business_id: $bid}) SET b.neighborhood = $hood",
                        bid=bid, hood=hood
                    )
                    # Create LOCATED_IN edge if neighborhood node exists
                    s.run("""
                        MATCH (b:Business {business_id: $bid}), (n:Neighborhood {name: $hood})
                        WHERE NOT EXISTS { MATCH (b)-[:LOCATED_IN]->(n) }
                        CREATE (b)-[:LOCATED_IN]->(n)
                    """, bid=bid, hood=hood)
                    pushed += 1
            print(f"  Pushed {pushed} new neighborhoods back to Neo4j")
        driver.close()

    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("NEO4J SYNC + GEOCODE + NEIGHBORHOOD FILL")
    print(f"{'[DRY RUN]' if DRY_RUN else '[LIVE]'} — {datetime.now().isoformat()}")
    print("=" * 70)

    rows = load_master()
    fieldnames = list(rows[0].keys()) if rows else []
    print(f"Loaded {len(rows)} records")

    # Backup
    import shutil
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    if not DRY_RUN:
        dest = DATA / "snapshots" / f"master_pre_sync_{ts}.csv"
        dest.parent.mkdir(exist_ok=True)
        shutil.copy2(MASTER, dest)
        print(f"  Backup: {dest.name}")

    rows = sync_neo4j_categories(rows)
    rows = geocode_missing(rows)
    rows = fill_neighborhoods(rows)

    save_master(rows, fieldnames)

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)


if __name__ == "__main__":
    main()
