#!/usr/bin/env python3
"""
Snapshot Archiver — Timestamps and archives CSVs for temporal analysis
======================================================================
Creates timestamped copies of key data files. Run daily (cron) to build
a history that enables trend detection, delta analysis, and anomaly alerting.

Usage:
  python3 "scripts/12. snapshot_archiver.py"             # snapshot now
  python3 "scripts/12. snapshot_archiver.py" --delta      # snapshot + compute delta from last

Cron (daily at 2am):
  0 2 * * * cd /path/to/Terminal && python3 "scripts/12. snapshot_archiver.py" --delta
"""

import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
UNION_CSV  = ROOT / "dashboard" / "public" / "data" / "union_all_businesses.csv"
SNAPSHOT_DIR = ROOT / "data" / "snapshots"
DELTA_DIR = ROOT / "data" / "snapshots" / "deltas"

# Fields to track for delta detection
TRACKED_FIELDS = [
    "business_name", "category_primary", "rating_primary_value",
    "rating_primary_review_count", "validation_tier", "red_flag_present",
    "chamber_member", "phone", "website",
]


def take_snapshot():
    """Create timestamped copy of master CSV."""
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d")

    snap_path = SNAPSHOT_DIR / f"master_{ts}.csv"
    if snap_path.exists():
        print(f"  Snapshot already exists for today: {snap_path.name}")
        return snap_path

    import shutil
    shutil.copy2(MASTER_CSV, snap_path)
    print(f"  Snapshot: {snap_path.name} ({snap_path.stat().st_size / 1024:.0f} KB)")
    return snap_path


def load_csv_indexed(path):
    """Load CSV and index by business_id."""
    records = {}
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            bid = row.get("business_id", "").strip()
            if bid:
                records[bid] = row
    return records


def compute_delta(current_path, previous_path):
    """Compare two snapshots and return structured delta."""
    current = load_csv_indexed(current_path)
    previous = load_csv_indexed(previous_path)

    current_ids = set(current.keys())
    previous_ids = set(previous.keys())

    delta = {
        "current_snapshot": current_path.name,
        "previous_snapshot": previous_path.name,
        "current_count": len(current),
        "previous_count": len(previous),
        "new_businesses": [],
        "removed_businesses": [],
        "changed_businesses": [],
        "rating_changes": [],
        "review_velocity": [],
        "membership_changes": [],
        "red_flag_changes": [],
        "category_changes": [],
        "summary": {},
    }

    # New businesses
    for bid in current_ids - previous_ids:
        row = current[bid]
        delta["new_businesses"].append({
            "business_id": bid,
            "business_name": row.get("business_name", ""),
            "category": row.get("category_primary", ""),
            "neighborhood": row.get("neighborhood_area", ""),
        })

    # Removed businesses
    for bid in previous_ids - current_ids:
        row = previous[bid]
        delta["removed_businesses"].append({
            "business_id": bid,
            "business_name": row.get("business_name", ""),
            "category": row.get("category_primary", ""),
        })

    # Changed businesses
    for bid in current_ids & previous_ids:
        curr = current[bid]
        prev = previous[bid]
        changes = {}

        for field in TRACKED_FIELDS:
            old_val = (prev.get(field, "") or "").strip()
            new_val = (curr.get(field, "") or "").strip()
            if old_val != new_val:
                changes[field] = {"old": old_val, "new": new_val}

        if changes:
            entry = {
                "business_id": bid,
                "business_name": curr.get("business_name", ""),
                "changes": changes,
            }
            delta["changed_businesses"].append(entry)

            # Specific change tracking
            if "rating_primary_value" in changes:
                old_r = float(changes["rating_primary_value"]["old"] or 0)
                new_r = float(changes["rating_primary_value"]["new"] or 0)
                if old_r > 0 and new_r > 0:
                    delta["rating_changes"].append({
                        "business_id": bid,
                        "business_name": curr.get("business_name", ""),
                        "old_rating": old_r,
                        "new_rating": new_r,
                        "delta": round(new_r - old_r, 2),
                    })

            if "rating_primary_review_count" in changes:
                old_c = int(changes["rating_primary_review_count"]["old"] or 0)
                new_c = int(changes["rating_primary_review_count"]["new"] or 0)
                delta["review_velocity"].append({
                    "business_id": bid,
                    "business_name": curr.get("business_name", ""),
                    "old_count": old_c,
                    "new_count": new_c,
                    "new_reviews": new_c - old_c,
                })

            if "chamber_member" in changes:
                delta["membership_changes"].append({
                    "business_id": bid,
                    "business_name": curr.get("business_name", ""),
                    "old_status": changes["chamber_member"]["old"],
                    "new_status": changes["chamber_member"]["new"],
                })

            if "red_flag_present" in changes:
                delta["red_flag_changes"].append({
                    "business_id": bid,
                    "business_name": curr.get("business_name", ""),
                    "old_flag": changes["red_flag_present"]["old"],
                    "new_flag": changes["red_flag_present"]["new"],
                })

            if "category_primary" in changes:
                delta["category_changes"].append({
                    "business_id": bid,
                    "business_name": curr.get("business_name", ""),
                    "old_category": changes["category_primary"]["old"],
                    "new_category": changes["category_primary"]["new"],
                })

    # Aggregate stats
    curr_members = sum(1 for r in current.values() if r.get("chamber_member", "").upper() == "Y")
    prev_members = sum(1 for r in previous.values() if r.get("chamber_member", "").upper() == "Y")

    curr_avg = 0
    prev_avg = 0
    curr_rated = [float(r.get("rating_primary_value", 0) or 0) for r in current.values() if float(r.get("rating_primary_value", 0) or 0) > 0]
    prev_rated = [float(r.get("rating_primary_value", 0) or 0) for r in previous.values() if float(r.get("rating_primary_value", 0) or 0) > 0]
    if curr_rated: curr_avg = sum(curr_rated) / len(curr_rated)
    if prev_rated: prev_avg = sum(prev_rated) / len(prev_rated)

    delta["summary"] = {
        "net_new_businesses": len(delta["new_businesses"]) - len(delta["removed_businesses"]),
        "total_changes": len(delta["changed_businesses"]),
        "rating_shifts": len(delta["rating_changes"]),
        "rating_drops": len([r for r in delta["rating_changes"] if r["delta"] < -0.3]),
        "rating_gains": len([r for r in delta["rating_changes"] if r["delta"] > 0.3]),
        "avg_rating_current": round(curr_avg, 3),
        "avg_rating_previous": round(prev_avg, 3),
        "membership_current": curr_members,
        "membership_previous": prev_members,
        "membership_delta": curr_members - prev_members,
        "new_red_flags": len([r for r in delta["red_flag_changes"] if r["new_flag"].upper() == "Y"]),
        "resolved_red_flags": len([r for r in delta["red_flag_changes"] if r["new_flag"].upper() != "Y"]),
        "review_velocity_total": sum(r["new_reviews"] for r in delta["review_velocity"]),
    }

    return delta


