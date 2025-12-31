# SOP: Data Refresh Operations

## Overview

This document describes the Standard Operating Procedures for refreshing business intelligence data in the Coral Gables BI Platform.

**Current Database Size:** 927 businesses (844 verified Chamber members + 83 additional)

---

## Data Sources

### Primary: Chamber of Commerce Member Directory

The foundation of our database is the **Coral Gables Chamber of Commerce** member directory:

| Metric | Value |
|--------|-------|
| Total Chamber members | 844 |
| With verified phone | 829 (98.2%) |
| With verified website | 792 (93.8%) |
| Categories covered | 315 |

**Source file:** `docs/REVISED AO 7.11.2025 All Members By Category(1)[84].docx`

### Secondary: OSINT Enrichment

| Agent | Data Provided | Confidence |
|-------|---------------|------------|
| Google Places API | Ratings, reviews, hours, photos | 0.9 |
| Yelp Fusion API | Ratings, reviews, categories | 0.9 |
| Website Analyzer | Services, social links | 0.6 |
| Financial Estimator | Revenue/employee estimates | 0.6 |
| Pain Point Extractor | LLM-based pain points | 0.7 |

---

## Production Services (Railway)

| Service | URL | Purpose |
|---------|-----|---------|
| **Terminal** | `terminal-production-27a0.up.railway.app` | Main API (24/7) |
| **Terminal Cron Service** | `terminal-cron-service-production.up.railway.app` | Weekly refresh (Sunday 6 AM UTC) |
| **PostgreSQL** | Railway-managed | Persistent data storage |

---

## Data Storage

The platform supports two data storage modes:

### PostgreSQL (Recommended for Production)
- **Persistent storage** - data survives container restarts
- **Set `DATABASE_URL`** in Railway environment variables
- **Auto-detected** - API automatically uses PostgreSQL when available

### JSON File (Fallback)
- Used when `DATABASE_URL` is not set
- Data is bundled with deployment
- Ephemeral - lost on container restart unless committed to git

### Data Files

| File | Size | Contents |
|------|------|----------|
| `coral_gables_bi_database_v2.json` | 2.3 MB | 927 businesses with full profiles |
| `chamber_members_extracted.json` | 180 KB | 844 Chamber members (raw) |
| `all_businesses_merged.json` | 150 KB | Merged source data |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA REFRESH PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │  Chamber Member  │ (Primary source: 844 businesses)          │
│  │    Directory     │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Terminal Cron    │───>│   OSINT      │───>│  Validation  │  │
│  │ Service          │    │  Collectors  │    │   Pipeline   │  │
│  │ (Sunday 6AM UTC) │    │  (8 agents)  │    │  (5 agents)  │  │
│  └──────────────────┘    └──────────────┘    └──────────────┘  │
│                                                  │               │
│                                                  ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Terminal   │<───│  PostgreSQL  │<───│   Updated    │      │
│  │   (Main API) │    │   Database   │    │ 927 Records  │      │
│  │              │    │   (Railway)  │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │   Frontend   │  (co-terminal.netlify.app)                    │
│  │  Dashboard   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Refresh Methods

### Method 1: Automated Weekly Refresh (Running in Production)

**Schedule:** Every Sunday at 6:00 AM UTC
**Service:** Terminal Cron Service
**Status:** ✅ Active

**What happens automatically:**
1. Railway triggers `python weekly_refresh.py`
2. **Database migrations run** (ensures schema is up-to-date)
3. OSINT collectors gather data from Google Places API (New) and Yelp Fusion API
4. Data is saved to PostgreSQL (or JSON fallback)
5. Report is generated and saved

**Note:** Validation is skipped by default for stability. Use `--run-validation` to enable LLM validation.

---

### Method 2: Manual Refresh via Railway Dashboard (Trigger Now)

**Use when:** Data is stale and you can't wait for Sunday

