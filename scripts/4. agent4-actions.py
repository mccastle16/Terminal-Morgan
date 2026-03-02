#!/usr/bin/env python3
"""
Agent 4 — AI-Powered Action Strategist
========================================
Takes the analytics produced by Agents 2 and 3 (ratings, pain points,
confidence scores, PKP synthesis, red flags, etc.) and generates
specific, contextualized, execute-now actions for every business.

Architecture (Hybrid):
  1. RULE ENGINE   — deterministic pre-filter that identifies which action
                     categories are triggered (reputation, visibility, etc.)
                     and assembles a rich business context object.
  2. LLM STRATEGIST — sends the context + triggered categories to GPT-4o-mini
                     (or GPT-4o) via the OpenAI API, which returns tailored,
                     creative, business-specific action playbooks.
  3. GRACEFUL FALLBACK — if OPENAI_API_KEY is not set or the call fails,
                     falls back to the original rule-based templates so the
                     pipeline never breaks.

The LLM receives:
  - Business profile (name, category, neighborhood, rating, reviews, ...)
  - Competitive context (# peers in same category/neighborhood, avg rating, ...)
  - Pain points and delights (from reviews)
  - PKP synthesis (node type, edges, undercurrents)
  - Which action categories were triggered and why
  → Returns structured JSON matching the dashboard schema.

Usage:
  python "4. agent4-actions.py" --master data/master_all_businesses.csv
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --top 50
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --no-llm
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --dry-run

Requirements:
  pip install pandas openai   (openai is optional — graceful fallback without it)
"""

import argparse
import json
import os
import time as _time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from _shared import (
    CANONICAL_FIELDS,
    haversine,
    normalize_key,
)

# ── Optional: OpenAI SDK ──────────────────────────────────────────
try:
    from openai import OpenAI
    _HAS_OPENAI = True
except ImportError:
    _HAS_OPENAI = False

# ── Paths ─────────────────────────────────────────────────────────
SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPTS_DIR.parent
DASHBOARD_DIR = PROJECT_ROOT / "dashboard" / "public" / "data"
ACTION_PLAYBOOK_FILE = DASHBOARD_DIR / "action_playbook.json"
ACTION_LOG_FILE = PROJECT_ROOT / "data" / "action_log.csv"

# ── LLM Config ────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LLM_MODEL = os.environ.get("AGENT4_MODEL", "gpt-4o-mini")  # gpt-4o for premium
LLM_TEMPERATURE = 0.7   # creative but not wild
LLM_MAX_TOKENS = 2000   # enough for 4-6 detailed actions
LLM_BATCH_SIZE = 5      # businesses per prompt (batching saves tokens)
LLM_RATE_LIMIT_DELAY = 0.5  # seconds between API calls

# Track LLM stats
_llm_stats = {"calls": 0, "tokens_in": 0, "tokens_out": 0, "fallbacks": 0}


# ── Helper: safe numeric parsing ─────────────────────────────────
def _float(val, default=0.0):
    try:
        return float(val) if val else default
    except (ValueError, TypeError):
        return default


def _int(val, default=0):
    try:
        return int(float(val)) if val else default
    except (ValueError, TypeError):
        return default


# ── Priority scoring engine ──────────────────────────────────────
def compute_priority(row: pd.Series) -> float:
    """
    Score 0.0-1.0 for how urgently this business needs action.
    Higher = act first. Combines multiple analytic signals.
    """
    score = 0.30  # baseline

    rating = _float(row.get("rating_primary_value"))
    reviews = _int(row.get("rating_primary_review_count"))
    confidence = _float(row.get("osint_confidence"))
    chamber = str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE")
    has_red_flag = str(row.get("red_flag_present", "")).upper() in ("Y", "YES")
    has_website = bool(str(row.get("website", "")).strip())
    has_phone = bool(str(row.get("phone", "")).strip())
    has_address = bool(str(row.get("address", "")).strip())
    category = str(row.get("category_primary", "other"))
    node_type = str(row.get("pkp_node_type", "asset"))

    # Red flags are highest priority
    if has_red_flag:
        score += 0.25

    # Low rating with many reviews = reputation crisis
    if rating > 0 and rating < 3.0 and reviews > 20:
        score += 0.20
    elif rating > 0 and rating < 3.5:
        score += 0.10

    # High rating but low reviews = hidden gem opportunity
    if rating >= 4.5 and reviews < 20:
        score += 0.10

    # Non-member with good standing = growth prospect
    if not chamber and rating >= 4.0:
        score += 0.12

    # Low confidence = needs data enrichment
    if confidence > 0 and confidence < 0.5:
        score += 0.10

    # Missing critical fields
    gaps = sum(1 for v in [has_website, has_phone, has_address] if not v)
    score += gaps * 0.05

    # Infrastructure nodes are higher-value
    if node_type == "infrastructure":
        score += 0.05

    # No rating at all = invisible
    if not rating:
        score += 0.08

    return round(min(1.0, score), 3)


# ══════════════════════════════════════════════════════════════════
#  ACTION GENERATORS
#  Each function examines specific analytics fields and returns
#  a list of action dicts. Actions are concrete and specific.
# ══════════════════════════════════════════════════════════════════

def _action(
    action_type: str,
    category: str,
    title: str,
    description: str,
    steps: List[str],
    timeframe: str = "This week",
    cost_estimate: str = "$0",
    expected_impact: str = "",
    priority: str = "medium",
) -> Dict[str, Any]:
    """Build a standardized action dict."""
    return {
        "action_type": action_type,
        "category": category,
        "title": title,
        "description": description,
        "steps": steps,
        "timeframe": timeframe,
        "cost_estimate": cost_estimate,
        "expected_impact": expected_impact,
        "priority": priority,
    }


