#!/usr/bin/env python3
"""
Cross-Source Reconciliation & Sunbiz Lookup
=============================================
Step 1: Find hidden corroboration in the existing master by matching
        businesses across source families using coordinates + fuzzy name.
Step 2: Sunbiz (FL Dept of State) lookup for legal existence verification.

IMPORTANT: This script TAGS records — it does NOT delete anything.
  - Adds/updates a 'corroboration_sources' column (e.g. "google,osm,cgcc")
  - Adds/updates a 'corroboration_count' column (e.g. "3")
  - Adds/updates a 'sunbiz_status' column (e.g. "Active", "Not Found")

Usage:
  # Step 1 only — cross-match existing data (no network, fast):
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile

  # Step 1 dry run (report only, don't write):
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --dry-run

  # Step 2 — Sunbiz lookup on a sample:
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --sunbiz --limit 50

  # Both steps:
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --sunbiz --limit 100

Requirements:
  pip install pandas fuzzywuzzy python-Levenshtein requests
"""

import argparse
import os
import re
import sys
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd
from fuzzywuzzy import fuzz

# ── Allow importing _shared from scripts/ ─────────────────────────
SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from _shared import haversine, normalize_key


# ══════════════════════════════════════════════════════════════════
#  CONSTANTS
# ══════════════════════════════════════════════════════════════════

# Map raw source_file values → independent source families
# Google sub-sources (Outscraper, Apify, SerpApi) = 1 family
SOURCE_TO_FAMILY = {
    "outscraper": "google",
    "apify": "google",
    "serpapi": "google",
    "osm": "osm",
    "osint-cgcc-v1": "cgcc",
    "cgcc": "cgcc",
    "ta": "tripadvisor",
    "non-cgcc-run1": "manual",
    "non-cgcc-run2": "manual",
    "agent1-scraper": "agent1",
}

# Matching thresholds
COORD_PROXIMITY_M = 100        # meters — two records within 100m are "same location"
NAME_FUZZY_THRESHOLD = 80      # fuzz.token_sort_ratio minimum for coord-assisted match
NAME_FUZZY_STRONG = 88         # strong name match (can relax coord requirement)
KEY_EXACT_BONUS = True         # exact normalize_key match = automatic corroboration

# Words to strip before comparison — these cause false "Coral Gables X == Coral Gables Y"
NOISE_WORDS = {
    "coral", "gables", "miami", "fl", "florida", "south", "north",
    "the", "of", "and", "at", "in", "by", "for", "a", "an",
    "inc", "llc", "corp", "ltd", "pa", "pllc", "llp",
}


# ══════════════════════════════════════════════════════════════════
#  STEP 1: CROSS-SOURCE RECONCILIATION
# ══════════════════════════════════════════════════════════════════

def _parse_coords(row: pd.Series) -> Tuple[Optional[float], Optional[float]]:
    """Safely parse lat/lon from a row."""
    try:
        lat = float(row["lat"]) if row.get("lat", "") else None
        lon = float(row["lon"]) if row.get("lon", "") else None
        return lat, lon
    except (ValueError, TypeError):
        return None, None


