#!/usr/bin/env python3
"""
Agent 10 — Action Playbook Generator
======================================
Generates personalized outreach playbooks for each scored lead.
Uses a hybrid approach: rule engine + optional LLM (GPT-4o-mini)
for tailored messaging.

For each lead, generates:
  - outreach_channel (call / email / nurture / skip)
  - outreach_script (personalized opening line)
  - talking_points (key hooks based on business data)
  - follow_up_strategy (next steps after initial contact)

Architecture (mirrors Agent 4):
  1. Rule engine — categorizes leads and builds context
  2. LLM strategist — generates personalized scripts (optional)
  3. Graceful fallback — rule-based templates if no OpenAI key

Usage:
  python "10. agent10-playbook.py" --leads data/leadgen.csv
  python "10. agent10-playbook.py" --leads data/leadgen.csv --no-llm
  python "10. agent10-playbook.py" --leads data/leadgen.csv --dry-run
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

# ── Optional: OpenAI SDK ────────────────────────────────────────────
try:
    from openai import OpenAI
    _HAS_OPENAI = True
except ImportError:
    _HAS_OPENAI = False

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LLM_MODEL = os.environ.get("AGENT10_MODEL", "gpt-4o-mini")
LLM_BATCH_SIZE = 10
LLM_RATE_LIMIT_DELAY = 0.5

_llm_stats = {"calls": 0, "tokens_in": 0, "tokens_out": 0, "fallbacks": 0}


# ── Rule-based playbook templates ───────────────────────────────────

CATEGORY_HOOKS = {
    "hotel": "hospitality partnerships and guest experience solutions",
    "hospitality": "hospitality partnerships and guest experience solutions",
    "cruise": "cruise line partnerships and destination marketing",
    "developers": "real estate development services and project support",
    "healthcare": "healthcare marketing and patient engagement solutions",
    "business services": "business growth strategies and operational efficiency",
    "retail": "retail marketing and customer acquisition programs",
    "law": "legal practice marketing and client development",
    "vendor": "vendor partnership opportunities and B2B solutions",
    "academic": "educational program support and institutional partnerships",
    "travel": "travel industry partnerships and destination marketing",
    "government": "public sector collaboration and community development",
    "media": "media partnerships and content distribution",
    "general": "business development and growth opportunities",
}

SENIORITY_TIERS = {
    "c-suite": ["ceo", "cfo", "coo", "cto", "cmo", "cio", "chief"],
    "vp": ["vp", "vice president", "evp", "svp"],
    "director": ["director", "head of"],
    "owner": ["owner", "founder", "partner", "principal"],
    "manager": ["manager", "general manager", "gm"],
}


def detect_seniority(title: str) -> str:
    """Detect seniority tier from job title."""
    t = title.lower()
    for tier, keywords in SENIORITY_TIERS.items():
        for kw in keywords:
            if kw in t:
                return tier
    return "other"


def build_rule_playbook(lead: pd.Series) -> Dict:
    """Generate a playbook using rule-based templates."""
    grade = str(lead.get("lead_grade", "")).strip()
    name = str(lead.get("full_name", "")).strip()
    first = str(lead.get("first_name", "")).strip() or name.split()[0] if name else "there"
    company = str(lead.get("company", "")).strip()
    category = str(lead.get("category", "")).strip().lower()
    title = str(lead.get("job_title", "")).strip()
    phone = str(lead.get("phone", "")).strip()
    rating = str(lead.get("business_rating", "")).strip()
    reviews = str(lead.get("business_review_count", "")).strip()
    city = str(lead.get("city", "")).strip()
    chamber = str(lead.get("chamber_member", "")).strip().lower() in ("yes", "true", "1")
    address = str(lead.get("business_address", "")).strip()

    hook = CATEGORY_HOOKS.get(category, CATEGORY_HOOKS["general"])
    seniority = detect_seniority(title) if title else "other"

    # Channel
    if grade == "A" and phone:
        channel = "call"
    elif grade in ("A", "B"):
        channel = "email"
    elif grade == "C":
        channel = "nurture"
    else:
        channel = "skip"

    # Opening script
    if channel == "skip":
        script = ""
        talking_points = ""
        follow_up = ""
    else:
        # Build personalized opener
        if company and seniority in ("c-suite", "owner", "vp"):
            script = (f"Hi {first}, I noticed your work at {company} and wanted to "
                      f"reach out about {hook} that could support your growth.")
        elif company:
            script = (f"Hi {first}, I'm reaching out because {company} caught our "
                      f"attention and we think there's a strong fit for {hook}.")
        else:
            script = (f"Hi {first}, I wanted to connect with you about {hook} "
                      f"that might be relevant to your work.")

        # Talking points
        points = []
        if rating:
            try:
                r = float(rating)
                if r >= 4.5:
                    points.append(f"Strong reputation ({rating} stars) — leverage for premium positioning")
                elif r >= 4.0:
                    points.append(f"Solid {rating}-star rating — opportunity to push into premium tier")
                elif r >= 3.0:
                    points.append(f"Current {rating}-star rating — reputation improvement opportunity")
                else:
                    points.append(f"Rating at {rating} — turnaround and reputation recovery angle")
            except ValueError:
                pass

        if reviews:
            try:
                rc = int(reviews)
                if rc >= 100:
                    points.append(f"High visibility ({rc} reviews) — established market presence")
                elif rc >= 20:
                    points.append(f"{rc} reviews — growing presence, room for amplification")
                else:
                    points.append(f"Only {rc} reviews — review generation campaign opportunity")
            except ValueError:
                pass

        if chamber:
            points.append("Chamber of Commerce member — leverage community connection")

        if city and city.lower() in ("coral gables", "miami"):
            points.append(f"Local to {city} — emphasize community/local expertise")

        if seniority in ("c-suite", "owner"):
            points.append(f"Decision-maker ({title}) — can approve directly")
        elif seniority == "vp":
            points.append(f"Senior leader ({title}) — strong influence on decisions")

        if category in ("hotel", "hospitality", "cruise"):
            points.append("Hospitality/travel sector — seasonal urgency angles")
        elif category == "healthcare":
            points.append("Healthcare sector — compliance and patient trust angles")
        elif category == "developers":
            points.append("Real estate/development — project timeline urgency")

        if not points:
            points.append(f"Category: {category.title()} — explore pain points in discovery call")

        talking_points = " | ".join(points)

        # Follow-up strategy
        if channel == "call":
            if seniority in ("c-suite", "owner", "vp"):
                follow_up = "If no answer: send personalized email within 2hrs → LinkedIn connect day 3 → 2nd call day 5"
            else:
                follow_up = "If no answer: voicemail + email same day → follow-up call day 3 → nurture sequence"
        elif channel == "email":
            follow_up = "No reply in 3 days: 2nd email with value-add → day 7: 3rd touch with case study → day 14: final attempt"
        else:
            follow_up = "Add to monthly newsletter → re-score in 30 days → upgrade if engagement detected"

    return {
        "outreach_channel": channel,
        "outreach_script": script,
        "talking_points": talking_points,
        "follow_up_strategy": follow_up,
    }


# ── LLM-powered playbook ───────────────────────────────────────────

SYSTEM_PROMPT = """You are a B2B sales strategist. Given a batch of lead profiles, generate a short personalized outreach playbook for each.

