# Coral Gables OSINT — Business Intelligence Database

> An open-source intelligence pipeline mapping the entire Coral Gables business ecosystem. Chamber members, non-members, and everything in between.

---

## What This Is

A structured OSINT database and agent-based pipeline for collecting, validating, and synthesizing business data across **Coral Gables, FL** (zip codes 33134, 33146, 33133, 33143). The goal: build the most complete picture of the local business ecosystem at zero cost, using stacked free-tier APIs and multi-agent validation.

**Current state:** 2,884 unique businesses (deduped across all sources), against a target of ~4,400 active entities.

**New here?** See [howto.md](./howto.md) for the step-by-step guide to getting API keys and running the full pipeline.

---

## Project Structure

```
Terminal/
|
|-- data/                          # CSV datasets
|   |-- master_all_businesses.csv  # <-- MASTER: 2,884 deduped businesses
|   |-- leadgen.csv                # <-- LEADGEN: 1,457 enriched + scored sales leads
|
|-- scripts/                       # Python agent scripts
|   |-- _shared.py                 # Shared constants + utilities (schema, geo, normalize)
|   |-- 0. orchestrator.py         # Agent 0: Pipeline runner (direct imports, ThreadPool)
|   |-- 1. agent1-osint.py         # Agent 1: Discovery / Scraper
|   |-- 2. agent2-validator.py     # Agent 2: Normalization / Validation / Enrichment
|   |-- 3. agent3-synthesizer.py   # Agent 3: PKP Synthesis / Export
|   |-- 6. agent6-leadgen-cleaner.py   # Agent 6: Lead Gen Cleaner
|   |-- 7. agent7-lead-enricher.py     # Agent 7: Master DB Enricher
|   |-- 8. agent8-web-enricher.py      # Agent 8: Web API Enricher (SerpApi/Outscraper)
|   |-- 9. agent9-lead-scorer.py       # Agent 9: Lead Scorer (0-100 + A-F grades)
|   |-- 10. agent10-playbook.py        # Agent 10: Action Playbook Generator
|
|-- staging/                       # Agent 1 output → Agent 2 input
|   |-- archived/                  # Source CSVs after merge (OSM, Outscraper, SerpApi runs)
|
|-- dashboard/                     # React/Vite frontend (visualization)
|   |-- src/pages/                 # 15+ specialized views
|   |-- public/data/               # Dashboard data feed
|
|-- howto.md                       # Step-by-step pipeline guide + API key setup
|-- CGCC-members.md                # Raw CGCC member directory (~836 members)
|-- coralgables-osint.md           # Strategic intelligence framework
|-- OSINT PIPELINE.md              # Pipeline execution summary
|-- chuncking architecture.md      # $0 chunking strategy (historical)
|-- final-output-schema.md         # Output CSV schema spec (27 + 7 PKP fields)
|-- Coral Gables Directory.md      # Non-member category expansion
|-- Strategy for Incremental Gap-Fill Scrape.md
|-- todo.md                        # Project task tracker
```

---

## Master CSV — `data/master_all_businesses.csv`

**2,884 unique businesses** consolidated from multiple source runs, deduplicated by normalized business name with fuzzy matching. This is the single source of truth — all legacy intermediate CSVs (v1, v2, non-chamber scrapes, 10-chunk OSM) have been merged in and deleted. Raw source CSVs from each pipeline run are preserved in `staging/archived/`.

### Coverage Breakdown

| Metric | Count |
|--------|------:|
| **Total unique businesses** | 2,884 |
| Chamber members | 843 |
| Non-members | 2,041 |
| **Target** | ~4,400 |
| **Gap remaining** | ~1,516 |

### Field Completeness

| Field | Fill Rate | Notes |
|-------|----------:|-------|
| business_name | 100% | Always present |
| category_primary | 100% | 691 still "other" |
| neighborhood_area | 97% | Inferred from coordinates |
| phone | 91% | |
| rating_primary_value | 88% | Via SerpApi enrichment |
| lat / lon | 70% | |
| postcode | 70% | Inferred from coordinates |
| website | 53% | 856 bare-domain URLs fixed with `https://` prefix |
| address | 52% | |

**Data quality (Feb 19):** 422 person-name contaminations cleared from `category_secondary` (CGCC column misalignment), 17 star-rating values removed from `price_tier` (already captured in `rating_primary_value`).

