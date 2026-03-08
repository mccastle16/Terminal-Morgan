#!/usr/bin/env python3
"""
Agent 2 — Enhanced Validator (temp/prototype)
===============================================
Extended version of scripts/2. agent2-validator.py with 10 robust
validators on top of the original cleaning/normalization pipeline.

What changed vs. the original:
  - BUG FIX: red_flag_present and red_flag_severity are now actually
    populated (they were always "" before).
  - NEW: 10 validation layers, each producing typed issues that feed
    into the red flag columns and osint_confidence score.

Validators (in order of execution):
  V1  Cross-Source Corroboration   — 2+ sources = trust boost
  V2  Geo-Bounds Check             — lat/lon inside Coral Gables (original)
  V3  Zip ↔ Coordinate Cross-Check — infer_zip() vs stored postcode
  V4  Address ↔ Coordinate Dist.   — haversine between geocoded addr & stored coords
  V5  Phone Area Code Check        — must be Miami-Dade (305, 786, 954)
  V6  Business Name Plausibility   — length, junk words, number-only
  V7  Duplicate Address Detection  — 3+ businesses at same address
  V8  Rating ↔ Review Consistency  — high rating + low reviews = unreliable
  V9  Website Domain Validation    — DNS resolution check
  V10 Temporal Staleness           — last_reviewed_date > 90 days ago

Usage (read-only audit against existing master):
  python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit
  python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit --dry-run

Requirements:
  pip install pandas fuzzywuzzy python-Levenshtein
"""

import argparse
import os
import re
import socket
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

import pandas as pd

# ── Allow importing _shared from scripts/ ─────────────────────────
SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from _shared import (
    CANONICAL_FIELDS,
    CG_BOUNDS,
    CG_ZIPS_SET as CG_ZIPS,
    haversine,
    in_coral_gables,
    infer_zip,
    normalize_key,
)

# ── Constants ─────────────────────────────────────────────────────

# Miami-Dade area codes (305, 786 are primary; 954 is Broward but border businesses use it)
MIAMI_AREA_CODES = {"305", "786", "954"}

# Junk / implausible business name patterns
JUNK_NAME_PATTERNS = [
    re.compile(r"^.{1,2}$"),                     # 1-2 chars
    re.compile(r"^.{81,}$"),                      # 81+ chars
    re.compile(r"^\d+$"),                         # all digits
    re.compile(r"\b(test|example|demo|sample)\b", re.IGNORECASE),
    re.compile(r"FL\s*331\d{2}"),                 # looks like an address
    re.compile(r"^\d+\s+(sw|nw|se|ne|south|north)", re.IGNORECASE),  # street address
]

# Staleness threshold (days)
STALE_DAYS = 90

# Source groupings — map source_file values to canonical source families
# so "outscraper", "osm", "osint-cgcc-v1", "cgcc" etc. each count as
# independent corroboration sources.
SOURCE_FAMILIES = {
    "outscraper": "google_outscraper",
    "apify": "google_apify",
    "serpapi": "google_serpapi",
    "osm": "osm",
    "osint-cgcc-v1": "cgcc",
    "cgcc": "cgcc",
    "ta": "tripadvisor",
    "non-cgcc-run1": "manual",
    "non-cgcc-run2": "manual",
    "agent1-scraper": "agent1",
}

# Corroboration: Google sources (Outscraper, Apify, SerpApi) all draw from
# Google Maps, so they count as ONE family for corroboration.
# Truly independent families: google, osm, cgcc, tripadvisor, manual
INDEPENDENT_FAMILIES = {
    "google_outscraper": "google",
    "google_apify": "google",
    "google_serpapi": "google",
    "osm": "osm",
    "cgcc": "cgcc",
    "tripadvisor": "tripadvisor",
    "manual": "manual",
    "agent1": "agent1",
}


