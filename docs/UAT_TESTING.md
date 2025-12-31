# UAT Testing Guide - Coral Gables BI Platform

## Overview

This document provides User Acceptance Testing (UAT) procedures for validating the Coral Gables BI Platform before production deployment.

**Current Database:** 927 businesses (844 verified Chamber members + 83 additional)

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

### 1.5 Phone Validation

```bash
python -c "
from osint_production_collector import validate_phone

# Test valid phone
print(f'Valid: {validate_phone(\"305-442-1234\")}')  # Should return 305-442-1234

# Test fake 555 number
print(f'Fake 555: {validate_phone(\"305-555-0101\")}')  # Should return None

# Test invalid exchange
print(f'Invalid: {validate_phone(\"305-114-1234\")}')  # Should return None
"
```

**Expected**: Valid phones formatted, invalid phones rejected

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

### 2.3 Live Run with Validation

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

**Actual Performance (Dec 2025):**
- 88 businesses: ~17 minutes
- 927 businesses: ~45 minutes (estimated)
- Confidence boost: +16% (0.75 → 0.92-0.95)

### 2.4 Regenerate Full Database

```bash
python generate_comprehensive_bi_database.py
```

**Expected Output**:
```
======================================================================
🏗️  GENERATING COMPREHENSIVE BUSINESS INTELLIGENCE DATABASE
======================================================================

📂 Loaded 927 source businesses
📊 Processing 927 businesses...
  ✓ Completed processing 927 businesses

======================================================================
✅ DATABASE GENERATED SUCCESSFULLY
======================================================================
📊 Total businesses: 927
💾 File size: 2299.7 KB

🏛️  CHAMBER MEMBERS: 856 / 927 (92.3%)
```

### 2.5 Test Consensus Validator Directly

```bash
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
  "version": "3.0.0",
  "businesses_loaded": 927,
  "data_source": "PostgreSQL"
}
```

### 3.2 List Businesses

```bash
curl http://localhost:8000/api/v2/businesses | jq '.businesses | length'
```

**Expected**: 927 (or close to it)

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
- `completeness_score`: > 0.85 (85%)
- `confidence_score`: > 0.70 (70%)
- `opportunities_count`: > 0

### 4.2 Verify Pain Points Have Confidence

```bash
curl http://localhost:8000/api/v2/businesses | jq '.businesses[0].pain_points[] | {pain_point, confidence}'
```

**Expected**: Each pain point has a confidence value (0.5-0.9)

### 4.3 Verify Chamber Member Data

```bash
curl http://localhost:8000/api/v2/businesses | jq '[.businesses[] | select(.chamber_membership.is_member == true)] | length'
```

**Expected**: ~856 (92.3% of businesses)

### 4.4 Verify Phone Data Quality

```bash
curl http://localhost:8000/api/v2/businesses | jq '[.businesses[] | select(.phone | length > 0)] | length'
```

**Expected**: ~829 businesses with phone numbers (89.4%)

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

**Expected**: Count = 927 (or close)

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

## Test 7: Data Source Validation

### 7.1 Verify Chamber Data Extraction

```bash
python -c "
import json
with open('../data/chamber_members_extracted.json') as f:
    data = json.load(f)
    print(f'Chamber members: {len(data)}')
    print(f'With phone: {sum(1 for b in data if b.get(\"phone\"))}')
    print(f'With website: {sum(1 for b in data if b.get(\"website\"))}')
"
```

**Expected**:
- Chamber members: 844
- With phone: 829+
- With website: 792+

### 7.2 Verify Merged Data

```bash
python -c "
import json
with open('../data/all_businesses_merged.json') as f:
    data = json.load(f)
    print(f'Total merged: {len(data)}')
    chamber = sum(1 for b in data if b.get('chamber_membership', {}).get('is_member'))
    print(f'Chamber members: {chamber}')
"
```

**Expected**:
- Total merged: 927
- Chamber members: 856+

---

## Test 8: Terminal UI (Quadrant & Smart Segments)

### 8.1 Smart Segments Configuration

The Terminal uses a quadrant visualization with these thresholds:

| Threshold | Value | Based On |
|-----------|-------|----------|
| `DOMINANCE_THRESHOLD` | 80 | Top ~30% of engagement scores |
| `DIGITAL_THRESHOLD` | 50 | Midpoint of digital maturity scale |

### 8.2 Segment Definitions