def find_previous_snapshot(current_name):
    """Find the most recent snapshot before the current one."""
    snapshots = sorted([
        f for f in SNAPSHOT_DIR.glob("master_*.csv")
        if f.name != current_name and not f.name.startswith("master_pre_")
    ])
    return snapshots[-1] if snapshots else None


def export_delta_for_dashboard(delta):
    """Write delta JSON to dashboard public data for frontend consumption."""
    dash_data = ROOT / "dashboard" / "public" / "data"
    dash_data.mkdir(parents=True, exist_ok=True)

    # Write the latest delta
    out_path = dash_data / "latest_delta.json"
    out_path.write_text(json.dumps(delta, indent=2), encoding="utf-8")
    print(f"  Dashboard delta: {out_path.name}")

    # Append to history
    history_path = dash_data / "delta_history.json"
    history = []
    if history_path.exists():
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = []

    history.append({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "summary": delta["summary"],
    })

    # Keep last 365 days
    history = history[-365:]
    history_path.write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(f"  Delta history:    {history_path.name} ({len(history)} entries)")


def main():
    compute_delta_flag = "--delta" in sys.argv

    print("=" * 60)
    print("Snapshot Archiver")
    print("=" * 60)

    # Take snapshot
    print(f"\n── Taking snapshot ──")
    snap_path = take_snapshot()

    if compute_delta_flag:
        print(f"\n── Computing delta ──")
        prev = find_previous_snapshot(snap_path.name)
        if prev:
            print(f"  Comparing: {snap_path.name} vs {prev.name}")
            delta = compute_delta(snap_path, prev)

            print(f"\n  Results:")
            s = delta["summary"]
            print(f"    Net new businesses:   {s['net_new_businesses']:+d}")
            print(f"    Total field changes:  {s['total_changes']}")
            print(f"    Rating shifts:        {s['rating_shifts']} ({s['rating_drops']} drops, {s['rating_gains']} gains)")
            print(f"    Membership delta:     {s['membership_delta']:+d} (now {s['membership_current']})")
            print(f"    New red flags:        {s['new_red_flags']}")
            print(f"    Review velocity:      {s['review_velocity_total']:+d} reviews")

            if delta["rating_changes"]:
                drops = sorted(delta["rating_changes"], key=lambda r: r["delta"])[:5]
                print(f"\n  Biggest rating drops:")
                for r in drops:
                    print(f"    {r['business_name'][:35]:35s} {r['old_rating']:.1f} → {r['new_rating']:.1f} ({r['delta']:+.1f})")

            # Save delta JSON
            DELTA_DIR.mkdir(parents=True, exist_ok=True)
            ts = datetime.now().strftime("%Y%m%d")
            delta_path = DELTA_DIR / f"delta_{ts}.json"
            delta_path.write_text(json.dumps(delta, indent=2), encoding="utf-8")
            print(f"\n  Delta log: {delta_path.name}")

            # Export to dashboard
            export_delta_for_dashboard(delta)
        else:
            print("  No previous snapshot found. Delta will be available after next run.")
            # Create initial delta_history.json
            export_delta_for_dashboard({
                "current_snapshot": snap_path.name,
                "previous_snapshot": None,
                "summary": {
                    "net_new_businesses": 0, "total_changes": 0,
                    "rating_shifts": 0, "rating_drops": 0, "rating_gains": 0,
                    "avg_rating_current": 0, "avg_rating_previous": 0,
                    "membership_current": 0, "membership_previous": 0, "membership_delta": 0,
                    "new_red_flags": 0, "resolved_red_flags": 0, "review_velocity_total": 0,
                }
            })

    print(f"\nDone!")


if __name__ == "__main__":
    main()
