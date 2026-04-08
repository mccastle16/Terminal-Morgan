#!/usr/bin/env python3
"""
Growth & Churn Prediction Model — Feature-based scoring engine
==============================================================
Builds two predictive scores per business:
  1. Membership Probability (MP): 0-100 — likelihood to join/retain chamber
  2. Growth Trajectory (GT): -50 to +50 — upward or downward momentum

Uses logistic-regression-style feature weights learned from existing member
vs non-member distributions. No external ML library needed.

Outputs:
  dashboard/public/data/predictions.json — per-business predictions
  dashboard/public/data/prediction_summary.json — market-level prediction stats

Usage:
  python3 "scripts/16. prediction_model.py"
"""

import csv
import json
import math
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
SENTIMENT = ROOT / "dashboard" / "public" / "data" / "sentiment_profiles.json"
CENTRALITY = ROOT / "dashboard" / "public" / "data" / "network_centrality.json"
OUT_PREDICTIONS = ROOT / "dashboard" / "public" / "data" / "predictions.json"
OUT_SUMMARY = ROOT / "dashboard" / "public" / "data" / "prediction_summary.json"

def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def load_json(path):
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None

def sigmoid(x):
    """Sigmoid function for probability mapping."""
    return 1.0 / (1.0 + math.exp(-max(-10, min(10, x))))

def _safe_float(val, default=0.0):
    """Parse numeric values, mapping text labels to numeric equivalents."""
    if not val or not str(val).strip():
        return default
    s = str(val).strip()
    try:
        return float(s)
    except ValueError:
        return {"High": 1.0, "Moderate": 0.6, "Medium": 0.6, "Low": 0.3}.get(s, default)

def learn_feature_weights(rows):
    """
    Learn feature weights from member vs non-member distributions.
    For each feature, compute the difference in means between members
    and non-members — this gives us a discriminative direction.
    """
    members = [r for r in rows if r.get("chamber_member", "").strip().upper() == "Y"]
    non_members = [r for r in rows if r.get("chamber_member", "").strip().upper() == "N"]

    if not members or not non_members:
        return {}

    features = {
        "rating": lambda r: float(r.get("rating_primary_value") or 0),
        "reviews": lambda r: min(int(float(r.get("rating_primary_review_count") or 0)), 500),
        "confidence": lambda r: _safe_float(r.get("osint_confidence", "")),
        "has_website": lambda r: 1.0 if r.get("website", "").strip() else 0.0,
        "has_phone": lambda r: 1.0 if r.get("phone", "").strip() else 0.0,
        "corroboration": lambda r: min(int(r.get("corroboration_count") or 0), 10),
        "red_flag": lambda r: -1.0 if r.get("red_flag_present", "").strip().upper() == "Y" else 0.0,
        "validation": lambda r: {"High": 3, "Moderate": 2, "Low": 1}.get(r.get("validation_tier", "").strip(), 0),
        "price_tier": lambda r: {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}.get(r.get("price_tier", "").strip(), 2),
    }

    weights = {}
    for fname, extractor in features.items():
        m_vals = [extractor(r) for r in members]
        nm_vals = [extractor(r) for r in non_members]
        m_mean = sum(m_vals) / len(m_vals) if m_vals else 0
        nm_mean = sum(nm_vals) / len(nm_vals) if nm_vals else 0
        m_std = max(0.1, (sum((v - m_mean)**2 for v in m_vals) / len(m_vals))**0.5) if m_vals else 1
        # Weight = (member_mean - non_member_mean) / std — normalized direction
        weights[fname] = {
            "member_mean": round(m_mean, 3),
            "non_member_mean": round(nm_mean, 3),
            "direction": round((m_mean - nm_mean) / m_std, 3),
            "extractor": extractor,
        }

    return weights

def predict_membership(row, weights, sentiment_map, centrality_nodes):
    """
    Membership Probability — logistic regression on feature deltas.
    Returns 0-100 score.
    """
    z = 0.0  # log-odds accumulator
    breakdown = {}

    for fname, w in weights.items():
        val = w["extractor"](row)
        direction = w["direction"]
        contrib = direction * val * 0.3  # scale factor
        z += contrib
        breakdown[fname] = round(contrib, 3)

    # Sentiment bonus
    biz_id = row.get("business_id", "")
    if biz_id in sentiment_map:
        css = sentiment_map[biz_id].get("css", 50)
        sentiment_contrib = (css - 50) / 100 * 0.5
        z += sentiment_contrib
        breakdown["sentiment"] = round(sentiment_contrib, 3)

    # Network influence bonus
    if centrality_nodes and biz_id in centrality_nodes:
        influence = centrality_nodes[biz_id].get("influence_score", 0)
        net_contrib = influence * 0.8
        z += net_contrib
        breakdown["network_influence"] = round(net_contrib, 3)

    probability = sigmoid(z)
    return round(probability * 100), breakdown

