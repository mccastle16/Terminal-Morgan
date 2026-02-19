# Coral Gables OSINT — Strategic Intelligence Framework

> A comprehensive business intelligence platform for the Coral Gables economic ecosystem, powered by the counderscore.com Command Center.

---

## Overview

Coral Gables houses **~4,520 active businesses** and **~150 multinational corporations** within a Mediterranean-style urban corridor anchored by Miracle Mile, Giralda Plaza, and Merrick Park. This framework transforms fragmented datasets into a dynamic knowledge graph through three coordinated agent pods: **Scraper**, **Validator**, and **Consensus**.

**Current output:** `data/master_all_businesses.csv` — **2,884 businesses** (as of Feb 2026), the definitive business intelligence dataset for zip codes 33134, 33146, 33133, and 33143. Targeting ~4,400.

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

## Four-Agent Architecture

All agents share constants and utilities via `scripts/_shared.py` (CANONICAL_FIELDS, geo constants, normalize_key/phone, haversine, infer_zip/neighborhood).

### Agent 0 — Orchestrator (`scripts/0. orchestrator.py`)

Runs the full pipeline end-to-end. Imports Agents 1-3 directly via `importlib` (no subprocess overhead) and runs I/O-bound scrapers concurrently via `ThreadPoolExecutor`.

### Agent 1 — Scraper (Entity Resolution)

Ingests data from OSM Overpass, Outscraper (Google Maps), Apify (Google Places), and SerpApi (enrichment).

| Field | Mechanism |
|-------|-----------|
| `business_id` | Normalized name key (stripped of LLC/Inc/etc.) |
| `contact_stack` | Phone, website extraction |
| `classification` | Raw category from source API |
| `rating / reviews` | Outscraper, Apify, SerpApi |
| `lat / lon` | OSM coordinates, Outscraper/Apify geocoding |

### Agent 2 — Validator (Confidence & Integrity)

Normalizes, deduplicates, validates, and merges staging records into master. Fully vectorized sanitization (pandas ops, no iterrows). Pre-computed key→index dicts for O(1) merge lookups. Fuzzy dedup via `process.extractOne()` (fuzzywuzzy, threshold=85).

- **Merge mode:** Ingest staging → normalize → fuzzy dedup → validate → merge
- **Enrich mode:** Forward/reverse geocoding via Nominatim, zip/neighborhood inference, category re-mapping
- Output: `validation_tier` (Low / Moderate / High) and `osint_confidence` (0.0–1.0)

### Agent 3 — Synthesizer & Exporter

Exports master CSV for dashboard, runs PKP synthesis (node type, edges, picks/shovels, undercurrents, signals, risks, actions), and reports coverage stats.

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

## Data Pipeline: `data/master_all_businesses.csv`

The master CSV is the single source of truth. Legacy intermediate files (v1, v2, non-chamber scrapes, 10-chunk OSM) have been merged in and deleted. Raw source CSVs from each Agent 1 pipeline run are preserved in `staging/archived/`.

| Step | Action | Sources | Status |
|------|--------|---------|--------|
| 1 | Population baseline | CGCC directory + OSM Overpass (10 chunks) | Done (1,665) |
| 2 | Gap-fill Month 1 | OSM + Outscraper (x3) + SerpApi enrichment | Done (+1,219 → 2,884) |
| 3 | Validation & merge | Agent 2 normalize → fuzzy dedup → validate | Done |
| 4 | PKP synthesis | Agent 3 node type, edges, signals, risks, actions | Done |
| 5 | Dashboard export | Agent 3 → dashboard/public/data/ | Done |
| 6 | Ongoing gap-fill | Monthly Outscraper + Apify + OSM re-runs | In progress |

---

## Operating Cadence

| Cadence | Task | Metric |
|---------|------|--------|
| Daily | Real-time traffic monitoring | GA4 key events |
| Weekly | OSINT confidence review | < 10% decay rate |
| Monthly | Budget reallocation | Cost per booking < $50 |
| Quarterly | PKP schema update | v1.x compliance |