# ── 1. Reputation actions (from rating + reviews) ────────────────
def generate_reputation_actions(row: pd.Series) -> List[Dict]:
    actions = []
    rating = _float(row.get("rating_primary_value"))
    reviews = _int(row.get("rating_primary_review_count"))
    name = str(row.get("business_name", ""))
    pain_points = str(row.get("top_pain_points", ""))
    delights = str(row.get("top_delights", ""))

    if rating > 0 and rating < 3.0 and reviews > 20:
        # Crisis: low rating with real volume
        top_pain = pain_points.split(";")[0].strip() if pain_points else "service quality"
        actions.append(_action(
            action_type="reputation_recovery",
            category="reputation",
            title="Launch Reputation Recovery Campaign",
            description=(
                f"Rating of {rating:.1f} with {reviews} reviews signals a reputation crisis. "
                f"Top complaint: '{top_pain}'. Every week without action costs potential customers."
            ),
            steps=[
                f"Respond to every 1-2 star review from the last 90 days with a personalized apology + resolution offer",
                f"Address the root cause of '{top_pain}' — assign an owner and a 2-week deadline",
                "Set up Google Alerts for your business name to catch new negative mentions immediately",
                "Ask your 5 most loyal customers to post honest reviews this week — volume dilutes negatives",
            ],
            timeframe="Start today, 30-day sprint",
            cost_estimate="$0 (time investment: ~5 hrs/week)",
            expected_impact="+0.3 to +0.5 rating lift over 60 days",
            priority="urgent",
        ))

    elif rating > 0 and rating < 4.0 and reviews > 10:
        # Mediocre: room to improve
        actions.append(_action(
            action_type="rating_improvement",
            category="reputation",
            title="Improve Customer Satisfaction Score",
            description=(
                f"Rating of {rating:.1f} across {reviews} reviews. "
                f"You're below the 4.0 threshold where customers actively choose you over competitors."
            ),
            steps=[
                "Identify top 3 recurring complaints from your reviews (see pain points below)",
                "Create a 30-day fix sprint for the #1 issue",
                "Train frontline staff on the specific weak area",
                "Follow up with recent customers via email or in-person to check satisfaction",
            ],
            timeframe="This month",
            cost_estimate="$0-$500 (staff training time)",
            expected_impact="+0.2 rating lift over 90 days",
            priority="high",
        ))

    if rating >= 4.5 and reviews < 20:
        # Hidden gem: great rating, no visibility
        actions.append(_action(
            action_type="review_volume",
            category="reputation",
            title="Amplify Your Hidden-Gem Status",
            description=(
                f"Excellent {rating:.1f} rating but only {reviews} reviews. "
                f"You're great but nobody knows it. More reviews = more visibility in search."
            ),
            steps=[
                "Print a QR code linking to your Google review page — place it at checkout/reception",
                "Ask your next 20 in-person customers: 'Would you mind leaving us a quick Google review?'",
                "Send a post-visit thank-you email/SMS with a direct review link",
                f"Highlight what customers love: '{delights.split(';')[0].strip() if delights else 'great service'}' — mention it in responses",
            ],
            timeframe="This week, ongoing",
            cost_estimate="$0 (QR code: free via qr-code-generator.com)",
            expected_impact="2x review volume in 60 days → higher search ranking",
            priority="medium",
        ))

    if rating >= 4.5 and reviews >= 100:
        # Market leader: double down
        top_delight = delights.split(";")[0].strip() if delights else "quality"
        actions.append(_action(
            action_type="market_leader",
            category="reputation",
            title="Leverage Your Market Leader Position",
            description=(
                f"Outstanding {rating:.1f} with {reviews} reviews. You're a category leader. "
                f"Customers love: '{top_delight}'. Turn this into a growth engine."
            ),
            steps=[
                f"Feature '{top_delight}' prominently on your website hero section and Google listing",
                "Create a 'Best of Coral Gables' testimonial wall with 5 top review excerpts",
                "Pursue awards/recognition: 'Best of Miami' lists, local press features",
                "Offer to mentor or partner with lower-rated neighbors — builds goodwill and referrals",
            ],
            timeframe="This quarter",
            cost_estimate="$0-$200",
            expected_impact="Brand authority + referral network expansion",
            priority="low",
        ))

    if not rating:
        actions.append(_action(
            action_type="claim_profile",
            category="reputation",
            title="Claim Your Google Business Profile — Step Zero",
            description=(
                "You have no rating data. You are invisible to customers who search before visiting. "
                "73% of consumers read reviews before choosing a local business."
            ),
            steps=[
                "Go to business.google.com and claim or create your listing",
                "Upload at least 10 high-quality photos (storefront, interior, team, products)",
                "Fill in every field: hours, phone, website, description, categories",
                "Ask 5 customers to leave reviews this week to jumpstart your profile",
            ],
            timeframe="Today",
            cost_estimate="$0",
            expected_impact="You become discoverable — estimated +15-25% new customer inquiries",
            priority="high",
        ))

    return actions


# ── 2. Visibility actions (from confidence + web presence) ───────
def generate_visibility_actions(row: pd.Series) -> List[Dict]:
    actions = []
    confidence = _float(row.get("osint_confidence"))
    has_website = bool(str(row.get("website", "")).strip())
    has_phone = bool(str(row.get("phone", "")).strip())
    has_address = bool(str(row.get("address", "")).strip())
    name = str(row.get("business_name", ""))
    category = str(row.get("category_primary", "other"))

    if confidence > 0 and confidence < 0.5:
        actions.append(_action(
            action_type="boost_presence",
            category="visibility",
            title="Emergency Visibility Fix — You're Nearly Invisible Online",
            description=(
                f"Data confidence score: {confidence:.0%}. We can barely verify you exist. "
                f"This means customers can't find you either."
            ),
            steps=[
                "Claim your Google Business Profile at business.google.com (if not done)",
                "Claim your Yelp listing at biz.yelp.com",
                "Ensure your name, address, and phone (NAP) are identical across all listings",
                "Add your business to Apple Maps via Apple Business Connect (free)",
            ],
            timeframe="This week — all 4 steps",
            cost_estimate="$0",
            expected_impact="Confidence score → 0.8+; discoverable in local search",
            priority="high",
        ))

    if not has_website:
        actions.append(_action(
            action_type="create_website",
            category="visibility",
            title="Create a Basic Website — You're Missing 48% of Potential Customers",
            description=(
                "No website detected. Customers who can't verify you online go to a competitor. "
                "You don't need a fancy site — just legitimacy."
            ),
            steps=[
                "Option A (free): Create a Google Site at sites.google.com — 1 page with name, address, phone, hours, 5 photos",
                "Option B ($19/yr): Use Carrd.co for a clean single-page site in under 1 hour",
                "Option C ($12/mo): Use Squarespace if you need booking/e-commerce",
                "Add the URL to your Google Business Profile immediately after creating it",
            ],
            timeframe="This week",
            cost_estimate="$0-$19/year",
            expected_impact="Legitimacy signal → +20-30% customer conversion from search",
            priority="high",
        ))

    if not has_phone and not has_website:
        actions.append(_action(
            action_type="contact_info",
            category="visibility",
            title="Add Contact Information — Customers Cannot Reach You",
            description=(
                "No phone number and no website on any public listing. "
                "This is a trust killer — fix it before anything else."
            ),
            steps=[
                "Update your Google Business Profile with a phone number today",
                "If you don't want your personal number, get a Google Voice number (free)",
                "Ensure consistent contact info across Google, Yelp, and any directory listings",
            ],
            timeframe="Today",
            cost_estimate="$0",
            expected_impact="Basic discoverability restored",
            priority="urgent",
        ))

    return actions


