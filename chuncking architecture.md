# Chunking Architecture — The $0 Path to 4,500+ Businesses

---

## Problem

- ~4,520 active businesses in Coral Gables; ~10,000+ total entities
- Current coverage: **2,884 (64%)** — up from 1,476 baseline after Month 1 gap-fill
- Paid APIs are expensive (Google Places $200/mo, BTR bulk ~$4,500)
- Need ~1,500 more businesses at near-zero cost

---

## Core Insight

APIs cap **results per query**, not **queries per account**. Chunk by `(category x zip x grid_point)` to generate thousands of unique queries, each returning a small batch. Deduplicate at merge time.

---

## The $0 Stack

| Layer | Tool | Free Tier | Yields |
|-------|------|-----------|--------|
| 1 | OSM Overpass | Unlimited | 1,118 geo-tagged businesses |
| 2 | Outscraper | 500/month | Google Maps + ratings + reviews |
| 3 | Apify | $5 credit (~700) | Deep scrape + enrichment |
| 4 | SerpApi | 100 searches/month | Place details + freshness |
| 5 | Scrap.io | 100 leads (7-day trial) | Emails + social media |
| 6 | Nominatim | Unlimited | Reverse geocoding |
| **Total** | | **~2,400 new/month** | **All free, no credit card** |

---

## Chunking Dimensions

**Geography** — 4 zip codes, 15 grid points:
- `33134` — 5 points (downtown core, densest)
- `33146` — 4 points (UM / Merrick Park)
- `33133` — 3 points (north boundary)
- `33143` — 3 points (Sunset corridor)

**Category** — 20 business types:
- Food & Beverage: restaurant, cafe, bar, bakery
- Professional: lawyer, accountant
- Healthcare: doctor, dentist, pharmacy
- Finance: bank, insurance, financial
- Retail / RE: real_estate, store, clothing
- Personal / Wellness: salon, spa, gym
- Other: hotel, school, car_dealer

**Time** — Monthly rotation across free-tier resets.

---

## Pipeline Phases

| Phase | Timing | Actions | Net New |
|-------|--------|---------|------------------:|
| 1 | Done | OSM + CGCC + Agent 1 | 1,665 (baseline) |
| 2 | Done (Feb 2026) | OSM + Outscraper (x3) + SerpApi | **+1,219 → 2,884** |
| 3 | Month 2-3 | Outscraper + Apify + SerpApi | +600-1,000 |
| 4 | Month 4-5 | Outscraper + OSM re-run + final sweep | +300-500 → **~4,400** |

---

## Dedup Engine (Agent 2)

- Pre-computed key→index dict for O(1) exact-match lookups (normalized name key)
- Fuzzy name match via `process.extractOne()` (fuzzywuzzy, score_cutoff=85)
- Lat/lon proximity (< 50m = same entity)
- Phone number exact match
- Website domain match

All sanitization is fully vectorized (pandas ops, no iterrows loops) — 11 steps: junk removal, coordinate bounds, category normalization, source casing, phone→website rescue, rating/review validation, invalid website clearing, bare-domain URL fix, person-name clearing from `category_secondary`, and `price_tier` normalization. Shared constants and utilities live in `scripts/_shared.py`.

## Merge Priority

1. Google Maps (richest: rating, reviews)
2. Yelp (price tier, categories, photos)
3. CGCC (contacts, chamber status)
4. OSM (geo coordinates, addresses)
5. Yellow Pages / BBB (phone, basic info)