For each lead, return JSON with:
- "outreach_script": A natural, non-salesy 2-sentence opening (use their first name, reference their company/role specifically)
- "talking_points": 2-3 bullet points as hooks based on their business data (rating, reviews, category, location)
- "follow_up_strategy": A 1-sentence follow-up plan

Be specific. Reference actual data (rating numbers, review counts, company name, city). No generic filler.
Respond ONLY with a JSON array, one object per lead, in the same order as the input."""


def build_llm_batch_prompt(leads_batch: List[Dict]) -> str:
    """Build a prompt for a batch of leads."""
    profiles = []
    for i, lead in enumerate(leads_batch):
        profile = {
            "index": i,
            "name": lead.get("first_name", ""),
            "company": lead.get("company", ""),
            "title": lead.get("job_title", ""),
            "category": lead.get("category", ""),
            "city": lead.get("city", ""),
            "rating": lead.get("business_rating", ""),
            "reviews": lead.get("business_review_count", ""),
            "chamber_member": lead.get("chamber_member", ""),
            "channel": lead.get("_channel", ""),
        }
        profiles.append(profile)
    return json.dumps(profiles, indent=2)


def llm_generate_playbooks(client: "OpenAI", leads_batch: List[Dict]) -> Optional[List[Dict]]:
    """Call OpenAI to generate personalized playbooks for a batch."""
    prompt = build_llm_batch_prompt(leads_batch)
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )
        _llm_stats["calls"] += 1
        _llm_stats["tokens_in"] += response.usage.prompt_tokens
        _llm_stats["tokens_out"] += response.usage.completion_tokens

        content = response.choices[0].message.content
        parsed = json.loads(content)
        # Handle both {"playbooks": [...]} and direct [...]
        if isinstance(parsed, dict):
            parsed = parsed.get("playbooks", parsed.get("results", list(parsed.values())[0]))
        if isinstance(parsed, list) and len(parsed) == len(leads_batch):
            return parsed
        return None
    except Exception as e:
        print(f"      LLM error: {e}")
        _llm_stats["fallbacks"] += 1
        return None


# ── Main pipeline ───────────────────────────────────────────────────

def run_playbook(leads_path: str, use_llm: bool = True, dry_run: bool = False):
    """Execute the playbook generation pipeline."""

    print(f"\n{'='*60}")
    print(f"  Agent 10 — Action Playbook Generator")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    leads = pd.read_csv(leads_path, dtype=str).fillna("")
    total = len(leads)
    print(f"Loaded {total} leads\n")

    # Ensure playbook columns
    for col in ["outreach_channel", "outreach_script", "talking_points", "follow_up_strategy"]:
        if col not in leads.columns:
            leads[col] = ""

    # Determine LLM availability
    llm_available = use_llm and _HAS_OPENAI and OPENAI_API_KEY
    if use_llm and not llm_available:
        if not _HAS_OPENAI:
            print("  OpenAI SDK not installed — using rule-based templates")
        elif not OPENAI_API_KEY:
            print("  OPENAI_API_KEY not set — using rule-based templates")
    elif llm_available:
        print(f"  LLM mode: {LLM_MODEL} (batch size {LLM_BATCH_SIZE})")

    client = OpenAI(api_key=OPENAI_API_KEY) if llm_available else None

    # ── Phase 1: Rule-based playbooks for all leads ───────────
    print("\n[1] Generating rule-based playbooks...")
    channel_counts = {"call": 0, "email": 0, "nurture": 0, "skip": 0}

    for idx, lead in leads.iterrows():
        playbook = build_rule_playbook(lead)
        for k, v in playbook.items():
            leads.at[idx, k] = v
        channel_counts[playbook["outreach_channel"]] += 1

    print(f"    Call:    {channel_counts['call']}")
    print(f"    Email:   {channel_counts['email']}")
    print(f"    Nurture: {channel_counts['nurture']}")
    print(f"    Skip:    {channel_counts['skip']}")

    # ── Phase 2: LLM enhancement for A and B grade leads ──────
    if llm_available:
        ab_mask = leads["lead_grade"].isin(["A", "B"])
        ab_leads = leads[ab_mask]
        actionable = ab_leads[ab_leads["outreach_channel"].isin(["call", "email"])]
        total_actionable = len(actionable)

        print(f"\n[2] LLM personalizing {total_actionable} A/B leads...")

        # Batch processing
        batch = []
        batch_indices = []
        processed = 0
        llm_enhanced = 0

        for idx, lead in actionable.iterrows():
            lead_dict = lead.to_dict()
            lead_dict["_channel"] = lead_dict.get("outreach_channel", "")
            batch.append(lead_dict)
            batch_indices.append(idx)

            if len(batch) >= LLM_BATCH_SIZE:
                results = llm_generate_playbooks(client, batch)
                if results:
                    for i, result in enumerate(results):
                        bidx = batch_indices[i]
                        if result.get("outreach_script"):
                            leads.at[bidx, "outreach_script"] = result["outreach_script"]
                        if result.get("talking_points"):
                            if isinstance(result["talking_points"], list):
                                leads.at[bidx, "talking_points"] = " | ".join(result["talking_points"])
                            else:
                                leads.at[bidx, "talking_points"] = str(result["talking_points"])
                        if result.get("follow_up_strategy"):
                            leads.at[bidx, "follow_up_strategy"] = result["follow_up_strategy"]
                    llm_enhanced += len(results)

                processed += len(batch)
                if processed % 50 == 0 or processed >= total_actionable:
                    print(f"    [{processed}/{total_actionable}] {llm_enhanced} LLM-enhanced")
                batch = []
                batch_indices = []
                time.sleep(LLM_RATE_LIMIT_DELAY)

        # Final batch
        if batch:
            results = llm_generate_playbooks(client, batch)
            if results:
                for i, result in enumerate(results):
                    bidx = batch_indices[i]
                    if result.get("outreach_script"):
                        leads.at[bidx, "outreach_script"] = result["outreach_script"]
                    if result.get("talking_points"):
                        if isinstance(result["talking_points"], list):
                            leads.at[bidx, "talking_points"] = " | ".join(result["talking_points"])
                        else:
                            leads.at[bidx, "talking_points"] = str(result["talking_points"])
                    if result.get("follow_up_strategy"):
                        leads.at[bidx, "follow_up_strategy"] = result["follow_up_strategy"]
                llm_enhanced += len(results)
            processed += len(batch)

        print(f"\n  LLM stats: {_llm_stats['calls']} calls, "
              f"{_llm_stats['tokens_in']+_llm_stats['tokens_out']} tokens, "
              f"{_llm_stats['fallbacks']} fallbacks")
        print(f"  Enhanced: {llm_enhanced}/{total_actionable} leads")
    else:
        print("\n[2] Skipping LLM enhancement (rule-based only)")

    # ── Summary ───────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  PLAYBOOK SUMMARY")
    print(f"{'='*60}")
    print(f"  Total leads:     {total}")
    print(f"  ─────────────────────────────────")
    print(f"  CALL list:       {channel_counts['call']} leads")
    print(f"  EMAIL list:      {channel_counts['email']} leads")
    print(f"  NURTURE list:    {channel_counts['nurture']} leads")
    print(f"  SKIP:            {channel_counts['skip']} leads")
    print(f"  ─────────────────────────────────")

    # Show sample playbooks
    print(f"\n  ─── Sample CALL Playbooks ───")
    call_leads = leads[leads["outreach_channel"] == "call"].head(3)
    for _, lead in call_leads.iterrows():
        print(f"\n  {lead['full_name']} | {lead['company']} | {lead['job_title']}")
        print(f"  Phone: {lead['phone']}")
        print(f"  Script: {lead['outreach_script'][:120]}...")
        print(f"  Hooks: {lead['talking_points'][:120]}...")
        print(f"  Follow-up: {lead['follow_up_strategy'][:100]}")

    print(f"\n  ─── Sample EMAIL Playbooks ───")
    email_leads = leads[leads["outreach_channel"] == "email"].head(3)
    for _, lead in email_leads.iterrows():
        print(f"\n  {lead['full_name']} | {lead['company']} | {lead['email']}")
        print(f"  Script: {lead['outreach_script'][:120]}...")
        print(f"  Follow-up: {lead['follow_up_strategy'][:100]}")

    print(f"\n{'='*60}")

    # ── Write ─────────────────────────────────────────────────
    if dry_run:
        print(f"\n[DRY RUN] Would write {total} rows to {leads_path}")
    else:
        leads.to_csv(leads_path, index=False)
        print(f"\nWrote {total} leads with playbooks to {leads_path}")

    return leads


# ── CLI ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Agent 10 — Action Playbook Generator")
    parser.add_argument("--leads", required=True, help="Path to leadgen CSV")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM, rule-based only")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    if not Path(args.leads).exists():
        print(f"Error: {args.leads} not found")
        sys.exit(1)

    run_playbook(args.leads, use_llm=not args.no_llm, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