# ── 3. Risk actions (from red flags + severity) ──────────────────
def generate_risk_actions(row: pd.Series) -> List[Dict]:
    actions = []
    has_red_flag = str(row.get("red_flag_present", "")).upper() in ("Y", "YES")
    red_notes = str(row.get("red_flag_notes", ""))
    severity = str(row.get("red_flag_severity", ""))
    name = str(row.get("business_name", ""))

    if not has_red_flag:
        return actions

    # Parse specific red flag types
    notes_lower = red_notes.lower()

    if "outside" in notes_lower and "bounds" in notes_lower:
        actions.append(_action(
            action_type="fix_location",
            category="risk",
            title="Fix Incorrect Location Data",
            description=(
                "Your Google listing coordinates place you outside Coral Gables. "
                "This means you're NOT showing up in 'near me' searches for the area."
            ),
            steps=[
                "Log into Google Business Profile → Edit → Location",
                "Pin your exact address on the map",
                "Verify the address matches your physical storefront",
                "Check Apple Maps and Yelp — correct there too if needed",
            ],
            timeframe="Today",
            cost_estimate="$0",
            expected_impact="Restored visibility in Coral Gables local search results",
            priority="urgent",
        ))

    elif "no phone" in notes_lower or "no website" in notes_lower:
        actions.append(_action(
            action_type="fix_contact",
            category="risk",
            title="Resolve Missing Contact Red Flag",
            description=(
                f"Flagged because: {red_notes}. Missing contact info actively damages "
                f"trust and suppresses your search ranking."
            ),
            steps=[
                "Add missing phone/website to Google Business Profile",
                "Cross-check that all directory listings have consistent info",
                "Set a quarterly reminder to audit your listings",
            ],
            timeframe="Today",
            cost_estimate="$0",
            expected_impact="Red flag cleared; trust signal restored",
            priority="urgent",
        ))

    else:
        actions.append(_action(
            action_type="resolve_flag",
            category="risk",
            title="Investigate and Resolve Risk Flag",
            description=f"Risk flag: {red_notes or 'Review needed'}. Severity: {severity or 'Unknown'}.",
            steps=[
                "Review the specific flag details in the Risk Radar dashboard",
                "Determine if this is a data error or a genuine business issue",
                "If data error: update your public listings to correct it",
                "If genuine: consult with a relevant professional (legal, accounting, etc.)",
                "Document the resolution for your records",
            ],
            timeframe="This week",
            cost_estimate="Varies",
            expected_impact="Risk cleared from your business profile",
            priority="high",
        ))

    return actions


# ── 4. Growth actions (from chamber + edges + node type) ─────────
def generate_growth_actions(
    row: pd.Series,
    nearby_chamber: List[str],
    category_count: int,
    neighborhood_count: int,
) -> List[Dict]:
    actions = []
    chamber = str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE")
    node_type = str(row.get("pkp_node_type", "asset"))
    category = str(row.get("category_primary", ""))
    neighborhood = str(row.get("neighborhood_area", ""))
    rating = _float(row.get("rating_primary_value"))
    edges = str(row.get("pkp_edges_summary", ""))
    undercurrents = str(row.get("pkp_undercurrents_summary", ""))

    if not chamber:
        neighbor_text = ""
        if nearby_chamber:
            names = ", ".join(nearby_chamber[:3])
            neighbor_text = f" Your {len(nearby_chamber)} nearest Chamber neighbors include: {names}."

        actions.append(_action(
            action_type="chamber_prospect",
            category="growth",
            title="Join the Coral Gables Chamber of Commerce",
            description=(
                f"You're a non-member"
                + (f" with a strong {rating:.1f} rating" if rating >= 4.0 else "")
                + (f" in the {neighborhood} area" if neighborhood else "")
                + f".{neighbor_text}"
                + " Members see an average 12% increase in referrals."
            ),
            steps=[
                "Visit coralgableschamber.org/membership to review benefits and tiers",
                "Attend one free networking event this month as a guest to test the waters",
                f"Talk to neighboring Chamber members{(' like ' + nearby_chamber[0]) if nearby_chamber else ''} about their experience",
                "Complete the membership application — typical ROI within 6 months",
            ],
            timeframe="This month",
            cost_estimate="$300-$1,200/year (tier-dependent)",
            expected_impact="12% referral increase; networking access; credibility signal",
            priority="medium" if rating >= 4.0 else "low",
        ))

    if chamber and node_type == "infrastructure":
        actions.append(_action(
            action_type="ecosystem_hub",
            category="growth",
            title="Position Yourself as an Ecosystem Hub",
            description=(
                f"As a {category.replace('_', ' ')} ({node_type} node) and Chamber member, "
                f"you're a natural hub for the business ecosystem."
            ),
            steps=[
                f"Host a free monthly workshop for local businesses (e.g., 'Financial Literacy Friday' or '{category.replace('_', ' ').title()} Insights')",
                "Co-promote via the Chamber newsletter — they actively seek member-hosted events",
                f"Build referral partnerships with 3-5 complementary businesses in {neighborhood or 'your area'}",
                "Create a resource page on your website linking to local partners",
            ],
            timeframe="This quarter",
            cost_estimate="$0-$200/event",
            expected_impact="Positioned as category leader; referral pipeline activated",
            priority="medium",
        ))

    # Same-category cluster collaboration
    if category_count >= 5 and neighborhood:
        actions.append(_action(
            action_type="cluster_collaboration",
            category="growth",
            title=f"Collaborate With Your {neighborhood} {category.replace('_', ' ').title()} Cluster",
            description=(
                f"There are {category_count} {category.replace('_', ' ')} businesses in {neighborhood}. "
                f"Differentiate or collaborate — standing still means you blend into the crowd."
            ),
            steps=[
                f"Organize a '{neighborhood} {category.replace('_', ' ').title()} Walk' event with 3-4 neighbors — shared foot traffic, one promotional poster",
                "Create cross-promotion deals (e.g., 'Show your receipt from [neighbor] for 10% off')",
                "Start a shared Instagram account for the corridor to attract foot traffic",
                "Meet with your cluster neighbors monthly to discuss shared challenges (parking, signage, etc.)",
            ],
            timeframe="This quarter",
            cost_estimate="$0-$100 (printing costs)",
            expected_impact="Shared marketing reach; foot traffic increase for the whole corridor",
            priority="low",
        ))

    return actions


