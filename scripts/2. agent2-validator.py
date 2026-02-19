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
  7. Write updated master CSV
  8. Archive processed staging files

Usage:
  python "2. agent2-validator.py" --master data/master_all_businesses.csv
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --staging staging/
  python "2. agent2-validator.py" --master data/master_all_businesses.csv --dry-run

Requirements:
  pip install pandas fuzzywuzzy python-Levenshtein
"""

import argparse
import csv
import os
import re
import shutil
from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

# ── Canonical schema ──────────────────────────────────────────────
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

# Coral Gables geographic bounds
CG_BOUNDS = {
    "lat_min": 25.693,
    "lat_max": 25.770,
    "lon_min": -80.310,
    "lon_max": -80.225,
}

CG_ZIPS = {"33134", "33146", "33133", "33143"}

ZIP_CENTROIDS = {
    "33134": (25.7497, -80.2589),
    "33146": (25.7210, -80.2750),
    "33133": (25.7570, -80.2410),
    "33143": (25.7050, -80.2900),
}


# ── Utilities ─────────────────────────────────────────────────────
def normalize_key(name: str) -> str:
    """Lowercase, strip non-alphanumeric, remove common suffixes."""
    if not name:
        return ""
    k = re.sub(r"[^a-z0-9]", "", name.lower().strip())
    for sfx in ("llc", "inc", "llp", "pa", "pllc", "corp", "ltd"):
        k = k.replace(sfx, "")
    return k.strip()


def normalize_phone(phone: str) -> str:
    """Normalize phone to (XXX) XXX-XXXX format. Rejects non-phone values."""
    if not phone or not isinstance(phone, str):
        return ""
    # Reject if it looks like a URL, business name, or address (no digits in first 5 chars)
    stripped = phone.strip()
    if "." in stripped and not any(c.isdigit() for c in stripped[:5]):
        return ""  # It's a URL or name, not a phone
    if re.search(r"\d{5}", stripped) and ("FL" in stripped or "Coral" in stripped):
        return ""  # It's an address, not a phone
    digits = re.sub(r"[^\d]", "", stripped)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == "1":
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return stripped


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two lat/lon points."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def in_coral_gables(lat: Optional[float], lon: Optional[float]) -> bool:
    """Check if coordinates fall within Coral Gables bounds."""
    if lat is None or lon is None:
        return True  # can't disqualify without coords
    return (
        CG_BOUNDS["lat_min"] <= lat <= CG_BOUNDS["lat_max"]
        and CG_BOUNDS["lon_min"] <= lon <= CG_BOUNDS["lon_max"]
    )


def infer_zip(lat: Optional[float], lon: Optional[float]) -> str:
    """Infer zip code from coordinates using nearest centroid."""
    if lat is None or lon is None:
        return ""
    return min(ZIP_CENTROIDS, key=lambda z: haversine(lat, lon, *ZIP_CENTROIDS[z]))


def infer_neighborhood(lat: Optional[float], lon: Optional[float]) -> str:
    """Infer neighborhood from coordinates."""
    if lat is None or lon is None:
        return ""
    if 25.748 < lat < 25.751 and -80.264 < lon < -80.256:
        return "Miracle Mile"
    if -80.260 < lon < -80.255 and 25.740 < lat < 25.760:
        return "Ponce de Leon Corridor"
    if 25.750 < lat < 25.758 and -80.268 < lon < -80.258:
        return "Alhambra Circle"
    if 25.728 < lat < 25.734 and -80.268 < lon < -80.262:
        return "Merrick Park"
    if 25.714 < lat < 25.726 and -80.285 < lon < -80.270:
        return "University of Miami"
    if -80.245 < lon < -80.235:
        return "Douglas Road Corridor"
    if lat < 25.710:
        return "Sunset / South Gables"
    if 25.730 < lat < 25.740:
        return "Bird Road Corridor"
    return "Coral Gables"


# ── Category mapping ──────────────────────────────────────────────
CATEGORY_RULES = [
    ("restaurant", "food_beverage"),
    ("fast_food", "food_beverage"),
    ("cafe", "food_beverage"),
    ("bar", "food_beverage"),
    ("pub", "food_beverage"),
    ("bakery", "food_beverage"),
    ("ice_cream", "food_beverage"),
    ("food_court", "food_beverage"),
    ("supermarket", "food_beverage"),
    ("convenience", "food_beverage"),
    ("deli", "food_beverage"),
    ("wine", "food_beverage"),
    ("coffee", "food_beverage"),
    ("lawyer", "legal"),
    ("attorney", "legal"),
    ("law", "legal"),
    ("notary", "legal"),
    ("accountant", "accounting"),
    ("cpa", "accounting"),
    ("tax", "accounting"),
    ("bank", "banking"),
    ("credit_union", "banking"),
    ("financial", "financial_services"),
    ("wealth", "financial_services"),
    ("insurance", "insurance"),
    ("real_estate", "real_estate"),
    ("estate_agent", "real_estate"),
    ("doctor", "healthcare"),
    ("dentist", "healthcare"),
    ("pharmacy", "healthcare"),
    ("clinic", "healthcare"),
    ("hospital", "healthcare"),
    ("veterinary", "healthcare"),
    ("optician", "healthcare"),
    ("chiropract", "healthcare"),
    ("hotel", "hospitality"),
    ("motel", "hospitality"),
    ("guest_house", "hospitality"),
    ("hostel", "hospitality"),
    ("travel", "hospitality"),
    ("school", "education"),
    ("university", "education"),
    ("college", "education"),
    ("kindergarten", "education"),
    ("tutor", "education"),
    ("place_of_worship", "nonprofit"),
    ("community_centre", "nonprofit"),
    ("church", "nonprofit"),
    ("nonprofit", "nonprofit"),
    ("foundation", "nonprofit"),
    ("clothes", "retail"),
    ("shoes", "retail"),
    ("jewelry", "retail"),
    ("boutique", "retail"),
    ("electronics", "retail"),
    ("furniture", "retail"),
    ("department_store", "retail"),
    ("salon", "personal_services"),
    ("hairdresser", "personal_services"),
    ("beauty", "personal_services"),
    ("cosmetics", "personal_services"),
    ("nail", "personal_services"),
    ("barber", "personal_services"),
    ("spa", "wellness"),
    ("fitness", "wellness"),
    ("gym", "wellness"),
    ("yoga", "wellness"),
    ("swimming", "wellness"),
    ("sports_centre", "wellness"),
    ("architect", "professional_services"),
    ("engineer", "professional_services"),
    ("consulting", "consulting"),
    ("consultant", "consulting"),
    ("coach", "consulting"),
    ("marketing", "marketing"),
    ("advertis", "marketing"),
    ("construct", "construction"),
    ("contractor", "construction"),
    ("plumb", "construction"),
    ("electric", "construction"),
    ("car", "auto_dealer"),
    ("auto", "auto_dealer"),
    ("theatre", "arts_culture"),
    ("cinema", "arts_culture"),
    ("museum", "arts_culture"),
    ("gallery", "arts_culture"),
    ("nightclub", "arts_culture"),
    ("technology", "technology"),
    ("computer", "technology"),
    ("it_service", "technology"),
]


def map_category(raw_category: str) -> Tuple[str, str]:
    """Map a raw category string to (primary, secondary)."""
    if not raw_category:
        return ("other", "")

    lower = raw_category.lower()
    for keyword, primary in CATEGORY_RULES:
        if keyword in lower:
            return (primary, raw_category.strip())

    return ("other", raw_category.strip())


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
    }

    # 1. Remove junk rows (category headers masquerading as businesses)
    junk_mask = df["business_name"].str.lower().str.strip().isin(JUNK_BUSINESS_NAMES)
    stats["junk_removed"] = int(junk_mask.sum())
    df = df[~junk_mask].copy()

    # 2. Clear out-of-bounds coordinates (must be near Coral Gables: lat ~25.7)
    for idx, row in df.iterrows():
        lat_str = str(row.get("lat", ""))
        if lat_str:
            try:
                lat = float(lat_str)
                if lat < 24.0 or lat > 27.0:
                    df.loc[idx, "lat"] = ""
                    df.loc[idx, "lon"] = ""
                    stats["coords_cleared"] += 1
            except (ValueError, TypeError):
                df.loc[idx, "lat"] = ""
                df.loc[idx, "lon"] = ""
                stats["coords_cleared"] += 1

    # 3. Normalize category_primary to canonical lowercase values
    for idx, row in df.iterrows():
        cat = str(row.get("category_primary", "")).strip()
        cat_lower = cat.lower()
        if cat_lower in CATEGORY_NORMALIZE:
            df.loc[idx, "category_primary"] = CATEGORY_NORMALIZE[cat_lower]
            stats["category_fixed"] += 1
        elif cat_lower not in VALID_CATEGORIES:
            # Unknown category — check if it contains an address
            if re.search(r"\d{5}", cat) or "FL" in cat:
                df.loc[idx, "category_primary"] = "other"
                stats["category_fixed"] += 1
            elif cat != cat_lower:
                # Fix casing only
                df.loc[idx, "category_primary"] = cat_lower
                stats["category_fixed"] += 1
        elif cat != cat_lower:
            df.loc[idx, "category_primary"] = cat_lower
            stats["category_fixed"] += 1

    # Fill empty categories
    empty_cat = df["category_primary"].fillna("") == ""
    df.loc[empty_cat, "category_primary"] = "other"

    # 4. Normalize source_file casing
    source_map = {"OSM": "osm", "TA": "ta", "CGCC": "cgcc"}
    for idx, row in df.iterrows():
        sf = str(row.get("source_file", ""))
        if sf in source_map:
            df.loc[idx, "source_file"] = source_map[sf]
            stats["source_normalized"] += 1
        # Fix concatenated sources (OSM+OSM → osm)
        if "+" in sf:
            df.loc[idx, "source_file"] = sf.split("+")[0].lower()
            stats["source_normalized"] += 1

    # 5. Fix phone values that are URLs or addresses
    for idx, row in df.iterrows():
        ph = str(row.get("phone", ""))
        if ph and "." in ph and not any(c.isdigit() for c in ph[:5]):
            if not row.get("website"):
                df.loc[idx, "website"] = ph
            df.loc[idx, "phone"] = ""
            stats["phone_fixed"] += 1

    # 6. Clear non-numeric rating_primary_value
    for idx, row in df.iterrows():
        rv = str(row.get("rating_primary_value", ""))
        if rv:
            try:
                float(rv)
            except ValueError:
                df.loc[idx, "rating_primary_value"] = ""
                stats["rating_value_fixed"] += 1

    # 7. Clear non-numeric rating_primary_review_count
    for idx, row in df.iterrows():
        rrc = str(row.get("rating_primary_review_count", ""))
        if rrc and not rrc.replace(".", "").replace("-", "").isdigit():
            df.loc[idx, "rating_primary_review_count"] = ""
            stats["review_count_fixed"] += 1

    # 8. Clear invalid website values
    for idx, row in df.iterrows():
        ws = str(row.get("website", ""))
        if ws in ("Web", "No website", ""):
            if ws:
                df.loc[idx, "website"] = ""
                stats["website_fixed"] += 1

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


def fuzzy_match(name: str, existing_names: List[str], threshold: int = 85) -> Optional[str]:
    """Find best fuzzy match above threshold. Returns matched name or None."""
    from fuzzywuzzy import fuzz

    best_match = None
    best_score = 0
    name_lower = name.lower()

    for en in existing_names:
        score = fuzz.ratio(name_lower, en.lower())
        if score > best_score:
            best_score = score
            best_match = en

    if best_score >= threshold:
        return best_match
    return None


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

    if master_df.empty:
        existing_names = []
        existing_keys: Set[str] = set()
    else:
        existing_names = master_df["business_name"].dropna().tolist()
        existing_keys = {normalize_key(n) for n in existing_names}

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

        # Quick exact-key dedup
        if key in existing_keys:
            # Merge: fill blanks on existing record
            if not master_df.empty:
                idx = master_df[
                    master_df["business_name"].apply(normalize_key) == key
                ].index
                if len(idx) > 0:
                    i = idx[0]
                    for col in CANONICAL_FIELDS:
                        existing_val = str(master_df.loc[i, col]) if col in master_df.columns else ""
                        new_val = record.get(col, "")
                        if (not existing_val or existing_val == "nan") and new_val:
                            if not dry_run:
                                master_df.loc[i, col] = new_val
                    stats["merged"] += 1
                    continue

        # Fuzzy dedup
        if existing_names:
            match = fuzzy_match(name, existing_names)
            if match:
                idx = master_df[master_df["business_name"] == match].index
                if len(idx) > 0:
                    i = idx[0]
                    for col in CANONICAL_FIELDS:
                        existing_val = str(master_df.loc[i, col]) if col in master_df.columns else ""
                        new_val = record.get(col, "")
                        if (not existing_val or existing_val == "nan") and new_val:
                            if not dry_run:
                                master_df.loc[i, col] = new_val
                    stats["merged"] += 1
                    continue

        # Truly new record
        existing_keys.add(key)
        existing_names.append(name)
        rows_to_append.append(record)
        stats["new"] += 1

    if rows_to_append and not dry_run:
        new_df = pd.DataFrame(rows_to_append)
        # Ensure all canonical columns exist
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
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_HEADERS = {"User-Agent": "CoralGablesOSINT/1.0 (business-data-enrichment)"}


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

    # Build extended keyword rules from business name
    NAME_CATEGORY_HINTS = [
        ("restaurant", "food_beverage"), ("grill", "food_beverage"),
        ("pizza", "food_beverage"), ("sushi", "food_beverage"),
        ("cafe", "food_beverage"), ("coffee", "food_beverage"),
        ("bakery", "food_beverage"), ("bar ", "food_beverage"),
        ("brewery", "food_beverage"), ("taco", "food_beverage"),
        ("burger", "food_beverage"), ("deli", "food_beverage"),
        ("ice cream", "food_beverage"), ("steakhouse", "food_beverage"),
        ("bistro", "food_beverage"), ("trattoria", "food_beverage"),
        ("law", "legal"), ("attorney", "legal"), ("legal", "legal"),
        ("esq", "legal"), ("notary", "legal"),
        ("accounting", "accounting"), ("cpa", "accounting"), ("tax", "accounting"),
        ("bank", "banking"), ("credit union", "banking"),
        ("financial", "financial_services"), ("wealth", "financial_services"),
        ("invest", "financial_services"), ("capital", "financial_services"),
        ("insurance", "insurance"), ("allstate", "insurance"),
        ("state farm", "insurance"), ("geico", "insurance"),
        ("real estate", "real_estate"), ("realty", "real_estate"),
        ("properties", "real_estate"), ("mortgage", "real_estate"),
        ("doctor", "healthcare"), ("medical", "healthcare"),
        ("dental", "healthcare"), ("dentist", "healthcare"),
        ("clinic", "healthcare"), ("hospital", "healthcare"),
        ("pharmacy", "healthcare"), ("orthodont", "healthcare"),
        ("dermatolog", "healthcare"), ("pediatr", "healthcare"),
        ("chiropract", "healthcare"), ("optom", "healthcare"),
        ("physical therapy", "healthcare"), ("urgent care", "healthcare"),
        ("hotel", "hospitality"), ("inn ", "hospitality"),
        ("resort", "hospitality"), ("travel", "hospitality"),
        ("school", "education"), ("academy", "education"),
        ("university", "education"), ("college", "education"),
        ("tutor", "education"), ("learning", "education"),
        ("montessori", "education"), ("preschool", "education"),
        ("church", "nonprofit"), ("temple", "nonprofit"),
        ("synagogue", "nonprofit"), ("mosque", "nonprofit"),
        ("foundation", "nonprofit"), ("charity", "nonprofit"),
        ("salon", "personal_services"), ("barber", "personal_services"),
        ("hair", "personal_services"), ("nail", "personal_services"),
        ("beauty", "personal_services"), ("spa", "wellness"),
        ("fitness", "wellness"), ("gym", "wellness"),
        ("yoga", "wellness"), ("pilates", "wellness"),
        ("crossfit", "wellness"), ("martial art", "wellness"),
        ("architect", "professional_services"),
        ("engineer", "professional_services"),
        ("consult", "consulting"), ("advisory", "consulting"),
        ("marketing", "marketing"), ("advertis", "marketing"),
        ("design", "marketing"), ("media", "marketing"),
        ("construction", "construction"), ("contractor", "construction"),
        ("plumb", "construction"), ("electric", "construction"),
        ("roofing", "construction"), ("painting", "construction"),
        ("auto", "auto_dealer"), ("car wash", "auto_dealer"),
        ("tire", "auto_dealer"), ("mechanic", "auto_dealer"),
        ("gallery", "arts_culture"), ("museum", "arts_culture"),
        ("theatre", "arts_culture"), ("theater", "arts_culture"),
        ("tech", "technology"), ("software", "technology"),
        ("IT ", "technology"), ("computer", "technology"),
        ("cyber", "technology"), ("cloud", "technology"),
        ("cleaners", "retail"), ("dry clean", "retail"),
        ("boutique", "retail"), ("jewelry", "retail"),
        ("optical", "retail"), ("pet", "retail"),
        ("flower", "retail"), ("florist", "retail"),
    ]

    for idx in other_rows.index:
        name = str(df.loc[idx, "business_name"]).lower()
        secondary = str(df.loc[idx, "category_secondary"]).lower()
        combined = f"{name} {secondary}"

        for keyword, category in NAME_CATEGORY_HINTS:
            if keyword in combined:
                if not dry_run:
                    df.loc[idx, "category_primary"] = category
                stats["recategorized"] += 1
                break

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
        from collections import Counter
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

    # 6. Write
    if not args.dry_run:
        # Sort by business name
        master_df = master_df.sort_values("business_name", key=lambda x: x.str.lower())
        master_df.to_csv(args.master, index=False)
        print(f"\n  Master updated: {len(master_df)} total records -> {args.master}")

        # 6. Archive staging
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
