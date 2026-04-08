#!/usr/bin/env python3
"""
Category Reclassifier — Fixes the 691 "other" businesses
=========================================================
Strategy:
  1. Rule-based: Map category_secondary keywords → category_primary (390 with cat2)
  2. Name-based: Infer from business name patterns (301 without cat2)
  3. Optional: GPT fallback for remaining unknowns
  
Usage:
  python3 "scripts/11. category_reclassifier.py"                      # dry-run
  python3 "scripts/11. category_reclassifier.py" --apply               # write changes
  python3 "scripts/11. category_reclassifier.py" --apply --use-llm     # + GPT fallback
"""

import csv
import os
import re
import sys
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
UNION_CSV  = ROOT / "dashboard" / "public" / "data" / "union_all_businesses.csv"
LITE_CSV   = ROOT / "dashboard" / "public" / "data" / "businesses_lite.csv"
BACKUP_DIR = ROOT / "data" / "snapshots"

VALID_CATEGORIES = [
    "accounting", "arts_culture", "auto_dealer", "banking", "construction",
    "consulting", "education", "financial_services", "food_beverage",
    "healthcare", "hospitality", "insurance", "legal", "marketing",
    "nonprofit", "personal_services", "professional_services", "real_estate",
    "retail", "technology", "wellness",
]

# ── Rule-based mapping: category_secondary keywords → category_primary ──────

KEYWORD_MAP = {
    # Food & Beverage
    "food_beverage": [
        "restaurant", "cafe", "coffee", "bakery", "bar", "pub", "pizza",
        "sushi", "grill", "diner", "caterer", "catering", "juice", "ice cream",
        "sandwich", "burger", "taco", "brewery", "winery", "bistro", "eatery",
        "food", "beverage", "pastry", "deli", "donut", "gelato", "chocolat",
        "smoothie", "tea house", "ramen", "poke", "acai", "dining",
    ],
    # Healthcare
    "healthcare": [
        "doctor", "dentist", "dental", "medical", "clinic", "hospital",
        "physician", "surgeon", "optometr", "dermatolog", "pediatr",
        "chiropr", "orthoped", "psychiat", "pharma", "nursing", "nurse",
        "urgent care", "health care", "healthcare", "mental health",
        "therap", "counselor", "audiolog", "podiatr", "oncolog",
        "cardiolog", "neurolog", "radiology", "patholog", "veterinar",
    ],
    # Legal
    "legal": [
        "attorney", "lawyer", "law firm", "law office", "legal",
        "notary", "paralegal", "mediation", "arbitration",
    ],
    # Real Estate
    "real_estate": [
        "real estate", "realty", "realtor", "property", "mortgage",
        "title company", "title agency", "apprais", "brokerage",
        "commercial real", "residential real",
    ],
    # Financial Services
    "financial_services": [
        "financial advisor", "financial planner", "wealth management",
        "investment", "cpa", "tax", "payroll", "bookkeeping",
        "financial service", "asset management", "hedge fund",
        "private equity", "venture capital", "credit union",
    ],
    # Banking
    "banking": [
        "bank", "banking", "savings", "chase", "wells fargo",
        "citibank", "capital one",
    ],
    # Insurance
    "insurance": [
        "insurance", "aflac", "allstate", "state farm", "geico",
        "progressive", "allianz", "gallagher",
    ],
    # Retail
    "retail": [
        "store", "shop", "boutique", "clothing", "apparel", "fashion",
        "jewel", "furniture", "home decor", "gift", "florist", "flower",
        "pet", "shoe", "optical", "eyewear", "sporting", "toy",
        "bookstore", "hardware", "supply", "grocery", "market",
        "supermarket", "wine shop", "liquor", "smoke",
    ],
    # Education
    "education": [
        "school", "university", "college", "academy", "tutoring",
        "learning", "preschool", "daycare", "montessori", "training center",
        "education", "student", "child care", "childcare",
    ],
    # Hospitality
    "hospitality": [
        "hotel", "motel", "resort", "inn", "lodge", "suites",
        "bed and breakfast", "airbnb", "vacation rental", "travel agent",
        "tour", "event venue", "banquet", "conference center",
    ],
    # Construction
    "construction": [
        "construct", "contractor", "builder", "plumb", "electric",
        "hvac", "roofing", "paving", "excavat", "demolition",
        "renovation", "remodel", "architect", "engineering",
        "general contractor", "handyman", "landscap",
    ],
    # Wellness
    "wellness": [
        "spa", "salon", "barber", "nail", "massage", "yoga", "pilates",
        "fitness", "gym", "crossfit", "wellness", "meditation",
        "acupuncture", "holistic", "aesthetic", "beauty", "skin care",
        "skincare", "hair", "wax",
    ],
    # Marketing
    "marketing": [
        "marketing", "advertis", "branding", "pr agency", "public relat",
        "social media", "seo", "digital marketing", "graphic design",
        "web design", "creative agency", "media",
    ],
    # Technology
    "technology": [
        "software", "tech", "it service", "computer", "cyber",
        "data", "cloud", "app develop", "web develop", "ai ",
        "artificial intell", "saas", "telecom",
    ],
    # Consulting
    "consulting": [
        "consult", "advisory", "coach", "mentor", "strateg",
        "management consult", "business develop",
    ],
    # Nonprofit
    "nonprofit": [
        "nonprofit", "non-profit", "foundation", "charity", "association",
        "society", "red cross", "cancer society", "heart association",
        "alzheimer", "legion", "rotary", "kiwanis", "lions club",
        "united way", "habitat for human", "ymca", "ywca",
    ],
    # Arts & Culture
    "arts_culture": [
        "art gallery", "museum", "theater", "theatre", "performing art",
        "music", "dance", "studio", "gallery", "cultural",
        "jazz", "orchestra", "opera", "film", "cinema",
    ],
    # Personal Services
    "personal_services": [
        "dry clean", "laundry", "tailor", "moving", "storage",
        "cleaning service", "maid", "pest control", "locksmith",
        "photographer", "videograph", "print", "sign",
        "courier", "delivery", "shipping", "postal",
    ],
    # Professional Services
    "professional_services": [
        "staffing", "recruiting", "human resource", "hr ",
        "translation", "interpret", "security", "guard",
        "private investigat", "detective",
    ],
    # Auto
    "auto_dealer": [
        "auto", "car dealer", "vehicle", "motor", "tire",
        "auto repair", "body shop", "car wash", "parking",
    ],
    # Accounting
    "accounting": [
        "accounting", "accountant", "audit",
    ],
}


