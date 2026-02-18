# OSINT Pipeline — Execution Summary

> Four-agent pipeline producing a unified **1,665-business master CSV** at $0 cost, targeting ~4,400.

---

## Pipeline Results — Phase 1 (Baseline)

| Run | Target | Source | Records |
|-----|--------|--------|--------:|
| 1a | Restaurants | OSM Overpass | 197 |
| 1b | Cafes / Bars / Bakeries | OSM Overpass | 36 |
| 1c | Food Retail | OSM Overpass | 45 |
| 2 | Professional + Finance + Legal | OSM Overpass | 97 |
| 3 | Healthcare | OSM Overpass | 63 |
| 4 | Education + Nonprofit + Religious | OSM Overpass | 210 |
| 5 | Hospitality + Leisure + Auto | OSM Overpass | 59 |
| 6a | Clothing / Jewelry | OSM Overpass | 21 |
| 6b | Beauty / Electronics / Home | OSM Overpass | 58 |
| 6c | Entertainment / Craft | OSM Overpass | 25 |
| | **OSM Total (deduped)** | | **811** |
| | **CGCC Members** | Directory parse | **836** |
| | **Non-chamber scrapes** | Manual + semi-auto | **131** |
| | **Final Merged (deduped)** | | **1,665** |

---

## Growth Projection — $0 to 4,400+

Monthly free-tier API stacking via Agent 0 orchestrator:

| Run | Month | Tool | Free Tier | Expected Net New | Running Total |
|-----|-------|------|-----------|------------------:|--------------:|
| — | Current | Baseline | — | — | 1,665 |
| 1 | Month 1 | Outscraper + Apify + OSM | 500/mo + $5 + free | +1,200 | ~2,865 |
| 2 | Month 2 | Outscraper + SerpApi enrich | 500/mo + 100/mo | +400 | ~3,265 |
| 3 | Month 3 | Outscraper + SerpApi enrich | 500/mo + 100/mo | +350 | ~3,615 |
| 4 | Month 4 | Outscraper + SerpApi enrich | 500/mo + 100/mo | +300 | ~3,915 |
| 5 | Month 5 | Outscraper + SerpApi enrich | 500/mo + 100/mo | +250 | ~4,165 |
| 6 | Month 6 | Outscraper + final sweep | 500/mo | +200 | **~4,365** |

---

## Current Data Coverage

| Metric | Count | % |
|--------|------:|--:|
| **Total Businesses** | 1,665 | — |
| Chamber Members | 883 | 53% |
| Non-Members | 782 | 47% |
| Has Lat/Lon | ~694 | 42% |
| Has Phone | ~1,133 | 68% |
| Has Website | ~1,112 | 67% |
| Has Address | ~621 | 37% |
| Has Rating | ~97 | 6% |
| Category = "other" | 774 | 46% |
| Red Flags | 8 | — |

---

## Production Commands

```bash
# Set API keys
export OUTSCRAPER_KEY=your_key_here
export APIFY_TOKEN=your_token_here
export SERPAPI_KEY=your_key_here

# Run full pipeline concurrently (Agent 0 → Agent 1 × N → Agent 2 → Agent 3)
python "scripts/0. orchestrator.py" --all

# Run individual sources
python "scripts/1. agent1-osint.py" --source osm
python "scripts/1. agent1-osint.py" --source outscraper --run 1
python "scripts/1. agent1-osint.py" --source apify
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv

# Validate and merge staging into master
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv

# Enrich existing data (geocoding, categories)
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich

# PKP synthesis + export to dashboard
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
```

---

## Four-Agent Architecture

```
Agent 0 (Orchestrator) — Concurrent pipeline runner
  ├── Agent 1 (OSM)        ─┐
  ├── Agent 1 (Outscraper)  ├── staging/*.csv
  ├── Agent 1 (Apify)       │
  └── Agent 1 (SerpApi)    ─┘
           │
           ▼
Agent 2 (Validator) — Normalize → Fuzzy dedup → Validate → Merge
Agent 2 (Enrichment) — Geocode → Reverse geocode → Re-categorize
           │
           ▼
Agent 3 (Synthesizer) — PKP synthesis → Export → Stats
```

---

## Core Insight

Every business API caps **results per query**, not **queries per account**. The strategy: generate hundreds of narrow `(category × zip)` combinations, each returning a small batch, then deduplicate at merge time. Five free tiers stacked together outperform any single paid API.

See [howto.md](./howto.md) for the full step-by-step guide.
