#!/usr/bin/env python3
"""
Data Validation Fixes
=====================
Branch: data/verify-and-enhance

Fixes the 3 real problems found by data_integrity_check.py:

  1. RED FLAG RECALIBRATION (52.5% -> realistic %)
     - Current: any missing field = flagged. Way too aggressive.
     - Fix: 3-tier severity based on actual business risk, not data gaps.

  2. GRAPH REBUILD (11% -> 100% coverage)
     - Current: export_graph.py has --limit 300 default.
     - Fix: Build graph directly from CSV — no Neo4j needed.

  3. CATEGORY RECLASSIFICATION (250 'other' -> reduce further)
     - Current: 250 still unclassified after 2 passes.
     - Fix: University entity detection + expanded keyword matching.

  4. REVIEW COUNT VALIDATION
     - We inferred 2,122 review counts as category medians.
     - Add review_count_source column to track original vs inferred.

Run: python3 scripts/19.\ validation_fixes.py [--dry-run]
"""

import csv
import json
import re
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
    import shutil
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = SNAPSHOT_DIR / f"master_pre_validation_{ts}.csv"
    if not DRY_RUN:
        shutil.copy2(MASTER, dest)
    print(f"  Backup: {dest.name}")


def safe_float(val, default=0.0):
    if not val:
        return default
    s = str(val).strip()
    try:
        return float(s)
    except (ValueError, TypeError):
        return default


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 1: RED FLAG RECALIBRATION
# ═══════════════════════════════════════════════════════════════════════════════
#
# OLD logic: flag_present=Y if ANY validation note exists OR tier=Low
# This flags businesses just for missing a phone number. That's not a "red flag".
#
# NEW 3-tier severity:
#   Critical:     Actual business risk signals
#                 - Rating < 2.0
#                 - Multiple red flag notes (2+)
#                 - Out of geographic bounds
#                 - Suspicious perfect rating (5.0 with <5 reviews)
#
#   Operational:  Real but manageable issues
#                 - No website AND no phone (zero contact)
#                 - Rating between 2.0-3.0
#                 - Low validation tier with no corroboration
#
#   None:         Data gaps (not business risks)
#                 - Missing phone only -> not a flag
#                 - Missing website only -> not a flag
#                 - Category = "other" -> not a flag
#                 - Missing address -> not a flag

def recalibrate_red_flags(rows):
    """Recalibrate red flags to separate real risks from data gaps."""
    print("\n[1/4] RECALIBRATING red flags...")

    before_flagged = sum(1 for r in rows if r.get("red_flag_present", "") == "Y")

    for r in rows:
        rating = safe_float(r.get("rating_primary_value", 0))
        reviews = int(safe_float(r.get("rating_primary_review_count", 0)))
        has_phone = bool(r.get("phone", "").strip())
        has_website = bool(r.get("website", "").strip())
        notes = r.get("red_flag_notes", "") or ""
        tier = (r.get("validation_tier", "") or "").strip()
        corr = int(safe_float(r.get("corroboration_count", 0)))
        lat = safe_float(r.get("latitude", 0))
        lon = safe_float(r.get("longitude", 0))

        severity = None
        reasons = []

        # ── Critical: actual business risk ──
        if rating > 0 and rating < 2.0:
            severity = "Critical"
            reasons.append(f"very_low_rating({rating:.1f})")

        if lat != 0 and lon != 0:
            if not (25.60 <= lat <= 25.85 and -80.40 <= lon <= -80.15):
                severity = "Critical"
                reasons.append("out_of_bounds")

        if rating == 5.0 and reviews < 5:
            reasons.append("suspicious_perfect_rating")
            if severity != "Critical":
                severity = "Operational"

        # Count distinct issue types in existing notes
        note_issues = [n.strip() for n in notes.split(";") if n.strip()]
        note_issues = [n for n in note_issues if n != "suspicious_perfect_rating"]
        if len(note_issues) >= 2:
            if severity != "Critical":
                severity = "Critical"
            reasons.append(f"multiple_issues({len(note_issues)})")

        # ── Operational: real but manageable ──
        if not has_phone and not has_website:
            reasons.append("no_contact_info")
            if severity is None:
                severity = "Operational"

        if 2.0 <= rating < 3.0:
            reasons.append(f"low_rating({rating:.1f})")
            if severity is None:
                severity = "Operational"

        if tier == "Low" and corr < 2:
            reasons.append("low_confidence_unverified")
            if severity is None:
                severity = "Operational"

        # ── Set flag ──
        if severity:
            r["red_flag_present"] = "Y"
            r["red_flag_severity"] = severity
            r["red_flag_notes"] = "; ".join(reasons) if reasons else notes
        else:
            r["red_flag_present"] = "N"
            r["red_flag_severity"] = ""
            r["red_flag_notes"] = ""

    after_flagged = sum(1 for r in rows if r.get("red_flag_present", "") == "Y")
    critical = sum(1 for r in rows if r.get("red_flag_severity", "") == "Critical")
    operational = sum(1 for r in rows if r.get("red_flag_severity", "") == "Operational")

    print(f"  Before: {before_flagged}/{len(rows)} flagged ({before_flagged/len(rows)*100:.1f}%)")
    print(f"  After:  {after_flagged}/{len(rows)} flagged ({after_flagged/len(rows)*100:.1f}%)")
    print(f"    Critical: {critical}  |  Operational: {operational}")
    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 2: CATEGORY RECLASSIFICATION (PASS 3)