# ══════════════════════════════════════════════════════════════════
#  VALIDATOR FUNCTIONS
#  Each returns (issues: List[str], score_delta: float)
#    - issues: human-readable notes appended to red_flag_notes
#    - score_delta: negative = penalty, positive = boost
# ══════════════════════════════════════════════════════════════════


# ── V1: Cross-Source Corroboration ────────────────────────────────
def build_corroboration_index(df: pd.DataFrame) -> Dict[str, Set[str]]:
    """
    Build a lookup: normalized_key → set of independent source families
    that have confirmed this business.

    A business appearing in Outscraper + OSM + CGCC = 3 independent families.
    Outscraper + SerpApi = 1 family (both are Google Maps).
    """
    key_sources: Dict[str, Set[str]] = defaultdict(set)

    for _, row in df.iterrows():
        name = str(row.get("business_name", ""))
        if not name:
            continue
        key = normalize_key(name)
        if not key:
            continue

        raw_source = str(row.get("source_file", "")).strip().lower()
        family = SOURCE_FAMILIES.get(raw_source, raw_source)
        independent = INDEPENDENT_FAMILIES.get(family, family)
        key_sources[key].add(independent)

    return key_sources


def v1_cross_source_corroboration(
    record: Dict[str, str],
    corroboration_index: Dict[str, Set[str]],
) -> Tuple[List[str], float]:
    """
    Check how many independent sources confirm this business.
    Returns score boost/penalty + descriptive notes.
    """
    key = normalize_key(record.get("business_name", ""))
    sources = corroboration_index.get(key, set())
    n = len(sources)

    if n >= 4:
        return ([f"Corroborated by {n} independent sources: {', '.join(sorted(sources))}"], +0.35)
    elif n == 3:
        return ([f"Corroborated by 3 sources: {', '.join(sorted(sources))}"], +0.25)
    elif n == 2:
        return ([f"Corroborated by 2 sources: {', '.join(sorted(sources))}"], +0.15)
    else:
        return ([f"Single-source only ({', '.join(sorted(sources)) if sources else 'unknown'})"], -0.10)


# ── V2: Geo-Bounds Check (original) ──────────────────────────────
def v2_geo_bounds(record: Dict[str, str]) -> Tuple[List[str], float]:
    """Check if coordinates fall within Coral Gables bounding box."""
    lat_str = record.get("lat", "")
    lon_str = record.get("lon", "")
    if not lat_str or not lon_str:
        return ([], 0.0)  # no coords to check

    try:
        lat, lon = float(lat_str), float(lon_str)
    except ValueError:
        return (["Invalid coordinates (non-numeric)"], -0.10)

    if not in_coral_gables(lat, lon):
        return (["Outside Coral Gables bounds"], -0.30)

    return ([], 0.0)


# ── V3: Zip ↔ Coordinate Cross-Check ─────────────────────────────
def v3_zip_coord_crosscheck(record: Dict[str, str]) -> Tuple[List[str], float]:
    """
    Compare stored postcode against infer_zip(lat, lon).
    If they disagree, one is wrong.
    """
    postcode = record.get("postcode", "").strip()
    lat_str = record.get("lat", "")
    lon_str = record.get("lon", "")

    if not postcode or not lat_str or not lon_str:
        return ([], 0.0)

    try:
        lat, lon = float(lat_str), float(lon_str)
    except ValueError:
        return ([], 0.0)

    inferred = infer_zip(lat, lon)
    if inferred and postcode != inferred:
        return ([f"Zip mismatch: stored={postcode}, inferred from coords={inferred}"], -0.15)

    # Also check if postcode is in CG set
    if postcode not in CG_ZIPS:
        return ([f"Zip {postcode} not in primary CG set"], -0.10)

    return ([], 0.0)


