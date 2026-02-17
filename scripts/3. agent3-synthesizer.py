#!/usr/bin/env python3
"""
Agent 3 — Synthesizer & Exporter
==================================
Takes the validated master CSV from Agent 2 and exports it for the
dashboard and other downstream consumers.

Operations:
  export    — Copy master CSV to dashboard/public/data/ with field selection
  stats     — Print coverage stats and category breakdown
  schema    — Validate master CSV against canonical schema

Usage:
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action schema

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


def main():
    parser = argparse.ArgumentParser(
        description="Agent 3 — Synthesizer & Exporter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats
  python "3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action schema
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
        choices=["export", "stats", "schema"],
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

    print(f"  Done.\n")


if __name__ == "__main__":
    main()
