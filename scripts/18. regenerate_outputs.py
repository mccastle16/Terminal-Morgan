#!/usr/bin/env python3
"""
Regenerate all downstream outputs from the master CSV.
Re-syncs: dashboard CSVs, sentiment, predictions, graph stats.
Run AFTER data_enhancer.py to propagate changes.
"""

import csv
import json
import os
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUB = ROOT / "dashboard" / "public" / "data"
MASTER = DATA / "master_all_businesses.csv"

def load_master():
    with open(MASTER, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def regenerate_lite_csv(rows):
    """Regenerate businesses_lite.csv with essential columns."""
    lite_fields = [
        "business_id", "business_name", "phone", "website", "address",
        "neighborhood_area", "category_primary", "rating_primary_value",
        "chamber_member",
    ]
    path = PUB / "businesses_lite.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=lite_fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"  businesses_lite.csv: {len(rows)} rows, {len(lite_fields)} cols")

def regenerate_union_csv(rows):
    """Regenerate union_all_businesses.csv with full schema."""
    # Use canonical field order matching _shared.py
    canonical = [
        "business_id", "business_name", "contact_name", "phone", "website",
        "address", "latitude", "longitude", "postcode", "neighborhood_area",
        "category_primary", "category_secondary", "price_tier",
        "rating_primary_value", "rating_primary_source", "rating_primary_review_count",
        "top_delights", "top_pain_points", "osint_confidence", "validation_tier",
        "red_flag_present", "red_flag_severity", "red_flag_notes", "chamber_member",
        "source_file", "batch_id", "last_reviewed_date",
        "corroboration_sources", "corroboration_count",
        "sunbiz_status", "sunbiz_name", "sunbiz_filing_number",
        "price_tier_source",
    ]
    # Add any extra columns from the master that aren't in canonical
    all_keys = set()
    for r in rows:
        all_keys.update(r.keys())
    fields = canonical + sorted(all_keys - set(canonical))
    
    path = PUB / "union_all_businesses.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"  union_all_businesses.csv: {len(rows)} rows, {len(fields)} cols")

def regenerate_sentiment(rows):
    """Re-run the sentiment extractor on the cleaned data."""
    script = ROOT / "scripts" / "14. sentiment_extractor.py"
    if script.exists():
        print("  Running sentiment extractor...")
        os.system(f'cd "{ROOT}" && python3 "{script}" 2>&1 | tail -5')
    else:
        print("  [SKIP] sentiment extractor script not found")

def regenerate_predictions(rows):
    """Re-run the prediction model on the cleaned data."""
    script = ROOT / "scripts" / "16. prediction_model.py"
    if script.exists():
        print("  Running prediction model...")
        os.system(f'cd "{ROOT}" && python3 "{script}" 2>&1 | tail -5')
    else:
        print("  [SKIP] prediction model script not found")

def main():
    print("=" * 70)
    print("REGENERATING DOWNSTREAM OUTPUTS")
    print(f"{datetime.now().isoformat()}")
    print("=" * 70)
    
    rows = load_master()
    print(f"Master CSV: {len(rows)} records\n")
    
    print("[1/4] Dashboard CSVs...")
    regenerate_lite_csv(rows)
    regenerate_union_csv(rows)
    
    print("\n[2/4] Sentiment profiles...")
    regenerate_sentiment(rows)
    
    print("\n[3/4] Prediction model...")
    regenerate_predictions(rows)
    
    print("\n[4/4] Verifying alignment...")
    # Quick check
    for fn in ["sentiment_profiles.json", "predictions.json"]:
        path = PUB / fn
        if path.exists():
            with open(path) as f:
                data = json.load(f)
            ids = set(d.get("business_id", "") for d in data if d.get("business_id"))
            master_ids = set(r.get("business_id", "") for r in rows if r.get("business_id"))
            match = "ALIGNED" if ids == master_ids else f"MISMATCH (json:{len(ids)} vs csv:{len(master_ids)})"
            print(f"  {fn}: {len(data)} records -> {match}")
    
    print("\nDone. All outputs regenerated from cleaned master.")

if __name__ == "__main__":
    main()
