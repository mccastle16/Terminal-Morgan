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
  python "1. agent1-osint.py" --source apifyadmin@cgcc.org
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
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

from _shared import CORAL_GABLES_ZIPS, OSM_BBOX, OVERPASS_URL

# ── Retry utility with exponential backoff ────────────────────────
def retry_request(func, max_retries: int = 3, backoff_factor: float = 2.0, initial_delay: float = 1.0):
    """
    Retry a function with exponential backoff.
    
    Args:
        func: Callable to retry
        max_retries: Maximum number of retry attempts (default 3)
        backoff_factor: Exponential multiplier for delay (default 2.0)
        initial_delay: Initial delay in seconds (default 1.0)
    
    Returns:
        Result of func() if successful, None if all retries exhausted
    """
    delay = initial_delay
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return func()
        except (requests.Timeout, requests.ConnectionError, requests.RequestException) as e:
            last_error = e
            if attempt < max_retries - 1:
                print(f"      Retry {attempt + 1}/{max_retries - 1}: {type(e).__name__}, waiting {delay}s...")
                time.sleep(delay)
                delay *= backoff_factor
            else:
                print(f"      Failed after {max_retries} attempts: {type(e).__name__}")
        except Exception as e:
            # Non-retryable errors
            raise
    
    return None


# ── Config ────────────────────────────────────────────────────────
OUTSCRAPER_KEY = os.environ.get("OUTSCRAPER_KEY", "")
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")

STAGING_DIR = Path(__file__).resolve().parent.parent / "staging"
STAGING_DIR.mkdir(exist_ok=True)

# Structured logging setup
LOG_DIR = STAGING_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"agent1_{datetime.now().strftime('%Y%m%d')}.jsonl"


def log_event(source: str, event_type: str, **details):
    """
    Write structured event log to JSONL file.
    
    Args:
        source: Data source (outscraper, apify, serpapi, osm, directory)
        event_type: Event type (scrape_start, scrape_end, error, success, etc.)
        **details: Additional fields to log
    
    Logs are written to staging/logs/agent1_YYYYMMDD.jsonl for auditing and debugging.
    """
    entry = {
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "event": event_type,
        **details
    }
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        print(f"  WARNING: Failed to write log: {e}")


def compute_metrics(records: List[Dict[str, str]]) -> dict:
    """
    Compute data quality metrics for a record set.
    
    Args:
        records: List of raw business records
    
    Returns:
        dict with metrics: total, valid_coords_pct, phone_pct, website_pct, 
                          rating_pct, address_pct, postcode_pct, category_pct
    """
    total = len(records)
    if total == 0:
        return {
            'total': 0,
            'valid_coords_pct': 0.0,
            'phone_pct': 0.0,
            'website_pct': 0.0,
            'rating_pct': 0.0,
            'address_pct': 0.0,
            'postcode_pct': 0.0,
            'category_pct': 0.0,
        }
    
    has_lat = sum(1 for r in records if r.get('lat', '').strip())
    has_lon = sum(1 for r in records if r.get('lon', '').strip())
    valid_coords = sum(1 for r in records if r.get('lat', '').strip() and r.get('lon', '').strip())
    has_phone = sum(1 for r in records if r.get('phone', '').strip())
    has_website = sum(1 for r in records if r.get('website', '').strip())
    has_rating = sum(1 for r in records if r.get('rating', '').strip())
    has_address = sum(1 for r in records if r.get('address', '').strip())
    has_postcode = sum(1 for r in records if r.get('postcode', '').strip())
    has_category = sum(1 for r in records if r.get('category_raw', '').strip())
    
    return {
        'total': total,
        'valid_coords_pct': round(100 * valid_coords / total, 1) if total else 0,
        'phone_pct': round(100 * has_phone / total, 1) if total else 0,
        'website_pct': round(100 * has_website / total, 1) if total else 0,
        'rating_pct': round(100 * has_rating / total, 1) if total else 0,
        'address_pct': round(100 * has_address / total, 1) if total else 0,
        'postcode_pct': round(100 * has_postcode / total, 1) if total else 0,
        'category_pct': round(100 * has_category / total, 1) if total else 0,
        'valid_coords_count': valid_coords,
        'phone_count': has_phone,
        'website_count': has_website,
    }