# ── 5. Operations actions (from pain points + undercurrents) ─────
def generate_operations_actions(row: pd.Series) -> List[Dict]:
    actions = []
    pain_points = str(row.get("top_pain_points", ""))
    category = str(row.get("category_primary", ""))
    neighborhood = str(row.get("neighborhood_area", ""))
    undercurrents = str(row.get("pkp_undercurrents_summary", ""))
    rating = _float(row.get("rating_primary_value"))

    if not pain_points:
        return actions

    pains = [p.strip() for p in pain_points.split(";") if p.strip()]

    # Map common pain point keywords to specific operational actions
    PAIN_ACTION_MAP = {
        ("slow", "wait", "long time"): {
            "title": "Fix Service Speed — Your #1 Complaint",
            "steps": [
                "Audit peak-hour staffing — are you short 1-2 people during rush?",
                "If restaurant: add 1 server during peak (est. $800/mo). If office: add online scheduling to reduce wait",
                "Set a visible service-time target (e.g., 'Seated in 5 minutes') and track it daily",
                "Respond to reviews mentioning wait times with specific changes you've made",
            ],
            "cost": "$0-$800/mo",
            "impact": "+0.3 rating lift; reduced customer churn",
        },
        ("parking", "park"): {
            "title": "Solve the Parking Problem",
            "steps": [
                f"Partner with the nearest Coral Gables parking garage for validated parking",
                "Highlight 'Free 2hr parking' or 'Valet available' on your Google listing and website",
                "Add parking instructions to your Google Business Profile description",
                "Consider offering valet for high-value customers (dinner service, legal consultations)",
            ],
            "cost": "$0-$500/mo (validation subsidy)",
            "impact": "Removes #1 barrier to visit; mentioned in positive reviews",
        },
        ("expensive", "overpriced", "price", "pricey"): {
            "title": "Reframe Your Value Proposition",
            "steps": [
                "Don't lower prices — add a visible value-add: happy hour, loyalty program, or bundled service",
                "Create a 'best value' option on your menu/services list that anchors perception",
                "Reframe your Google listing description to emphasize unique value, not price",
                "Respond to price complaints by highlighting what's included (quality ingredients, expertise, etc.)",
            ],
            "cost": "$0",
            "impact": "Shifts perception from 'expensive' to 'worth it'",
        },
        ("rude", "unfriendly", "attitude", "staff"): {
            "title": "Address Staff Experience Gap",
            "steps": [
                "Hold a team meeting this week focused specifically on customer interaction standards",
                "Implement a simple greeting protocol: smile, name, 'how can I help?'",
                "Mystery-shop your own business (or ask a friend) and debrief the team",
                "Recognize and reward staff who get mentioned positively in reviews",
            ],
            "cost": "$0",
            "impact": "+0.2-0.4 rating lift; repeat customer increase",
        },
        ("dirty", "clean", "hygiene", "maintenance"): {
            "title": "Upgrade Cleanliness Standards",
            "steps": [
                "Create a visible cleaning checklist for restrooms and common areas",
                "Assign specific cleaning ownership by shift (not 'everyone's job' — that means nobody's job)",
                "Do a deep clean this week and post fresh photos on Google Business Profile",
                "Respond to cleanliness complaints publicly with specific measures taken",
            ],
            "cost": "$0-$200 (cleaning supplies)",
            "impact": "Removes trust barrier; hygiene is a deal-breaker for 67% of customers",
        },
        ("noise", "loud", "quiet"): {
            "title": "Manage Noise/Ambiance Expectations",
            "steps": [
                "Acknowledge in your Google description: 'Lively atmosphere' or 'Quiet setting' — set expectations",
                "If too loud: add sound-absorbing panels or adjust music volume during peak hours",
                "Create quiet zones or hours if your layout allows",
                "Respond to noise complaints by noting what you've changed or setting expectations",
            ],
            "cost": "$0-$500",
            "impact": "Sets correct expectations → fewer complaints",
        },
    }

    matched_any = False
    for keywords, action_template in PAIN_ACTION_MAP.items():
        for pain in pains[:3]:  # only top 3 pain points
            if any(kw in pain.lower() for kw in keywords):
                actions.append(_action(
                    action_type="operations_fix",
                    category="operations",
                    title=action_template["title"],
                    description=f"Customer complaint: '{pain}'. This recurring issue is dragging your rating down.",
                    steps=action_template["steps"],
                    timeframe="This week to start; 30-day sprint",
                    cost_estimate=action_template["cost"],
                    expected_impact=action_template["impact"],
                    priority="high" if rating < 4.0 else "medium",
                ))
                matched_any = True
                break  # one action per keyword group

    # Generic pain point action if nothing matched
    if not matched_any and pains:
        top_pain = pains[0]
        actions.append(_action(
            action_type="address_feedback",
            category="operations",
            title=f"Address Top Customer Complaint",
            description=f"Recurring feedback: '{top_pain}'. This is your most common pain point.",
            steps=[
                f"Identify the root cause of '{top_pain}' — is it people, process, or physical space?",
                "Assign one person ownership of fixing it, with a 2-week deadline",
                "Implement the fix and tell your customers: update Google description + respond to reviews",
                "Check back in 30 days — has the complaint frequency dropped?",
            ],
            timeframe="2 weeks",
            cost_estimate="Varies",
            expected_impact="Removes top drag on customer satisfaction",
            priority="high" if rating < 4.0 else "medium",
        ))

    # Undercurrent-driven operational actions
    if undercurrents and category:
        UC_ACTIONS = {
            "delivery app commission": _action(
                action_type="reduce_delivery_cost",
                category="operations",
                title="Reduce Delivery App Dependency",
                description="Delivery apps take 15-30% commission. Direct ordering keeps that margin.",
                steps=[
                    "Set up direct online ordering via Square Online (free) or GloriaFood (free)",
                    "Add 'Order Direct & Save 15%' signage in-store and on Google listing",
                    "Promote your direct ordering link on Instagram and Google posts",
                    "Keep delivery apps for discovery but incentivize direct ordering for repeat customers",
                ],
                timeframe="This month",
                cost_estimate="$0 (free platforms available)",
                expected_impact="Save 15-30% on delivery orders; build direct customer relationships",
                priority="medium",
            ),
            "e-commerce pressure": _action(
                action_type="experiential_retail",
                category="operations",
                title="Pivot to Experiential Retail",
                description="You can't out-price Amazon. Sell what they can't: experiences.",
                steps=[
                    "Host a monthly in-store event (product demo, workshop, tasting, meet-the-maker)",
                    "Create Instagram-worthy displays/moments in your store",
                    "Offer 'exclusive in-store only' items or services",
                    "Promote events via Google Business Profile 'Events' feature (free)",
                ],
                timeframe="This quarter",
                cost_estimate="$0-$200/event",
                expected_impact="Foot traffic increase; differentiation from online competitors",
                priority="medium",
            ),
            "insurance reimbursement tightening": _action(
                action_type="diversify_revenue",
                category="operations",
                title="Diversify Beyond Insurance Revenue",
                description="Insurance reimbursements are tightening. Build a cash-pay revenue stream.",
                steps=[
                    "Launch a membership/concierge model: $99-$299/mo for X visits or services",
                    "Your Coral Gables location supports premium pricing — lean into it",
                    "Add 'Membership plans available' to your Google listing",
                    "Market the membership as 'VIP access' not 'budget alternative'",
                ],
                timeframe="This quarter",
                cost_estimate="$0-$500 (marketing materials)",
                expected_impact="New cash-pay revenue stream; reduced insurance dependency",
                priority="medium",
            ),
        }

        for trigger, uc_action in UC_ACTIONS.items():
            if trigger in undercurrents.lower():
                actions.append(uc_action)

    return actions


