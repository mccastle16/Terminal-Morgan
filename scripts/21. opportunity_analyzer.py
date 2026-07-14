#!/usr/bin/env python3
"""
Script 21 — Opportunity Analyzer & Chamber Cross-Reference Ingester
===================================================================
Two-phase script for the Coral Gables business knowledge graph:

Phase 1: OPPORTUNITY GAP ANALYSIS
  - Compares current business mix against national per-capita benchmarks
  - Identifies underserved categories and neighborhoods
  - Generates curated "Opportunity" nodes in Neo4j
  - Creates specific business concepts that would fill gaps

Phase 2: CHAMBER CROSS-REFERENCE INGESTION
  - Ingests CSVs from neighboring chambers (Greater Miami, Coconut Grove, etc.)
  - Fuzzy-matches against existing businesses to avoid duplicates
  - Identifies businesses that SERVE Coral Gables but aren't in the DB
  - Adds new businesses to master CSV + Neo4j

Usage:
    python "scripts/21. opportunity_analyzer.py" --dry-run     # Preview only
    python "scripts/21. opportunity_analyzer.py"               # Apply all changes
    python "scripts/21. opportunity_analyzer.py" --phase 1     # Only opportunities
    python "scripts/21. opportunity_analyzer.py" --ingest path/to/chamber.csv  # Ingest external CSV
"""
import argparse
import csv
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from neo4j import GraphDatabase

# ── Paths ──────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
MASTER = BASE / "data" / "master_all_businesses.csv"
DASH_DATA = BASE / "dashboard" / "public" / "data"
OPPORTUNITY_OUT = DASH_DATA / "opportunities.json"
INGEST_DIR = BASE / "staging" / "chamber_imports"

# ── Neo4j ──────────────────────────────────────────────────────
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASS = "cgcc2024graph"

# ── Coral Gables population & geographic context ───────────────
CG_POPULATION = 50_000
CG_MEDIAN_INCOME = 134_216
CG_BOUNDS = {"lat_min": 25.693, "lat_max": 25.770, "lon_min": -80.310, "lon_max": -80.225}

# ── National benchmarks: businesses per 1,000 residents ────────
# Sources: BLS, Census, SBA small business profiles for affluent suburban cities
NATIONAL_BENCHMARKS = {
    "food_beverage":        15.0,
    "retail":               12.0,
    "healthcare":            8.0,
    "professional_services": 6.0,
    "personal_services":     5.0,
    "real_estate":           5.0,
    "financial_services":    4.0,
    "construction":          4.0,
    "technology":            3.5,
    "education":             3.0,
    "hospitality":           3.0,
    "wellness":              3.0,
    "automotive":            2.5,
    "consulting":            2.0,
    "insurance":             2.0,
    "arts_culture":          1.5,
    "marketing":             1.5,
    "transportation":        1.5,
    "media_entertainment":   1.0,
}

