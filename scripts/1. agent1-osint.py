#!/usr/bin/env python3
"""
Agent 1 — Discovery Scraper
============================
Collects raw business records from multiple sources and writes them
to staging CSVs.  Each source adapter returns a common dict format;
Agent 2 handles dedup and normalization downstream.

Sources supported:
  outscraper  — Google Maps via Outscraper API (500 free/month)
  apify       — Google Maps via Apify actor ($5 free credit)
  serpapi     — Google Maps local results (100 free searches/month)
  osm         — OpenStreetMap Overpass API (unlimited, no key)

Usage:
  python "1. agent1-osint.py" --source outscraper --run 1
  python "1. agent1-osint.py" --source apify
  python "1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv
  python "1. agent1-osint.py" --source osm

Requirements:
  pip install requests pandas
  # Per-source (install only what you use):
  pip install outscraper          # for outscraper
  pip install apify-client        # for apify
  pip install google-search-results  # for serpapi
"""

import argparse
import csv
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from _shared import CORAL_GABLES_ZIPS, OSM_BBOX, OVERPASS_URL

# ── Config ────────────────────────────────────────────────────────
OUTSCRAPER_KEY = os.environ.get("OUTSCRAPER_KEY", "")
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")

STAGING_DIR = Path(__file__).resolve().parent.parent / "staging"
STAGING_DIR.mkdir(exist_ok=True)

# Outscraper query sets — designed to stay within 500/month free tier
OUTSCRAPER_CHUNKS: Dict[int, List[str]] = {
    1: [  # Food & Retail
        "restaurants Coral Gables FL 33134",
        "restaurants Coral Gables FL 33146",
        "restaurants Coral Gables FL 33133",
        "restaurants Coral Gables FL 33143",
        "cafes Coral Gables FL 33134",
        "bars Coral Gables FL 33134",
        "bakeries Coral Gables FL",
        "shopping Coral Gables FL 33134",
        "shopping Coral Gables FL 33146",
        "clothing stores Coral Gables FL",
        "jewelry stores Coral Gables FL",
        "grocery stores Coral Gables FL",
        "wine shops Coral Gables FL",
        "florists Coral Gables FL",
        "gift shops Coral Gables FL",
        "pet stores Coral Gables FL",
        "bookstores Coral Gables FL",
        "electronics Coral Gables FL",
        "furniture stores Coral Gables FL",
        "art galleries Coral Gables FL",
    ],
    2: [  # Professional & Healthcare
        "lawyers Coral Gables FL 33134",
        "lawyers Coral Gables FL 33146",
        "accountants Coral Gables FL",
        "insurance agents Coral Gables FL",
        "real estate agents Coral Gables FL",
        "financial advisors Coral Gables FL",
        "doctors Coral Gables FL 33134",
        "doctors Coral Gables FL 33146",
        "dentists Coral Gables FL",
        "pharmacies Coral Gables FL",
        "chiropractors Coral Gables FL",
        "dermatologists Coral Gables FL",
        "optometrists Coral Gables FL",
        "veterinarians Coral Gables FL",
        "physical therapists Coral Gables FL",
        "psychologists Coral Gables FL",
        "architects Coral Gables FL",
        "engineers Coral Gables FL",
        "marketing agencies Coral Gables FL",
        "IT companies Coral Gables FL",
    ],
    3: [  # Hospitality & Wellness & Services
        "hotels Coral Gables FL",
        "gyms Coral Gables FL",
        "spas Coral Gables FL",
        "yoga studios Coral Gables FL",
        "hair salons Coral Gables FL",
        "barbershops Coral Gables FL",
        "nail salons Coral Gables FL",
        "beauty salons Coral Gables FL",
        "auto repair Coral Gables FL",
        "car dealers Coral Gables FL",
        "dry cleaners Coral Gables FL",
        "banks Coral Gables FL",
        "tutoring Coral Gables FL",
        "dance studios Coral Gables FL",
        "churches Coral Gables FL",
        "nonprofits Coral Gables FL",
        "construction companies Coral Gables FL",
        "contractors Coral Gables FL",
        "plumbers Coral Gables FL",
        "electricians Coral Gables FL",
    ],
}

# Apify category × zip matrix
APIFY_CATEGORIES = [
    "restaurant", "lawyer", "doctor", "dentist", "salon",
    "real estate", "insurance", "gym", "hotel", "bank",
]