# ── V4: Address ↔ Coordinate Distance ────────────────────────────
def v4_address_coord_distance(
    record: Dict[str, str],
    geocode_cache: Dict[str, Tuple[Optional[float], Optional[float]]],
) -> Tuple[List[str], float]:
    """
    If we have both address and coords, forward-geocode the address
    and check if the result is within 500m of stored coords.

    NOTE: This validator is EXPENSIVE (Nominatim network calls).
    In audit mode we skip it by default unless --deep is passed.
    The geocode_cache is pre-populated for batch efficiency.
    """
    address = record.get("address", "").strip()
    lat_str = record.get("lat", "")
    lon_str = record.get("lon", "")

    if not address or not lat_str or not lon_str:
        return ([], 0.0)

    try:
        stored_lat, stored_lon = float(lat_str), float(lon_str)
    except ValueError:
        return ([], 0.0)

    geocoded = geocode_cache.get(address)
    if geocoded is None:
        return ([], 0.0)  # not geocoded (skipped or failed)

    geo_lat, geo_lon = geocoded
    if geo_lat is None or geo_lon is None:
        return ([], 0.0)

    dist_km = haversine(stored_lat, stored_lon, geo_lat, geo_lon)
    dist_m = dist_km * 1000

    if dist_m > 2000:
        return ([f"Address/coord mismatch: {dist_m:.0f}m apart (>2km — likely wrong)"], -0.30)
    elif dist_m > 500:
        return ([f"Address/coord drift: {dist_m:.0f}m apart (>500m — suspicious)"], -0.15)

    return ([], 0.0)


# ── V5: Phone Area Code Check ────────────────────────────────────
def v5_phone_area_code(record: Dict[str, str]) -> Tuple[List[str], float]:
    """
    Extract area code from phone number and validate it's Miami-Dade.
    """
    phone = record.get("phone", "").strip()
    if not phone:
        return ([], 0.0)

    # Extract digits
    digits = re.sub(r"[^\d]", "", phone)

    # Normalize to 10-digit
    if len(digits) == 11 and digits[0] == "1":
        digits = digits[1:]

    if len(digits) != 10:
        return ([], 0.0)  # can't validate non-standard format

    area_code = digits[:3]
    if area_code not in MIAMI_AREA_CODES:
        return ([f"Non-Miami area code ({area_code}) — expected 305/786/954"], -0.10)

    return ([], 0.0)


# ── V6: Business Name Plausibility ───────────────────────────────
def v6_name_plausibility(record: Dict[str, str]) -> Tuple[List[str], float]:
    """Flag suspicious business names."""
    name = record.get("business_name", "").strip()
    if not name:
        return (["Missing business_name"], -1.0)

    issues = []
    score = 0.0

    for pattern in JUNK_NAME_PATTERNS:
        if pattern.search(name):
            issues.append(f"Suspicious business name: '{name}' matches junk pattern")
            score -= 0.15
            break  # one match is enough

    # Check for all-caps (often data artifacts)
    if len(name) > 5 and name == name.upper():
        issues.append(f"Business name is ALL CAPS: '{name}'")
        # Not a penalty, just a note — some businesses legitimately use all caps

    return (issues, score)


# ── V7: Duplicate Address Detection ──────────────────────────────
def build_address_clusters(df: pd.DataFrame) -> Dict[str, int]:
    """
    Build lookup: normalized_address → count of businesses at that address.
    """
    addr_counts: Dict[str, int] = Counter()
    for _, row in df.iterrows():
        addr = str(row.get("address", "")).strip().lower()
        if addr and len(addr) > 5:
            # Normalize: remove extra spaces, trailing commas
            addr = re.sub(r"\s+", " ", addr).strip(", ")
            addr_counts[addr] += 1
    return dict(addr_counts)