# ═══════════════════════════════════════════════════════════════════════════════

# University-related patterns
UNIVERSITY_PATTERNS = [
    "university", "college", "dean", "registrar", "admission",
    "student", "campus", "academic", "faculty", "provost",
    "bursar", "financial aid", "alumni", "scholarship",
]

# Expanded keywords for stubborn cases
PASS3_KEYWORDS = {
    "education": [
        "university", "college", "school", "academy", "tutoring",
        "learning", "preschool", "daycare", "childcare", "montessori",
        "training", "driving school", "dean", "registrar", "admission",
        "student", "campus", "academic", "faculty", "provost",
        "library", "study", "education", "institute",
    ],
    "food_beverage": [
        "restaurant", "cafe", "bakery", "pizza", "sushi", "grill",
        "taco", "burger", "deli", "catering", "food", "kitchen",
        "bistro", "steakhouse", "seafood", "poke", "juice", "coffee",
        "tea", "wine", "bar", "pub", "brewery", "gelato", "ice cream",
        "donut", "cantina", "halal", "gastrobar", "trattoria",
        "ristorante", "panaderia", "taqueria", "ceviche", "empanada",
        "arepa", "churro", "crepe", "noodle", "ramen", "pho",
        "dim sum", "dumpling", "wok", "rotisserie", "smokehouse",
        "market nxt", "food court", "cafeteria", "snack", "smoothie",
    ],
    "healthcare": [
        "medical", "dental", "doctor", "clinic", "health", "therapy",
        "surgeon", "cardiology", "dermatology", "pediatric", "orthoped",
        "chiropractic", "optometry", "vision", "eye care", "pharma",
        "urgent care", "hospital", "radiology", "lab", "diagnostic",
        "mental health", "psychiatr", "psycholog", "counseling",
        "physical therapy", "rehab", "nursing", "midwife", "obgyn",
        "oncology", "urology", "neurology", "allergy", "ent ",
        "hearing", "audiology", "wellness center",
    ],
    "financial_services": [
        "bank", "credit union", "financial", "invest", "wealth",
        "advisory", "capital", "fund", "securities", "trading",
        "insurance", "actuary", "lending", "loan", "mortgage",
        "atm", "money", "exchange", "wire transfer", "paycheck",
    ],
    "retail": [
        "store", "shop", "boutique", "gallery", "market", "mall",
        "furniture", "decor", "home goods", "clothing", "apparel",
        "jewelry", "watches", "shoes", "optical", "florist", "flower",
        "gift", "souvenir", "comic", "book", "toy", "hobby",
        "hardware", "supply", "convenience", "smoke", "vape",
        "liquor", "wine shop", "beer",
    ],
    "technology": [
        "tech", "software", "app ", "digital", "cyber", "cloud",
        "data", "IT ", "computing", "web design", "developer",
        "programming", "saas", "ai ", "machine learning", "startup",
        "innovation", "telecom",
    ],
    "wellness": [
        "spa", "salon", "beauty", "nail", "hair", "barber", "skin",
        "lash", "brow", "wax", "massage", "yoga", "fitness", "gym",
        "pilates", "crossfit", "personal train", "meditation",
        "acupuncture", "holistic", "aromatherapy", "tattoo",
    ],
    "media_entertainment": [
        "photo", "video", "film", "music", "dj", "event",
        "entertainment", "production", "studio", "theater", "cinema",
        "art gallery", "museum", "radio", "podcast", "media",
        "wvum", "broadcast", "tv ", "news",
    ],
    "automotive": [
        "auto", "car ", "vehicle", "mechanic", "tire", "collision",
        "body shop", "detailing", "dealer", "motors", "garage",
        "towing", "oil change", "brake",
    ],
    "construction": [
        "construction", "roofing", "plumbing", "electric", "hvac",
        "contractor", "builder", "remodel", "renovation", "paving",
        "landscap", "architect", "engineering", "survey", "mason",
        "carpent", "paint", "drywall", "flooring", "tile",
    ],
    "hospitality": [
        "hotel", "motel", "inn ", "resort", "lodge", "hostel",
        "vacation rental", "bed and breakfast", "loews", "marriott",
        "hilton", "hyatt", "airbnb",
    ],
    "legal": [
        "law", "attorney", "lawyer", "legal", "notary", "litigation",
        "divorce", "injury", "immigration", "patent", "trademark",
        "mediation", "arbitration", "court",
    ],
    "real_estate": [
        "real estate", "realty", "property", "mortgage", "title",
        "appraisal", "broker", "housing", "condo", "apartment",
        "lease", "rental", "landlord", "development",
    ],
    "accounting": [
        "accounting", "accountant", "cpa", "bookkeep", "tax",
        "payroll", "audit", "fiscal",
    ],
    "personal_services": [
        "cleaning", "laundry", "dry clean", "moving", "storage",
        "pest control", "locksmith", "tailor", "alteration",
        "pet ", "veterinar", "grooming", "dog ", "cat ",
        "courier", "delivery", "errand", "concierge",
    ],
    "marketing": [
        "marketing", "advertising", "branding", "seo", "social media",
        "pr ", "public relations", "design agency", "creative agency",
        "graphic design", "copywrite",
    ],
    "nonprofit": [
        "foundation", "charity", "nonprofit", "non-profit", "church",
        "temple", "mosque", "synagogue", "ministry", "mission",
        "association", "society", "club", "rotary", "kiwanis",
        "lions", "united way", "red cross", "habitat",
        "big brothers", "big sisters", "boys & girls", "girl scout",
        "boy scout", "volunteer", "outreach", "advocacy",
    ],
    "professional_services": [
        "consult", "management", "staffing", "recruiting",
        "human resources", "hr ", "logistics", "shipping",
        "courier", "print", "copy", "translation", "interpret",
        "notarize", "office", "co-working", "coworking",
        "advisors", "advisory", "solutions", "services group",
        "boma", "strategic",
    ],
    "government": [
        "city of", "county", "state of", "federal", "government",
        "municipal", "police", "fire department", "post office",
        "library", "public works", "parks", "recreation",
        "planning", "zoning", "permit", "code enforcement",
    ],
    "arts_culture": [
        "art ", "arts", "gallery", "museum", "theater", "theatre",
        "dance", "ballet", "opera", "symphony", "orchestra",
        "cultural", "heritage", "historical", "stage", "performing",
    ],
    "transportation": [
        "airline", "airport", "aviation", "cargo", "freight",
        "shipping", "logistics", "trucking", "courier", "fedex",
        "ups ", "dhl", "usps", "transit", "taxi", "uber", "lyft",
        "limo", "charter", "parking", "valet",
    ],
}

