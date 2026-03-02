# Project TODO — Full Roadmap

> Last updated: Agent 4 delivery + next-phase planning

---

## Phase 0 — Completed Work

### Pipeline — Agent Implementation
- [x] Wire Agent 1 with real API integrations (Outscraper, Apify, SerpApi, OSM)
- [x] Refactor `scripts/4. chunkedscraper.py` logic into Agent 1 framework
- [x] Implement fuzzy dedup engine in Agent 2 (fuzzywuzzy, threshold=85)
- [x] Add geo-validation and coherence checks to Agent 2 (bounds, zip inference, field scoring)
- [x] Build Agent 0 orchestrator for concurrent multi-source pipeline execution
- [x] Add `--enrich` mode to Agent 2 (geocoding, reverse geocoding, category re-mapping)
- [x] Build PKP synthesis in Agent 3 (`--action synthesize`)
- [x] Build Agent 4 go-to-actions engine (6 action generators, priority scoring, JSON playbook)
- [x] Upgrade Agent 4 to AI-powered strategist (GPT-4o-mini via OpenAI API, prompt-engineered solution architect, graceful fallback to rule-based)
- [x] Wire Agent 4 into orchestrator (`--actions` standalone, `--act` pipeline flag, `--no-llm` override)
- [x] Build GoToActionsPage in dashboard (action cards, progress tracking, filters)
- [x] Write `howto.md` — step-by-step API key acquisition + pipeline guide

### Pipeline — Optimization (Feb 19, 2026)
- [x] Delete dead scripts 4 (chunkedscraper) and 5 (ten-chunk-script) — ~1,000 lines removed
- [x] Extract shared constants + utilities into `scripts/_shared.py`
- [x] Pre-compute key→index dict in `merge_into_master()` — O(1) lookups
- [x] Vectorize `sanitize_master()` — pandas vectorized ops
- [x] Switch `fuzzy_match()` to `process.extractOne()` with `score_cutoff`
- [x] Convert Agent 0 from subprocess.run to direct function imports (importlib + ThreadPoolExecutor)

### Data — Month 1
- [x] Run OSM + Outscraper (x3) + SerpApi enrichment — +1,219 new → 2,884 total
- [x] Run Agent 2 merge (3,384 staging records → 1,219 new + 2,165 enriched)
- [x] Run SerpApi enrichment pass — 1,568 queried, 1,446 matched (92.2%)
- [x] Run Agent 3 `--action synthesize` on full master CSV (2,884 records)
- [x] Exported to dashboard: union_all_businesses.csv + businesses_lite.csv
- [x] Sync `dashboard/public/data/` with latest master CSV

### Documentation
- [x] Update `README.md` with current agent status and pipeline architecture
- [x] Write `howto.md` with API key signup and pipeline guide
- [x] Update `OSINT PIPELINE.md` counts after Month 1 gap-fill run
- [x] Update all .md files with 2,884-record post-merge stats (Feb 19, 2026)

---

## Phase 1 — Remaining Data Work

### Data — Gap Fill to 4,400
- [ ] Run Outscraper free-tier batch (Month 2: +400-600 expected)
- [ ] Run Apify $5 credit batch (+600-700 expected)
- [ ] Run Outscraper free-tier batch (Month 3: +300-400 expected)
- [ ] Re-run OSM quarterly for new mapper contributions
- [ ] Final dedup + merge + validation pass at ~4,400

### Data Quality — Enrichment
- [ ] Run Agent 2 `--enrich` to forward geocode addresses → lat/lon (~697 rows)
- [ ] Run Agent 2 `--enrich` to reverse geocode lat/lon → addresses
- [ ] Run Agent 2 `--enrich` to re-categorize remaining 691 "other" businesses
- [ ] Resolve 10 red-flagged businesses
- [ ] Standardize `category_primary` casing inconsistencies (e.g., "Consulting" vs "consulting")
- [ ] Review and refine PKP undercurrents for Coral Gables specifics
- [ ] Add multi-source consensus scoring (when 2+ sources agree on a field)

---

## Phase 2 — Neo4j Knowledge-Graph Migration

Migrate from flat CSV to a property-graph in Neo4j so every business becomes a **node** with typed **relationships** to other businesses, neighborhoods, categories, people, and events.

### 2.1 Schema Design

| Node Label | Key Properties | Source |
|---|---|---|
| `Business` | name, category, rating, reviews, lat, lon, address, phone, website, osint_confidence, price_tier | master CSV |
| `Neighborhood` | name, city, zip, bounds_polygon | derived from `neighborhood_area` |
| `Category` | slug, display_name | `category_primary` distinct values |
| `Person` | name, role | future scrape (Florida SunBiz, LinkedIn) |
| `Event` | title, date, source | CGCC calendar + Eventbrite |
| `ActionItem` | title, priority, status, created_at | Agent 4 playbook JSON |