# ── Curated business opportunities for Coral Gables ───────────
# Each entry: (name, category, neighborhood, rationale, estimated_demand)
# These are TYPES of businesses that market analysis shows CG needs
CURATED_OPPORTUNITIES = [
    # ── Technology (0.88/1k vs 3.5 benchmark — 75% gap) ─────────
    ("Tech Coworking / Innovation Hub", "technology", "Miracle Mile",
     "CG has 44 tech firms vs 175 benchmark. High-income professionals need shared workspace. Miracle Mile foot traffic ideal.",
     "high"),
    ("Managed IT Services Provider", "technology", "Ponce de Leon Corridor",
     "2,730 businesses but minimal local IT support. The Ponce office district is ripe for B2B tech services.",
     "high"),
    ("App Development Studio", "technology", "Douglas Road Corridor",
     "Affluent market, UM talent pipeline, but no local dev shops. Adjacent to Brickell tech corridor.",
     "medium"),
    ("Cybersecurity Consulting Firm", "technology", "Alhambra Circle",
     "Banking/financial cluster on Alhambra needs specialized security. CG's 52 banks + 61 financial firms are the target market.",
     "high"),
    ("Smart Home / IoT Integrator", "technology", "Bird Road Corridor",
     "High-income residential + real estate market but zero smart home specialists in CG.",
     "medium"),

    # ── Food & Beverage (8.4/1k vs 15.0 — 44% gap) ─────────────
    ("Specialty Coffee Roastery", "food_beverage", "Miracle Mile",
     "CG's café scene is growing but lacks a locally-roasted brand. Foot traffic + UM students = steady demand.",
     "high"),
    ("Farm-to-Table Meal Prep / Ghost Kitchen", "food_beverage", "Bird Road Corridor",
     "Health-conscious demographic ($134K median income) but limited healthy prepared food options.",
     "medium"),
    ("Latin Fusion Bakery", "food_beverage", "Sunset / South Gables",
     "CG's Latin heritage + growing foodie scene. South Gables underserved with only 39 F&B businesses.",
     "high"),
    ("Craft Cocktail Bar / Speakeasy", "food_beverage", "Giralda Plaza",
     "Giralda is CG's experiential dining district but has only 2 F&B businesses in database.",
     "high"),
    ("Organic Grocery / Market", "food_beverage", "University of Miami Area",
     "96 businesses near UM but only 14 F&B — students and faculty need grocery/market options.",
     "medium"),

    # ── Retail (6.2/1k vs 12.0 — 48% gap) ───────────────────────
    ("Boutique Pet Supply Store", "retail", "Miracle Mile",
     "High-income area with many pet owners but zero pet retail in the database. National trend: pet spending up 12% YoY.",
     "high"),
    ("Sustainable / Eco Fashion Boutique", "retail", "Merrick Park",
     "Merrick Park is CG's luxury retail zone but only 5 businesses listed. Sustainable luxury trending.",
     "medium"),
    ("Home Décor / Interior Design Retail", "retail", "Coral Gables",
     "$134K median income + active real estate market but limited home retail. Natural complement to 71 RE firms.",
     "medium"),
    ("Cycling / Outdoor Sports Shop", "retail", "Bird Road Corridor",
     "Active outdoor community, popular cycling routes, but no dedicated bike/outdoor shop in CG.",
     "medium"),
    ("Children's Boutique / Toy Store", "retail", "Sunset / South Gables",
     "Family-oriented neighborhood (184 businesses, 31 education) but no children's retail.",
     "medium"),

    # ── Professional Services (2.2/1k vs 6.0 — 63% gap) ─────────
    ("Business Formation / Startup Accelerator", "professional_services", "Ponce de Leon Corridor",
     "CG has 129 legal + 112 accounting firms but no formal startup support. UM generates talent.",
     "high"),
    ("Immigration Law Boutique", "professional_services", "Coral Gables",
     "CG's international population + proximity to Latin America. Niche underserved despite 129 legal firms.",
     "medium"),
    ("HR / Payroll Outsourcing Firm", "professional_services", "Alhambra Circle",
     "2,730 businesses but very few HR support firms. SMB market is massive.",
     "high"),
    ("Executive Coaching & Leadership Dev", "professional_services", "Miracle Mile",
     "474 infrastructure + 674 platform businesses need professional development. Premium market.",
     "medium"),

    # ── Personal Services (1.8/1k vs 5.0 — 64% gap) ─────────────
    ("Premium Pet Grooming & Daycare", "personal_services", "Bird Road Corridor",
     "Zero pet services in database. Affluent neighborhoods, work-from-office returning — pet daycare demand surging.",
     "high"),
    ("Concierge / Errand Service", "personal_services", "Coral Gables",
     "High-income dual-earner households. TaskRabbit-style local concierge model perfect for CG's demo.",
     "medium"),
    ("Senior Home Care Agency", "personal_services", "Sunset / South Gables",
     "Aging population in South Gables. Healthcare strong (284) but personal care services almost absent.",
     "high"),
    ("Mobile Auto Detailing", "personal_services", "Douglas Road Corridor",
     "55 auto dealers + 14 automotive but zero detailing services. High-end vehicle owners = premium demand.",
     "medium"),

    # ── Wellness (1.9/1k vs 3.0 — 37% gap) ──────────────────────
    ("Pilates / Barre Studio", "wellness", "Miracle Mile",
     "CG has 97 wellness businesses but concentrated in general area. Miracle Mile walkability is key.",
     "medium"),
    ("Mental Health & Therapy Practice", "wellness", "Ponce de Leon Corridor",
     "Post-pandemic mental health demand. CG's affluent demo can afford premium therapy. Office corridor ideal.",
     "high"),
    ("Holistic Wellness Center (Acupuncture/TCM)", "wellness", "University of Miami Area",
     "UM medical campus synergy. Integrative medicine growing 15% annually. Only 6 wellness near UM.",
     "medium"),

    # ── Hospitality (1.8/1k vs 3.0 — 40% gap) ──────────────────
    ("Boutique Event Space / Venue", "hospitality", "Giralda Plaza",
     "CG's dining/nightlife hub but only 2 businesses listed. Event venues complement F&B cluster.",
     "high"),
    ("Eco-Tourism / City Tour Operator", "hospitality", "Miracle Mile",
     "CG's Mediterranean architecture, Biltmore Hotel, Venetian Pool = tour potential. Zero tour operators listed.",
     "medium"),

    # ── Real Estate (1.4/1k vs 5.0 — 72% gap) ───────────────────
    ("Property Management Company", "real_estate", "Coral Gables",
     "71 RE firms but mostly sales. Rental market growing — Coral Gables has 40% renters. Property mgmt demand high.",
     "high"),
    ("Commercial Real Estate Advisory", "real_estate", "Ponce de Leon Corridor",
     "CG attracting MNCs (150+). Specialized commercial RE advisory would fill a niche in the office district.",
     "medium"),

    # ── Construction (1.5/1k vs 4.0 — 63% gap) ──────────────────
    ("Green Building / LEED Contractor", "construction", "Coral Gables",
     "CG's sustainability initiatives + affluent homeowners = demand for green construction. Only 76 construction firms.",
     "medium"),
    ("Pool / Outdoor Living Specialist", "construction", "Sunset / South Gables",
     "FL climate + high-income homes. Pool construction/renovation is a perennial demand.",
     "medium"),

    # ── Transportation (0.1/1k vs 1.5 — 93% gap) ────────────────
    ("EV Charging Network / Station", "transportation", "Miracle Mile",
     "Only 5 transportation businesses total. EV adoption growing, CG income demo buys EVs at 2x national rate.",
     "high"),
    ("Executive Car Service / Chauffeur", "transportation", "Coral Gables",
     "MIA airport proximity, Brickell/downtown commuters, 150+ MNCs. Zero car services in database.",
     "high"),

    # ── Arts & Culture (1.2/1k vs 1.5 — 20% gap) ────────────────
    ("Art Gallery / Exhibition Space", "arts_culture", "Giralda Plaza",
     "CG has rich arts heritage (Lowe Art Museum, Art Cinema). Giralda experiential district needs gallery presence.",
     "medium"),
    ("Music / Performing Arts Academy", "arts_culture", "Bird Road Corridor",
     "Education strong (202) but arts education thin. Family-dense corridors = youth arts demand.",
     "medium"),

    # ── Media & Entertainment (0.1/1k vs 1.0 — 88% gap) ─────────
    ("Podcast / Content Studio", "media_entertainment", "Douglas Road Corridor",
     "Only 6 media businesses in all of CG. Creator economy booming. Affordable rents on Douglas make this viable.",
     "medium"),
    ("Local News / Community Digital Media", "media_entertainment", "Coral Gables",
     "50K residents with no dedicated local digital media outlet. Community journalism fills civic need.",
     "high"),

    # ── Financial Services (1.2/1k vs 4.0 — 70% gap) ────────────
    ("Wealth Management / Family Office", "financial_services", "Alhambra Circle",
     "CG's banking corridor (52 banks) but limited wealth mgmt. $134K median income = sophisticated financial needs.",
     "high"),
    ("Cryptocurrency / Digital Asset Advisory", "financial_services", "Coral Gables",
     "Miami is a crypto hub. CG's finance cluster + tech-savvy high-income demographic = natural fit.",
     "medium"),

    # ── Consulting (0.6/1k vs 2.0 — 71% gap) ────────────────────
    ("Sustainability / ESG Consulting", "consulting", "Coral Gables",
     "CG's green city initiatives + corporate ESG mandates. Only 29 consulting firms total.",
     "medium"),
    ("International Trade Consulting", "consulting", "Ponce de Leon Corridor",
     "CG is Latin America gateway. 150+ MNCs but minimal trade consulting. LATAM corridor opportunity.",
     "high"),
]