# OSM Overpass query chunks
OSM_CHUNKS = {
    "restaurants": f'[out:json][timeout:90];(node["name"]["amenity"="restaurant"]({OSM_BBOX});way["name"]["amenity"="restaurant"]({OSM_BBOX}););out center;',
    "cafes_bars": f'[out:json][timeout:90];(node["name"]["amenity"~"fast_food|cafe|bar|pub|ice_cream|bakery|food_court"]({OSM_BBOX});way["name"]["amenity"~"fast_food|cafe|bar|pub|bakery"]({OSM_BBOX}););out center;',
    "food_retail": f'[out:json][timeout:90];(node["name"]["shop"~"convenience|supermarket|deli|butcher|greengrocer|alcohol|wine|beverages|pastry|confectionery|coffee|tea|chocolate"]({OSM_BBOX});way["name"]["shop"~"supermarket|convenience"]({OSM_BBOX}););out center;',
    "offices_banks": f'[out:json][timeout:90];(node["name"]["office"]({OSM_BBOX});way["name"]["office"]({OSM_BBOX});node["name"]["amenity"="bank"]({OSM_BBOX});way["name"]["amenity"="bank"]({OSM_BBOX}););out center;',
    "healthcare": f'[out:json][timeout:90];(node["name"]["amenity"~"doctors|dentist|pharmacy|veterinary|clinic|hospital"]({OSM_BBOX});node["name"]["healthcare"]({OSM_BBOX});way["name"]["healthcare"]({OSM_BBOX});way["name"]["amenity"~"doctors|dentist|pharmacy|hospital|clinic"]({OSM_BBOX}););out center;',
    "education_community": f'[out:json][timeout:90];(node["name"]["amenity"~"school|university|college|kindergarten|language_school|place_of_worship|community_centre"]({OSM_BBOX});way["name"]["amenity"~"school|university|college|place_of_worship|community_centre"]({OSM_BBOX}););out center;',
    "hotels_leisure_auto": f'[out:json][timeout:90];(node["name"]["tourism"~"hotel|motel|hostel|guest_house"]({OSM_BBOX});node["name"]["leisure"~"fitness_centre|sports_centre|swimming_pool|dance"]({OSM_BBOX});node["name"]["amenity"~"car_rental|car_wash"]({OSM_BBOX});node["name"]["shop"~"car|car_repair|car_parts"]({OSM_BBOX});way["name"]["tourism"~"hotel|motel"]({OSM_BBOX});way["name"]["leisure"~"fitness_centre|sports_centre"]({OSM_BBOX}););out center;',
    "fashion_beauty": f'[out:json][timeout:90];(node["name"]["shop"~"clothes|shoes|jewelry|watches|bag|leather|beauty|hairdresser|cosmetics|perfumery|tattoo|optician"]({OSM_BBOX});way["name"]["shop"~"clothes|shoes|jewelry|department_store|mall"]({OSM_BBOX}););out center;',
    "home_electronics_misc": f'[out:json][timeout:90];(node["name"]["shop"~"electronics|computer|mobile_phone|furniture|interior_decoration|florist|gift|art|books|stationery|pet|hardware|houseware|dry_cleaning|photo|copyshop|travel_agency|variety_store|garden_centre"]({OSM_BBOX});way["name"]["shop"~"furniture|electronics"]({OSM_BBOX}););out center;',
    "entertainment_craft": f'[out:json][timeout:90];(node["name"]["amenity"~"arts_centre|theatre|cinema|nightclub|music_venue|bureau_de_change"]({OSM_BBOX});node["name"]["craft"]({OSM_BBOX});way["name"]["amenity"~"theatre|cinema"]({OSM_BBOX}););out center;',
}


# ── Raw record format ─────────────────────────────────────────────
# Every source adapter returns List[dict] with these keys.
# Missing values = empty string.  Agent 2 normalizes everything.
RAW_FIELDS = [
    "business_name", "phone", "website", "address",
    "lat", "lon", "postcode",
    "rating", "review_count", "category_raw", "price",
    "source",
]


