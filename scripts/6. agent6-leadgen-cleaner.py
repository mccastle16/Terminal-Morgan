#!/usr/bin/env python3
"""
Agent 6 — Lead Gen Cleaner
============================
Cleans and normalizes raw lead-gen CSVs (contact lists) exported from
email/marketing platforms.  Produces a qualified, structured CSV ready
for enrichment by Agent 7.

Pipeline steps:
  1. Drop dead columns (UTM fields, referrer — 100% empty)
  2. Remove unusable contacts (bounced, cancelled, complained)
  3. Fix malformed emails (trailing commas, whitespace)
  4. Clean first/last names (flag non-person entries, normalize casing)
  5. Normalize tags (strip import timestamps, fix typos, dedupe)
  6. Extract category from fake Job Title values, keep real titles
  7. Extract company website from email domain
  8. Normalize phone numbers (reuse _shared.normalize_phone)
  9. Deduplicate by email
  10. Write cleaned CSV with summary report

Usage:
  python "6. agent6-leadgen-cleaner.py" --input data/leadgen.csv
  python "6. agent6-leadgen-cleaner.py" --input data/leadgen.csv --output data/leadgen_cleaned.csv
  python "6. agent6-leadgen-cleaner.py" --input data/leadgen.csv --dry-run

Requirements:
  pip install pandas
"""

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

from _shared import normalize_phone

# ── Constants ───────────────────────────────────────────────────────

# Columns that are 100% empty and provide no value
DEAD_COLUMNS = [
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
]

# Statuses that indicate the contact is unreachable or opted out
UNUSABLE_STATUSES = {"bounced", "cancelled", "complained"}

# Job Title values that are actually category labels, not real titles.
# Maps raw value (uppercased) → cleaned category name.
CATEGORY_FROM_TITLE = {
    "GENERAL": "General",
    "BUSINESS": "Business Services",
    "HOTEL": "Hotel",
    "CRUISE": "Cruise",
    "HEALTHCARE": "Healthcare",
    "HEATHCARE": "Healthcare",       # typo
    "ACADEMIC": "Academic",
    "ACADEMiC": "Academic",          # casing variant
    "VENDOR": "Vendor",
    "VEDNOR": "Vendor",              # typo
    "VENDORS": "Vendor",
    "RETAIL": "Retail",
    "RETIAL": "Retail",              # typo
    "TRAVEL": "Travel",
    "MEDIA": "Media",
    "LAW": "Law",
    "Developers": "Developers",
}

# Tag substrings that are import metadata, not real categories
IMPORT_TIMESTAMP_PATTERNS = [
    r"Imported\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M",
    r"\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M",
]

# Tag typo corrections
TAG_TYPO_MAP = {
    "Goverment": "Government",
    "â¢CURRENT CLIENTS": "Current Clients",
    "•CURRENT CLIENTS": "Current Clients",
}

# Known non-person first names (companies, roles, bots, generic)
NON_PERSON_NAMES = {
    "null", "services", "reception", "getty", "hollywood", "bitcoin",
    "citibank", "travel", "marketing", "colorgraphics", "graphic design",
    "redesign", "wripple", "oro", "retail", "support", "color",
    "insomniac", "pil", "trias", "pst", "cs", "rev-account",
    "colorGraphics", "elevate", "cdip", "mba-hcm",
}

# Personal email domains (don't extract company website from these)
PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "icloud.com", "me.com", "live.com", "msn.com", "comcast.net",
    "att.net", "bellsouth.net", "verizon.net", "earthlink.com",
    "mac.com", "ymail.com", "rocketmail.com", "protonmail.com",
    "mail.com", "inbox.com", "yahoo.co.in", "sbcglobal.net",
    "charter.net", "intrstar.net", "cox.net",
}

# Output schema — cleaned and restructured columns
OUTPUT_COLUMNS = [
    "first_name",
    "last_name",
    "full_name",
    "email",
    "phone",
    "company",
    "job_title",
    "category",
    "city",
    "state",
    "country",
    "tags",
    "status",
    "created_at",
    "company_website",
    "name_flag",
    "notes",
]


# ── Cleaning functions ──────────────────────────────────────────────

def fix_email(email: str) -> str:
    """Strip trailing commas, whitespace, and quotes from emails."""
    if not email or not isinstance(email, str):
        return ""
    cleaned = email.strip().strip(",").strip('"').strip("'").strip()
    if "@" not in cleaned:
        return ""
    return cleaned.lower()


def extract_domain_website(email: str) -> str:
    """Extract company website from email domain, skip personal providers."""
    if not email or "@" not in email:
        return ""
    domain = email.split("@")[-1].strip().lower()
    if domain in PERSONAL_EMAIL_DOMAINS:
        return ""
    # Skip .edu and .gov — not companies
    if domain.endswith(".edu") or domain.endswith(".gov"):
        return ""
    return domain


def clean_name(name: str) -> str:
    """Normalize name casing and strip junk."""
    if not name or not isinstance(name, str):
        return ""
    name = name.strip().strip('"').strip("'")
    if not name:
        return ""
    # Don't title-case if already mixed case (e.g., "McDonald")
    if name.isupper() or name.islower():
        name = name.title()
    return name