def predict_growth(row, weights, sentiment_map, centrality_nodes):
    """
    Growth Trajectory — momentum signal based on:
    - Rating relative to category average (positive = above average)
    - Review count (higher = more visible, more momentum)
    - Digital presence completeness
    - Sentiment direction
    - Network position (bridge nodes grow faster)
    
    Returns -50 to +50.
    """
    score = 0.0
    signals = []

    rating = float(row.get("rating_primary_value") or 0)
    reviews = int(float(row.get("rating_primary_review_count") or 0))
    has_web = bool(row.get("website", "").strip())
    has_phone = bool(row.get("phone", "").strip())
    has_flag = row.get("red_flag_present", "").strip().upper() == "Y"
    biz_id = row.get("business_id", "")

    # Rating signal
    if rating >= 4.5:
        score += 10
        signals.append("high_rating")
    elif rating >= 3.8:
        score += 3
    elif rating > 0 and rating < 3.0:
        score -= 10
        signals.append("low_rating")

    # Review momentum
    if reviews >= 100:
        score += 8
        signals.append("high_visibility")
    elif reviews >= 30:
        score += 4
    elif reviews > 0:
        score += 1

    # Digital completeness
    if has_web and has_phone:
        score += 5
    elif has_web or has_phone:
        score += 2
    else:
        score -= 5
        signals.append("no_digital")

    # Red flag drag
    if has_flag:
        severity = row.get("red_flag_severity", "").strip().lower()
        penalty = {"critical": -15, "high": -10, "medium": -5, "low": -2}.get(severity, -5)
        score += penalty
        signals.append("red_flag")

    # Sentiment momentum
    if biz_id in (sentiment_map or {}):
        css = sentiment_map[biz_id].get("css", 50)
        if css >= 70:
            score += 6
            signals.append("positive_sentiment")
        elif css <= 30:
            score -= 6
            signals.append("negative_sentiment")

    # Network position
    if centrality_nodes and biz_id in (centrality_nodes or {}):
        node = centrality_nodes[biz_id]
        if node.get("betweenness", 0) > 0.01:
            score += 5
            signals.append("bridge_position")
        if node.get("influence_score", 0) > 0.15:
            score += 3
            signals.append("high_influence")

    # Corroboration (multi-source = more established)
    corrob = int(row.get("corroboration_count") or 0)
    if corrob >= 4:
        score += 3
    elif corrob >= 2:
        score += 1

    return max(-50, min(50, round(score))), signals

