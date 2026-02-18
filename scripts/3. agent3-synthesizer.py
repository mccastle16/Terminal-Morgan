#!/usr/bin/env python3
"""
Agent 3 — Synthesizer & Exporter
==================================
Takes the validated master CSV from Agent 2 and exports it for the
dashboard and other downstream consumers.

Operations:
  export      — Copy master CSV to dashboard/public/data/ with field selection
  stats       — Print coverage stats and category breakdown
  schema      — Validate master CSV against canonical schema
  synthesize  — Run PKP synthesis (node type, edges, signals, risks, actions)

Usage:
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action schema
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize

Requirements:
  pip install pandas
"""

import argparse
import csv
import os
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

# ── Canonical schema (must match Agent 2) ─────────────────────────
CANONICAL_FIELDS = [
    "business_id",
    "business_name",
    "contact_name",
    "phone",
    "website",
    "address",
    "lat",
    "lon",
    "postcode",
    "neighborhood_area",
    "category_primary",
    "category_secondary",
    "price_tier",
    "rating_primary_value",
    "rating_primary_source",
    "rating_primary_review_count",
    "top_delights",
    "top_pain_points",
    "osint_confidence",
    "validation_tier",
    "red_flag_present",
    "red_flag_severity",
    "red_flag_notes",
    "chamber_member",
    "source_file",
    "batch_id",
    "last_reviewed_date",
]

# Dashboard export includes all fields
DASHBOARD_DIR = Path("dashboard/public/data")
DASHBOARD_FILENAME = "union_all_businesses.csv"


def action_export(master_path: str):
    """Export master CSV to dashboard data directory."""
    df = pd.read_csv(master_path, dtype=str).fillna("")
    print(f"  Loaded: {len(df)} records from {master_path}")

    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = DASHBOARD_DIR / DASHBOARD_FILENAME

    # Ensure all canonical fields present
    for col in CANONICAL_FIELDS:
        if col not in df.columns:
            df[col] = ""

    df[CANONICAL_FIELDS].to_csv(out_path, index=False)
    print(f"  Exported: {len(df)} records -> {out_path}")

    # Also write a lightweight version for fast dashboard loads
    lite_fields = [
        "business_id", "business_name", "phone", "website",
        "address", "neighborhood_area", "category_primary",
        "rating_primary_value", "chamber_member",
    ]
    lite_path = DASHBOARD_DIR / "businesses_lite.csv"
    df[lite_fields].to_csv(lite_path, index=False)
    print(f"  Exported: {len(df)} records -> {lite_path} (lite)")


def action_stats(master_path: str):
    """Print comprehensive coverage statistics."""
    df = pd.read_csv(master_path, dtype=str).fillna("")
    total = len(df)

    print(f"\n  {'='*50}")
    print(f"  MASTER CSV STATISTICS")
    print(f"  {'='*50}\n")
    print(f"  Total businesses: {total}")

    # Chamber membership
    chamber = (df["chamber_member"].str.upper().isin(["Y", "YES", "TRUE"])).sum()
    print(f"\n  Chamber members:     {chamber:>5} ({chamber/total*100:.0f}%)")
    print(f"  Non-members:         {total - chamber:>5} ({(total-chamber)/total*100:.0f}%)")

    # Field completeness
    print(f"\n  Field completeness:")
    for field in ["phone", "website", "address", "lat", "category_primary",
                   "rating_primary_value", "neighborhood_area", "postcode"]:
        if field in df.columns:
            filled = (df[field] != "").sum()
            print(f"    {field:<30} {filled:>5} ({filled/total*100:.0f}%)")

    # Category breakdown
    print(f"\n  Category breakdown:")
    cats = df["category_primary"].replace("", "uncategorized").value_counts()
    for cat, count in cats.items():
        print(f"    {cat:<30} {count:>5} ({count/total*100:.1f}%)")

    # Validation tiers
    if "validation_tier" in df.columns:
        tiers = df["validation_tier"].replace("", "unvalidated").value_counts()
        print(f"\n  Validation tiers:")
        for tier, count in tiers.items():
            print(f"    {tier:<30} {count:>5}")

    # Source breakdown
    if "source_file" in df.columns:
        sources = df["source_file"].replace("", "unknown").value_counts()
        print(f"\n  Data sources:")
        for source, count in sources.items():
            print(f"    {source:<30} {count:>5}")

    # Red flags
    if "red_flag_present" in df.columns:
        flags = (df["red_flag_present"].str.upper() == "Y").sum()
        print(f"\n  Red flags:           {flags:>5}")

    print()