| Relationship | Pattern | Weight / Properties |
|---|---|---|
| `(:Business)-[:LOCATED_IN]->(:Neighborhood)` | geo-assignment | — |
| `(:Business)-[:IN_CATEGORY]->(:Category)` | primary + secondary | — |
| `(:Business)-[:NEAR {distance_m}]->(:Business)` | haversine < 200 m | distance |
| `(:Business)-[:COMPETES_WITH]->(:Business)` | same category + same neighborhood | similarity score |
| `(:Business)-[:COLLABORATES_WITH]->(:Business)` | co-occurrence in CGCC events, shared customers | strength |
| `(:Business)-[:OWNED_BY]->(:Person)` | SunBiz / LinkedIn match | confidence |
| `(:Business)-[:HAS_ACTION]->(:ActionItem)` | Agent 4 output | priority, category |

### 2.2 Migration Steps
- [ ] **Provision Neo4j** — AuraDB Free (dev) or Docker `neo4j:community`; upgrade to AuraDB Pro for prod
- [ ] **Write ETL script** (`scripts/5. neo4j-loader.py`) — read master CSV, create `:Business` nodes with all canonical + PKP fields
- [ ] **Create neighborhood nodes** — extract distinct `neighborhood_area` values, attach GeoJSON polygons from Coral Gables open-data
- [ ] **Create category nodes** — normalize and merge casing variants
- [ ] **Build `LOCATED_IN` edges** — join on `neighborhood_area`
- [ ] **Build `NEAR` edges** — bulk compute haversine pairs within 200 m threshold; store distance as property
- [ ] **Build `COMPETES_WITH` edges** — same `category_primary` AND same `neighborhood_area`; weight by rating difference
- [ ] **Build `HAS_ACTION` edges** — ingest `action_playbook.json` as `:ActionItem` nodes linked to their `:Business`
- [ ] **Create full-text indexes** — `CREATE FULLTEXT INDEX FOR (b:Business) ON EACH [b.name, b.address]`
- [ ] **Update dashboard** — add a Cypher REST endpoint (Neo4j HTTP API or small FastAPI wrapper)
- [ ] **Visualize** — integrate `neovis.js` or `react-force-graph` in the dashboard

### 2.3 Graph-Powered Analytics (post-migration)
- [ ] **Community detection** — Louvain / Label Propagation on `NEAR` + `COLLABORATES_WITH` graph → natural business clusters
- [ ] **PageRank** — rank businesses by graph centrality (hub score for ecosystem page)
- [ ] **Shortest path** — surface connection chains between any two businesses
- [ ] **Recommendation engine** — "Businesses like yours that thrived did X" based on subgraph patterns

---

## Phase 3 — Additional Data Sources

### 3.1 Structured / API Sources

| Source | Data It Provides | Cost |
|---|---|---|
| **Florida SunBiz** (sunbiz.org) | Corporate filings, officers, registered agents, active/dissolved status | Free (public record) |
| **Miami-Dade Property Appraiser** (miamidade.gov/pa) | Property owner, assessed value, sq ft, zoning | Free (REST API / CSV) |
| **City of Coral Gables Open Data** | Business tax receipts, permits, code violations, zoning overlays, GeoJSON | Free |
| **US Census ACS (5-year)** | Median income, population density, demographics per census tract | Free (API key) |
| **Yelp Fusion API** | Reviews, photos, hours, transactions, price range | Free tier → $200+/mo |
| **Google Places API (new)** | Place details, editorial summaries, EV charging, outdoor seating | $17/1K detail calls |
| **Foursquare Places API** | Venue details, categories, tips, photos, popularity, chains | Free tier → $200/mo |
| **LinkedIn Company API** (Proxycurl) | Company size, industry, employee count, founding year | ~$0.01/record |
| **Eventbrite API** | Local business events, networking, CGCC-hosted events | Free |
| **Florida DBPR** (myfloridalicense.com) | Professional licenses (contractors, restaurants, real estate) | Free |

### 3.2 Unstructured / Enrichment Sources

| Source | What It Adds | Method |
|---|---|---|
| **Google News / NewsAPI.org** | Press mentions, expansions, closures, controversies | Keyword search + NLP sentiment |
| **Reddit / Nextdoor / local forums** | Community sentiment, complaints, recommendations | Apify scraper + keyword extraction |
| **Instagram / TikTok** | Visual brand quality, engagement rate, posting recency | Apify social scrapers |
| **Wayback Machine** (archive.org) | Historical website snapshots — detect when business went online/offline | CDX API |

---

## Phase 4 — AI & Intelligent Tools

### 4.1 LLM-Powered Enrichment

