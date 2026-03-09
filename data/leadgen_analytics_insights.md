# LeadGen Enrichment Analytics — Key Insights Report
**Date:** 2026-03-09
**Dataset:** 1,457 enriched leads | 35 data fields per lead
**Prepared by:** Co_ Analytics Engine (PKP Framework)

---

## Executive Summary

From a raw input of **name + email only**, the enrichment pipeline produced a fully scored, segmented, and outreach-ready dataset with 35 fields across contact, company, business intelligence, and behavioral scoring dimensions.

**Key headline numbers:**
- **546 leads (37.5%)** are Grade A — call-ready with full outreach packages
- **263 leads (18.1%)** are Grade B — email-ready warm leads
- **383 senior decision-makers** identified (CEOs, VPs, Presidents, Owners)
- **643 leads** now have verified business ratings from Google/SerpApi
- **949 leads (65%)** have personalized outreach scripts + talking points generated

---

## 1. Lead Score Distribution

| Grade | Count | % of Total | Recommended Action |
|-------|-------|-----------|-------------------|
| **A** | 546 | 37.5% | CALL — sales-ready, full contact info |
| **B** | 263 | 18.1% | EMAIL — solid lead, initiate contact |
| **C** | 140 | 9.6% | NURTURE — drip campaign, enrich further |
| **D** | 392 | 26.9% | LOW PRIORITY — monitor only |
| **F** | 116 | 8.0% | SKIP — insufficient data |

**Mean Lead Score:** 56.8 / 100
**Hot Leads (score >= 80):** 356
**Actionable Leads (score >= 70):** 649 (44.5% of total list)

### What Drives the Score
| Component | Grade A avg | Grade D avg | Gap |
|-----------|------------|------------|-----|
| Contact completeness | 29.9 | 21.0 | +8.9 |
| Company data | 29.2 | 8.3 | +20.9 |
| Business intelligence | 13.2 | 0.0 | +13.2 |
| Fit score | 4.9 | 0.9 | +4.0 |
| Seniority bonus | 2.7 | 0.3 | +2.4 |

**Insight:** The biggest differentiator between A-grade and D-grade leads is **company data enrichment** (20.9 point gap) and **business intelligence** (13.2 point gap). The enrichment work is what transforms unusable contacts into sales-ready leads.

---

## 2. Top Categories & Vertical Analysis

### Category Performance Ranking (by A-grade %)

| Category | Total | A-Grade | A-Grade % | Avg Score |
|----------|-------|---------|-----------|-----------|
| **Retail** | 41 | 38 | **92.7%** | 83.2 |
| **Hotel** | 47 | 42 | **89.4%** | 84.1 |
| **Hospitality** | 7 | 6 | **85.7%** | 80.3 |
| **Developers** | 76 | 54 | **71.1%** | 77.3 |
| **Healthcare** | 69 | 48 | **69.6%** | 76.0 |
| **Law** | 9 | 6 | **66.7%** | 73.2 |
| **Cruise** | 138 | 87 | **63.0%** | 75.8 |
| **Vendor** | 164 | 102 | **62.2%** | 72.9 |
| **Business Services** | 154 | 80 | **51.9%** | 67.8 |
| **Travel** | 23 | 10 | **43.5%** | 71.1 |
| **Academic** | 47 | 10 | **21.3%** | 54.4 |
| **Government** | 8 | 1 | **12.5%** | 66.9 |
| **General** | 669 | 62 | **9.3%** | 37.6 |

### Key Vertical: Hospitality & Travel (Hotel + Cruise + Travel + Hospitality)
- **215 leads** | **145 A-grade** (67.4%) | **Avg score: 77.3**
- **108 senior leaders** identified in this vertical alone
- This is the single strongest vertical in the dataset

### Key Vertical: Real Estate & Developers
- **76 leads** | **54 A-grade** (71.1%) | **Avg score: 77.3**
- High concentration of CEOs, Managing Partners, and Development Managers

---

## 3. Top Job Titles (Decision-Maker Map)