def action_schema(master_path: str):
    """Validate master CSV against canonical schema."""
    df = pd.read_csv(master_path, dtype=str, nrows=0)
    actual_cols = set(df.columns)
    expected_cols = set(CANONICAL_FIELDS)

    missing = expected_cols - actual_cols
    extra = actual_cols - expected_cols

    print(f"\n  Schema validation: {master_path}")
    print(f"  Expected columns: {len(expected_cols)}")
    print(f"  Actual columns:   {len(actual_cols)}")

    if missing:
        print(f"\n  MISSING columns ({len(missing)}):")
        for col in sorted(missing):
            print(f"    - {col}")

    if extra:
        print(f"\n  EXTRA columns ({len(extra)}):")
        for col in sorted(extra):
            print(f"    + {col}")

    if not missing and not extra:
        print(f"\n  Schema: VALID")
    elif not missing:
        print(f"\n  Schema: VALID (with {len(extra)} extra columns)")
    else:
        print(f"\n  Schema: INVALID ({len(missing)} missing columns)")

    print()


# ── PKP Synthesis ─────────────────────────────────────────────────
# Portable Knowledge Protocol: classify each business into a graph
# node with structured keys for network analysis and intelligence.

# Node type classification rules
NODE_TYPE_RULES = {
    "infrastructure": [
        "banking", "financial_services", "insurance", "real_estate",
        "construction", "technology", "education",
    ],
    "platform": [
        "hospitality", "food_beverage", "arts_culture", "wellness",
        "marketing", "consulting",
    ],
    "asset": [
        "retail", "personal_services", "auto_dealer", "healthcare",
        "legal", "accounting", "professional_services", "nonprofit",
    ],
}

# Neighborhood-based edge patterns
NEIGHBORHOOD_EDGES = {
    "Miracle Mile": "Miracle Mile retail corridor",
    "Ponce de Leon Corridor": "Ponce corridor professional cluster",
    "Alhambra Circle": "Alhambra financial district",
    "Merrick Park": "Merrick Park luxury retail hub",
    "University of Miami": "UM institutional anchor",
    "Douglas Road Corridor": "Douglas Road transit corridor",
    "Bird Road Corridor": "Bird Road commercial strip",
}

# Category-based picks/shovels (enabling infrastructure)
PICKS_SHOVELS = {
    "food_beverage": "Sysco, US Foods supply chain; POS systems; delivery platforms",
    "legal": "Westlaw, LexisNexis; court filing systems; professional liability carriers",
    "healthcare": "EMR systems; medical supply distributors; insurance billing networks",
    "real_estate": "MLS access; title companies; mortgage originators",
    "banking": "Federal Reserve system; FDIC; payment processing networks",
    "retail": "POS systems; inventory management; commercial lease market",
    "education": "Accreditation bodies; EdTech platforms; textbook supply",
    "hospitality": "OTAs (Booking, Expedia); food distributors; linen services",
    "technology": "Cloud providers (AWS, Azure); dev talent pipeline; VC ecosystem",
    "construction": "Permitting (City of CG); material suppliers; labor unions",
    "wellness": "Equipment suppliers; certification bodies; insurance panels",
    "consulting": "CRM platforms; professional networks; conference circuit",
}