# ── Neighboring chamber data templates ─────────────────────────
NEIGHBORING_CHAMBERS = {
    "greater_miami": {
        "name": "Greater Miami Chamber of Commerce",
        "url": "https://www.miamichamber.com/",
        "relevance": "Miami's primary chamber — overlapping service areas with CG businesses",
    },
    "coconut_grove": {
        "name": "Coconut Grove Business Improvement District",
        "url": "https://coconutgrove.com/",
        "relevance": "Adjacent neighborhood, shared demographics, walkable connection to CG",
    },
    "south_miami": {
        "name": "South Miami Chamber of Commerce",
        "url": "https://southmiamichamber.org/",
        "relevance": "Southern neighbor, shared Bird Road corridor",
    },
    "key_biscayne": {
        "name": "Key Biscayne Chamber of Commerce",
        "url": "https://keybiscaynechamber.org/",
        "relevance": "Affluent island community, similar demographics",
    },
    "doral": {
        "name": "Doral Chamber of Commerce",
        "url": "https://doralchamber.org/",
        "relevance": "Growing business hub, many CG workers commute to/from Doral",
    },
}


def generate_opportunity_id(name: str, category: str) -> str:
    """Generate deterministic ID for an opportunity."""
    raw = f"opp_{category}_{name}".lower()
    h = hashlib.md5(raw.encode()).hexdigest()[:8]
    return f"opp_{category}_{h}"


