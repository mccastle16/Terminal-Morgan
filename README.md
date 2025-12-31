# Coral Gables Business Intelligence Platform

AI-powered business intelligence system for local businesses in Coral Gables, FL. Generates consulting-grade PKPs (Portable Knowledge Protocols) using multi-stage LLM validation.

## The Core Question This Platform Answers

> **"Which business should I contact, and what should I say to them?"**

Instead of cold-calling 1,000 businesses blindly, users can call 20 pre-qualified leads with their specific pain points already identified.

## Who Is This For?

| User | Use Case |
|------|----------|
| **B2B Sales Teams** | Prospecting local businesses with pre-identified pain points |
| **Marketing Agencies** | Finding businesses that need digital marketing help |
| **Consultants** | Preparing pitches with business-specific insights |
| **Service Providers** | Targeting businesses with specific needs (POS, websites, etc.) |
| **Chamber of Commerce** | Member engagement and business development |

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

## Current Data Summary (Dec 2025)

```
Total businesses: 927 (10x increase from initial 88)
Chamber members: 856 verified (92.3% of database)
Businesses with phone: 829 (89.4%)
Businesses with website: 792 (85.4%)

Categories:
  164 - Professional Services (law, accounting, consulting)
  101 - Restaurants
   77 - Financial Services
   68 - Healthcare
   66 - Nonprofits
   58 - Real Estate
   43 - Retail
   31 - Spas
   26 - Education
   20 - Construction
   16 - Hospitality
   15 - Fitness

Districts: Miracle Mile, Giralda Plaza, Merrick Park, Alhambra Circle, Biltmore, Ponce de Leon

Priority Tiers:
  Tier 1: 612 businesses (highest engagement potential)
  Tier 2: 278 businesses
  Tier 3: 36 businesses
  Tier 4: 1 business

Top Businesses by Engagement Score:
  1. Books & Books (retail, 106 score)
  2. Graziano's (restaurant, 103 score)
  3. Biltmore Spa (spa, 99 score)
  4. Luca Osteria (restaurant, 95 score)
  5. Eating House (restaurant, 95 score)
```

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
| Stores and serves 927 business records | The frontend (via API calls) |
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

## Data Sources

### Primary: Chamber of Commerce Member Directory

- **844 verified Chamber members** extracted from official directory
- Contact names, phone numbers, websites, categories
- Verified membership status

### Secondary: OSINT Collection (8 agents)

| Agent | Status | Data Provided |
|-------|--------|---------------|
| **GoogleMapsAgent** | ✅ Production | Ratings, reviews, hours, location |
| **YelpAgent** | ✅ Production | Ratings, reviews, categories |
| **WebsiteAnalyzer** | ✅ Production | Services, social links |
| **FinancialEstimator** | ✅ Production | Revenue/employee estimates |
| **PainPointExtractor** | ✅ Production | LLM-based pain points |
| **CoFitAnalyzer** | ✅ Production | Solution matching |
| **ChamberAgent** | ✅ Production | Member directory data |
| **SocialMediaAnalyzer** | ⚠️ Stub | Planned for Phase 2 |

---

## Data Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              CHAMBER OF COMMERCE MEMBER DIRECTORY                    │
│                    (844 verified businesses)                         │
│        Names, contacts, phones, websites, categories                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OSINT ENRICHMENT (8 agents)                       │
│   Google Places │ Yelp │ Website Scraping │ Financial Estimates     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LLM ENRICHMENT (Claude Sonnet)                    │
│   Pain points │ Opportunities │ Technology gaps │ Categories        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSENSUS VALIDATION (5 agents)                   │
│   Industry │ Market │ Operations │ Customer │ Financial             │
│   Performance: 927 businesses in ~45 minutes                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FINAL DATABASE (927 businesses)                   │
│   coral_gables_bi_database_v2.json (2.3 MB)                         │
└─────────────────────────────────────────────────────────────────────┘
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
| **Cost** | Running 8 agents + LLM calls for 927 businesses is expensive |
| **Rate limits** | Google Places, Yelp APIs have daily quotas |
| **Speed** | Pre-computed data = instant dashboard loads |
| **Business reality** | Pain points don't change daily. Weekly is fine for B2B sales. |

### Manual Refresh

If fresher data is needed:
```bash
POST /api/v2/admin/refresh
```
This triggers an on-demand re-collection (takes 45-90 min for 927 businesses).

---

## API Endpoints