def _raw(
    name: str = "",
    phone: str = "",
    website: str = "",
    address: str = "",
    lat: str = "",
    lon: str = "",
    postcode: str = "",
    rating: str = "",
    review_count: str = "",
    category_raw: str = "",
    price: str = "",
    source: str = "",
) -> Dict[str, str]:
    """Build a raw record dict with guaranteed keys."""
    return {
        "business_name": str(name).strip(),
        "phone": str(phone).strip(),
        "website": str(website).strip(),
        "address": str(address).strip(),
        "lat": str(lat).strip() if lat else "",
        "lon": str(lon).strip() if lon else "",
        "postcode": str(postcode).strip(),
        "rating": str(rating).strip() if rating else "",
        "review_count": str(review_count).strip() if review_count else "",
        "category_raw": str(category_raw).strip(),
        "price": str(price).strip(),
        "source": source,
    }


# ── Source: Outscraper ────────────────────────────────────────────
def scrape_outscraper(run_num: int = 1) -> List[Dict[str, str]]:
    """Query Google Maps via Outscraper free tier."""
    if not OUTSCRAPER_KEY:
        print("  ERROR: OUTSCRAPER_KEY not set")
        return []

    from outscraper import OutscraperClient

    client = OutscraperClient(api_key=OUTSCRAPER_KEY)
    queries = OUTSCRAPER_CHUNKS.get(run_num, [])
    if not queries:
        print(f"  No queries defined for run {run_num}")
        return []

    # Fields to request from Outscraper (v1 returns all by default,
    # but being explicit avoids surprises if the API changes).
    outscraper_fields = [
        "name", "phone", "site", "full_address",
        "latitude", "longitude", "postal_code",
        "rating", "reviews", "type", "range",
    ]

    # Outscraper returns Python None for missing values;
    # coerce to empty string so downstream doesn't get "None".
    def _val(v):
        return "" if v is None else str(v).strip()

    records: List[Dict[str, str]] = []
    for query in queries:
        print(f"    Outscraper: {query}")
        try:
            # Use google_maps_search_v1 — the v3 speed-optimized endpoint
            # omits key fields (site, full_address, reviews, range).
            results = client.google_maps_search_v1(
                [query], limit=25, language="en", region="US",
                fields=outscraper_fields,
            )
            for batch in results:
                if isinstance(batch, dict):
                    batch = [batch]
                for place in batch:
                    name = place.get("name", "")
                    if not name:
                        continue

                    records.append(
                        _raw(
                            name=name,
                            phone=_val(place.get("phone")),
                            website=_val(place.get("site")),
                            address=_val(place.get("full_address")),
                            lat=_val(place.get("latitude")),
                            lon=_val(place.get("longitude")),
                            postcode=_val(place.get("postal_code")),
                            rating=_val(place.get("rating")),
                            review_count=_val(place.get("reviews")),
                            category_raw=_val(place.get("type")),
                            price=_val(place.get("range")),
                            source="outscraper",
                        )
                    )
            time.sleep(2)
        except Exception as e:
            print(f"    Error: {e}")

    print(f"  Outscraper run {run_num}: {len(records)} raw records")
    return records


# ── Source: Apify ─────────────────────────────────────────────────
def scrape_apify() -> List[Dict[str, str]]:
    """Query Google Maps via Apify Google Places actor."""
    if not APIFY_TOKEN:
        print("  ERROR: APIFY_TOKEN not set")
        return []

    from apify_client import ApifyClient

    client = ApifyClient(APIFY_TOKEN)

    searches = []
    for zip_code in CORAL_GABLES_ZIPS:
        for cat in APIFY_CATEGORIES:
            searches.append(f"{cat} in {zip_code}")

    run_input = {
        "searchStringsArray": searches[:20],  # stay within free credit
        "maxCrawledPlacesPerSearch": 30,
        "language": "en",
        "deeperCityScrape": False,
    }

    print("    Starting Apify actor...")
    run = client.actor("compass/crawler-google-places").call(run_input=run_input)

    records: List[Dict[str, str]] = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        name = item.get("title", "")
        if not name:
            continue
        loc = item.get("location", {}) or {}
        records.append(
            _raw(
                name=name,
                phone=item.get("phone", ""),
                website=item.get("website", ""),
                address=item.get("address", ""),
                lat=loc.get("lat", ""),
                lon=loc.get("lng", ""),
                postcode=item.get("postalCode", ""),
                rating=item.get("totalScore", ""),
                review_count=item.get("reviewsCount", ""),
                category_raw=item.get("categoryName", ""),
                price=item.get("price", ""),
                source="apify",
            )
        )

    print(f"  Apify: {len(records)} raw records")
    return records