| Title | Count | Notes |
|-------|-------|-------|
| General Professional | 63 | Needs further title enrichment |
| President | 27 | Top decision-maker |
| Chief Marketing Officer | 27 | Budget holder for marketing/CRM |
| Trustee | 25 | Board-level influence |
| Chief Executive Officer | 23 | Ultimate decision-maker |
| Professional | 19 | Needs further enrichment |
| Operations Manager | 14 | Ops budget holder |
| Sales Manager | 14 | Revenue-focused |
| Business Services Professional | 14 | Category-specific |
| Owner | 12 | Full authority |
| Account Manager | 11 | Relationship holder |

**383 total senior decision-makers** (C-Suite, VP, President, Owner, Director)
- 261 are Grade A (68.1% conversion to top tier)
- 340 have phone numbers (88.8% phone coverage)

---

## 4. Enrichment Coverage (What Was Added)

The client provided: **name + email** (2 fields).
The enrichment added up to **33 additional fields**:

| Enriched Field | Coverage | Value |
|---------------|----------|-------|
| Phone number | 70.1% (1,021) | Enables call outreach |
| Company website | 57.9% (844) | Company verification |
| Matched business | 57.1% (832) | OSINT business match |
| Business address | 54.0% (787) | Physical location data |
| Business rating | 44.1% (643) | Reputation intelligence |
| Enriched category | 52.2% (761) | Industry classification |
| City/State | 57-58% | Geographic targeting |
| Outreach script | 65.1% (949) | Ready-to-use call/email scripts |
| Talking points | 65.1% (949) | Personalized conversation starters |
| Follow-up strategy | 65.1% (949) | Multi-touch cadence plans |
| Lead score + grade | 100% (1,457) | Prioritization framework |

### Match Methods
- **web_serpapi:** 727 matches (87.5% of all matches) — web search + business API
- **domain:** 88 matches — company domain lookup
- **name_exact/fuzzy:** 16 matches — name-based matching

---

## 5. Geographic Insights

### Top States
| State | Count | Notes |
|-------|-------|-------|
| Florida | 271 | Core market — Miami, Coral Gables, Boca Raton |
| Virginia | 147 | Ashburn data center corridor |
| California | 83 | LA + San Jose |
| New York | 78 | NYC metro |
| Washington | 61 | Pacific NW |

### Top Cities
| City | Count | Notes |
|------|-------|-------|
| Miami | 245 | Primary market anchor |
| Ashburn, VA | 105 | Secondary cluster |
| New York | 73 | Northeast hub |
| San Jose | 62 | West Coast tech |
| Des Moines | 49 | Midwest presence |
| Coral Gables | 34 | Local high-value market |

**Insight:** The list is heavily South Florida-anchored (Miami + Coral Gables = 279 leads), which aligns with a localized go-to-market. The Ashburn/Virginia cluster may relate to corporate HQ locations.

---

## 6. Business Intelligence Insights

### Reputation Analysis (643 rated businesses)
- **Average rating:** 4.35 / 5.0
- **5-star businesses:** 145 (22.5% — premium positioning leverage)
- **4.5+ rated:** 366 (56.9%)
- **Below 3.0 (turnaround opportunities):** 35

### Review Landscape
- **Average review count:** 633
- **1,000+ reviews (market leaders):** 60
- **Under 10 reviews (review generation opportunity):** 158

### Actionable Opportunity Segments

**Reputation Turnaround Targets (82 leads):**
Businesses with sub-4.0 ratings — present reputation management services:
- Norwegian Cruise Line (3.2 stars, 673 reviews)
- LATAM Airlines (3.4 stars, 440 reviews)
- Ambassador Cruise Line (3.3 stars, 153 reviews)

**Review Generation Targets (146 leads):**
High-quality businesses (4.5+) with under 20 reviews — amplification opportunity:
- 146 businesses that have great quality but low visibility

---

## 7. GoHighLevel CRM Segmentation Strategy

### Recommended GHL Pipeline Stages

```
Stage 1: HOT — CALL NOW (546 leads)
├── Complete outreach packages ready
├── Personalized scripts + talking points
└── Follow-up cadences defined

Stage 2: WARM — EMAIL SEQUENCE (263 leads)
├── Trigger automated email sequences
├── Track opens/clicks for promotion to Stage 1
└── Include case studies + social proof

Stage 3: NURTURE — DRIP (140 leads)
├── Monthly newsletter enrollment
├── Re-score in 30 days
└── Upgrade to Stage 2 on engagement

Stage 4: ENRICH — DATA GAPS (508 leads)
├── Further OSINT enrichment needed
├── LinkedIn scraping for missing titles
└── Phone append services for missing numbers
```