### Schema

See [final-output-schema.md](./final-output-schema.md) for the full 27-field + 7 PKP field specification. Key fields:

- **Identity:** `business_id`, `business_name`, `contact_name`, `phone`, `website`
- **Location:** `address`, `lat`, `lon`, `postcode`, `neighborhood_area`
- **Classification:** `category_primary`, `category_secondary`, `price_tier`
- **OSINT:** `rating_primary_value`, `top_delights`, `top_pain_points`, `osint_confidence`
- **Validation:** `validation_tier`, `red_flag_present`, `red_flag_severity`
- **PKP:** `pkp_node_type`, `pkp_edges_summary`, `pkp_key_signals`, `pkp_primary_risks`, `pkp_primary_actions`
- **Meta:** `chamber_member`, `source_file`, `batch_id`

---

## Lead Generation Pipeline — `data/leadgen.csv`

A 5-agent pipeline (Agents 6-10) that takes raw marketing platform contact CSVs and transforms them into scored, enriched, sales-ready leads with personalized outreach playbooks.

### Pipeline Flow

```
Raw CSV (1,934 messy contacts)
  → Agent 6: Clean & qualify (drop dead leads, fix emails, categorize)
  → Agent 7: Match against master DB (domain + fuzzy company matching)
  → Agent 8: Web enrichment via SerpApi/Outscraper (phone, address, rating)
  → Agent 9: Score 0-100 + grade A-F (contact quality, business signals, fit)
  → Agent 10: Playbook generation (outreach scripts, talking points, follow-up)
  → 1,457 enriched leads with full playbooks
```

### Results

| Metric | Raw CSV | Final | Fill Rate |
|--------|---------|-------|-----------|
| **Total leads** | 1,934 | 1,457 | (477 dead removed) |
| **Job title** | 479 (25%) | 1,457 | **100%** |
| **Company** | 573 (30%) | 1,341 | **92%** |
| **Phone** | 45 (2%) | 1,021 | **70%** |
| **Business rating** | 0 | 643 | 44% |
| **Business address** | 0 | 787 | 54% |

### Lead Grade Distribution

| Grade | Count | % | Action |
|-------|-------|---|--------|
| **A** | 546 | 37.5% | CALL — sales-ready with full contact info |
| **B** | 263 | 18.1% | EMAIL — solid lead, initiate contact |
| **C** | 140 | 9.6% | NURTURE — drip campaign |
| **D** | 392 | 26.9% | LOW PRIORITY — monitor |
| **F** | 116 | 8.0% | SKIP — insufficient data |

### Enrichment Sources Used

- **SerpApi** (~2,800 searches): Google Maps + Google Search + LinkedIn people search
- **Apify** (~900 searches): Google Search Scraper for LinkedIn profiles + phone numbers
- **Claude Haiku** (~25 calls): Job title inference from company + category
- **Master DB**: Domain matching + fuzzy company name matching (fuzzywuzzy)
- **Direct website scraping**: Phone extraction from company homepages

### Usage

```bash
# Full pipeline (run in order)
python "scripts/6. agent6-leadgen-cleaner.py" --input data/leadgen.csv --output data/leadgen.csv
python "scripts/7. agent7-lead-enricher.py" --leads data/leadgen.csv --master data/master_all_businesses.csv
python "scripts/8. agent8-web-enricher.py" --leads data/leadgen.csv --source serpapi
python "scripts/9. agent9-lead-scorer.py" --leads data/leadgen.csv
python "scripts/10. agent10-playbook.py" --leads data/leadgen.csv
```

---

## OSINT Pipeline (Agents 0-5)

### Agent 0 — Orchestrator (`scripts/0. orchestrator.py`)

**Role:** Runs the full pipeline with concurrent source collection. Imports Agent 1/2/3 modules directly via `importlib` (no subprocess overhead) and runs I/O-bound scrapers in parallel via `ThreadPoolExecutor`.

**Status: Production-ready.**

```bash
# Run everything concurrently
python "scripts/0. orchestrator.py" --all

# Selective sources
python "scripts/0. orchestrator.py" --sources osm,outscraper

# Enrichment only (geocoding, categories)
python "scripts/0. orchestrator.py" --enrich

# Merge existing staging without new collection
python "scripts/0. orchestrator.py" --merge-only
```

