# Strategy — Incremental Gap-Fill Scrape

> Close the gap between the current 1,366-business baseline and the ~4,520 target by only adding what's missing.

---

## Approach

1. Load existing 1,366 records as a **deduplication filter**
2. Run Google Maps searches (via Outscraper or similar) for Coral Gables ZIPs
3. Fuzzy-match each result against the existing set
4. Only add businesses not already captured
5. Output an incremental CSV (e.g., `cg_gap_fill_v5.csv`)

**Result:** 1,366 + new gap-fill = 2,000–2,500+

---

## Scraping Options

| Option | Method | Pros | Cons |
|--------|--------|------|------|
| **A** | Manual Google Maps search | Free, no API limits | Manual, ~50–100/session |
| **B** | Outscraper API | 500–1,000+ in one run | Requires account/credits |
| **C** | SerpApi Google Maps | Flexible query construction | Requires API key |
| **D** | Manual directory scrape | Free (YellowPages, Yelp, BBB) | Labor-intensive |

---

## Recommended Priority

**With Outscraper credits** — Option B: generate query params, run, merge with dedup.

**Without API access** — Option A, targeting highest-value gaps:

1. Law firms (biggest gap)
2. Real estate offices
3. Cafes (rate-limited by OSM)
4. Accounting / consulting firms
5. Insurance agencies
