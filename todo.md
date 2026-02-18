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

## Data — Gap Fill to 4,400

- [ ] Run Outscraper free-tier batch (Month 1: +400 expected)
- [ ] Run Outscraper free-tier batch (Month 2: +350 expected)
- [ ] Run Apify $5 credit batch (+600 expected)
- [ ] Run SerpApi enrichment pass (ratings + review counts, 100/month)
- [ ] Final dedup + merge + validation pass
- [ ] Re-run OSM quarterly for new mapper contributions

## Data Quality — Enrichment

- [ ] Run Agent 2 `--enrich` to geocode addresses → lat/lon (~620 rows)
- [ ] Run Agent 2 `--enrich` to reverse geocode lat/lon → addresses (~970 rows)
- [ ] Run Agent 2 `--enrich` to re-categorize 774 "other" businesses
- [ ] Run SerpApi to backfill ratings (94% missing, 100/month free)
- [ ] Resolve 8 red-flagged businesses (review manipulation, billing fraud, etc.)
- [ ] Standardize `neighborhood_area` values across all sources

## PKP Synthesis

- [ ] Run Agent 3 `--action synthesize` on full master CSV
- [ ] Review and refine PKP undercurrents for Coral Gables specifics
- [ ] Add multi-source consensus scoring (when 2+ sources agree on a field)

## Dashboard

- [ ] Sync `dashboard/public/data/` with latest master CSV (Agent 3 export)
- [ ] Add map view using lat/lon data
- [ ] Build export functionality (CSV, PDF reports)
- [ ] Add PKP visualization (node type distribution, edge network)

## Documentation

- [x] Update `README.md` with current agent status and pipeline architecture
- [x] Write `howto.md` with API key signup and pipeline guide
- [ ] Update `OSINT PIPELINE.md` counts after each gap-fill run