# ── 6. Data quality / pipeline actions ────────────────────────────
def generate_data_actions(row: pd.Series) -> List[Dict]:
    actions = []
    category = str(row.get("category_primary", ""))
    rating = _float(row.get("rating_primary_value"))
    confidence = _float(row.get("osint_confidence"))
    has_lat = bool(str(row.get("lat", "")).strip())

    if category == "other":
        actions.append(_action(
            action_type="recategorize",
            category="data_quality",
            title="Business Needs Re-Categorization",
            description="This business is filed as 'other'. Proper categorization improves analytics and recommendations.",
            steps=[
                "Check the business website or Google listing for their actual industry",
                "Update category_primary in the master CSV (or wait for next Agent 2 enrich pass)",
            ],
            timeframe="Next pipeline run",
            cost_estimate="$0 (automated)",
            expected_impact="Better analytics accuracy; correct industry benchmarking",
            priority="low",
        ))

    if not rating and confidence < 0.8:
        actions.append(_action(
            action_type="enrich_data",
            category="data_quality",
            title="Enrich Business Data via SerpApi",
            description="Missing rating and low confidence. Run SerpApi enrichment to fill gaps.",
            steps=[
                "Include this business in next SerpApi enrichment batch (--target any-gap)",
                "After enrichment, re-run Agent 3 synthesize to update analytics",
            ],
            timeframe="Next pipeline run",
            cost_estimate="$0 (within free tier)",
            expected_impact="Data completeness → better action recommendations",
            priority="low",
        ))

    if not has_lat:
        actions.append(_action(
            action_type="geocode",
            category="data_quality",
            title="Missing Coordinates — Geocode This Business",
            description="No lat/lon data. Run Agent 2 enrich to forward-geocode from address.",
            steps=[
                "Include in next Agent 2 --enrich pass for Nominatim forward geocoding",
                "After geocoding, neighborhood and zip code will auto-populate",
            ],
            timeframe="Next pipeline run",
            cost_estimate="$0",
            expected_impact="Enables geographic analysis and neighborhood-level actions",
            priority="low",
        ))

    return actions


# ══════════════════════════════════════════════════════════════════
#  LLM STRATEGIST — AI-powered action generation
#  Takes rule-engine context and produces tailored, creative actions
# ══════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are an elite small-business strategist for the Coral Gables Chamber of Commerce (CGCC).
You receive a business profile with analytics data and a set of TRIGGERED ACTION CATEGORIES that need attention.

Your job: produce specific, actionable, execute-NOW recommendations for THIS business.

RULES:
1. Every action must be SPECIFIC to this business — reference their name, category, neighborhood, exact rating, and actual pain points. Never give generic advice.
2. Each action needs: title, description (2-3 sentences with data-backed reasoning), steps (3-5 concrete steps), timeframe, cost_estimate, expected_impact, priority (urgent/high/medium/low), action_type (snake_case), and category (reputation/visibility/risk/growth/operations/data_quality).
3. Reference COMPETITIVE CONTEXT — how they compare to neighbors, category averages, and similar businesses.
4. For cost_estimate, give specific dollar amounts or ranges. For expected_impact, give measurable outcomes (e.g., "+0.3 rating", "2x reviews", "+15% foot traffic").
5. Prioritize actions that can start TODAY with $0, then layer in investments.
6. If pain points mention specific issues (slow service, parking, rude staff), address the ROOT CAUSE, not symptoms.
7. Consider the business's PKP node_type: "infrastructure" nodes (banks, law firms) should focus on ecosystem leadership; "asset" nodes (restaurants, retail) should focus on customer experience.
8. Coral Gables context: affluent city, walkable downtown, Miracle Mile shopping district, Mediterranean architecture, high commercial rents, strong chamber community.

Respond with ONLY a JSON array of action objects. No markdown, no explanation outside the JSON."""

ACTION_SCHEMA_PROMPT = """Each action object in the array must have exactly these fields:
{
  "action_type": "string (snake_case identifier)",
  "category": "reputation|visibility|risk|growth|operations|data_quality",
  "title": "string (specific, actionable, 5-12 words)",
  "description": "string (2-3 sentences, reference specific data)",
  "steps": ["string", "string", "string"],
  "timeframe": "string (e.g. 'Today', 'This week', 'This month', 'This quarter')",
  "cost_estimate": "string (e.g. '$0', '$200-$500/mo')",
  "expected_impact": "string (measurable outcome)",
  "priority": "urgent|high|medium|low"
}"""


def _build_business_context(
    row: pd.Series,
    rule_actions: List[Dict],
    cat_stats: Dict,
    neighborhood_stats: Dict,
) -> str:
    """Build a rich context string for the LLM from business data + analytics."""
    name = str(row.get("business_name", "Unknown"))
    category = str(row.get("category_primary", "other")).replace("_", " ")
    neighborhood = str(row.get("neighborhood_area", "unknown"))
    rating = _float(row.get("rating_primary_value"))
    reviews = _int(row.get("rating_primary_review_count"))
    confidence = _float(row.get("osint_confidence"))
    chamber = str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE")
    has_website = bool(str(row.get("website", "")).strip())
    has_phone = bool(str(row.get("phone", "")).strip())
    has_red_flag = str(row.get("red_flag_present", "")).upper() in ("Y", "YES")
    red_notes = str(row.get("red_flag_notes", ""))
    pain_points = str(row.get("top_pain_points", ""))
    delights = str(row.get("top_delights", ""))
    node_type = str(row.get("pkp_node_type", "asset"))
    edges = str(row.get("pkp_edges_summary", ""))
    undercurrents = str(row.get("pkp_undercurrents_summary", ""))
    price_tier = str(row.get("price_tier", ""))

    # Competitive context
    cat_key = str(row.get("category_primary", ""))
    nb_key = neighborhood
    peers_in_area = cat_stats.get((cat_key, nb_key), {})
    avg_rating = peers_in_area.get("avg_rating", 0)
    peer_count = peers_in_area.get("count", 0)
    nb_stats = neighborhood_stats.get(nb_key, {})

    # Which action categories were triggered by the rule engine
    triggered_categories = list(set(a["category"] for a in rule_actions))
    triggered_types = [a["action_type"] for a in rule_actions]

    ctx = f"""=== BUSINESS PROFILE ===
