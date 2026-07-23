#!/usr/bin/env python3
"""
Agent 8 — Web Enricher
=======================
Enriches unmatched leads by searching paid APIs (SerpApi, Outscraper)
for business information based on company name or website domain.

Strategies (in order):
  1. SerpApi Google Maps — search company name + location → phone, website, address, rating
  2. Outscraper Google Maps — secondary source for remaining unmatched leads
  3. Domain inference — for leads with website but no company, search the domain directly

Data pulled on match:
  - phone (if contact has none)
  - company (if contact has none)
  - business address, rating, review count
  - business category
  - website (if missing)

Usage:
  python "8. agent8-web-enricher.py" --leads data/leadgen.csv
  python "8. agent8-web-enricher.py" --leads data/leadgen.csv --serpapi-limit 500
  python "8. agent8-web-enricher.py" --leads data/leadgen.csv --dry-run
  python "8. agent8-web-enricher.py" --leads data/leadgen.csv --source outscraper

Requirements:
  pip install pandas google-search-results outscraper
"""

import argparse
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from _shared import name_similarity, normalize_key, normalize_phone

# ── API keys ────────────────────────────────────────────────────────

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
OUTSCRAPER_KEY = os.environ.get("OUTSCRAPER_KEY", "")

# Minimum noise-stripped name similarity (0-100) to accept a search result as
# the same business as the lead when there is no phone/domain corroboration.
NAME_MATCH_THRESHOLD = 82


# ── Retry logic (mirrors Agent 1) ──────────────────────────────────

def retry_request(func, max_retries: int = 3, backoff_factor: float = 2.0,
                  initial_delay: float = 1.0):
    """Retry with exponential backoff."""
    import requests
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"      Retry {attempt + 1}/{max_retries - 1}: {type(e).__name__}, waiting {delay}s...")
                time.sleep(delay)
                delay *= backoff_factor
            else:
                print(f"      Failed after {max_retries} attempts: {type(e).__name__}")
    return None


# ── SerpApi search ──────────────────────────────────────────────────

def serpapi_search(query: str) -> Optional[Dict]:
    """
    Search Google Maps via SerpApi and return top result fields.
    Returns dict with phone, website, address, rating, reviews, category or None.
    """
    from serpapi import GoogleSearch

    params = {
        "engine": "google_maps",
        "q": query,
        "type": "search",
        "api_key": SERPAPI_KEY,
    }

    def do_search():
        search = GoogleSearch(params)
        return search.get_dict()

    results = retry_request(do_search, max_retries=2, backoff_factor=1.5, initial_delay=0.5)
    if results is None:
        return None

    # Check local_results first, then place_results
    local = results.get("local_results", [])
    if not local and "place_results" in results:
        place = results["place_results"]
        if place.get("title"):
            local = [place]

    if not local:
        return None

    top = local[0]
    return {
        "business_name": str(top.get("title", "")).strip(),
        "phone": str(top.get("phone", "")).strip(),
        "website": str(top.get("website", "")).strip(),
        "address": str(top.get("address", "")).strip(),
        "rating": str(top.get("rating", "")).strip(),
        "reviews": str(top.get("reviews", top.get("reviews_original", ""))).strip(),
        "category": str(top.get("type", "")).strip(),
    }


# ── Outscraper search ──────────────────────────────────────────────

def outscraper_search(query: str, client) -> Optional[Dict]:
    """
    Search Google Maps via Outscraper and return top result fields.
    """
    def do_search():
        return client.google_maps_search([query], limit=1, language="en", region="US")

    results = retry_request(do_search, max_retries=2, backoff_factor=2.0, initial_delay=1.0)
    if results is None:
        return None

    for batch in results:
        for place in batch:
            name = place.get("name", "")
            if not name:
                continue
            return {
                "business_name": str(name).strip(),
                "phone": str(place.get("phone", "")).strip(),
                "website": str(place.get("site", "")).strip(),
                "address": str(place.get("full_address", "")).strip(),
                "rating": str(place.get("rating", "")).strip(),
                "reviews": str(place.get("reviews", "")).strip(),
                "category": str(place.get("type", "")).strip(),
            }
    return None


# ── Build search query ──────────────────────────────────────────────