# Geographic sectors for Coral Gables (split into 4 quadrants)
# Format: (lat_min, lon_min, lat_max, lon_max)
CORAL_GABLES_SECTORS = {
    "north_west": (25.765, -80.294, 25.778, -80.265),
    "north_east": (25.765, -80.265, 25.778, -80.238),
    "south_west": (25.748, -80.294, 25.765, -80.265),
    "south_east": (25.748, -80.265, 25.765, -80.238),
}

# Outscraper query sets — designed to stay within 500/month free tier
OUTSCRAPER_CHUNKS: Dict[int, List[str]] = {
    1: [  # Food & Retail
        "restaurants Coral Gables FL 33134",
        "restaurants Coral Gables FL 33146",
        "restaurants Coral Gables FL 33133",
        "restaurants Coral Gables FL 33143",
        "fast food Coral Gables FL",
        "cafes Coral Gables FL 33134",
        "coffee shops Coral Gables FL",
        "bars Coral Gables FL 33134",
        "bakeries Coral Gables FL",
        "shopping Coral Gables FL 33134",
        "shopping Coral Gables FL 33146",
        "clothing stores Coral Gables FL",
        "jewelry stores Coral Gables FL",
        "grocery stores Coral Gables FL",
        "supermarkets Coral Gables FL",
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
        "tax preparation Coral Gables FL",
        "accountants Coral Gables FL",
        "insurance agents Coral Gables FL",
        "real estate agents Coral Gables FL",
        "real estate offices Coral Gables FL",
        "financial advisors Coral Gables FL",
        "investment advisors Coral Gables FL",
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
        "therapists Coral Gables FL",
        "architects Coral Gables FL",
        "engineers Coral Gables FL",
        "marketing agencies Coral Gables FL",
        "IT companies Coral Gables FL",
        "consulting firms Coral Gables FL",
    ],
    3: [  # Hospitality & Wellness & Services
        "hotels Coral Gables FL",
        "motels Coral Gables FL",
        "vacation rentals Coral Gables FL",
        "gyms Coral Gables FL",
        "fitness centers Coral Gables FL",
        "spas Coral Gables FL",
        "massage therapy Coral Gables FL",
        "yoga studios Coral Gables FL",
        "hair salons Coral Gables FL",
        "barbershops Coral Gables FL",
        "nail salons Coral Gables FL",
        "beauty salons Coral Gables FL",
        "auto repair Coral Gables FL",
        "car dealers Coral Gables FL",
        "dry cleaners Coral Gables FL",
        "banks Coral Gables FL",
        "credit unions Coral Gables FL",
        "tutoring Coral Gables FL",
        "dance studios Coral Gables FL",
        "churches Coral Gables FL",
        "nonprofits Coral Gables FL",
        "construction companies Coral Gables FL",
        "contractors Coral Gables FL",
        "plumbers Coral Gables FL",
        "electricians Coral Gables FL",
    ],
    4: [  # Entertainment & Transportation & Miscellaneous
        "movie theaters Coral Gables FL",
        "cinema Coral Gables FL",
        "concert halls Coral Gables FL",
        "nightclubs Coral Gables FL",
        "event venues Coral Gables FL",
        "taxi services Coral Gables FL",
        "car rental Coral Gables FL",
        "car wash Coral Gables FL",
        "parking Coral Gables FL",
        "rideshare Coral Gables FL",
        "furniture stores Coral Gables FL",
        "home decor Coral Gables FL",
        "interior design Coral Gables FL",
        "upholstery Coral Gables FL",
        "appliances Coral Gables FL",
        "art galleries Coral Gables FL",
        "framing Coral Gables FL",
        "antiques Coral Gables FL",
        "museums Coral Gables FL",
        "libraries Coral Gables FL",
    ],
}

# Apify category × zip matrix (Google Maps actor)
APIFY_CATEGORIES = [
    "restaurant", "lawyer", "doctor", "dentist", "salon",
    "real estate", "insurance", "gym", "hotel", "bank",
    "accountant", "therapist", "veterinarian", "optometrist",
    "pharmacy", "florist", "jewelry store", "hardware store",
    "furniture store", "art gallery", "boutique", "electronics store",
]