def v7_duplicate_address(
    record: Dict[str, str],
    address_clusters: Dict[str, int],
) -> Tuple[List[str], float]:
    """
    Flag businesses at addresses with 3+ other businesses.
    Could indicate virtual offices, data corruption, or address reuse.
    """
    addr = record.get("address", "").strip().lower()
    if not addr or len(addr) <= 5:
        return ([], 0.0)

    addr_norm = re.sub(r"\s+", " ", addr).strip(", ")
    count = address_clusters.get(addr_norm, 0)

    if count >= 5:
        return ([f"Address shared by {count} businesses (possible virtual office / data issue)"], -0.10)
    elif count >= 3:
        return ([f"Address shared by {count} businesses (crowded — verify)"], -0.05)

    return ([], 0.0)


# ── V8: Rating ↔ Review Count Consistency ─────────────────────────
def v8_rating_review_consistency(record: Dict[str, str]) -> Tuple[List[str], float]:
    """
    Flag inconsistencies between rating and review count:
    - Perfect 5.0 with <5 reviews → unreliable
    - Has reviews but no rating (or vice versa)
    - Rating outside 1.0-5.0
    """
    rating_str = record.get("rating_primary_value", "").strip()
    review_str = record.get("rating_primary_review_count", "").strip()

    issues = []
    score = 0.0

    # Parse
    rating = None
    reviews = None
    if rating_str:
        try:
            rating = float(rating_str)
        except ValueError:
            issues.append(f"Non-numeric rating: '{rating_str}'")
            score -= 0.05
    if review_str:
        try:
            reviews = int(float(review_str))
        except ValueError:
            pass

    # Rating range check
    if rating is not None:
        if rating < 1.0 or rating > 5.0:
            issues.append(f"Rating {rating} outside 1.0–5.0 range")
            score -= 0.10

    # Perfect rating with low reviews
    if rating is not None and rating >= 4.9 and reviews is not None and reviews < 5:
        issues.append(f"High rating ({rating}) with only {reviews} reviews — unreliable")
        score -= 0.05

    # Has reviews but no rating
    if reviews is not None and reviews > 0 and rating is None:
        issues.append("Has review count but no rating value")
        score -= 0.05

    # Has rating but no reviews
    if rating is not None and (reviews is None or reviews == 0):
        issues.append("Has rating but no review count")
        # Not a strong penalty — some sources just don't provide review count

    return (issues, score)


# ── V9: Website Domain Validation ─────────────────────────────────
def v9_website_dns(
    record: Dict[str, str],
    dns_cache: Dict[str, bool],
) -> Tuple[List[str], float]:
    """
    Check if the website domain resolves via DNS.
    Uses a pre-built cache to avoid repeated lookups.
    """
    website = record.get("website", "").strip()
    if not website:
        return ([], 0.0)

    # Parse domain
    try:
        parsed = urlparse(website if "://" in website else f"https://{website}")
        domain = parsed.hostname
    except Exception:
        return ([f"Malformed website URL: '{website}'"], -0.05)

    if not domain:
        return ([], 0.0)

    # Check cache
    resolves = dns_cache.get(domain)
    if resolves is None:
        return ([], 0.0)  # not checked (skipped)

    if not resolves:
        return ([f"Website domain does not resolve: {domain}"], -0.15)

    return ([], 0.0)


def batch_dns_check(domains: List[str], timeout: float = 2.0) -> Dict[str, bool]:
    """
    Resolve a list of domains via DNS. Returns domain → resolves (bool).
    """
    cache: Dict[str, bool] = {}
    for domain in domains:
        try:
            socket.setdefaulttimeout(timeout)
            socket.getaddrinfo(domain, 80)
            cache[domain] = True
        except (socket.gaierror, socket.timeout, OSError):
            cache[domain] = False
    return cache


# ── V10: Temporal Staleness ───────────────────────────────────────
def v10_temporal_staleness(record: Dict[str, str]) -> Tuple[List[str], float]:
    """
    Flag records where last_reviewed_date is >90 days ago.
    """
    date_str = record.get("last_reviewed_date", "").strip()
    if not date_str:
        return (["No last_reviewed_date — staleness unknown"], -0.05)

    try:
        reviewed = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return ([f"Invalid date format: '{date_str}'"], -0.05)

    age_days = (datetime.now() - reviewed).days

    if age_days > 180:
        return ([f"Very stale: last reviewed {age_days} days ago (>180d)"], -0.15)
    elif age_days > STALE_DAYS:
        return ([f"Stale: last reviewed {age_days} days ago (>90d)"], -0.05)

    return ([], 0.0)