def build_query(lead: pd.Series) -> str:
    """Build a Google Maps search query from lead data."""
    company = lead.get("company", "").strip()
    domain = lead.get("company_website", "").strip()
    city = lead.get("city", "").strip()
    state = lead.get("state", "").strip()

    # Prefer company name
    if company:
        base = company
    elif domain:
        # Strip TLD and use domain as search term
        base = re.sub(r"\.(com|net|org|io|co|us|biz|solutions|group|travel|world)$", "", domain)
        base = base.replace(".", " ").replace("-", " ")
    else:
        return ""

    # Add location context
    if city and state:
        return f"{base}, {city}, {state}"
    elif city:
        return f"{base}, {city}"
    elif state:
        return f"{base}, {state}"
    else:
        return base


# ── Result verification ─────────────────────────────────────────────

def _domain_root(url: str) -> str:
    """Extract the registrable-ish domain (host minus protocol/www/path/port)."""
    if not url:
        return ""
    host = re.sub(r"^\w+://", "", url.strip().lower())
    host = host.split("/")[0].split("?")[0].split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host


def _domain_stem(url: str) -> str:
    """The bare second-level domain, alphanumeric only (e.g. 'bellagables')."""
    root = _domain_root(url)
    if not root:
        return ""
    parts = root.split(".")
    stem = parts[-2] if len(parts) >= 2 else parts[0]
    return re.sub(r"[^a-z0-9]", "", stem)


def is_confident_match(lead: pd.Series, result: Dict,
                       name_threshold: int = NAME_MATCH_THRESHOLD) -> bool:
    """
    Decide whether a search result actually refers to the same business as the
    lead before we copy any of its fields. A mismatched top result is the main
    cause of wrong websites/categories, so we require at least one corroborating
    signal:

      1. Phone match  — lead phone == result phone (strongest)
      2. Domain match — lead website domain == result website domain
      3. Name match   — noise-stripped name similarity >= threshold
      4. Domain-only lead — the domain stem appears in the result name

    Returns False (reject) when none hold.
    """
    company = str(lead.get("company", "")).strip()
    domain = str(lead.get("company_website", "")).strip()
    res_name = result.get("business_name", "")
    res_phone = result.get("phone", "")
    res_site = result.get("website", "")

    # 1. Phone corroboration
    lead_phone = normalize_phone(str(lead.get("phone", "")))
    if lead_phone and res_phone and normalize_phone(res_phone) == lead_phone:
        return True

    # 2. Domain corroboration
    if domain and res_site:
        d, rs = _domain_root(domain), _domain_root(res_site)
        if d and rs and d == rs:
            return True

    # 3. Name similarity (needs a company name to compare against)
    if company and res_name and name_similarity(company, res_name) >= name_threshold:
        return True

    # 4. Domain-only lead: require the domain stem to surface in the result name
    if not company and domain and res_name:
        stem = _domain_stem(domain)
        if stem and len(stem) >= 4 and stem in normalize_key(res_name):
            return True

    return False


# ── Apply result to lead ───────────────────────────────────────────

def apply_result(leads: pd.DataFrame, idx: int, lead: pd.Series,
                 result: Dict, source: str) -> bool:
    """
    Apply a VERIFIED search result to the lead row. Every field is written only
    when the lead's own value is blank, so a match never overwrites data the
    lead already had. Callers must gate on is_confident_match() first.
    Returns True if any field was updated.
    """
    updated = False

    # Match provenance (always recorded for accepted matches)
    leads.at[idx, "match_type"] = f"web_{source}"
    leads.at[idx, "matched_business"] = result.get("business_name", "")

    # Phone
    if not lead.get("phone", "").strip() and result.get("phone", ""):
        phone = normalize_phone(result["phone"])
        if phone:
            leads.at[idx, "phone"] = phone
            updated = True

    # Company
    if not lead.get("company", "").strip() and result.get("business_name", ""):
        leads.at[idx, "company"] = result["business_name"]
        updated = True

    # Website
    if not lead.get("company_website", "").strip() and result.get("website", ""):
        leads.at[idx, "company_website"] = result["website"]
        updated = True

    # Address (only fill blanks — never clobber existing)
    if not str(lead.get("business_address", "")).strip() and result.get("address", ""):
        leads.at[idx, "business_address"] = result["address"]
        updated = True

    # Rating
    if not str(lead.get("business_rating", "")).strip() and result.get("rating", ""):
        leads.at[idx, "business_rating"] = result["rating"]
        updated = True

    # Reviews
    if not str(lead.get("business_review_count", "")).strip():
        reviews = result.get("reviews", "")
        if reviews:
            reviews_clean = re.sub(r"[^\d]", "", str(reviews))
            if reviews_clean:
                leads.at[idx, "business_review_count"] = reviews_clean
                updated = True

    # Category
    if not str(lead.get("enriched_category", "")).strip() and result.get("category", ""):
        leads.at[idx, "enriched_category"] = result["category"]
        updated = True

    return updated