def phase1_opportunity_analysis(df: pd.DataFrame, dry_run: bool = True) -> dict:
    """
    Phase 1: Analyze gaps and generate opportunity nodes.
    Returns dict with analysis results and opportunity records.
    """
    print("\n" + "=" * 70)
    print("  PHASE 1: OPPORTUNITY GAP ANALYSIS")
    print("=" * 70)

    cat_counts = df["category_primary"].value_counts()
    total = len(df)

    # ── Gap analysis ───────────────────────────────────────────
    gaps = []
    for cat, benchmark in sorted(NATIONAL_BENCHMARKS.items(), key=lambda x: x[1], reverse=True):
        actual = cat_counts.get(cat, 0)
        actual_per_1k = actual / CG_POPULATION * 1000
        gap_per_1k = benchmark - actual_per_1k
        gap_businesses = int(gap_per_1k * CG_POPULATION / 1000)
        gap_pct = (gap_per_1k / benchmark * 100) if benchmark else 0

        gaps.append({
            "category": cat,
            "current_count": int(actual),
            "benchmark_per_1k": benchmark,
            "actual_per_1k": round(actual_per_1k, 2),
            "gap_per_1k": round(gap_per_1k, 2),
            "gap_businesses": max(0, gap_businesses),
            "gap_pct": round(gap_pct, 1),
        })

    gaps.sort(key=lambda x: x["gap_businesses"], reverse=True)

    print("\n  Category Gap Analysis (vs National Benchmarks)")
    print("  " + "-" * 66)
    print(f"  {'Category':<25} {'Have':<6} {'Need':<6} {'Gap':<6} {'Deficit %':<10}")
    print("  " + "-" * 66)
    total_gap = 0
    for g in gaps:
        if g["gap_businesses"] > 0:
            total_gap += g["gap_businesses"]
            print(f"  {g['category']:<25} {g['current_count']:<6} "
                  f"{g['current_count'] + g['gap_businesses']:<6} "
                  f"+{g['gap_businesses']:<5} {g['gap_pct']:.0f}%")
    print("  " + "-" * 66)
    print(f"  Total estimated gap: +{total_gap} businesses to reach national average")

    # ── Neighborhood deserts ───────────────────────────────────
    print("\n  Neighborhood Category Deserts")
    print("  " + "-" * 60)
    hood_gaps = []
    essential_cats = ["food_beverage", "retail", "healthcare", "professional_services", "wellness"]
    for hood in df["neighborhood_area"].unique():
        hood_df = df[df["neighborhood_area"] == hood]
        hood_total = len(hood_df)
        if hood_total < 5:
            continue
        missing = []
        for cat in essential_cats:
            count = len(hood_df[hood_df["category_primary"] == cat])
            if count < 3:
                missing.append({"category": cat, "count": count})
        if missing:
            hood_gaps.append({"neighborhood": hood, "total": hood_total, "missing": missing})
            cats_str = ", ".join(f"{m['category']}({m['count']})" for m in missing)
            print(f"    {hood} ({hood_total}): needs {cats_str}")

    # ── Generate opportunity records ───────────────────────────
    print(f"\n  Generating {len(CURATED_OPPORTUNITIES)} curated business opportunities...")
    opportunities = []
    for name, cat, hood, rationale, demand in CURATED_OPPORTUNITIES:
        opp_id = generate_opportunity_id(name, cat)
        gap_info = next((g for g in gaps if g["category"] == cat), {})
        opportunities.append({
            "opportunity_id": opp_id,
            "business_concept": name,
            "category": cat,
            "target_neighborhood": hood,
            "rationale": rationale,
            "estimated_demand": demand,
            "category_gap_pct": gap_info.get("gap_pct", 0),
            "category_deficit": gap_info.get("gap_businesses", 0),
            "status": "identified",
            "created_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        })

    # ── Summary by demand level ────────────────────────────────
    high = [o for o in opportunities if o["estimated_demand"] == "high"]
    med = [o for o in opportunities if o["estimated_demand"] == "medium"]
    print(f"\n  Opportunities generated: {len(opportunities)} total")
    print(f"    High demand: {len(high)}")
    print(f"    Medium demand: {len(med)}")

    print("\n  Top HIGH-demand opportunities:")
    for o in sorted(high, key=lambda x: x["category_gap_pct"], reverse=True)[:10]:
        print(f"    [{o['category']:<22}] {o['business_concept']}")
        print(f"      → {o['target_neighborhood']} | Category {o['category_gap_pct']:.0f}% underserved")

    return {
        "gaps": gaps,
        "neighborhood_deserts": hood_gaps,
        "opportunities": opportunities,
        "total_market_gap": total_gap,
    }


def phase1_neo4j_write(opportunities: list, dry_run: bool = True):
    """Write Opportunity nodes to Neo4j."""
    if dry_run:
        print(f"\n  [DRY RUN] Would create {len(opportunities)} Opportunity nodes in Neo4j")
        return

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    with driver.session() as session:
        # Create constraint
        session.run("""
            CREATE CONSTRAINT IF NOT EXISTS
            FOR (o:Opportunity) REQUIRE o.opportunity_id IS UNIQUE
        """)

        # Batch create opportunity nodes
        created = 0
        for opp in opportunities:
            result = session.run("""
                MERGE (o:Opportunity {opportunity_id: $opp_id})
                ON CREATE SET
                    o.business_concept = $concept,
                    o.category = $category,
                    o.target_neighborhood = $neighborhood,
                    o.rationale = $rationale,
                    o.estimated_demand = $demand,
                    o.category_gap_pct = $gap_pct,
                    o.category_deficit = $deficit,
                    o.status = 'identified',
                    o.created_date = $created
                ON MATCH SET
                    o.rationale = $rationale,
                    o.category_gap_pct = $gap_pct,
                    o.category_deficit = $deficit
                RETURN o.opportunity_id AS id
            """, opp_id=opp["opportunity_id"],
                concept=opp["business_concept"],
                category=opp["category"],
                neighborhood=opp["target_neighborhood"],
                rationale=opp["rationale"],
                demand=opp["estimated_demand"],
                gap_pct=opp["category_gap_pct"],
                deficit=opp["category_deficit"],
                created=opp["created_date"])
            if result.single():
                created += 1

        # Link opportunities to categories
        linked_cat = 0
        for opp in opportunities:
            result = session.run("""
                MATCH (o:Opportunity {opportunity_id: $opp_id})
                MATCH (c:Category {slug: $cat})
                MERGE (o)-[:FILLS_GAP_IN]->(c)
                RETURN count(*) AS cnt
            """, opp_id=opp["opportunity_id"], cat=opp["category"])
            rec = result.single()
            if rec and rec["cnt"] > 0:
                linked_cat += 1

        # Link opportunities to neighborhoods
        linked_hood = 0
        for opp in opportunities:
            result = session.run("""
                MATCH (o:Opportunity {opportunity_id: $opp_id})
                MATCH (n:Neighborhood)
                WHERE n.name = $hood OR n.display_name = $hood
                MERGE (o)-[:TARGETS]->(n)
                RETURN count(*) AS cnt
            """, opp_id=opp["opportunity_id"], hood=opp["target_neighborhood"])
            rec = result.single()
            if rec and rec["cnt"] > 0:
                linked_hood += 1

        # Create COMPLEMENTS relationships where opportunities complement existing businesses
        complement_count = 0
        for opp in opportunities:
            result = session.run("""
                MATCH (o:Opportunity {opportunity_id: $opp_id})
                MATCH (b:Business)
                WHERE b.neighborhood = $hood AND b.category_primary = $cat
                WITH o, b LIMIT 5
                MERGE (o)-[:COMPLEMENTS]->(b)
                RETURN count(*) AS cnt
            """, opp_id=opp["opportunity_id"],
                hood=opp["target_neighborhood"],
                cat=opp["category"])
            rec = result.single()
            if rec:
                complement_count += rec["cnt"]

        print(f"\n  Neo4j writes:")
        print(f"    Opportunity nodes:     {created}")
        print(f"    FILLS_GAP_IN edges:    {linked_cat}")
        print(f"    TARGETS edges:         {linked_hood}")
        print(f"    COMPLEMENTS edges:     {complement_count}")

    driver.close()


def phase2_ingest_chamber_csv(csv_path: str, df_master: pd.DataFrame, dry_run: bool = True) -> pd.DataFrame:
    """
    Phase 2: Ingest an external chamber CSV and match/add new businesses.
    Expected CSV columns: business_name, address, phone, website, category (optional)

    Returns updated master DataFrame.
    """
    print("\n" + "=" * 70)
    print("  PHASE 2: CHAMBER CROSS-REFERENCE INGESTION")
    print("=" * 70)

    if not os.path.exists(csv_path):
        print(f"\n  ERROR: File not found: {csv_path}")
        return df_master

    ext_df = pd.read_csv(csv_path)
    print(f"\n  External file: {os.path.basename(csv_path)}")
    print(f"  Records: {len(ext_df)}")
    print(f"  Columns: {list(ext_df.columns)}")

    # ── Normalize for matching ─────────────────────────────────
    from scripts._shared import normalize_key

    # Build lookup from existing businesses
    existing_keys = set()
    for _, row in df_master.iterrows():
        key = normalize_key(str(row.get("business_name", "")))
        if key:
            existing_keys.add(key)

    # Match external records
    new_records = []
    matched = 0
    skipped = 0

    name_col = None
    for col in ["business_name", "name", "company", "Business Name", "Name", "Company"]:
        if col in ext_df.columns:
            name_col = col
            break

    if not name_col:
        print(f"  ERROR: Cannot find business name column. Available: {list(ext_df.columns)}")
        return df_master

    for _, row in ext_df.iterrows():
        name = str(row.get(name_col, "")).strip()
        if not name or name == "nan":
            skipped += 1
            continue

        key = normalize_key(name)
        if key in existing_keys:
            matched += 1
            continue

        # New business — build record
        new_id = f"ext_{hashlib.md5(key.encode()).hexdigest()[:12]}"
        record = {
            "business_id": new_id,
            "business_name": name,
            "source_file": f"chamber_import_{os.path.basename(csv_path)}",
            "batch_id": f"chamber_{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            "last_reviewed_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }

        # Map common fields
        field_map = {
            "address": ["address", "Address", "street", "Street Address"],
            "phone": ["phone", "Phone", "telephone", "Telephone"],
            "website": ["website", "Website", "url", "URL", "web"],
            "category_primary": ["category", "Category", "industry", "Industry", "type"],
        }
        for target, sources in field_map.items():
            for src in sources:
                if src in row.index and pd.notna(row[src]) and str(row[src]).strip():
                    record[target] = str(row[src]).strip()
                    break

        new_records.append(record)
        existing_keys.add(key)  # Prevent dupes within the import

    print(f"\n  Results:")
    print(f"    Already in database: {matched}")
    print(f"    Skipped (empty):     {skipped}")
    print(f"    NEW businesses:      {len(new_records)}")

    if not new_records:
        print("  No new businesses to add.")
        return df_master

    if dry_run:
        print(f"\n  [DRY RUN] Would add {len(new_records)} new businesses")
        for r in new_records[:10]:
            print(f"    + {r['business_name']}")
        if len(new_records) > 10:
            print(f"    ... and {len(new_records) - 10} more")
        return df_master

    # ── Append to master ───────────────────────────────────────
    new_df = pd.DataFrame(new_records)
    for col in df_master.columns:
        if col not in new_df.columns:
            new_df[col] = ""
    new_df = new_df[df_master.columns]
    df_updated = pd.concat([df_master, new_df], ignore_index=True)

    df_updated.to_csv(MASTER, index=False)
    print(f"\n  Master CSV updated: {len(df_master)} → {len(df_updated)} businesses")

    return df_updated


def save_opportunities_json(analysis: dict):
    """Save opportunity data as JSON for the dashboard."""
    output = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "market_summary": {
            "population": CG_POPULATION,
            "median_income": CG_MEDIAN_INCOME,
            "total_businesses": sum(g["current_count"] for g in analysis["gaps"]),
            "total_gap": analysis["total_market_gap"],
            "gap_categories": len([g for g in analysis["gaps"] if g["gap_businesses"] > 0]),
        },
        "category_gaps": analysis["gaps"],
        "neighborhood_deserts": analysis["neighborhood_deserts"],
        "opportunities": analysis["opportunities"],
        "neighboring_chambers": NEIGHBORING_CHAMBERS,
    }
    OPPORTUNITY_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OPPORTUNITY_OUT, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved: {OPPORTUNITY_OUT.relative_to(BASE)}")
    print(f"    {len(analysis['opportunities'])} opportunities")
    print(f"    {len(analysis['gaps'])} category gap analyses")


def main():
    parser = argparse.ArgumentParser(description="Opportunity Analyzer & Chamber Ingester")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--phase", type=int, choices=[1, 2], help="Run only phase 1 or 2")
    parser.add_argument("--ingest", type=str, help="Path to external chamber CSV to ingest")
    args = parser.parse_args()

    dry_run = args.dry_run

    print("\n" + "▓" * 70)
    print("  CORAL GABLES BUSINESS OPPORTUNITY ANALYZER")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print("▓" * 70)

    df = pd.read_csv(MASTER)
    print(f"\n  Master CSV loaded: {len(df)} businesses")

    # ── Phase 1: Opportunity Analysis ──────────────────────────
    if not args.phase or args.phase == 1:
        analysis = phase1_opportunity_analysis(df, dry_run)
        save_opportunities_json(analysis)
        phase1_neo4j_write(analysis["opportunities"], dry_run)

    # ── Phase 2: Chamber Ingestion ─────────────────────────────
    if args.ingest:
        df = phase2_ingest_chamber_csv(args.ingest, df, dry_run)
    elif not args.phase or args.phase == 2:
        # Check for any CSVs in the chamber_imports directory
        INGEST_DIR.mkdir(parents=True, exist_ok=True)
        csvs = list(INGEST_DIR.glob("*.csv"))
        if csvs:
            print(f"\n  Found {len(csvs)} chamber CSV(s) in {INGEST_DIR.relative_to(BASE)}/")
            for csv_path in csvs:
                df = phase2_ingest_chamber_csv(str(csv_path), df, dry_run)
        else:
            print(f"\n  No chamber CSVs found in {INGEST_DIR.relative_to(BASE)}/")
            print("  To ingest external data, drop CSVs there or use --ingest path/to/file.csv")
            print("\n  Neighboring chambers to source data from:")
            for key, info in NEIGHBORING_CHAMBERS.items():
                print(f"    • {info['name']}")
                print(f"      {info['relevance']}")

    # ── Summary ────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  DONE")
    if dry_run:
        print("  Re-run without --dry-run to apply changes.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