# ── Source: SerpApi ───────────────────────────────────────────────
def scrape_serpapi(
    master_csv: Optional[str] = None,
    limit: int = 100,
    target: str = "missing-rating",
) -> List[Dict[str, str]]:
    """
    Enrich existing records via SerpApi.

    target controls which records to query:
      missing-rating   — rows with no rating_primary_value (original behavior)
      missing-website  — rows with no website
      missing-address  — rows with no address
      missing-reviews  — rows with no rating_primary_review_count
      any-gap          — rows missing ANY of: website, address, rating, review_count
    """
    if not SERPAPI_KEY:
        print("  ERROR: SERPAPI_KEY not set")
        return []

    from serpapi import GoogleSearch

    import pandas as pd

    if not master_csv or not os.path.exists(master_csv):
        print("  ERROR: --master required for serpapi enrichment")
        return []

    df = pd.read_csv(master_csv, dtype=str).fillna("")

    # Build target filter based on --target flag
    FIELD_MAP = {
        "missing-rating": ["rating_primary_value"],
        "missing-website": ["website"],
        "missing-address": ["address"],
        "missing-reviews": ["rating_primary_review_count"],
        "any-gap": ["website", "address", "rating_primary_value", "rating_primary_review_count"],
    }

    target_fields = FIELD_MAP.get(target, FIELD_MAP["missing-rating"])

    if target == "any-gap":
        # OR logic: missing ANY of the fields
        mask = pd.Series(False, index=df.index)
        for field in target_fields:
            if field in df.columns:
                mask = mask | (df[field].str.strip() == "")
    else:
        # AND logic: missing ALL specified fields
        mask = pd.Series(True, index=df.index)
        for field in target_fields:
            if field in df.columns:
                mask = mask & (df[field].str.strip() == "")

    targets = df[mask].head(limit)
    print(f"  Target: {target} ({len(targets)} of {mask.sum()} matching records, limit={limit})")

    records: List[Dict[str, str]] = []
    total = len(targets)
    no_results = 0
    errors = 0

    print(f"  Querying {total} businesses missing ratings...")

    for i, (_, row) in enumerate(targets.iterrows(), 1):
        name = str(row.get("business_name", ""))
        if not name:
            continue

        # Build search query — include address if available for better matching
        address = str(row.get("address", "")) if pd.notna(row.get("address")) else ""
        if address and "Coral Gables" in address:
            query = f"{name} {address}"
        else:
            query = f"{name} Coral Gables FL"

        params = {
            "engine": "google_maps",
            "q": query,
            "type": "search",
            "api_key": SERPAPI_KEY,
        }
        try:
            search = GoogleSearch(params)
            results = search.get_dict()
            local = results.get("local_results", [])

            # Also check place_results (single-place match)
            if not local and "place_results" in results:
                place = results["place_results"]
                if place.get("rating"):
                    local = [place]

            if local:
                top = local[0]
                # SerpApi nests coordinates under gps_coordinates
                gps = top.get("gps_coordinates", {}) or {}
                records.append(
                    _raw(
                        name=name,
                        phone=top.get("phone", ""),
                        website=top.get("website", ""),
                        address=top.get("address", ""),
                        lat=gps.get("latitude", ""),
                        lon=gps.get("longitude", ""),
                        rating=top.get("rating", ""),
                        review_count=top.get("reviews", top.get("reviews_original", "")),
                        category_raw=top.get("type", ""),
                        source="serpapi",
                    )
                )
            else:
                no_results += 1
            time.sleep(1)  # rate limit
        except Exception as e:
            errors += 1
            print(f"    Error for {name}: {e}")

        # Progress every 50 queries
        if i % 50 == 0 or i == total:
            print(f"    [{i}/{total}] {len(records)} matched, {no_results} no results, {errors} errors")

    print(f"  SerpApi: {len(records)} enrichment records ({no_results} no results, {errors} errors)")
    return records