def reconcile_sources(df: pd.DataFrame, dry_run: bool = False) -> pd.DataFrame:
    """
    Find businesses that appear in multiple source families by matching
    on (coordinates proximity + fuzzy name) or (exact normalized key).

    Strategy — 3-pass matching:
      Pass A: Exact normalized key match (cheap, O(n))
      Pass B: Coord proximity (< 150m) + fuzzy name (≥ 70) — catches
              "Bloom Boutique" (Google) matching "Bloom" (OSM) when both
              are at the same lat/lon.
      Pass C: Strong fuzzy name (≥ 85) without coords — for CGCC records
              that often have no lat/lon.

    Returns the DataFrame with new columns added/updated.
    Does NOT remove any rows.
    """
    total = len(df)
    print(f"\n  Reconciling {total} records across source families...\n")

    # ── Assign families ─────────────────────────────────────
    df["_family"] = df["source_file"].str.strip().str.lower().map(SOURCE_TO_FAMILY).fillna("other")

    # ── Build per-record metadata ───────────────────────────
    # Each record gets an index, normalized key, parsed coords, family
    records = []
    for idx, row in df.iterrows():
        name = str(row.get("business_name", "")).strip()
        key = normalize_key(name)
        lat, lon = _parse_coords(row)
        family = row["_family"]
        records.append({
            "idx": idx,
            "name": name,
            "name_lower": name.lower(),
            "key": key,
            "lat": lat,
            "lon": lon,
            "family": family,
        })

    # ── Cluster records into corroboration groups ───────────
    # group_id → set of (idx, family) pairs
    # Each record starts in its own group
    record_to_group: Dict[int, int] = {}
    groups: Dict[int, Set[int]] = {}
    next_group = 0

    def _stripped_tokens(name: str) -> Set[str]:
        """Return significant tokens (remove noise words)."""
        tokens = set(re.sub(r"[^a-z0-9\s]", "", name.lower()).split())
        return tokens - NOISE_WORDS

    def _names_match(name1: str, name2: str, threshold: int) -> bool:
        """
        Check if two business names refer to the same entity.
        Uses fuzzy matching BUT requires at least 1 significant token overlap
        to prevent 'Coral Gables X' matching 'Coral Gables Y'.
        """
        # Token overlap check — must share at least 1 non-noise word
        tokens1 = _stripped_tokens(name1)
        tokens2 = _stripped_tokens(name2)
        if not tokens1 or not tokens2:
            return False
        shared = tokens1 & tokens2
        if not shared:
            return False  # no meaningful words in common

        # Fuzzy score on the stripped (de-noised) names
        stripped1 = " ".join(sorted(tokens1))
        stripped2 = " ".join(sorted(tokens2))
        score = fuzz.token_sort_ratio(stripped1, stripped2)

        # Also check the original names
        orig_score = fuzz.token_sort_ratio(name1.lower(), name2.lower())
        best = max(score, orig_score)

        return best >= threshold

    def merge_groups(idx_a: int, idx_b: int):
        """Merge the groups of two records."""
        nonlocal next_group
        ga = record_to_group.get(idx_a)
        gb = record_to_group.get(idx_b)

        if ga is not None and gb is not None:
            if ga == gb:
                return  # already same group
            # Merge smaller into larger
            if len(groups[ga]) < len(groups[gb]):
                ga, gb = gb, ga
            for member in groups[gb]:
                record_to_group[member] = ga
                groups[ga].add(member)
            del groups[gb]
        elif ga is not None:
            groups[ga].add(idx_b)
            record_to_group[idx_b] = ga
        elif gb is not None:
            groups[gb].add(idx_a)
            record_to_group[idx_a] = gb
        else:
            gid = next_group
            next_group += 1
            groups[gid] = {idx_a, idx_b}
            record_to_group[idx_a] = gid
            record_to_group[idx_b] = gid

    # ── Pass A: Exact key match ─────────────────────────────
    print("  Pass A: Exact normalized key matching...")
    key_to_records: Dict[str, List[Dict]] = defaultdict(list)
    for r in records:
        if r["key"]:
            key_to_records[r["key"]].append(r)

    pass_a_matches = 0
    for key, recs in key_to_records.items():
        if len(recs) < 2:
            continue
        # Only count if they come from different families
        families = set(r["family"] for r in recs)
        if len(families) < 2:
            continue
        # Merge all records with same key
        for i in range(1, len(recs)):
            merge_groups(recs[0]["idx"], recs[i]["idx"])
            pass_a_matches += 1

    print(f"    Pass A: {pass_a_matches} cross-family matches via exact key")

    # ── Pass B: Coord proximity + fuzzy name ────────────────
    print("  Pass B: Coordinate proximity + fuzzy name matching...")

    # Build spatial index: grid cells of ~200m for fast neighbor lookup
    # At Miami latitude (~25.7°), 1° lat ≈ 111km, 1° lon ≈ 101km
    # 200m ≈ 0.0018° lat, 0.002° lon
    GRID_LAT = 0.002
    GRID_LON = 0.002

    coord_grid: Dict[Tuple[int, int], List[Dict]] = defaultdict(list)
    records_with_coords = [r for r in records if r["lat"] is not None and r["lon"] is not None]

    for r in records_with_coords:
        cell = (int(r["lat"] / GRID_LAT), int(r["lon"] / GRID_LON))
        coord_grid[cell].append(r)

    pass_b_matches = 0
    pass_b_checked = 0

    for cell, cell_records in coord_grid.items():
        # Check this cell + 8 neighbors
        neighbors = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                ncell = (cell[0] + di, cell[1] + dj)
                if ncell in coord_grid:
                    neighbors.extend(coord_grid[ncell])

        for r1 in cell_records:
            for r2 in neighbors:
                if r1["idx"] >= r2["idx"]:
                    continue  # avoid double-checking
                if r1["family"] == r2["family"]:
                    continue  # same family, not corroboration

                # Already in same group?
                if (record_to_group.get(r1["idx"]) is not None
                        and record_to_group.get(r1["idx"]) == record_to_group.get(r2["idx"])):
                    continue

                # Coord distance
                dist_m = haversine(r1["lat"], r1["lon"], r2["lat"], r2["lon"]) * 1000
                pass_b_checked += 1

                if dist_m > COORD_PROXIMITY_M:
                    continue

                # Fuzzy name match with noise-word filtering
                if not _names_match(r1["name"], r2["name"], NAME_FUZZY_THRESHOLD):
                    continue

                merge_groups(r1["idx"], r2["idx"])
                pass_b_matches += 1

    print(f"    Pass B: {pass_b_matches} cross-family matches ({pass_b_checked} pairs checked)")

    # ── Pass C: Strong fuzzy name match (no coords required) ──
    # This catches CGCC records that have no lat/lon
    print("  Pass C: Strong fuzzy name matching (no coords needed)...")

    # Only compare records where at least one has no coords
    no_coord_records = [r for r in records if r["lat"] is None or r["lon"] is None]
    has_coord_records = records_with_coords  # reuse from Pass B

    # For efficiency: build key→records lookup for no-coord records
    # and try to match against coord records by name
    pass_c_matches = 0

    # Group no-coord records by first 4 chars of normalized key for blocking
    nc_blocks: Dict[str, List[Dict]] = defaultdict(list)
    for r in no_coord_records:
        if r["key"] and len(r["key"]) >= 4:
            nc_blocks[r["key"][:4]].append(r)

    hc_blocks: Dict[str, List[Dict]] = defaultdict(list)
    for r in has_coord_records:
        if r["key"] and len(r["key"]) >= 4:
            hc_blocks[r["key"][:4]].append(r)

    for prefix in nc_blocks:
        if prefix not in hc_blocks:
            continue
        for r_nc in nc_blocks[prefix]:
            for r_hc in hc_blocks[prefix]:
                if r_nc["family"] == r_hc["family"]:
                    continue

                # Already in same group?
                if (record_to_group.get(r_nc["idx"]) is not None
                        and record_to_group.get(r_nc["idx"]) == record_to_group.get(r_hc["idx"])):
                    continue

                if not _names_match(r_nc["name"], r_hc["name"], NAME_FUZZY_STRONG):
                    continue

                merge_groups(r_nc["idx"], r_hc["idx"])
                pass_c_matches += 1

    print(f"    Pass C: {pass_c_matches} cross-family matches via strong name similarity")

    # ── Compute corroboration for each record ───────────────
    print("\n  Computing corroboration scores...")

    # Map idx → record for family lookup
    idx_to_record = {r["idx"]: r for r in records}

    corr_sources_col = [""] * total
    corr_count_col = ["0"] * total

    # For records in groups: count independent families
    for gid, members in groups.items():
        families_in_group = set()
        for idx in members:
            families_in_group.add(idx_to_record[idx]["family"])

        corr_str = ",".join(sorted(families_in_group))
        count_str = str(len(families_in_group))

        for idx in members:
            corr_sources_col[idx] = corr_str
            corr_count_col[idx] = count_str

    # For records NOT in any group: single-source
    for r in records:
        if r["idx"] not in record_to_group:
            corr_sources_col[r["idx"]] = r["family"]
            corr_count_col[r["idx"]] = "1"

    df["corroboration_sources"] = corr_sources_col
    df["corroboration_count"] = corr_count_col

    # ── Report ──────────────────────────────────────────────
    count_dist = Counter(corr_count_col)
    print(f"\n  Corroboration Distribution:")
    for n in sorted(count_dist.keys()):
        print(f"    {n} source(s): {count_dist[n]:>5} records")

    # Show some multi-source matches
    multi_groups = {gid: members for gid, members in groups.items()
                    if len(set(idx_to_record[idx]["family"] for idx in members)) >= 2}

    print(f"\n  Multi-source groups: {len(multi_groups)}")
    shown = 0
    for gid, members in sorted(multi_groups.items(), key=lambda x: -len(x[1]))[:30]:
        families = set()
        names = []
        for idx in members:
            r = idx_to_record[idx]
            families.add(r["family"])
            names.append(f'{r["name"]} [{r["family"]}]')
        if shown < 30:
            print(f"\n    Group {gid} ({len(families)} families, {len(members)} records):")
            for n in names[:6]:
                print(f"      {n}")
            if len(names) > 6:
                print(f"      ... and {len(names) - 6} more")
            shown += 1

    # Cleanup temp column
    df.drop(columns=["_family"], inplace=True)

    return df