| Tool / Model | Use Case |
|---|---|
| **OpenAI GPT-4o / GPT-4o-mini** | Plain-English business summaries; classify ambiguous categories; extract structured data from messy text |
| **OpenAI Embeddings (text-embedding-3-small)** | Vector-embed business descriptions → semantic similarity search ("find businesses like mine") |
| **Claude (Anthropic)** | Long-context analysis of neighborhood-level reports; synthesize 50+ profiles into market brief |
| **Ollama / LLaMA 3 (local)** | On-device inference for sensitive data without cloud transmission |

### 4.2 NLP & Classification

| Tool | Use Case |
|---|---|
| **spaCy + NER** | Extract person names, organizations, addresses from unstructured text (Agent 1 preprocessing) |
| **Zero-shot classification (HuggingFace BART)** | Auto-categorize ~691 "other" businesses without training data |
| **Sentiment analysis (VADER / TextBlob)** | Score review snippets + news mentions → feed into Agent 4 reputation actions |
| **Topic modeling (BERTopic)** | Discover latent review themes ("parking issues", "great ambiance") → PKP undercurrents |

### 4.3 Graph Intelligence (Neo4j-native)

| Capability | Algorithm | What It Reveals |
|---|---|---|
| **Community detection** | Louvain / Leiden | Natural business clusters (e.g., "Miracle Mile dining cluster") |
| **Centrality** | PageRank, Betweenness | Ecosystem hubs vs. periphery |
| **Similarity** | Node Similarity (Jaccard / Cosine) | "Businesses most like yours" recommendations |
| **Link prediction** | Adamic-Adar | Predicted future collaborations or competitive threats |
| **Path finding** | Dijkstra / A* | Shortest referral chain between two businesses |
| **Graph embeddings** | Node2Vec / GraphSAGE | Hybrid vector search (graph + text embeddings) |

### 4.4 Agentic / Workflow Tools

| Tool | Purpose |
|---|---|
| **LangChain / LangGraph** | Multi-step LLM chains with tool use — replace/augment Agent 1 OSINT calls |
| **CrewAI** | Multi-agent collaboration (researcher, validator, writer) with role-based prompts |
| **Tavily Search API** | LLM-optimized web search (clean text, no HTML) — additional OSINT source |
| **Firecrawl** | Scrape + convert any URL to clean Markdown — richer content extraction |
| **Browserbase / Playwright** | Headless browser for JS-heavy sites (Google Maps, Yelp, SunBiz) |

---

## Phase 5 — Dashboard Enhancements

- [ ] **Map view** — Leaflet or Mapbox GL with business pins colored by category; click-to-detail
- [ ] **Knowledge-graph explorer** — `react-force-graph` or `neovis.js` embedded in Ecosystem page
- [ ] **Export** — CSV download, PDF report per business (jsPDF / react-pdf)
- [ ] **Real-time action tracker** — mark Agent 4 actions as complete/in-progress; persist to backend
- [ ] **AI chat** — embedded assistant answering questions via RAG over Neo4j + vector store
- [ ] **Notification system** — alert on rating drops, new competitors, data gaps filled
- [ ] **Multi-tenant auth** — Supabase Auth or Clerk for CGCC member login

---

## Phase 6 — Infrastructure & DevOps

- [ ] **Backend API** — FastAPI or Express wrapping Neo4j Bolt driver + CSV fallback
- [ ] **Vector store** — Pinecone / Qdrant / Neo4j vector index for semantic search
- [ ] **CI/CD** — GitHub Actions: lint → test → build dashboard → deploy to Vercel/Netlify
- [ ] **Scheduled pipeline** — cron job (GitHub Actions or Railway) to re-run Agents 0-4 weekly/monthly
- [ ] **Monitoring** — track API credit usage (Outscraper, SerpApi, OpenAI) with budget alerts
- [ ] **Environment management** — `.env` validation script; secrets in GitHub Actions / Railway

---

## Immediate Next Actions (Priority Order)

1. ✅ Run Agent 4 — `python "scripts/0. orchestrator.py" --actions`
2. ✅ Test dashboard — verify GoToActionsPage at `/my-business/go-to-actions`
3. Finish data gap-fill — run Outscraper free-tier batch (Month 2) → push toward 3,500
4. Forward geocode — `python "scripts/0. orchestrator.py" --enrich` to fill ~697 missing lat/lon
5. Provision Neo4j AuraDB Free — create instance, note Bolt URI + credentials
6. Build ETL loader — `scripts/5. neo4j-loader.py` to import master CSV into graph
7. Add OpenAI embeddings — embed business descriptions, store in Neo4j vector index
8. Integrate Yelp Fusion — add as Agent 1 source for review depth + hours + photos
9. Build map view — Leaflet/Mapbox in dashboard using existing lat/lon data
10. Ship v2 — dashboard + Neo4j + Agent 4 as "CGCC Intelligence Platform v2"