### Agent 1 — Discovery Scraper (`scripts/1. agent1-osint.py`)

**Role:** Collects raw business records from multiple sources and writes them to staging CSVs. Includes structured logging, retry logic, and data quality metrics.

**Status: Production-ready.** Five source adapters fully implemented with advanced features:

#### Features
- **Concurrent SerpApi enrichment** (5-10x speedup via `ThreadPoolExecutor`, configurable with `--workers`)
- **Intelligent retry logic** with exponential backoff for transient failures (timeout, connection errors)
- **Structured logging** (JSONL format) to `staging/logs/agent1_YYYYMMDD.jsonl` for debugging and auditing
- **Data quality metrics** computed per scrape showing coordinate %, phone %, website %, rating %, etc.
- **Geographic sector splitting** for OSM (4 quadrants per query to avoid Overpass truncation)
- **Expanded query coverage** across Outscraper (4 runs), Apify (22 categories), and OSM (13 chunks)

#### Sources

| Source | Method | Cost | Query Coverage | Improvements |
|--------|--------|------|-----------------|---|
| **OSM Overpass** | OpenStreetMap | Unlimited, free | 13 category chunks × 4 geographic sectors = 52 queries | Sector splitting avoids result truncation |
| **Outscraper** | Google Maps API | 500 free/month | 4 runs × 20-25 queries = ~93 queries | Increased result limit 25→100, added Run 4 (entertainment/transportation), more specific queries |
| **Apify** | Google Places actor | $5 free credit | 22 categories × 4 zips × up to 100 results = 80 searches | Expanded categories 10→22, increased results per search 30→100 |
| **SerpApi** | Google Maps local + directory | 5,000+/month (Developer) | Enrichment mode + 6 directory queries | Concurrent requests (5-10x faster), 5 targeting modes (missing-rating, website, address, reviews, any-gap), directory discovery |
| **Directory Discovery** | SerpApi search | Included | 6 business directory queries | New source for directory-listed businesses |

#### Usage

```bash
# Single source runs
python "scripts/1. agent1-osint.py" --source outscraper --run 1
python "scripts/1. agent1-osint.py" --source osm
python "scripts/1. agent1-osint.py" --source apify
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --target any-gap --workers 5
python "scripts/1. agent1-osint.py" --source directory

# View logs
cat staging/logs/agent1_$(date +%Y%m%d).jsonl
jq 'select(.event == "metrics")' staging/logs/agent1_*.jsonl  # Quality metrics per run
```

#### Expected Yield (Optimized)

| Source | Records | Notes |
|--------|--------:|-------|
| **OSM Overpass** | 800-1,000 | +40% vs old (sector splitting) |
| **Outscraper** | 1,500-2,000 | +40% vs old (higher limits, Run 4, specific queries) |
| **Apify** | 800-1,000 | +30% vs old (22 categories vs 10) |
| **SerpApi enrichment** | 2,500-3,000 matched | Much faster with concurrent workers |
| **Directory discovery** | 0-100 | Requires HTML follow-up parsing |
| **Total Phase 3+ expected** | **~5,600-7,100** | Before Agent 2 deduplication |

### Agent 2 — Validator & Merger (`scripts/2. agent2-validator.py`)

**Role:** Normalizes raw staging CSVs to canonical schema, deduplicates against master, validates fields, and writes updated master. Also runs enrichment passes on existing data. Sanitization is fully vectorized (pandas ops, 11 steps: junk removal, coordinate bounds, category normalization, source casing, phone→website rescue, rating/review validation, bare-domain URL fix, person-name clearing, price_tier normalization). Merge uses pre-computed key→index dicts for O(1) lookups with blanks-only fill on existing records. Fuzzy matching uses `process.extractOne()`.

**Status: Production-ready.** Two modes:

- **Merge mode** (default): Ingest staging CSVs, normalize, fuzzy dedup, validate, merge into master
- **Enrich mode** (`--enrich`): Backfill existing master rows — forward/reverse geocoding via Nominatim, zip/neighborhood inference, category re-mapping from business name keywords

```bash
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich
```

### Agent 3 — Synthesizer & Exporter (`scripts/3. agent3-synthesizer.py`)

**Role:** Exports master CSV for dashboard, runs PKP synthesis, and reports stats.

**Status: Production-ready.** Four actions:

