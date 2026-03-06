# Agent 2 — Enhanced Validator: Documentation

**Date:** 2026-03-05  
**Script:** `temp/agent2_enhanced_validator.py`  
**Status:** Prototype (read-only audit mode, does NOT modify master unless `--live` is passed)

---

## What Was Built

An enhanced version of `scripts/2. agent2-validator.py` that adds **10 validation layers** on top of the original cleaning pipeline, plus a **bug fix** where `red_flag_present` and `red_flag_severity` were never populated.

## Bug Fix: Red Flag Columns

**Problem:** The original Agent 2 defined three red flag columns in the schema (`red_flag_present`, `red_flag_severity`, `red_flag_notes`) but only ever populated `red_flag_notes`. The other two were always empty strings. Agents 3 and 4 downstream read `red_flag_present` to decide behavior — but it was always blank.

**Fix:** The enhanced validator now derives:
- `red_flag_present` → **"Y"** if any validation penalty issues exist, **"N"** if clean
- `red_flag_severity` → **"Critical"** if geo-bounds fail, address mismatch, DNS fail, or score < 0.30; otherwise **"Operational"**

---

## The 10 Validators

| # | Validator | Type | Network? | What It Checks |
|---|---|---|---|---|
| V1 | Cross-Source Corroboration | Trust boost | No | How many independent source families confirm this business |
| V2 | Geo-Bounds Check | Location | No | Coordinates inside Coral Gables bounding box |
| V3 | Zip ↔ Coordinate Cross-Check | Location | No | `infer_zip(lat, lon)` matches stored postcode |
| V4 | Address ↔ Coordinate Distance | Location | **Yes** (Nominatim) | Haversine between geocoded address and stored coords |
| V5 | Phone Area Code | Contact | No | Area code is Miami-Dade (305, 786, 954) |
| V6 | Business Name Plausibility | Identity | No | Name length, junk patterns, address-like names |
| V7 | Duplicate Address Detection | Anomaly | No | 3+ businesses at same address |
| V8 | Rating ↔ Review Consistency | Data quality | No | High rating + low reviews, missing pairs |
| V9 | Website Domain Validation | Contact | **Yes** (DNS) | Domain resolves via socket lookup |
| V10 | Temporal Staleness | Freshness | No | `last_reviewed_date` older than 90 days |

### Scoring System

Each validator returns a `score_delta` (positive = boost, negative = penalty). The base score starts at **1.0** and accumulates all deltas:

| Score Range | Tier |
|---|---|
| ≥ 0.80 | **High** |
| ≥ 0.50 | **Moderate** |
| < 0.50 | **Low** |

---

## First Audit Results (2,868 records)

Run command:
```bash
python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit
```

### Tier Distribution
| Tier | Count | % |
|---|---|---|
| High | 2,279 | 79.5% |
| Moderate | 525 | 18.3% |
| Low | 64 | 2.2% |

### Red Flags
| Status | Count |
|---|---|
| Clean (N) | 3 |
| Flagged (Y) — Critical | 103 |
| Flagged (Y) — Operational | 2,762 |

### Validator Hit Frequency
| Validator | Hits | % | Notes |
|---|---|---|---|
| V1 Corroboration | 2,868 | 100% | Fires on every record (informational + penalty) |
| V8 Rating/Review | 2,256 | 78.7% | Most records have rating but no review count |
| V3 Zip/Coord | 528 | 18.4% | Significant zip mismatches |
| V5 Phone Area Code | 214 | 7.5% | Non-Miami phone numbers |
| V7 Dup Address | 145 | 5.1% | Address clustering detected |
| V2 Geo Bounds | 98 | 3.4% | Records outside Coral Gables |
| V6 Name Check | 44 | 1.5% | Suspicious business names |
| V10 Staleness | 7 | 0.2% | Almost all recently reviewed |

### Key Findings

1. **Corroboration is extremely low:** Only 4 businesses are confirmed by 2+ independent sources. 2,725 are single-source only. This is the biggest trust gap in the dataset.

2. **V8 is noisy:** 2,245 records have a rating but no review count. This is a data completeness issue rather than a data quality issue — the Outscraper and SerpApi scrapers captured ratings but didn't always return review counts. Consider making this informational rather than a penalty.

3. **98 records are outside Coral Gables** (same as original validator found).

4. **47 businesses share one address** — likely a commercial building or virtual office address that needs manual verification.

5. **34 businesses have NYC (212) area codes** — suspicious for Coral Gables businesses.

