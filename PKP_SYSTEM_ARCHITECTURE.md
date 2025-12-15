# Coral Gables Business PKP - System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA COLLECTION LAYER                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
         ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
         │ Google Places │  │ Review Sites  │  │ Social Media  │
         │     API       │  │ (Google/Yelp) │  │  (Instagram)  │
         └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
         ┌──────────────────────────────────────────────────────┐
         │              RAW BUSINESS DATA                       │
         │  • Name, type, location                              │
         │  • Hours, contact info                               │
         │  • Reviews (text + ratings)                          │
         │  • Website URL                                        │
         │  • Social media presence                             │
         │  • Photos                                             │
         └──────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: INITIAL PKP GENERATION                       │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  coral_gables_pkp_generator.py                                  │   │
│  │                                                                   │   │
│  │  Input: Business data + observations                            │   │
│  │  Process: Apply generic templates by business type              │   │
│  │  Output: Structured PKP with LOW confidence (0.3-0.5)           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Generic Pain Points:                                                    │
│  • "Foot traffic predictability" (0.3)                                  │
│  • "Inventory management" (0.5)                                         │
│  • "Online-to-offline integration" (0.3)                                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STAGE 2: LLM VALIDATION & REFINEMENT                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  pkp_validator.py                                                │   │
│  │                                                                   │   │
│  │  Agent: Claude Sonnet 4 / GPT-4                                 │   │
│  │                                                                   │   │
│  │  Process:                                                         │   │
│  │  1. Extract observations from Stage 1 PKP                        │   │
│  │  2. Analyze with Coral Gables domain knowledge                  │   │
│  │  3. Infer SPECIFIC pain points from observations                │   │
│  │  4. Assign confidence based on evidence strength                │   │
│  │  5. Provide reasoning + mitigation ideas                        │   │
│  │                                                                   │   │
│  │  Output: Refined PKP with HIGH confidence (0.6-0.8)             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Refined Pain Points:                                                    │
│  • "Weekend capacity management" (0.75) ← from "Heavy weekend traffic" │
│  • "Parking friction reducing conversion" (0.70) ← from "Limited parking"│
│  • "Monetization of third space usage" (0.65) ← from "Working/studying"│
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STAGE 3: MULTI-AGENT CONSENSUS (Future)                │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Agent 1    │  │   Agent 2    │  │   Agent 3    │                  │
│  │  Domain      │  │  Sentiment   │  │ Competitive  │                  │
│  │  Expert      │  │  Analysis    │  │ Intelligence │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                           │
│         └─────────────────┼─────────────────┘                           │
│                           │                                              │
│                           ▼                                              │
│                  ┌─────────────────┐                                    │
│                  │   Consensus     │                                    │
│                  │   Mechanism     │                                    │
│                  └────────┬────────┘                                    │
│                           │                                              │
│                           ▼                                              │
│                  Validated PKP (0.8-0.9)                                │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STAGE 4: HUMAN VALIDATION (Future)                     │
│                                                                           │
│  Business owner interview:                                               │
│  • Present top 3 pain points                                             │
│  • Get feedback: Yes/No/Partially                                        │
│  • Update confidence scores                                              │
│  • Capture new observations                                              │
│                                                                           │
│  Fully Validated PKP (0.9-1.0)                                          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT & DELIVERY                                 │
│                                                                           │
│  • JSON export for API                                                   │
│  • Markdown report for presentation                                      │
│  • Dashboard visualization                                               │
│  • Email summary to business owner                                       │
│  • Integration with consulting CRM                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Confidence Evolution

```
Stage 1              Stage 2              Stage 3              Stage 4
Generic             LLM Validated     Multi-Agent        Human Validated
Templates           Reasoning         Consensus          Interview

0.3-0.5  ───────>   0.6-0.7  ───────>  0.7-0.9  ───────>  0.9-1.0
  │                   │                   │                   │
  │                   │                   │                   │
  ▼                   ▼                   ▼                   ▼
❌ Not              ⚠️  Worth          ✅ High             ✅✅ Validated
actionable         discussing         confidence          & Actionable
```

---

## Data Flow Example: Books & Books

```
RAW DATA
└─ Name: "Books & Books"
└─ Type: Retail (bookstore)
└─ Location: 265 Aragon Ave
└─ Observations:
   ├─ "Heavy foot traffic on weekends"
   ├─ "Popular for working/studying with coffee"
   ├─ "Strong Instagram presence"
   ├─ "Hosts frequent author events"
   └─ "Limited parking nearby"

            ↓

STAGE 1: GENERIC TEMPLATES
└─ Pain Points:
   ├─ "Foot traffic predictability" (0.3)
   ├─ "Inventory management" (0.5)
   └─ "Online-to-offline integration" (0.3)

            ↓

STAGE 2: LLM REASONING
└─ Analysis:
   "Heavy foot traffic on weekends" 
   → implies capacity constraints
   → "Weekend capacity management" (0.75)
   
   "Limited parking nearby"
   → Coral Gables parking is critical
   → "Parking friction reducing conversion" (0.70)
   
   "Popular for working/studying"
   → people stay long without buying
   → "Monetization of third space" (0.65)

            ↓

REFINED PKP
└─ Pain Points (Specific + Evidence-Based):
   ├─ "Weekend capacity management" (0.75)
   ├─ "Parking friction" (0.70)
   ├─ "Third space monetization" (0.65)
   ├─ "Event ROI" (0.60)
   └─ "Instagram → sales conversion" (0.50)

Average Confidence: 0.64 (up from 0.38)
```

---

## Tech Stack

### Current (MVP)
```
Python 3.11+
├─ Data Collection
│  ├─ requests
│  ├─ beautifulsoup4
│  └─ google-places-api
├─ PKP Generation
│  ├─ json (stdlib)
│  ├─ datetime (stdlib)
│  └─ typing (stdlib)
└─ LLM Validation
   ├─ anthropic (Claude API)
   └─ openai (GPT API)
```

### Future (Production)
```
Backend
├─ FastAPI (REST API)
├─ PostgreSQL (relational data)
├─ pgvector (embeddings)
├─ Redis (caching)
└─ Celery (async tasks)

Frontend
├─ React + TypeScript
├─ TailwindCSS
└─ Co_ Design System

Infrastructure
├─ Vercel (frontend hosting)
├─ Railway (backend + DB)
└─ Cloudflare (CDN + security)
```

---

## File Structure

```
coral-gables-pkp/
├─ src/
│  ├─ generators/
│  │  └─ coral_gables_pkp_generator.py
│  ├─ validators/
│  │  └─ pkp_validator.py
│  ├─ scrapers/
│  │  ├─ google_places.py
│  │  ├─ review_scraper.py
│  │  └─ social_scraper.py
│  └─ agents/
│     ├─ domain_expert.py
│     ├─ sentiment_analyzer.py
│     └─ competitive_intel.py
├─ data/
│  ├─ raw/
│  ├─ processed/
│  └─ validated/
├─ outputs/
│  └─ pkp/
│     └─ {business_id}/
│        ├─ initial.json
│        ├─ refined.json
│        ├─ report.md
│        └─ validation.json
└─ docs/
   ├─ PRODUCT_SUMMARY.md
   ├─ QUICKREF.md
   └─ ARCHITECTURE.md (this file)
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-25  
**Author**: Co_ (Counderscore, LLC)