def main():
    print("=" * 60)
    print("  Growth & Churn Prediction Model")
    print("=" * 60)

    rows = load_csv(MASTER_CSV)
    print(f"\n  Businesses: {len(rows)}")

    # Load enrichment data
    sentiment_data = load_json(SENTIMENT)
    sentiment_map = {}
    if sentiment_data:
        sentiment_map = {s["business_id"]: s for s in sentiment_data}
        print(f"  Sentiment profiles loaded: {len(sentiment_map)}")

    centrality_data = load_json(CENTRALITY)
    centrality_nodes = centrality_data.get("nodes", {}) if centrality_data else {}
    if centrality_nodes:
        print(f"  Centrality nodes loaded: {len(centrality_nodes)}")

    # Learn weights from data
    weights = learn_feature_weights(rows)
    print(f"\n  Feature weights (member vs non-member):")
    for fname, w in sorted(weights.items(), key=lambda x: -abs(x[1]["direction"])):
        print(f"    {fname:20s}  member_avg={w['member_mean']:6.2f}  non_member_avg={w['non_member_mean']:6.2f}  direction={w['direction']:+.3f}")

    # Run predictions
    predictions = []
    mp_dist = Counter()
    gt_dist = Counter()
    category_predictions = defaultdict(lambda: {"mp_scores": [], "gt_scores": []})

    for row in rows:
        mp_score, mp_breakdown = predict_membership(row, weights, sentiment_map, centrality_nodes)
        gt_score, gt_signals = predict_growth(row, weights, sentiment_map, centrality_nodes)

        member_status = row.get("chamber_member", "").strip().upper()
        is_member = member_status == "Y"

        # Classify
        if mp_score >= 70:
            mp_band = "high"
        elif mp_score >= 40:
            mp_band = "medium"
        else:
            mp_band = "low"

        if gt_score >= 10:
            gt_band = "growing"
        elif gt_score >= -5:
            gt_band = "stable"
        else:
            gt_band = "declining"

        # For current members: high MP + declining GT = churn risk
        churn_risk = None
        if is_member:
            if gt_score <= -10:
                churn_risk = "high"
            elif gt_score <= -3:
                churn_risk = "medium"
            else:
                churn_risk = "low"

        cat = row.get("category_primary", "other")
        category_predictions[cat]["mp_scores"].append(mp_score)
        category_predictions[cat]["gt_scores"].append(gt_score)

        mp_dist[mp_band] += 1
        gt_dist[gt_band] += 1

        predictions.append({
            "business_id": row.get("business_id", ""),
            "membership_probability": mp_score,
            "mp_band": mp_band,
            "growth_trajectory": gt_score,
            "gt_band": gt_band,
            "gt_signals": gt_signals,
            "churn_risk": churn_risk,
            "is_member": is_member,
        })

    # Summary stats
    all_mp = [p["membership_probability"] for p in predictions]
    all_gt = [p["growth_trajectory"] for p in predictions]
    members = [p for p in predictions if p["is_member"]]
    non_members = [p for p in predictions if not p["is_member"]]

    churn_high = len([m for m in members if m["churn_risk"] == "high"])
    churn_med = len([m for m in members if m["churn_risk"] == "medium"])
    top_recruits = sorted(
        [p for p in non_members if p["membership_probability"] >= 60],
        key=lambda x: -x["membership_probability"]
    )

    cat_summaries = []
    for cat, data in sorted(category_predictions.items()):
        mp_avg = sum(data["mp_scores"]) / len(data["mp_scores"]) if data["mp_scores"] else 0
        gt_avg = sum(data["gt_scores"]) / len(data["gt_scores"]) if data["gt_scores"] else 0
        cat_summaries.append({
            "category": cat,
            "count": len(data["mp_scores"]),
            "avg_membership_prob": round(mp_avg),
            "avg_growth_trajectory": round(gt_avg, 1),
        })
    cat_summaries.sort(key=lambda x: -x["avg_growth_trajectory"])

    summary = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "total_businesses": len(rows),
        "membership_distribution": dict(mp_dist),
        "growth_distribution": dict(gt_dist),
        "avg_membership_probability": round(sum(all_mp) / len(all_mp)),
        "avg_growth_trajectory": round(sum(all_gt) / len(all_gt), 1),
        "members_count": len(members),
        "churn_risk_high": churn_high,
        "churn_risk_medium": churn_med,
        "churn_risk_low": len(members) - churn_high - churn_med,
        "high_potential_recruits": len(top_recruits),
        "category_predictions": cat_summaries,
        "feature_weights": {
            fname: {k: v for k, v in w.items() if k != "extractor"}
            for fname, w in weights.items()
        },
    }

    # Write
    OUT_PREDICTIONS.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PREDICTIONS, "w") as f:
        json.dump(predictions, f, indent=2)
    print(f"\n  Predictions: {OUT_PREDICTIONS}")

    with open(OUT_SUMMARY, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"  Summary: {OUT_SUMMARY}")

    # Report
    print(f"\n  Membership Probability Distribution:")
    for band in ["high", "medium", "low"]:
        ct = mp_dist.get(band, 0)
        print(f"    {band:10s}: {ct:5d} ({ct/len(rows)*100:.1f}%)")

    print(f"\n  Growth Trajectory Distribution:")
    for band in ["growing", "stable", "declining"]:
        ct = gt_dist.get(band, 0)
        print(f"    {band:10s}: {ct:5d} ({ct/len(rows)*100:.1f}%)")

    print(f"\n  Churn Risk (current members: {len(members)}):")
    print(f"    High:   {churn_high}")
    print(f"    Medium: {churn_med}")
    print(f"    Low:    {len(members) - churn_high - churn_med}")

    print(f"\n  High-Potential Recruits (MP≥60, non-member): {len(top_recruits)}")

    print(f"\n  Top 5 Categories by Growth:")
    for cs in cat_summaries[:5]:
        print(f"    {cs['category']:25s} GT={cs['avg_growth_trajectory']:+5.1f}  MP={cs['avg_membership_prob']}%")

    print(f"\n  Bottom 5 Categories by Growth:")
    for cs in cat_summaries[-5:]:
        print(f"    {cs['category']:25s} GT={cs['avg_growth_trajectory']:+5.1f}  MP={cs['avg_membership_prob']}%")

    print(f"\n  Done.")

if __name__ == "__main__":
    main()