6. **528 zip/coord mismatches** — border-area businesses where the centroid-based zip inference doesn't match stored postcode. Many are legitimate (zip boundaries are complex), but some indicate real data errors.

---

## Corroboration Problem & Suggested Sources

The data currently comes from these independent source families:

| Family | Records | Notes |
|---|---|---|
| Google (Outscraper/SerpApi/Apify) | ~1,073 | All draw from same Google Maps data = **1 source** |
| CGCC (Chamber) | ~826 | High trust but no coords/ratings |
| OSM | ~788 | Community-verified |
| TripAdvisor | ~41 | Small but independent |
| Manual | ~99 | Non-CGCC manual entries |
| Agent1 | ~25 | Misc scraper runs |

**Recommended additional sources for corroboration:**

| Priority | Source | What It Confirms | Cost |
|---|---|---|---|
| 1 | **Florida Sunbiz** (search.sunbiz.org) | Legal existence, registered agent, active/dissolved status | Free (scrape) |
| 2 | **Yelp** (Yelp Fusion API) | Independent rating, review count, open/closed status | Free tier: 5,000 calls/day |
| 3 | **Miami-Dade Business Tax Receipts** | Local business license = actually operating | Free (public records) |
| 4 | **Facebook Pages** | Existence, last activity date (staleness proxy) | Free (scrape) |
| 5 | **Foursquare / Factual** | Independent venue database, strong on food/retail | Free tier available |
| 6 | **BBB** | Accreditation + complaint history = red flags | Free (public) |

With Sunbiz + Yelp added, most businesses would have 3+ independent confirmations.

---

## Usage

```bash
# Quick audit (no network calls, V4 + V9 skipped):
python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit

# Deep audit (includes geocoding + DNS — slow, ~100 geocodes):
python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit --deep

# Write updated validation columns to master (destructive):
python temp/agent2_enhanced_validator.py --master data/master_all_businesses.csv --audit --live
```

---

---

## Cross-Source Reconciliation & Sunbiz Lookup

**Script:** `temp/cross_source_reconciler.py`  
**Purpose:** Address the critical corroboration gap (originally only 4 exact-key matches) by fuzzy-matching records across source families and verifying legal existence via Florida Sunbiz.

### Why Only 4 Exact Matches?

The original dedup ran per-staging-batch during merge. Different sources store the same business differently:
- Google: `"Bulla Gastrobar Coral Gables"` | OSM: `"Bulla Gastrobar"` | CGCC: `"Bulla Gastrobar"`
- Google: `"CVI.CHE 105 - Coral Gables"` | Agent1: `"CVI.CHE 105"`
- CGCC: `"Airlab Fitness"` | Google: `"AIRLAB Fitness Coral Gables"`

Exact key matching (normalized lowercase + address fragment) only finds 4 overlaps. The real overlap is much higher.

### 3-Pass Reconciliation Algorithm

| Pass | Method | What It Catches | Matches |
|---|---|---|---|
| **A** | Exact normalized key | Identical name + address across families | 4 |
| **B** | Coord proximity (100m) + fuzzy name (≥80 score) + noise-word filter | Same location, similar name, different formatting | 19 |
| **C** | Strong fuzzy name (≥88 score), no coords needed | CGCC records (no lat/lon) matching Google/OSM by name | 38 |
| | **Total** | | **61 cross-family matches → 45 multi-source groups** |

**Noise-word filtering:** Before fuzzy comparison, words like "coral", "gables", "miami", "fl", "florida", "restaurant", "bar", "grill", "the" are stripped. This prevents "Coral Gables X" from falsely matching "Coral Gables Y" and requires at least 1 shared significant (non-noise) token.

### Reconciliation Results

| Sources | Records | % |
|---|---|---|
| 1 (single-source) | 2,762 | 96.3% |
| 2 (two-source) | 100 | 3.5% |
| 3 (three-source) | 6 | 0.2% |

**Three-source confirmations (highest confidence):**
- Orangetheory Fitness (google + cgcc + osm)
- Rumble Boxing (google + cgcc + osm)

**Sample two-source groups:**
| Business | Sources |
|---|---|
| Hotel Colonnade | google + osm |
| Loews Coral Gables Hotel | cgcc + manual |
| Titanic Brewery & Restaurant | google + osm |
| City National Bank | osm + cgcc |
| AutoNation Chevrolet | osm + google |
| THesis Hotel Miami | cgcc + google |
| Bulla Gastrobar | agent1 + google |
| CVI.CHE 105 | google + agent1 |
| Salumeria 104 | google + cgcc |
| Arthur Murray Dance Studio | cgcc + google |