# Known brand names that don't match keywords
BRAND_MAP = {
    "100 montaditos": "food_beverage",
    "450 gradi": "food_beverage",
    "ann taylor": "retail",
    "american airlines": "transportation",
    "adriana hoyos": "retail",
    "4kids of south florida": "nonprofit",
    "ajp ventures": "financial_services",
    "all atlantic benefits": "financial_services",
    "j. crew": "retail",
    "banana republic": "retail",
    "brooks brothers": "retail",
    "lululemon": "retail",
    "nordstrom": "retail",
    "forever 21": "retail",
    "h&m": "retail",
    "zara": "retail",
    "gap": "retail",
    "old navy": "retail",
    "anthropologie": "retail",
    "pottery barn": "retail",
    "restoration hardware": "retail",
    "williams-sonoma": "retail",
    "west elm": "retail",
    "sephora": "retail",
    "ulta": "retail",
    "bath & body works": "retail",
    "starbucks": "food_beverage",
    "mcdonald": "food_beverage",
    "wendy": "food_beverage",
    "chick-fil-a": "food_beverage",
    "subway": "food_beverage",
    "panera": "food_beverage",
    "chipotle": "food_beverage",
    "pollo tropical": "food_beverage",
    "cvs": "healthcare",
    "walgreens": "healthcare",
    "chase": "financial_services",
    "wells fargo": "financial_services",
    "citibank": "financial_services",
    "amerant": "financial_services",
    "regions": "financial_services",
    "td bank": "financial_services",
    "charles schwab": "financial_services",
    "edward jones": "financial_services",
    "merrill": "financial_services",
    "morgan stanley": "financial_services",
    "allstate": "financial_services",
    "state farm": "financial_services",
    "geico": "financial_services",
    "progressive": "financial_services",
    "ball & chain": "food_beverage",
    "avison young": "real_estate",
    "arte cucine": "retail",
    "actually organized": "personal_services",
}