def classify_by_keywords(text):
    """Match text against keyword map. Returns best category or None."""
    if not text:
        return None
    text_lower = text.lower()
    best_match = None
    best_count = 0
    for category, keywords in KEYWORD_MAP.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > best_count:
            best_count = count
            best_match = category
    return best_match if best_count > 0 else None


def classify_business(row):
    """
    Attempt to reclassify an 'other' business.
    Returns (new_category, method) or (None, None).
    """
    cat2 = (row.get("category_secondary", "") or "").strip()
    name = (row.get("business_name", "") or "").strip()

    # Strategy 1: Use category_secondary
    if cat2:
        result = classify_by_keywords(cat2)
        if result:
            return result, "keyword_cat2"

    # Strategy 2: Use business name
    if name:
        result = classify_by_keywords(name)
        if result:
            return result, "keyword_name"

    # Strategy 3: Combined name + cat2
    combined = f"{name} {cat2}"
    result = classify_by_keywords(combined)
    if result:
        return result, "keyword_combined"

    return None, None


def reclassify_with_llm(unresolved, api_key):
    """Use OpenAI to classify remaining businesses. Batched for efficiency."""
    try:
        import openai
    except ImportError:
        print("  openai package not installed. Run: pip install openai")
        return {}

    client = openai.OpenAI(api_key=api_key)
    results = {}
    batch_size = 30

    categories_str = ", ".join(VALID_CATEGORIES)

    for i in range(0, len(unresolved), batch_size):
        batch = unresolved[i:i + batch_size]
        prompt_lines = []
        for idx, row in enumerate(batch):
            name = row.get("business_name", "Unknown")
            cat2 = row.get("category_secondary", "")
            addr = row.get("address", "")
            prompt_lines.append(f"{idx+1}. {name} | {cat2} | {addr}")

        prompt = (
            f"Classify each business into EXACTLY ONE of these categories: {categories_str}\n"
            "If truly unclassifiable, use 'other'.\n"
            "Return ONLY a JSON array of objects: [{\"index\": 1, \"category\": \"...\"}]\n\n"
            + "\n".join(prompt_lines)
        )

        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You classify businesses into standard categories. Be precise. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000,
            )
            text = resp.choices[0].message.content.strip()
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                classifications = json.loads(json_match.group())
                for c in classifications:
                    idx = c.get("index", 0) - 1
                    cat = c.get("category", "").strip().lower()
                    if 0 <= idx < len(batch) and cat in VALID_CATEGORIES:
                        bid = batch[idx].get("business_id", "")
                        results[bid] = cat
            print(f"  LLM batch {i//batch_size + 1}: classified {len([c for c in classifications if c.get('category','') != 'other'])} businesses")
        except Exception as e:
            print(f"  LLM batch {i//batch_size + 1} failed: {e}")

    return results