Name: {name}
Category: {category}
Neighborhood: {neighborhood}
Rating: {f'{rating:.1f}/5.0 ({reviews} reviews)' if rating else 'NO RATING DATA'}
OSINT Confidence: {confidence:.0%}
Chamber Member: {'Yes' if chamber else 'No'}
Website: {'Yes' if has_website else 'MISSING'}
Phone: {'Yes' if has_phone else 'MISSING'}
Price Tier: {price_tier or 'Unknown'}
PKP Node Type: {node_type}

=== CUSTOMER FEEDBACK ===
Top Delights: {delights if delights else 'None recorded'}
Top Pain Points: {pain_points if pain_points else 'None recorded'}

=== PKP SYNTHESIS ===
Edges: {edges if edges else 'None'}
Undercurrents: {undercurrents if undercurrents else 'None'}

=== RISK FLAGS ===
Red Flag: {'YES — ' + red_notes if has_red_flag else 'No'}

=== COMPETITIVE CONTEXT ===
Peers in {neighborhood} ({category}): {peer_count} businesses
Average rating in this category/area: {f'{avg_rating:.1f}' if avg_rating else 'N/A'}
Total businesses in {neighborhood}: {nb_stats.get('total', 'N/A')}
Chamber members in {neighborhood}: {nb_stats.get('chamber_count', 'N/A')}

