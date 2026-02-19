# Project TODO

## Pipeline — Agent Implementation

- [x] Wire Agent 1 with real API integrations (Outscraper, Apify, SerpApi, OSM)
- [x] Refactor `scripts/4. chunkedscraper.py` logic into Agent 1 framework
- [x] Implement fuzzy dedup engine in Agent 2 (fuzzywuzzy, threshold=85)
- [x] Add geo-validation and coherence checks to Agent 2 (bounds, zip inference, field scoring)
- [x] Build Agent 0 orchestrator for concurrent multi-source pipeline execution
- [x] Add `--enrich` mode to Agent 2 (geocoding, reverse geocoding, category re-mapping)
- [x] Build PKP synthesis in Agent 3 (`--action synthesize`)
- [x] Write `howto.md` — step-by-step API key acquisition + pipeline guide

## Pipeline — Optimization (Feb 19, 2026)

- [x] Delete dead scripts 4 (chunkedscraper) and 5 (ten-chunk-script) — ~1,000 lines removed
- [x] Extract shared constants + utilities into `scripts/_shared.py` (CANONICAL_FIELDS, geo, normalize_key/phone, haversine, etc.)
- [x] Pre-compute key→index dict in `merge_into_master()` — O(1) lookups instead of O(n) `.apply()` scans
- [x] Vectorize `sanitize_master()` — replace iterrows loops with pandas vectorized ops (now 11 steps: +bare-domain URL fix, +person-name clearing, +price_tier normalization)
- [x] Switch `fuzzy_match()` to `process.extractOne()` with `score_cutoff` for faster dedup
- [x] Convert Agent 0 from subprocess.run to direct function imports (importlib + ThreadPoolExecutor)

## Data — Gap Fill to 4,400

- [x] Run OSM + Outscraper (x3) + SerpApi enrichment — Month 1 (Feb 2026): +1,219 new → 2,884 total
- [x] Run Agent 2 merge (3,384 staging records → 1,219 new + 2,165 enriched)
- [x] Run SerpApi enrichment pass — 1,568 queried, 1,446 matched (92.2%)
- [ ] Run Outscraper free-tier batch (Month 2: +400-600 expected)
- [ ] Run Apify $5 credit batch (+600-700 expected)
- [ ] Run Outscraper free-tier batch (Month 3: +300-400 expected)
- [ ] Re-run OSM quarterly for new mapper contributions
- [ ] Final dedup + merge + validation pass at ~4,400

## Data Quality — Enrichment

- [x] Run SerpApi to backfill ratings (was 6% → now 88%)
- [ ] Run Agent 2 `--enrich` to forward geocode addresses → lat/lon (~697 rows)
- [ ] Run Agent 2 `--enrich` to reverse geocode lat/lon → addresses
- [ ] Run Agent 2 `--enrich` to re-categorize remaining 691 "other" businesses
- [ ] Resolve 10 red-flagged businesses
- [ ] Standardize `category_primary` casing inconsistencies (e.g., "Consulting" vs "consulting")

## PKP Synthesis

- [x] Run Agent 3 `--action synthesize` on full master CSV (2,884 records)
- [x] Exported to dashboard: union_all_businesses.csv + businesses_lite.csv
- [ ] Review and refine PKP undercurrents for Coral Gables specifics
- [ ] Add multi-source consensus scoring (when 2+ sources agree on a field)

## Dashboard

- [x] Sync `dashboard/public/data/` with latest master CSV (Agent 3 export)
- [ ] Add map view using lat/lon data
- [ ] Build export functionality (CSV, PDF reports)
- [ ] Add PKP visualization (node type distribution, edge network)

## Documentation

- [x] Update `README.md` with current agent status and pipeline architecture
- [x] Write `howto.md` with API key signup and pipeline guide
- [x] Update `OSINT PIPELINE.md` counts after Month 1 gap-fill run
- [x] Update all .md files with 2,884-record post-merge stats (Feb 19, 2026)
- [x] Update all .md files to reflect optimization refactor (dead script deletion, _shared.py, vectorization, direct imports)
