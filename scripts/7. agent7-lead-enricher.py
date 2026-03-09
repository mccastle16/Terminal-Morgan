#!/usr/bin/env python3
"""
Agent 7 — Lead Enricher
=========================
Enriches cleaned lead-gen contacts by cross-referencing against the
master business database and performing domain-based lookups.

Enrichment strategies (in order):
  1. Domain matching  — match contact's email domain against master website domains
  2. Company name matching — fuzzy match contact's company name against master business names
  3. Name backfill — infer missing first/last names from email patterns
  4. Company backfill — for contacts with a company_website but no company name,
     try to find the company in master by domain

Data pulled from master on match:
  - phone (if contact has none)
  - company (if contact has none)
  - business address, city, state
  - rating, review count, rating source
  - business category (as enriched_category)
  - chamber member status
  - osint confidence & validation tier

Usage:
  python "7. agent7-lead-enricher.py" --leads data/leadgen.csv --master data/master_all_businesses.csv
  python "7. agent7-lead-enricher.py" --leads data/leadgen.csv --master data/master_all_businesses.csv --dry-run

Requirements:
  pip install pandas fuzzywuzzy python-Levenshtein
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd

try:
    from fuzzywuzzy import fuzz, process
except ImportError:
    print("Installing fuzzywuzzy...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fuzzywuzzy", "python-Levenshtein"])
    from fuzzywuzzy import fuzz, process

from _shared import normalize_key, normalize_phone


# ── Helpers ─────────────────────────────────────────────────────────

def extract_domain(url: str) -> str:
    """Extract clean domain from a URL or email."""
    if not url or not isinstance(url, str):
        return ""
    url = url.strip().lower()
    # If it's an email, grab domain part
    if "@" in url:
        return url.split("@")[-1].strip()
    # Strip protocol
    if not url.startswith("http"):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        # Remove www. prefix
        domain = re.sub(r"^www\.", "", domain)
        # Remove port
        domain = domain.split(":")[0]
        # Remove trailing path
        domain = domain.split("/")[0]
        return domain
    except Exception:
        return ""


def infer_name_from_email(email: str) -> tuple:
    """
    Try to extract first and last name from email local part.
    Returns (first_name, last_name) or ("", "").

    Common patterns:
      john.doe@company.com     → John, Doe
      john_doe@company.com     → John, Doe
      jdoe@company.com         → (skip, too ambiguous)
      john@company.com         → John, ""
      john.a.doe@company.com   → John, Doe
    """
    if not email or "@" not in email:
        return "", ""
    local = email.split("@")[0].lower().strip()

    # Skip generic/role addresses
    generic = {"info", "admin", "support", "sales", "contact", "help",
               "marketing", "press", "reception", "service", "services",
               "customerservice", "accounts", "billing", "hr", "guru",
               "newsletter", "team", "office", "hello", "shipping",
               "payables", "res", "pst"}
    if local in generic:
        return "", ""

    # Try splitting on . or _
    parts = re.split(r"[._]", local)
    parts = [p for p in parts if p and len(p) > 1]

    if len(parts) >= 2:
        first = parts[0].title()
        last = parts[-1].title()
        # Skip if looks like initials (single char parts)
        if len(parts[0]) <= 1:
            return "", ""
        return first, last
    elif len(parts) == 1 and len(parts[0]) > 2:
        # Single word — could be first name
        return parts[0].title(), ""
    return "", ""


# ── Master index builders ───────────────────────────────────────────

def build_domain_index(master_df: pd.DataFrame) -> dict:
    """
    Build domain → list of master row indices.
    Extracts domains from the 'website' column.
    """
    index = {}
    for idx, row in master_df.iterrows():
        website = str(row.get("website", "")).strip()
        if not website:
            continue
        domain = extract_domain(website)
        if domain:
            index.setdefault(domain, []).append(idx)
    return index


def build_name_index(master_df: pd.DataFrame) -> dict:
    """
    Build normalized_name → list of master row indices.
    """
    index = {}
    for idx, row in master_df.iterrows():
        name = str(row.get("business_name", "")).strip()
        if not name:
            continue
        key = normalize_key(name)
        if key:
            index.setdefault(key, []).append(idx)
    return index


# ── Match scoring ───────────────────────────────────────────────────

def best_master_row(master_df: pd.DataFrame, indices: list) -> pd.Series:
    """
    Given multiple master row candidates, pick the best one
    (highest osint_confidence, then most complete data).
    """
    if len(indices) == 1:
        return master_df.loc[indices[0]]

    best_idx = indices[0]
    best_score = -1
    for idx in indices:
        row = master_df.loc[idx]
        score = 0
        try:
            score += float(row.get("osint_confidence", 0) or 0) * 10
        except (ValueError, TypeError):
            pass
        if row.get("phone", "").strip():
            score += 2
        if row.get("website", "").strip():
            score += 2
        if row.get("address", "").strip():
            score += 1
        if row.get("rating_primary_value", "").strip():
            score += 1
        if score > best_score:
            best_score = score
            best_idx = idx
    return master_df.loc[best_idx]


# ── Enrichment logic ────────────────────────────────────────────────

def enrich_from_master(lead: pd.Series, master_row: pd.Series, match_type: str) -> dict:
    """
    Pull fields from a matched master row into the lead.
    Only fills blanks — never overwrites existing data.
    """
    updates = {"match_type": match_type, "matched_business": str(master_row.get("business_name", ""))}

    # Phone
    if not lead.get("phone", "").strip() and master_row.get("phone", "").strip():
        updates["phone"] = normalize_phone(str(master_row["phone"]))

    # Company name
    if not lead.get("company", "").strip() and master_row.get("business_name", "").strip():
        updates["company"] = str(master_row["business_name"]).strip()

    # Address
    if master_row.get("address", "").strip():
        updates["business_address"] = str(master_row["address"]).strip()

    # City/State (only if lead is missing them)
    if not lead.get("city", "").strip():
        neighborhood = str(master_row.get("neighborhood_area", "")).strip()
        if neighborhood:
            updates["city"] = neighborhood

    # Rating info
    rating = str(master_row.get("rating_primary_value", "")).strip()
    if rating:
        updates["business_rating"] = rating
    reviews = str(master_row.get("rating_primary_review_count", "")).strip()
    if reviews:
        updates["business_review_count"] = reviews
    source = str(master_row.get("rating_primary_source", "")).strip()
    if source:
        updates["rating_source"] = source

    # Business category from master
    cat = str(master_row.get("category_primary", "")).strip()
    if cat:
        updates["enriched_category"] = cat

    # Chamber membership
    chamber = str(master_row.get("chamber_member", "")).strip()
    if chamber:
        updates["chamber_member"] = chamber

    # Confidence & validation
    conf = str(master_row.get("osint_confidence", "")).strip()
    if conf:
        updates["osint_confidence"] = conf
    tier = str(master_row.get("validation_tier", "")).strip()
    if tier:
        updates["validation_tier"] = tier

    return updates


# ── Main pipeline ───────────────────────────────────────────────────

def run_enricher(leads_path: str, master_path: str, dry_run: bool = False):
    """Execute the enrichment pipeline."""

    print(f"\n{'='*60}")
    print(f"  Agent 7 — Lead Enricher")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # ── Load data ───────────────────────────────────────────────
    leads = pd.read_csv(leads_path, dtype=str).fillna("")
    master = pd.read_csv(master_path, dtype=str).fillna("")
    print(f"Loaded {len(leads)} leads, {len(master)} master businesses\n")

    # ── Build indices ───────────────────────────────────────────
    print("[1] Building master indices...")
    domain_index = build_domain_index(master)
    name_index = build_name_index(master)
    print(f"    Domain index: {len(domain_index)} unique domains")
    print(f"    Name index:   {len(name_index)} unique business names")

    # Also build a list of master business names for fuzzy matching
    master_names = list(name_index.keys())

    # ── Prepare new columns ─────────────────────────────────────
    new_cols = [
        "match_type", "matched_business", "business_address",
        "business_rating", "business_review_count", "rating_source",
        "enriched_category", "chamber_member", "osint_confidence",
        "validation_tier",
    ]
    for col in new_cols:
        if col not in leads.columns:
            leads[col] = ""

    # ── Strategy 1: Domain matching ─────────────────────────────
    print("\n[2] Domain matching (email domain → master website)...")
    domain_matches = 0
    for idx, lead in leads.iterrows():
        if lead.get("match_type", ""):
            continue  # already matched
        domain = lead.get("company_website", "").strip()
        if not domain:
            continue
        if domain in domain_index:
            master_row = best_master_row(master, domain_index[domain])
            updates = enrich_from_master(lead, master_row, "domain")
            for k, v in updates.items():
                leads.at[idx, k] = v
            domain_matches += 1
    print(f"    Matched: {domain_matches} leads via email domain")

    # ── Strategy 2: Company name matching ───────────────────────
    print("\n[3] Company name matching (fuzzy against master)...")
    name_matches = 0
    unmatched_with_company = []
    for idx, lead in leads.iterrows():
        if lead.get("match_type", ""):
            continue
        company = lead.get("company", "").strip()
        if not company:
            continue

        key = normalize_key(company)
        if not key:
            continue

        # Exact match first
        if key in name_index:
            master_row = best_master_row(master, name_index[key])
            updates = enrich_from_master(lead, master_row, "name_exact")
            for k, v in updates.items():
                leads.at[idx, k] = v
            name_matches += 1
            continue

        # Fuzzy match
        result = process.extractOne(key, master_names, scorer=fuzz.ratio, score_cutoff=82)
        if result:
            matched_key, score = result[0], result[1]
            master_row = best_master_row(master, name_index[matched_key])
            updates = enrich_from_master(lead, master_row, f"name_fuzzy({score})")
            for k, v in updates.items():
                leads.at[idx, k] = v
            name_matches += 1
        else:
            unmatched_with_company.append(company)

    print(f"    Matched: {name_matches} leads via company name")
    print(f"    Unmatched (have company but no master hit): {len(unmatched_with_company)}")

    # ── Strategy 3: Name backfill from email ────────────────────
    print("\n[4] Name backfill from email patterns...")
    names_filled = 0
    for idx, lead in leads.iterrows():
        first = lead.get("first_name", "").strip()
        last = lead.get("last_name", "").strip()
        if first and last:
            continue
        email = lead.get("email", "")
        inferred_first, inferred_last = infer_name_from_email(email)
        changed = False
        if not first and inferred_first:
            leads.at[idx, "first_name"] = inferred_first
            changed = True
        if not last and inferred_last:
            leads.at[idx, "last_name"] = inferred_last
            changed = True
        if changed:
            # Rebuild full_name
            f = leads.at[idx, "first_name"].strip()
            l = leads.at[idx, "last_name"].strip()
            leads.at[idx, "full_name"] = f"{f} {l}".strip()
            # Clear name flag if we recovered a name
            if f:
                leads.at[idx, "name_flag"] = ""
            names_filled += 1
    print(f"    Names recovered from email: {names_filled}")

    # ── Strategy 4: Company backfill from domain ────────────────
    print("\n[5] Company backfill (matched businesses → company name)...")
    company_filled = 0
    for idx, lead in leads.iterrows():
        if lead.get("company", "").strip():
            continue
        matched = lead.get("matched_business", "").strip()
        if matched:
            leads.at[idx, "company"] = matched
            company_filled += 1
    print(f"    Company names filled from matches: {company_filled}")

    # ── Summary ─────────────────────────────────────────────────
    total = len(leads)
    matched_total = (leads["match_type"] != "").sum()

    print(f"\n{'='*60}")
    print(f"  ENRICHMENT SUMMARY")
    print(f"{'='*60}")
    print(f"  Total leads:           {total}")
    print(f"  Matched to master:     {matched_total}/{total} ({round(matched_total/total*100,1)}%)")
    print(f"    via domain:          {domain_matches}")
    print(f"    via company name:    {name_matches}")
    print(f"  Unmatched:             {total - matched_total}")
    print(f"  ─────────────────────────────────")
    print(f"  Has company:           {(leads['company'] != '').sum()}/{total} ({round((leads['company'] != '').sum()/total*100,1)}%)")
    print(f"  Has phone:             {(leads['phone'] != '').sum()}/{total} ({round((leads['phone'] != '').sum()/total*100,1)}%)")
    print(f"  Has business rating:   {(leads['business_rating'] != '').sum()}/{total}")
    print(f"  Has business address:  {(leads['business_address'] != '').sum()}/{total}")
    print(f"  Has chamber status:    {(leads['chamber_member'] != '').sum()}/{total}")
    print(f"  Has full name:         {(leads['full_name'].str.strip() != '').sum()}/{total}")
    print(f"  Names recovered:       {names_filled}")
    print(f"{'='*60}")

    # ── Write ───────────────────────────────────────────────────
    if dry_run:
        print(f"\n[DRY RUN] Would write {total} rows to {leads_path}")
        # Show some matched examples
        matched = leads[leads["match_type"] != ""].head(10)
        print(matched[["email", "company", "match_type", "matched_business", "business_rating"]].to_string(index=False))
    else:
        leads.to_csv(leads_path, index=False)
        print(f"\nWrote {total} enriched leads to {leads_path}")

    return leads


# ── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent 7 — Lead Enricher")
    parser.add_argument("--leads", required=True, help="Path to cleaned leadgen CSV")
    parser.add_argument("--master", required=True, help="Path to master business CSV")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    for path in [args.leads, args.master]:
        if not Path(path).exists():
            print(f"Error: {path} not found")
            sys.exit(1)

    run_enricher(args.leads, args.master, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