# ══════════════════════════════════════════════════════════════════
#  COMPOSITE VALIDATOR — runs all 10 checks, produces final scores
# ══════════════════════════════════════════════════════════════════

def validate_record_enhanced(
    record: Dict[str, str],
    corroboration_index: Dict[str, Set[str]],
    address_clusters: Dict[str, int],
    geocode_cache: Dict[str, Tuple[Optional[float], Optional[float]]],
    dns_cache: Dict[str, bool],
) -> Tuple[str, float, str, str, List[str]]:
    """
    Run all 10 validators on a record.

    Returns:
        (validation_tier, osint_confidence, red_flag_present, red_flag_severity, all_issues)
    """
    all_issues: List[str] = []
    score = 1.0  # start at 1.0, validators add/subtract

    # ── Run each validator ──────────────────────────────────
    validators = [
        ("V1_CORROBORATION", v1_cross_source_corroboration(record, corroboration_index)),
        ("V2_GEO_BOUNDS", v2_geo_bounds(record)),
        ("V3_ZIP_COORD", v3_zip_coord_crosscheck(record)),
        ("V4_ADDR_COORD", v4_address_coord_distance(record, geocode_cache)),
        ("V5_PHONE_AREA", v5_phone_area_code(record)),
        ("V6_NAME_CHECK", v6_name_plausibility(record)),
        ("V7_DUP_ADDRESS", v7_duplicate_address(record, address_clusters)),
        ("V8_RATING_REVIEW", v8_rating_review_consistency(record)),
        ("V9_WEBSITE_DNS", v9_website_dns(record, dns_cache)),
        ("V10_STALENESS", v10_temporal_staleness(record)),
    ]

    for label, (issues, delta) in validators:
        if issues:
            prefixed = [f"[{label}] {i}" for i in issues]
            all_issues.extend(prefixed)
        score += delta

    # Clamp score
    score = max(0.0, min(1.0, round(score, 2)))

    # ── Determine tier ──────────────────────────────────────
    if score >= 0.80:
        tier = "High"
    elif score >= 0.50:
        tier = "Moderate"
    else:
        tier = "Low"

    # ── Determine red flags (BUG FIX — these were never set before) ──
    # Separate "real" issues from informational notes (corroboration boosts)
    penalty_issues = [i for i in all_issues if not i.startswith("[V1_CORROBORATION] Corroborated")]

    if not penalty_issues:
        red_flag_present = "N"
        red_flag_severity = ""
    else:
        red_flag_present = "Y"
        # Severity: Critical if geo-bounds fail OR score < 0.3,
        # otherwise Operational
        critical_markers = ["Outside Coral Gables bounds", "Address/coord mismatch",
                            "does not resolve", "Suspicious business name"]
        is_critical = any(
            marker in issue for issue in penalty_issues for marker in critical_markers
        ) or score < 0.30
        red_flag_severity = "Critical" if is_critical else "Operational"

    return (tier, score, red_flag_present, red_flag_severity, all_issues)


# ══════════════════════════════════════════════════════════════════
#  AUDIT MODE — read-only validation of existing master
# ══════════════════════════════════════════════════════════════════

