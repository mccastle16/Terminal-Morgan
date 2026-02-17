# Coral Gables OSINT — Business Intelligence Database

> An open-source intelligence pipeline mapping the entire Coral Gables business ecosystem. Chamber members, non-members, and everything in between.

---

## What This Is

A structured OSINT database and agent-based pipeline for collecting, validating, and synthesizing business data across **Coral Gables, FL** (zip codes 33134, 33146, 33133, 33143). The goal: build the most complete picture of the local business ecosystem at zero cost, using stacked free-tier APIs and multi-agent validation.

**Current state:** 1,689 unique businesses (deduped across all sources), against a target of ~4,520 active entities.

---

## Project Structure

```
Terminal/
|
|-- data/                          # CSV datasets (raw + processed)
|   |-- master_all_businesses.csv  # <-- MASTER: 1,689 deduped businesses
|   |-- 1. cgcc-osint-v1.csv       # CGCC enriched v1 (858 rows)
|   |-- 2. cgcc-osint-v2.csv       # CGCC + OSM merged v2 (1,475 rows)
|   |-- 3. final-osint.csv         # Cleaned final run (1,128 rows)
|   |-- 4. non-cgcc-biz-run1.csv   # Non-chamber businesses run 1 (63)
|   |-- 5. non-cgcc-biz-run2.csv   # Non-chamber businesses run 2 (67)
|   |-- 6. ten-chunk-business.csv  # 10-chunk OSM pipeline (1,366 rows)
|
|-- documents/                     # Non-CSV reference documents
|   |-- osint-full-schema.md       # 27-field schema reference (was 3. osint-full.csv)
|
|-- scripts/                       # Python agent scripts
|   |-- 1. agent1-osint.py         # Agent 1: Discovery / Scraper
|   |-- 2. agent2-validator.py     # Agent 2: Normalization / Validation
|   |-- 3. agent3-synthesizer.py   # Agent 3: CSV Output / Synthesis
|   |-- 4. chunkedscraper.py       # Monthly chunked scraper (production)
|   |-- 5. ten-chunk-script.py     # 10-chunk OSM Overpass pipeline
|
|-- agent-schemas/                 # Agent documentation + schema
|   |-- agent1-schema.md           # Agent 1 CSV header spec
|   |-- agent2-validator.md        # Validation report (25 businesses)
|   |-- agent3-synthesis.md        # PKP synthesis (25 businesses)
|   |-- agents1-3_schema.csv       # Full schema definition
|
|-- dashboard/                     # React/Vite frontend (visualization)
|   |-- src/pages/                 # 15+ specialized views
|   |-- public/data/               # Dashboard data feed
|
|-- CGCC-members.md                # Raw CGCC member directory (~836 members)
|-- coralgables-osint.md           # Strategic intelligence framework
|-- OSINT PIPELINE.md              # Pipeline execution summary
|-- chuncking architecture.md      # $0 chunking strategy
|-- final-output-schema.md         # Output CSV schema spec
|-- Coral Gables Directory.md      # Non-member category expansion
|-- Strategy for Incremental Gap-Fill Scrape.md
```

---

## Master CSV — `data/master_all_businesses.csv`

**1,689 unique businesses** consolidated from 9 source files, deduplicated by normalized business name.

### Coverage Breakdown

| Metric | Count |
|--------|------:|
| **Total unique businesses** | 1,689 |
| Chamber members | 883 |
| Non-members | 806 |

### Top Categories

| Category | Count |
|----------|------:|
| Other / Uncategorized | 774 |
| Food & Beverage | 224 |
| Retail | 174 |
| Accounting | 84 |
| Healthcare | 60 |
| Hospitality | 57 |
| Professional Services | 41 |
| Education | 38 |
| Nonprofit | 34 |
| Legal | 31 |
| Real Estate | 28 |
| Insurance | 25 |
| Wellness | 22 |

### Schema

See [final-output-schema.md](./final-output-schema.md) for the full 27-field specification. Key fields:

- **Identity:** `business_id`, `business_name`, `contact_name`, `phone`, `website`
- **Location:** `address`, `lat`, `lon`, `postcode`, `neighborhood_area`
- **Classification:** `category_primary`, `category_secondary`, `price_tier`
- **OSINT:** `rating_primary_value`, `top_delights`, `top_pain_points`, `osint_confidence`
- **Validation:** `validation_tier`, `red_flag_present`, `red_flag_severity`
- **Meta:** `chamber_member`, `source_file`, `batch_id`

---

## Three-Agent Pipeline

### Agent 1 — Discovery (`scripts/1. agent1-osint.py`)

**Role:** Entity resolution and data ingestion. Takes a query, hits multiple sources (web, APIs, databases), returns raw heterogeneous records.