**Steps:**
1. Go to [Railway Dashboard](https://railway.app) → Your Project
2. Click on **Terminal Cron Service**
3. Go to **Deployments** tab
4. Click **"Redeploy"** or look for **"Trigger"** button
5. This runs `weekly_refresh.py` immediately

---

### Method 3: Manual Refresh via API (Fastest - Reload Only)

**Use when:** JSON data was already updated, just need API to reload it

**Endpoint:** `POST /api/v2/admin/refresh`

```bash
curl -X POST "https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh?api_key=YOUR_ADMIN_KEY"
```

**Response:**
```json
{
  "status": "success",
  "message": "Data refreshed successfully",
  "businesses_loaded": 927,
  "refreshed_at": "2025-12-31T12:00:00"
}
```

**Check status:**
```bash
curl "https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh-status"
```

---

### Method 4: Regenerate Database from Chamber Data

**Use when:** Adding new Chamber members or rebuilding from source

```bash
# 1. Navigate to agents directory
cd systems/agents

# 2. Run the comprehensive generator (uses merged data)
python generate_comprehensive_bi_database.py

# Output:
# - Loads all_businesses_merged.json (927 businesses)
# - Generates full profiles with pain points, opportunities
# - Saves to coral_gables_bi_database_v2.json
```

---

### Method 5: Manual Local Refresh (Full Pipeline - Development)

**Use when:** Testing locally or debugging the refresh pipeline

**Prerequisites:**
- API keys configured in `.env`
- Python environment set up

**Steps:**
```bash
# 1. Navigate to agents directory
cd systems/agents

# 2. Run the weekly refresh script
python weekly_refresh.py --businesses 927

# OR run with validation (slower, higher quality):
python weekly_refresh.py --businesses 927 --run-validation

# 3. Commit and push (triggers Railway auto-deploy)
git add data/coral_gables_bi_database_v2.json
git commit -m "Weekly data refresh $(date +%Y-%m-%d)"
git push
```

---

## Chamber Data Update Process

When new Chamber members are added:

### Step 1: Extract Chamber Members

```bash
# Parse the Chamber directory document
cd systems/agents
python -c "
from docx import Document
import json

# Parse document (see generate_comprehensive_bi_database.py for full code)
# Saves to: systems/data/chamber_members_extracted.json
"
```

### Step 2: Merge with Existing Data

```bash
# Merge Chamber members with existing business profiles
# Saves to: systems/data/all_businesses_merged.json
```

### Step 3: Regenerate Database

```bash
python generate_comprehensive_bi_database.py
```

---

## Environment Variables

Set these in Railway Dashboard → Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Railway provides this) |
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key (New) v1 endpoint |
| `YELP_API_KEY` | Optional | Yelp Fusion API v3 key |
| `ANTHROPIC_API_KEY` | Recommended | For LLM validation |
| `ADMIN_API_KEY` | **Yes** | Secret key for admin endpoints (generate with `openssl rand -hex 32`) |
| `CORS_ORIGINS` | Optional | Comma-separated allowed origins (defaults to `*` if not set) |
| `API_URL` | Optional | Production API URL |

**Security Notes:**
- `ADMIN_API_KEY` is **required** - the admin endpoint returns 503 if not configured
- For production, always set `CORS_ORIGINS` to specific domains (e.g., `https://co-terminal.netlify.app`)

---

## PostgreSQL Setup (One-Time)

### Step 1: Add PostgreSQL to Railway

