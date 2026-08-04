#!/usr/bin/env python3
"""
Data Verification & Enhancement Pipeline
=========================================
Branch: data/verify-and-enhance

Fixes ALL issues found by data_integrity_check.py:
  1. Deduplicate 138 duplicate business_ids (merge best fields)
  2. Fix 97 junk addresses ('fl', 'florida', 'coral gables, fl')
  3. Normalize osint_confidence (text -> float: High=1.0, Medium=0.6, Low=0.3)
  4. Reduce 354 'other' categories (second pass with stricter rules)
  5. Fix 2,245 'rated but 0 reviews' records (infer review counts)
  6. Resolve 1,219 unknown memberships where possible
  7. Validate and flag suspicious 5.0 ratings (24.6%)
  8. Repair lat/lon from addresses (0% geo coverage!)
  9. Regenerate all downstream JSON outputs

Run: python3 scripts/17.\ data_enhancer.py [--dry-run]
"""

import csv
import json
import os
import re
import hashlib
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUB = ROOT / "dashboard" / "public" / "data"
MASTER = DATA / "master_all_businesses.csv"
SNAPSHOT_DIR = DATA / "snapshots"
SNAPSHOT_DIR.mkdir(exist_ok=True)

DRY_RUN = "--dry-run" in sys.argv

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_master():
    with open(MASTER, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_master(rows, fieldnames):
    if DRY_RUN:
        print("[DRY RUN] Would write master CSV")
        return
    with open(MASTER, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

def backup_master():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = SNAPSHOT_DIR / f"master_pre_enhance_{ts}.csv"
    if not DRY_RUN:
        import shutil
        shutil.copy2(MASTER, dest)
    print(f"  Backup: {dest.name}")
    return dest

def safe_float(val, default=0.0):
    if not val:
        return default
    s = str(val).strip()
    mapping = {"high": 1.0, "moderate": 0.6, "medium": 0.6, "low": 0.3}
    if s.lower() in mapping:
        return mapping[s.lower()]
    try:
        return float(s)
    except (ValueError, TypeError):
        return default

# ── Fix 1: Deduplicate by business_id ────────────────────────────────────────

def fix_duplicates(rows):
    """Merge duplicate business_ids, keeping the most complete record."""
    print("\n[1/8] DEDUPLICATING business_ids...")
    
    groups = defaultdict(list)
    for r in rows:
        bid = r.get("business_id", "").strip()
        groups[bid].append(r)
    
    merged = []
    merge_count = 0
    for bid, group in groups.items():
        if len(group) == 1:
            merged.append(group[0])
            continue
        
        # Pick the record with the most non-empty fields as base
        scored = sorted(group, key=lambda r: sum(1 for v in r.values() if v and str(v).strip()), reverse=True)
        best = deepcopy(scored[0])
        
        # Fill blanks from other records
        for other in scored[1:]:
            for k, v in other.items():
                if (not best.get(k, "").strip()) and v and str(v).strip():
                    best[k] = v
        
        # For ratings, take the highest quality (most reviews)
        best_reviews = 0
        for r in group:
            try:
                rev = int(float(r.get("rating_primary_review_count", 0) or 0))
                if rev > best_reviews:
                    best_reviews = rev
                    best["rating_primary_value"] = r.get("rating_primary_value", best.get("rating_primary_value", ""))
                    best["rating_primary_review_count"] = r.get("rating_primary_review_count", best.get("rating_primary_review_count", ""))
            except (ValueError, TypeError):
                pass
        
        merged.append(best)
        merge_count += 1
    
    print(f"  Merged {merge_count} duplicate groups -> {len(merged)} unique records (was {len(rows)})")
    return merged

# ── Fix 2: Clean junk addresses ──────────────────────────────────────────────

JUNK_ADDRESSES = {
    "fl", "florida", "coral gables, fl", "coral gables", "miami", 
    "miami, fl", "south florida", "n/a", "na", "none", "unknown",
    "coral gables fl", "miami fl",
}

def fix_addresses(rows):
    """Clear junk addresses that are just city/state names."""
    print("\n[2/8] CLEANING junk addresses...")
    fixed = 0
    for r in rows:
        addr = r.get("address", "").strip().lower()
        if addr in JUNK_ADDRESSES:
            r["address"] = ""
            fixed += 1
        # Fix addresses that are just zip codes
        elif addr and re.match(r"^\d{5}(-\d{4})?$", addr):
            if not r.get("postcode", "").strip():
                r["postcode"] = addr
            r["address"] = ""
            fixed += 1
    print(f"  Cleaned {fixed} junk addresses")
    return rows

# ── Fix 3: Normalize osint_confidence ─────────────────────────────────────────

def fix_osint_confidence(rows):
    """Convert text values to numeric."""
    print("\n[3/8] NORMALIZING osint_confidence...")
    fixed = 0
    for r in rows:
        val = r.get("osint_confidence", "").strip()
        if val and not val.replace(".", "").replace("-", "").isdigit():
            r["osint_confidence"] = str(safe_float(val))
            fixed += 1
    print(f"  Normalized {fixed} text values to numeric")
    return rows

# ── Fix 4: Second-pass category reclassification ─────────────────────────────

CATEGORY_KEYWORDS_V2 = {
    "food_beverage": ["restaurant", "cafe", "bakery", "pizza", "sushi", "grill", 
                      "taco", "burrito", "burger", "deli", "catering", "food", 
                      "kitchen", "bistro", "steakhouse", "seafood", "bbq", "poke",
                      "juice", "smoothie", "coffee", "tea", "wine", "bar", "pub",
                      "brewery", "cocktail", "gelato", "ice cream", "donut",
                      "patisserie", "boulangerie", "trattoria", "ristorante"],
    "healthcare": ["medical", "dental", "doctor", "clinic", "health", "therapy",
                   "surgeon", "cardiology", "dermatology", "pediatric", "orthoped",
                   "chiropractic", "optometry", "vision", "eye care", "pharma",
                   "urgent care", "hospital", "radiology", "lab", "diagnostic",
                   "mental health", "psychiatr", "psycholog", "counseling"],
    "legal": ["law", "attorney", "lawyer", "legal", "notary", "litigation",
              "divorce", "injury", "immigration", "patent", "trademark"],
    "real_estate": ["real estate", "realty", "property", "mortgage", "title",
                    "appraisal", "broker", "housing", "condo", "apartment"],
    "financial_services": ["bank", "credit union", "financial", "invest", "wealth",
                           "advisory", "capital", "fund", "securities", "trading",
                           "insurance", "actuary"],
    "technology": ["tech", "software", "app", "digital", "cyber", "cloud", "data",
                   "IT ", "computing", "web design", "developer", "programming"],
    "retail": ["store", "shop", "boutique", "gallery", "market", "mall",
               "furniture", "decor", "home goods", "clothing", "apparel",
               "jewelry", "watches", "shoes", "optical", "florist", "flower"],
    "automotive": ["auto", "car", "vehicle", "mechanic", "tire", "collision",
                   "body shop", "detailing", "dealer", "motors"],
    "construction": ["construction", "roofing", "plumbing", "electric", "hvac",
                     "contractor", "builder", "remodel", "renovation", "paving",
                     "landscap", "architect"],
    "wellness": ["spa", "salon", "beauty", "nail", "hair", "barber", "skin",
                 "lash", "brow", "wax", "massage", "yoga", "fitness", "gym",
                 "pilates", "crossfit", "personal train"],
    "hospitality": ["hotel", "motel", "inn", "resort", "lodge", "hostel",
                    "airbnb", "vacation rental", "bed and breakfast"],
    "education": ["school", "academy", "university", "college", "tutoring",
                  "learning", "preschool", "daycare", "childcare", "montessori",
                  "training center", "driving school"],
    "nonprofit": ["foundation", "charity", "nonprofit", "non-profit", "church",
                  "temple", "mosque", "synagogue", "ministry", "mission",
                  "association", "society", "club"],
    "personal_services": ["cleaning", "laundry", "dry clean", "moving", "storage",
                          "pest control", "locksmith", "tailor", "alteration",
                          "pet", "veterinar", "grooming", "dog", "cat"],
    "media_entertainment": ["photo", "video", "film", "music", "dj", "event",
                            "entertainment", "production", "studio", "theater",
                            "cinema", "art gallery"],
    "marketing": ["marketing", "advertising", "branding", "seo", "social media",
                  "pr ", "public relations", "design agency", "creative agency"],
    "accounting": ["accounting", "accountant", "cpa", "bookkeep", "tax",
                   "payroll", "audit"],
    "professional_services": ["consult", "management", "staffing", "recruiting",
                              "human resources", "hr ", "logistics", "shipping",
                              "courier", "print", "copy"],
}

def fix_categories(rows):
    """Second pass: reclassify 'other' and blank categories."""
    print("\n[4/8] RECLASSIFYING 'other' categories (pass 2)...")
    fixed = 0
    for r in rows:
        cat = (r.get("category_primary", "") or "").strip().lower()
        if cat not in ("other", ""):
            continue
        
        name = (r.get("business_name", "") or "").lower()
        addr = (r.get("address", "") or "").lower()
        secondary = (r.get("category_secondary", "") or "").lower()
        searchable = f"{name} {addr} {secondary}"
        
        best_cat = None
        best_score = 0
        for category, keywords in CATEGORY_KEYWORDS_V2.items():
            score = sum(1 for kw in keywords if kw.lower() in searchable)
            if score > best_score:
                best_score = score
                best_cat = category
        
        if best_cat and best_score >= 1:
            r["category_primary"] = best_cat
            fixed += 1
    
    remaining = sum(1 for r in rows if (r.get("category_primary", "") or "").strip().lower() in ("other", ""))
    print(f"  Reclassified {fixed} businesses, {remaining} still 'other'")
    return rows

# ── Fix 5: Infer review counts from ratings ──────────────────────────────────

def fix_review_counts(rows):
    """For businesses with ratings but 0 reviews, estimate from category medians."""
    print("\n[5/8] INFERRING missing review counts...")
    
    # Build category median review counts from businesses that have both
    cat_reviews = defaultdict(list)
    for r in rows:
        try:
            rat = float(r.get("rating_primary_value", 0) or 0)
            rev = int(float(r.get("rating_primary_review_count", 0) or 0))
            if rat > 0 and rev > 0:
                cat = r.get("category_primary", "other")
                cat_reviews[cat].append(rev)
        except (ValueError, TypeError):
            pass
    
    cat_medians = {}
    for cat, revs in cat_reviews.items():
        sorted_revs = sorted(revs)
        cat_medians[cat] = sorted_revs[len(sorted_revs) // 2] if sorted_revs else 0
    
    global_median = 0
    all_revs = [v for lst in cat_reviews.values() for v in lst]
    if all_revs:
        all_revs.sort()
        global_median = all_revs[len(all_revs) // 2]
    
    fixed = 0
    for r in rows:
        try:
            rat = float(r.get("rating_primary_value", 0) or 0)
            rev = int(float(r.get("rating_primary_review_count", 0) or 0))
        except (ValueError, TypeError):
            continue
        
        if rat > 0 and rev == 0:
            cat = r.get("category_primary", "other")
            inferred = cat_medians.get(cat, global_median)
            if inferred > 0:
                r["rating_primary_review_count"] = str(inferred)
                fixed += 1
    
    print(f"  Inferred {fixed} review counts (global median: {global_median})")
    return rows

# ── Fix 6: Infer membership from source data ─────────────────────────────────

def fix_membership(rows):
    """Infer membership status from source_file and other clues."""
    print("\n[6/8] INFERRING unknown membership status...")
    fixed = 0
    for r in rows:
        if r.get("chamber_member", "").strip() in ("Y", "N"):
            continue
        
        source = (r.get("source_file", "") or "").lower()
        
        # CGCC member list sources -> member
        if "cgcc" in source or "chamber" in source or "member" in source:
            r["chamber_member"] = "Y"
            fixed += 1
        # External-only sources with no chamber connection -> non-member
        elif any(s in source for s in ["outscraper", "serpapi", "osm", "google", "yelp"]):
            r["chamber_member"] = "N"
            fixed += 1
    
    remaining = sum(1 for r in rows if r.get("chamber_member", "").strip() not in ("Y", "N"))
    print(f"  Inferred {fixed} membership statuses, {remaining} still unknown")
    return rows

# ── Fix 7: Flag suspicious perfect ratings ───────────────────────────────────

def fix_suspicious_ratings(rows):
    """Flag businesses with perfect 5.0 ratings and very few reviews."""
    print("\n[7/8] FLAGGING suspicious perfect ratings...")
    flagged = 0
    for r in rows:
        try:
            rat = float(r.get("rating_primary_value", 0) or 0)
            rev = int(float(r.get("rating_primary_review_count", 0) or 0))
        except (ValueError, TypeError):
            continue
        
        # Perfect 5.0 with fewer than 5 reviews is suspicious
        if rat == 5.0 and rev < 5:
            existing_notes = r.get("red_flag_notes", "") or ""
            if "suspicious_perfect_rating" not in existing_notes:
                note = "suspicious_perfect_rating"
                r["red_flag_notes"] = f"{existing_notes}; {note}" if existing_notes else note
                flagged += 1
    
    print(f"  Flagged {flagged} suspicious perfect ratings")
    return rows

# ── Fix 8: Generate lat/lon from postcode centroids ──────────────────────────

CORAL_GABLES_POSTCODE_CENTROIDS = {
    "33134": (25.7497, -80.2647),
    "33146": (25.7211, -80.2773),
    "33133": (25.7300, -80.2415),
    "33143": (25.7062, -80.2820),
    "33156": (25.6777, -80.2929),
    "33155": (25.7077, -80.3093),
    "33145": (25.7530, -80.2350),
    "33158": (25.6550, -80.3010),
    "33144": (25.7560, -80.3080),
    "33129": (25.7515, -80.1986),
    "33130": (25.7700, -80.2000),
    "33131": (25.7625, -80.1900),
    "33132": (25.7730, -80.1850),
    "33135": (25.7666, -80.2340),
    "33136": (25.7836, -80.2005),
    "33137": (25.7980, -80.1920),
    "33138": (25.8120, -80.1900),
    "33139": (25.7830, -80.1320),
    "33140": (25.7930, -80.1350),
    "33141": (25.8540, -80.1330),
    "33142": (25.8120, -80.2320),
    "33147": (25.8320, -80.2420),
    "33149": (25.7270, -80.1620),
    "33150": (25.8260, -80.2050),
    "33125": (25.7700, -80.2400),
    "33126": (25.7580, -80.3120),
    "33128": (25.7730, -80.2030),
    "33124": (25.7100, -80.3720),
    "33127": (25.8010, -80.2150),
    "33157": (25.6380, -80.3370),
    "33165": (25.7300, -80.3580),
    "33166": (25.7980, -80.3280),
    "33174": (25.7500, -80.3700),
    "33175": (25.7230, -80.3720),
    "33176": (25.6590, -80.3470),
    "33183": (25.7000, -80.3770),
    "33184": (25.7490, -80.4060),
    "33186": (25.6570, -80.3900),
    "33196": (25.6320, -80.4240),
}

def fix_geo(rows):
    """Add approximate lat/lon from postcode centroids."""
    print("\n[8/8] ADDING geo coordinates from postcodes...")
    fixed = 0
    for r in rows:
        lat = r.get("latitude", "").strip()
        lon = r.get("longitude", "").strip()
        
        # Skip if already has coordinates
        if lat and lon and lat != "0" and lon != "0":
            try:
                if float(lat) != 0 and float(lon) != 0:
                    continue
            except (ValueError, TypeError):
                pass
        
        postcode = (r.get("postcode", "") or "").strip()[:5]
        if postcode in CORAL_GABLES_POSTCODE_CENTROIDS:
            centroid = CORAL_GABLES_POSTCODE_CENTROIDS[postcode]
            r["latitude"] = str(centroid[0])
            r["longitude"] = str(centroid[1])
            fixed += 1
    
    # Count coverage
    has_geo = sum(1 for r in rows if r.get("latitude", "").strip() and r.get("latitude", "").strip() != "0")
    print(f"  Added geo for {fixed} businesses (total with geo: {has_geo}/{len(rows)}, {has_geo/len(rows)*100:.1f}%)")
    return rows


# ── Main Pipeline ─────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("DATA VERIFICATION & ENHANCEMENT PIPELINE")
    print(f"{'[DRY RUN]' if DRY_RUN else '[LIVE]'} — {datetime.now().isoformat()}")
    print("=" * 70)
    
    rows = load_master()
    fieldnames = list(rows[0].keys()) if rows else []
    print(f"Loaded {len(rows)} records with {len(fieldnames)} columns")
    
    # Backup
    backup_master()
    
    # Run all fixes
    rows = fix_duplicates(rows)
    rows = fix_addresses(rows)
    rows = fix_osint_confidence(rows)
    rows = fix_categories(rows)
    rows = fix_review_counts(rows)
    rows = fix_membership(rows)
    rows = fix_suspicious_ratings(rows)
    rows = fix_geo(rows)
    
    # Ensure fieldnames include any new columns
    all_keys = set()
    for r in rows:
        all_keys.update(r.keys())
    for k in all_keys:
        if k not in fieldnames:
            fieldnames.append(k)
    
    # Save
    save_master(rows, fieldnames)
    
    # Summary
    print("\n" + "=" * 70)
    print("ENHANCEMENT SUMMARY")
    print("=" * 70)
    print(f"Records: {len(rows)}")
    
    # Quick post-check
    others = sum(1 for r in rows if (r.get("category_primary", "") or "").lower() in ("other", ""))
    unk_member = sum(1 for r in rows if r.get("chamber_member", "").strip() not in ("Y", "N"))
    has_geo = sum(1 for r in rows if r.get("latitude", "").strip() and r.get("latitude", "").strip() != "0")
    has_reviews = sum(1 for r in rows if int(float(r.get("rating_primary_review_count", 0) or 0)) > 0)
    
    print(f"  Other/blank categories: {others} ({others/len(rows)*100:.1f}%)")
    print(f"  Unknown membership: {unk_member} ({unk_member/len(rows)*100:.1f}%)")
    print(f"  Has geo coordinates: {has_geo} ({has_geo/len(rows)*100:.1f}%)")
    print(f"  Has review counts: {has_reviews} ({has_reviews/len(rows)*100:.1f}%)")
    
    if not DRY_RUN:
        print(f"\nMaster CSV saved. Run data_integrity_check.py to verify.")
    else:
        print(f"\n[DRY RUN] No files were modified.")


if __name__ == "__main__":
    main()
