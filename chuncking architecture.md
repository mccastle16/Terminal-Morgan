# Chunking Architecture — The $0 Path to 4,500+ Businesses

---

## Problem

- ~4,520 active businesses in Coral Gables; ~10,000+ total entities
- Current coverage: 1,476 (33%)
- Paid APIs are expensive (Google Places $200/mo, BTR bulk ~$4,500)
- Need ~3,000 more businesses at zero cost

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

| Phase | Timing | Actions | Expected Net New |
|-------|--------|---------|------------------:|
| 1 | Done | OSM + CGCC + Agent 1 | 1,476 (baseline) |
| 2 | Weeks 2-3 | Outscraper + Apify + Yelp scrape | +1,500-2,500 |
| 3 | Weeks 4-6 | SerpApi + Scrap.io + YP/BBB | +500-1,000 |
| 4 | Week 7+ | Agent 2 validation + Agent 3 consensus | Final 3,500-5,000 |

---

## Dedup Engine

- Fuzzy name match (fuzzywuzzy, ratio > 85)
- Lat/lon proximity (< 50m = same entity)
- Phone number exact match
- Website domain match

## Merge Priority

1. Google Maps (richest: rating, reviews)
2. Yelp (price tier, categories, photos)
3. CGCC (contacts, chamber status)
4. OSM (geo coordinates, addresses)
5. Yellow Pages / BBB (phone, basic info)
