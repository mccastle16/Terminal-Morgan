#!/usr/bin/env python3
"""
Agent 9 — Lead Scorer
======================
Scores each lead on a 0-100 scale based on data completeness,
business quality signals, and sales-readiness indicators.

Score components (max 100):
  Contact Quality   (30 pts) — name, email, phone, job title
  Company Intel     (30 pts) — company name, website, address, category
  Business Signals  (25 pts) — rating, reviews, chamber membership
  Recency & Fit     (15 pts) — match confidence, local presence, lead age

Output:
  - lead_score (0-100)
  - lead_grade (A/B/C/D/F)
  - score_breakdown (JSON string of component scores)
  - priority_action (recommended next step)

Usage:
  python "9. agent9-lead-scorer.py" --leads data/leadgen.csv
  python "9. agent9-lead-scorer.py" --leads data/leadgen.csv --dry-run
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd


# ── Scoring weights ─────────────────────────────────────────────────

# Contact quality (30 pts)
PTS_HAS_FULL_NAME = 5
PTS_HAS_FIRST_AND_LAST = 3      # bonus if both present
PTS_HAS_EMAIL = 5
PTS_HAS_PHONE = 12
PTS_HAS_JOB_TITLE = 5

# Company intel (30 pts)
PTS_HAS_COMPANY = 8
PTS_HAS_WEBSITE = 5
PTS_HAS_ADDRESS = 7
PTS_HAS_CATEGORY = 5
PTS_HAS_ENRICHED_CATEGORY = 5

# Business signals (25 pts)
PTS_HAS_RATING = 5
PTS_HIGH_RATING = 5              # 4.0+
PTS_HAS_REVIEWS = 3
PTS_MANY_REVIEWS = 4             # 50+
PTS_CHAMBER_MEMBER = 8

# Recency & fit (15 pts)
PTS_MATCHED_MASTER = 5           # matched to local master DB
PTS_MATCHED_WEB = 3              # matched via web search
PTS_LOCAL_PRESENCE = 4           # has FL/Miami/Coral Gables location
PTS_RECENT_LEAD = 3              # created within last 90 days

# Job title seniority bonuses (added to job_title score)
SENIORITY_KEYWORDS = {
    "owner": 5, "founder": 5, "ceo": 5, "president": 5,
    "cfo": 4, "coo": 4, "cto": 4, "cmo": 4, "cio": 4,
    "vp": 4, "vice president": 4,
    "director": 3, "head": 3, "chief": 4,
    "manager": 2, "general manager": 3, "gm": 3,
    "partner": 3, "principal": 3,
}

# Categories with high business value
HIGH_VALUE_CATEGORIES = {
    "hotel", "hospitality", "cruise", "developers", "law",
    "healthcare", "business services", "retail",
}

# Name flags that reduce score
NAME_FLAG_PENALTY = -10


# ── Scoring functions ───────────────────────────────────────────────

def score_contact(lead: pd.Series) -> dict:
    """Score contact quality (max 30)."""
    score = 0
    details = {}

    # Full name
    full_name = str(lead.get("full_name", "")).strip()
    if full_name:
        score += PTS_HAS_FULL_NAME
        details["full_name"] = PTS_HAS_FULL_NAME

    # First + last both present
    first = str(lead.get("first_name", "")).strip()
    last = str(lead.get("last_name", "")).strip()
    if first and last:
        score += PTS_HAS_FIRST_AND_LAST
        details["first_and_last"] = PTS_HAS_FIRST_AND_LAST

    # Email (everyone has this, but verify format)
    email = str(lead.get("email", "")).strip()
    if email and "@" in email:
        score += PTS_HAS_EMAIL
        details["email"] = PTS_HAS_EMAIL

    # Phone
    phone = str(lead.get("phone", "")).strip()
    if phone:
        score += PTS_HAS_PHONE
        details["phone"] = PTS_HAS_PHONE

    # Job title
    title = str(lead.get("job_title", "")).strip().lower()
    if title:
        score += PTS_HAS_JOB_TITLE
        details["job_title"] = PTS_HAS_JOB_TITLE

    # Name flag penalty
    flag = str(lead.get("name_flag", "")).strip()
    if flag:
        score += NAME_FLAG_PENALTY
        details["name_flag_penalty"] = NAME_FLAG_PENALTY

    return {"score": max(score, 0), "details": details}


def score_company(lead: pd.Series) -> dict:
    """Score company intel (max 30)."""
    score = 0
    details = {}

    if str(lead.get("company", "")).strip():
        score += PTS_HAS_COMPANY
        details["company"] = PTS_HAS_COMPANY

    if str(lead.get("company_website", "")).strip():
        score += PTS_HAS_WEBSITE
        details["website"] = PTS_HAS_WEBSITE

    if str(lead.get("business_address", "")).strip():
        score += PTS_HAS_ADDRESS
        details["address"] = PTS_HAS_ADDRESS

    category = str(lead.get("category", "")).strip().lower()
    if category and category != "general":
        score += PTS_HAS_CATEGORY
        details["category"] = PTS_HAS_CATEGORY

    if str(lead.get("enriched_category", "")).strip():
        score += PTS_HAS_ENRICHED_CATEGORY
        details["enriched_category"] = PTS_HAS_ENRICHED_CATEGORY

    return {"score": min(score, 30), "details": details}


def score_business(lead: pd.Series) -> dict:
    """Score business signals (max 25)."""
    score = 0
    details = {}

    rating_str = str(lead.get("business_rating", "")).strip()
    if rating_str:
        score += PTS_HAS_RATING
        details["has_rating"] = PTS_HAS_RATING
        try:
            rating = float(rating_str)
            if rating >= 4.0:
                score += PTS_HIGH_RATING
                details["high_rating"] = PTS_HIGH_RATING
        except ValueError:
            pass

    reviews_str = str(lead.get("business_review_count", "")).strip()
    if reviews_str:
        score += PTS_HAS_REVIEWS
        details["has_reviews"] = PTS_HAS_REVIEWS
        try:
            reviews = int(re.sub(r"[^\d]", "", reviews_str))
            if reviews >= 50:
                score += PTS_MANY_REVIEWS
                details["many_reviews"] = PTS_MANY_REVIEWS
        except ValueError:
            pass

    if str(lead.get("chamber_member", "")).strip().lower() in ("yes", "true", "1"):
        score += PTS_CHAMBER_MEMBER
        details["chamber_member"] = PTS_CHAMBER_MEMBER

    return {"score": min(score, 25), "details": details}


def score_fit(lead: pd.Series) -> dict:
    """Score recency and fit (max 15)."""
    score = 0
    details = {}

    # Match quality
    match_type = str(lead.get("match_type", "")).strip()
    if match_type.startswith("domain") or match_type.startswith("name"):
        score += PTS_MATCHED_MASTER
        details["matched_master"] = PTS_MATCHED_MASTER
    elif match_type.startswith("web_"):
        score += PTS_MATCHED_WEB
        details["matched_web"] = PTS_MATCHED_WEB

    # Local presence (FL, Miami area, Coral Gables)
    city = str(lead.get("city", "")).strip().lower()
    state = str(lead.get("state", "")).strip().lower()
    address = str(lead.get("business_address", "")).strip().lower()
    local_terms = {"coral gables", "miami", "coconut grove", "south miami",
                   "doral", "brickell", "hialeah", "kendall", "key biscayne"}
    is_local = (
        state in ("florida", "fl") or
        any(term in city for term in local_terms) or
        any(term in address for term in local_terms)
    )
    if is_local:
        score += PTS_LOCAL_PRESENCE
        details["local_presence"] = PTS_LOCAL_PRESENCE

    # Recency
    created = str(lead.get("created_at", "")).strip()
    if created:
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            age_days = (datetime.now(created_dt.tzinfo) - created_dt).days
            if age_days <= 90:
                score += PTS_RECENT_LEAD
                details["recent_lead"] = PTS_RECENT_LEAD
        except (ValueError, TypeError):
            pass

    return {"score": min(score, 15), "details": details}


def seniority_bonus(lead: pd.Series) -> int:
    """Extra points for decision-maker job titles."""
    title = str(lead.get("job_title", "")).strip().lower()
    if not title:
        return 0
    best = 0
    for keyword, pts in SENIORITY_KEYWORDS.items():
        if keyword in title:
            best = max(best, pts)
    return best


def category_bonus(lead: pd.Series) -> int:
    """Extra points for high-value business categories."""
    category = str(lead.get("category", "")).strip().lower()
    if category in HIGH_VALUE_CATEGORIES:
        return 3
    return 0


def assign_grade(score: int) -> str:
    """Convert numeric score to letter grade."""
    if score >= 75:
        return "A"
    elif score >= 55:
        return "B"
    elif score >= 40:
        return "C"
    elif score >= 25:
        return "D"
    else:
        return "F"


def assign_action(grade: str, lead: pd.Series) -> str:
    """Recommend a priority action based on grade and data gaps."""
    phone = str(lead.get("phone", "")).strip()
    company = str(lead.get("company", "")).strip()

    if grade == "A":
        if phone:
            return "CALL — sales-ready lead with full contact info"
        else:
            return "EMAIL — high-quality lead, needs phone number"
    elif grade == "B":
        if not phone:
            return "RESEARCH — good lead, find phone number"
        elif not company:
            return "RESEARCH — has phone, identify company"
        else:
            return "EMAIL — solid lead, initiate contact"
    elif grade == "C":
        return "NURTURE — add to drip campaign, enrich further"
    elif grade == "D":
        return "LOW PRIORITY — incomplete data, monitor only"
    else:
        return "SKIP — insufficient data for outreach"


# ── Main pipeline ───────────────────────────────────────────────────

def run_scorer(leads_path: str, dry_run: bool = False):
    """Execute the scoring pipeline."""

    print(f"\n{'='*60}")
    print(f"  Agent 9 — Lead Scorer")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    leads = pd.read_csv(leads_path, dtype=str).fillna("")
    total = len(leads)
    print(f"Loaded {total} leads\n")

    # Ensure all expected columns exist (handles raw patient lists etc.)
    for col in ["lead_score", "lead_grade", "score_breakdown", "priority_action",
                "company", "company_website", "phone", "first_name", "last_name",
                "full_name", "email", "job_title", "category", "city", "state",
                "name_flag", "match_type", "matched_business", "business_address",
                "business_rating", "business_review_count", "rating_source",
                "enriched_category", "chamber_member", "osint_confidence",
                "validation_tier"]:
        if col not in leads.columns:
            leads[col] = ""

    print("[1] Scoring leads...")
    scores = []
    for idx, lead in leads.iterrows():
        contact = score_contact(lead)
        company = score_company(lead)
        business = score_business(lead)
        fit = score_fit(lead)
        seniority = seniority_bonus(lead)
        cat_bonus = category_bonus(lead)

        raw_score = (contact["score"] + company["score"] +
                     business["score"] + fit["score"] +
                     seniority + cat_bonus)
        final_score = min(raw_score, 100)

        grade = assign_grade(final_score)
        action = assign_action(grade, lead)

        breakdown = {
            "contact": contact["score"],
            "company": company["score"],
            "business": business["score"],
            "fit": fit["score"],
            "seniority_bonus": seniority,
            "category_bonus": cat_bonus,
        }

        leads.at[idx, "lead_score"] = str(final_score)
        leads.at[idx, "lead_grade"] = grade
        leads.at[idx, "score_breakdown"] = json.dumps(breakdown)
        leads.at[idx, "priority_action"] = action
        scores.append(final_score)

    # ── Summary ───────────────────────────────────────────────
    grade_counts = leads["lead_grade"].value_counts()
    avg_score = sum(scores) / len(scores) if scores else 0

    print(f"\n{'='*60}")
    print(f"  SCORING SUMMARY")
    print(f"{'='*60}")
    print(f"  Total leads scored:  {total}")
    print(f"  Average score:       {avg_score:.1f}/100")
    print(f"  ─────────────────────────────────")
    print(f"  Grade distribution:")
    for grade in ["A", "B", "C", "D", "F"]:
        count = grade_counts.get(grade, 0)
        pct = round(count / total * 100, 1)
        bar = "█" * int(pct / 2)
        print(f"    {grade}: {count:5d} ({pct:5.1f}%)  {bar}")

    print(f"  ─────────────────────────────────")
    print(f"  Action breakdown:")
    action_counts = leads["priority_action"].value_counts()
    for action, count in action_counts.items():
        print(f"    {count:5d}  {action}")

    # Top leads
    print(f"\n  ─── Top 10 Leads ───")
    leads["_score_int"] = leads["lead_score"].astype(int)
    top = leads.nlargest(10, "_score_int")
    print(top[["full_name", "company", "lead_score", "lead_grade", "priority_action"]].to_string(index=False))
    leads.drop(columns=["_score_int"], inplace=True)

    print(f"\n{'='*60}")

    # ── Write ─────────────────────────────────────────────────
    if dry_run:
        print(f"\n[DRY RUN] Would write {total} rows to {leads_path}")
    else:
        leads.to_csv(leads_path, index=False)
        print(f"\nWrote {total} scored leads to {leads_path}")

    return leads


# ── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent 9 — Lead Scorer")
    parser.add_argument("--leads", required=True, help="Path to leadgen CSV")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    if not Path(args.leads).exists():
        print(f"Error: {args.leads} not found")
        sys.exit(1)

    run_scorer(args.leads, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