1. Go to [Railway Dashboard](https://railway.app) → Your Project
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway automatically creates the `DATABASE_URL` variable

### Step 2: Run Initial Migration

Migrate existing JSON data to PostgreSQL:

```bash
# From the systems/agents directory
python migrate_json_to_db.py

# Verify migration
python migrate_json_to_db.py verify
```

### Step 3: Verify API is Using PostgreSQL

```bash
curl "https://terminal-production-27a0.up.railway.app/health"
```

**Response should show:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "businesses_loaded": 927,
  "data_source": "PostgreSQL"
}
```

---

## Monitoring

### Check Last Refresh Status

```bash
curl "https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh-status"
```

**Response:**
```json
{
  "last_refresh": "2025-12-31T06:00:00",
  "businesses_loaded": 927,
  "chamber_members": 856,
  "data_source": "PostgreSQL"
}
```

### Check Data Quality

```bash
curl "https://terminal-production-27a0.up.railway.app/api/v2/data-quality/overview"
```

---

## Troubleshooting

### Issue: Data not updating after refresh

**Cause:** API caches data in memory

**Solution:**
1. Call the refresh endpoint: `POST /api/v2/admin/refresh`
2. Or restart the Railway service

### Issue: OSINT collection fails

**Cause:** API rate limits or network issues

**Solution:**
1. Check API key validity
2. Reduce `--businesses` count
3. Add delay between requests

### Issue: Validation fails or times out

**Cause:** Missing Anthropic API key, slow LLM response, or synchronous API calls

**Solution:**
1. Validation is **skipped by default** for stability
2. To enable validation, run with `--run-validation` flag:
   ```bash
   python weekly_refresh.py --businesses 100 --run-validation
   ```
3. Ensure `ANTHROPIC_API_KEY` is configured if running validation
4. Timeout scales with business count: ~5 min/business (min 10 min, max 10 hours)

**Technical Details:**
- Validation uses **async concurrent** API calls (5 agents validate in parallel)
- Each LLM call has a 30-second timeout
- If a call times out, it falls back to heuristic validation

**Actual Performance (Dec 2025):**
- 88 businesses: ~17 minutes
- 927 businesses: ~45 minutes (estimated)
- Final confidence range: 0.92 - 0.95

### Issue: Invalid phone numbers in data

**Cause:** Fake "555" numbers or invalid exchange codes

**Solution:**
Phone validation is built into the system. It automatically:
- Rejects fake "555" numbers (reserved for fiction)
- Rejects invalid exchange codes (<200)
- Formats as XXX-XXX-XXXX

To manually clean phone data:
```bash
python -c "
# See osint_production_collector.py for validate_phone() function
"
```

---

## Cost Estimates

| API | Free Tier | Cost Beyond |
|-----|-----------|-------------|
| Google Places | 200 requests/day | $17/1000 requests |
| Yelp Fusion | 500 requests/day | Contact for pricing |
| Anthropic | Pay-per-use | ~$0.01 per validation |

**Weekly refresh cost (927 businesses):**
- Google: ~$15.76 (927 requests)
- Yelp: Free (within tier for most)
- Anthropic: ~$10.00 (if validation enabled)
- **Total: ~$16-26/week or ~$64-104/month**

---

## Data Quality Metrics (December 2025)

| Metric | Value |
|--------|-------|
| Total businesses | 927 |
| Chamber members | 856 (92.3%) |
| With phone | 829 (89.4%) |
| With website | 792 (85.4%) |
| Average confidence | 0.92-0.95 (post-validation) |

### Category Distribution

| Category | Count |
|----------|-------|
| Professional Services | 164 |
| Restaurants | 101 |
| Financial Services | 77 |
| Healthcare | 68 |
| Nonprofits | 66 |
| Real Estate | 58 |
| Retail | 43 |
| Spas | 31 |
| Education | 26 |
| Construction | 20 |
| Hospitality | 16 |
| Fitness | 15 |

---

## Data Freshness Policy

| Tier | Refresh Frequency | Staleness Tolerance |
|------|-------------------|---------------------|
| Tier 1 (612 businesses) | Weekly | 7 days max |
| Tier 2 (278 businesses) | Bi-weekly | 14 days max |
| Tier 3-4 (37 businesses) | Monthly | 30 days max |

---

## Runbook: Weekly Refresh Checklist

- [ ] Verify API keys are valid (check Railway logs)
- [ ] Check cron job is scheduled
- [ ] Monitor refresh job execution
- [ ] Verify data loaded count is ~927
- [ ] Spot-check 2-3 business records for accuracy
- [ ] Check dashboard loads correctly
- [ ] Review any error logs

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Dec 2025 | 927 businesses, Chamber integration |
| 2.0.0 | Dec 2025 | 88 businesses, consensus validation |
| 1.0.0 | Nov 2025 | Initial release with 10 businesses |

---

## Contact

For issues with data refresh:
1. Check Railway logs first
2. Review this SOP
3. Contact: [Your contact info]