def flag_name(first_name: str) -> str:
    """Flag non-person first names."""
    if not first_name:
        return "missing_name"
    if first_name.strip().lower() in NON_PERSON_NAMES:
        return "non_person"
    # Single character names
    if len(first_name.strip()) == 1:
        return "initial_only"
    return ""


def clean_tags(raw_tags: str) -> str:
    """
    Clean tag string:
    - Remove import timestamp metadata
    - Fix typos
    - Deduplicate
    - Sort alphabetically
    """
    if not raw_tags or not isinstance(raw_tags, str):
        return ""

    tags = [t.strip() for t in raw_tags.split(",") if t.strip()]

    cleaned = []
    for tag in tags:
        # Skip import timestamp tags
        skip = False
        for pattern in IMPORT_TIMESTAMP_PATTERNS:
            if re.search(pattern, tag, re.IGNORECASE):
                skip = True
                break
        if skip:
            continue

        # Also skip bare fragments like "2025 at 10:41 AM"
        if re.match(r"^\d{4}\s+at\s+", tag):
            continue

        # Fix typos
        tag = TAG_TYPO_MAP.get(tag, tag)

        if tag:
            cleaned.append(tag)

    # Deduplicate preserving order
    seen = set()
    deduped = []
    for t in cleaned:
        key = t.lower().strip()
        if key not in seen:
            seen.add(key)
            deduped.append(t)

    return ", ".join(sorted(deduped))


def extract_category_from_title(job_title: str) -> tuple:
    """
    If the job title is actually a category label, return (category, "").
    Otherwise return ("", original_title).
    """
    if not job_title or not isinstance(job_title, str):
        return "", ""

    title = job_title.strip()
    upper = title.upper()

    if upper in CATEGORY_FROM_TITLE:
        return CATEGORY_FROM_TITLE[upper], ""

    # Check with original casing too
    if title in CATEGORY_FROM_TITLE:
        return CATEGORY_FROM_TITLE[title], ""

    return "", title


def clean_phone(phone: str) -> str:
    """Clean and normalize phone numbers."""
    if not phone or not isinstance(phone, str):
        return ""
    phone = phone.strip().strip("'").strip('"')
    if not phone:
        return ""
    # Reject obvious junk
    if phone == "12345678900":
        return ""
    return normalize_phone(phone)


# ── Main pipeline ───────────────────────────────────────────────────