# ── Main pipeline ───────────────────────────────────────────────────

def run_web_enricher(leads_path: str, source: str = "serpapi",
                     serpapi_limit: int = 1000, outscraper_limit: int = 400,
                     max_workers: int = 5, dry_run: bool = False):
    """Execute the web enrichment pipeline."""

    print(f"\n{'='*60}")
    print(f"  Agent 8 — Web Enricher ({source})")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # ── Load data ─────────────────────────────────────────────
    leads = pd.read_csv(leads_path, dtype=str).fillna("")
    total = len(leads)
    print(f"Loaded {total} leads")

    # Ensure enrichment columns exist
    for col in ["match_type", "matched_business", "business_address",
                "business_rating", "business_review_count", "rating_source",
                "enriched_category", "chamber_member", "osint_confidence",
                "validation_tier"]:
        if col not in leads.columns:
            leads[col] = ""

    # ── Identify targets ──────────────────────────────────────
    unmatched = leads[leads["match_type"] == ""]
    # Leads with something searchable
    has_company = unmatched["company"].str.strip() != ""
    has_website = unmatched["company_website"].str.strip() != ""
    searchable = unmatched[has_company | has_website]

    already_matched = total - len(unmatched)
    print(f"Already matched: {already_matched}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"Searchable (have company or website): {len(searchable)}")

    if len(searchable) == 0:
        print("\nNo searchable leads to enrich.")
        return leads

    # ── Run enrichment ────────────────────────────────────────
    if source == "serpapi":
        leads = _run_serpapi(leads, searchable, serpapi_limit, max_workers)
    elif source == "outscraper":
        leads = _run_outscraper(leads, searchable, outscraper_limit)
    elif source == "both":
        # SerpApi first, then Outscraper for remaining
        leads = _run_serpapi(leads, searchable, serpapi_limit, max_workers)
        # Recalculate unmatched after SerpApi
        still_unmatched = leads[leads["match_type"] == ""]
        still_searchable = still_unmatched[
            (still_unmatched["company"].str.strip() != "") |
            (still_unmatched["company_website"].str.strip() != "")
        ]
        if len(still_searchable) > 0:
            print(f"\n{'─'*60}")
            print(f"  Outscraper pass for {len(still_searchable)} remaining leads")
            print(f"{'─'*60}")
            leads = _run_outscraper(leads, still_searchable, outscraper_limit)

    # ── Summary ───────────────────────────────────────────────
    matched_total = (leads["match_type"] != "").sum()
    has_phone = (leads["phone"].str.strip() != "").sum()
    has_company_name = (leads["company"].str.strip() != "").sum()
    has_rating = (leads["business_rating"].str.strip() != "").sum()
    has_address = (leads["business_address"].str.strip() != "").sum()

    print(f"\n{'='*60}")
    print(f"  ENRICHMENT SUMMARY")
    print(f"{'='*60}")
    print(f"  Total leads:           {total}")
    print(f"  Matched to any source: {matched_total}/{total} ({round(matched_total/total*100,1)}%)")
    print(f"  Still unmatched:       {total - matched_total}")
    print(f"  ─────────────────────────────────")
    print(f"  Has company:           {has_company_name}/{total} ({round(has_company_name/total*100,1)}%)")
    print(f"  Has phone:             {has_phone}/{total} ({round(has_phone/total*100,1)}%)")
    print(f"  Has business rating:   {has_rating}/{total}")
    print(f"  Has business address:  {has_address}/{total}")
    print(f"{'='*60}")

    # ── Write ─────────────────────────────────────────────────
    if dry_run:
        print(f"\n[DRY RUN] Would write {total} rows to {leads_path}")
        web_matched = leads[leads["match_type"].str.startswith("web_", na=False)].head(10)
        if len(web_matched) > 0:
            print(web_matched[["company", "match_type", "phone", "business_rating"]].to_string(index=False))
    else:
        leads.to_csv(leads_path, index=False)
        print(f"\nWrote {total} enriched leads to {leads_path}")

    return leads


def _run_serpapi(leads: pd.DataFrame, searchable: pd.DataFrame,
                 limit: int, max_workers: int) -> pd.DataFrame:
    """Run SerpApi enrichment on searchable leads."""
    if not SERPAPI_KEY:
        print("\n  ERROR: SERPAPI_KEY not set. Skipping SerpApi.")
        return leads

    from serpapi import GoogleSearch  # verify import

    targets = searchable.head(limit)
    total_targets = len(targets)
    print(f"\n[SerpApi] Querying {total_targets} leads (limit: {limit}, workers: {max_workers})...")

    matched = 0
    no_results = 0
    rejected = 0
    errors = 0
    start_time = time.time()

    def query_lead(item):
        idx, lead = item
        query = build_query(lead)
        if not query:
            return idx, None, "no_query"
        try:
            result = serpapi_search(query)
            if result:
                return idx, result, "ok"
            else:
                return idx, None, "no_result"
        except Exception as e:
            return idx, None, f"error: {e}"

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(query_lead, (idx, row)): idx
            for idx, row in targets.iterrows()
        }

        completed = 0
        for future in as_completed(futures):
            completed += 1
            idx, result, status = future.result()

            if result:
                lead = leads.loc[idx]
                if is_confident_match(lead, result):
                    apply_result(leads, idx, lead, result, "serpapi")
                    matched += 1
                else:
                    # Top result is a different business — discard, don't corrupt.
                    rejected += 1
            elif status == "no_result":
                no_results += 1
            else:
                errors += 1

            # Progress every 25
            if completed % 25 == 0 or completed == total_targets:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                remaining = (total_targets - completed) / rate if rate > 0 else 0
                eta = datetime.now() + timedelta(seconds=remaining)
                print(f"    [{completed}/{total_targets}] {rate:.1f}/sec, "
                      f"{matched} matched, {rejected} rejected, {no_results} no results, "
                      f"ETA {eta.strftime('%H:%M')}")

    elapsed = time.time() - start_time
    print(f"\n  SerpApi done: {matched} matched, {rejected} rejected (name mismatch), "
          f"{no_results} no results, {errors} errors in {elapsed:.0f}s")
    return leads