# Apify Yelp search terms — categories Yelp indexes well that Google often misses
APIFY_YELP_SEARCHES = [
    # Food & Drink
    "restaurants", "bars", "cafes", "bakeries", "wine bars",
    "cocktail bars", "food trucks", "cuban food", "latin american",
    "italian", "sushi", "brunch", "desserts",
    # Professional Services
    "lawyers", "accountants", "financial advisors", "insurance agents",
    "real estate agents", "marketing agencies", "architects", "consultants",
    # Health & Wellness
    "doctors", "dentists", "chiropractors", "physical therapy",
    "dermatologists", "psychologists", "optometrists",
    # Beauty & Fitness
    "hair salons", "barbershops", "nail salons", "spas",
    "massage", "yoga", "gyms", "pilates",
    # Shopping
    "boutiques", "jewelry", "art galleries", "home decor",
    "antiques", "bookstores", "gift shops",
    # Auto & Home Services
    "auto repair", "car dealers", "dry cleaning",
    "plumbers", "electricians", "contractors", "interior design",
    # Hospitality
    "hotels", "event venues", "catering",
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
    "transportation": f'[out:json][timeout:90];(node["name"]["amenity"~"parking|taxi|parking_entrance"]({OSM_BBOX});way["name"]["amenity"="parking"]({OSM_BBOX}););out center;',
    "personal_services": f'[out:json][timeout:90];(node["name"]["shop"~"laundry|tailor|shoe_repair|dry_cleaning"]({OSM_BBOX});way["name"]["shop"~"laundry"]({OSM_BBOX}););out center;',
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
        log_event("outscraper", "error", run=run_num, error="OUTSCRAPER_KEY not set")
        return []

    from outscraper import OutscraperClient

    log_event("outscraper", "scrape_start", run=run_num)
    start_time = time.time()
    
    client = OutscraperClient(api_key=OUTSCRAPER_KEY)
    queries = OUTSCRAPER_CHUNKS.get(run_num, [])
    if not queries:
        print(f"  No queries defined for run {run_num}")
        log_event("outscraper", "error", run=run_num, error=f"No queries defined for run {run_num}")
        return []

    records: List[Dict[str, str]] = []
    successful_queries = 0
    failed_queries = 0
    
    for query in queries:
        print(f"    Outscraper: {query}")
        
        def outscraper_request():
            return client.google_maps_search(
                [query], limit=100, language="en", region="US"
            )
        
        try:
            results = retry_request(outscraper_request, max_retries=2, backoff_factor=2.0, initial_delay=1.0)
            if results is None:
                print(f"      Failed after retries")
                log_event("outscraper", "query_failed", run=run_num, query=query, reason="retries_exhausted")
                failed_queries += 1
                continue
            
            query_records = 0
            for batch in results:
                for place in batch:
                    name = place.get("name", "")
                    if not name:
                        continue
                    records.append(
                        _raw(
                            name=name,
                            phone=place.get("phone", ""),
                            website=place.get("site", ""),
                            address=place.get("full_address", ""),
                            lat=place.get("latitude", ""),
                            lon=place.get("longitude", ""),
                            postcode=place.get("postal_code", ""),
                            rating=place.get("rating", ""),
                            review_count=place.get("reviews", ""),
                            category_raw=place.get("type", ""),
                            price=place.get("range", ""),
                            source="outscraper",
                        )
                    )
                    query_records += 1
            
            log_event("outscraper", "query_success", run=run_num, query=query, records=query_records)
            successful_queries += 1
            time.sleep(2)
        except Exception as e:
            log_event("outscraper", "error", run=run_num, query=query, error=str(e))
            print(f"    Error: {e}")
            failed_queries += 1

    elapsed = time.time() - start_time
    log_event("outscraper", "scrape_end", run=run_num, total_records=len(records), 
              successful_queries=successful_queries, failed_queries=failed_queries, elapsed_seconds=elapsed)
    
    metrics = compute_metrics(records)
    print(f"  Outscraper run {run_num}: {len(records)} raw records")
    print(f"    Quality: {metrics['valid_coords_pct']}% coords, {metrics['phone_pct']}% phone, {metrics['website_pct']}% website, {metrics['rating_pct']}% rating")
    log_event("outscraper", "metrics", run=run_num, **metrics)
    
    return records


# ── Source: Apify ─────────────────────────────────────────────────
def scrape_apify() -> List[Dict[str, str]]:
    """Query Google Maps via Apify Google Places actor."""
    if not APIFY_TOKEN:
        print("  ERROR: APIFY_TOKEN not set")
        log_event("apify", "error", error="APIFY_TOKEN not set")
        return []

    from apify_client import ApifyClient

    log_event("apify", "scrape_start")
    start_time = time.time()
    
    client = ApifyClient(APIFY_TOKEN)

    searches = []
    for zip_code in CORAL_GABLES_ZIPS:
        for cat in APIFY_CATEGORIES:
            searches.append(f"{cat} in {zip_code}")

    run_input = {
        "searchStringsArray": searches[:80],  # stay within free credit (~22 categories × 4 zips)
        "maxCrawledPlacesPerSearch": 100,
        "language": "en",
        "deeperCityScrape": False,
    }

    print("    Starting Apify actor...")
    log_event("apify", "actor_start", num_searches=len(searches[:80]))
    
    try:
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

        elapsed = time.time() - start_time
        log_event("apify", "scrape_end", total_records=len(records), elapsed_seconds=elapsed)
        
        metrics = compute_metrics(records)
        print(f"  Apify: {len(records)} raw records")
        print(f"    Quality: {metrics['valid_coords_pct']}% coords, {metrics['phone_pct']}% phone, {metrics['website_pct']}% website, {metrics['rating_pct']}% rating")
        log_event("apify", "metrics", **metrics)
        
        return records
    except Exception as e:
        log_event("apify", "error", error=str(e))
        print(f"  Apify error: {e}")
        return []


# ── Source: Apify Yelp ────────────────────────────────────────────
def scrape_apify_yelp() -> List[Dict[str, str]]:
    """Scrape Yelp via Apify's yin/yelp-scraper actor.

    Uses source='apify_yelp' so agent2 classifies it as the Yelp
    source family — independent corroboration from Google Maps data.
    """
    if not APIFY_TOKEN:
        print("  ERROR: APIFY_TOKEN not set")
        log_event("apify_yelp", "error", error="APIFY_TOKEN not set")
        return []

    from apify_client import ApifyClient

    log_event("apify_yelp", "scrape_start", num_searches=len(APIFY_YELP_SEARCHES))
    start_time = time.time()

    client = ApifyClient(APIFY_TOKEN)

    import urllib.parse
    location = "Coral Gables, FL"
    start_urls = [
        {"url": f"https://www.yelp.com/search?find_desc={urllib.parse.quote(term)}&find_loc={urllib.parse.quote(location)}"}
        for term in APIFY_YELP_SEARCHES
    ]
    run_input = {
        "startUrls": start_urls,
        "maxItems": 100,
    }

    print(f"    Starting Apify Yelp actor ({len(start_urls)} search URLs)...")

    try:
        run = client.actor("yin/yelp-scraper").call(run_input=run_input)

        records: List[Dict[str, str]] = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            name = item.get("name", "")
            if not name:
                continue

            loc = item.get("location", {}) or {}
            coords = item.get("coordinates", {}) or {}

            # Build full address from Yelp's structured location object
            addr_parts = [
                loc.get("address1", ""),
                loc.get("address2", ""),
                loc.get("city", ""),
            ]
            addr_parts = [p for p in addr_parts if p]
            state = loc.get("state", "")
            zip_code = loc.get("zipCode", "")
            if state or zip_code:
                addr_parts.append(f"{state} {zip_code}".strip())
            address = ", ".join(addr_parts)

            # Categories: list of {title, alias} dicts
            cats = item.get("categories", []) or []
            category_raw = ", ".join(c.get("title", "") for c in cats if c.get("title"))

            records.append(
                _raw(
                    name=name,
                    phone=item.get("phone", ""),
                    website=item.get("website", ""),
                    address=address,
                    lat=coords.get("latitude", ""),
                    lon=coords.get("longitude", ""),
                    postcode=zip_code,
                    rating=item.get("rating", ""),
                    review_count=item.get("reviewCount", ""),
                    category_raw=category_raw,
                    price=item.get("price", ""),
                    source="apify_yelp",
                )
            )

        elapsed = time.time() - start_time
        log_event("apify_yelp", "scrape_end", total_records=len(records), elapsed_seconds=elapsed)

        metrics = compute_metrics(records)
        print(f"  Apify Yelp: {len(records)} raw records")
        print(f"    Quality: {metrics['valid_coords_pct']}% coords, {metrics['phone_pct']}% phone, {metrics['website_pct']}% website, {metrics['rating_pct']}% rating")
        log_event("apify_yelp", "metrics", **metrics)

        return records
    except Exception as e:
        log_event("apify_yelp", "error", error=str(e))
        print(f"  Apify Yelp error: {e}")
        return []


# ── Source: SerpApi ───────────────────────────────────────────────
def scrape_serpapi(
    master_csv: Optional[str] = None,
    limit: int = 100,
    target: str = "missing-rating",
    max_workers: int = 5,
) -> List[Dict[str, str]]:
    """
    Enrich existing records via SerpApi using concurrent requests.

    target controls which records to query:
      missing-rating   — rows with no rating_primary_value (original behavior)
      missing-website  — rows with no website
      missing-address  — rows with no address
      missing-reviews  — rows with no rating_primary_review_count
      any-gap          — rows missing ANY of: website, address, rating, review_count
    
    max_workers controls concurrent request threads (default 5).
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

    # Helper function for concurrent querying
    def query_business(row: tuple) -> Optional[Dict[str, str]]:
        """Query a single business and return enrichment record, or None."""
        idx, row_data = row
        name = str(row_data.get("business_name", ""))
        if not name:
            return None

        # Build search query
        address = str(row_data.get("address", "")) if pd.notna(row_data.get("address")) else ""
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
        
        def serpapi_request():
            search = GoogleSearch(params)
            return search.get_dict()
        
        try:
            results = retry_request(serpapi_request, max_retries=2, backoff_factor=1.5, initial_delay=0.5)
            if results is None:
                return None
            
            local = results.get("local_results", [])

            # Also check place_results (single-place match)
            if not local and "place_results" in results:
                place = results["place_results"]
                if place.get("rating"):
                    local = [place]

            if local:
                top = local[0]
                return _raw(
                    name=name,
                    phone=top.get("phone", ""),
                    website=top.get("website", ""),
                    address=top.get("address", ""),
                    rating=top.get("rating", ""),
                    review_count=top.get("reviews", top.get("reviews_original", "")),
                    category_raw=top.get("type", ""),
                    source="serpapi",
                )
            else:
                return None
        except Exception as e:
            print(f"    Error for {name}: {e}")
            return None

    records: List[Dict[str, str]] = []
    total = len(targets)
    errors = 0
    no_results = 0
    start_time = time.time()

    print(f"  Querying {total} businesses with {max_workers} concurrent workers...")
    log_event("serpapi", "scrape_start", mode="enrichment", target=target, num_targets=total, max_workers=max_workers)

    # Use ThreadPoolExecutor for concurrent requests
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        futures = {
            executor.submit(query_business, (idx, row)): idx
            for idx, row in targets.iterrows()
        }

        # Process completed futures as they finish
        completed = 0
        for future in as_completed(futures):
            completed += 1
            result = future.result()
            if result:
                records.append(result)
            else:
                no_results += 1

            # Progress update every 25 queries
            if completed % 25 == 0 or completed == total:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                remaining = (total - completed) / rate if rate > 0 else 0
                eta_time = datetime.now() + timedelta(seconds=remaining)
                print(
                    f"    [{completed}/{total}] {rate:.1f} rec/sec, "
                    f"{len(records)} matched, {no_results} no results, ETA {eta_time.strftime('%H:%M')}"
                )
                log_event("serpapi", "progress", target=target, completed=completed, total=total, 
                          matched=len(records), no_results=no_results, rate=round(rate, 2))

    elapsed = time.time() - start_time
    log_event("serpapi", "scrape_end", mode="enrichment", target=target, total_records=len(records),
              no_results=no_results, errors=errors, elapsed_seconds=round(elapsed, 2))
    
    metrics = compute_metrics(records)
    print(f"  SerpApi: {len(records)} enrichment records ({no_results} no results, {errors} errors)")
    print(f"    Quality: {metrics['phone_pct']}% phone, {metrics['website_pct']}% website, {metrics['rating_pct']}% rating")
    log_event("serpapi", "metrics", mode="enrichment", target=target, **metrics)
    
    return records


# ── Source: SerpApi Directory Scrape ──────────────────────────────
def scrape_serpapi_directory() -> List[Dict[str, str]]:
    """
    Scrape business directory searches via SerpApi to fill gaps.
    
    This looks for Coral Gables business listings, Chamber directory,
    and general local business search results that might not be heavily
    reviewed on Google Maps.
    """
    if not SERPAPI_KEY:
        print("  ERROR: SERPAPI_KEY not set")
        return []

    from serpapi import GoogleSearch

    queries = [
        "Coral Gables Chamber of Commerce business directory",
        "Coral Gables business listings",
        "Coral Gables registered businesses",
        "Coral Gables commercial directory",
        "local businesses Coral Gables FL 33134",
        "local businesses Coral Gables FL 33146",
    ]

    records: List[Dict[str, str]] = []
    total = len(queries)
    errors = 0

    print(f"  Querying {total} directory searches...")
    log_event("directory", "scrape_start", num_queries=total)
    start_time = time.time()

    for i, query in enumerate(queries, 1):
        params = {
            "engine": "google",
            "q": query,
            "api_key": SERPAPI_KEY,
        }
        
        def directory_request():
            search = GoogleSearch(params)
            return search.get_dict()
        
        try:
            results = retry_request(directory_request, max_retries=2, backoff_factor=1.5, initial_delay=0.5)
            if results is None:
                print(f"    [{i}/{total}] directory query failed after retries")
                log_event("directory", "query_failed", query=query, reason="retries_exhausted")
                continue
            
            # Try to extract business links from organic results
            organic = results.get("organic_results", [])
            for result in organic:
                title = result.get("title", "")
                # Filter for actual business listings, not general pages
                if title and any(x in title.lower() for x in ["directory", "listings", "businesses", "companies"]):
                    # These are often directory pages; we'd need to scrape them further
                    # For now, just log them
                    pass
            
            # Also check knowledge graph if available
            kg = results.get("knowledge_graph", {})
            if kg.get("title"):
                # Might contain business info
                pass
            
            if (i % 2) == 0 or i == total:
                print(f"    [{i}/{total}] directory queries completed")
            
            log_event("directory", "query_success", query=query)
                
        except Exception as e:
            errors += 1
            print(f"    Error for query '{query}': {e}")
            log_event("directory", "error", query=query, error=str(e))

    elapsed = time.time() - start_time
    log_event("directory", "scrape_end", total_records=len(records), errors=errors, elapsed_seconds=round(elapsed, 2))
    
    metrics = compute_metrics(records)
    print(f"  SerpApi Directory: {len(records)} directory records ({errors} errors)")
    if records:
        print(f"    Quality: {metrics['valid_coords_pct']}% coords, {metrics['phone_pct']}% phone, {metrics['website_pct']}% website")
    print(f"  Note: Directory scrape requires follow-up HTML parsing. See comments for expansion.")
    log_event("directory", "metrics", **metrics)
    
    return records
def scrape_osm() -> List[Dict[str, str]]:
    """Run 10-chunk × 4-sector Overpass queries against OSM. Free, no key.
    
    Sectors split Coral Gables into geographic quadrants to avoid Overpass
    result truncation on large area queries.
    """
    log_event("osm", "scrape_start", num_sectors=len(CORAL_GABLES_SECTORS), num_chunks=len(OSM_CHUNKS))
    start_time = time.time()
    
    records: List[Dict[str, str]] = []
    seen_ids: set = set()
    chunk_results = {}

    for sector_name, bbox in CORAL_GABLES_SECTORS.items():
        for chunk_name, base_query in OSM_CHUNKS.items():
            # Replace OSM_BBOX in the base query with sector-specific bbox
            bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
            query = base_query.replace(f"({OSM_BBOX})", f"({bbox_str})")
            
            chunk_id = f"{sector_name}/{chunk_name}"
            print(f"    OSM: {chunk_id}...", end=" ")
            
            # Define request function for retry logic
            def osm_request():
                return requests.post(
                    OVERPASS_URL, data={"data": query}, timeout=100
                )
            
            try:
                resp = retry_request(osm_request, max_retries=3, backoff_factor=2.0, initial_delay=2.0)
                if resp is None:
                    print("Failed (no response after retries)")
                    log_event("osm", "chunk_failed", sector=sector_name, chunk=chunk_name, reason="retries_exhausted")
                    continue
                
                if resp.status_code != 200:
                    print(f"HTTP {resp.status_code}")
                    log_event("osm", "chunk_failed", sector=sector_name, chunk=chunk_name, http_status=resp.status_code)
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
                chunk_results[chunk_id] = new
                log_event("osm", "chunk_success", sector=sector_name, chunk=chunk_name, records=new)
                time.sleep(2)  # be polite to Overpass
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                log_event("osm", "error", sector=sector_name, chunk=chunk_name, error_type="JSON", error=str(e))
            except Exception as e:
                print(f"Error: {e}")
                log_event("osm", "error", sector=sector_name, chunk=chunk_name, error=str(e))

    elapsed = time.time() - start_time
    log_event("osm", "scrape_end", total_records=len(records), total_deduped_ids=len(seen_ids), 
              elapsed_seconds=elapsed, chunks_successful=len(chunk_results))
    
    metrics = compute_metrics(records)
    print(f"  OSM: {len(records)} total raw records from {len(CORAL_GABLES_SECTORS)} sectors")
    print(f"    Quality: {metrics['valid_coords_pct']}% coords, {metrics['phone_pct']}% phone, {metrics['website_pct']}% website, {metrics['category_pct']}% category")
    log_event("osm", "metrics", **metrics)
    
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

    # Post-write validation
    metrics = compute_metrics(records)
    log_event("staging", "write_validation", scrape_source=source, filename=str(filename), **metrics)
    
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
  python "1. agent1-osint.py" --source apify_yelp
  python "1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv
  python "1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --workers 10
  python "1. agent1-osint.py" --source osm
  python "1. agent1-osint.py" --source directory
        """,
    )
    parser.add_argument(
        "--source",
        required=True,
        choices=["outscraper", "apify", "apify_yelp", "serpapi", "osm", "directory"],
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
    parser.add_argument(
        "--workers",
        type=int,
        default=5,
        help="Number of concurrent threads for SerpApi enrichment (default: 5)",
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  AGENT 1 — DISCOVERY SCRAPER")
    print(f"  Source: {args.source} | Run: {args.run}")
    print(f"{'='*60}\n")

    log_event("agent1", "pipeline_start", scrape_source=args.source, run=args.run,
              workers=getattr(args, 'workers', None), target=getattr(args, 'target', None))

    if args.source == "outscraper":
        records = scrape_outscraper(args.run)
    elif args.source == "apify":
        records = scrape_apify()
    elif args.source == "apify_yelp":
        records = scrape_apify_yelp()
    elif args.source == "serpapi":
        records = scrape_serpapi(args.master, args.limit, args.target, args.workers)
    elif args.source == "directory":
        records = scrape_serpapi_directory()
    elif args.source == "osm":
        records = scrape_osm()
    else:
        records = []

    staging_path = write_staging(records, args.source, args.run)
    
    log_event("agent1", "pipeline_end", scrape_source=args.source, total_records=len(records), staging_file=staging_path)

    print(f"\n  Done. {len(records)} records collected.")
    if staging_path:
        print(f"  Staging: {staging_path}")
    print(f"  Logs: {LOG_FILE}")
    print(f"  Next: run Agent 2 to validate and merge.\n")


if __name__ == "__main__":
    main()