# ── Source: OpenStreetMap Overpass ─────────────────────────────────
def scrape_osm() -> List[Dict[str, str]]:
    """Run 10-chunk Overpass queries against OSM. Free, no key."""
    records: List[Dict[str, str]] = []
    seen_ids: set = set()

    for chunk_name, query in OSM_CHUNKS.items():
        print(f"    OSM: {chunk_name}...", end=" ")
        try:
            resp = requests.post(
                OVERPASS_URL, data={"data": query}, timeout=100
            )
            if resp.status_code != 200:
                print(f"HTTP {resp.status_code}")
                continue

            elements = resp.json().get("elements", [])
            new = 0
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name", "")
                if not name or el["id"] in seen_ids:
                    continue
                seen_ids.add(el["id"])

                lat = el.get("lat") or el.get("center", {}).get("lat", "")
                lon = el.get("lon") or el.get("center", {}).get("lon", "")

                # Build category from OSM tags
                cat_parts = []
                for tag_key in ("amenity", "shop", "office", "tourism",
                                "leisure", "healthcare", "craft"):
                    if tag_key in tags:
                        cat_parts.append(f"{tag_key}:{tags[tag_key]}")
                category_raw = "|".join(cat_parts) if cat_parts else ""

                records.append(
                    _raw(
                        name=name,
                        phone=tags.get("phone", tags.get("contact:phone", "")),
                        website=tags.get("website", tags.get("contact:website", "")),
                        address=_osm_address(tags),
                        lat=lat,
                        lon=lon,
                        postcode=tags.get("addr:postcode", ""),
                        category_raw=category_raw,
                        source="osm",
                    )
                )
                new += 1

            print(f"{new} new")
            time.sleep(2)  # be polite to Overpass
        except Exception as e:
            print(f"Error: {e}")

    print(f"  OSM: {len(records)} total raw records")
    return records


def _osm_address(tags: dict) -> str:
    """Build a street address from OSM addr:* tags."""
    parts = []
    num = tags.get("addr:housenumber", "")
    street = tags.get("addr:street", "")
    if num and street:
        parts.append(f"{num} {street}")
    elif street:
        parts.append(street)
    city = tags.get("addr:city", "")
    if city:
        parts.append(city)
    state = tags.get("addr:state", "")
    postcode = tags.get("addr:postcode", "")
    if state or postcode:
        parts.append(f"{state} {postcode}".strip())
    return ", ".join(parts)


# ── Write staging CSV ─────────────────────────────────────────────
def write_staging(records: List[Dict[str, str]], source: str, run_num: int = 0) -> str:
    """Write raw records to a timestamped staging CSV. Returns path."""
    if not records:
        print("  No records to write.")
        return ""

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_tag = f"_run{run_num}" if run_num else ""
    filename = STAGING_DIR / f"{source}{run_tag}_{ts}.csv"

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=RAW_FIELDS)
        writer.writeheader()
        for r in records:
            writer.writerow({k: r.get(k, "") for k in RAW_FIELDS})

    print(f"  Wrote {len(records)} records -> {filename}")
    return str(filename)


# ── CLI ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agent 1 — OSINT Discovery Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "1. agent1-osint.py" --source outscraper --run 1
  python "1. agent1-osint.py" --source apify
  python "1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv
  python "1. agent1-osint.py" --source osm
        """,
    )
    parser.add_argument(
        "--source",
        required=True,
        choices=["outscraper", "apify", "serpapi", "osm"],
        help="Data source to scrape",
    )
    parser.add_argument(
        "--run",
        type=int,
        default=1,
        help="Run/chunk number (for outscraper: 1=food, 2=professional, 3=services)",
    )
    parser.add_argument(
        "--master",
        type=str,
        default="",
        help="Path to master CSV (required for serpapi enrichment)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=5000,
        help="Max records to enrich (serpapi only, default=5000 for Developer plan)",
    )
    parser.add_argument(
        "--target",
        type=str,
        default="missing-rating",
        choices=["missing-rating", "missing-website", "missing-address",
                 "missing-reviews", "any-gap"],
        help="Which records to target for SerpApi enrichment (default: missing-rating)",
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  AGENT 1 — DISCOVERY SCRAPER")
    print(f"  Source: {args.source} | Run: {args.run}")
    print(f"{'='*60}\n")

    if args.source == "outscraper":
        records = scrape_outscraper(args.run)
    elif args.source == "apify":
        records = scrape_apify()
    elif args.source == "serpapi":
        records = scrape_serpapi(args.master, args.limit, args.target)
    elif args.source == "osm":
        records = scrape_osm()
    else:
        records = []

    staging_path = write_staging(records, args.source, args.run)

    print(f"\n  Done. {len(records)} records collected.")
    if staging_path:
        print(f"  Staging: {staging_path}")
    print(f"  Next: run Agent 2 to validate and merge.\n")


if __name__ == "__main__":
    main()