def reclassify_categories(rows):
    """Third pass: expanded keywords + university detection."""
    print("\n[2/4] RECLASSIFYING remaining 'other' categories (pass 3)...")

    others_before = sum(1 for r in rows if (r.get("category_primary", "") or "").lower() in ("other", ""))

    fixed = 0
    for r in rows:
        cat = (r.get("category_primary", "") or "").strip().lower()
        if cat not in ("other", ""):
            continue

        name = (r.get("business_name", "") or "").lower()
        secondary = (r.get("category_secondary", "") or "").lower()
        addr = (r.get("address", "") or "").lower()
        neighborhood = (r.get("neighborhood_area", "") or "").lower()
        searchable = f"{name} {secondary} {addr}"

        # Brand name lookup first
        matched_brand = False
        for brand, brand_cat in BRAND_MAP.items():
            if brand in name:
                r["category_primary"] = brand_cat
                fixed += 1
                matched_brand = True
                break
        if matched_brand:
            continue

        # University entity detection
        if any(p in searchable for p in UNIVERSITY_PATTERNS):
            r["category_primary"] = "education"
            fixed += 1
            continue

        # UM-area entities without clear university keywords
        if "university of miami" in neighborhood and not any(
            kw in name for kw in ["restaurant", "cafe", "store", "market", "shop"]
        ):
            # Check if it's food/retail first
            is_food = any(kw in searchable for kw in PASS3_KEYWORDS.get("food_beverage", []))
            is_retail = any(kw in searchable for kw in PASS3_KEYWORDS.get("retail", []))
            if is_food:
                r["category_primary"] = "food_beverage"
                fixed += 1
                continue
            elif is_retail:
                r["category_primary"] = "retail"
                fixed += 1
                continue

        # Standard keyword sweep (most specific match wins)
        best_cat = None
        best_score = 0
        for category, keywords in PASS3_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in searchable)
            if score > best_score:
                best_score = score
                best_cat = category
            elif score == best_score and score > 0:
                # Tiebreaker: prefer more specific categories
                specific = ["financial_services", "technology", "automotive",
                            "hospitality", "arts_culture", "government"]
                if category in specific:
                    best_cat = category

        if best_cat and best_score >= 1:
            r["category_primary"] = best_cat
            fixed += 1
            continue

        # Name-suffix patterns
        if re.search(r',\s*pa\b', name) or name.endswith(' pa'):
            r["category_primary"] = "legal"
            fixed += 1
        elif 'pllc' in name:
            r["category_primary"] = "legal"
            fixed += 1
        elif re.search(r'(trustee|holdings|plaza).*llc', name):
            r["category_primary"] = "real_estate"
            fixed += 1

    others_after = sum(1 for r in rows if (r.get("category_primary", "") or "").lower() in ("other", ""))
    print(f"  Reclassified {fixed} businesses")
    print(f"  Before: {others_before} 'other' ({others_before/len(rows)*100:.1f}%)")
    print(f"  After:  {others_after} 'other' ({others_after/len(rows)*100:.1f}%)")

    # Show what's left
    if others_after > 0:
        remaining_names = [r.get("business_name", "???") for r in rows
                          if (r.get("category_primary", "") or "").lower() in ("other", "")]
        print(f"  Sample remaining: {remaining_names[:15]}")

    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 3: REBUILD GRAPH (full coverage, CSV-only)
