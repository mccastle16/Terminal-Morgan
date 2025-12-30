# Coral Gables Business Intelligence Platform

AI-powered business intelligence system for local businesses in Coral Gables, FL. Generates consulting-grade PKPs (Portable Knowledge Protocols) using multi-stage LLM validation.

## The Core Question This Platform Answers

> **"Which business should I contact, and what should I say to them?"**

Instead of cold-calling 100 businesses blindly, users can call 10 pre-qualified leads with their specific pain points already identified.

## Who Is This For?

| User | Use Case |
|------|----------|
| **B2B Sales Teams** | Prospecting local businesses with pre-identified pain points |
| **Marketing Agencies** | Finding businesses that need digital marketing help |
| **Consultants** | Preparing pitches with business-specific insights |
| **Service Providers** | Targeting businesses with specific needs (POS, websites, etc.) |

## Value Proposition

**Without this platform:** Sales rep cold-calls businesses blindly, guessing at their needs.

**With this platform:** Sales rep sees "Pain Point: Manual reservation system (confidence 0.85)" and crafts a targeted pitch.

## Live Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Dashboard | Netlify | [co-terminal.netlify.app](https://co-terminal.netlify.app) |
| API | Railway | [terminal-production-27a0.up.railway.app](https://terminal-production-27a0.up.railway.app) |
| API Docs | Railway | [/docs](https://terminal-production-27a0.up.railway.app/docs) |

## Key Finding

**Hypothesis confirmed**: Generic pain points from scraping have low confidence (0.3-0.5), but LLM validation increases this to 0.6-0.8 — a **68% improvement**.

---

## Frontend vs Backend

### Frontend (React Dashboard)

**Purpose:** Visual interface for non-technical sales users

| What It Does | Who Uses It |
|--------------|-------------|
| Browse businesses without writing API calls | Sales reps prospecting leads |
| Filter by category, district, tier | Account managers researching clients |
| View business intelligence reports | Consultants preparing pitches |
| See charts and analytics | Anyone who doesn't want to use `curl` |

**Important:** The frontend displays a **snapshot** of data from the last refresh. It is not real-time.

### Backend (FastAPI API)

**Purpose:** The intelligence engine that does the heavy lifting

| What It Does | Who Uses It |
|--------------|-------------|
| Stores and serves 88 business records | The frontend (via API calls) |
| Runs 8 OSINT agents for data collection | Developers building integrations |
| Calls Claude LLM for pain point extraction | CRM systems importing data |
| Runs 5-agent consensus validation | Anyone hitting `/api/v2/*` directly |
| Calculates engagement scores and rankings | |

---

## How The Sales Workflow Works

```
1. Market Overview     → /analytics/market           → "What does the market look like?"
2. Pick a category     → /analytics/categories/restaurant → "Focus on restaurants"
3. Get hot leads       → /engagement/recommendations → "Who should I call first?"
4. Research a lead     → /businesses/{id}/intelligence → "Tell me everything about this business"
5. Find their problems → /search/pain-points?q=marketing → "Who needs marketing help?"
6. Close the deal      → /export/json               → Export to CRM
```

---

## Data Freshness

The platform uses **batch processing**, not real-time data collection.

```
Weekly Refresh (Sundays 6am UTC)
         │
         ▼
    OSINT agents collect fresh data from Google, Yelp, public records
         │
         ▼
    Claude LLM processes & extracts pain points
         │
         ▼
    Saved to database
         │
         ▼
    API serves this static snapshot all week
         │
         ▼
    Frontend displays it
```

**If you view the dashboard on Friday, you're seeing data from last Sunday.**

### Why Batch Processing?

| Reason | Explanation |
|--------|-------------|
| **Cost** | Running 8 agents + LLM calls for 88 businesses is expensive |
| **Rate limits** | Google Places, Yelp APIs have daily quotas |
| **Speed** | Pre-computed data = instant dashboard loads |
| **Business reality** | Pain points don't change daily. Weekly is fine for B2B sales. |

### Manual Refresh

If fresher data is needed:
```bash
POST /api/v2/admin/refresh
```
This triggers an on-demand re-collection (takes 30-60 min for 100 businesses).

---

## API Endpoints

**Production**: `https://terminal-production-27a0.up.railway.app`
**Local**: `http://localhost:8000`

### Discovery & Prospecting

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/businesses` | Browse the database of businesses |
| `GET /api/v2/search/businesses?q=` | Find specific businesses by name/keyword |
| `GET /api/v2/analytics/geographic` | Identify clusters by district |
| `GET /api/v2/analytics/categories/{cat}` | Focus on a vertical (restaurants, salons, etc.) |

### Lead Qualification

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/businesses/{id}/intelligence` | Deep-dive on a single business |
| `GET /api/v2/engagement/recommendations` | **Who should I call first?** Top-ranked hot leads |
| `GET /api/v2/engagement/pipeline` | View leads organized by sales stage |
| `GET /api/v2/opportunities/prioritized` | What problems can we solve? Ranked by impact |

### Sales Enablement

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/search/pain-points?q=` | Find businesses with a specific problem |
| `GET /api/v2/analytics/market` | Market overview stats for pitches/proposals |
| `GET /api/v2/export/json` | Dump data for CRM import or offline analysis |

### Operations

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Is the API running? (for monitoring) |
| `GET /docs` | Swagger UI (interactive API docs) |
| `GET /api/v2/data-quality/overview` | How complete/reliable is our data? |
| `GET /api/v2/admin/stats` | System statistics |

---

## 4-Stage PKP Pipeline

| Stage | Process | Confidence | Status |
|-------|---------|------------|--------|
| 1 | Generic templates | 0.3-0.5 | ✅ Implemented |
| 2 | LLM validation | 0.6-0.8 | ✅ Implemented |
| 3 | Multi-agent consensus | 0.8-0.9 | ✅ Implemented |
| 4 | Human validation | 0.9-1.0 | Planned |

### How Confidence Progresses

```
Stage 1: 0.35 (generic template)
    ↓
Stage 2: 0.75 (LLM validated)
    ↓
Stage 3: 0.88 (multi-agent consensus)
```

### Multi-Agent Consensus (Stage 3)

Five AI validators with different perspectives vote on each insight:

| Agent | Perspective |
|-------|-------------|
| Industry Expert | Technical viability |
| Local Market Analyst | Coral Gables market relevance |
| Operations Consultant | Operational feasibility |
| Customer Advocate | Customer impact |
| Financial Analyst | Financial viability |

Consensus threshold: 67%. Adds 15% to confidence when reached.

**Technical Implementation:**
- Uses `AsyncAnthropic` for concurrent API calls (5 agents validate in parallel)
- 30-second timeout per LLM call with fallback to heuristic validation
- Run with: `python weekly_refresh.py --businesses 88 --run-validation`
- **Actual performance**: 88 businesses in ~17 minutes, +16% confidence boost (0.92-0.95 final)

---

## Business Models

### Current Pricing Tiers

| Tier | Confidence | Price | Use Case |
|------|------------|-------|----------|
| Free | 0.3-0.5 (generic) | Lead gen | Discovery |
| Pro | 0.6-0.8 (validated) | $500-1,000 | Sales targeting |
| Enterprise | 0.8-0.9 (multi-agent) | $2,500-5,000 | Strategic planning |

### Potential Revenue Streams

| Model | Target | Pricing | Value |
|-------|--------|---------|-------|
| **SaaS Dashboard** | Sales teams, agencies | $99-499/mo | Pre-built lead list with pain points |
| **PKP Reports** | Individual business owners | $500-5,000 one-time | Branded PDF deliverables |
| **API Access** | Developers, CRM vendors | $0.10-1.00/lookup or $999/mo | Plug intelligence into existing workflows |
| **Lead Gen** | Service providers | $25-100/lead | Filtered leads delivered to inbox |
| **White-Label** | Consulting firms | $2,000-10,000/mo | Their brand, our engine |

**Success metric**: If 7/10 business owners validate PKPs as accurate → product viable.

---

## Architecture

### Production

```
┌─────────────────────────────────────────────────────────────────┐
│                  Web Dashboard (React + Vite)                    │
│                    co-terminal.netlify.app                       │
│                                                                  │
│   Purpose: Visual interface for sales teams to browse leads,    │
│   filter businesses, and view intelligence reports              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ /api/* proxy
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI REST API                              │
│              terminal-production-27a0.up.railway.app             │
│                                                                  │
│   Purpose: Intelligence engine - data storage, OSINT agents,    │
│   LLM processing, scoring, and API delivery                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                       ┌──────────┐
                       │  JSON    │
                       │  Data    │
                       │ (88 biz) │
                       └──────────┘
```

### Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    OSINT Collection (8 agents)                   │
│   Google Places │ Yelp │ Public Records │ Social Media          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Enrichment (Claude Sonnet)                │
│   Pain points │ Opportunities │ Technology gaps                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Consensus Validation (5 agents)               │
│   Industry │ Market │ Operations │ Customer │ Financial         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Aggregation & Delivery                    │
│   Engagement scores │ Rankings │ Recommendations                 │
└─────────────────────────────────────────────────────────────────┘
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

---

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

---

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
- `GOOGLE_PLACES_API_KEY` - For data collection (Google Places API New v1)
- `YELP_API_KEY` - For data collection (optional)
- `ADMIN_API_KEY` - **Required** for admin endpoints (generate: `openssl rand -hex 32`)
- `CORS_ORIGINS` - **Required for production** - Comma-separated allowed origins (e.g., `https://co-terminal.netlify.app`). **WARNING: defaults to `*` if not set**
- `DATABASE_URL` - PostgreSQL connection string (Railway auto-provides)

**Note:** Database migrations run automatically on startup. Validation is skipped by default for performance - use `--run-validation` flag when running `weekly_refresh.py` manually.

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

---

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

---

## Live Data Collection

The platform uses 8 OSINT agents for data collection:

### Agent Status (as of Dec 2025)

| Agent | Status | Confidence | Notes |
|-------|--------|------------|-------|
| **GoogleMapsAgent** | ✅ Production | 0.9 | Google Places API (New) v1 |
| **YelpAgent** | ✅ Production | 0.9 | Yelp Fusion API v3 |
| **WebsiteAnalyzer** | ✅ Production | 0.6 | Scrapes business websites |
| **FinancialEstimator** | ✅ Production | 0.6 | Revenue/employee estimates |
| **PainPointExtractor** | ✅ Production | 0.7 | LLM-based pain point extraction |
| **CoFitAnalyzer** | ✅ Production | 0.7 | Solution matching |
| **ChamberAgent** | ⚠️ Stub | - | Manual data (use member list) |
| **SocialMediaAnalyzer** | ⚠️ Stub | - | Planned for Phase 2 |

### Data Quality (after API integration)

| Metric | Before | After |
|--------|--------|-------|
| Data Completeness | 41% | 89% |
| Average Confidence | 50% | 85% |
| Opportunities Found | 0 | 267+ |

Configure API keys in `.env`:

```bash
GOOGLE_PLACES_API_KEY=your_key_here
YELP_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

---

## Current Data Summary (Dec 2025)

```
Total businesses: 88
Pain points: 14 (validated)
Opportunities: 35 (validated)
Average completeness: 78.9%
Average confidence: 71.2% (pre-validation) → 92% (post-validation)
Validation boost: +16%
Confidence range: 0.92 - 0.95

Categories: Restaurant, Professional Services, Retail, Salon, Fitness, Healthcare, Spa
Districts: Miracle Mile, Giralda Plaza, Merrick Park, Alhambra Circle, Biltmore

Top Tier 1 Businesses:
- Books & Books (retail, 100 score)
- Graziano's (restaurant, 100 score)
- Luca Osteria (restaurant, 95 score)
- Pecan's Day Spa (spa, 95 score)
- Biltmore Spa (spa, 95 score)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | Python 3.11 |
| **API Framework** | FastAPI |
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **Charts** | Recharts |
| **LLM** | Claude Sonnet 4 |
| **Database** | PostgreSQL (optional) |
| **ORM** | SQLAlchemy 2.0 |
| **Backend Hosting** | Railway |
| **Frontend Hosting** | Netlify |

---

**Owner**: Counderscore, LLC
**Location**: Coral Gables, FL
**Website**: [counderscore.com](https://counderscore.com)