- `--action export` — Copy master to `dashboard/public/data/` (full + lite versions)
- `--action stats` — Print coverage stats, category breakdown, field completeness
- `--action schema` — Validate master CSV against canonical schema
- `--action synthesize` — Run PKP synthesis (node type, edges, picks/shovels, undercurrents, signals, risks, actions)

```bash
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
```

---

## Data Collection Strategy

### Phase 1 — Baseline (Complete)

| Source | Records | Status |
|--------|--------:|--------|
| CGCC Member Directory | 836 | Done |
| OSM Overpass (10 chunks) | 811 | Done |
| Non-Chamber Scrapes | 131 | Done |
| **Deduped Total** | **1,665** | **Done** |

### Phase 2 — Gap Fill Month 1 (Complete)

Agent 0/1 pipeline run (Feb 2026): OSM + Outscraper (x3) + SerpApi enrichment.

| Tool | Tier | Actual Yield |
|------|------|----------------------:|
| OSM Overpass | Unlimited, free | 562 raw |
| Outscraper | 500 free/month | 1,304 raw across 3 runs |
| SerpApi | 5,000/month (Developer) | 1,446 matched (92.2% match rate) |
| **Agent 2 Merge** | | **+1,219 new, 2,165 enriched** |
| **Running Total** | | **2,884** |

### Phase 3 — Gap Fill Months 2-5 (Next)

Continue monthly free-tier stacking to reach ~4,400:

| Gap | Strategy | Cost |
|-----|----------|------|
| Lat/lon (30% missing) | Forward geocode via Nominatim | Free |
| Address (48% missing) | Reverse geocode via Nominatim | Free |
| Categories (691 "other") | Keyword re-mapping from business name | Free (local) |
| New businesses | Outscraper monthly resets (500/mo) | Free |
| Apify | One-time $5 credit (~600-700 records) | $5 one-time |

### Phase 4 — PKP Synthesis (Complete)

Agent 3 `--action synthesize` run on all 2,884 records. 7 PKP graph fields populated:
- **1,690 asset** / **702 platform** / **492 infrastructure** nodes

See [howto.md](./howto.md) for the full step-by-step guide and monthly cadence.

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

1. Update geographic constants in `scripts/_shared.py` (zips, bounds, centroids, neighborhoods)
2. Adjust category taxonomy and query strings in Agent 1
3. Update PKP synthesis rules in Agent 3
4. Run the same four-agent pipeline

See [howto.md § Adapting to a Different City](./howto.md#adapting-to-a-different-city) for specifics.

---

## Getting Started

```bash
# Install dependencies
pip install requests pandas fuzzywuzzy python-Levenshtein

# Per-source (install only what you use):
pip install outscraper             # for Outscraper (v6+)
pip install apify-client           # for Apify
pip install google-search-results  # for SerpApi
pip install anthropic              # for Claude API (Agent 10 playbooks, title inference)
pip install openai                 # for OpenAI (Agent 4 actions, optional)
```

### Set up API keys

Copy the example `.env` and fill in your keys (see [howto.md](./howto.md) for where to get them):

```bash
cp .env.example .env
# Edit .env with your actual API keys
```

Then **load the keys into your shell**. This step is critical — the Python scripts read keys from environment variables, not from the `.env` file directly.

```bash
# Recommended (works in both bash and zsh):
set -a && source .env && set +a

# Verify keys are loaded:
echo $OUTSCRAPER_KEY
```

> **Why `set -a`?** Running `source .env` alone sets shell variables, but doesn't **export** them. Python's `os.environ.get()` only sees exported variables. The `set -a` flag tells your shell to auto-export every variable set during `source`, and `set +a` turns that behavior back off. This is especially important on macOS where the default shell is zsh.

### Run the pipeline

```bash
# Run the full pipeline concurrently
python "scripts/0. orchestrator.py" --all

# Or just OSM (free, no keys needed)
python "scripts/0. orchestrator.py" --sources osm

# Enrich existing data (geocoding, categories)
python "scripts/0. orchestrator.py" --enrich

# Dashboard
cd dashboard && npm install && npm run dev
```

For the complete walkthrough including API key signup, monthly cadence, and troubleshooting, see **[howto.md](./howto.md)**.

---

## License

Internal use. Coral Gables OSINT data collected from public sources.
