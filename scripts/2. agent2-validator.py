#!/usr/bin/env python3
"""
Agent 2 — Validator & Merger
==============================
Takes raw staging CSVs from Agent 1, normalizes them to the canonical
schema, deduplicates against the master CSV, validates fields, and
writes an updated master.

Pipeline:
  1. Load master CSV (existing deduped records)
  2. Ingest all staging CSVs from staging/
  3. Normalize each raw record to canonical schema
  4. Deduplicate via fuzzy name matching (ratio >= 85)
  5. Validate: geo bounds, required fields, category mapping
  6. Merge: fill blanks on existing records, append truly new ones
  7. Cross-source reconciliation: tag corroboration across source families
  8. (Optional) Sunbiz legal existence lookup for FL-registered entities
  9. Populate red_flag_present / red_flag_severity from validation issues
  10. Write updated master CSV
  11. Archive processed staging files

Usage:
  python "2. agent2-validator.py" --master data/master_all_businesses.csv
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --staging staging/
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --dry-run
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --reconcile
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --reconcile --sunbiz --sunbiz-limit 100

Requirements:
  pip install pandas fuzzywuzzy python-Levenshtein requests
"""

import argparse
import csv
import os
import re
import shutil
import time
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd
from fuzzywuzzy import fuzz

from _shared import (
    CANONICAL_FIELDS,
    CG_BOUNDS,
    CG_ZIPS_SET as CG_ZIPS,
    NOISE_WORDS,
    NOMINATIM_HEADERS,
    NOMINATIM_URL,
    classify_category,
    haversine,
    in_coral_gables,
    infer_neighborhood,
    infer_zip,
    names_match,
    normalize_key,
    normalize_phone,
    strip_noise,
)


# ── Category mapping ──────────────────────────────────────────────
# Classification rules live in _shared.classify_category (word-boundary based,
# shared with the reclassifier and Pass-4 name inference) so all stages agree.

# ── Cross-Source Reconciliation Constants ─────────────────────────
# Map raw source_file values → independent source families.
# Google sub-sources (Outscraper, Apify, SerpApi) collapse to 1 family.
SOURCE_TO_FAMILY = {
    "outscraper": "google",
    "apify": "google",
    "apify_yelp": "yelp",
    "serpapi": "google",
    "osm": "osm",
    "osint-cgcc-v1": "cgcc",
    "cgcc": "cgcc",
    "ta": "tripadvisor",
    "non-cgcc-run1": "manual",
    "non-cgcc-run2": "manual",
    "agent1-scraper": "agent1",
}

COORD_PROXIMITY_M = 100        # meters — two records within 100m are "same location"
NAME_FUZZY_THRESHOLD = 80      # fuzz.token_sort_ratio minimum for coord-assisted match
NAME_FUZZY_STRONG = 88         # strong name match (can relax coord requirement)

# NOISE_WORDS now lives in _shared (used by both dedup and Agent 8 verification).

