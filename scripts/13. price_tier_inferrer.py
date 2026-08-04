#!/usr/bin/env python3
"""
Price Tier Inferrer — Fills the 45% missing price_tier values
=============================================================
Strategy:
  1. Category-based median: Assign the mode price tier of same category_primary
  2. Neighborhood-based fallback: If category has no data, use neighborhood mode
  3. Confidence tag: Mark inferred tiers with price_tier_source = 'inferred'
     vs 'original' for existing values

Usage:
  python3 "scripts/13. price_tier_inferrer.py"                  # dry-run
  python3 "scripts/13. price_tier_inferrer.py" --apply          # write changes
"""

import csv
import os
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
UNION_CSV  = ROOT / "dashboard" / "public" / "data" / "union_all_businesses.csv"
LITE_CSV   = ROOT / "dashboard" / "public" / "data" / "businesses_lite.csv"
BACKUP_DIR = ROOT / "data" / "snapshots"

VALID_TIERS = {"$", "$$", "$$$", "$$$$"}
TIER_ORDER  = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}

def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

def mode_tier(tiers):
    """Return the most common tier from a list of tier strings."""
    valid = [t for t in tiers if t in VALID_TIERS]
    if not valid:
        return None
    counts = Counter(valid)
    return counts.most_common(1)[0][0]

def build_lookup(rows):
    """Build category→mode and neighborhood→mode lookup tables."""
    cat_tiers = {}
    hood_tiers = {}

    for row in rows:
        tier = row.get("price_tier", "").strip()
        if tier not in VALID_TIERS:
            continue
        cat = row.get("category_primary", "").strip()
        hood = row.get("neighborhood_area", "").strip()
        if cat:
            cat_tiers.setdefault(cat, []).append(tier)
        if hood:
            hood_tiers.setdefault(hood, []).append(tier)

    cat_modes = {cat: mode_tier(tiers) for cat, tiers in cat_tiers.items()}
    hood_modes = {hood: mode_tier(tiers) for hood, tiers in hood_tiers.items()}

    return cat_modes, hood_modes

def infer_tiers(rows, cat_modes, hood_modes):
    """Infer missing price tiers using category mode → neighborhood mode fallback."""
    changes = []
    for row in rows:
        existing = row.get("price_tier", "").strip()
        if existing in VALID_TIERS:
            row["price_tier_source"] = "original"
            continue

        cat = row.get("category_primary", "").strip()
        hood = row.get("neighborhood_area", "").strip()

        inferred = cat_modes.get(cat) or hood_modes.get(hood) or "$$"
        row["price_tier"] = inferred
        row["price_tier_source"] = "inferred"
        changes.append({
            "business": row.get("business_name", "?"),
            "category": cat,
            "neighborhood": hood,
            "inferred_tier": inferred,
            "method": "category_mode" if cat_modes.get(cat) else ("neighborhood_mode" if hood_modes.get(hood) else "global_default"),
        })

    return changes

def main():
    apply = "--apply" in sys.argv

    print("=" * 60)
    print("  Price Tier Inferrer")
    print("=" * 60)

    rows = load_csv(MASTER_CSV)
    total = len(rows)
    missing = sum(1 for r in rows if r.get("price_tier", "").strip() not in VALID_TIERS)
    print(f"\nTotal businesses: {total}")
    print(f"Missing price tier: {missing} ({missing/total*100:.1f}%)")

    cat_modes, hood_modes = build_lookup(rows)

    print(f"\nCategory tier modes:")
    for cat, tier in sorted(cat_modes.items()):
        print(f"  {cat:30s} → {tier}")

    print(f"\nNeighborhood tier modes:")
    for hood, tier in sorted(hood_modes.items()):
        print(f"  {hood:30s} → {tier}")

    changes = infer_tiers(rows, cat_modes, hood_modes)
    print(f"\n{'Would infer' if not apply else 'Inferred'}: {len(changes)} tiers")

    # Method breakdown
    methods = Counter(c["method"] for c in changes)
    for method, count in methods.most_common():
        print(f"  {method}: {count}")

    # Tier distribution after
    final_dist = Counter(r.get("price_tier", "") for r in rows)
    print(f"\nFinal distribution:")
    for tier in ["$", "$$", "$$$", "$$$$"]:
        ct = final_dist.get(tier, 0)
        print(f"  {tier:5s}: {ct:5d} ({ct/total*100:.1f}%)")

    if not apply:
        print("\n  DRY RUN — no files changed. Use --apply to write.")
        return

    # Backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"master_pre_pricetier_{ts}.csv"
    original = load_csv(MASTER_CSV)
    fieldnames_orig = list(original[0].keys()) if original else []
    save_csv(backup_path, original, fieldnames_orig)
    print(f"\n  Backup: {backup_path}")

    # Ensure price_tier_source column exists
    fieldnames = list(rows[0].keys()) if rows else []
    if "price_tier_source" not in fieldnames:
        fieldnames.append("price_tier_source")

    save_csv(MASTER_CSV, rows, fieldnames)
    print(f"  Updated: {MASTER_CSV}")

    # Update union + lite CSVs
    for csv_path in [UNION_CSV, LITE_CSV]:
        if csv_path.exists():
            other_rows = load_csv(csv_path)
            other_cat_modes, other_hood_modes = build_lookup(other_rows)
            # Use the same master lookup for consistency
            infer_tiers(other_rows, cat_modes, hood_modes)
            other_fnames = list(other_rows[0].keys()) if other_rows else []
            if "price_tier_source" not in other_fnames:
                other_fnames.append("price_tier_source")
            save_csv(csv_path, other_rows, other_fnames)
            print(f"  Updated: {csv_path}")

    print(f"\n  Done — {len(changes)} tiers inferred.")

if __name__ == "__main__":
    main()
