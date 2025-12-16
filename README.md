# Coral Gables Business Intelligence Platform

AI-powered business intelligence system for local businesses in Coral Gables, FL. Generates consulting-grade PKPs (Portable Knowledge Protocols) using multi-stage LLM validation.

## Live Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Dashboard | Netlify | [co-terminal.netlify.app](https://co-terminal.netlify.app) |
| API | Railway | [terminal-production-27a0.up.railway.app](https://terminal-production-27a0.up.railway.app) |
| API Docs | Railway | [/docs](https://terminal-production-27a0.up.railway.app/docs) |

## Key Finding

**Hypothesis confirmed**: Generic pain points from scraping have low confidence (0.3-0.5), but LLM validation increases this to 0.6-0.8 — a **68% improvement**.

## Quick Start

### Local Development

#### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

| API | Required | Get it from |
|-----|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `ANTHROPIC_API_KEY` | Yes | [Anthropic Console](https://console.anthropic.com/) |
| `YELP_API_KEY` | No | [Yelp Developers](https://www.yelp.com/developers/v3/manage_app) |

Verify your configuration:
```bash
cd systems/agents
python -c "from config import settings; settings.print_status()"
```

#### 3. Start the API Server

```bash
cd systems/agents
uvicorn bi_api:app --reload
```

#### 4. Start the Web Dashboard

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 for the dashboard, http://localhost:8000/docs for API docs.

#### 5. Configure Database (Optional)

**Option A: Local (Docker)**
```bash
docker compose up -d
python systems/agents/migrate_json_to_db.py
```

**Option B: Cloud (Neon - recommended for production)**
1. Sign up at [neon.tech](https://neon.tech) (free tier available)
2. Create a new project and database
3. Copy the connection string and update `.env`:
```bash
DATABASE_URL=postgresql://user:pass@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Deployment

### Backend (Railway)

The FastAPI backend is deployed on Railway from `systems/agents/`.

**Configuration:**
- **Root Directory**: `systems/agents`
- **Build Command**: Auto-detected (pip install)
- **Start Command**: `uvicorn bi_api:app --host 0.0.0.0 --port $PORT`
- **Python Version**: 3.11 (set in `runtime.txt`)

**Key Files:**
- `Procfile` - Railway/Heroku start command
- `runtime.txt` - Python version specification
- `requirements.txt` - Python dependencies
- `data/` - Bundled JSON data files for deployment

**Environment Variables (Railway):**
- `ANTHROPIC_API_KEY` - For LLM validation
- `GOOGLE_PLACES_API_KEY` - For data collection
- `YELP_API_KEY` - For data collection (optional)

### Frontend (Netlify)

The React dashboard is deployed on Netlify from `frontend/`.

**Configuration:**
- **Base Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Production Branch**: `main`

**Environment Variables (Netlify):**
- `VITE_API_URL` - Railway API URL (for build-time embedding)

**API Proxy:**
The `netlify.toml` configures redirects to proxy `/api/*` requests to the Railway backend:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://terminal-production-27a0.up.railway.app/api/:splat"
  status = 200
  force = true
```

## Architecture

### Production

```
┌─────────────────────────────────────────────────────────────────┐
│                  Web Dashboard (React + Vite)                    │
│                    co-terminal.netlify.app                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ /api/* proxy
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI REST API                              │
│              terminal-production-27a0.up.railway.app             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                       ┌──────────┐
                       │  JSON    │
                       │  Data    │
                       │ (88 biz) │
                       └──────────┘
```

### Local Development

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (React)                        │
│                    localhost:3000                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Vite proxy
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
├── docker-compose.yml              # PostgreSQL + pgAdmin
├── .env.example                    # Environment template
├── frontend/                       # React Dashboard (Netlify)
│   ├── package.json
│   ├── netlify.toml                # Netlify config + API proxy
│   ├── vite.config.js
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Businesses.jsx
│   │   │   ├── BusinessDetail.jsx
│   │   │   └── Analytics.jsx
│   │   └── components/
│   │       └── Layout.jsx
├── systems/
│   ├── agents/                     # FastAPI Backend (Railway)
│   │   ├── Procfile                # Railway start command
│   │   ├── runtime.txt             # Python version (3.11)
│   │   ├── requirements.txt        # Python dependencies
│   │   ├── bi_api.py               # FastAPI REST API
│   │   ├── config.py               # Configuration management
│   │   ├── database.py             # SQLAlchemy models
│   │   ├── repository.py           # Data access layer
│   │   ├── google_places_collector.py
│   │   ├── yelp_collector.py
│   │   ├── consensus_validator.py  # Stage 3 multi-agent
│   │   ├── osint_orchestrator.py   # 8-agent OSINT system
│   │   ├── coral_gables_pkp_generator.py
│   │   ├── pkp_validator.py
│   │   ├── migrate_json_to_db.py
│   │   └── data/                   # Bundled data for deployment
│   │       ├── coral_gables_bi_database_v2.json
│   │       └── coral_gables_top_100_businesses_pkp.json
│   └── data/                       # Original data files
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

**Production**: `https://terminal-production-27a0.up.railway.app`
**Local**: `http://localhost:8000`

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /docs` | Swagger UI (interactive API docs) |
| `GET /api/v2/businesses` | List businesses (with filters) |
| `GET /api/v2/businesses/{id}` | Get business details |
| `GET /api/v2/businesses/{id}/intelligence` | Full intelligence report |
| `GET /api/v2/search/businesses?q=` | Search businesses |
| `GET /api/v2/search/pain-points?q=` | Search pain points |
| `GET /api/v2/analytics/market` | Market analytics |
| `GET /api/v2/analytics/categories/{cat}` | Category insights |
| `GET /api/v2/analytics/geographic` | Geographic analysis |
| `GET /api/v2/opportunities/prioritized` | Prioritized opportunities |
| `GET /api/v2/engagement/recommendations` | Top engagement targets |
| `GET /api/v2/engagement/pipeline` | Sales pipeline view |
| `GET /api/v2/data-quality/overview` | Data quality metrics |
| `GET /api/v2/export/json` | Export data as JSON |
| `GET /api/v2/admin/stats` | System statistics |

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

## Current Data Summary

```
Total businesses: 88
Pain points: 268
Opportunities: 267
Solutions: 264
Average engagement score: 80.1
Data completeness: 75%

Categories: Restaurant, Professional Services, Retail, Salon, Fitness, Healthcare, Spa
Districts: Miracle Mile, Giralda Plaza, Merrick Park, Alhambra Circle, Biltmore

Top Tier 1 Businesses:
- Books & Books (retail, 100 score)
- Graziano's (restaurant, 100 score)
- Luca Osteria (restaurant, 95 score)
- Pecan's Day Spa (spa, 95 score)
- Biltmore Spa (spa, 95 score)
```

## Tech Stack

- **Python 3.11** - Core language
- **FastAPI** - REST API
- **React 18 + Vite** - Web dashboard
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Claude Sonnet 4** - LLM validation
- **PostgreSQL** - Production database (optional)
- **SQLAlchemy 2.0** - ORM
- **Railway** - Backend hosting
- **Netlify** - Frontend hosting

## Business Model

| Tier | Confidence | Price |
|------|------------|-------|
| Free | 0.3-0.5 (generic) | Lead gen |
| Pro | 0.6-0.8 (validated) | $500-1,000 |
| Enterprise | 0.8-0.9 (multi-agent) | $2,500-5,000 |

**Success metric**: If 7/10 business owners validate PKPs as accurate → product viable.

---

**Owner**: Counderscore, LLC
**Location**: Coral Gables, FL
