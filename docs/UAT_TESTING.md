# UAT Testing Guide - Coral Gables BI Platform

## Overview

This document provides User Acceptance Testing (UAT) procedures for validating the Coral Gables BI Platform before production deployment.

---

## Pre-Requisites

### Environment Setup

1. **API Keys Configured** (in `.env` at project root):
   ```bash
   GOOGLE_PLACES_API_KEY=your_google_key
   YELP_API_KEY=your_yelp_key
   ANTHROPIC_API_KEY=your_anthropic_key
   ADMIN_API_KEY=your_admin_key
   ```

2. **Verify Configuration**:
   ```bash
   cd systems/agents
   python -c "from config import settings; settings.print_status()"
   ```

   Expected output:
   ```
   Configuration Status:
     Google Places API: ✓ Configured
     Yelp API: ✓ Configured
     Anthropic API: ✓ Configured
     Database URL: postgresql://...
     Environment: development
   ```

---

## Test 1: Individual Agent Testing

### 1.1 Google Maps Agent

```bash
cd systems/agents
python -c "
import asyncio
from osint_production_collector import GoogleMapsAgent

async def test():
    async with GoogleMapsAgent() as agent:
        result = await agent.search_business('Luca Osteria', 'restaurant')
        print(f'Name: {result.get(\"name\")}')
        print(f'Rating: {result.get(\"rating\")}')
        print(f'Confidence: {result.get(\"confidence\")}')

asyncio.run(test())
"
```

**Expected**: Name, rating, and confidence (0.9) returned

### 1.2 Yelp Agent

```bash
python -c "
import asyncio
from osint_production_collector import YelpAgent

async def test():
    async with YelpAgent() as agent:
        result = await agent.search_business('Luca Osteria', 'restaurant')
        print(f'Name: {result.get(\"name\")}')
        print(f'Rating: {result.get(\"rating\")}')
        print(f'Reviews: {result.get(\"review_count\")}')

asyncio.run(test())
"
```

**Expected**: Name, rating, and review count returned

### 1.3 Website Analyzer

```bash
python -c "
import asyncio
from osint_production_collector import WebsiteAnalyzer

async def test():
    async with WebsiteAnalyzer() as analyzer:
        result = await analyzer.analyze('https://lucaosteria.com')
        print(f'Has Online Ordering: {result.get(\"has_online_ordering\")}')
        print(f'Has Reservations: {result.get(\"has_reservations\")}')

asyncio.run(test())
"
```

**Expected**: Technology indicators detected

### 1.4 Pain Point Extractor

```bash
python -c "
import asyncio
from osint_production_collector import PainPointExtractor

async def test():
    extractor = PainPointExtractor()
    result = await extractor.extract({
        'name': 'Test Restaurant',
        'category': 'restaurant',
        'rating': 3.5,
        'reviews': ['Service was slow', 'Food was cold']
    })
    print(f'Pain Points: {len(result)}')
    for pp in result[:3]:
        print(f'  - {pp.get(\"pain_point\")}')

asyncio.run(test())
"
```

**Expected**: Multiple pain points identified

---

## Test 2: Orchestrator (Full Pipeline)

### 2.1 Dry Run (10 Businesses)

```bash
cd systems/agents
python weekly_refresh.py --businesses 10 --dry-run
```

**Expected Output**:
```
[INFO] WEEKLY DATA REFRESH STARTING
[INFO] Creating/verifying database tables...
[INFO] Database migrations checked/applied
[WARN] DRY RUN MODE - No production changes will be made
[INFO] Starting OSINT collection for up to 10 businesses...
[INFO] OSINT collection complete: X businesses collected
...
STATUS: SUCCESS
```

### 2.2 Live Run (10 Businesses)

```bash
python weekly_refresh.py --businesses 10
```

**Expected**: Data saved to PostgreSQL or JSON, report generated

### 2.3 Live Run with Validation (10 Businesses)

```bash
python weekly_refresh.py --businesses 10 --run-validation
```

**Expected Output**:
```
[INFO] OSINT collection complete: 10 businesses collected
[INFO] Starting validation pipeline...
[INFO] Validation timeout set to 1800 seconds (30 minutes)
...
[INFO] Validation complete
STATUS: SUCCESS
```

**Validation Details**:
- Uses async concurrent API calls (5 agents in parallel)
- Each LLM call has 30-second timeout
- Falls back to heuristic validation on timeout
- Expected completion: 2-5 minutes for 10 businesses

### 2.4 Test Consensus Validator Directly

```bash
cd systems/agents
python consensus_validator.py
```

