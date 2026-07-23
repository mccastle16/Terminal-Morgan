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

from _shared import classify_category

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

# ── Rule-based mapping ──────────────────────────────────────────────────────
# Classification keywords live in _shared.classify_category (word-boundary
# based) so this reclassifier, Agent 2's map_category, and Agent 2's Pass-4
# name inference all use ONE ruleset and can never disagree.


def classify_business(row):
    """
    Attempt to reclassify an 'other' business.
    Returns (new_category, method) or (None, None).
    """
    cat2 = (row.get("category_secondary", "") or "").strip()
    name = (row.get("business_name", "") or "").strip()

    # Strategy 1: Use category_secondary
    if cat2:
        result = classify_category(cat2)
        if result:
            return result, "keyword_cat2"

    # Strategy 2: Use business name
    if name:
        result = classify_category(name)
        if result:
            return result, "keyword_name"

    # Strategy 3: Combined name + cat2
    combined = f"{name} {cat2}"
    result = classify_category(combined)
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