# Undercurrent signals by category
UNDERCURRENTS = {
    "food_beverage": "Rising rents on Miracle Mile; delivery app commission pressure; labor shortage",
    "legal": "AI disruption in document review; Latin America cross-border demand growing",
    "healthcare": "Telehealth expansion; insurance reimbursement tightening; aging population",
    "real_estate": "Interest rate sensitivity; luxury condo oversupply; remote work migration",
    "banking": "Fintech competition; crypto regulation; de-risking Latin correspondent banking",
    "retail": "E-commerce pressure; experiential retail shift; tourist foot traffic dependency",
    "hospitality": "Short-term rental regulation; international tourism recovery; labor costs",
    "technology": "AI talent war; South Florida tech migration; VC funding normalization",
    "insurance": "Climate risk repricing; Citizens Insurance reform; litigation environment",
    "construction": "Material cost inflation; permitting delays; workforce housing demand",
}


def classify_node_type(category: str) -> str:
    """Classify a business category into PKP node type."""
    for node_type, categories in NODE_TYPE_RULES.items():
        if category in categories:
            return node_type
    return "asset"


def synthesize_edges(row: pd.Series) -> str:
    """Infer edges (connections) from neighborhood and category."""
    edges = []
    neighborhood = str(row.get("neighborhood_area", ""))
    category = str(row.get("category_primary", ""))
    chamber = str(row.get("chamber_member", "")).upper()

    if neighborhood in NEIGHBORHOOD_EDGES:
        edges.append(NEIGHBORHOOD_EDGES[neighborhood])
    if chamber in ("Y", "YES", "TRUE"):
        edges.append("CGCC member network")
    if category in ("banking", "financial_services", "insurance"):
        edges.append("Alhambra financial cluster")
    if category in ("food_beverage",) and neighborhood == "Miracle Mile":
        edges.append("Miracle Mile dining cluster")

    return "; ".join(edges) if edges else "Local business network"


def synthesize_signals(row: pd.Series) -> str:
    """Generate key signals to watch for this business."""
    signals = []
    rating = str(row.get("rating_primary_value", ""))
    reviews = str(row.get("rating_primary_review_count", ""))
    category = str(row.get("category_primary", ""))
    tier = str(row.get("validation_tier", ""))

    if rating:
        try:
            r = float(rating)
            if r >= 4.5:
                signals.append(f"High rating ({r}) — quality leader")
            elif r < 3.0:
                signals.append(f"Low rating ({r}) — at-risk")
        except ValueError:
            pass
    if reviews:
        try:
            rc = int(float(reviews))
            if rc > 100:
                signals.append(f"{rc} reviews — high visibility")
        except ValueError:
            pass
    if tier == "Low":
        signals.append("Low validation confidence — verify status")

    return "; ".join(signals) if signals else "Monitor for rating/review changes"


def synthesize_risks(row: pd.Series) -> str:
    """Generate risk factors for this business."""
    risks = []
    red_flag = str(row.get("red_flag_present", "")).upper()
    red_notes = str(row.get("red_flag_notes", ""))
    category = str(row.get("category_primary", ""))
    confidence = str(row.get("osint_confidence", ""))

    if red_flag in ("Y", "YES"):
        risks.append(f"Red flag: {red_notes}" if red_notes else "Red flag present")
    if confidence:
        try:
            c = float(confidence)
            if c < 0.5:
                risks.append("Low OSINT confidence — data quality risk")
        except ValueError:
            pass
    # Category-specific risks
    if category == "food_beverage":
        risks.append("Lease renewal risk; labor cost pressure")
    elif category == "real_estate":
        risks.append("Interest rate sensitivity; market cycle exposure")
    elif category == "retail":
        risks.append("E-commerce disruption; foot traffic dependency")

    return "; ".join(risks) if risks else "Standard operational risks"


