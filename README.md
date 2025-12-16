# Coral Gables Business Intelligence Platform

AI-powered business intelligence system for local businesses in Coral Gables, FL. Generates consulting-grade PKPs (Precise Knowledge Protocols) using multi-stage LLM validation.

## Key Finding

**Hypothesis confirmed**: Generic pain points from scraping have low confidence (0.3-0.5), but LLM validation increases this to 0.6-0.8 — a **68% improvement**.

## Quick Start

```bash
# Generate PKP for a business
cd systems/agents
python coral_gables_pkp_generator.py

# Validate with LLM reasoning
python pkp_validator.py

# Generate Top 100 database
python generate_top_100_pkp.py

# Start the API server
pip install fastapi uvicorn pydantic
uvicorn bi_api:app --reload
```

## API Endpoints

Base URL: `http://localhost:8000`

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v2/businesses` | List all businesses (with filters) |
| `GET /api/v2/businesses/{id}` | Get business details |
| `GET /api/v2/search/businesses?q=` | Search businesses |
| `GET /api/v2/analytics/market` | Market analytics |
| `GET /api/v2/engagement/recommendations` | Top engagement targets |

Full docs at: `http://localhost:8000/docs`

## Project Structure

```
Terminal/
├── README.md
├── systems/
│   ├── agents/
│   │   ├── coral_gables_pkp_generator.py   # Stage 1: Initial PKP generation
│   │   ├── pkp_validator.py                # Stage 2: LLM validation
│   │   ├── generate_top_100_pkp.py         # Batch PKP generator
│   │   ├── bi_api.py                       # FastAPI REST API
│   │   ├── osint_orchestrator.py           # Multi-agent OSINT coordinator
│   │   └── osint_production_collector.py   # Production data collector
│   └── data/
│       ├── coral_gables_bi_database_v2.json      # Main BI database (88 businesses)
│       ├── coral_gables_top_100_businesses_pkp.json
│       ├── books_and_books_pkp_refined.json      # Example refined PKP
│       └── database_schema.sql                   # PostgreSQL schema
```

## How It Works

### 4-Stage PKP Pipeline

| Stage | Process | Confidence | Status |
|-------|---------|------------|--------|
| 1 | Generic templates | 0.3-0.5 | Implemented |
| 2 | LLM validation | 0.6-0.8 | Implemented |
| 3 | Multi-agent consensus | 0.8-0.9 | Future |
| 4 | Human validation | 0.9-1.0 | Future |

### Example: Before vs After

**Before (Stage 1)**
```json
{
  "point": "Foot traffic predictability",
  "confidence": 0.3,
  "evidence": "Generic retail assumption"
}
```

**After (Stage 2)**
```json
{
  "point": "Weekend capacity management and staff scheduling",
  "confidence": 0.75,
  "evidence": "Heavy foot traffic on weekends",
  "reasoning": "Independent bookstores struggle with variable weekend demand",
  "mitigation": ["Dynamic staff scheduling", "Reservation system for study spaces"]
}
```

## Data Summary

```
Total businesses: 88
Pain points: 268
Opportunities: 267
Solutions: 264
Categories: restaurant, spa, retail, salon, professional_services, fitness, healthcare
```

## Tech Stack

- **Python 3.11+** - Core language
- **FastAPI** - REST API
- **Claude Sonnet 4** - LLM validation
- **PostgreSQL + pgvector** - Production database (schema ready)
- **AsyncIO** - Async data collection

## Business Model

| Tier | Confidence | Price |
|------|------------|-------|
| Free | 0.3-0.5 (generic) | Lead gen |
| Pro | 0.6-0.8 (validated) | $500-1,000 |
| Enterprise | 0.8-0.9 (multi-agent) | $2,500-5,000 |

**Success metric**: If 7/10 business owners validate PKPs as accurate → product viable.

## Next Steps

1. Validate with 10 real Coral Gables businesses
2. Implement Stage 3 (multi-agent consensus)
3. Connect API to PostgreSQL
4. Build web frontend

---

**Client**: Counderscore, LLC
**Location**: Coral Gables, FL
