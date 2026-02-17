# Project TODO

## Pipeline — Agent Implementation

- [x] Wire Agent 1 with real API integrations (Outscraper, Apify, SerpApi, OSM)
- [x] Refactor `scripts/4. chunkedscraper.py` logic into Agent 1 framework
- [x] Implement fuzzy dedup engine in Agent 2 (fuzzywuzzy, threshold=85)
- [x] Add geo-validation and coherence checks to Agent 2 (bounds, zip inference, field scoring)
- [ ] Build PKP synthesis and multi-agent consensus scoring in Agent 3

## Data — Gap Fill to 4,500

- [ ] Run Outscraper free-tier batch (Month 1: +400 expected)
- [ ] Run Outscraper free-tier batch (Month 2: +350 expected)
- [ ] Run Apify $5 credit batch (+600 expected)
- [ ] Run SerpApi enrichment pass (ratings + review counts)
- [ ] Final dedup + merge + validation pass
- [ ] Recategorize 774 "Other / Uncategorized" businesses

## Data Quality

- [ ] Fill missing lat/lon (59% currently missing)
- [ ] Fill missing addresses (69% currently missing)
- [ ] Resolve 8 red-flagged businesses (review manipulation, billing fraud, etc.)
- [ ] Standardize `neighborhood_area` values across all sources

## Dashboard

- [ ] Sync `dashboard/public/data/` with latest master CSV
- [ ] Add map view using lat/lon data
- [ ] Build export functionality (CSV, PDF reports)

## Documentation

- [ ] Update `OSINT PIPELINE.md` counts after each gap-fill run
- [ ] Document API key setup and rate-limit strategy