=== TRIGGERED ACTION CATEGORIES ===
Categories needing attention: {', '.join(triggered_categories)}
Specific triggers: {', '.join(triggered_types)}
"""
    return ctx


def _call_llm(
    business_contexts: List[Tuple[str, str, List[Dict]]],
    use_model: str = None,
) -> Dict[str, List[Dict]]:
    """
    Call OpenAI to generate tailored actions for a batch of businesses.
    Returns a dict mapping business_name -> list of action dicts.
    Falls back to empty dict on any error (caller uses rule-based fallback).
    """
    global _llm_stats

    if not _HAS_OPENAI or not OPENAI_API_KEY:
        return {}

    model = use_model or LLM_MODEL
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Build the user prompt with one or more businesses
    user_parts = []
    name_list = []
    for biz_name, context, rule_actions in business_contexts:
        name_list.append(biz_name)
        user_parts.append(f"--- BUSINESS: {biz_name} ---\n{context}")

    user_prompt = "\n\n".join(user_parts)
    user_prompt += f"\n\n{ACTION_SCHEMA_PROMPT}\n\n"

    if len(business_contexts) == 1:
        user_prompt += (
            f"Generate 3-6 specific actions for {name_list[0]}. "
            f"Focus on the triggered categories. Return ONLY a JSON array."
        )
    else:
        user_prompt += (
            f"Generate 3-6 specific actions for EACH of these {len(name_list)} businesses. "
            f"Return a JSON object where each key is the business name and each value is an array of actions.\n"
            f"Business names: {json.dumps(name_list)}"
        )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS * len(business_contexts),
            response_format={"type": "json_object"},
        )

        _llm_stats["calls"] += 1
        if response.usage:
            _llm_stats["tokens_in"] += response.usage.prompt_tokens
            _llm_stats["tokens_out"] += response.usage.completion_tokens

        content = response.choices[0].message.content
        parsed = json.loads(content)

        # Normalize response structure
        result = {}
        if len(business_contexts) == 1:
            biz_name = name_list[0]
            # Response might be {"actions": [...]} or [...] or {"Name": [...]}
            if isinstance(parsed, list):
                result[biz_name] = parsed
            elif biz_name in parsed:
                result[biz_name] = parsed[biz_name]
            elif "actions" in parsed:
                result[biz_name] = parsed["actions"]
            else:
                # Try the first key that has a list value
                for k, v in parsed.items():
                    if isinstance(v, list):
                        result[biz_name] = v
                        break
        else:
            # Multi-business response
            for biz_name in name_list:
                if biz_name in parsed:
                    result[biz_name] = parsed[biz_name]
                else:
                    # fuzzy match key
                    for k, v in parsed.items():
                        if isinstance(v, list) and biz_name.lower() in k.lower():
                            result[biz_name] = v
                            break

        # Validate / sanitize each action
        valid_categories = {"reputation", "visibility", "risk", "growth", "operations", "data_quality"}
        valid_priorities = {"urgent", "high", "medium", "low"}

        for biz_name in list(result.keys()):
            validated = []
            for action in result.get(biz_name, []):
                if not isinstance(action, dict):
                    continue
                # Ensure required fields
                if not action.get("title") or not action.get("description"):
                    continue
                # Sanitize category
                if action.get("category") not in valid_categories:
                    action["category"] = "growth"
                # Sanitize priority
                if action.get("priority") not in valid_priorities:
                    action["priority"] = "medium"
                # Ensure steps is a list
                if not isinstance(action.get("steps"), list):
                    action["steps"] = [action.get("steps", "Execute this action")]
                # Ensure all string fields exist
                for field in ["action_type", "timeframe", "cost_estimate", "expected_impact"]:
                    if not action.get(field):
                        action[field] = "See description" if field != "action_type" else "llm_generated"
                validated.append(action)
            result[biz_name] = validated

        return result

    except Exception as e:
        print(f"    ⚠ LLM call failed: {e}")
        _llm_stats["fallbacks"] += len(business_contexts)
        return {}


# ══════════════════════════════════════════════════════════════════
#  MAIN ACTION GENERATION ENGINE
# ══════════════════════════════════════════════════════════════════

def generate_all_actions(
    master_path: str,
    top_n: int = 0,
    filter_category: str = "",
    use_llm: bool = True,
) -> Dict[str, Any]:
    """
    Generate the full action playbook for all businesses.
    
    If use_llm=True and OPENAI_API_KEY is set, uses the LLM strategist to
    generate tailored actions. Falls back to rule-based for any business
    where the LLM call fails.
    
    Returns a dict ready for JSON serialization.
    """
    global _llm_stats
    _llm_stats = {"calls": 0, "tokens_in": 0, "tokens_out": 0, "fallbacks": 0}

    df = pd.read_csv(master_path, dtype=str).fillna("")
    total = len(df)
    print(f"  Loaded: {total} businesses from {master_path}")

    # Determine LLM mode
    llm_available = use_llm and _HAS_OPENAI and bool(OPENAI_API_KEY)
    if use_llm and not _HAS_OPENAI:
        print("  ⚠ openai package not installed — falling back to rule-based mode")
        print("    Install with: pip install openai")
    elif use_llm and not OPENAI_API_KEY:
        print("  ⚠ OPENAI_API_KEY not set — falling back to rule-based mode")
        print("    Set with: export OPENAI_API_KEY=sk-...")
    if llm_available:
        print(f"  🧠 LLM mode: {LLM_MODEL} (AI-powered action strategist)")
    else:
        print(f"  📋 Rule-based mode (deterministic templates)")

    if filter_category:
        df = df[df["category_primary"] == filter_category]
        print(f"  Filtered to: {len(df)} businesses in '{filter_category}'")

    # Pre-compute: category stats per neighborhood (for competitive context)
    cat_neighborhood_stats = {}
    for _, row in df.iterrows():
        cat = str(row.get("category_primary", ""))
        nb = str(row.get("neighborhood_area", ""))
        key = (cat, nb)
        if key not in cat_neighborhood_stats:
            cat_neighborhood_stats[key] = {"count": 0, "total_rating": 0.0, "rated_count": 0}
        cat_neighborhood_stats[key]["count"] += 1
        r = _float(row.get("rating_primary_value"))
        if r > 0:
            cat_neighborhood_stats[key]["total_rating"] += r
            cat_neighborhood_stats[key]["rated_count"] += 1
    # Compute averages
    for key in cat_neighborhood_stats:
        s = cat_neighborhood_stats[key]
        s["avg_rating"] = s["total_rating"] / s["rated_count"] if s["rated_count"] > 0 else 0

    # Pre-compute: neighborhood-level stats
    neighborhood_stats = {}
    for _, row in df.iterrows():
        nb = str(row.get("neighborhood_area", ""))
        if nb not in neighborhood_stats:
            neighborhood_stats[nb] = {"total": 0, "chamber_count": 0}
        neighborhood_stats[nb]["total"] += 1
        if str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE"):
            neighborhood_stats[nb]["chamber_count"] += 1

    # Pre-compute: chamber members per neighborhood (for growth actions)
    chamber_by_neighborhood = {}
    for _, row in df.iterrows():
        if str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE"):
            nb = str(row.get("neighborhood_area", ""))
            if nb not in chamber_by_neighborhood:
                chamber_by_neighborhood[nb] = []
            chamber_by_neighborhood[nb].append(str(row.get("business_name", "")))

    # Generate priority scores
    df["_priority_score"] = df.apply(compute_priority, axis=1)
    df = df.sort_values("_priority_score", ascending=False)

    if top_n > 0:
        df = df.head(top_n)
        print(f"  Top {top_n} by priority score")

    # ── Phase 1: Run rule engine on ALL businesses ───────────────
    # Collect rule-based actions + contexts for LLM batching
    business_data = []  # list of (idx, row, rule_actions, context_str, name)

    for idx, row in df.iterrows():
        name = str(row.get("business_name", ""))
        if not name:
            continue

        neighborhood = str(row.get("neighborhood_area", ""))
        category = str(row.get("category_primary", ""))
        nearby_chamber = chamber_by_neighborhood.get(neighborhood, [])
        nearby_chamber = [n for n in nearby_chamber if normalize_key(n) != normalize_key(name)]
        cat_key = (category, neighborhood)
        cat_nb_count = cat_neighborhood_stats.get(cat_key, {}).get("count", 0)

        # Run all rule-based generators
        rule_actions = []
        rule_actions.extend(generate_reputation_actions(row))
        rule_actions.extend(generate_visibility_actions(row))
        rule_actions.extend(generate_risk_actions(row))
        rule_actions.extend(generate_growth_actions(row, nearby_chamber, cat_nb_count, len(chamber_by_neighborhood.get(neighborhood, []))))
        rule_actions.extend(generate_operations_actions(row))
        rule_actions.extend(generate_data_actions(row))

        # Build LLM context
        context_str = _build_business_context(
            row, rule_actions, cat_neighborhood_stats, neighborhood_stats,
        )

        business_data.append((idx, row, rule_actions, context_str, name))

    # ── Phase 2: LLM enrichment (batched) ────────────────────────
    llm_results = {}  # name -> list of LLM-generated actions
    if llm_available and business_data:
        print(f"\n  🧠 Sending {len(business_data)} businesses to LLM in batches of {LLM_BATCH_SIZE}...")
        batches = [
            business_data[i:i + LLM_BATCH_SIZE]
            for i in range(0, len(business_data), LLM_BATCH_SIZE)
        ]

        for batch_idx, batch in enumerate(batches):
            batch_contexts = [
                (name, ctx, rule_acts)
                for (_, _, rule_acts, ctx, name) in batch
            ]
            print(f"    Batch {batch_idx + 1}/{len(batches)}: {', '.join(n[:25] for n in [b[0] for b in batch_contexts])}...")

            batch_result = _call_llm(batch_contexts)
            llm_results.update(batch_result)

            if batch_idx < len(batches) - 1:
                _time.sleep(LLM_RATE_LIMIT_DELAY)

        llm_count = sum(1 for v in llm_results.values() if v)
        print(f"  🧠 LLM generated actions for {llm_count}/{len(business_data)} businesses")
        if _llm_stats["fallbacks"] > 0:
            print(f"  ⚠ {_llm_stats['fallbacks']} businesses fell back to rule-based")

    # ── Phase 3: Assemble playbook ───────────────────────────────
    playbook = []
    stats = {
        "total_businesses": total,
        "businesses_with_actions": 0,
        "total_actions": 0,
        "by_category": {},
        "by_priority": {"urgent": 0, "high": 0, "medium": 0, "low": 0},
        "llm_powered": llm_available,
        "llm_model": LLM_MODEL if llm_available else None,
        "llm_calls": _llm_stats["calls"],
        "llm_tokens_in": _llm_stats["tokens_in"],
        "llm_tokens_out": _llm_stats["tokens_out"],
    }

    for idx, row, rule_actions, context_str, name in business_data:
        business_id = str(row.get("business_id", ""))
        neighborhood = str(row.get("neighborhood_area", ""))
        category = str(row.get("category_primary", ""))

        # Choose best actions: LLM if available, else rule-based
        llm_actions = llm_results.get(name, [])
        if llm_actions:
            all_actions = llm_actions
            source = "llm"
        else:
            all_actions = rule_actions
            source = "rules"

        if not all_actions:
            # Even healthy businesses get a maintenance action
            all_actions.append(_action(
                action_type="maintain",
                category="growth",
                title="Maintain Your Competitive Edge",
                description="Your business is performing well. Focus on sustaining quality and exploring growth.",
                steps=[
                    "Continue monitoring customer feedback weekly",
                    "Stay active in the Chamber community — attend at least 1 event/quarter",
                    "Explore one new marketing channel this quarter (Instagram Reels, Google Posts, local partnerships)",
                    "Set a quarterly review to re-assess your action plan",
                ],
                timeframe="Ongoing",
                cost_estimate="$0",
                expected_impact="Sustained competitive position",
                priority="low",
            ))

        # Sort by priority
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        all_actions.sort(key=lambda a: priority_order.get(a.get("priority", "medium"), 99))

        entry = {
            "business_id": business_id,
            "business_name": name,
            "category_primary": category,
            "neighborhood_area": neighborhood,
            "rating": _float(row.get("rating_primary_value")),
            "review_count": _int(row.get("rating_primary_review_count")),
            "chamber_member": str(row.get("chamber_member", "")).upper() in ("Y", "YES", "TRUE"),
            "osint_confidence": _float(row.get("osint_confidence")),
            "priority_score": float(row.get("_priority_score", 0)),
            "actions": all_actions,
            "action_count": len(all_actions),
            "top_action": all_actions[0]["title"] if all_actions else "",
            "action_source": source,
            "generated_at": datetime.now().isoformat(),
        }

        playbook.append(entry)
        stats["businesses_with_actions"] += 1
        stats["total_actions"] += len(all_actions)

        for a in all_actions:
            cat = a.get("category", "growth")
            stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
            prio = a.get("priority", "medium")
            stats["by_priority"][prio] = stats["by_priority"].get(prio, 0) + 1

    return {
        "generated_at": datetime.now().isoformat(),
        "master_source": master_path,
        "stats": stats,
        "playbook": playbook,
    }


def write_playbook(result: Dict[str, Any], dry_run: bool = False):
    """Write action playbook JSON for dashboard consumption."""
    if dry_run:
        print(f"\n  DRY RUN: would write {len(result['playbook'])} business playbooks")
        return

    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
    with open(ACTION_PLAYBOOK_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"  Wrote playbook: {ACTION_PLAYBOOK_FILE}")


def print_summary(result: Dict[str, Any]):
    """Print action generation summary."""
    stats = result["stats"]
    playbook = result["playbook"]

    print(f"\n  {'='*55}")
    print(f"  ACTION PLAYBOOK SUMMARY")
    print(f"  {'='*55}\n")
    print(f"  Total businesses analyzed:   {stats['total_businesses']}")
    print(f"  With actions generated:      {stats['businesses_with_actions']}")
    print(f"  Total actions produced:      {stats['total_actions']}")
    avg = stats["total_actions"] / max(stats["businesses_with_actions"], 1)
    print(f"  Average actions/business:    {avg:.1f}")

    # LLM stats
    if stats.get("llm_powered"):
        llm_sourced = sum(1 for b in playbook if b.get("action_source") == "llm")
        rule_sourced = sum(1 for b in playbook if b.get("action_source") == "rules")
        print(f"\n  AI Strategist:")
        print(f"    Model:          {stats.get('llm_model', 'N/A')}")
        print(f"    API calls:      {stats.get('llm_calls', 0)}")
        print(f"    Tokens in:      {stats.get('llm_tokens_in', 0):,}")
        print(f"    Tokens out:     {stats.get('llm_tokens_out', 0):,}")
        print(f"    LLM-powered:    {llm_sourced} businesses")
        print(f"    Rule-fallback:  {rule_sourced} businesses")
    else:
        print(f"\n  Mode: Rule-based (set OPENAI_API_KEY for AI-powered actions)")

    print(f"\n  Actions by priority:")
    for prio in ["urgent", "high", "medium", "low"]:
        count = stats["by_priority"].get(prio, 0)
        bar = "█" * (count // 10) + "░" * max(0, 5 - count // 10)
        print(f"    {prio:<10} {count:>5}  {bar}")

    print(f"\n  Actions by category:")
    for cat, count in sorted(stats["by_category"].items(), key=lambda x: -x[1]):
        print(f"    {cat:<20} {count:>5}")

    # Top 10 most urgent businesses
    urgent = [b for b in playbook if b["priority_score"] >= 0.5]
    if urgent:
        print(f"\n  Top 10 highest-priority businesses:")
        for b in urgent[:10]:
            flag = "🔴" if b["priority_score"] >= 0.7 else "🟡" if b["priority_score"] >= 0.5 else "🟢"
            src = "🧠" if b.get("action_source") == "llm" else "📋"
            print(f"    {flag} {b['priority_score']:.2f}  {b['business_name'][:35]:<35}  {src} → {b['top_action'][:45]}")

    print()


# ── CLI ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agent 4 — AI-Powered Action Strategist",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "4. agent4-actions.py" --master data/master_all_businesses.csv
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --top 50
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --no-llm
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --category food_beverage
  python "4. agent4-actions.py" --master data/master_all_businesses.csv --dry-run

Environment variables:
  OPENAI_API_KEY   — Required for AI-powered mode. Falls back to rules without it.
  AGENT4_MODEL     — Override LLM model (default: gpt-4o-mini). Set to gpt-4o for premium.
        """,
    )
    parser.add_argument("--master", required=True, help="Path to master CSV")
    parser.add_argument("--top", type=int, default=0, help="Only generate for top N priority businesses (0=all)")
    parser.add_argument("--category", type=str, default="", help="Filter to a specific category_primary")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM strategist, use rule-based templates only")
    parser.add_argument("--dry-run", action="store_true", help="Generate actions but don't write files")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  AGENT 4 — AI-POWERED ACTION STRATEGIST")
    print(f"  Master: {args.master}")
    print(f"  Mode:   {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"  Engine: {'Rule-based only (--no-llm)' if args.no_llm else f'LLM ({LLM_MODEL})' if _HAS_OPENAI and OPENAI_API_KEY else 'Rule-based (no API key)'}")
    if args.top:
        print(f"  Top N:  {args.top}")
    if args.category:
        print(f"  Filter: {args.category}")
    print(f"{'='*60}\n")

    if not os.path.exists(args.master):
        print(f"  ERROR: {args.master} not found")
        return

    result = generate_all_actions(
        args.master,
        args.top,
        args.category,
        use_llm=not args.no_llm,
    )
    print_summary(result)
    write_playbook(result, args.dry_run)

    print(f"  Done.\n")


if __name__ == "__main__":
    main()
