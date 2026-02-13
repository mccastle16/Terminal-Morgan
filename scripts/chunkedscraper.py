#!/usr/bin/env python3
# Bootstrap to recreate full cg_chunked_scraper.py

production_script = r'''#!/usr/bin/env python3
"""
CORAL GABLES OSINT — Monthly Chunked Scraper
=============================================
Production-ready script for running the $0 free-tier stack.
Execute one chunk per month to stay within free tier limits.

Usage:
  python cg_chunked_scraper.py --run 1  # Month 1: Outscraper (restaurants + retail)
  python cg_chunked_scraper.py --run 2  # Month 2: Outscraper (professional + healthcare)
  python cg_chunked_scraper.py --run 3  # Month 3: Apify (gap fill - all categories)
  python cg_chunked_scraper.py --run 4  # Month 4: Outscraper reset (hospitality + wellness)
  python cg_chunked_scraper.py --run 5  # Month 5: SerpApi (place detail enrichment)
  python cg_chunked_scraper.py --run 6  # Month 6: Dedup + Validation + Final merge

Requirements:
  pip install outscraper apify-client google-search-results pandas fuzzywuzzy python-Levenshtein requests
  
API Keys (all free tier — no credit card):
  OUTSCRAPER_KEY  → https://outscraper.com (500 free/month)
  APIFY_TOKEN     → https://apify.com ($5 free credit)
  SERPAPI_KEY     → https://serpapi.com (100 free searches/month)
"""

import argparse
import csv
import json
import os
import re
import time
from collections import Counter
from datetime import datetime

import pandas as pd
import requests

# ============================================================
# CONFIG
# ============================================================
OUTSCRAPER_KEY = os.environ.get('OUTSCRAPER_KEY', 'YOUR_KEY_HERE')
APIFY_TOKEN = os.environ.get('APIFY_TOKEN', 'YOUR_TOKEN_HERE')
SERPAPI_KEY = os.environ.get('SERPAPI_KEY', 'YOUR_KEY_HERE')

CORAL_GABLES_ZIPS = ['33134', '33146', '33133', '33143']
MASTER_CSV = 'all_biz_osint.csv'
STAGING_DIR = 'staging/'

# Category chunks for Outscraper (20 results each = ~500 total per month)
OUTSCRAPER_CHUNKS = {
    1: [  # Month 1: Food & Retail
        'restaurants Coral Gables FL 33134', 'restaurants Coral Gables FL 33146',
        'restaurants Coral Gables FL 33133', 'restaurants Coral Gables FL 33143',
        'cafes Coral Gables FL 33134', 'bars Coral Gables FL 33134',
        'bakeries Coral Gables FL', 'shopping Coral Gables FL 33134',
        'shopping Coral Gables FL 33146', 'clothing stores Coral Gables FL',
        'jewelry stores Coral Gables FL', 'grocery stores Coral Gables FL',
        'wine shops Coral Gables FL', 'florists Coral Gables FL',
        'gift shops Coral Gables FL', 'pet stores Coral Gables FL',
        'bookstores Coral Gables FL', 'electronics Coral Gables FL',
        'furniture stores Coral Gables FL', 'art galleries Coral Gables FL',
    ],
    2: [  # Month 2: Professional & Healthcare
        'lawyers Coral Gables FL 33134', 'lawyers Coral Gables FL 33146',
        'accountants Coral Gables FL', 'insurance agents Coral Gables FL',
        'real estate agents Coral Gables FL', 'financial advisors Coral Gables FL',
        'doctors Coral Gables FL 33134', 'doctors Coral Gables FL 33146',
        'dentists Coral Gables FL', 'pharmacies Coral Gables FL',
        'chiropractors Coral Gables FL', 'dermatologists Coral Gables FL',
        'optometrists Coral Gables FL', 'veterinarians Coral Gables FL',
        'physical therapists Coral Gables FL', 'psychologists Coral Gables FL',
        'architects Coral Gables FL', 'engineers Coral Gables FL',
        'marketing agencies Coral Gables FL', 'IT companies Coral Gables FL',
    ],
    4: [  # Month 4: Hospitality & Wellness & Services
        'hotels Coral Gables FL', 'gyms Coral Gables FL',
        'spas Coral Gables FL', 'yoga studios Coral Gables FL',
        'hair salons Coral Gables FL', 'barbershops Coral Gables FL',
        'nail salons Coral Gables FL', 'beauty salons Coral Gables FL',
        'auto repair Coral Gables FL', 'car dealers Coral Gables FL',
        'dry cleaners Coral Gables FL', 'banks Coral Gables FL',
        'tutoring Coral Gables FL', 'dance studios Coral Gables FL',
        'churches Coral Gables FL', 'nonprofits Coral Gables FL',
        'construction companies Coral Gables FL', 'contractors Coral Gables FL',
        'plumbers Coral Gables FL', 'electricians Coral Gables FL',
    ],
}

os.makedirs(STAGING_DIR, exist_ok=True)


def normalize_key(name):
    k = re.sub(r'[^a-z0-9]', '', name.lower().strip())
    for sfx in ['llc', 'inc', 'llp', 'pa', 'pllc', 'corp']:
        k = k.replace(sfx, '')
    return k.strip()


def load_existing():
    """Load existing master CSV and return set of normalized keys."""
    if os.path.exists(MASTER_CSV):
        df = pd.read_csv(MASTER_CSV)
        return {normalize_key(str(n)) for n in df['business_name'].dropna()}
    return set()


def run_outscraper(run_num):
    """Run Outscraper chunk (Runs 1, 2, 4)."""
    from outscraper import ApiClient
    client = ApiClient(api_key=OUTSCRAPER_KEY)
    
    queries = OUTSCRAPER_CHUNKS.get(run_num, [])
    existing = load_existing()
    new_records = []
    
    for query in queries:
        print(f"  Outscraper: {query}")
        try:
            results = client.google_maps_search_v2([query], limit=25, language='en', region='US')
            for batch in results:
                for place in batch:
                    key = normalize_key(place.get('name', ''))
                    if key in existing:
                        continue
                    existing.add(key)
                    new_records.append({
                        'business_name': place.get('name', ''),
                        'phone': place.get('phone', ''),
                        'website': place.get('site', ''),
                        'address': place.get('full_address', ''),
                        'lat': place.get('latitude', ''),
                        'lon': place.get('longitude', ''),
                        'postcode': place.get('postal_code', ''),
                        'rating': place.get('rating', ''),
                        'review_count': place.get('reviews', ''),
                        'category_raw': place.get('type', ''),
                        'price': place.get('range', ''),
                        'source': 'Outscraper',
                    })
            time.sleep(2)
        except Exception as e:
            print(f"    Error: {e}")
    
    staging_file = f"{STAGING_DIR}outscraper_run{run_num}_{datetime.now().strftime('%Y%m%d')}.csv"
    if new_records:
        pd.DataFrame(new_records).to_csv(staging_file, index=False)
        print(f"  Saved {len(new_records)} new records to {staging_file}")
    return new_records


def run_apify(run_num):
    """Run Apify chunk (Run 3)."""
    from apify_client import ApifyClient
    client = ApifyClient(APIFY_TOKEN)
    
    existing = load_existing()
    new_records = []
    
    searches = []
    for zip_code in CORAL_GABLES_ZIPS:
        for cat in ['restaurant', 'lawyer', 'doctor', 'dentist', 'salon',
                     'real estate', 'insurance', 'gym', 'hotel', 'bank']:
            searches.append(f"{cat} in {zip_code}")
    
    run_input = {
        "searchStringsArray": searches[:20],
        "maxCrawledPlacesPerSearch": 30,
        "language": "en",
        "deeperCityScrape": False,
    }
    
    print("  Starting Apify actor...")
    run = client.actor("compass/crawler-google-places").call(run_input=run_input)
    
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        key = normalize_key(item.get('title', ''))
        if key in existing:
            continue
        existing.add(key)
        new_records.append({
            'business_name': item.get('title', ''),
            'phone': item.get('phone', ''),
            'website': item.get('website', ''),
            'address': item.get('address', ''),
            'lat': item.get('location', {}).get('lat', ''),
            'lon': item.get('location', {}).get('lng', ''),
            'postcode': item.get('postalCode', ''),
            'rating': item.get('totalScore', ''),
            'review_count': item.get('reviewsCount', ''),
            'category_raw': item.get('categoryName', ''),
            'price': item.get('price', ''),
            'source': 'Apify',
        })
    
    staging_file = f"{STAGING_DIR}apify_run{run_num}_{datetime.now().strftime('%Y%m%d')}.csv"
    if new_records:
        pd.DataFrame(new_records).to_csv(staging_file, index=False)
        print(f"  Saved {len(new_records)} new records to {staging_file}")
    return new_records


def run_serpapi(run_num):
    """Run SerpApi enrichment (Run 5)."""
    from serpapi import GoogleSearch
    
    existing_df = pd.read_csv(MASTER_CSV) if os.path.exists(MASTER_CSV) else pd.DataFrame()
    enriched = 0
    
    if not existing_df.empty:
        no_rating = existing_df[existing_df['rating_primary_value'].isna()].head(100)
        
        for _, row in no_rating.iterrows():
            name = row['business_name']
            params = {
                "engine": "google_maps",
                "q": f"{name} Coral Gables FL",
                "type": "search",
                "api_key": SERPAPI_KEY,
            }
            try:
                search = GoogleSearch(params)
                results = search.get_dict()
                local = results.get('local_results', [])
                if local:
                    top = local[0]
                    idx = existing_df[existing_df['business_name'] == name].index
                    if len(idx) > 0:
                        i = idx[0]
                        existing_df.loc[i, 'rating_primary_value'] = top.get('rating', '')
                        existing_df.loc[i, 'rating_primary_source'] = 'Google (SerpApi)'
                        existing_df.loc[i, 'rating_primary_review_count'] = top.get('reviews', '')
                        if pd.isna(existing_df.loc[i, 'phone']) and top.get('phone'):
                            existing_df.loc[i, 'phone'] = top['phone']
                        if pd.isna(existing_df.loc[i, 'website']) and top.get('website'):
                            existing_df.loc[i, 'website'] = top['website']
                        enriched += 1
                time.sleep(1)
            except Exception as e:
                print(f"    Error for {name}: {e}")
        
        if enriched > 0:
            existing_df.to_csv(MASTER_CSV, index=False)
            print(f"  Enriched {enriched} records with ratings from SerpApi")
    return enriched


def run_final_merge(run_num):
    """Final dedup + merge + PKP synthesis (Run 6)."""
    from fuzzywuzzy import fuzz
    
    master_df = pd.read_csv(MASTER_CSV) if os.path.exists(MASTER_CSV) else pd.DataFrame()
    staging_files = [f for f in os.listdir(STAGING_DIR) if f.endswith('.csv')]
    
    new_dfs = []
    for sf in staging_files:
        new_dfs.append(pd.read_csv(os.path.join(STAGING_DIR, sf)))
    
    if new_dfs:
        new_df = pd.concat(new_dfs, ignore_index=True)
        print(f"  Staging records to merge: {len(new_df)}")
        
        existing_names = master_df['business_name'].dropna().tolist()
        merged = 0
        added = 0
        
        for _, row in new_df.iterrows():
            name = str(row.get('business_name', ''))
            if not name:
                continue
            
            best_match = None
            best_score = 0
            for en in existing_names:
                score = fuzz.ratio(name.lower(), en.lower())
                if score > best_score:
                    best_score = score
                    best_match = en
            
            if best_score >= 85:
                idx = master_df[master_df['business_name'] == best_match].index
                if len(idx) > 0:
                    i = idx[0]
                    for col in ['phone', 'website', 'address', 'lat', 'lon', 'postcode']:
                        if pd.isna(master_df.loc[i, col]) and pd.notna(row.get(col)):
                            master_df.loc[i, col] = row[col]
                    if pd.isna(master_df.loc[i, 'rating_primary_value']) and row.get('rating'):
                        master_df.loc[i, 'rating_primary_value'] = row['rating']
                        master_df.loc[i, 'rating_primary_review_count'] = row.get('review_count', '')
                    merged += 1
            else:
                added += 1
        
        print(f"  Merged: {merged} | Added: {added}")
    
    master_df.to_csv(MASTER_CSV, index=False)
    print(f"  Final master: {len(master_df)} records")
    
    for sf in staging_files:
        os.rename(
            os.path.join(STAGING_DIR, sf),
            os.path.join(STAGING_DIR, f"archived_{sf}")
        )


def main():
    parser = argparse.ArgumentParser(description='Coral Gables OSINT Chunked Scraper')
    parser.add_argument('--run', type=int, required=True, choices=[1, 2, 3, 4, 5, 6],
                       help='Run number (1-6)')
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"  CORAL GABLES OSINT — RUN {args.run} / 6")
    print(f"{'='*60}\n")
    
    if args.run in [1, 2, 4]:
        records = run_outscraper(args.run)
        print(f"\n  ✅ Run {args.run} complete: {len(records)} new records")
    elif args.run == 3:
        records = run_apify(args.run)
        print(f"\n  ✅ Run {args.run} complete: {len(records)} new records")
    elif args.run == 5:
        count = run_serpapi(args.run)
        print(f"\n  ✅ Run {args.run} complete: {count} records enriched")
    elif args.run == 6:
        run_final_merge(args.run)
        print(f"\n  ✅ Run {args.run} complete: Final merge done")


if __name__ == '__main__':
    main()
'''

with open('cg_chunked_scraper.py', 'w') as f:
    f.write(production_script)

print("Rebuilt cg_chunked_scraper.py")