def main():
    apply = "--apply" in sys.argv
    use_llm = "--use-llm" in sys.argv

    print("=" * 60)
    print("Category Reclassifier")
    print("=" * 60)

    # Read master CSV
    with open(MASTER_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len(rows)
    others = [r for r in rows if (r.get("category_primary", "").strip() in ("other", ""))]
    print(f"\nTotal businesses: {total}")
    print(f"Category 'other' or blank: {len(others)} ({len(others)/total*100:.1f}%)")

    # Phase 1: Rule-based reclassification
    print(f"\n── Phase 1: Rule-based classification ──")
    reclassified = {}
    unresolved = []

    for row in others:
        new_cat, method = classify_business(row)
        bid = row.get("business_id", "")
        if new_cat:
            reclassified[bid] = (new_cat, method)
        else:
            unresolved.append(row)

    print(f"  Reclassified: {len(reclassified)}")
    print(f"  Unresolved:   {len(unresolved)}")

    # Show distribution of reclassifications
    cat_counts = {}
    for _, (cat, _) in reclassified.items():
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print(f"\n  Distribution of reclassifications:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"    {cat:25s} → {count}")

    # Method breakdown
    method_counts = {}
    for _, (_, method) in reclassified.items():
        method_counts[method] = method_counts.get(method, 0) + 1
    print(f"\n  By method:")
    for method, count in sorted(method_counts.items(), key=lambda x: -x[1]):
        print(f"    {method:20s} → {count}")

    # Phase 2: LLM for unresolved (optional)
    llm_results = {}
    if use_llm and unresolved:
        print(f"\n── Phase 2: LLM classification ({len(unresolved)} businesses) ──")
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            env_path = ROOT / "dashboard" / "server" / ".env"
            if env_path.exists():
                for line in env_path.read_text().splitlines():
                    if line.startswith("OPENAI_API_KEY="):
                        api_key = line.split("=", 1)[1].strip().strip("'\"")
        if api_key:
            llm_results = reclassify_with_llm(unresolved, api_key)
            print(f"  LLM reclassified: {len(llm_results)}")
        else:
            print("  No API key found. Skipping LLM phase.")

    # Summary
    total_fixed = len(reclassified) + len(llm_results)
    remaining = len(others) - total_fixed
    print(f"\n{'=' * 60}")
    print(f"SUMMARY")
    print(f"  Total 'other'/blank: {len(others)}")
    print(f"  Rule-based fixes:    {len(reclassified)}")
    print(f"  LLM fixes:           {len(llm_results)}")
    print(f"  Total fixed:         {total_fixed}")
    print(f"  Remaining 'other':   {remaining}")
    print(f"  New 'other' rate:    {remaining/total*100:.1f}% (was {len(others)/total*100:.1f}%)")

    if not apply:
        print(f"\n  DRY RUN — no files modified. Use --apply to write changes.")
        # Show first 10 samples
        print(f"\n  Sample reclassifications:")
        for bid, (cat, method) in list(reclassified.items())[:10]:
            name = next((r["business_name"] for r in rows if r.get("business_id") == bid), "?")
            print(f"    {name[:35]:35s} → {cat} ({method})")
        return

    # Apply changes
    print(f"\n── Applying changes ──")

    # Backup first
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"master_pre_reclass_{ts}.csv"
    with open(MASTER_CSV, "r", encoding="utf-8") as src:
        backup_path.write_text(src.read(), encoding="utf-8")
    print(f"  Backup: {backup_path}")

    # Merge all reclassifications
    all_fixes = {bid: cat for bid, (cat, _) in reclassified.items()}
    all_fixes.update(llm_results)

    # Update master CSV
    updated = 0
    for row in rows:
        bid = row.get("business_id", "")
        if bid in all_fixes:
            row["category_primary"] = all_fixes[bid]
            updated += 1

    with open(MASTER_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Updated master CSV: {updated} rows")

    # Update union CSV (if it has category_primary)
    if UNION_CSV.exists():
        with open(UNION_CSV, newline="", encoding="utf-8") as f:
            ureader = csv.DictReader(f)
            ufieldnames = ureader.fieldnames
            urows = list(ureader)

        u_updated = 0
        for row in urows:
            bid = row.get("business_id", "")
            if bid in all_fixes:
                row["category_primary"] = all_fixes[bid]
                u_updated += 1

        with open(UNION_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=ufieldnames)
            writer.writeheader()
            writer.writerows(urows)
        print(f"  Updated union CSV:  {u_updated} rows")

    # Update lite CSV (if it has category_primary)
    if LITE_CSV.exists():
        with open(LITE_CSV, newline="", encoding="utf-8") as f:
            lreader = csv.DictReader(f)
            lfieldnames = lreader.fieldnames
            lrows = list(lreader)

        l_updated = 0
        for row in lrows:
            bid = row.get("business_id", "")
            if bid in all_fixes:
                row["category_primary"] = all_fixes[bid]
                l_updated += 1

        with open(LITE_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=lfieldnames)
            writer.writeheader()
            writer.writerows(lrows)
        print(f"  Updated lite CSV:   {l_updated} rows")

    # Save classification log
    log_path = BACKUP_DIR / f"reclass_log_{ts}.json"
    log_data = {
        "timestamp": ts,
        "total_others": len(others),
        "rule_based_fixes": len(reclassified),
        "llm_fixes": len(llm_results),
        "remaining_others": remaining,
        "classifications": {bid: {"category": cat, "method": method} for bid, (cat, method) in reclassified.items()},
        "llm_classifications": llm_results,
    }
    log_path.write_text(json.dumps(log_data, indent=2), encoding="utf-8")
    print(f"  Classification log: {log_path}")
    print(f"\nDone! Restart the dashboard to see updated categories.")


if __name__ == "__main__":
    main()
