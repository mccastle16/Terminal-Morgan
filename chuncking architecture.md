
# Coral Gables Full-District OSINT â€” Chunking Architecture
# The $0 Path to 4,500+ Businesses

## THE PROBLEM
- Master doc says ~4,520 active businesses, ~10,000+ total entities
- We have 1,476 (33% coverage)  
- Google Places API needs a key ($200/mo free tier, but need credit card)
- BTR bulk data costs ~$4,500
- Yelp API needs auth
- We need the remaining ~3,000 businesses

## THE INSIGHT: CHUNK BY CATEGORY Ã— GEOGRAPHY

Google Maps, Yelp, and every business directory share the same constraint:
they cap results per query (Google: 60, Yelp: 240, Outscraper free: 500).

But they DON'T cap the NUMBER of queries you can make.

So you chunk: (category Ã— zip) Ã— grid_point = thousands of unique queries,
each returning a small batch. Deduplicate at the end.

## THE $0 STACK (all free tiers combined)

| Layer | Tool | Free Tier | What You Get |
|-------|------|-----------|--------------|
| 1 | OpenStreetMap Overpass API | Unlimited | 1,118 geo-tagged businesses (DONE) |
| 2 | Outscraper Free Tier | 500 businesses/month | Google Maps data + ratings + reviews + phones |
| 3 | Apify Free Tier | $5 credit (~700 places) | Google Maps deep scrape + enrichment |
| 4 | SerpApi Free Tier | 100 searches/month | Google Maps local results + place details |
| 5 | Scrap.io Free Trial | 100 leads (7-day) | Google Maps + emails + social media |
| 6 | Nominatim | Unlimited | Reverse geocoding (lat/lon â†’ address/zip) |
| TOTAL | | ~2,400 new records/month | All free, no credit card |

## THE CHUNKING STRATEGY

### Chunk Dimension 1: GEOGRAPHY (4 zip codes Ã— grid points)
```
33134 â†’ 5 grid points (downtown core, densest)
33146 â†’ 4 grid points (UM/Merrick Park)  
33133 â†’ 3 grid points (north boundary)
33143 â†’ 3 grid points (sunset corridor)
= 15 grid points
```

### Chunk Dimension 2: CATEGORY (20 business types)
```
restaurant, cafe, bar, bakery           â†’ food_beverage
lawyer, accountant                       â†’ professional
doctor, dentist, pharmacy                â†’ healthcare  
bank, insurance, financial               â†’ finance
real_estate, store, clothing             â†’ retail/RE
salon, spa, gym                          â†’ personal/wellness
hotel, school, car_dealer                â†’ other commercial
```

### Chunk Dimension 3: TIME (monthly rotation)

Month 1: Outscraper â†’ restaurants + cafes in 33134 (core dining district)
Month 2: Apify â†’ professional services in 33134 + 33146
Month 3: SerpApi â†’ healthcare + finance across all 4 zips
Month 4: Outscraper resets â†’ retail + personal services
...

Each month: ~500 (Outscraper) + ~700 (Apify) + ~100 (SerpApi) + ~100 (Scrap.io) = ~1,400 new records
After 3 months: 1,476 (current) + ~4,200 = ~5,600+ businesses

## THE EVEN FASTER PATH: SEMANTIC WEB SCRAPING

### The Yelp Workaround (no API key needed)
Yelp's public search pages are scrapable:
```
https://www.yelp.com/search?find_desc=restaurants&find_loc=Coral+Gables+FL+33134&start=0
https://www.yelp.com/search?find_desc=restaurants&find_loc=Coral+Gables+FL+33134&start=10
...
```
Each page returns 10 results. Paginate through all results per category Ã— zip.
20 categories Ã— 4 zips Ã— ~24 pages each = ~1,920 requests = ~19,200 unique listings

### The Google Maps Workaround (no API key needed)
Google Maps search URLs are deterministic:
```
https://www.google.com/maps/search/lawyers+in+33134/
https://www.google.com/maps/search/restaurants+in+33146/
```
Headless browser (Playwright/Puppeteer) scrolls to load all results.
~60 results per category Ã— 20 categories Ã— 4 zips = ~4,800 results

### Yellow Pages / BBB / Foursquare
All have public search pages indexed by zip code.
Cross-reference to fill gaps.

## THE RECOMMENDED PIPELINE (3 phases)

### Phase 1: IMMEDIATE (this week, $0)
- âœ… DONE: OSM Overpass â†’ 1,118 businesses with geo
- âœ… DONE: CGCC directory â†’ 834 members with contacts
- âœ… DONE: Agent 1 deep OSINT â†’ 25 validated
- TOTAL: 1,476 (current baseline)

### Phase 2: ENRICHMENT SPRINT (weeks 2-3, $0)
- Outscraper free tier: 500 Google Maps records (restaurants + retail in 33134)
- Apify free tier: 700 records (professional services across all zips)
- Yelp public scrape: ~2,000 records (all categories, all zips)
- Deduplicate against Phase 1 baseline
- EXPECTED NET NEW: ~1,500-2,500

### Phase 3: DEEP FILL (weeks 4-6, $0)
- SerpApi free tier: 100 place detail lookups (highest-priority gaps)
- Scrap.io trial: 100 records with email enrichment
- Yellow Pages / BBB scrape for remaining gaps
- Nominatim reverse geocoding for all records missing addresses
- EXPECTED NET NEW: ~500-1,000

### Phase 4: VALIDATION & CONSENSUS
- Run Agent 2 (validator) across all new records
- Run Agent 3 (consensus) for qualitative fields
- PKP synthesis for full graph
- FINAL EXPECTED: 3,500-5,000 businesses

## THE AUTOMATION ARCHITECTURE

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              CHUNK ORCHESTRATOR              â”‚
â”‚  (Python script, runs weekly on cron)       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                             â”‚
â”‚  for zip in [33134, 33146, 33133, 33143]:   â”‚
â”‚    for category in BUSINESS_TYPES:          â”‚
â”‚      for source in [osm, yelp, outscraper]: â”‚
â”‚        results = scrape(zip, category)      â”‚
â”‚        deduplicate(results, master_db)      â”‚
â”‚        validate(results)                    â”‚
â”‚        append_to_csv(results)               â”‚
â”‚                                             â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  DEDUP ENGINE                               â”‚
â”‚  - Fuzzy name match (fuzzywuzzy, ratio>85)  â”‚
â”‚  - Lat/lon proximity (<50m = same entity)   â”‚
â”‚  - Phone number exact match                 â”‚
â”‚  - Website domain match                     â”‚
â”‚                                             â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  MERGE PRIORITY                             â”‚
â”‚  1. Google Maps (richest: rating, reviews)  â”‚
â”‚  2. Yelp (price tier, categories, photos)   â”‚
â”‚  3. CGCC (contacts, chamber status)         â”‚
â”‚  4. OSM (geo coordinates, addresses)        â”‚
â”‚  5. Yellow Pages / BBB (phone, basic info)  â”‚
â”‚                                             â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## WHY THIS WORKS

The key insight: no single free tier gives you everything,
but FIVE free tiers stacked together give you more than any
single paid API.

OSM gives you geo. Outscraper gives you ratings. Yelp gives you
categories and prices. CGCC gives you contacts. SerpApi gives you
place details. Stack them. Deduplicate. Validate.

That's how you chunk 4,500 businesses for $0.