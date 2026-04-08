#!/usr/bin/env python3
"""
Sentiment & Signal Extractor — Derives sentiment intelligence from existing data
================================================================================
Since raw review text is unavailable, this script builds sentiment profiles from:
  1. Rating-based sentiment (positive/neutral/negative)
  2. Delight/pain keyword extraction (47 businesses with text)
  3. Red flag severity signals
  4. Composite Sentiment Score (CSS): 0-100

Outputs:
  dashboard/public/data/sentiment_profiles.json — per-business sentiment data
  dashboard/public/data/sentiment_themes.json — aggregated market themes

Usage:
  python3 "scripts/14. sentiment_extractor.py"
"""

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
OUT_PROFILES = ROOT / "dashboard" / "public" / "data" / "sentiment_profiles.json"
OUT_THEMES = ROOT / "dashboard" / "public" / "data" / "sentiment_themes.json"

# ── Theme keyword mapping ────────────────────────────────────────────────────
THEME_KEYWORDS = {
    "service_quality": ["service", "staff", "friendly", "professional", "helpful", "attentive", "rude", "slow", "unhelpful"],
    "value_pricing": ["price", "expensive", "cheap", "value", "overpriced", "affordable", "cost", "worth"],
    "location_access": ["location", "parking", "access", "convenient", "traffic", "far", "close", "downtown"],
    "ambiance_design": ["ambiance", "atmosphere", "design", "interior", "modern", "clean", "dirty", "outdated", "beautiful"],
    "food_quality": ["food", "fresh", "delicious", "taste", "quality", "bland", "cold"],
    "innovation_tech": ["technology", "digital", "innovation", "app", "online", "modern"],
    "reliability": ["reliable", "consistent", "trust", "dependable", "late", "cancel", "failure"],
    "growth_momentum": ["growth", "expand", "new", "opening", "development", "capital", "anchor"],
}

def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def extract_themes(text):
    """Extract matching themes from text snippets."""
    if not text or not text.strip():
        return []
    text_lower = text.lower()
    matched = []
    for theme, keywords in THEME_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                matched.append(theme)
                break
    return matched

def rating_sentiment(rating):
    """Classify rating into sentiment band."""
    if rating >= 4.5:
        return "very_positive"
    elif rating >= 3.8:
        return "positive"
    elif rating >= 3.0:
        return "neutral"
    elif rating > 0:
        return "negative"
    return "unrated"

def compute_css(row, rating):
    """
    Composite Sentiment Score (CSS): 0-100
    Weighted: rating (40%), review volume (15%), red flag penalty (20%),
              delight bonus (15%), digital presence bonus (10%)
    """
    # Rating component (0-40)
    rating_score = (rating / 5.0 * 40) if rating > 0 else 20  # neutral default

    # Review volume: more reviews = more confidence (0-15)
    reviews = int(float(row.get("rating_primary_review_count") or 0))
    review_score = min(reviews, 200) / 200 * 15

    # Red flag penalty (0 to -20)
    has_flag = row.get("red_flag_present", "").strip().upper() == "Y"
    severity = row.get("red_flag_severity", "").strip().lower()
    flag_penalty = 0
    if has_flag:
        flag_penalty = {"critical": 20, "high": 15, "medium": 10, "low": 5}.get(severity, 10)

    # Delight bonus: has positive signals (0-15)
    delights = row.get("top_delights", "").strip()
    delight_score = min(len(delights.split(";")) * 5, 15) if delights else 0

    # Digital presence bonus (0-10)
    has_web = bool(row.get("website", "").strip())
    has_phone = bool(row.get("phone", "").strip())
    digital_score = (5 if has_web else 0) + (5 if has_phone else 0)

    css = max(0, min(100, round(rating_score + review_score - flag_penalty + delight_score + digital_score)))
    return css