| Segment | Criteria | Color | Description |
|---------|----------|-------|-------------|
| **Hidden Gems** 💎 | Score ≥80, Digital <50 | Cyan | High-potential, low digital presence |
| **Local Titans** 👑 | Score ≥80, Digital ≥50 | Gold | High-performing, digitally mature |
| **Turnaround** 🔄 | Score <80, Digital ≥50 | Green | Lower score but digitally present |
| **Rebuild** ⚠️ | Score <80, Digital <50 | Red/Accent | Need comprehensive improvement |

### 8.3 Digital Maturity Calculation

Digital Maturity score (0-100) is calculated based on online presence:

| Factor | Points |
|--------|--------|
| Has website | +25 |
| Has Instagram | +20 |
| Has Facebook | +15 |
| Has email | +15 |
| Has Google rating | +15 |
| Has Yelp rating | +10 |
| **Maximum** | **100** |

### 8.4 Terminal UI Verification

```bash
# Start frontend
cd frontend && npm run dev

# Verify in browser at http://localhost:3000
```

**Test Checklist:**

| Feature | Expected | Status |
|---------|----------|--------|
| Quadrant is square (1:1 aspect ratio) | ✓ | [ ] Pass |
| All 4 segments show dots when businesses exist | ✓ | [ ] Pass |
| Segment filter matches quadrant coloring | ✓ | [ ] Pass |
| District filter works | ✓ | [ ] Pass |
| Business search works | ✓ | [ ] Pass |
| Table columns are sortable (Name, Sector, Alpha, Fit) | ✓ | [ ] Pass |
| Clicking business highlights in quadrant | ✓ | [ ] Pass |
| Dossier panel shows on business selection | ✓ | [ ] Pass |

### 8.5 Segment Distribution Verification

```bash
# Check data distribution via API
curl http://localhost:8000/api/v2/businesses | python3 -c "
import json, sys
data = json.load(sys.stdin)
businesses = data.get('businesses', [])

def calc_digital(b):
    score = 0
    if b.get('website'): score += 25
    social = b.get('social_media', {}) or {}
    if social.get('instagram'): score += 20
    if social.get('facebook'): score += 15
    emails = b.get('email', []) or []
    if len(emails) > 0: score += 15
    ratings = b.get('ratings', {}) or {}
    if ratings.get('google'): score += 15
    if ratings.get('yelp'): score += 10
    return min(score, 100)

gems = turnaround = titans = rebuild = 0
for b in businesses:
    score = min(b.get('engagement_score', 0), 100)
    digital = calc_digital(b)
    if score >= 80 and digital < 50: gems += 1
    elif score >= 80 and digital >= 50: titans += 1
    elif score < 80 and digital >= 50: turnaround += 1
    else: rebuild += 1

print(f'Hidden Gems: {gems}')
print(f'Local Titans: {titans}')
print(f'Turnaround: {turnaround}')
print(f'Rebuild: {rebuild}')
print(f'Total: {len(businesses)}')
"
```

**Expected Distribution** (for 927 businesses):
- Hidden Gems: ~100-200
- Local Titans: ~400-600
- Turnaround: ~50-150
- Rebuild: ~5-20

---

## Acceptance Criteria

| Test | Criteria | Status |
|------|----------|--------|
| Agent Tests | All 6 core agents return data | [ ] Pass |
| Orchestrator | Completes with SUCCESS status | [ ] Pass |
| Database Generator | Creates 927 businesses | [ ] Pass |
| Validation | Completes with --run-validation | [ ] Pass |
| API Health | Returns healthy status, 927 businesses | [ ] Pass |
| Data Quality | Completeness >= 85%, Chamber >= 92% | [ ] Pass |
| Phone Validation | No fake 555 numbers, valid exchanges | [ ] Pass |
| Database | Connection successful, 927 records | [ ] Pass |
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
3. Limit businesses with `--businesses 100` for testing
4. Timeout scales: 5 min/business (max 10 hours)

### Phone Numbers Invalid

**Symptom**: Fake "555" or invalid exchange numbers in data

**Solution**:
Phone validation is built in:
- Rejects 555 exchange (reserved for fiction)
- Rejects exchanges < 200
- Run `generate_comprehensive_bi_database.py` to regenerate clean data

---

## Data Quality Targets

| Metric | Target | Current |
|--------|--------|---------|
| Total businesses | 900+ | 927 |
| Chamber members | 90%+ | 92.3% |
| With phone | 85%+ | 89.4% |
| With website | 80%+ | 85.4% |
| Avg confidence | 0.85+ | 0.92-0.95 |
| Tier 1 businesses | 500+ | 612 |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Dec 2025 | 927 businesses, Chamber integration, phone validation |
| 2.0.0 | Dec 2025 | 88 businesses, consensus validation |
| 1.0.0 | Nov 2025 | Initial 10-business release |

---

*Last Updated: December 2025*