# ══════════════════════════════════════════════════════════════════
#  STEP 2: SUNBIZ LOOKUP
# ══════════════════════════════════════════════════════════════════

def search_sunbiz(business_name: str) -> Dict[str, str]:
    """
    Search Florida Sunbiz (Division of Corporations) for a business name.
    Returns dict with keys: status, sunbiz_name, sunbiz_filing_number.

    Uses a session-based approach:
      1. GET the form page to establish cookies
      2. POST the search form to get results
      3. Parse the results table (Corporate Name, Document Number, Status)

    Rate-limited to be polite (1 req/2 sec between calls).
    """
    import requests
    from urllib.parse import quote

    result = {"status": "Not Found", "sunbiz_name": "", "sunbiz_filing_number": "", "sunbiz_match_score": ""}

    # Clean up name for search: remove suffixes, punctuation
    clean = re.sub(r"\b(llc|inc|corp|ltd|pa|pllc|llp)\b", "", business_name.lower())
    clean = re.sub(r"[^a-z0-9\s]", "", clean).strip()
    words = clean.split()[:4]
    query = " ".join(words).upper()

    if not query or len(query) < 3:
        result["status"] = "Skipped (name too short)"
        return result

    try:
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })

        # Step 1: Get form page (establishes cookies / Cloudflare token)
        session.get("https://search.sunbiz.org/Inquiry/CorporationSearch/ByName", timeout=15)

        # Step 2: POST form to trigger search
        data = {
            "SearchTerm": query,
            "InquiryType": "EntityName",
            "SearchNameOrder": query,
        }
        resp = session.post(
            "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
            data=data,
            timeout=15,
            allow_redirects=True,
        )

        if resp.status_code != 200 or "error occurred" in resp.text.lower():
            result["status"] = f"HTTP {resp.status_code}" if resp.status_code != 200 else "Search Error"
            return result

        html = resp.text

        # Step 3: Parse the results table
        # Each row: <td class="large-width"><a ...>NAME</a></td>
        #           <td class="medium-width">FILING_NUMBER</td>
        #           <td class="small-width">STATUS</td>
        row_pattern = re.compile(
            r'<td\s+class="large-width">\s*<a[^>]*>([^<]+)</a>\s*</td>\s*'
            r'<td\s+class="medium-width">([^<]*)</td>\s*'
            r'<td\s+class="small-width">([^<]*)</td>',
            re.DOTALL | re.IGNORECASE,
        )

        matches = row_pattern.findall(html)

        if not matches:
            return result

        # Score each match against our business name
        best_match = None
        best_score = 0

        # Map Sunbiz status codes to readable values
        STATUS_MAP = {
            "ACT": "Active",
            "INACT": "Inactive",
            "INACTIVE": "Inactive",
            "INACT/UA": "Inactive",
            "ADMIN DISSOLVED": "Admin Dissolved",
            "VOLUNTARILY DISSOLVED": "Dissolved",
            "VOL DISSOLVED": "Dissolved",
            "REVOKED": "Revoked",
            "WITHDRAWN": "Withdrawn",
        }

        for match_name, filing_num, status_raw in matches:
            match_name_clean = match_name.strip()
            status_clean = STATUS_MAP.get(status_raw.strip().upper(), status_raw.strip())

            score = fuzz.token_sort_ratio(business_name.lower(), match_name_clean.lower())
            # Boost score if status is Active (prefer active matches)
            effective_score = score + (2 if "Active" in status_clean else 0)

            if effective_score > best_score:
                best_score = effective_score
                best_match = (match_name_clean, filing_num.strip(), status_clean, score)

        if best_match and best_match[3] >= 50:  # use raw score for threshold
            result["status"] = best_match[2]
            result["sunbiz_name"] = best_match[0]
            result["sunbiz_filing_number"] = best_match[1]
            result["sunbiz_match_score"] = str(best_match[3])
        else:
            result["status"] = "Not Found"

    except requests.exceptions.Timeout:
        result["status"] = "Timeout"
    except Exception as e:
        result["status"] = f"Error: {str(e)[:50]}"

    return result