**Expected**: Demo output showing pain point validation with confidence scores

---

## Test 3: API Endpoints

### 3.1 Health Check

```bash
curl http://localhost:8000/health
```

**Expected**:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "businesses_loaded": 88,
  "data_source": "PostgreSQL"
}
```

### 3.2 List Businesses

```bash
curl http://localhost:8000/api/v2/businesses | jq '.businesses | length'
```

**Expected**: Number of businesses (88+)

### 3.3 Search Pain Points

```bash
curl "http://localhost:8000/api/v2/search/pain-points?q=marketing" | jq '.results | length'
```

**Expected**: Multiple results

### 3.4 Admin Refresh (Protected)

```bash
curl -X POST "http://localhost:8000/api/v2/admin/refresh?api_key=$ADMIN_API_KEY"
```

**Expected**: Success response with businesses_loaded count

**Without API Key**:
```bash
curl -X POST "http://localhost:8000/api/v2/admin/refresh"
```

**Expected**: 401 Unauthorized or 503 Not Configured

---

## Test 4: Data Quality Validation

### 4.1 Check Data Completeness

```bash
curl http://localhost:8000/api/v2/data-quality/overview | jq
```

**Expected Metrics**:
- `completeness_score`: > 0.80 (80%)
- `confidence_score`: > 0.70 (70%)
- `opportunities_count`: > 0

### 4.2 Verify Pain Points Have Confidence

```bash
curl http://localhost:8000/api/v2/businesses | jq '.businesses[0].pain_points[] | {pain_point, confidence}'
```

**Expected**: Each pain point has a confidence value (0.5-0.9)

---

## Test 5: Database Validation

### 5.1 Test Connection

```bash
cd systems/agents
python database.py test
```

**Expected**: `Database connection successful`

### 5.2 Verify Tables Exist

```bash
python -c "
from database import get_session, Business
session = get_session()
count = session.query(Business).count()
print(f'Businesses in DB: {count}')
session.close()
"
```

**Expected**: Count > 0

### 5.3 Verify Auto-Migrations on Startup

```bash
python -c "
from sqlalchemy import inspect
from database import get_sync_engine

engine = get_sync_engine()
inspector = inspect(engine)
tables = inspector.get_table_names()

expected = ['businesses', 'pain_points', 'opportunities', 'co_fit_solutions']
missing = [t for t in expected if t not in tables]

if missing:
    print(f'ERROR: Missing tables: {missing}')
else:
    print('SUCCESS: All expected tables exist')
    print(f'Tables found: {tables}')
"
```

**Expected**: All tables exist (auto-created by migrations)

---

## Test 6: Security Validation

### 6.1 CORS Check (Production)

```bash
curl -I -X OPTIONS https://terminal-production-27a0.up.railway.app/api/v2/businesses \
  -H "Origin: https://malicious-site.com"
```

**Expected**: No `Access-Control-Allow-Origin: *` in production

### 6.2 Admin Endpoint Protection

```bash
curl -X POST https://terminal-production-27a0.up.railway.app/api/v2/admin/refresh
```

**Expected**: 401 or 503 (not 200)

---

## Acceptance Criteria

| Test | Criteria | Status |
|------|----------|--------|
| Agent Tests | All 6 core agents return data | [ ] Pass |
| Orchestrator | Completes with SUCCESS status | [ ] Pass |
| Validation | Completes with --run-validation (async, <5 min for 10 biz) | [ ] Pass |
| API Health | Returns healthy status | [ ] Pass |
| Data Quality | Completeness >= 85% (target: 89%) | [ ] Pass |
| Database | Connection successful | [ ] Pass |
| Auto-Migrations | Tables created on startup | [ ] Pass |
| Security | Admin endpoints protected | [ ] Pass |
| CORS | Configured origins allowed | [ ] Pass |

---

## Troubleshooting

### API Keys Not Loading

**Symptom**: Agents fallback to scraping (0.3 confidence)

**Solution**:
1. Ensure `.env` is in project root (`Terminal/`)
2. Verify with `python -c "from config import settings; settings.print_status()"`

### Database Connection Failed

**Symptom**: `Database connection failed` error

**Solution**:
1. Check `DATABASE_URL` environment variable
2. Verify PostgreSQL is running
3. Test with `python database.py test`

### Validation Timeout

**Symptom**: Script hangs during validation

**Solution**:
1. Validation is skipped by default
2. Only run with `--run-validation` if ANTHROPIC_API_KEY is configured
3. Limit businesses with `--businesses 10` for testing

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

*Last Updated: December 2025*
