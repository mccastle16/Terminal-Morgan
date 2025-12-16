# SOP: Data Refresh Operations

## Overview

This document describes the Standard Operating Procedures for refreshing business intelligence data in the Coral Gables BI Platform.

---

## Production Services (Railway)

| Service | URL | Purpose |
|---------|-----|---------|
| **Terminal** | `terminal-production-27a0.up.railway.app` | Main API (24/7) |
| **Terminal Cron Service** | `terminal-cron-service-production.up.railway.app` | Weekly refresh (Sunday 6 AM UTC) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA REFRESH PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Terminal Cron    │───>│   OSINT      │───>│  Validation  │  │
│  │ Service          │    │  Collectors  │    │   Pipeline   │  │
│  │ (Sunday 6AM UTC) │    │  (8 agents)  │    │              │  │
│  └──────────────────┘    └──────────────┘    └──────────────┘  │
│                                                  │               │
│                                                  ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Terminal   │<───│    JSON      │<───│   Updated    │      │
│  │   (Main API) │    │   Database   │    │    Data      │      │
│  │              │    │              │    │              │      │
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
2. OSINT collectors gather data from Google Maps, Yelp, etc.
3. Data is validated and confidence scores boosted
4. JSON database file is updated
5. Main API refresh endpoint is called

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
  "businesses_loaded": 88,
  "refreshed_at": "2025-12-16T12:00:00"
}
```

**Check status:**
```bash
curl "https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh-status"
```

---

### Method 4: Manual Local Refresh (Full Pipeline - Development)

**Use when:** Testing locally or debugging the refresh pipeline

**Prerequisites:**
- API keys configured in `.env`
- Python environment set up

**Steps:**
```bash
# 1. Navigate to agents directory
cd systems/agents

# 2. Run the weekly refresh script
python weekly_refresh.py --businesses 100

# OR run individual steps:

# 2a. Run OSINT collection only
python osint_production_collector.py

# 2b. Run validation only
python validate_all_data.py

# 3. Copy validated data to production location
cp ../data/coral_gables_bi_database_validated.json data/coral_gables_bi_database_v2.json

# 4. Commit and push (triggers Railway auto-deploy)
git add data/coral_gables_bi_database_v2.json
git commit -m "Weekly data refresh $(date +%Y-%m-%d)"
git push
```

---

## Environment Variables

Set these in Railway Dashboard → Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key |
| `YELP_API_KEY` | Optional | Yelp Fusion API key |
| `ANTHROPIC_API_KEY` | Recommended | For LLM validation |
| `ADMIN_API_KEY` | Yes | Secret key for admin endpoints |
| `API_URL` | Optional | Production API URL |

---

## Monitoring

### Check Last Refresh Status

```bash
curl "https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh-status"
```

**Response:**
```json
{
  "last_refresh": "2025-12-16T06:00:00",
  "businesses_loaded": 88,
  "data_source": "JSON"
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

### Issue: Validation fails

**Cause:** Missing Anthropic API key

**Solution:**
1. Add `ANTHROPIC_API_KEY` to environment
2. Or run with `--skip-validation` for heuristic-only mode

---

## Cost Estimates

| API | Free Tier | Cost Beyond |
|-----|-----------|-------------|
| Google Places | 200 requests/day | $17/1000 requests |
| Yelp Fusion | 500 requests/day | Contact for pricing |
| Anthropic | Pay-per-use | ~$0.01 per validation |

**Weekly refresh cost (100 businesses):**
- Google: ~$1.70
- Yelp: Free (within tier)
- Anthropic: ~$2.00
- **Total: ~$4/week or ~$16/month**

---

## Data Freshness Policy

| Tier | Refresh Frequency | Staleness Tolerance |
|------|-------------------|---------------------|
| Tier 1 (Hot leads) | Weekly | 7 days max |
| Tier 2-3 | Bi-weekly | 14 days max |
| Tier 4 | Monthly | 30 days max |

---

## Runbook: Weekly Refresh Checklist

- [ ] Verify API keys are valid (check Railway logs)
- [ ] Check cron job is scheduled
- [ ] Monitor refresh job execution
- [ ] Verify data loaded count matches expected
- [ ] Spot-check 2-3 business records for accuracy
- [ ] Check dashboard loads correctly
- [ ] Review any error logs

---

## Contact

For issues with data refresh:
1. Check Railway logs first
2. Review this SOP
3. Contact: [Your contact info]
