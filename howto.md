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
- Each request returns up to 25 results → **500 requests = ~12,500 potential records** (heavily deduped down to ~400-500 net new)

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

**What it does:** Queries Google Maps search results via a clean JSON API. Best for **enrichment** (adding ratings/reviews to records that already have a name).

**Sign up:**

1. Go to [https://serpapi.com](https://serpapi.com)
2. Click **"Register"** (or **"Start Free Trial"**)
3. Sign up with email — **no credit card required** for the free plan
4. After login, go to **Dashboard → API Key** ([https://serpapi.com/manage-api-key](https://serpapi.com/manage-api-key))
5. Copy the API key

**Free tier details:**
- 100 searches per month
- Each search returns 1 enrichment record (we search by business name)
- Best used for backfilling ratings on records that lack them
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

**Expected yield:** ~800 businesses in the Coral Gables bounding box.

---

## 3. Set Up Environment

### Option A: Export keys in your shell

```bash
export OUTSCRAPER_KEY="your_outscraper_key_here"
export APIFY_TOKEN="your_apify_token_here"
export SERPAPI_KEY="your_serpapi_key_here"
```

### Option B: Use a `.env` file

```bash
# Copy the example
cp .env.example .env

# Edit with your keys
nano .env
```

`.env` contents:
```
OUTSCRAPER_KEY=your_outscraper_key_here
APIFY_TOKEN=your_apify_token_here
SERPAPI_KEY=your_serpapi_key_here
```

Then source it before running:
```bash
source .env
# or
export $(cat .env | xargs)
```

### Verify keys are set

```bash
echo "Outscraper: ${OUTSCRAPER_KEY:0:8}..."
echo "Apify:      ${APIFY_TOKEN:0:8}..."
echo "SerpApi:    ${SERPAPI_KEY:0:8}..."
```

---

## 4. Run the Pipeline

### Quick start: Just OSM (free, no keys)

```bash
# Collect ~800 businesses from OpenStreetMap
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

# SerpApi — enrichment pass (needs existing master)
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --limit 100

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
| Lat/lon missing (58%) | Forward geocode address → coordinates | Free (Nominatim) |
| Address missing (63%) | Reverse geocode coordinates → address | Free (Nominatim) |
| Postcode missing | Infer from coordinates (nearest centroid) | Free (local) |
| Neighborhood missing | Infer from coordinates (boundary rules) | Free (local) |
| Category = "other" (774) | Re-map using business name keywords | Free (local) |
| Ratings missing (94%) | SerpApi enrichment pass | 100 free/month |

### Run enrichment

```bash
# Full enrichment pass (geocoding + categories)
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich

# Dry run first to see what would change
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich --dry-run

# Or via orchestrator
python "scripts/0. orchestrator.py" --enrich
```

### Enrichment for ratings (SerpApi)

Ratings enrichment goes through Agent 1 → Agent 2 (staging merge fills blanks):

```bash
# Collect ratings for up to 100 businesses missing them
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --limit 100

# Merge the enrichment data into master
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv
```

SerpApi free tier = 100/month. To enrich all ~1,570 records missing ratings, this takes ~16 months at free tier, or upgrade to a paid plan.

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

# 3. Run SerpApi ratings enrichment (100 free)
python "scripts/1. agent1-osint.py" --source serpapi --master data/master_all_businesses.csv --limit 100
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

| Month | Source | Expected Net New | Running Total |
|-------|--------|------------------:|--------------:|
| Current | Baseline | — | 1,665 |
| 1 | Outscraper + Apify + OSM | +1,200 | ~2,865 |
| 2 | Outscraper + SerpApi enrich | +400 | ~3,265 |
| 3 | Outscraper + SerpApi enrich | +350 | ~3,615 |
| 4 | Outscraper + SerpApi enrich | +300 | ~3,915 |
| 5 | Outscraper + SerpApi enrich | +250 | ~4,165 |
| 6 | Outscraper + final sweep | +200 | **~4,365** |

---

## 8. Troubleshooting

### "OUTSCRAPER_KEY not set"

```bash
# Check if the variable is exported
echo $OUTSCRAPER_KEY

# If empty, set it
export OUTSCRAPER_KEY="your_key_here"
```

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
│                python "0. orchestrator.py" --all            │
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
         │                                         │
         │  --enrich: geocode, reverse geocode,    │
         │            re-categorize, infer zip      │
         └─────────────────┬───────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │     data/master_all_businesses.csv       │
         │        (1,665+ canonical records)        │
         └─────────────────┬───────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────────┐
         │     Agent 3 — Synthesizer & Exporter    │
         │  export → dashboard/public/data/        │
         │  synthesize → PKP node/edge/signal/risk │
         │  stats → coverage report                │
         └─────────────────────────────────────────┘
```

---

## Adapting to a Different City

This pipeline is city-agnostic. To target a different municipality:

1. **Agent 1:** Update `CORAL_GABLES_ZIPS`, `OSM_BBOX`, and query strings in `1. agent1-osint.py`
2. **Agent 2:** Update `CG_BOUNDS`, `CG_ZIPS`, `ZIP_CENTROIDS`, and neighborhood rules in `2. agent2-validator.py`
3. **Agent 3:** Update `NEIGHBORHOOD_EDGES`, `PICKS_SHOVELS`, and `UNDERCURRENTS` dicts in `3. agent3-synthesizer.py`
4. Run the same pipeline: `python "scripts/0. orchestrator.py" --all`

The category rules, dedup engine, validation scoring, and PKP synthesis all work unchanged for any US city.