def sunbiz_lookup(df: pd.DataFrame, limit: int = 50, dry_run: bool = False) -> pd.DataFrame:
    """
    Look up businesses on Florida Sunbiz to verify legal existence.
    Adds/updates: sunbiz_status, sunbiz_name, sunbiz_filing_number columns.

    Priority: checks businesses with lowest corroboration first.
    Does NOT remove any records regardless of result.
    """
    total = len(df)
    print(f"\n  Sunbiz Lookup — checking up to {limit} businesses...\n")

    # Prioritize: single-source records first, then those without CGCC
    if "corroboration_count" in df.columns:
        priority = df.sort_values("corroboration_count", ascending=True)
    else:
        priority = df.copy()

    # Skip records already checked
    if "sunbiz_status" in df.columns:
        unchecked = priority[priority["sunbiz_status"].fillna("") == ""]
    else:
        df["sunbiz_status"] = ""
        df["sunbiz_name"] = ""
        df["sunbiz_filing_number"] = ""
        unchecked = priority

    to_check = unchecked.head(limit)
    print(f"  Checking {len(to_check)} businesses (of {len(unchecked)} unchecked)...")

    stats = Counter()
    for i, (idx, row) in enumerate(to_check.iterrows(), 1):
        name = str(row.get("business_name", "")).strip()
        if not name or len(name) < 3:
            stats["Skipped"] += 1
            continue

        result = search_sunbiz(name)
        status = result["status"]
        stats[status] += 1

        if not dry_run:
            df.loc[idx, "sunbiz_status"] = status
            df.loc[idx, "sunbiz_name"] = result.get("sunbiz_name", "")
            df.loc[idx, "sunbiz_filing_number"] = result.get("sunbiz_filing_number", "")

        # Progress
        if i % 10 == 0 or i == len(to_check):
            print(f"    [{i}/{len(to_check)}] {name[:40]} -> {status}")

        time.sleep(2.0)  # Be polite to Sunbiz

    print(f"\n  Sunbiz Results:")
    for status, count in stats.most_common():
        print(f"    {status:<25} {count:>5}")

    return df


