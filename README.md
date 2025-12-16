# Coral Gables Business Intelligence Platform

AI-powered business intelligence system for local businesses in Coral Gables, FL. Generates consulting-grade PKPs (Precise Knowledge Protocols) using multi-stage LLM validation.

## Key Finding

**Hypothesis confirmed**: Generic pain points from scraping have low confidence (0.3-0.5), but LLM validation increases this to 0.6-0.8 — a **68% improvement**.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API keys:
# - GOOGLE_PLACES_API_KEY (required for live data)
# - ANTHROPIC_API_KEY (required for LLM validation)
```

### 3. Start the API Server

```bash
cd systems/agents
uvicorn bi_api:app --reload
```

### 4. Start the Web Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 for the dashboard, http://localhost:8000/docs for API docs.

### 5. (Optional) Start PostgreSQL

```bash
docker compose up -d
python systems/agents/migrate_json_to_db.py
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (React)                        │
│                    localhost:3000                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI REST API                              │
│                    localhost:8000                                │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │  JSON    │    │PostgreSQL│    │  OSINT   │
       │  Data    │    │ Database │    │ Agents   │
       └──────────┘    └──────────┘    └──────────┘
```

## Project Structure

```
Terminal/
├── README.md
├── requirements.txt
├── docker-compose.yml          # PostgreSQL + pgAdmin
├── .env.example                # Environment template
├── frontend/                   # React Dashboard
│   ├── package.json
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Businesses.jsx
│   │   │   ├── BusinessDetail.jsx
│   │   │   └── Analytics.jsx
│   │   └── components/
│   │       └── Layout.jsx
│   └── vite.config.js
├── systems/
│   ├── agents/
│   │   ├── bi_api.py                       # FastAPI REST API
│   │   ├── config.py                       # Configuration management
│   │   ├── database.py                     # SQLAlchemy models
│   │   ├── repository.py                   # Data access layer
│   │   ├── google_places_collector.py      # Google Places API
│   │   ├── yelp_collector.py               # Yelp Fusion API
│   │   ├── consensus_validator.py          # Stage 3 multi-agent
│   │   ├── osint_orchestrator.py           # 8-agent OSINT system
│   │   ├── coral_gables_pkp_generator.py   # Stage 1
│   │   ├── pkp_validator.py                # Stage 2
│   │   └── migrate_json_to_db.py           # JSON → PostgreSQL
│   └── data/
│       ├── coral_gables_bi_database_v2.json
│       └── database_schema.sql
```

## 4-Stage PKP Pipeline

| Stage | Process | Confidence | Status |
|-------|---------|------------|--------|
| 1 | Generic templates | 0.3-0.5 | ✅ Implemented |
| 2 | LLM validation | 0.6-0.8 | ✅ Implemented |
| 3 | Multi-agent consensus | 0.8-0.9 | ✅ Implemented |
| 4 | Human validation | 0.9-1.0 | Planned |

### Example: Confidence Progression

```
Stage 1: 0.35 → Stage 2: 0.75 → Stage 3: 0.88
```

## API Endpoints

Base URL: `http://localhost:8000`

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v2/businesses` | List businesses (with filters) |
| `GET /api/v2/businesses/{id}` | Get business details |
| `GET /api/v2/businesses/{id}/intelligence` | Full intelligence report |
| `GET /api/v2/search/businesses?q=` | Search businesses |
| `GET /api/v2/search/pain-points?q=` | Search pain points |
| `GET /api/v2/analytics/market` | Market analytics |
| `GET /api/v2/analytics/categories/{cat}` | Category insights |
| `GET /api/v2/analytics/geographic` | Geographic analysis |
| `GET /api/v2/engagement/recommendations` | Top engagement targets |
| `GET /api/v2/engagement/pipeline` | Sales pipeline view |

## Live Data Collection

The platform can collect live data from:

- **Google Places API** ✅ - Business details, reviews, ratings
- **Yelp Fusion API** ✅ - Reviews, categories, transactions
- **TripAdvisor** (planned)
- **Social Media** (planned)

Configure API keys in `.env`:

```bash
GOOGLE_PLACES_API_KEY=your_key_here
YELP_API_KEY=your_key_here
```

## Data Summary

```
Total businesses: 88
Pain points: 268
Opportunities: 267
Solutions: 264
Categories: restaurant, spa, retail, salon, professional_services, fitness, healthcare
Districts: Giralda Plaza, Miracle Mile, Merrick Park, Alhambra Circle
```

## Tech Stack

- **Python 3.11+** - Core language
- **FastAPI** - REST API
- **React + Vite** - Web dashboard
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Claude Sonnet 4** - LLM validation
- **PostgreSQL** - Production database
- **SQLAlchemy** - ORM
- **Docker** - Container orchestration

## Business Model

| Tier | Confidence | Price |
|------|------------|-------|
| Free | 0.3-0.5 (generic) | Lead gen |
| Pro | 0.6-0.8 (validated) | $500-1,000 |
| Enterprise | 0.8-0.9 (multi-agent) | $2,500-5,000 |

**Success metric**: If 7/10 business owners validate PKPs as accurate → product viable.

---

**Client**: Counderscore, LLC
**Location**: Coral Gables, FL
