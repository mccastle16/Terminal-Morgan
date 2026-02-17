# Coral Gables OSINT — Strategic Intelligence Framework

> A comprehensive business intelligence platform for the Coral Gables economic ecosystem, powered by the counderscore.com Command Center.

---

## Overview

Coral Gables houses **~4,520 active businesses** and **~150 multinational corporations** within a Mediterranean-style urban corridor anchored by Miracle Mile, Giralda Plaza, and Merrick Park. This framework transforms fragmented datasets into a dynamic knowledge graph through three coordinated agent pods: **Scraper**, **Validator**, and **Consensus**.

**Target output:** `all_biz_osint.csv` — the definitive business intelligence dataset for zip codes 33134, 33146, 33133, and 33143.

---

## Economic Profile

| Metric | Value |
|--------|-------|
| Estimated Total Businesses | 4,520 |
| Estimated Annual Revenue | $5.8B |
| Estimated Employees | 33,321 |
| Median Household Income | $134,216 |
| Professional Services Share | 23.41% |
| Multinationals On-Site | ~150 |

**Key zones:** Miracle Mile (retail/dining anchor), Giralda Plaza (experiential dining), Shops at Merrick Park (luxury retail), Alhambra Circle & Ponce de Leon Blvd (office corridors).

---

## Data Foundation — Business Tax Receipts

Florida BTR (Business Tax Receipt) records serve as ground truth:
- 5,172 licenses issued (Oct 2020 — Sep 2024)
- 2,409 new businesses in that period
- Professional and medical offices are the primary drivers of commercial occupancy
- 62% of applications are low-impact (professional/medical); 38% require DERM environmental review

Dual-licensing requirement: both City of Coral Gables BTR and Miami-Dade County BTR.

---

## Three-Agent Architecture

### Agent 1 — Scraper (Entity Resolution)

Ingests data from Google Places, Yelp Fusion, OSM, and public directories.

| Field | Mechanism |
|-------|-----------|
| `business_id` | SHA-256 hash of name + lat/lon |
| `contact_stack` | Phone, email, social extraction |
| `classification` | NAICS / SIC cross-reference |
| `operational_hrs` | API fetch + website validation |
| `sentiment_raw` | Review text arrays |

### Agent 2 — Validator (Confidence & Integrity)

Applies heuristic and semantic checks to every record:
- **Heuristic:** Address within target zips, required fields present
- **Semantic:** LLM-based coherence analysis (e.g., does "Fine Dining" align with a $15 avg check?)
- Output: `validation_tier` (Low / Moderate / High) and `validation_confidence` (0.0–1.0)

### Agent 3 — Consensus (Collaborative Arbitrage)

Generates qualitative features (`top_delights`, `top_pain_points`) through multi-agent agreement:

```
R_agreement = count(Agreed) / count(Total) >= 0.6
```

Minimum 5 agents per qualitative data point. Consensus refines raw sentiment into actionable intelligence.

---

## Portable Knowledge Protocol (PKP)

The graph-based schema treating the business community as interconnected **nodes** and **edges**:

### Node Types

| Type | Role | Examples |
|------|------|---------|
| **Infrastructure** | Bedrock entities | Amerant Bank, UM, FPL |
| **Platform** | Aggregators / support | CGCC, BID, franchise systems |
| **Asset** | Independent local businesses | Luca Osteria, boutique law firms |
| **Picks & Shovels** | Technical enablers | OptFirst, digital agencies |

### Edge Types

- **Geographic:** Miracle Mile, Giralda Plaza clusters
- **Event-based:** Taste the Gables participation
- **Institutional:** Chamber Board membership, BID directory

---

## Sector Analysis

### Legal & Financial (Infrastructure Nodes)

11.5M sq ft of prime office space. Boutique firms specializing in international trade, real estate, and immigration law.

| Firm | Specialty | Key Signal |
|------|-----------|------------|
| Barakat + Bossa | Commercial Litigation | Chambers-ranked, high peer standing |
| Cueto Law Group | International & Corporate | High professionalism |
| KKTP Law | Immigration & Civil PI | Elite expertise |

### Banking

| Bank | Category | Watchpoint |
|------|----------|------------|
| Amerant Bank | Commercial/Retail | Account closure disputes |
| City National FL | Private/Commercial | Florida CRE cycles |
| Grove Bank & Trust | Community & Trust | Staff consistency |

### Real Estate & Development

Key developers: Codina Partners, Agave Holdings (The Plaza CG), Terranova Corp (Miracle Mile curation), Allen Morris Co.

### Hospitality & Dining

Giralda Plaza and Miracle Mile create intense competition. Top pain points across the sector: **acoustics** and **wait-time management**.

| Restaurant | Score | Cuisine | Key Pain Point |
|------------|------:|---------|----------------|
| Luca Osteria | 95 | Italian Fine Dining | Reservation bottlenecks |
| Dojo Izakaya | 95 | Japanese | Menu complexity |
| Bulla Gastrobar | 90 | Spanish Tapas | Noise levels |
| Pisco y Nazca | 90 | Peruvian | Chaotic peak volume |

### Wellness & Aesthetics

Premium expansion driven by affluent clientele investing in medical aesthetics and biohacking. Key risk: **workplace culture gaps** (e.g., positive client ratings masking negative staff sentiment).

---

## Market Undercurrents

### Bullish

- "Gables TechTank" positioning (46% of local tech firms cite cybersecurity as essential skill)
- AAA bond ratings + no state income tax = wealth magnet
- Smart City Hub digital exchange initiatives
- UM as anchor infrastructure (talent pipeline, research funding)

### Bearish

- **Commercial rent pressure** on Miracle Mile independents
- **Franchise standardization** threatening Mediterranean character
- Cost of living deterring service-sector workforce

---

## Data Pipeline: `all_biz_osint.csv`

| Step | Action | Sources |
|------|--------|---------|
| 1 | Population baseline | BTR master file (filtered by CG zips) |
| 2 | Chamber enrichment | CGCC membership + BID directory |
| 3 | OSINT augmentation | Google, Yelp, LinkedIn via Agent 1 |
| 4 | Consensus validation | Agent 3 multi-agent agreement |
| 5 | Risk & action generation | PKP risks + recommended actions |

---

## Operating Cadence

| Cadence | Task | Metric |
|---------|------|--------|
| Daily | Real-time traffic monitoring | GA4 key events |
| Weekly | OSINT confidence review | < 10% decay rate |
| Monthly | Budget reallocation | Cost per booking < $50 |
| Quarterly | PKP schema update | v1.x compliance |
