# OSINT Pipeline — Execution Summary

> Four-agent pipeline producing a unified **2,884-business master CSV** at near-$0 cost, targeting ~4,400.

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
| | **Phase 1 Merged (deduped)** | | **1,665** |

---

## Pipeline Results — Phase 2, Month 1 (Feb 2026)

| Run | Source | Raw Records | Net Result |
|-----|--------|------------:|-----------:|
| OSM Overpass | 10-chunk geographic sweep | 562 | merged |
| Outscraper Run 1 | Food & retail categories | 380 | merged |
| Outscraper Run 2 | Professional & healthcare | 491 | merged |
| Outscraper Run 3 | Hospitality & services | 433 | merged |
| SerpApi | Ratings backfill (1,568 queried) | 1,446 matched | enrichment |
| | **Agent 2 Merge Result** | | **+1,219 new, 2,165 enriched** |
| | **Running Total** | | **2,884** |

---

## Growth Projection — to 4,400+

| Run | Month | Tool | Free Tier | Actual/Expected Net New | Running Total |
|-----|-------|------|-----------|------------------------:|--------------:|
| — | Baseline | Phase 1 | — | — | 1,665 |
| 1 | Month 1 (Feb) | OSM + Outscraper (x3) + SerpApi | free + 500/mo + 5,000/mo | **+1,219** | **2,884** |
| 2 | Month 2 (Mar) | Outscraper (x3) + Apify + SerpApi | 500/mo + $5 + 5,000/mo | +600-800 | ~3,500-3,700 |
| 3 | Month 3 (Apr) | Outscraper (x3) + SerpApi | 500/mo + 5,000/mo | +300-400 | ~3,900 |
| 4 | Month 4 (May) | Outscraper (x3) + OSM re-run | 500/mo + free | +200-300 | ~4,200 |
| 5 | Month 5 (Jun) | Outscraper (final sweep) | 500/mo | +100-200 | **~4,400** |

---

## Current Data Coverage (as of Feb 19, 2026)

| Metric | Count | % |
|--------|------:|--:|
| **Total Businesses** | 2,884 | — |
| Chamber Members | 843 | 29% |
| Non-Members | 2,041 | 71% |
| Has Phone | 2,627 | 91% |
| Has Rating | 2,533 | 88% |
| Has Neighborhood | 2,793 | 97% |
| Has Lat/Lon | 2,022 | 70% |
| Has Postcode | 2,022 | 70% |
| Has Website | 1,522 | 53% |
| Has Address | 1,514 | 52% |
| Category = "other" | 691 | 24% |
| Red Flags | 10 | — |

### Validation Tiers

| Tier | Count |
|------|------:|
| High | 1,185 |
| Moderate | 1,319 |
| Low | 368 |
| Unvalidated | 12 |

### PKP Node Types

| Type | Count | % |
|------|------:|--:|
| Asset | 1,690 | 58.6% |
| Platform | 702 | 24.3% |
| Infrastructure | 492 | 17.1% |

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