# ═══════════════════════════════════════════════════════════════════════════════

def rebuild_graph(rows):
    """Build graph_data.json from CSV with ALL businesses."""
    print("\n[3/4] REBUILDING graph (full coverage)...")

    nodes = []
    links = []
    node_ids = set()

    # Category and neighborhood nodes
    categories = set()
    neighborhoods = set()
    for r in rows:
        cat = (r.get("category_primary", "") or "").strip()
        hood = (r.get("neighborhood_area", "") or "").strip()
        if cat:
            categories.add(cat)
        if hood:
            neighborhoods.add(hood)

    for cat in sorted(categories):
        node_id = f"cat_{cat}"
        nodes.append({"id": node_id, "name": cat.replace("_", " ").title(),
                       "type": "category", "group": cat})
        node_ids.add(node_id)

    for hood in sorted(neighborhoods):
        node_id = f"hood_{hood}"
        nodes.append({"id": node_id, "name": hood, "type": "neighborhood"})
        node_ids.add(node_id)

    # Business nodes
    for r in rows:
        bid = r.get("business_id", "").strip()
        if not bid or bid in node_ids:
            continue

        rating = safe_float(r.get("rating_primary_value", 0))
        reviews = int(safe_float(r.get("rating_primary_review_count", 0)))
        member = r.get("chamber_member", "").strip()

        nodes.append({
            "id": bid,
            "name": r.get("business_name", "Unknown"),
            "type": "business",
            "category": r.get("category_primary", "other"),
            "neighborhood": r.get("neighborhood_area", ""),
            "rating": round(rating, 1) if rating > 0 else None,
            "reviews": reviews,
            "member": member == "Y",
            "price_tier": r.get("price_tier", ""),
            "has_website": bool(r.get("website", "").strip()),
            "has_phone": bool(r.get("phone", "").strip()),
            "red_flag": r.get("red_flag_present", "") == "Y",
        })
        node_ids.add(bid)

        # CLASSIFIED_AS link
        cat = (r.get("category_primary", "") or "").strip()
        if cat:
            cat_id = f"cat_{cat}"
            links.append({"source": bid, "target": cat_id, "type": "CLASSIFIED_AS"})

        # LOCATED_IN link
        hood = (r.get("neighborhood_area", "") or "").strip()
        if hood:
            hood_id = f"hood_{hood}"
            links.append({"source": bid, "target": hood_id, "type": "LOCATED_IN"})

    # COMPETES_WITH: businesses in same category + neighborhood
    cat_hood_groups = defaultdict(list)
    for r in rows:
        bid = r.get("business_id", "").strip()
        cat = (r.get("category_primary", "") or "").strip()
        hood = (r.get("neighborhood_area", "") or "").strip()
        if bid and cat and hood:
            cat_hood_groups[(cat, hood)].append(bid)

    comp_count = 0
    for (cat, hood), bids in cat_hood_groups.items():
        if len(bids) < 2 or len(bids) > 50:
            # Skip huge groups (> 50) to keep graph manageable
            continue
        for i in range(len(bids)):
            for j in range(i + 1, min(i + 5, len(bids))):
                # Limit to 5 competition edges per business to avoid explosion
                links.append({
                    "source": bids[i], "target": bids[j],
                    "type": "COMPETES_WITH"
                })
                comp_count += 1

    # NEAR: businesses sharing same address (co-located)
    addr_groups = defaultdict(list)
    for r in rows:
        bid = r.get("business_id", "").strip()
        addr = (r.get("address", "") or "").strip().lower()
        if bid and addr and len(addr) > 10:
            addr_groups[addr].append(bid)

    near_count = 0
    for addr, bids in addr_groups.items():
        if len(bids) < 2 or len(bids) > 20:
            continue
        for i in range(len(bids)):
            for j in range(i + 1, len(bids)):
                links.append({
                    "source": bids[i], "target": bids[j],
                    "type": "NEAR"
                })
                near_count += 1

    graph = {"nodes": nodes, "links": links}

    biz_nodes = sum(1 for n in nodes if n.get("type") == "business")
    cat_nodes = sum(1 for n in nodes if n.get("type") == "category")
    hood_nodes = sum(1 for n in nodes if n.get("type") == "neighborhood")

    link_types = Counter(l["type"] for l in links)

    print(f"  Nodes: {len(nodes)} total ({biz_nodes} business, {cat_nodes} category, {hood_nodes} neighborhood)")
    print(f"  Links: {len(links)} total")
    for lt, count in sorted(link_types.items()):
        print(f"    {lt}: {count}")

    # Save
    if not DRY_RUN:
        with open(PUB / "graph_data.json", "w") as f:
            json.dump(graph, f)
        # Update graph_stats
        stats = {
            "total_businesses": biz_nodes,
            "total_edges": len(links),
            "category_distribution": dict(Counter(
                r.get("category_primary", "other") for r in rows
                if r.get("category_primary", "")
            )),
            "neighborhood_distribution": dict(Counter(
                r.get("neighborhood_area", "Unknown") for r in rows
                if r.get("neighborhood_area", "")
            )),
            "exported_nodes": len(nodes),
            "exported_links": len(links),
        }
        with open(PUB / "graph_stats.json", "w") as f:
            json.dump(stats, f, indent=2)
        print(f"  Saved graph_data.json + graph_stats.json")
    else:
        print(f"  [DRY RUN] Would save graph_data.json")

    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# FIX 4: REVIEW COUNT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

