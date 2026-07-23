# How To: Run the Full OSINT Pipeline

> Step-by-step guide to collecting, enriching, and synthesizing Coral Gables business data. Designed so anyone can reproduce this from scratch.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Set Up Environment](#3-set-up-environment)
4. [Run the Pipeline](#4-run-the-pipeline)
5. [Enrich Existing Data](#5-enrich-existing-data)
6. [Export to Dashboard](#6-export-to-dashboard)
7. [Monthly Cadence](#7-monthly-cadence)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

```bash
# Python 3.8+
python3 --version

# Clone the repo
git clone <repo-url> && cd Terminal

# Install core dependencies
pip install requests pandas fuzzywuzzy python-Levenshtein

# Per-source (install only what you use):
pip install outscraper             # for Outscraper (v6+ required)
pip install apify-client           # for Apify
pip install google-search-results  # for SerpApi
```

---

## 2. Get Your API Keys

You need **zero keys** to start — OSM Overpass is unlimited and free. The paid APIs all have free tiers that stack to cover ~4,400 businesses over a few months.

### 2a. Outscraper (500 free requests/month)

**What it does:** Queries Google Maps for business listings. Returns name, phone, website, address, rating, reviews, category.

**Sign up:**

1. Go to [https://outscraper.com](https://outscraper.com)
2. Click **"Sign Up"** (top right) — use Google or email
3. After login, go to **Profile → API Keys** ([https://app.outscraper.com/api-keys](https://app.outscraper.com/api-keys))
4. Click **"Create API Key"**
5. Copy the key (starts with a long alphanumeric string)

**Free tier details:**
- 500 Google Maps search requests per month
- No credit card required
- Resets on the 1st of each month
- Each request returns up to 25 results → **60 queries across 3 runs = ~1,300 raw records** (deduped down to ~400-600 net new by Agent 2)

**Rate limits:** No documented hard limit, but space requests 2s apart (Agent 1 does this automatically).

### 2b. Apify ($5 free credit)

**What it does:** Runs a Google Places crawler actor that scrapes detailed business profiles.

**Sign up:**

1. Go to [https://apify.com](https://apify.com)
2. Click **"Start free"** — sign up with GitHub, Google, or email
3. After login, go to **Settings → Integrations** ([https://console.apify.com/account/integrations](https://console.apify.com/account/integrations))
4. Your **API token** is shown at the top of the page
5. Copy the token

**Free tier details:**
- $5 free platform credit on signup (no credit card needed)
- The Google Places actor costs ~$0.005-0.01 per result
- $5 credit ≈ **500-1,000 business records** in one shot
- Credit does NOT renew monthly — it's a one-time grant
- After $5 is spent, you'd need to add funds ($49/mo plan or pay-as-you-go)

**Actor used:** `compass/crawler-google-places` — this is pre-configured in Agent 1.

### 2c. SerpApi (100 free searches/month)

**What it does:** Queries Google Maps search results via a clean JSON API. Best for **enrichment** — backfilling website, address, ratings, reviews, and price data on records that already have a name. Supports field-targeted queries via `--target`.

**Sign up:**

1. Go to [https://serpapi.com](https://serpapi.com)
2. Click **"Register"** (or **"Start Free Trial"**)
3. Sign up with email — **no credit card required** for the free plan
4. After login, go to **Dashboard → API Key** ([https://serpapi.com/manage-api-key](https://serpapi.com/manage-api-key))
5. Copy the API key

**Plan details:**
- Free tier: 100 searches/month (no credit card)
- Developer plan ($75/mo): 5,000 searches/month
- Each search returns 1 enrichment record (we search by business name)
- Supports `--target` flag to choose which gap to fill: `missing-rating`, `missing-website`, `missing-address`, `missing-reviews`, or `any-gap`
- Resets monthly
- Rate limit: 1 request/second (Agent 1 handles this)

**Install the Python package:**
```bash
pip install google-search-results
```

### 2d. OpenStreetMap Overpass (Unlimited, No Key)

**What it does:** Queries the OpenStreetMap database for all tagged businesses in a geographic bounding box.

**No sign up needed.** OSM is open data. Overpass API is free and public.

**Limits:**
- Be polite: 1 request per 2 seconds (Agent 1 handles this)
- Timeout per query: 90 seconds
- No monthly cap
- Returns: name, coordinates, phone, website, address (when tagged)
- Does NOT return: ratings, reviews, price tier

**Expected yield:** ~560 businesses in the Coral Gables bounding box (10-chunk geographic sweep). Some chunks may 504 timeout on busy Overpass servers — re-run to pick up missed chunks.

---

## 3. Set Up Environment

### Create your `.env` file

```bash
# Copy the example
cp .env.example .env

# Edit with your actual keys
nano .env   # or open in your editor of choice
```

`.env` contents:
```
OUTSCRAPER_KEY=your_outscraper_key_here
APIFY_TOKEN=your_apify_token_here
SERPAPI_KEY=your_serpapi_key_here
```

> **Important:** The `.env` file is gitignored and will NOT be pushed to the repository. This is intentional — never commit API keys. Each analyst needs their own `.env` file.

### Load keys into your shell

The Python scripts read API keys via `os.environ.get()`, which only sees **exported** environment variables. You must load and export them before running any agent.

```bash
# Recommended method (works in both bash and zsh):
set -a && source .env && set +a
```

> **Why `set -a`?** Running `source .env` alone sets shell variables, but doesn't **export** them to child processes. The `set -a` flag tells your shell to auto-export every variable defined during `source`, so Python can see them. `set +a` turns auto-export back off afterward. This is especially important on **macOS** where the default shell is **zsh** — the commonly suggested `export $(cat .env | xargs)` often fails in zsh with a "not valid in this context" error.

**Alternatives (if you prefer):**

```bash
# Bash-only (may fail in zsh):
export $(cat .env | xargs)

# Manual export (always works, any shell):
export OUTSCRAPER_KEY="your_outscraper_key_here"
export APIFY_TOKEN="your_apify_token_here"
export SERPAPI_KEY="your_serpapi_key_here"
```

### Verify keys are loaded

```bash
echo "Outscraper: ${OUTSCRAPER_KEY:0:8}..."
echo "Apify:      ${APIFY_TOKEN:0:8}..."
echo "SerpApi:    ${SERPAPI_KEY:0:8}..."
```

If any key prints blank, re-run the `set -a && source .env && set +a` command. You need to do this **once per terminal session** (keys don't persist after closing the terminal).

---

## 4. Run the Pipeline

### Quick start: Just OSM (free, no keys)

```bash
# Collect ~560 businesses from OpenStreetMap
python "scripts/1. agent1-osint.py" --source osm

# Validate, dedup, merge into master CSV
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv

# Export to dashboard
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
```

### Full pipeline: All sources concurrently

```bash
# Run ALL sources with valid keys in parallel → merge → export
python "scripts/0. orchestrator.py" --all
```

This will:
1. Check which API keys are set
2. Run Agent 1 for each valid source **in parallel** (up to 4 workers)
3. Outscraper runs all 3 chunks concurrently (food, professional, services)
4. All results land in `staging/`
5. Agent 2 normalizes, deduplicates (fuzzy match >= 85), validates, and merges into master
6. Agent 3 exports to `dashboard/public/data/`
7. Prints final stats

### Selective sources

```bash
# Just OSM + Outscraper
python "scripts/0. orchestrator.py" --sources osm,outscraper

# Just Apify (burn the $5 credit)
python "scripts/0. orchestrator.py" --sources apify

# Dry run — collect but don't modify master
python "scripts/0. orchestrator.py" --all --dry-run
```

### Running sources individually

```bash
# Outscraper — 3 chunk runs (food, professional, services)
python "scripts/1. agent1-osint.py" --source outscraper --run 1  # food & retail
python "scripts/1. agent1-osint.py" --source outscraper --run 2  # professional & healthcare
python "scripts/1. agent1-osint.py" --source outscraper --run 3  # hospitality & services

# Apify — single run, all categories
python "scripts/1. agent1-osint.py" --source apify

# SerpApi — field-targeted enrichment (needs existing master, default limit: 5000)
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv                              # default: missing-rating
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --target missing-website      # 1,359 rows need websites
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --target any-gap --limit 500  # any missing field

# OSM Overpass — 10-chunk geographic sweep
python "scripts/1. agent1-osint.py" --source osm
```

After each Agent 1 run, merge with Agent 2:
```bash
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv
```

---

## 5. Enrich Existing Data

The master CSV has significant gaps in existing records. Enrichment backfills these **without adding new rows**.

### What enrichment does

| Gap | Strategy | API Cost |
|-----|----------|----------|
| Lat/lon missing (30%) | Forward geocode address → coordinates | Free (Nominatim) |
| Address missing (48%) | Reverse geocode coordinates → address | Free (Nominatim) |
| Postcode missing (30%) | Infer from coordinates (nearest centroid) | Free (local) |
| Neighborhood missing (3%) | Infer from coordinates (boundary rules) | Free (local) |
| Category = "other" (691) | Re-map using business name keywords | Free (local) |
| Ratings missing (12%) | SerpApi enrichment pass | 5,000/month (Developer) |

### Run enrichment

```bash
# Full enrichment pass (geocoding + categories)
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich

# Dry run first to see what would change
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich --dry-run

# Or via orchestrator
python "scripts/0. orchestrator.py" --enrich
```

### Field-targeted enrichment (SerpApi)

SerpApi enrichment goes through Agent 1 → Agent 2 (staging merge fills blanks on existing rows without overwriting):

```bash
# Target a specific gap (default: missing-rating)
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --target missing-website
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --target any-gap --limit 500

# Merge the enrichment data into master (blanks-only fill)
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv
```

Available `--target` values:

| Target | Records | What it fills |
|--------|--------:|---------------|
| `missing-rating` | 356 | rating, reviews, price, website, address |
| `missing-website` | 1,359 | website, phone, address, rating |
| `missing-address` | 1,368 | address, phone, website, rating |
| `missing-reviews` | 2,601 | review_count, rating, website |
| `any-gap` | 2,751 | OR of all above — any record with any gap |

SerpApi Developer plan (5,000/month) enriched 1,446 of 1,568 records missing ratings in a single 26-minute pass (92.2% match rate). On the free tier (100/month), this would have taken ~16 months.

### Geocoding rate limits

Nominatim (OpenStreetMap's geocoder) requires:
- **1 request per second** — the enrichment script enforces this automatically
- A descriptive `User-Agent` header — already set in the code
- No API key needed

At 1 req/sec, geocoding 620 addresses takes ~11 minutes. Reverse geocoding 970 coordinates takes ~17 minutes. Total enrichment pass: **~30 minutes**.

---

## 6. Export to Dashboard

```bash
# Export master CSV to dashboard
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export

# Run PKP synthesis (node types, edges, signals, risks, actions)
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize

# Re-export after synthesis so dashboard gets PKP columns
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export

# Check stats
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action stats

# Validate schema
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action schema
```

### Start the dashboard

```bash
cd dashboard && npm install && npm run dev
```

Opens at `http://localhost:5173` by default.

---

## 7. Monthly Cadence

The free-tier stacking strategy works on a monthly rotation. Here's the recommended cadence:

### Month 1 (e.g., March)

```bash
# 1. Run Outscraper (500 free requests → ~400 net new)
python "scripts/0. orchestrator.py" --sources outscraper

# 2. Run enrichment pass
python "scripts/0. orchestrator.py" --enrich

# 3. Run SerpApi ratings enrichment (5,000/month on Developer plan)
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv

# 4. PKP synthesis + export
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
```

### Month 2 (e.g., April)

```bash
# Same as Month 1 — Outscraper resets, SerpApi resets
python "scripts/0. orchestrator.py" --sources outscraper
python "scripts/0. orchestrator.py" --enrich
# ... same enrichment + export steps
```

### One-time: Apify

```bash
# Burn the $5 credit in one shot (~600-700 records)
python "scripts/0. orchestrator.py" --sources apify
```

### Re-run OSM periodically

```bash
# OSM data gets updated by mappers — re-run quarterly for new entries
python "scripts/0. orchestrator.py" --sources osm
```

### Projected timeline to 4,400

| Month | Source | Raw Collected | Net New (after dedup) | Running Total |
|-------|--------|:-------------:|----------------------:|--------------:|
| Baseline | Phase 1 (CGCC + OSM + non-chamber) | — | — | 1,665 |
| 1 (Feb) | OSM + Outscraper (x3) + SerpApi | 562 + 1,304 + 1,446 enrichment | **+1,219** | **2,884** |
| 2 (Mar) | Outscraper (x3) + Apify + SerpApi | ~1,300 + ~700 | +600-800 | ~3,500-3,700 |
| 3 (Apr) | Outscraper (x3) + SerpApi | ~1,300 | +300-400 | ~3,900 |
| 4 (May) | Outscraper (x3) + OSM re-run | ~1,300 + ~200 | +200-300 | ~4,200 |
| 5 (Jun) | Outscraper (final sweep) | ~1,000 | +100-200 | **~4,400** |

> **Actual yields from Month 1 run (Feb 18-19, 2026):** OSM: 562 raw. Outscraper: 380 (food) + 491 (professional) + 433 (services) = 1,304 raw. SerpApi: 1,568 queried, 1,446 matched (92.2% match rate) — enriches existing records with ratings/reviews. Agent 2 merge: 3,384 staging records → 1,219 net new + 2,165 existing records enriched. Net new after dedup was 36% of raw count.

---

## 8. Troubleshooting

### "OUTSCRAPER_KEY not set" (or any key shows blank)

This almost always means the keys weren't **exported** to the environment. Re-run:

```bash
set -a && source .env && set +a

# Verify:
echo $OUTSCRAPER_KEY
```

Common pitfalls:
- `source .env` without `set -a` sets shell variables but doesn't export them — Python can't see them
- `export $(cat .env | xargs)` fails in zsh — use the `set -a` method instead
- Keys don't persist across terminal sessions — re-run the source command each time you open a new terminal

### Outscraper `google_maps_search_v2` error

If you see `'OutscraperClient' object has no attribute 'google_maps_search_v2'`, you have `outscraper` v6+. The SDK was updated:

- `ApiClient` was renamed to `OutscraperClient` (though `ApiClient` still works as an alias)
- `google_maps_search_v2()` was removed — use `google_maps_search()` instead

The agent scripts already use the current API. If you're on an older version of this repo, pull the latest changes.

### numpy version conflict (`_ARRAY_API not found` or `compiled against NumPy 1.x`)

If you see `_ARRAY_API not found` or `module compiled against NumPy 1.x cannot run against NumPy 2.x`, compiled packages like `numexpr` and `bottleneck` are incompatible with your numpy version. This is common on **Anaconda** installs where numpy 2.x ships but other packages are compiled against 1.x.

**Recommended fix — downgrade numpy (most reliable for Anaconda):**

```bash
pip install 'numpy<2'
```

This resolves all related conflicts at once (`numexpr`, `bottleneck`, `scipy`, etc.). You'll see red dependency warnings from pip — these are safe to ignore as long as pandas imports without errors.

**Alternative — upgrade everything to numpy 2.x:**

```bash
pip install --upgrade numexpr bottleneck
```

This only works if all your packages have numpy 2.x-compatible wheels available.

### "No staging records found"

Agent 2 looks for CSVs in `staging/`. If Agent 1 hasn't run yet (or all staging files were archived), there's nothing to merge. Run Agent 1 first.

### Outscraper returns 0 results

- You may have hit the monthly 500-request cap. Check your usage at [https://app.outscraper.com/usage](https://app.outscraper.com/usage)
- Wait until the 1st of next month for the reset

### Apify actor fails

- Check your credit balance at [https://console.apify.com/billing](https://console.apify.com/billing)
- The actor `compass/crawler-google-places` may have been updated — check the Apify store for the latest version

### Geocoding is slow

Nominatim rate limit is 1 request/second by policy. This is intentional and cannot be sped up without violating their terms. For 600+ rows, expect ~10-15 minutes.

### Fuzzy dedup is merging things that shouldn't be merged

Lower the threshold:
```bash
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --fuzzy-threshold 90
```

Default is 85. Higher = stricter matching (fewer merges, more duplicates). Lower = more aggressive merging.

### Dashboard shows old data

Re-export:
```bash
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action export
```

Then restart the dev server or hard-refresh the browser.

---

## Pipeline Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent 0 — Orchestrator                     │
│      python "0. orchestrator.py" --all                      │
│      Direct imports via importlib (no subprocess overhead)  │
│      ThreadPoolExecutor for concurrent I/O-bound scrapers   │
└─────────────┬───────────┬───────────┬───────────┬───────────┘
              │           │           │           │
              ▼           ▼           ▼           ▼
         ┌────────┐ ┌──────────┐ ┌───────┐ ┌─────────┐
         │  OSM   │ │Outscraper│ │ Apify │ │ SerpApi │
         │ (free) │ │(500/mo)  │ │ ($5)  │ │(100/mo) │
         └───┬────┘ └────┬─────┘ └───┬───┘ └────┬────┘
             │           │           │           │
             ▼           ▼           ▼           ▼
         ┌─────────────────────────────────────────┐
         │           staging/*.csv                  │
         │    (raw records, common field format)    │
         └─────────────────┬───────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │     Agent 2 — Validator & Merger        │
         │  normalize → fuzzy dedup → validate     │
         │  → merge into master → archive staging  │
         │  (vectorized sanitize, O(1) key lookup) │
         │                                         │
         │  --enrich: geocode, reverse geocode,    │
         │            re-categorize, infer zip      │
         └─────────────────┬───────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │     data/master_all_businesses.csv       │
         │        (2,884 canonical records)         │
         └─────────────────┬───────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │     Agent 3 — Synthesizer & Exporter    │
         │  export → dashboard/public/data/        │
         │  synthesize → PKP node/edge/signal/risk │
         │  stats → coverage report                │
         └─────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │     _shared.py — Shared Module          │
         │  CANONICAL_FIELDS, geo constants,        │
         │  normalize_key/phone, haversine,         │
         │  infer_zip/neighborhood                  │
         │  (imported by Agents 1, 2, and 3)        │
         └─────────────────────────────────────────┘
```

---

## Adapting to a Different City

This pipeline is city-agnostic. To target a different municipality:

1. **`_shared.py`:** Update `CORAL_GABLES_ZIPS`, `CG_BOUNDS`, `ZIP_CENTROIDS`, `OSM_BBOX`, and neighborhood rules — all geo constants live in one file
2. **Agent 1:** Update query strings in `1. agent1-osint.py` (search terms reference zip codes from `_shared.py`)
3. **Agent 3:** Update `NEIGHBORHOOD_EDGES`, `PICKS_SHOVELS`, and `UNDERCURRENTS` dicts in `3. agent3-synthesizer.py`
4. Run the same pipeline: `python "scripts/0. orchestrator.py" --all`

The category rules, dedup engine, validation scoring, and PKP synthesis all work unchanged for any US city.
