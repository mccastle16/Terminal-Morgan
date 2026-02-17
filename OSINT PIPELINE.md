# OSINT Pipeline — Execution Summary

> 6-run chunked pipeline producing a unified **1,333-business master CSV** at $0 cost.

---

## Pipeline Results

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
| | **Agent 1 Deep OSINT** | Enrichment | **25** |
| | **Final Merged (deduped)** | | **1,333** |

---

## Growth Projection — $0 to 4,500+

Monthly free-tier API stacking to close the gap from 1,333 to the ~4,520 target:

| Run | Month | Tool | Free Tier | Expected Net New |
|-----|-------|------|-----------|------------------:|
| 1 | Mar | Outscraper | 500/mo | +400 |
| 2 | Apr | Outscraper | 500/mo | +350 |
| 3 | May | Apify | $5 credit (~700) | +600 |
| 4 | Jun | Outscraper | 500/mo | +300 |
| 5 | Jul | SerpApi | 100 searches/mo | +0 (enrichment) |
| 6 | Aug | Local merge | — | Dedup + Validation |
| | **Projected Total** | | | **~4,316** |

---

## Current Data Coverage

| Metric | Count | % |
|--------|------:|--:|
| **Total Businesses** | 1,333 | — |
| Chamber Members | 835 | 63% |
| Non-Members (OSM) | 498 | 37% |
| Has Lat/Lon | 544 | 41% |
| Has Phone | 1,013 | 76% |
| Has Website | 974 | 73% |
| Has Address | 416 | 31% |
| Red Flags | 8 | — |

---

## Production Script

```bash
export OUTSCRAPER_KEY=your_key_here
export APIFY_TOKEN=your_token_here
export SERPAPI_KEY=your_key_here

python cg_chunked_scraper.py --run 1  # Outscraper — restaurants + retail
python cg_chunked_scraper.py --run 2  # Outscraper — professional + healthcare
python cg_chunked_scraper.py --run 3  # Apify — all categories gap fill
python cg_chunked_scraper.py --run 4  # Outscraper — hospitality + wellness
python cg_chunked_scraper.py --run 5  # SerpApi — rating enrichment
python cg_chunked_scraper.py --run 6  # Final dedup + merge + validation
```

Each run writes to `staging/`. Run 6 performs fuzzy dedup (fuzzywuzzy ratio > 85), merges into the master CSV, and archives staging data.

---

## Core Insight

Every business API caps **results per query**, not **queries per account**. The strategy: generate hundreds of narrow `(category x zip)` combinations, each returning a small batch, then deduplicate at merge time. Five free tiers stacked together outperform any single paid API.