# Sunbiz status code normalization
SUNBIZ_STATUS_MAP = {
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


def map_category(raw_category: str) -> Tuple[str, str]:
    """Map a raw category string to (primary, secondary) via the shared classifier."""
    if not raw_category:
        return ("other", "")
    primary = classify_category(raw_category) or "other"
    return (primary, raw_category.strip())


# ── Normalization ─────────────────────────────────────────────────
def normalize_record(raw: Dict[str, str], source_label: str = "") -> Dict[str, str]:
    """Convert a raw Agent 1 record into canonical schema."""
    name = raw.get("business_name", "").strip()
    if not name:
        return {}

    # Parse coordinates
    lat_raw = raw.get("lat", "")
    lon_raw = raw.get("lon", "")
    try:
        lat = float(lat_raw) if lat_raw else None
    except (ValueError, TypeError):
        lat = None
    try:
        lon = float(lon_raw) if lon_raw else None
    except (ValueError, TypeError):
        lon = None

    # Category
    primary, secondary = map_category(raw.get("category_raw", ""))

    # Postcode
    postcode = raw.get("postcode", "").strip()
    if not postcode and lat is not None and lon is not None:
        postcode = infer_zip(lat, lon)

    # Neighborhood
    neighborhood = ""
    if lat is not None and lon is not None:
        neighborhood = infer_neighborhood(lat, lon)

    # Rating source inference
    source = raw.get("source", source_label).lower()
    rating_source = ""
    if source == "outscraper":
        rating_source = "Google (Outscraper)"
    elif source == "apify":
        rating_source = "Google (Apify)"
    elif source == "apify_yelp":
        rating_source = "Yelp (Apify)"
    elif source == "serpapi":
        rating_source = "Google (SerpApi)"
    elif source == "osm":
        rating_source = ""  # OSM doesn't have ratings

    return {
        "business_id": normalize_key(name),
        "business_name": name,
        "contact_name": raw.get("contact_name", ""),
        "phone": normalize_phone(raw.get("phone", "")),
        "website": raw.get("website", "").strip(),
        "address": raw.get("address", "").strip(),
        "lat": str(lat) if lat is not None else "",
        "lon": str(lon) if lon is not None else "",
        "postcode": postcode,
        "neighborhood_area": neighborhood,
        "category_primary": primary,
        "category_secondary": secondary,
        "price_tier": raw.get("price", "").strip(),
        "rating_primary_value": raw.get("rating", "").strip(),
        "rating_primary_source": rating_source,
        "rating_primary_review_count": raw.get("review_count", "").strip(),
        "top_delights": "",
        "top_pain_points": "",
        "osint_confidence": "",
        "validation_tier": "",
        "red_flag_present": "",
        "red_flag_severity": "",
        "red_flag_notes": "",
        "chamber_member": "",
        "source_file": source,
        "batch_id": "",
        "last_reviewed_date": datetime.now().strftime("%Y-%m-%d"),
    }


# ── Validation ────────────────────────────────────────────────────
def validate_record(record: Dict[str, str]) -> Tuple[str, float, List[str]]:
    """
    Validate a normalized record.
    Returns (tier, confidence, issues).
    Tier: High / Moderate / Low
    """
    issues = []
    score = 1.0

    # Required field: business_name
    if not record.get("business_name"):
        return ("Low", 0.0, ["Missing business_name"])

    # Geo validation
    lat_str = record.get("lat", "")
    lon_str = record.get("lon", "")
    if lat_str and lon_str:
        try:
            lat, lon = float(lat_str), float(lon_str)
            if not in_coral_gables(lat, lon):
                issues.append("Outside Coral Gables bounds")
                score -= 0.3
        except ValueError:
            issues.append("Invalid coordinates")
            score -= 0.1

    # Zip code validation
    postcode = record.get("postcode", "")
    if postcode and postcode not in CG_ZIPS:
        # Not necessarily wrong (border businesses), but note it
        issues.append(f"Zip {postcode} not in primary CG set")
        score -= 0.1

    # Contact completeness
    has_phone = bool(record.get("phone"))
    has_website = bool(record.get("website"))
    has_address = bool(record.get("address"))

    if not has_phone and not has_website:
        issues.append("No phone or website")
        score -= 0.2

    if not has_address and not lat_str:
        issues.append("No address or coordinates")
        score -= 0.1

    # Category validation
    if record.get("category_primary") == "other":
        issues.append("Category unmapped")
        score -= 0.05

    # Rating sanity
    rating_str = record.get("rating_primary_value", "")
    if rating_str:
        try:
            rating = float(rating_str)
            if rating < 1.0 or rating > 5.0:
                issues.append(f"Rating {rating} outside 1-5 range")
                score -= 0.1
        except ValueError:
            pass

    score = max(0.0, min(1.0, score))

    if score >= 0.8:
        tier = "High"
    elif score >= 0.5:
        tier = "Moderate"
    else:
        tier = "Low"

    return (tier, round(score, 2), issues)


# ── Canonical category values ─────────────────────────────────────
VALID_CATEGORIES = {
    "food_beverage", "legal", "healthcare", "real_estate", "banking",
    "financial_services", "insurance", "retail", "education",
    "hospitality", "nonprofit", "personal_services", "wellness",
    "professional_services", "consulting", "marketing", "construction",
    "auto_dealer", "arts_culture", "technology", "accounting", "other",
}

# Map non-standard category values to canonical ones
CATEGORY_NORMALIZE = {
    "venues": "hospitality",
    "landscaping": "construction",
    "plumbing": "construction",
    "veterinary": "healthcare",
    "hotel": "hospitality",
    "law firm": "legal",
    "restaurant": "food_beverage",
    "restaurant/retail": "food_beverage",
    "retail/boutique": "retail",
    "retail/shopping": "retail",
    "salon": "personal_services",
    "fitness": "wellness",
    "digital marketing": "marketing",
    "seo & digital": "marketing",
    "telecommunications": "technology",
    "urgent care": "healthcare",
    "tutoring k-12": "education",
    "dealership service": "auto_dealer",
    "luxury athletic resort": "wellness",
    "automotive": "auto_dealer",
}

# Names that are clearly category headers, not real businesses
JUNK_BUSINESS_NAMES = {
    "accounting", "banking", "construction", "education", "fitness",
    "advertising", "automotive", "computer repair & it",
    "creative & publicity", "affordable gym", "healthcare",
    "marketing", "plumbing", "web",
}


def sanitize_master(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Post-load / post-merge sanitization pass on the master DataFrame.
    Fixes column misalignment, casing, out-of-bounds coords, and junk rows.
    Uses vectorized pandas operations for performance.
    Returns (cleaned_df, stats).
    """
    stats: Dict[str, int] = {
        "junk_removed": 0,
        "coords_cleared": 0,
        "category_fixed": 0,
        "source_normalized": 0,
        "phone_fixed": 0,
        "rating_value_fixed": 0,
        "review_count_fixed": 0,
        "website_fixed": 0,
        "cat2_person_cleared": 0,
        "price_tier_fixed": 0,
    }

    # 1. Remove junk rows (category headers masquerading as businesses)
    junk_mask = df["business_name"].str.lower().str.strip().isin(JUNK_BUSINESS_NAMES)
    stats["junk_removed"] = int(junk_mask.sum())
    df = df[~junk_mask].copy()

    # 2. Clear out-of-bounds coordinates (vectorized)
    lat_numeric = pd.to_numeric(df["lat"], errors="coerce")
    bad_coords = lat_numeric.notna() & ((lat_numeric < 24.0) | (lat_numeric > 27.0))
    # Also catch non-numeric lat strings that had content
    non_numeric_lat = lat_numeric.isna() & (df["lat"].fillna("").str.strip() != "")
    clear_mask = bad_coords | non_numeric_lat
    stats["coords_cleared"] = int(clear_mask.sum())
    df.loc[clear_mask, "lat"] = ""
    df.loc[clear_mask, "lon"] = ""

    # 3. Normalize category_primary (vectorized)
    cat_col = df["category_primary"].fillna("").str.strip()
    cat_lower = cat_col.str.lower()
    original_cat = cat_col.copy()

    # Apply CATEGORY_NORMALIZE mapping
    mapped = cat_lower.map(CATEGORY_NORMALIZE)
    has_mapping = mapped.notna()
    df.loc[has_mapping, "category_primary"] = mapped[has_mapping]

    # For unmapped: check if it's a valid category
    unmapped = ~has_mapping
    is_valid = cat_lower.isin(VALID_CATEGORIES)
    is_address = cat_col.str.contains(r"\d{5}", regex=True, na=False) | cat_col.str.contains("FL", na=False)

    # Unknown + looks like address → "other"
    fix_to_other = unmapped & ~is_valid & is_address
    df.loc[fix_to_other, "category_primary"] = "other"

    # Unknown + not address + wrong casing → lowercase
    fix_casing = unmapped & ~is_valid & ~is_address & (cat_col != cat_lower)
    df.loc[fix_casing, "category_primary"] = cat_lower[fix_casing]

    # Valid but wrong casing → lowercase
    valid_wrong_case = unmapped & is_valid & (cat_col != cat_lower)
    df.loc[valid_wrong_case, "category_primary"] = cat_lower[valid_wrong_case]

    stats["category_fixed"] = int((has_mapping | fix_to_other | fix_casing | valid_wrong_case).sum())

    # Fill empty categories
    empty_cat = df["category_primary"].fillna("") == ""
    df.loc[empty_cat, "category_primary"] = "other"

    # 4. Normalize source_file casing (vectorized)
    source_map = {"OSM": "osm", "TA": "ta", "CGCC": "cgcc"}
    sf_col = df["source_file"].fillna("")
    mapped_src = sf_col.map(source_map)
    src_direct = mapped_src.notna()
    df.loc[src_direct, "source_file"] = mapped_src[src_direct]

    # Fix concatenated sources (OSM+OSM → osm)
    has_plus = sf_col.str.contains("+", regex=False, na=False) & ~src_direct
    df.loc[has_plus, "source_file"] = sf_col[has_plus].str.split("+").str[0].str.lower()
    stats["source_normalized"] = int((src_direct | has_plus).sum())

    # 5. Fix phone values that are URLs or addresses (vectorized)
    ph_col = df["phone"].fillna("")
    has_dot = ph_col.str.contains(".", regex=False, na=False)
    first5 = ph_col.str[:5]
    no_digit_start = ~first5.str.contains(r"\d", regex=True, na=False)
    phone_is_url = (ph_col != "") & has_dot & no_digit_start
    # Move URL-phones to website where website is empty
    no_website = df["website"].fillna("") == ""
    df.loc[phone_is_url & no_website, "website"] = ph_col[phone_is_url & no_website]
    df.loc[phone_is_url, "phone"] = ""
    stats["phone_fixed"] = int(phone_is_url.sum())

    # 6. Clear non-numeric rating_primary_value (vectorized)
    rv_col = df["rating_primary_value"].fillna("")
    rv_has_content = rv_col.str.strip() != ""
    rv_numeric = pd.to_numeric(rv_col, errors="coerce")
    rv_bad = rv_has_content & rv_numeric.isna()
    stats["rating_value_fixed"] = int(rv_bad.sum())
    df.loc[rv_bad, "rating_primary_value"] = ""

    # 7. Clear non-numeric rating_primary_review_count (vectorized)
    rrc_col = df["rating_primary_review_count"].fillna("")
    rrc_has_content = rrc_col.str.strip() != ""
    rrc_numeric = pd.to_numeric(rrc_col, errors="coerce")
    rrc_bad = rrc_has_content & rrc_numeric.isna()
    stats["review_count_fixed"] = int(rrc_bad.sum())
    df.loc[rrc_bad, "rating_primary_review_count"] = ""

    # 8. Clear invalid website values (vectorized)
    ws_col = df["website"].fillna("")
    ws_bad = ws_col.isin({"Web", "No website"})
    stats["website_fixed"] = int(ws_bad.sum())
    df.loc[ws_bad, "website"] = ""

    # 9. Fix bare-domain websites (no protocol) — vectorized
    ws_col2 = df["website"].fillna("")
    ws_has_content = ws_col2.str.strip() != ""
    ws_no_proto = ~ws_col2.str.startswith(("http://", "https://"), na=False)
    ws_has_dot = ws_col2.str.contains(".", regex=False, na=False)
    bare_domain = ws_has_content & ws_no_proto & ws_has_dot
    df.loc[bare_domain, "website"] = "https://" + ws_col2[bare_domain]
    stats["website_fixed"] += int(bare_domain.sum())

    # 10. Clear person-name contamination from category_secondary (CGCC column misalignment)
    #     Known CGCC rep names that leaked into category field during initial import.
    KNOWN_PERSON_NAMES = {
        "Ekrem Ozer", "Ana Rodriguez", "Matthew  Shippey", "Matthew Shippey",
        "Helen Valdez Obando",
    }
    cat2_col = df["category_secondary"].fillna("")
    cat2_norm = cat2_col.str.replace(r"\s+", " ", regex=True).str.strip()
    is_person = cat2_norm.isin(KNOWN_PERSON_NAMES)
    stats["cat2_person_cleared"] = int(is_person.sum())
    df.loc[is_person, "category_secondary"] = ""

    # 11. Normalize price_tier — extract star ratings, clear junk
    pt_col = df["price_tier"].fillna("")
    # "4 stars" / "3 stars" → clear (rating already in rating_primary_value)
    pt_stars = pt_col.str.match(r"^\d+\s*stars?$", case=False, na=False)
    # "Unknown" → clear
    pt_unknown = pt_col.str.lower() == "unknown"
    pt_fix = pt_stars | pt_unknown
    stats["price_tier_fixed"] = int(pt_fix.sum())
    df.loc[pt_fix, "price_tier"] = ""

    return df, stats


# ── Dedup & Merge ─────────────────────────────────────────────────
def load_master(path: str) -> pd.DataFrame:
    """Load existing master CSV, or return empty DataFrame."""
    if os.path.exists(path):
        df = pd.read_csv(path, dtype=str).fillna("")
        return df
    return pd.DataFrame(columns=CANONICAL_FIELDS)


def load_staging(staging_dir: str) -> List[Dict[str, str]]:
    """Load all un-archived CSVs from the staging directory."""
    staging = Path(staging_dir)
    if not staging.exists():
        return []

    records = []
    for csv_file in sorted(staging.glob("*.csv")):
        if csv_file.name.startswith("archived_"):
            continue
        try:
            with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    row["_staging_file"] = csv_file.name
                    records.append(row)
        except Exception as e:
            print(f"  Warning: could not read {csv_file}: {e}")

    return records


def fuzzy_match(name: str, existing_names: List[str],
                threshold: int = NAME_FUZZY_STRONG) -> Optional[str]:
    """Find the best dedup match for `name` among `existing_names`.

    Uses noise-word-stripped comparison with a shared-significant-token
    requirement (via _shared.names_match) so that generic near-names like
    "Coral Gables Dental" and "Coral Gables Dermatology" are NOT merged and
    their websites/fields are not cross-contaminated. Returns the matched name
    or None.
    """
    if not existing_names:
        return None

    best_name = None
    best_score = 0
    for candidate in existing_names:
        if not names_match(name, candidate, threshold):
            continue
        score = fuzz.token_sort_ratio(strip_noise(name), strip_noise(candidate))
        if score > best_score:
            best_score = score
            best_name = candidate
    return best_name


def _fill_blanks(master_df: pd.DataFrame, idx: int, record: Dict[str, str], dry_run: bool):
    """Fill blank fields on an existing master row from a new record."""
    if dry_run:
        return
    for col in CANONICAL_FIELDS:
        if col not in master_df.columns:
            continue
        existing_val = str(master_df.loc[idx, col])
        new_val = record.get(col, "")
        if (not existing_val or existing_val == "nan") and new_val:
            master_df.loc[idx, col] = new_val


def merge_into_master(
    master_df: pd.DataFrame,
    new_records: List[Dict[str, str]],
    dry_run: bool = False,
) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Merge normalized+validated records into master.
    Returns (updated_df, stats).
    """
    stats = {"new": 0, "merged": 0, "skipped": 0, "out_of_bounds": 0}

    # Pre-compute key→row-index and name→row-index lookup dicts (O(n) once)
    key_to_idx: Dict[str, int] = {}
    name_to_idx: Dict[str, int] = {}
    existing_names: List[str] = []

    if not master_df.empty:
        for i, row in master_df.iterrows():
            name = str(row.get("business_name", ""))
            if not name or name == "nan":
                continue
            key = normalize_key(name)
            if key and key not in key_to_idx:
                key_to_idx[key] = i
            if name not in name_to_idx:
                name_to_idx[name] = i
            existing_names.append(name)

    rows_to_append = []

    for record in new_records:
        name = record.get("business_name", "")
        if not name:
            stats["skipped"] += 1
            continue

        key = normalize_key(name)
        if not key:
            stats["skipped"] += 1
            continue

        # Quick exact-key dedup via dict lookup (O(1))
        if key in key_to_idx:
            idx = key_to_idx[key]
            if idx >= 0:
                _fill_blanks(master_df, idx, record, dry_run)
            stats["merged"] += 1
            continue

        # Fuzzy dedup
        if existing_names:
            match = fuzzy_match(name, existing_names)
            if match and match in name_to_idx:
                idx = name_to_idx[match]
                if idx >= 0:
                    _fill_blanks(master_df, idx, record, dry_run)
                stats["merged"] += 1
                continue

        # Truly new record — update lookups for subsequent records
        key_to_idx[key] = -1  # placeholder; real index assigned after concat
        name_to_idx[name] = -1
        existing_names.append(name)
        rows_to_append.append(record)
        stats["new"] += 1

    if rows_to_append and not dry_run:
        new_df = pd.DataFrame(rows_to_append)
        for col in CANONICAL_FIELDS:
            if col not in new_df.columns:
                new_df[col] = ""
        master_df = pd.concat(
            [master_df, new_df[CANONICAL_FIELDS]], ignore_index=True
        )

    return master_df, stats


def archive_staging(staging_dir: str):
    """Move processed staging files to archived_* prefix."""
    staging = Path(staging_dir)
    archive_dir = staging / "archived"
    archive_dir.mkdir(exist_ok=True)

    for csv_file in staging.glob("*.csv"):
        if csv_file.name.startswith("archived_"):
            continue
        dest = archive_dir / f"{datetime.now().strftime('%Y%m%d')}_{csv_file.name}"
        shutil.move(str(csv_file), str(dest))
        print(f"  Archived: {csv_file.name} -> archived/{dest.name}")


# ── Enrichment ────────────────────────────────────────────────────
def geocode_address(address: str) -> Tuple[Optional[float], Optional[float]]:
    """Forward geocode an address via Nominatim (free, no key)."""
    import requests

    if not address:
        return None, None
    try:
        resp = requests.get(
            f"{NOMINATIM_URL}/search",
            params={"q": address, "format": "json", "limit": 1,
                    "countrycodes": "us", "viewbox": "-80.31,25.77,-80.23,25.69"},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        if resp.status_code == 200 and resp.json():
            result = resp.json()[0]
            return float(result["lat"]), float(result["lon"])
    except Exception:
        pass
    return None, None


def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocode lat/lon to an address via Nominatim (free, no key)."""
    import requests

    try:
        resp = requests.get(
            f"{NOMINATIM_URL}/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("display_name", "").split(", Miami-Dade")[0]
    except Exception:
        pass
    return ""


def enrich_master(master_path: str, dry_run: bool = False) -> None:
    """
    Enrichment pass on existing master CSV. Backfills:
      1. lat/lon for rows that have address but no coordinates
      2. address for rows that have lat/lon but no address
      3. postcode/neighborhood for rows that now have coordinates
      4. re-map "other" categories using business name keywords
    Respects Nominatim rate limit: 1 request/second.
    """
    import time as _time

    df = load_master(master_path)
    if df.empty:
        print("  No records to enrich.")
        return

    total = len(df)
    stats = {"geocoded": 0, "reverse_geocoded": 0, "zip_inferred": 0,
             "neighborhood_inferred": 0, "recategorized": 0, "skipped": 0}

    print(f"\n  Enrichment pass on {total} records...\n")

    # ── Pass 1: Forward geocode (address → lat/lon) ──────────────
    needs_geocode = df[
        (df["address"].fillna("") != "") &
        ((df["lat"].fillna("") == "") | (df["lon"].fillna("") == ""))
    ]
    print(f"  Pass 1: Forward geocode — {len(needs_geocode)} rows have address but no lat/lon")

    for idx in needs_geocode.index:
        address = str(df.loc[idx, "address"])
        # Append Coral Gables if not already present
        if "coral gables" not in address.lower():
            address = f"{address}, Coral Gables, FL"

        lat, lon = geocode_address(address)
        if lat is not None and lon is not None:
            if in_coral_gables(lat, lon):
                if not dry_run:
                    df.loc[idx, "lat"] = str(lat)
                    df.loc[idx, "lon"] = str(lon)
                stats["geocoded"] += 1
            else:
                stats["skipped"] += 1
        _time.sleep(1.1)  # Nominatim rate limit: 1 req/sec

        if stats["geocoded"] % 25 == 0 and stats["geocoded"] > 0:
            print(f"    ... geocoded {stats['geocoded']} so far")

    print(f"    Geocoded: {stats['geocoded']}")

    # ── Pass 2: Reverse geocode (lat/lon → address) ──────────────
    needs_reverse = df[
        ((df["lat"].fillna("") != "") & (df["lon"].fillna("") != "")) &
        (df["address"].fillna("") == "")
    ]
    print(f"\n  Pass 2: Reverse geocode — {len(needs_reverse)} rows have lat/lon but no address")

    for idx in needs_reverse.index:
        try:
            lat = float(df.loc[idx, "lat"])
            lon = float(df.loc[idx, "lon"])
        except (ValueError, TypeError):
            continue

        address = reverse_geocode(lat, lon)
        if address:
            if not dry_run:
                df.loc[idx, "address"] = address
            stats["reverse_geocoded"] += 1
        _time.sleep(1.1)

        if stats["reverse_geocoded"] % 25 == 0 and stats["reverse_geocoded"] > 0:
            print(f"    ... reverse geocoded {stats['reverse_geocoded']} so far")

    print(f"    Reverse geocoded: {stats['reverse_geocoded']}")

    # ── Pass 3: Infer postcode + neighborhood from coordinates ───
    needs_zip = df[
        ((df["lat"].fillna("") != "") & (df["lon"].fillna("") != "")) &
        (df["postcode"].fillna("") == "")
    ]
    print(f"\n  Pass 3: Zip/neighborhood inference — {len(needs_zip)} rows missing postcode")

    for idx in needs_zip.index:
        try:
            lat = float(df.loc[idx, "lat"])
            lon = float(df.loc[idx, "lon"])
        except (ValueError, TypeError):
            continue
        if not dry_run:
            df.loc[idx, "postcode"] = infer_zip(lat, lon)
            stats["zip_inferred"] += 1

    # Neighborhood for all rows with coords but no neighborhood
    needs_neighborhood = df[
        ((df["lat"].fillna("") != "") & (df["lon"].fillna("") != "")) &
        ((df["neighborhood_area"].fillna("") == "") |
         (df["neighborhood_area"].fillna("") == "Coral Gables"))
    ]
    for idx in needs_neighborhood.index:
        try:
            lat = float(df.loc[idx, "lat"])
            lon = float(df.loc[idx, "lon"])
        except (ValueError, TypeError):
            continue
        neighborhood = infer_neighborhood(lat, lon)
        if neighborhood and neighborhood != "Coral Gables":
            if not dry_run:
                df.loc[idx, "neighborhood_area"] = neighborhood
            stats["neighborhood_inferred"] += 1

    print(f"    Zip codes inferred: {stats['zip_inferred']}")
    print(f"    Neighborhoods inferred: {stats['neighborhood_inferred']}")

    # ── Pass 4: Re-categorize "other" using business name ────────
    is_other = df["category_primary"].fillna("other") == "other"
    other_rows = df[is_other]
    print(f"\n  Pass 4: Re-categorize — {len(other_rows)} rows currently 'other'")

    # Re-categorize via the shared word-boundary classifier (name + secondary),
    # so this pass agrees with map_category and the reclassifier.
    for idx in other_rows.index:
        name = str(df.loc[idx, "business_name"])
        secondary = str(df.loc[idx, "category_secondary"])
        combined = f"{name} {secondary}"

        category = classify_category(combined)
        if category:
            if not dry_run:
                df.loc[idx, "category_primary"] = category
            stats["recategorized"] += 1

    print(f"    Recategorized: {stats['recategorized']}")

    # ── Write ─────────────────────────────────────────────────────
    if not dry_run:
        df = df.sort_values("business_name", key=lambda x: x.str.lower())
        df.to_csv(master_path, index=False)
        print(f"\n  Master updated: {len(df)} records -> {master_path}")
    else:
        print(f"\n  DRY RUN: no changes written")

    print(f"\n  Enrichment summary:")
    print(f"    Forward geocoded:        {stats['geocoded']}")
    print(f"    Reverse geocoded:        {stats['reverse_geocoded']}")
    print(f"    Zip codes inferred:      {stats['zip_inferred']}")
    print(f"    Neighborhoods inferred:  {stats['neighborhood_inferred']}")
    print(f"    Categories re-mapped:    {stats['recategorized']}")


# ══════════════════════════════════════════════════════════════════
#  CROSS-SOURCE RECONCILIATION
# ══════════════════════════════════════════════════════════════════

def _infer_family(source_file: str) -> str:
    """Map a source_file value to an independent source family."""
    sf = str(source_file).lower().strip()
    for prefix, family in SOURCE_TO_FAMILY.items():
        if prefix in sf:
            return family
    return sf or "unknown"


def reconcile_sources(df: pd.DataFrame, dry_run: bool = False) -> pd.DataFrame:
    """
    Cross-source reconciliation: find hidden corroboration in master by matching
    businesses across source families using coordinates + fuzzy name.

    3-pass algorithm:
      A) Exact normalized key match across different families
      B) Coordinate proximity (100m) + fuzzy name (≥80) with noise-word filter
      C) Strong fuzzy name (≥88) without coords (catches CGCC records)

    TAGS records only — NEVER removes or filters. Adds:
      - corroboration_sources: comma-separated family list (e.g. "cgcc,google,osm")
      - corroboration_count: number of independent families (e.g. "3")
    """
    total = len(df)
    print(f"\n  Reconciling {total} records across source families...")

    # Add temporary family column
    df["_family"] = df["source_file"].fillna("").apply(_infer_family)

    # Build record list for matching
    records = []
    for idx, row in df.iterrows():
        name = str(row.get("business_name", "")).strip()
        key = normalize_key(name) if name else ""
        lat_str = str(row.get("lat", "")).strip()
        lon_str = str(row.get("lon", "")).strip()
        lat = float(lat_str) if lat_str else None
        lon = float(lon_str) if lon_str else None
        try:
            lat = float(lat_str) if lat_str else None
            lon = float(lon_str) if lon_str else None
        except ValueError:
            lat, lon = None, None
        records.append({
            "idx": idx, "name": name, "key": key,
            "lat": lat, "lon": lon, "family": row["_family"],
        })

    # Union-Find for grouping corroborated records
    groups: Dict[int, Set[int]] = {}  # group_id → set of idx
    record_to_group: Dict[int, int] = {}  # idx → group_id
    next_group_id = 0

    def merge_groups(idx_a: int, idx_b: int):
        nonlocal next_group_id
        ga = record_to_group.get(idx_a)
        gb = record_to_group.get(idx_b)
        if ga is not None and gb is not None:
            if ga == gb:
                return
            # Merge smaller into larger
            if len(groups[ga]) < len(groups[gb]):
                ga, gb = gb, ga
            for member in groups[gb]:
                record_to_group[member] = ga
            groups[ga] |= groups[gb]
            del groups[gb]
        elif ga is not None:
            groups[ga].add(idx_b)
            record_to_group[idx_b] = ga
        elif gb is not None:
            groups[gb].add(idx_a)
            record_to_group[idx_a] = gb
        else:
            gid = next_group_id
            next_group_id += 1
            groups[gid] = {idx_a, idx_b}
            record_to_group[idx_a] = gid
            record_to_group[idx_b] = gid

    # ── Pass A: Exact normalized key ────────────────────────────
    print("  Pass A: Exact normalized key matching...")
    key_to_records: Dict[str, List[Dict]] = defaultdict(list)
    for r in records:
        if r["key"]:
            key_to_records[r["key"]].append(r)

    pass_a_matches = 0
    for key, recs in key_to_records.items():
        if len(recs) < 2:
            continue
        families = set(r["family"] for r in recs)
        if len(families) < 2:
            continue
        for i in range(len(recs)):
            for j in range(i + 1, len(recs)):
                if recs[i]["family"] != recs[j]["family"]:
                    merge_groups(recs[i]["idx"], recs[j]["idx"])
                    pass_a_matches += 1

    print(f"    Pass A: {pass_a_matches} cross-family matches via exact key")

    # ── Pass B: Coord proximity + fuzzy name ────────────────────
    print("  Pass B: Coordinate proximity + fuzzy name matching...")
    records_with_coords = [r for r in records if r["lat"] is not None and r["lon"] is not None]

    # Spatial grid index (0.001° ≈ 111m)
    GRID_SIZE = 0.001
    grid: Dict[Tuple[int, int], List[Dict]] = defaultdict(list)
    for r in records_with_coords:
        gx = int(r["lat"] / GRID_SIZE)
        gy = int(r["lon"] / GRID_SIZE)
        grid[(gx, gy)].append(r)

    pass_b_matches = 0
    pass_b_checked = 0
    for (gx, gy), cell_records in grid.items():
        # Check this cell + 8 neighbors
        neighborhood = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                neighborhood.extend(grid.get((gx + dx, gy + dy), []))

        for i, r1 in enumerate(cell_records):
            for r2 in neighborhood:
                if r2["idx"] <= r1["idx"]:
                    continue
                if r1["family"] == r2["family"]:
                    continue
                if (record_to_group.get(r1["idx"]) is not None
                        and record_to_group.get(r1["idx"]) == record_to_group.get(r2["idx"])):
                    continue

                dist = haversine(r1["lat"], r1["lon"], r2["lat"], r2["lon"])
                pass_b_checked += 1
                if dist > COORD_PROXIMITY_M:
                    continue
                if not names_match(r1["name"], r2["name"], NAME_FUZZY_THRESHOLD):
                    continue

                merge_groups(r1["idx"], r2["idx"])
                pass_b_matches += 1

    print(f"    Pass B: {pass_b_matches} cross-family matches ({pass_b_checked} pairs checked)")

    # ── Pass C: Strong fuzzy name (no coords needed) ────────────
    # Catches CGCC records that have no lat/lon
    print("  Pass C: Strong fuzzy name matching (no coords needed)...")
    no_coord_records = [r for r in records if r["lat"] is None or r["lon"] is None]

    # Block by first 4 chars of normalized key
    nc_blocks: Dict[str, List[Dict]] = defaultdict(list)
    for r in no_coord_records:
        if r["key"] and len(r["key"]) >= 4:
            nc_blocks[r["key"][:4]].append(r)

    hc_blocks: Dict[str, List[Dict]] = defaultdict(list)
    for r in records_with_coords:
        if r["key"] and len(r["key"]) >= 4:
            hc_blocks[r["key"][:4]].append(r)

    pass_c_matches = 0
    for prefix in nc_blocks:
        if prefix not in hc_blocks:
            continue
        for r_nc in nc_blocks[prefix]:
            for r_hc in hc_blocks[prefix]:
                if r_nc["family"] == r_hc["family"]:
                    continue
                if (record_to_group.get(r_nc["idx"]) is not None
                        and record_to_group.get(r_nc["idx"]) == record_to_group.get(r_hc["idx"])):
                    continue
                if not names_match(r_nc["name"], r_hc["name"], NAME_FUZZY_STRONG):
                    continue
                merge_groups(r_nc["idx"], r_hc["idx"])
                pass_c_matches += 1

    print(f"    Pass C: {pass_c_matches} cross-family matches via strong name similarity")

    # ── Compute corroboration columns ───────────────────────────
    print("\n  Computing corroboration scores...")
    idx_to_record = {r["idx"]: r for r in records}

    corr_sources_col = [""] * total
    corr_count_col = ["0"] * total

    # Use positional indexing since idx values are from df.iterrows()
    pos_map = {idx: pos for pos, idx in enumerate(df.index)}

    for gid, members in groups.items():
        families_in_group = set()
        for idx in members:
            families_in_group.add(idx_to_record[idx]["family"])
        corr_str = ",".join(sorted(families_in_group))
        count_str = str(len(families_in_group))
        for idx in members:
            corr_sources_col[pos_map[idx]] = corr_str
            corr_count_col[pos_map[idx]] = count_str

    for r in records:
        if r["idx"] not in record_to_group:
            corr_sources_col[pos_map[r["idx"]]] = r["family"]
            corr_count_col[pos_map[r["idx"]]] = "1"

    df["corroboration_sources"] = corr_sources_col
    df["corroboration_count"] = corr_count_col

    # ── Report ──────────────────────────────────────────────────
    count_dist = Counter(corr_count_col)
    print(f"\n  Corroboration Distribution:")
    for n in sorted(count_dist.keys()):
        print(f"    {n} source(s): {count_dist[n]:>5} records")

    multi_groups = {gid: members for gid, members in groups.items()
                    if len(set(idx_to_record[idx]["family"] for idx in members)) >= 2}
    print(f"\n  Multi-source groups: {len(multi_groups)}")

    shown = 0
    for gid, members in sorted(multi_groups.items(), key=lambda x: -len(x[1]))[:15]:
        families = set()
        names = []
        for idx in members:
            r = idx_to_record[idx]
            families.add(r["family"])
            names.append(f'{r["name"]} [{r["family"]}]')
        if shown < 15:
            print(f"\n    Group {gid} ({len(families)} families, {len(members)} records):")
            for n in names[:4]:
                print(f"      {n}")
            if len(names) > 4:
                print(f"      ... and {len(names) - 4} more")
            shown += 1

    # Cleanup temp column
    df.drop(columns=["_family"], inplace=True)
    return df


# ══════════════════════════════════════════════════════════════════
#  SUNBIZ LEGAL EXISTENCE LOOKUP
# ══════════════════════════════════════════════════════════════════

def search_sunbiz(business_name: str) -> Dict[str, str]:
    """
    Search Florida Sunbiz (Division of Corporations) for a business name.
    Returns dict with keys: status, sunbiz_name, sunbiz_filing_number, sunbiz_match_score.

    Uses a session-based approach:
      1. GET the form page to establish cookies
      2. POST the search form to get results
      3. Parse the results table

    Rate-limited to 1 req/2 sec.
    """
    import requests

    result = {"status": "Not Found", "sunbiz_name": "", "sunbiz_filing_number": "", "sunbiz_match_score": ""}

    # Clean name for search: remove suffixes, punctuation
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
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })

        # Step 1: GET form page (establishes cookies / Cloudflare token)
        session.get("https://search.sunbiz.org/Inquiry/CorporationSearch/ByName", timeout=15)

        # Step 2: POST form to trigger search
        data = {
            "SearchTerm": query,
            "InquiryType": "EntityName",
            "SearchNameOrder": query,
        }
        resp = session.post(
            "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
            data=data, timeout=15, allow_redirects=True,
        )

        if resp.status_code != 200 or "error occurred" in resp.text.lower():
            result["status"] = f"HTTP {resp.status_code}" if resp.status_code != 200 else "Search Error"
            return result

        html = resp.text

        # Step 3: Parse the results table
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

        for match_name, filing_num, status_raw in matches:
            match_name_clean = match_name.strip()
            status_clean = SUNBIZ_STATUS_MAP.get(status_raw.strip().upper(), status_raw.strip())

            score = fuzz.token_sort_ratio(business_name.lower(), match_name_clean.lower())
            effective_score = score + (2 if "Active" in status_clean else 0)

            if effective_score > best_score:
                best_score = effective_score
                best_match = (match_name_clean, filing_num.strip(), status_clean, score)

        if best_match and best_match[3] >= 50:
            result["status"] = best_match[2]
            result["sunbiz_name"] = best_match[0]
            result["sunbiz_filing_number"] = best_match[1]
            result["sunbiz_match_score"] = str(best_match[3])
        else:
            result["status"] = "Not Found"

    except Exception as e:
        result["status"] = f"Error: {str(e)[:50]}"

    return result


def sunbiz_lookup(df: pd.DataFrame, limit: int = 50, dry_run: bool = False) -> pd.DataFrame:
    """
    Look up businesses on Florida Sunbiz to verify legal existence.
    Adds/updates: sunbiz_status, sunbiz_name, sunbiz_filing_number columns.

    Priority: checks businesses with lowest corroboration first.
    Does NOT remove any records.
    """
    print(f"\n  Sunbiz Lookup — checking up to {limit} businesses...\n")

    # Initialize columns if needed
    for col in ("sunbiz_status", "sunbiz_name", "sunbiz_filing_number"):
        if col not in df.columns:
            df[col] = ""

    # Prioritize: single-source records first
    if "corroboration_count" in df.columns:
        priority = df.sort_values("corroboration_count", ascending=True)
    else:
        priority = df.copy()

    # Skip already-checked
    unchecked = priority[priority["sunbiz_status"].fillna("") == ""]
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

        if i % 10 == 0 or i == len(to_check):
            print(f"    [{i}/{len(to_check)}] {name[:40]} -> {status}")

        time.sleep(2.0)  # Rate limit

    print(f"\n  Sunbiz Results:")
    for status, count in stats.most_common():
        print(f"    {status:<25} {count:>5}")

    return df


# ══════════════════════════════════════════════════════════════════
#  RED FLAG POPULATION (BUG FIX)
# ══════════════════════════════════════════════════════════════════

def populate_red_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive red_flag_present and red_flag_severity from validation data.
    Previously these columns were always empty (bug).

    Logic:
      - red_flag_present = "Y" if any issues exist, "N" if clean
      - red_flag_severity:
          "Critical"    — geo-bounds fail, confidence < 0.30
          "Operational" — minor issues (missing contact, name quirks, etc.)
    """
    notes_col = df["red_flag_notes"].fillna("").str.strip()
    tier_col = df["validation_tier"].fillna("").str.strip()
    conf_col = pd.to_numeric(df["osint_confidence"].fillna(""), errors="coerce")

    has_notes = notes_col != ""
    is_low = tier_col == "Low"

    # Determine presence
    df["red_flag_present"] = "N"
    df.loc[has_notes | is_low, "red_flag_present"] = "Y"

    # Determine severity
    critical_keywords = ["outside coral gables", "invalid coordinates", "missing business_name"]
    is_critical = notes_col.str.lower().str.contains("|".join(critical_keywords), regex=True, na=False)
    very_low_conf = conf_col.notna() & (conf_col < 0.30)

    df["red_flag_severity"] = ""
    df.loc[has_notes & ~is_critical & ~very_low_conf, "red_flag_severity"] = "Operational"
    df.loc[is_critical | very_low_conf | is_low, "red_flag_severity"] = "Critical"

    flagged = (df["red_flag_present"] == "Y").sum()
    critical = (df["red_flag_severity"] == "Critical").sum()
    operational = (df["red_flag_severity"] == "Operational").sum()
    print(f"\n  Red flags populated:")
    print(f"    Flagged (Y): {flagged}  (Critical: {critical}, Operational: {operational})")
    print(f"    Clean (N):   {(df['red_flag_present'] == 'N').sum()}")

    return df