**Current implementation:** Scaffold with config, query interface, and metadata structure. Core collection logic (API calls, scraping) is stubbed with `TODO` placeholders.

### Agent 2 — Validation (`scripts/2. agent2-validator.py`)

**Role:** Normalizes Agent 1's raw output into canonical schema fields. Maps inconsistent field names, applies enrichment (geocoding, NAICS mapping).

**Current implementation:** Working normalization with field mapping for 10 canonical columns. Enrichment hooks are stubbed.

### Agent 3 — Synthesis (`scripts/3. agent3-synthesizer.py`)

**Role:** Persists normalized records to CSV. Infers headers from data, writes to configurable output directory.

**Current implementation:** Fully functional CSV writer with auto-header inference and configurable output paths.

### Agent Analysis — Are They Meeting the Need?

**Short answer: the architecture is sound, but the agents are scaffolds, not production scrapers.**

The actual data collection has been done through two separate mechanisms:

1. **Manual/semi-automated runs** documented in the `.md` files and the `non-cgcc-biz` CSVs
2. **The 10-chunk Overpass script** (`scripts/5. ten-chunk-script.py`) which is the only fully implemented scraper — it pulled 811 businesses from OpenStreetMap

The three agent scripts (`agent1`, `agent2`, `agent3`) define the correct pipeline architecture:
- Agent 1 discovers and collects raw data
- Agent 2 normalizes and validates
- Agent 3 outputs to CSV

But their core logic remains `TODO`. The real scraping work has been done by the chunked scripts and manual collection. To close the gap to 4,520 businesses, the agents need:

- **Agent 1:** Actual API integrations (Outscraper, Apify, SerpApi) — currently only defined in `scripts/4. chunkedscraper.py`
- **Agent 2:** Fuzzy dedup engine, geo-validation, LLM-based coherence checks — described in `agent-schemas/agent2-validator.md` but not coded
- **Agent 3:** PKP synthesis, multi-agent consensus scoring — described in `agent-schemas/agent3-synthesis.md` but not coded

The production scraper (`scripts/4. chunkedscraper.py`) contains the real implementation of what Agent 1 + Agent 2 should do. The path forward is to refactor that script's logic into the agent framework.

---

## Data Collection Strategy

### Phase 1 — Baseline (Complete)

| Source | Records | Status |
|--------|--------:|--------|
| CGCC Member Directory | 836 | Done |
| OSM Overpass (10 chunks) | 811 | Done |
| Non-Chamber Scrapes | 131 | Done |
| **Deduped Total** | **1,689** | **Current** |

### Phase 2 — Gap Fill (Planned)

Monthly free-tier API stacking using `scripts/4. chunkedscraper.py`:

| Tool | Free Tier | Expected Yield |
|------|-----------|---------------:|
| Outscraper | 500/month | +400–500/run |
| Apify | $5 credit | +600–700 |
| SerpApi | 100 searches/month | Enrichment only |
| **Projected Total** | | **~4,300** |

See [chuncking architecture.md](./chuncking%20architecture.md) and [OSINT PIPELINE.md](./OSINT%20PIPELINE.md) for full details.

---

## Dashboard

A React/Vite application in `dashboard/` with 15+ pages for exploring the business data:

- **Browse / Discover** — Search and filter businesses
- **Business Explorer** — Detailed profiles with OSINT data
- **Analytics** — Category and geographic breakdowns
- **Risk Radar** — Red flag monitoring
- **Market Intel** — Sector analysis and undercurrents
- **Ecosystem** — PKP node/edge visualization
- **Compare** — Side-by-side business comparison

Tech stack: React, Vite, Tailwind CSS, client-side CSV parsing.

---

## Portability

This framework is designed to be **domain-agnostic**. The same agent pipeline, chunking strategy, and PKP schema can be applied to any municipality or business district:

1. Replace zip codes and geographic bounds
2. Adjust category taxonomy
3. Point the scraper at local directories
4. Run the same three-agent pipeline

The Portable Knowledge Protocol (PKP) treats every business as a graph node with 7 structured keys: Node, Edges, Picks/Shovels, Undercurrents, Signals, Risks, and Actions.

---

## Getting Started

```bash
# Install dependencies for the scraper pipeline
pip install requests pandas beautifulsoup4 fuzzywuzzy python-Levenshtein

# Run the 10-chunk OSM scraper (free, no API keys needed)
python scripts/5.\ ten-chunk-script.py

# For paid API enrichment (set keys first)
export OUTSCRAPER_KEY=your_key
export APIFY_TOKEN=your_token
export SERPAPI_KEY=your_key
python scripts/4.\ chunkedscraper.py --run 1

# Dashboard
cd dashboard && npm install && npm run dev
```

---

## License

Internal use. Coral Gables OSINT data collected from public sources.