**Production**: `https://terminal-production-27a0.up.railway.app`
**Local**: `http://localhost:8000`

### Discovery & Prospecting

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/businesses` | Browse the database of 927 businesses |
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
| 3 | Multi-agent consensus | 0.8-0.95 | ✅ Implemented |
| 4 | Human validation | 0.9-1.0 | Planned |

### How Confidence Progresses

```
Stage 1: 0.35 (generic template)
    ↓
Stage 2: 0.75 (LLM validated)
    ↓
Stage 3: 0.92 (multi-agent consensus)
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
- Run with: `python weekly_refresh.py --businesses 927 --run-validation`
- **Actual performance**: 927 businesses in ~45 minutes, +16% confidence boost (0.92-0.95 final)

---

## Business Models

### Current Pricing Tiers

| Tier | Confidence | Price | Use Case |
|------|------------|-------|----------|
| Free | 0.3-0.5 (generic) | Lead gen | Discovery |
| Pro | 0.6-0.8 (validated) | $500-1,000 | Sales targeting |
| Enterprise | 0.8-0.95 (multi-agent) | $2,500-5,000 | Strategic planning |

### Potential Revenue Streams

| Model | Target | Pricing | Value |
|-------|--------|---------|-------|
| **SaaS Dashboard** | Sales teams, agencies | $99-499/mo | Pre-built lead list with pain points |
| **PKP Reports** | Individual business owners | $500-5,000 one-time | Branded PDF deliverables |
| **API Access** | Developers, CRM vendors | $0.10-1.00/lookup or $999/mo | Plug intelligence into existing workflows |
| **Lead Gen** | Service providers | $25-100/lead | Filtered leads delivered to inbox |
| **White-Label** | Consulting firms | $2,000-10,000/mo | Their brand, our engine |
| **Chamber Partnership** | Chambers of Commerce | Custom | Member intelligence for economic development |

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
                       │ (927 biz)│
                       └──────────┘
```

### Data Files

| File | Size | Contents |
|------|------|----------|
| `coral_gables_bi_database_v2.json` | 2.3 MB | 927 businesses with full profiles |
| `chamber_members_extracted.json` | 180 KB | 844 Chamber members (raw) |
| `all_businesses_merged.json` | 150 KB | Merged source data |

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

## Regenerate Database

To regenerate the full 927-business database from Chamber data:

```bash
cd systems/agents
python generate_comprehensive_bi_database.py
```

This will:
1. Load `all_businesses_merged.json` (927 businesses)
2. Generate full profiles with pain points, opportunities, scores
3. Save to `coral_gables_bi_database_v2.json`

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
├── docs/
│   ├── SOP_DATA_REFRESH.md         # Data refresh procedures
│   ├── UAT_TESTING.md              # Testing documentation
│   └── REVISED AO 7.11.2025...docx # Chamber member directory
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
│   │   ├── db_repository.py        # Data access layer
│   │   ├── consensus_validator.py  # Stage 3 multi-agent
│   │   ├── osint_production_collector.py  # Production OSINT (8 agents)
│   │   ├── generate_comprehensive_bi_database.py  # Database generator
│   │   ├── weekly_refresh.py       # Scheduled refresh script
│   │   ├── validate_all_data.py    # Batch validation script
│   │   ├── migrate_json_to_db.py   # JSON to PostgreSQL migration
│   │   └── data/                   # Output files (refresh reports)
│   │       └── refresh_report_*.txt
│   └── data/                       # ★ Canonical data directory
│       ├── coral_gables_bi_database_v2.json  # 927 businesses
│       ├── all_businesses_merged.json
│       ├── chamber_members_extracted.json
│       └── database_schema.sql
```

---

## Data Quality

### Phone Number Validation

All phone numbers are validated to ensure:
- No fake "555" numbers (reserved for fiction)
- Valid exchange codes (200-999)
- Proper formatting (XXX-XXX-XXXX)

### Chamber Verification

- 92.3% of businesses are verified Chamber members
- Chamber data includes contact names, verified phone numbers, websites
- Non-Chamber businesses are sourced from Google Places and Yelp

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

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Dec 2025 | 927 businesses, Chamber integration, phone validation |
| 2.0.0 | Dec 2025 | 88 businesses, consensus validation, async fixes |
| 1.0.0 | Nov 2025 | Initial release with 10 businesses |

---

**Owner**: Counderscore, LLC
**Location**: Coral Gables, FL
**Website**: [counderscore.com](https://counderscore.com)