def audit_master(master_path: str, deep: bool = False, dry_run: bool = True) -> None:
    """
    Run all 10 validators against every record in the master CSV.
    Prints a detailed report. Optionally writes updated validation columns.

    deep=True enables V4 (geocoding) and V9 (DNS) — these are slow.
    """
    if not os.path.exists(master_path):
        print(f"  ERROR: {master_path} not found")
        return

    df = pd.read_csv(master_path, dtype=str).fillna("")
    total = len(df)
    print(f"\n{'='*70}")
    print(f"  ENHANCED VALIDATOR — AUDIT MODE")
    print(f"  Master: {master_path} ({total} records)")
    print(f"  Deep mode (V4+V9): {'ON' if deep else 'OFF'}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE (will update columns)'}")
    print(f"{'='*70}\n")

    # ── Pre-compute indexes ─────────────────────────────────
    print("  Building indexes...")

    # V1: Corroboration index
    corroboration_index = build_corroboration_index(df)
    print(f"    Corroboration index: {len(corroboration_index)} unique business keys")

    # V7: Address clusters
    address_clusters = build_address_clusters(df)
    crowded = {k: v for k, v in address_clusters.items() if v >= 3}
    print(f"    Address clusters: {len(crowded)} addresses with 3+ businesses")

    # V4: Geocode cache (only in deep mode)
    geocode_cache: Dict[str, Tuple[Optional[float], Optional[float]]] = {}
    if deep:
        print("    Geocoding addresses (deep mode)... this may take a while")
        # Only geocode records that have both address AND coords (for comparison)
        needs_check = df[
            (df["address"].fillna("") != "") &
            (df["lat"].fillna("") != "") &
            (df["lon"].fillna("") != "")
        ]
        # Limit to 100 for sanity (Nominatim rate limit)
        sample = needs_check.head(100)
        print(f"    Geocoding {len(sample)} addresses for V4 check...")
        import time as _time
        import requests
        for _, row in sample.iterrows():
            addr = str(row["address"])
            if addr in geocode_cache:
                continue
            try:
                resp = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": addr, "format": "json", "limit": 1,
                            "countrycodes": "us"},
                    headers={"User-Agent": "CoralGablesOSINT/1.0"},
                    timeout=10,
                )
                if resp.status_code == 200 and resp.json():
                    r = resp.json()[0]
                    geocode_cache[addr] = (float(r["lat"]), float(r["lon"]))
                else:
                    geocode_cache[addr] = (None, None)
            except Exception:
                geocode_cache[addr] = (None, None)
            _time.sleep(1.1)
        print(f"    Geocoded {len(geocode_cache)} addresses")
    else:
        print("    Skipping V4 geocoding (use --deep to enable)")

    # V9: DNS cache (only in deep mode)
    dns_cache: Dict[str, bool] = {}
    if deep:
        websites = df["website"].fillna("").unique()
        domains = set()
        for w in websites:
            if not w:
                continue
            try:
                parsed = urlparse(w if "://" in w else f"https://{w}")
                if parsed.hostname:
                    domains.add(parsed.hostname)
            except Exception:
                pass
        print(f"    DNS-checking {len(domains)} unique domains...")
        dns_cache = batch_dns_check(list(domains))
        failed = sum(1 for v in dns_cache.values() if not v)
        print(f"    DNS results: {len(dns_cache) - failed} resolve, {failed} failed")
    else:
        print("    Skipping V9 DNS checks (use --deep to enable)")

    # ── Run validators on every record ──────────────────────
    print(f"\n  Running 10 validators on {total} records...\n")

    results = {
        "High": 0, "Moderate": 0, "Low": 0,
        "red_flag_Y": 0, "red_flag_N": 0,
        "critical": 0, "operational": 0,
    }
    all_issue_counts: Counter = Counter()
    validator_hit_counts: Counter = Counter()  # which validators fire most

    updated_tiers = []
    updated_confidence = []
    updated_flag_present = []
    updated_flag_severity = []
    updated_flag_notes = []

    for idx, row in df.iterrows():
        record = row.to_dict()
        tier, confidence, flag_present, flag_severity, issues = validate_record_enhanced(
            record, corroboration_index, address_clusters, geocode_cache, dns_cache,
        )

        results[tier] += 1
        if flag_present == "Y":
            results["red_flag_Y"] += 1
            if flag_severity == "Critical":
                results["critical"] += 1
            else:
                results["operational"] += 1
        else:
            results["red_flag_N"] += 1

        for issue in issues:
            # Extract validator label
            match = re.match(r"\[(\w+)\]", issue)
            if match:
                validator_hit_counts[match.group(1)] += 1
            all_issue_counts[issue] += 1

        updated_tiers.append(tier)
        updated_confidence.append(str(confidence))
        updated_flag_present.append(flag_present)
        updated_flag_severity.append(flag_severity)
        updated_flag_notes.append("; ".join(issues))

    # ── Report ──────────────────────────────────────────────
    print(f"  {'='*60}")
    print(f"  VALIDATION RESULTS")
    print(f"  {'='*60}")
    print(f"\n  Tier Distribution:")
    print(f"    High:     {results['High']:>5} ({results['High']/total*100:.1f}%)")
    print(f"    Moderate: {results['Moderate']:>5} ({results['Moderate']/total*100:.1f}%)")
    print(f"    Low:      {results['Low']:>5} ({results['Low']/total*100:.1f}%)")

    print(f"\n  Red Flags:")
    print(f"    Clean (N):      {results['red_flag_N']:>5}")
    print(f"    Flagged (Y):    {results['red_flag_Y']:>5}")
    print(f"      Critical:     {results['critical']:>5}")
    print(f"      Operational:  {results['operational']:>5}")

    print(f"\n  Validator Hit Frequency (which validators fire most):")
    for label, count in validator_hit_counts.most_common():
        print(f"    {label:<25} {count:>5} hits ({count/total*100:.1f}%)")

    print(f"\n  Top 20 Issues:")
    for issue, count in all_issue_counts.most_common(20):
        print(f"    {count:>5}x  {issue}")

    # ── Corroboration Summary ───────────────────────────────
    print(f"\n  Corroboration Summary:")
    corr_dist = Counter()
    for key, sources in corroboration_index.items():
        corr_dist[len(sources)] += 1
    for n_sources in sorted(corr_dist.keys()):
        count = corr_dist[n_sources]
        print(f"    {n_sources} source(s): {count:>5} businesses")

    # ── Write updated columns ───────────────────────────────
    if not dry_run:
        df["validation_tier"] = updated_tiers
        df["osint_confidence"] = updated_confidence
        df["red_flag_present"] = updated_flag_present
        df["red_flag_severity"] = updated_flag_severity
        df["red_flag_notes"] = updated_flag_notes
        df.to_csv(master_path, index=False)
        print(f"\n  Master UPDATED with new validation columns → {master_path}")
    else:
        print(f"\n  DRY RUN — no changes written to {master_path}")

    print(f"\n  Done.\n")


# ── CLI ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agent 2 — Enhanced Validator (prototype)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick audit (V1-V3, V5-V8, V10 — no network calls):
  python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit

  # Deep audit (adds V4 geocoding + V9 DNS — slow):
  python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit --deep

  # Write updated validation columns to master:
  python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit --live
        """,
    )
    parser.add_argument(
        "--master", required=True,
        help="Path to master CSV",
    )
    parser.add_argument(
        "--audit", action="store_true",
        help="Run all 10 validators against existing master (read-only by default)",
    )
    parser.add_argument(
        "--deep", action="store_true",
        help="Enable V4 (geocoding) and V9 (DNS) — requires network, slow",
    )
    parser.add_argument(
        "--live", action="store_true",
        help="Write updated validation columns to master (default is dry-run)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Force dry-run even if --live is set",
    )
    args = parser.parse_args()

    dry_run = not args.live or args.dry_run

    if args.audit:
        audit_master(args.master, deep=args.deep, dry_run=dry_run)
    else:
        print("  Use --audit to run the enhanced validation. See --help for options.")


if __name__ == "__main__":
    main()