# ══════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Cross-Source Reconciliation & Sunbiz Lookup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Cross-match only (fast, no network):
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile

  # Dry run (report only):
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --dry-run

  # Sunbiz lookup on 50 businesses:
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --sunbiz --limit 50

  # Both:
  python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --sunbiz --limit 100
        """,
    )
    parser.add_argument("--master", required=True, help="Path to master CSV")
    parser.add_argument("--reconcile", action="store_true", help="Run cross-source reconciliation")
    parser.add_argument("--sunbiz", action="store_true", help="Run Sunbiz legal existence lookup")
    parser.add_argument("--limit", type=int, default=50, help="Max businesses to check on Sunbiz (default: 50)")
    parser.add_argument("--dry-run", action="store_true", help="Report only, don't modify master")
    args = parser.parse_args()

    if not args.reconcile and not args.sunbiz:
        print("  Specify --reconcile and/or --sunbiz. See --help.")
        return

    if not os.path.exists(args.master):
        print(f"  ERROR: {args.master} not found")
        return

    df = pd.read_csv(args.master, dtype=str).fillna("")
    print(f"\n{'='*70}")
    print(f"  CROSS-SOURCE RECONCILER")
    print(f"  Master: {args.master} ({len(df)} records)")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"{'='*70}")

    if args.reconcile:
        df = reconcile_sources(df, args.dry_run)

    if args.sunbiz:
        df = sunbiz_lookup(df, limit=args.limit, dry_run=args.dry_run)

    if not args.dry_run:
        df.to_csv(args.master, index=False)
        print(f"\n  Master UPDATED → {args.master}")
    else:
        print(f"\n  DRY RUN — no changes written")

    print(f"\n  Done.\n")


if __name__ == "__main__":
    main()