def validate_review_counts(rows):
    """Add review_count_source to track original vs inferred."""
    print("\n[4/4] VALIDATING review counts...")

    # We can't perfectly tell which were inferred vs original after the fact,
    # but we can re-check: if review_count equals the exact category median,
    # it was likely inferred
    cat_reviews = defaultdict(list)
    for r in rows:
        try:
            rev = int(safe_float(r.get("rating_primary_review_count", 0)))
            rat = safe_float(r.get("rating_primary_value", 0))
            if rat > 0 and rev > 0:
                cat_reviews[r.get("category_primary", "other")].append(rev)
        except:
            pass

    cat_medians = {}
    for cat, revs in cat_reviews.items():
        s = sorted(revs)
        cat_medians[cat] = s[len(s) // 2] if s else 0

    inferred_count = 0
    original_count = 0
    for r in rows:
        try:
            rev = int(safe_float(r.get("rating_primary_review_count", 0)))
            rat = safe_float(r.get("rating_primary_value", 0))
        except:
            continue

        cat = r.get("category_primary", "other")
        cat_med = cat_medians.get(cat, 0)

        # If review count exactly matches the category median and this business
        # wasn't one of the originally-reviewed ones (which had unique counts),
        # it was likely inferred
        if rev > 0 and rev == cat_med and rat > 0:
            # Could be coincidence, but statistically unlikely for many
            r["review_count_source"] = "inferred"
            inferred_count += 1
        elif rev > 0:
            r["review_count_source"] = "original"
            original_count += 1
        else:
            r["review_count_source"] = ""

    print(f"  Original review counts: {original_count}")
    print(f"  Inferred review counts: {inferred_count}")
    print(f"  No reviews: {len(rows) - original_count - inferred_count}")
    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("DATA VALIDATION FIXES")
    print(f"{'[DRY RUN]' if DRY_RUN else '[LIVE]'} — {datetime.now().isoformat()}")
    print("=" * 70)

    rows = load_master()
    fieldnames = list(rows[0].keys()) if rows else []
    print(f"Loaded {len(rows)} records")

    backup_master()

    # Run all fixes
    rows = recalibrate_red_flags(rows)
    rows = reclassify_categories(rows)
    rows = rebuild_graph(rows)
    rows = validate_review_counts(rows)

    # Ensure new columns in fieldnames
    for r in rows:
        for k in r.keys():
            if k not in fieldnames:
                fieldnames.append(k)

    save_master(rows, fieldnames)

    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)
    flagged = sum(1 for r in rows if r.get("red_flag_present", "") == "Y")
    others = sum(1 for r in rows if (r.get("category_primary", "") or "").lower() in ("other", ""))
    print(f"  Red flags: {flagged}/{len(rows)} ({flagged/len(rows)*100:.1f}%)")
    print(f"  Other categories: {others}/{len(rows)} ({others/len(rows)*100:.1f}%)")
    if not DRY_RUN:
        print(f"\nSaved. Run data_integrity_check.py to verify.")


if __name__ == "__main__":
    main()