def _run_outscraper(leads: pd.DataFrame, searchable: pd.DataFrame,
                    limit: int) -> pd.DataFrame:
    """Run Outscraper enrichment on searchable leads."""
    if not OUTSCRAPER_KEY:
        print("\n  ERROR: OUTSCRAPER_KEY not set. Skipping Outscraper.")
        return leads

    from outscraper import OutscraperClient
    client = OutscraperClient(api_key=OUTSCRAPER_KEY)

    targets = searchable.head(limit)
    total_targets = len(targets)
    print(f"\n[Outscraper] Querying {total_targets} leads (limit: {limit})...")

    matched = 0
    no_results = 0
    rejected = 0
    start_time = time.time()

    for i, (idx, lead) in enumerate(targets.iterrows()):
        query = build_query(lead)
        if not query:
            continue

        try:
            result = outscraper_search(query, client)
            if result:
                if is_confident_match(lead, result):
                    apply_result(leads, idx, lead, result, "outscraper")
                    matched += 1
                else:
                    # Top result is a different business — discard, don't corrupt.
                    rejected += 1
            else:
                no_results += 1
        except Exception as e:
            print(f"    Error for {query}: {e}")

        # Progress every 25
        done = i + 1
        if done % 25 == 0 or done == total_targets:
            elapsed = time.time() - start_time
            rate = done / elapsed if elapsed > 0 else 0
            print(f"    [{done}/{total_targets}] {rate:.1f}/sec, "
                  f"{matched} matched, {rejected} rejected")

        time.sleep(2)  # Outscraper rate limit

    elapsed = time.time() - start_time
    print(f"\n  Outscraper done: {matched} matched, {rejected} rejected (name mismatch), "
          f"{no_results} no results in {elapsed:.0f}s")
    return leads


# ── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent 8 — Web Enricher")
    parser.add_argument("--leads", required=True, help="Path to leadgen CSV")
    parser.add_argument("--source", choices=["serpapi", "outscraper", "both"],
                        default="serpapi", help="API source (default: serpapi)")
    parser.add_argument("--serpapi-limit", type=int, default=1000,
                        help="Max leads to query via SerpApi (default: 1000)")
    parser.add_argument("--outscraper-limit", type=int, default=400,
                        help="Max leads to query via Outscraper (default: 400)")
    parser.add_argument("--workers", type=int, default=5,
                        help="Concurrent SerpApi workers (default: 5)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing")
    args = parser.parse_args()

    if not Path(args.leads).exists():
        print(f"Error: {args.leads} not found")
        sys.exit(1)

    run_web_enricher(
        leads_path=args.leads,
        source=args.source,
        serpapi_limit=args.serpapi_limit,
        outscraper_limit=args.outscraper_limit,
        max_workers=args.workers,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