def main():
    print("=" * 60)
    print("  Sentiment & Signal Extractor")
    print("=" * 60)

    rows = load_csv(MASTER_CSV)
    print(f"\nProcessing {len(rows)} businesses...")

    profiles = []
    all_delight_themes = Counter()
    all_pain_themes = Counter()
    sentiment_dist = Counter()
    category_sentiment = {}

    for row in rows:
        biz_id = row.get("business_id", "")
        name = row.get("business_name", "")
        rating = float(row.get("rating_primary_value") or 0)
        reviews = int(float(row.get("rating_primary_review_count") or 0))
        category = row.get("category_primary", "other")
        delights = row.get("top_delights", "").strip()
        pains = row.get("top_pain_points", "").strip()

        sentiment = rating_sentiment(rating)
        css = compute_css(row, rating)

        # Extract themes
        delight_themes = extract_themes(delights)
        pain_themes = extract_themes(pains)

        for t in delight_themes:
            all_delight_themes[t] += 1
        for t in pain_themes:
            all_pain_themes[t] += 1

        sentiment_dist[sentiment] += 1

        # Category aggregation
        if category not in category_sentiment:
            category_sentiment[category] = {"ratings": [], "css_scores": [], "sentiments": Counter()}
        if rating > 0:
            category_sentiment[category]["ratings"].append(rating)
        category_sentiment[category]["css_scores"].append(css)
        category_sentiment[category]["sentiments"][sentiment] += 1

        # Delight/pain snippets (semicolon-split)
        delight_items = [d.strip() for d in delights.split(";") if d.strip()] if delights else []
        pain_items = [p.strip() for p in pains.split(";") if p.strip()] if pains else []

        profile = {
            "business_id": biz_id,
            "sentiment": sentiment,
            "css": css,
            "rating": rating,
            "review_count": reviews,
            "delight_themes": delight_themes,
            "pain_themes": pain_themes,
            "delights": delight_items[:3],
            "pains": pain_items[:3],
            "has_sentiment_text": bool(delights or pains),
        }
        profiles.append(profile)

    # Build market-level theme analysis
    category_summaries = []
    for cat, data in sorted(category_sentiment.items()):
        ratings = data["ratings"]
        css_scores = data["css_scores"]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        avg_css = sum(css_scores) / len(css_scores) if css_scores else 0
        dominant = data["sentiments"].most_common(1)[0][0] if data["sentiments"] else "unrated"
        category_summaries.append({
            "category": cat,
            "avg_rating": round(avg_rating, 2),
            "avg_css": round(avg_css),
            "dominant_sentiment": dominant,
            "count": len(css_scores),
            "positive_pct": round((data["sentiments"].get("very_positive", 0) + data["sentiments"].get("positive", 0)) / len(css_scores) * 100),
            "negative_pct": round(data["sentiments"].get("negative", 0) / len(css_scores) * 100),
        })
    category_summaries.sort(key=lambda x: -x["avg_css"])

    themes = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "total_businesses": len(rows),
        "with_sentiment_text": sum(1 for p in profiles if p["has_sentiment_text"]),
        "sentiment_distribution": dict(sentiment_dist),
        "delight_themes": dict(all_delight_themes.most_common()),
        "pain_themes": dict(all_pain_themes.most_common()),
        "category_sentiment": category_summaries,
        "top_positive": sorted([p for p in profiles if p["css"] >= 70], key=lambda x: -x["css"])[:20],
        "top_negative": sorted([p for p in profiles if p["css"] <= 35], key=lambda x: x["css"])[:20],
    }

    # Write outputs
    OUT_PROFILES.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PROFILES, "w") as f:
        json.dump(profiles, f, indent=2)
    print(f"  Profiles: {OUT_PROFILES} ({len(profiles)} entries)")

    with open(OUT_THEMES, "w") as f:
        json.dump(themes, f, indent=2)
    print(f"  Themes:   {OUT_THEMES}")

    # Summary
    print(f"\n  Sentiment Distribution:")
    for sent, ct in sentiment_dist.most_common():
        print(f"    {sent:20s}: {ct:5d} ({ct/len(rows)*100:.1f}%)")

    print(f"\n  Delight Themes (from {sum(all_delight_themes.values())} signals):")
    for theme, ct in all_delight_themes.most_common():
        print(f"    {theme:20s}: {ct}")

    print(f"\n  Pain Themes (from {sum(all_pain_themes.values())} signals):")
    for theme, ct in all_pain_themes.most_common():
        print(f"    {theme:20s}: {ct}")

    print(f"\n  Top 5 Categories by Sentiment:")
    for cs in category_summaries[:5]:
        print(f"    {cs['category']:25s} CSS={cs['avg_css']:3d}  positive={cs['positive_pct']}%  negative={cs['negative_pct']}%")

    print(f"\n  Done.")

if __name__ == "__main__":
    main()
