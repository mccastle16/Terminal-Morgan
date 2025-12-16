# SOP: Data Refresh Operations

## Overview

This document describes the Standard Operating Procedures for refreshing business intelligence data in the Coral Gables BI Platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA REFRESH PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Weekly     │───>│   OSINT      │───>│  Validation  │      │
│  │   Cron Job   │    │  Collectors  │    │   Pipeline   │      │
│  │  (Sunday 6AM)│    │  (8 agents)  │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │               │
│                                                  ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   FastAPI    │<───│    JSON      │<───│   Updated    │      │
│  │     API      │    │   Database   │    │    Data      │      │
│  │              │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │   Frontend   │                                               │
│  │  Dashboard   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Refresh Methods

### Method 1: Automated Weekly Refresh (Recommended)

**Schedule:** Every Sunday at 6:00 AM UTC

**Setup in Railway:**
1. Go to Railway Dashboard → Your Project
2. Click "Settings" → "Cron"
3. Add new cron job:
   - **Schedule:** `0 6 * * 0`
   - **Command:** `python weekly_refresh.py --businesses 100`

**What happens:**
1. OSINT collectors gather data from Google Maps, Yelp, etc.
2. Data is validated and confidence scores boosted
3. JSON database file is updated
4. API reloads data automatically

---

### Method 2: Manual Refresh via API

**Endpoint:** `POST /api/v2/admin/refresh`

**Usage:**
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

**Use Case:** After manually updating JSON data files

---

### Method 3: Manual Local Refresh

**Prerequisites:**
- API keys configured in `.env`
- Python environment set up

**Steps:**
```bash
# 1. Navigate to agents directory
cd systems/agents

# 2. Run OSINT collection
python osint_production_collector.py

# 3. Run validation
python validate_all_data.py

# 4. Copy validated data to production location
cp ../data/coral_gables_bi_database_validated.json data/coral_gables_bi_database_v2.json

# 5. Commit and push
git add data/coral_gables_bi_database_v2.json
git commit -m "Weekly data refresh $(date +%Y-%m-%d)"
git push

# Railway will auto-deploy with new data
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
