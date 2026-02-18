# Coral Gables OSINT — Business Intelligence Database

> An open-source intelligence pipeline mapping the entire Coral Gables business ecosystem. Chamber members, non-members, and everything in between.

---

## What This Is

A structured OSINT database and agent-based pipeline for collecting, validating, and synthesizing business data across **Coral Gables, FL** (zip codes 33134, 33146, 33133, 33143). The goal: build the most complete picture of the local business ecosystem at zero cost, using stacked free-tier APIs and multi-agent validation.

**Current state:** 1,665 unique businesses (deduped across all sources), against a target of ~4,400 active entities.

---

## Project Structure

```
Terminal/
|
|-- data/                          # CSV datasets (raw + processed)
|   |-- master_all_businesses.csv  # <-- MASTER: 1,665 deduped businesses
|   |-- 1. cgcc-osint-v1.csv       # CGCC enriched v1 (858 rows)
|   |-- 2. cgcc-osint-v2.csv       # CGCC + OSM merged v2 (1,475 rows)
|   |-- 3. final-osint.csv         # Cleaned final run (1,128 rows)
|   |-- 4. non-cgcc-biz-run1.csv   # Non-chamber businesses run 1 (63)
|   |-- 5. non-cgcc-biz-run2.csv   # Non-chamber businesses run 2 (67)
|   |-- 6. ten-chunk-business.csv  # 10-chunk OSM pipeline (1,366 rows)
|
|-- scripts/                       # Python agent scripts
|   |-- 1. agent1-osint.py         # Agent 1: Discovery / Scraper
|   |-- 2. agent2-validator.py     # Agent 2: Normalization / Validation
|   |-- 3. agent3-synthesizer.py   # Agent 3: Export / Synthesis
|   |-- 4. chunkedscraper.py       # Monthly chunked scraper (legacy)
|   |-- 5. ten-chunk-script.py     # 10-chunk OSM Overpass pipeline (legacy)
|
|-- staging/                       # Agent 1 output → Agent 2 input
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
|-- todo.md                        # Project task tracker
```

---

## Master CSV — `data/master_all_businesses.csv`

**1,665 unique businesses** consolidated from 9 source files, deduplicated by normalized business name.

### Coverage Breakdown

| Metric | Count |
|--------|------:|
| **Total unique businesses** | 1,665 |
| Chamber members | 883 |
| Non-members | 782 |
| **Target** | ~4,400 |
| **Gap remaining** | ~2,735 |

### Field Completeness

| Field | Fill Rate | Notes |
|-------|----------:|-------|
| business_name | 100% | Always present |
| chamber_member | 100% | Y/N flag |
| category_primary | ~100% | 774 still "other" |
| phone | 68% | |
| website | 67% | |
| contact_name | 51% | |
| lat / lon | 42% | |
| address | 37% | |
| rating_primary_value | 6% | Major gap |
| top_delights / top_pain_points | 3% | Major gap |

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

### Agent 1 — Discovery Scraper (`scripts/1. agent1-osint.py`)

**Role:** Collects raw business records from multiple sources and writes them to staging CSVs.

**Status: Production-ready.** Four source adapters fully implemented:

| Source | Method | Cost | Expected Yield |
|--------|--------|------|---------------:|
| **Outscraper** | Google Maps API | 500 free/month | +400-500/run |
| **Apify** | Google Places actor | $5 free credit | +600-700 |
| **SerpApi** | Google Maps local results | 100 free/month | Enrichment only |
| **OSM Overpass** | OpenStreetMap queries | Unlimited, free | +800 |

Features: chunked query matrices by category (food, professional, services), free-tier stacking, staging CSV output with common field format.

```bash
python "scripts/1. agent1-osint.py" --source osm
python "scripts/1. agent1-osint.py" --source outscraper --run 1
python "scripts/1. agent1-osint.py" --source apify
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv
```

### Agent 2 — Validator & Merger (`scripts/2. agent2-validator.py`)

**Role:** Normalizes raw staging CSVs to canonical schema, deduplicates against master, validates fields, and writes updated master.

**Status: Production-ready.** Full pipeline implemented:

- **Normalization:** Phone formatting, coordinate parsing, category mapping (50+ keyword rules), zip/neighborhood inference from coordinates
- **Fuzzy dedup:** Two-pass — exact normalized-key match, then fuzzywuzzy ratio >= 85
- **Geo-validation:** Coral Gables bounding box check, zip centroid inference via haversine
- **Validation scoring:** Tiered confidence (High/Moderate/Low) based on field completeness, geo bounds, contact info, rating sanity
- **Merge logic:** Fill blanks on existing records, append truly new ones, archive processed staging files

```bash
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --dry-run
```

### Agent 3 — Synthesizer & Exporter (`scripts/3. agent3-synthesizer.py`)

**Role:** Exports master CSV for dashboard and downstream consumers.

**Status: Partial.** Export, stats, and schema validation are implemented. PKP synthesis and multi-source consensus scoring are not yet built.

- `--action export` — Copy master to `dashboard/public/data/` (full + lite versions)
- `--action stats` — Print coverage stats, category breakdown, field completeness
- `--action schema` — Validate master CSV against canonical 27-field schema

```bash
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats
```

**Remaining:** PKP synthesis (delights/pain points extraction, multi-agent consensus scoring).

---

## Data Collection Strategy

### Phase 1 — Baseline (Complete)

| Source | Records | Status |
|--------|--------:|--------|
| CGCC Member Directory | 836 | Done |
| OSM Overpass (10 chunks) | 811 | Done |
| Non-Chamber Scrapes | 131 | Done |
| **Deduped Total** | **1,665** | **Current** |

### Phase 2 — Gap Fill (In Progress)

Monthly free-tier API stacking via Agent 1:

| Tool | Free Tier | Expected Yield |
|------|-----------|---------------:|
| Outscraper | 500/month | +400–500/run |
| Apify | $5 credit | +600–700 |
| SerpApi | 100 searches/month | Enrichment only |
| OSM (re-run) | Unlimited | +100–200 new |
| **Projected Total** | | **~4,300** |

### Phase 3 — Enrichment (Planned)

Backfill missing fields on existing 1,665 records:

| Gap | Strategy |
|-----|----------|
| Ratings (94% missing) | SerpApi batch enrichment |
| Lat/lon (58% missing) | Nominatim geocoding from address |
| Address (63% missing) | Reverse geocoding from lat/lon |
| Categories (774 "other") | Keyword re-mapping + Google Places category |

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
# Install dependencies
pip install requests pandas fuzzywuzzy python-Levenshtein

# Per-source (install only what you use):
pip install outscraper          # for Outscraper
pip install apify-client        # for Apify
pip install google-search-results  # for SerpApi

# Run Agent 1 — collect raw data (OSM is free, no keys needed)
python "scripts/1. agent1-osint.py" --source osm

# Run Agent 2 — normalize, dedup, merge into master
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv

# Run Agent 3 — export to dashboard
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export

# Dashboard
cd dashboard && npm install && npm run dev
```

### Environment Variables

```bash
export OUTSCRAPER_KEY=your_key    # Outscraper API key (500 free/month)
export APIFY_TOKEN=your_token     # Apify API token ($5 free credit)
export SERPAPI_KEY=your_key       # SerpApi key (100 free/month)
```

---

## License

Internal use. Coral Gables OSINT data collected from public sources.
