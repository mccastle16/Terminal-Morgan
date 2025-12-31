# Coral Gables BI Platform - Codebase Architecture

**Version:** 2.1
**Last Updated:** December 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Data Pipeline](#5-data-pipeline)
6. [Agent System](#6-agent-system)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Configuration](#9-configuration)
10. [Development Guide](#10-development-guide)

---

## 1. Overview

### 1.1 What Is This Platform?

The Coral Gables Business Intelligence Platform is an OSINT-powered system that:
- Collects business data from multiple sources (Google Places, Yelp, Chamber of Commerce)
- Enriches data with AI-derived insights (pain points, opportunities)
- Validates data through multi-agent consensus
- Serves data via REST API for sales/marketing workflows

### 1.2 Key Metrics (December 2025)

| Metric | Value |
|--------|-------|
| Total Businesses | 927 |
| Chamber Members | 856 (92.3%) |
| Businesses with Phone | 829 (89.4%) |
| Businesses with Website | 792 (85.4%) |
| Business Categories | 12 |
| OSINT Agents | 8 |
| Validation Agents | 5 |

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts |
| **Database** | PostgreSQL (production), JSON (fallback) |
| **AI/LLM** | Claude Sonnet 4 (Anthropic) |
| **Hosting** | Railway (API), Netlify (Dashboard) |
| **APIs** | Google Places API, Yelp Fusion API |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CORAL GABLES BI PLATFORM                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   SOURCES   │    │   AGENTS    │    │      DATA STORES        │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────────────────┤ │
│  │ Google Maps │───▶│ GoogleMaps  │    │                         │ │
│  │ Yelp API    │───▶│ Agent       │───▶│  PostgreSQL Database    │ │
│  │ Chamber Dir │───▶│ YelpAgent   │    │  ┌─────────────────┐    │ │
│  │ Websites    │───▶│ ChamberAgent│    │  │ businesses      │    │ │
│  │ Social Media│───▶│ WebsiteAgent│    │  │ pain_points     │    │ │
│  └─────────────┘    │ FinancialAgt│    │  │ opportunities   │    │ │
│                     │ PainPointAgt│    │  │ co_fit_solutions│    │ │
│                     │ CoFitAgent  │    │  └─────────────────┘    │ │
│                     └─────────────┘    │                         │ │
│                            │           │  JSON Fallback          │ │
│                            ▼           │  coral_gables_bi_v2.json│ │
│                     ┌─────────────┐    └─────────────────────────┘ │
│                     │ VALIDATION  │              │                 │
│                     ├─────────────┤              ▼                 │
│                     │ Consensus   │    ┌─────────────────────────┐ │
│                     │ Validator   │    │      FASTAPI API        │ │
│                     │ (5 Agents)  │    ├─────────────────────────┤ │
│                     └─────────────┘    │ GET /api/v2/businesses  │ │
│                                        │ GET /api/v2/analytics   │ │
│                                        │ GET /api/v2/search      │ │
│                                        │ POST /api/v2/admin/*    │ │
│                                        └───────────┬─────────────┘ │
│                                                    │               │
│                                                    ▼               │
│                                        ┌─────────────────────────┐ │
│                                        │   CO_TERMINAL V5.0      │ │
│                                        │   (Single Page App)     │ │
│                                        ├─────────────────────────┤ │
│                                        │ Terminal.jsx (only page)│ │
│                                        │ ├─ Smart Segments       │ │
│                                        │ ├─ Quadrant Chart       │ │
│                                        │ ├─ Entity Table         │ │
│                                        │ └─ Business Dossier     │ │
│                                        └─────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Architecture

### 3.1 Directory Structure

```
systems/
├── agents/                      # Backend Python code
│   ├── bi_api.py               # FastAPI application (main entry point)
│   ├── config.py               # Configuration management
│   ├── database.py             # SQLAlchemy models & connection
│   ├── db_repository.py        # Data access layer
│   │
│   ├── osint_production_collector.py  # Production OSINT agents (8 agents)
│   ├── google_places_collector.py     # Google Places API wrapper
│   ├── yelp_collector.py              # Yelp Fusion API wrapper
│   │
│   ├── consensus_validator.py         # Multi-agent validation
│   ├── pkp_validator.py               # PKP refinement validator
│   ├── validate_all_data.py           # Batch validation script
│   │
│   ├── weekly_refresh.py              # Scheduled data refresh
│   ├── generate_comprehensive_bi_database.py  # DB regeneration
│   ├── generate_top_100_pkp.py        # PKP report generator
│   ├── coral_gables_pkp_generator.py  # Single business PKP
│   ├── migrate_json_to_db.py          # JSON to PostgreSQL migration
│   │
│   ├── data/                   # Output files only (refresh reports)
│   │   └── refresh_report_*.txt
│   ├── migrations/             # Database migrations
│   │   └── 001_increase_potential_impact_size.py
│   │
│   ├── Procfile               # Railway process definition
│   ├── requirements.txt       # Python dependencies
│   ├── railway.toml           # Railway configuration
│   └── nixpacks.toml          # Nixpacks build config
│
└── data/                       # ★ CANONICAL DATA DIRECTORY
    ├── coral_gables_bi_database_v2.json      # Main production database
    ├── coral_gables_bi_database_validated.json # Validated version (working file)
    ├── all_businesses_merged.json             # Source: merged business data
    ├── chamber_members_extracted.json         # Source: chamber directory
    ├── coral_gables_top_100_businesses_pkp.json # PKP report output
    ├── books_and_books_pkp_refined.json       # Example PKP output
    └── database_schema.sql                    # PostgreSQL schema
```

### 3.2 Module Responsibilities

| Module | Responsibility | Entry Points |
|--------|----------------|--------------|
| `bi_api.py` | FastAPI REST API | `uvicorn bi_api:app` |
| `config.py` | Environment configuration | `from config import settings` |
| `database.py` | SQLAlchemy ORM models | `from database import Business` |
| `db_repository.py` | Data access abstraction (PostgreSQL/JSON) | `get_repository()` |
| `osint_production_collector.py` | OSINT data collection (8 agents) | `OSINTOrchestrator` |
| `consensus_validator.py` | Multi-agent validation | `ConsensusValidator` |
| `weekly_refresh.py` | Scheduled data refresh | CLI script |

> **Note:** Legacy files `osint_orchestrator.py` and `repository.py` have been removed to eliminate duplicates.

### 3.3 Key Classes

#### OSINTOrchestrator (osint_production_collector.py:970)
```python
class OSINTOrchestrator:
    """Main orchestrator for OSINT collection"""

    async def collect_business_profile(self, name: str, category: str) -> BusinessProfile:
        """Collect complete profile for a single business"""

    async def collect_market_intelligence(self, businesses: List[Dict]) -> List[BusinessProfile]:
        """Collect intelligence for multiple businesses"""
```

#### ConsensusValidator (consensus_validator.py:295)
```python
class ConsensusValidator:
    """Multi-agent consensus system for PKP validation"""

    async def validate_item(self, item_type: str, item_text: str, context: Dict) -> ConsensusResult:
        """Validate single pain point/opportunity through consensus"""

    async def validate_business(self, business_data: Dict) -> Dict:
        """Validate all items for a business"""
```

#### BusinessRepository (db_repository.py:22)
```python
class BusinessRepository:
    """Repository for accessing business data (PostgreSQL or JSON)"""

    def get_all_businesses(self, force_refresh: bool = False) -> List[Dict]:
        """Get all businesses with caching"""

    def get_business_by_id(self, business_id: str) -> Optional[Dict]:
        """Get single business by ID"""
```

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Root component (renders Terminal only)
│   ├── main.jsx               # Application entry point
│   ├── index.css              # Global styles (dark terminal theme)
│   ├── components/
│   │   └── Layout.jsx         # (Unused - legacy)
│   └── pages/
│       ├── Terminal.jsx       # ★ MAIN APP - Single-page terminal UI
│       ├── Dashboard.jsx      # (Unused - legacy)
│       ├── Businesses.jsx     # (Unused - legacy)
│       ├── BusinessDetail.jsx # (Unused - legacy)
│       └── Analytics.jsx      # (Unused - legacy)
├── index.html                 # HTML entry point
├── package.json               # NPM dependencies
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
└── netlify.toml              # Netlify deployment config
```

> **Note:** The app is a single-page terminal interface. Dashboard, Businesses, BusinessDetail, Analytics, and Layout are legacy files not currently in use.

### 4.2 Terminal UI Architecture

The application is a single-page "hunter terminal" interface (`Terminal.jsx`) with:

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: CO_TERMINAL // V5.0 HUNTER            CORAL GABLES • N TARGETS │
├─────────────────────────────────────────────────────────────────────┤
│ LEFT SIDEBAR  │  MAIN CONTENT                      │  RIGHT PANEL   │
│               │                                    │                │
│ SMART SEGMENTS│  ┌────────────────────────────┐   │  BUSINESS      │
│ • All Targets │  │    QUADRANT CHART          │   │  DOSSIER       │
│ • 💎 Hidden   │  │  (Digital vs Dominance)    │   │                │
│   Gems        │  │     👑 Titans  💎 Gems     │   │  Tabs:         │
│ • 👑 Local    │  │     🔄 Turn    ⚠️ Rebuild  │   │  • Overview    │
│   Titans      │  └────────────────────────────┘   │  • Intel       │
│ • 🔄 Turnaround│                                   │  • Action      │
│ • ⚠️ Rebuild  │  ┌────────────────────────────┐   │                │
│               │  │     ENTITY TABLE           │   │  Contact,      │
│ SECTOR        │  │  Name | Sector | Alpha | Fit│   │  Pain Points,  │
│ • Dining      │  │  -------------------------  │   │  Opportunities,│
│ • Retail      │  │  (Sortable, searchable)    │   │  Solutions,    │
│ • Professional│  └────────────────────────────┘   │  Script Gen    │
│ • Healthcare  │                                    │                │
│ • ...         │                                    │                │
│               │                                    │                │
│ DISTRICT      │                                    │                │
│ • Downtown    │                                    │                │
│ • Miracle Mile│                                    │                │
│ • ...         │                                    │                │
└───────────────┴────────────────────────────────────┴────────────────┘
```

### 4.3 Smart Segments (Quadrant-Based)

Businesses are segmented by two axes:
- **Dominance** (Y-axis): Engagement score (threshold: 80)
- **Digital Maturity** (X-axis): Digital presence score (threshold: 50)

| Segment | Criteria | Icon |
|---------|----------|------|
| Hidden Gems | High Dominance, Low Digital | 💎 |
| Local Titans | High Dominance, High Digital | 👑 |
| Turnaround | Low Dominance, High Digital | 🔄 |
| Rebuild | Low Dominance, Low Digital | ⚠️ |

### 4.4 Key Metrics Calculated Client-Side

```javascript
// Opportunity Alpha - Growth potential score (0-100)
function calculateOpportunityAlpha(business) {
  const growthPotential = (100 - score) / 100
  const painFactor = Math.min(painCount * 10, 40)
  const oppFactor = Math.min(oppCount * 8, 30)
  const dataFactor = completeness * 20
  return Math.round(growthPotential * 30 + painFactor + oppFactor + dataFactor)
}

// Digital Maturity - Calculated from digital presence (0-100)
function calculateDigitalMaturity(business) {
  // Uses: website (+25), instagram (+20), facebook (+15),
  //       email (+15), google rating (+15), yelp rating (+10)
}

// Co-Fit Level - Based on alpha score
function getFitLevel(business) {
  if (alpha >= 60) return 'HIGH'
  if (alpha >= 40) return 'MED'
  return 'LOW'
}
```

### 4.5 API Integration

```javascript
// Fetch all businesses (up to 1000)
const res = await fetch('/api/v2/businesses?limit=1000')

// Fetch full business details when selected
const res = await fetch(`/api/v2/businesses/${business.business_id}`)
```

---

## 5. Data Pipeline

### 5.1 Data Flow

```
Chamber Directory (DOCX)
        │
        ▼
┌─────────────────────┐
│ Extract Members     │ ──▶ chamber_members_extracted.json
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ OSINT Collection    │
│ ├─ Google Places    │
│ ├─ Yelp API         │
│ ├─ Website Analysis │
│ └─ Financial Est.   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ LLM Enrichment      │
│ ├─ Pain Points      │
│ ├─ Opportunities    │
│ └─ Co-Fit Solutions │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Consensus Validation│ (5 AI agents vote)
│ Confidence: 0.75→0.92│
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Data Storage        │
│ ├─ PostgreSQL       │ (production)
│ └─ JSON files       │ (fallback)
└─────────────────────┘
```

### 5.2 Data Sources & Confidence

| Source | API | Confidence | Rate Limit |
|--------|-----|------------|------------|
| Google Places | places.googleapis.com | 0.85-0.90 | $15.76/week |
| Yelp Fusion | api.yelp.com | 0.80-0.90 | Free tier |
| Website Scrape | BeautifulSoup | 0.60-0.70 | 2s delay |
| LLM Enrichment | Anthropic Claude | 0.70-0.80 | ~$10/run |
| Consensus Validation | Claude (5 agents) | 0.92-0.95 | ~$10/run |

### 5.3 Refresh Schedule

| Type | Frequency | Script | Duration |
|------|-----------|--------|----------|
| Full Refresh | Weekly (Sun 6 AM) | `weekly_refresh.py` | ~45 min |
| Validation | On-demand | `--run-validation` | ~17 min/100 |
| API Reload | Manual | `POST /api/v2/admin/refresh` | <1s |

---

## 6. Agent System

### 6.1 OSINT Collection Agents

| Agent | Source | Data Collected | Confidence |
|-------|--------|----------------|------------|
| `GoogleMapsAgent` | Google Places API | Name, rating, reviews, hours, phone, website | 0.90 |
| `YelpAgent` | Yelp Fusion API | Rating, reviews, categories, price range | 0.90 |
| `WebsiteAgent` | Web scraping | Booking system, social links, technologies | 0.60 |
| `SocialMediaAgent` | Instagram/Facebook | Followers, engagement, posts | 0.70 |
| `ChamberAgent` | Chamber directory | Membership, board position | 0.90 |
| `FinancialAgent` | Heuristics | Revenue estimate, employee count | 0.60 |
| `PainPointAgent` | Review analysis | Pain points, severity, category | 0.70 |
| `CoFitAgent` | LLM analysis | Solutions, engagement score, tier | 0.70 |

### 6.2 Validation Agents

| Agent Role | Perspective | Validation Focus |
|------------|-------------|------------------|
| `INDUSTRY_EXPERT` | Industry knowledge | Is this a real industry pain point? |
| `LOCAL_MARKET` | Coral Gables market | Is this relevant locally? |
| `OPERATIONS` | Operations | Is this operationally significant? |
| `CUSTOMER` | Customer experience | Would customers care? |
| `FINANCIAL` | Financial impact | Is this worth addressing? |

### 6.3 Agent Execution Flow

```python
# 1. Initialize orchestrator
async with OSINTOrchestrator() as orchestrator:

    # 2. Collect data for each business
    profile = await orchestrator.collect_business_profile(
        business_name="Books & Books",
        category="retail"
    )

    # 3. Stages executed:
    #    Stage 1: Google Maps data
    #    Stage 2: Yelp data
    #    Stage 3: Website analysis
    #    Stage 4: Chamber check
    #    Stage 5: Financial estimates
    #    Stage 6: Sentiment analysis
    #    Stage 7: Pain point extraction
    #    Stage 8: Co-Fit analysis

    # 4. Optional: Consensus validation
    validator = ConsensusValidator(min_agents=3)
    validated = await validator.validate_business(profile.to_dict())
```

---

## 7. Database Schema

### 7.1 Entity Relationship Diagram

```
┌─────────────────┐
│   businesses    │
├─────────────────┤
│ business_id PK  │──┐
│ name            │  │
│ legal_name      │  │
│ lifecycle_stage │  │
│ data_complete   │  │
│ confidence      │  │
│ created_at      │  │
│ updated_at      │  │
│ last_refresh    │  │
└─────────────────┘  │
                     │
   ┌─────────────────┼─────────────────┐
   │                 │                 │
   ▼                 ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ pain_points  │ │opportunities │ │co_fit_solns  │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ id PK        │ │ id PK        │ │ id PK        │
│ business_id  │ │ business_id  │ │ business_id  │
│ pain_point   │ │ opportunity  │ │ solution_name│
│ category     │ │ category     │ │ category     │
│ severity     │ │ impact       │ │ description  │
│ confidence   │ │ confidence   │ │ priority     │
│ source       │ │ source       │ │ created_at   │
└──────────────┘ └──────────────┘ └──────────────┘

Additional tables: business_categories, business_locations,
                  engagement_scores, customer_reviews,
                  data_sources, collection_runs
```

### 7.2 Key Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `businesses` | 927 | Core business entities |
| `pain_points` | ~3,000 | LLM-derived pain points |
| `opportunities` | ~2,500 | LLM-derived opportunities |
| `co_fit_solutions` | ~4,000 | Recommended solutions |
| `engagement_scores` | 927 | Calculated engagement scores |
| `business_categories` | 927 | Category classifications |
| `business_locations` | 927 | Address/district data |

---

## 8. API Reference

### 8.1 Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://terminal-production-27a0.up.railway.app` |
| Local | `http://localhost:8000` |

### 8.2 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v2/businesses` | List businesses (paginated) |
| GET | `/api/v2/businesses/{id}` | Get business details |
| GET | `/api/v2/businesses/{id}/intelligence` | Get intelligence report |
| GET | `/api/v2/search/businesses` | Search businesses |
| GET | `/api/v2/search/pain-points` | Search pain points |
| GET | `/api/v2/analytics/market` | Market analytics |
| GET | `/api/v2/analytics/categories/{cat}` | Category insights |
| GET | `/api/v2/analytics/geographic` | Geographic analysis |
| GET | `/api/v2/opportunities/prioritized` | Prioritized opportunities |
| GET | `/api/v2/engagement/recommendations` | AI recommendations |
| GET | `/api/v2/engagement/pipeline` | Sales pipeline view |
| GET | `/api/v2/data-quality/overview` | Data quality metrics |
| GET | `/api/v2/export/json` | Export data to JSON |
| POST | `/api/v2/admin/refresh` | Refresh data (requires key) |
| GET | `/api/v2/admin/stats` | System statistics |

### 8.3 Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by business category |
| `district` | string | Filter by geographic district |
| `tier` | int (1-4) | Filter by priority tier |
| `min_score` | float | Minimum engagement score |
| `max_score` | float | Maximum engagement score |
| `limit` | int | Results per page (default: 100) |
| `offset` | int | Pagination offset |
| `q` | string | Search query |

---

## 9. Configuration

### 9.1 Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes (prod) | PostgreSQL connection string | Local fallback |
| `GOOGLE_PLACES_API_KEY` | Recommended | Google Places API key | Web scraping |
| `YELP_API_KEY` | Recommended | Yelp Fusion API key | Skipped |
| `ANTHROPIC_API_KEY` | For validation | Claude API key | Heuristics |
| `ADMIN_API_KEY` | For admin ops | Admin endpoint protection | Disabled |
| `CORS_ORIGINS` | Production | Allowed CORS origins | `*` |
| `APP_ENV` | Optional | Environment name | `development` |
| `API_HOST` | Optional | API host | `0.0.0.0` |
| `API_PORT` | Optional | API port | `8000` |

### 9.2 Configuration Loading

```python
# systems/agents/config.py

from config import settings

# Check if APIs are configured
if settings.google.is_configured:
    # Use Google Places API
else:
    # Fall back to web scraping

if settings.anthropic.is_configured:
    # Use LLM validation
else:
    # Use heuristic validation
```

### 9.3 Example .env File

```bash
# API Keys
GOOGLE_PLACES_API_KEY=your_google_key_here
YELP_API_KEY=your_yelp_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Database
DATABASE_URL=postgresql://user:pass@host:5432/coral_gables_bi

# Security
ADMIN_API_KEY=your_admin_key_here

# CORS (comma-separated)
CORS_ORIGINS=https://your-frontend.netlify.app,http://localhost:5173

# Environment
APP_ENV=production
```

---

## 10. Development Guide

### 10.1 Local Setup

```bash
# Clone repository
git clone <repo-url>
cd Terminal

# Backend setup
cd systems/agents
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env file
cp ../../.env.example .env
# Edit .env with your API keys

# Run API
uvicorn bi_api:app --reload

# Frontend setup (separate terminal)
cd frontend
npm install
npm run dev
```

### 10.2 Running Tests

```bash
# Test configuration
python -c "from config import settings; settings.print_status()"

# Test database connection
python database.py test

# Test OSINT collection (10 businesses)
python weekly_refresh.py --businesses 10 --dry-run

# Test with validation
python weekly_refresh.py --businesses 10 --run-validation
```

### 10.3 Deployment

**Backend (Railway):**
```bash
# Push to main branch triggers deployment
git push origin main

# Manual deploy
railway up
```

**Frontend (Netlify):**
```bash
# Push to main branch triggers deployment
git push origin main

# Manual deploy
cd frontend
npm run build
netlify deploy --prod
```

### 10.4 Adding a New Agent

```python
# 1. Create new agent class in osint_production_collector.py
class NewDataAgent:
    """Collects data from new source"""

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session

    async def collect(self, business_name: str) -> Dict[str, Any]:
        # Implementation
        return {
            "source": "new_source",
            "data": {},
            "confidence": 0.7
        }

# 2. Add to OSINTOrchestrator.collect_business_profile()
new_agent = NewDataAgent(self.session)
new_data = await new_agent.collect(business_name)
profile.raw_data["new_source"] = new_data

# 3. Update data completeness calculation
# 4. Add to UAT_TESTING.md
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **OSINT** | Open Source Intelligence - publicly available data |
| **PKP** | Precise Knowledge Protocol - structured business insights |
| **Co-Fit** | Company-Fit analysis for solution recommendations |
| **Tier** | Priority tier (1-4) based on engagement score |
| **Chamber** | Coral Gables Chamber of Commerce |

---

## Appendix B: Quick Reference

### Common Commands

```bash
# Regenerate full database
python generate_comprehensive_bi_database.py

# Weekly refresh (100 businesses)
python weekly_refresh.py --businesses 100

# Weekly refresh with validation
python weekly_refresh.py --businesses 100 --run-validation

# Migrate JSON to PostgreSQL
python migrate_json_to_db.py

# Run API locally
uvicorn bi_api:app --reload --port 8000
```

### Key File Locations

| Purpose | Path |
|---------|------|
| Main API | `systems/agents/bi_api.py` |
| OSINT Agents | `systems/agents/osint_production_collector.py` |
| Validation | `systems/agents/consensus_validator.py` |
| Database Models | `systems/agents/database.py` |
| Configuration | `systems/agents/config.py` |
| Main Database | `systems/data/coral_gables_bi_database_v2.json` |
| Frontend Entry | `frontend/src/main.jsx` |
| Terminal UI | `frontend/src/pages/Terminal.jsx` |

---

*Document Version: 2.1 | Last Updated: December 2025*
*Changes:*
- *v2.1: Cleaned up data directories, removed redundant files, consolidated to canonical `systems/data/` path*
- *v2.0: Updated frontend architecture to reflect single-page Terminal UI (v5.0)*