def run_cleaner(input_path: str, output_path: str, dry_run: bool = False):
    """Execute the full cleaning pipeline."""

    print(f"\n{'='*60}")
    print(f"  Agent 6 — Lead Gen Cleaner")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # ── Load ────────────────────────────────────────────────────
    df = pd.read_csv(input_path, dtype=str).fillna("")
    total_raw = len(df)
    print(f"Loaded {total_raw} rows from {input_path}")
    print(f"Columns: {list(df.columns)}\n")

    # ── Step 1: Drop dead columns ───────────────────────────────
    dead_found = [c for c in DEAD_COLUMNS if c in df.columns]
    df = df.drop(columns=dead_found, errors="ignore")
    print(f"[1] Dropped {len(dead_found)} dead columns: {dead_found}")

    # ── Step 2: Remove unusable contacts ────────────────────────
    mask_usable = ~df["status"].str.strip().str.lower().isin(UNUSABLE_STATUSES)
    removed_count = (~mask_usable).sum()
    status_breakdown = df[~mask_usable]["status"].value_counts().to_dict()
    df = df[mask_usable].copy()
    print(f"[2] Removed {removed_count} unusable contacts: {status_breakdown}")
    print(f"    Remaining: {len(df)} active contacts")

    # ── Step 3: Fix emails ──────────────────────────────────────
    df["email"] = df["email"].apply(fix_email)
    empty_email = (df["email"] == "").sum()
    if empty_email > 0:
        print(f"[3] Fixed emails — {empty_email} still empty/invalid (dropping)")
        df = df[df["email"] != ""].copy()
    else:
        print(f"[3] Fixed emails — all valid")

    # ── Step 4: Deduplicate by email ────────────────────────────
    before_dedup = len(df)
    df = df.drop_duplicates(subset=["email"], keep="first")
    dupes_removed = before_dedup - len(df)
    print(f"[4] Deduplication: removed {dupes_removed} duplicate emails")
    print(f"    Remaining: {len(df)} unique contacts")

    # ── Step 5: Clean names ─────────────────────────────────────
    df["first_name"] = df["first_name"].apply(clean_name)
    df["Last Name"] = df["Last Name"].apply(clean_name)
    df["name_flag"] = df["first_name"].apply(flag_name)

    flagged = df["name_flag"].value_counts().to_dict()
    flagged.pop("", None)
    print(f"[5] Name cleaning — flagged: {flagged}")

    # ── Step 6: Build full_name ─────────────────────────────────
    df["full_name"] = (df["first_name"].str.strip() + " " + df["Last Name"].str.strip()).str.strip()

    # ── Step 7: Extract category from fake job titles ───────────
    results = df["Job Title"].apply(extract_category_from_title)
    df["category"] = results.apply(lambda x: x[0])
    df["job_title_clean"] = results.apply(lambda x: x[1])

    fake_titles = (df["category"] != "").sum()
    real_titles = (df["job_title_clean"] != "").sum()
    print(f"[7] Job titles: {fake_titles} were category labels (moved), {real_titles} are real titles")

    # ── Step 8: Clean tags ──────────────────────────────────────
    df["tags_clean"] = df["tags"].apply(clean_tags)

    # Fill category from tags if job title didn't provide one
    def infer_category_from_tags(row):
        if row["category"]:
            return row["category"]
        tags = row["tags_clean"].lower()
        for label, cat in [
            ("cruise", "Cruise"), ("hotel", "Hotel"),
            ("healthcare", "Healthcare"), ("vendor", "Vendor"),
            ("business services", "Business Services"),
            ("academic", "Academic"), ("retail", "Retail"),
            ("travel", "Travel"), ("media", "Media"),
            ("law", "Law"), ("developer", "Developers"),
            ("hospitality", "Hospitality"), ("government", "Government"),
        ]:
            if label in tags:
                return cat
        return "General"

    df["category"] = df.apply(infer_category_from_tags, axis=1)
    cat_dist = df["category"].value_counts().to_dict()
    print(f"[8] Tags cleaned. Category distribution: {cat_dist}")

    # ── Step 9: Extract company website from email domain ───────
    df["company_website"] = df["email"].apply(extract_domain_website)
    has_website = (df["company_website"] != "").sum()
    print(f"[9] Extracted company website from email domain: {has_website}/{len(df)} contacts")

    # ── Step 10: Clean phones ───────────────────────────────────
    df["phone_clean"] = df["Phone Number"].apply(clean_phone)
    has_phone = (df["phone_clean"] != "").sum()
    print(f"[10] Phone numbers normalized: {has_phone} valid")

    # ── Step 11: Rename and select output columns ───────────────
    out = pd.DataFrame()
    out["first_name"] = df["first_name"]
    out["last_name"] = df["Last Name"]
    out["full_name"] = df["full_name"]
    out["email"] = df["email"]
    out["phone"] = df["phone_clean"]
    out["company"] = df["Company Name"].str.strip()
    out["job_title"] = df["job_title_clean"]
    out["category"] = df["category"]
    out["city"] = df["city"].str.strip()
    out["state"] = df["state"].str.strip()
    out["country"] = df["country"].str.strip()
    out["tags"] = df["tags_clean"]
    out["status"] = df["status"]
    out["created_at"] = df["created_at"]
    out["company_website"] = df["company_website"]
    out["name_flag"] = df["name_flag"]
    out["notes"] = df["NOTES"].str.strip()

    # ── Summary ─────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  CLEANING SUMMARY")
    print(f"{'='*60}")
    print(f"  Input rows:          {total_raw}")
    print(f"  Unusable removed:    {removed_count}")
    print(f"  Empty emails removed:{empty_email}")
    print(f"  Duplicates removed:  {dupes_removed}")
    print(f"  Output rows:         {len(out)}")
    print(f"  ─────────────────────────────────")
    print(f"  Has company:         {(out['company'] != '').sum()}/{len(out)} ({round((out['company'] != '').sum()/len(out)*100,1)}%)")
    print(f"  Has real job title:  {(out['job_title'] != '').sum()}/{len(out)} ({round((out['job_title'] != '').sum()/len(out)*100,1)}%)")
    print(f"  Has phone:           {(out['phone'] != '').sum()}/{len(out)} ({round((out['phone'] != '').sum()/len(out)*100,1)}%)")
    print(f"  Has company website: {(out['company_website'] != '').sum()}/{len(out)} ({round((out['company_website'] != '').sum()/len(out)*100,1)}%)")
    print(f"  Has city:            {(out['city'] != '').sum()}/{len(out)} ({round((out['city'] != '').sum()/len(out)*100,1)}%)")
    print(f"  Has full name:       {(out['full_name'].str.strip() != '').sum()}/{len(out)}")
    print(f"  Name flags:          {flagged}")
    print(f"{'='*60}")

    # ── Write ───────────────────────────────────────────────────
    if dry_run:
        print(f"\n[DRY RUN] Would write {len(out)} rows to {output_path}")
        print(out.head(10).to_string(index=False))
    else:
        out.to_csv(output_path, index=False)
        print(f"\nWrote {len(out)} cleaned leads to {output_path}")

    return out


# ── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent 6 — Lead Gen Cleaner")
    parser.add_argument("--input", required=True, help="Path to raw leadgen CSV")
    parser.add_argument("--output", default=None, help="Output path (default: <input>_cleaned.csv)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    input_path = args.input
    if not Path(input_path).exists():
        print(f"Error: {input_path} not found")
        sys.exit(1)

    if args.output:
        output_path = args.output
    else:
        p = Path(input_path)
        output_path = str(p.parent / f"{p.stem}_cleaned{p.suffix}")

    run_cleaner(input_path, output_path, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