# ── CLI ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agent 2 — Validator & Merger",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "2. agent2-validator.py" --master data/master_all_businesses.csv
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --dry-run
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --staging staging/
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --enrich
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --enrich --dry-run
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --reconcile
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --reconcile --sunbiz --sunbiz-limit 100
        """,
    )
    parser.add_argument(
        "--master",
        required=True,
        help="Path to master CSV (will be updated in place)",
    )
    parser.add_argument(
        "--staging",
        default="staging",
        help="Directory containing Agent 1 staging CSVs (default: staging/)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report without modifying master CSV",
    )
    parser.add_argument(
        "--fuzzy-threshold",
        type=int,
        default=85,
        help="Fuzzy match threshold (default: 85)",
    )
    parser.add_argument(
        "--enrich",
        action="store_true",
        help="Enrichment mode: backfill geocoding, addresses, categories on existing master",
    )
    parser.add_argument(
        "--reconcile",
        action="store_true",
        help="Run cross-source reconciliation to tag corroboration across source families",
    )
    parser.add_argument(
        "--sunbiz",
        action="store_true",
        help="Run Sunbiz legal existence lookup (requires --reconcile or standalone)",
    )
    parser.add_argument(
        "--sunbiz-limit",
        type=int,
        default=50,
        help="Max businesses to check on Sunbiz (default: 50)",
    )
    args = parser.parse_args()

    # ── Enrichment mode ──────────────────────────────────────────
    if args.enrich:
        print(f"\n{'='*60}")
        print(f"  AGENT 2 — ENRICHMENT MODE")
        print(f"  Master: {args.master}")
        print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"{'='*60}")

        # Sanitize before enrichment
        if not args.dry_run:
            df_pre = load_master(args.master)
            df_pre, san_stats = sanitize_master(df_pre)
            san_total = sum(san_stats.values())
            if san_total > 0:
                df_pre.to_csv(args.master, index=False)
                print(f"\n  Pre-enrichment sanitization ({san_total} fixes applied)")

        enrich_master(args.master, args.dry_run)
        print(f"\n  Done.\n")
        return

    # ── Check if staging has CSV files ───────────────────────────
    staging_dir = args.staging
    has_staging_csvs = False
    if os.path.isdir(staging_dir):
        has_staging_csvs = any(
            f.endswith(".csv") for f in os.listdir(staging_dir)
            if os.path.isfile(os.path.join(staging_dir, f))
        )

    # ── Reconcile-only mode (no staging to merge) ────────────────
    if (args.reconcile or args.sunbiz) and not has_staging_csvs:
        print(f"\n{'='*60}")
        print(f"  AGENT 2 — RECONCILIATION MODE")
        print(f"  Master: {args.master}")
        print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
        print(f"{'='*60}")

        master_df = load_master(args.master)
        print(f"  Master: {len(master_df)} existing records")

        master_df = reconcile_sources(master_df, args.dry_run)

        if args.sunbiz:
            master_df = sunbiz_lookup(master_df, limit=args.sunbiz_limit, dry_run=args.dry_run)

        # Always populate red flags
        master_df = populate_red_flags(master_df)

        if not args.dry_run:
            master_df = master_df.sort_values("business_name", key=lambda x: x.str.lower())
            master_df.to_csv(args.master, index=False)
            print(f"\n  Master updated: {len(master_df)} total records -> {args.master}")
        else:
            print(f"\n  DRY RUN — no changes written")

        print(f"\n  Done.\n")
        return

    # ── Normal staging merge mode ────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  AGENT 2 — VALIDATOR & MERGER")
    print(f"  Master: {args.master}")
    print(f"  Staging: {args.staging}")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"{'='*60}\n")

    # 1. Load master
    master_df = load_master(args.master)
    print(f"  Master: {len(master_df)} existing records")

    # 1b. Sanitize master on load (fix column misalignment, casing, etc.)
    master_df, sanitize_stats = sanitize_master(master_df)
    sanitize_total = sum(sanitize_stats.values())
    if sanitize_total > 0:
        print(f"  Sanitized master ({sanitize_total} fixes):")
        for k, v in sanitize_stats.items():
            if v > 0:
                print(f"    {k}: {v}")
        print(f"  Master after sanitization: {len(master_df)} records")

    # 2. Load staging
    raw_records = load_staging(args.staging)
    print(f"  Staging: {len(raw_records)} raw records to process")

    if not raw_records:
        print("\n  No staging records found. Nothing to do.")
        return

    # 3. Normalize + validate
    normalized = []
    validation_summary = {"High": 0, "Moderate": 0, "Low": 0}
    all_issues = []

    for raw in raw_records:
        record = normalize_record(raw, raw.get("_staging_file", ""))
        if not record:
            continue

        tier, confidence, issues = validate_record(record)
        record["validation_tier"] = tier
        record["osint_confidence"] = str(confidence)
        if issues:
            record["red_flag_notes"] = "; ".join(issues)

        validation_summary[tier] += 1
        all_issues.extend(issues)
        normalized.append(record)

    print(f"\n  Normalized: {len(normalized)} records")
    print(f"  Validation: High={validation_summary['High']}, "
          f"Moderate={validation_summary['Moderate']}, "
          f"Low={validation_summary['Low']}")

    if all_issues:
        issue_counts = Counter(all_issues).most_common(10)
        print(f"\n  Top issues:")
        for issue, count in issue_counts:
            print(f"    {count:>4}x  {issue}")

    # 4. Merge
    master_df, merge_stats = merge_into_master(master_df, normalized, args.dry_run)
    print(f"\n  Merge results:")
    print(f"    New:     {merge_stats['new']}")
    print(f"    Merged:  {merge_stats['merged']}")
    print(f"    Skipped: {merge_stats['skipped']}")

    # 5. Post-merge sanitization
    master_df, post_sanitize = sanitize_master(master_df)
    post_total = sum(post_sanitize.values())
    if post_total > 0:
        print(f"\n  Post-merge sanitization ({post_total} fixes):")
        for k, v in post_sanitize.items():
            if v > 0:
                print(f"    {k}: {v}")

    # 6. Cross-source reconciliation (always runs post-merge)
    master_df = reconcile_sources(master_df, args.dry_run)

    # 7. Sunbiz lookup (optional)
    if args.sunbiz:
        master_df = sunbiz_lookup(master_df, limit=args.sunbiz_limit, dry_run=args.dry_run)

    # 8. Populate red flags (bug fix: was always empty before)
    master_df = populate_red_flags(master_df)

    # 9. Write
    if not args.dry_run:
        master_df = master_df.sort_values("business_name", key=lambda x: x.str.lower())
        master_df.to_csv(args.master, index=False)
        print(f"\n  Master updated: {len(master_df)} total records -> {args.master}")

        # Archive staging
        archive_staging(args.staging)
    else:
        print(f"\n  DRY RUN: master would have {len(master_df)} records (not written)")

    # Category breakdown
    if not master_df.empty and "category_primary" in master_df.columns:
        cats = master_df["category_primary"].fillna("other").value_counts().head(15)
        print(f"\n  Category breakdown (top 15):")
        for cat, count in cats.items():
            print(f"    {count:>5}  {cat}")

    print(f"\n  Done. Next: run Agent 3 to export for dashboard.\n")


if __name__ == "__main__":
    main()