**False positive prevention:**
- Initial thresholds (70 score, 150m) produced bad matches like "Chase Bank ↔ Seacoast Bank"
- Tightened to 80/88 scores + 100m proximity + noise-word filter + shared-token requirement
- All 45 groups manually spot-checked: no false positives observed

### Columns Added by Reconciliation

| Column | Values | Example |
|---|---|---|
| `corroboration_sources` | Comma-separated family list | `"cgcc,google,osm"` |
| `corroboration_count` | Number of independent families | `"3"` |

### Sunbiz Legal Existence Lookup

**What:** Queries [search.sunbiz.org](https://search.sunbiz.org) (Florida Division of Corporations) to verify if a business is legally registered and active in Florida.

**Method:** Session-based POST to `/Inquiry/CorporationSearch/ByName`:
1. GET form page (establishes cookies for Cloudflare)
2. POST search form with cleaned business name (first 4 words, no suffixes)
3. Parse results table for Corporate Name / Filing Number / Status
4. Fuzzy match best result (≥50 token_sort_ratio) back to original name
5. Rate-limited: 1 request per 2 seconds

**Status normalization:** ACT → Active, INACT/INACTIVE/INACT/UA → Inactive, VOL DISSOLVED → Dissolved, etc.

### Sunbiz Sample Results (50 businesses)

| Status | Count | % |
|---|---|---|
| Active | 29 | 58% |
| Inactive | 16 | 32% |
| Not Found | 4 | 8% |
| Admin Dissolved | 1 | 2% |

**Interpretation:**
- **Active (58%)** — Business is a registered, active Florida entity. Strong existence signal.
- **Inactive (32%)** — Was registered but dissolved/cancelled. Not necessarily a red flag — many small businesses operate under personal names or DBAs not filed with Sunbiz.
- **Not Found (8%)** — No Sunbiz match. Could be a DBA, sole proprietorship (not required to register), or the scraper missed it. Not a disqualifier.

### Columns Added by Sunbiz

| Column | Values | Example |
|---|---|---|
| `sunbiz_status` | Active, Inactive, Not Found, Dissolved, etc. | `"Active"` |
| `sunbiz_name` | Best-match Sunbiz entity name | `"BULLA, LLC"` |
| `sunbiz_filing_number` | Florida filing number | `"L19000012345"` |
| `sunbiz_match_score` | Fuzzy match confidence (0-100) | `"72"` |

### Usage

```bash
# Cross-source reconciliation only (fast, no network):
python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --dry-run

# Sunbiz lookup only (20 businesses):
python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --sunbiz --limit 20 --dry-run

# Both together (reconcile first, then Sunbiz prioritizes single-source records):
python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --sunbiz --limit 50 --dry-run

# LIVE mode (writes columns to master CSV):
python temp/cross_source_reconciler.py --master data/master_all_businesses.csv --reconcile --sunbiz --limit 100
```

### Important: Nothing Is Removed

Both reconciliation and Sunbiz are **tag-only** operations. No records are deleted or filtered. All 2,868 records remain. The new columns enable downstream decisions:

- **Agent 3 (Synthesizer)** can weight multi-source businesses higher in rankings
- **Agent 4 (Actions)** can deprioritize single-source + Sunbiz-not-found businesses for outreach
- **Dashboard** can display trust badges (e.g., "Verified by 3 sources + Sunbiz Active")

---

## Next Steps

1. **Tune V8 (Rating/Review)** — Make "has rating but no review count" informational instead of a penalty (it fires on 78% of records due to incomplete scraping, not bad data)
2. **Tune V1 (Corroboration)** — Currently penalizes single-source records; once new sources added, this becomes the most powerful signal
3. **Run Sunbiz on full dataset** — `--sunbiz --limit 2868` (at 2 sec/req ≈ 1.6 hours) to get 100% coverage
4. **Add Yelp Fusion adapter to Agent 1** — Second-highest value independent source, would bring most businesses to 3+ confirmations
5. **Integrate into production Agent 2** — Merge `temp/` prototypes back into `scripts/2. agent2-validator.py` after tuning
6. **Fix existing master** — Run `--live` to backfill `red_flag_present`, `red_flag_severity`, corroboration, and Sunbiz columns for all 2,868 records