### GHL Smart Lists to Build

1. **"Hospitality VIPs"** — Hotel + Cruise + Travel, Grade A, Senior title → 145 leads
2. **"Developer Pipeline"** — Developers category, Grade A/B → 71 leads
3. **"Healthcare Decision-Makers"** — Healthcare, with phone → ~60 leads
4. **"Reputation Recovery"** — Rating < 4.0, with contact info → 82 leads
5. **"Review Amplification"** — Rating 4.5+, reviews < 20 → 146 leads
6. **"Current Client Upsell"** — Tagged "Current Clients" → 57 leads
7. **"Villagers Network"** — Tagged "Villagers List" → 93 leads (community-based warm intros)
8. **"South Florida Local"** — Florida state, Grade A/B → ~300 leads
9. **"C-Suite Direct"** — CEO/President/Owner titles, Grade A → 261 leads

### GHL Workflow Automations

1. **Inbound Lead Scoring Trigger:** When new contact enters → auto-enrich → score → route to appropriate pipeline stage
2. **Grade A Auto-Dialer Queue:** Load call-ready leads into GHL power dialer with scripts pre-loaded
3. **Email Nurture Sequences:**
   - Day 0: Personalized intro (from outreach_script field)
   - Day 3: Value-add follow-up
   - Day 7: Case study
   - Day 14: Final attempt
4. **Re-Engagement Trigger:** When D-grade lead engages (email open, site visit) → promote to nurture → enrich further
5. **Reputation Alert Workflow:** For businesses with < 4.0 rating → trigger reputation management offer sequence

---

## 8. Special Segments & Tags

### Current Clients (57 leads)
- 51 are in the **Cruise** category — strong existing relationship with cruise vertical
- 24 are A-grade — upsell and expansion opportunities

### Villagers List (93 leads)
- Community-sourced warm introductions
- Only 29 have enrichment data — **68.8% opportunity for further enrichment**
- 21 are A-grade after enrichment

### Pilot Program (51 leads tagged "90-Day Brand Lift")
- Early adopter cohort for measuring ROI
- Track conversion rates for this group as proof of concept

### Chamber Members (66 identified as "Y")
- Chamber membership = community trust signal
- Use for referral and co-marketing partnerships

---

## 9. Data Quality Flags

- **0 duplicate emails** — clean deduplication
- **80 "General Contact" titles** — need further title enrichment
- **669 "General" category leads** (45.9%) — largest segment but lowest A-grade rate (9.3%)
  - **Opportunity:** Re-categorize General leads using enriched_category field where available
- **116 F-grade leads** — minimal data, likely list padding; consider removal
- **name_flag = "initial_only"** on some records — indicates partial name data

---

## 10. Key Strategic Insights

### Insight #1: The enrichment multiplier
The client gave you names and emails. You returned **scored, segmented, outreach-ready intelligence**. The jump from 2 fields to 35 fields is a **17.5x data multiplier**. This transformed 37.5% of the list into call-ready leads.

### Insight #2: Vertical concentration is a strength
Hospitality/Travel (215 leads) and Developers (76 leads) have the highest A-grade conversion rates. These verticals should be the primary focus of outreach campaigns.

### Insight #3: The "General" problem is the biggest opportunity
669 leads (45.9%) sit in "General" category with only 9.3% making A-grade. With targeted enrichment, many of these could be re-categorized and promoted. This represents the single largest ROI opportunity for additional enrichment investment.

### Insight #4: Reputation intelligence creates new sales angles
- 82 leads have businesses rated below 4.0 — reputation recovery pitch
- 146 leads have 4.5+ ratings with under 20 reviews — review amplification pitch
- These are concrete, measurable value propositions for outreach

### Insight #5: Senior decision-maker concentration
383 senior decision-makers identified, 68.1% are A-grade, 88.8% have phone numbers. This is an unusually high concentration of decision-maker contacts for a leadgen list.