def synthesize_actions(row: pd.Series) -> str:
    """Generate recommended actions for this business."""
    actions = []
    category = str(row.get("category_primary", ""))
    chamber = str(row.get("chamber_member", "")).upper()
    rating = str(row.get("rating_primary_value", ""))

    if chamber not in ("Y", "YES", "TRUE"):
        actions.append("Prospect for CGCC membership")
    if not rating:
        actions.append("Collect rating data via SerpApi enrichment")
    if category == "other":
        actions.append("Re-categorize with manual review")

    return "; ".join(actions) if actions else "Maintain monitoring cadence"


def action_synthesize(master_path: str):
    """Run PKP synthesis on all records in master CSV."""
    df = pd.read_csv(master_path, dtype=str).fillna("")
    total = len(df)
    print(f"\n  PKP Synthesis on {total} records...\n")

    stats = {"node_typed": 0, "edges_added": 0, "signals_added": 0,
             "risks_added": 0, "actions_added": 0}

    # Add PKP columns if they don't exist
    pkp_cols = ["pkp_node_type", "pkp_edges_summary", "pkp_picks_shovels_summary",
                "pkp_undercurrents_summary", "pkp_key_signals",
                "pkp_primary_risks", "pkp_primary_actions"]
    for col in pkp_cols:
        if col not in df.columns:
            df[col] = ""

    for idx, row in df.iterrows():
        category = str(row.get("category_primary", "other"))

        # Node type
        node_type = classify_node_type(category)
        df.loc[idx, "pkp_node_type"] = node_type
        stats["node_typed"] += 1

        # Edges
        edges = synthesize_edges(row)
        df.loc[idx, "pkp_edges_summary"] = edges
        stats["edges_added"] += 1

        # Picks & Shovels
        ps = PICKS_SHOVELS.get(category, "General commercial infrastructure")
        df.loc[idx, "pkp_picks_shovels_summary"] = ps

        # Undercurrents
        uc = UNDERCURRENTS.get(category, "General market conditions; Coral Gables growth trajectory")
        df.loc[idx, "pkp_undercurrents_summary"] = uc

        # Signals
        signals = synthesize_signals(row)
        df.loc[idx, "pkp_key_signals"] = signals
        stats["signals_added"] += 1

        # Risks
        risks = synthesize_risks(row)
        df.loc[idx, "pkp_primary_risks"] = risks
        stats["risks_added"] += 1

        # Actions
        actions = synthesize_actions(row)
        df.loc[idx, "pkp_primary_actions"] = actions
        stats["actions_added"] += 1

    # Write updated master
    df.to_csv(master_path, index=False)
    print(f"  Master updated: {total} records -> {master_path}")

    # Node type breakdown
    type_counts = df["pkp_node_type"].value_counts()
    print(f"\n  PKP Node Type breakdown:")
    for nt, count in type_counts.items():
        print(f"    {nt:<20} {count:>5} ({count/total*100:.1f}%)")

    print(f"\n  Synthesis complete:")
    print(f"    Node types:     {stats['node_typed']}")
    print(f"    Edges:          {stats['edges_added']}")
    print(f"    Signals:        {stats['signals_added']}")
    print(f"    Risks:          {stats['risks_added']}")
    print(f"    Actions:        {stats['actions_added']}")


def main():
    parser = argparse.ArgumentParser(
        description="Agent 3 — Synthesizer & Exporter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action schema
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize
        """,
    )
    parser.add_argument(
        "--master",
        required=True,
        help="Path to master CSV",
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["export", "stats", "schema", "synthesize"],
        help="Action to perform",
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  AGENT 3 — SYNTHESIZER & EXPORTER")
    print(f"  Master: {args.master}")
    print(f"  Action: {args.action}")
    print(f"{'='*60}")

    if not os.path.exists(args.master):
        print(f"\n  ERROR: {args.master} not found")
        return

    if args.action == "export":
        action_export(args.master)
    elif args.action == "stats":
        action_stats(args.master)
    elif args.action == "schema":
        action_schema(args.master)
    elif args.action == "synthesize":
        action_synthesize(args.master)

    print(f"  Done.\n")


if __name__ == "__main__":
    main()
