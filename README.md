# Coral Gables OSINT — Business Intelligence Terminal

> An open-source intelligence pipeline **and live Bloomberg-style terminal** mapping the entire Coral Gables business ecosystem. Chamber members, non-members, and everything in between — collected by a free-tier OSINT pipeline, modeled as a knowledge graph, and served live to a React terminal with an AI advisor.

---

## What This Is

A full-stack business-intelligence system for **Coral Gables, FL** (zip codes 33134, 33146, 33133, 33143), built in four layers:

| Layer | Tech | What it does |
|-------|------|--------------|
| **1. Collection** | Python agents (0–10) | Scrape + validate + score businesses from stacked free-tier APIs → `data/master_all_businesses.csv` |
| **2. Knowledge Graph** | Neo4j (Docker) + `data/etl/loader.py` | Transform the flat CSV into a property graph (8 node types, 10 edge types) |
| **3. API Server** | Node/Express (`dashboard/server/`) | Serve **live** graph data over HTTP + proxy an AI advisor (OpenAI / Gemini / Perplexity) |
| **4. Terminal UI** | React + Vite (`dashboard/src/terminal/`) | 30-page auth-gated terminal that reads live data and renders analytics, maps, graph explorer, and a chat advisor |

**Current state:** 2,884 unique businesses (deduped across all sources), against a target of ~4,400 active entities.

**New here?** Two starting points:
- To **run the data pipeline** (get more businesses): see [howto.md](./howto.md).
- To **bring the dashboard to life** (Neo4j + API + UI): jump to [§ Bring the Dashboard to Life](#bring-the-dashboard-to-life) below.

---

## ⭐ What Changed — From Static Exports to a Live Terminal

> This is the headline of the recent work. The dashboard used to read **static files** committed under `dashboard/public/data/` (CSV + JSON exports). It now reads **live from Neo4j** through a Node API, with an AI advisor layered on top. Here's the before/after so the improvements are easy to follow.

### Before (static)
- The React app loaded `public/data/businesses_lite.csv`, `graph_data.json`, `analytics_queries.json`, etc. directly.
- Every data change required re-running the Python pipeline **and** re-committing megabytes of exported files.
- No AI advisor, no live graph queries — the UI was a static viewer of a frozen snapshot.

### After (live)
- **Neo4j knowledge graph** is the single source of truth at runtime. The ETL loader (`data/etl/loader.py`) builds it from the master CSV once; the app queries it live.
- **Node/Express API** ([dashboard/server/index.js](dashboard/server/index.js)) exposes live endpoints that return the *exact same shapes* the static files used to — so the front-end swapped its data source without rewriting every page:

  | Endpoint | Replaces static file | Backed by |
  |----------|----------------------|-----------|
  | `GET /api/businesses` | `businesses_lite.csv` | [neo4j.js](dashboard/server/neo4j.js) |
  | `GET /api/graph` | `graph_data.json` | neo4j.js |
  | `GET /api/graph-stats` | `graph_stats.json` | neo4j.js |
  | `GET /api/analytics-queries` | `analytics_queries.json` | [analytics.js](dashboard/server/analytics.js) |
  | `GET /api/opportunities` | (new) | [opportunities.js](dashboard/server/opportunities.js) |
  | `GET /api/network-centrality` | (new) | [centrality.js](dashboard/server/centrality.js) |
  | `GET /api/sentiment-themes` | (new) | [sentiment.js](dashboard/server/sentiment.js) |
  | `GET /api/prediction-summary` | (new) | [predictions.js](dashboard/server/predictions.js) |
  | `GET /api/live-status` | (new) | connectivity probe |

- **AI Business Advisor**: `POST /api/chat` is a provider-agnostic LLM proxy ([llm.js](dashboard/server/llm.js)) supporting **OpenAI, Gemini, and Perplexity**. It injects a live market-data system prompt and uses **function calling** so the model can request charts, which are then built client-side from live data.
- **Live/Offline badge**: the terminal header shows a green **LIVE** pill when Neo4j is reachable and a red **OFFLINE** pill otherwise ([TerminalLayout.jsx:197](dashboard/src/terminal/components/TerminalLayout.jsx#L197)). There is **no silent static fallback** — if the DB is down the app surfaces the error instead of serving stale exports ([TerminalDataContext.jsx:44](dashboard/src/terminal/context/TerminalDataContext.jsx#L44)).
- **Single active front-end**: `App.jsx` now mounts only the terminal app (`terminal/TerminalRoutes.jsx`). The legacy `dashboard/src/pages/` viewer is superseded (see [§ Roadmap](#roadmap--next-steps-to-full-implementation) — it's dead code to remove).

> **Note on remaining static files:** a couple of small feeds are still read from disk on purpose — `public/data/latest_delta.json` and `delta_history.json` (temporal deltas from the snapshot archiver). Everything business-facing is live.

---

<a name="bring-the-dashboard-to-life"></a>
## 🚀 Bring the Dashboard to Life

Four processes turn the static repo into the live terminal. Do them in order the first time.

### Prerequisites
- **Docker** (for Neo4j) — [install](https://docs.docker.com/get-docker/)
- **Python 3.9+** (`pip install neo4j pandas`) — for the ETL loader
- **Node 18+** (`npm`) — for the API server and the Vite dev server

### Step 1 — Start Neo4j (the graph database)

```bash
cd data/etl
docker compose up -d          # Neo4j on bolt://localhost:7687, browser on :7474
# Wait ~30s for it to initialize. Login: neo4j / cgcc2024graph
```

### Step 2 — Load the graph from the master CSV

```bash
cd data/etl
pip install neo4j pandas
python loader.py              # Extract CSV → Transform to nodes/edges → Load into Neo4j
```

This wipes and rebuilds the graph (2,884 businesses, ~19.5k edges). Use `--incremental` to merge instead of wipe, `--dry-run` to validate without writing. Full options: [data/etl/README.md](./data/etl/README.md).

### Step 3 — Configure keys (Neo4j + at least one LLM provider)

The API server reads the **repo-root `.env` first**, then `dashboard/server/.env` for overrides. Put the Neo4j credentials and your LLM key in the root `.env`:

```bash
cp .env.example .env
# Edit .env:
#   NEO4J_URI=bolt://localhost:7687
#   NEO4J_USER=neo4j
#   NEO4J_PASSWORD=cgcc2024graph
#   OPENAI_API_KEY=sk-...        # or GEMINI_API_KEY / PERPLEXITY_API_KEY
```

The advisor auto-selects the first provider that has a key and lets you switch between configured providers in the UI. Provider signup links are in [dashboard/server/.env.example](dashboard/server/.env.example).

### Step 4 — Start the API server + dashboard

```bash
cd dashboard
npm install
npm start          # runs BOTH: Vite (UI, :3000) + Node API (:3005) via concurrently
```

Then open **http://localhost:3000**. Vite proxies `/api/*` to the Node server on `:3005` ([vite.config.js:9](dashboard/vite.config.js#L9)), so the browser only talks to one origin.

> Prefer to run them separately? `npm run dev` (UI only) and `npm run api` (server only) in two terminals.

### Step 5 — Verify it's live

- The header pill should read **LIVE** (green). If it's **OFFLINE** (red), Neo4j isn't reachable — recheck Steps 1–2.
- Sanity-check the API directly:

```bash
curl http://localhost:3005/api/health          # LLM provider status
curl http://localhost:3005/api/live-status      # { live: true } when Neo4j is up
curl "http://localhost:3005/api/businesses" | head -c 300
```

- Log in at `/login`. Auth is **demo-only** (client-side users in [config/roles.js](dashboard/src/terminal/config/roles.js)) — see the Roadmap for productionizing it.

### Refreshing the data later

When the Python pipeline collects more businesses, re-run the ETL loader (Step 2) and the live app picks up the changes on next load — no re-commit of static files, no rebuild.

---

## The Terminal App

A React/Vite application under [dashboard/src/terminal/](dashboard/src/terminal/) with **30 pages**, role-based access, and multi-tenant config. Highlights:

- **Overview / Browse / Explorer** — market snapshot, search/filter, per-business OSINT profiles
- **Analytics / Intelligence** — CHI (Category Health Index), NOS (Neighborhood Opportunity Score), HHI concentration, rating percentiles
- **Map** — Leaflet geospatial view of geocoded businesses
- **Graph Explorer / Ecosystem** — force-directed Neo4j graph (react-force-graph-2d) + PKP node/edge view
- **Opportunities** — expansion cross-tabs (high-NOS neighborhoods × high-CHI categories)
- **Recruit Queue** — non-members pre-scored by recruitability
- **Risk Radar** — red-flag monitoring
- **Tactical / AI Advisor** — chat with the live LLM advisor; it can generate charts on demand
- **Data Refresh** — data-quality coverage dashboard

**Data flow:** [TerminalDataContext.jsx](dashboard/src/terminal/context/TerminalDataContext.jsx) fetches `/api/businesses` once, then derives *all* stats, market analytics, penetration tables, and the recruit queue client-side with `useMemo`. Enrichment feeds (sentiment/centrality/predictions) load after the live connection is confirmed.

**Tech stack:** React 18, Vite 5, Tailwind, Recharts, Leaflet, graphology, react-force-graph-2d, papaparse.

---

## Project Structure

```
Terminal/
|
|-- data/
|   |-- master_all_businesses.csv  # MASTER: 2,884 deduped businesses (source of truth)
|   |-- leadgen.csv                # LEADGEN: 1,457 enriched + scored sales leads
|   |-- snapshots/                 # Temporal snapshots (delta archiver)
|   |-- etl/                       # ── KNOWLEDGE GRAPH (CSV → Neo4j) ──
|       |-- docker-compose.yml     #   Neo4j container
|       |-- loader.py              #   Extract → Transform → Load
|       |-- export_graph.py        #   Cypher mirrored by the live API
|       |-- export_analytics.py    #   Precomputed analytics queries
|       |-- README.md              #   Graph schema + Cypher cookbook
|
|-- scripts/                       # ── COLLECTION (Python agents 0-10) ──
|   |-- _shared.py                 #   Schema, geo constants, normalizers
|   |-- 0. orchestrator.py         #   Concurrent pipeline runner
|   |-- 1. agent1-osint.py         #   Discovery / scraper (5 sources)
|   |-- 2. agent2-validator.py     #   Normalize / dedup / enrich
|   |-- 3. agent3-synthesizer.py   #   PKP synthesis / export
|   |-- 6-10 ...                    #   Lead-gen pipeline (clean→enrich→score→playbook)
|
|-- staging/                       # Agent 1 output → Agent 2 input (+ archived sources, logs)
|
|-- dashboard/                     # ── API SERVER + TERMINAL UI ──
|   |-- server/                    #   Node/Express live API + LLM proxy
|   |   |-- index.js               #     Routes (Neo4j endpoints + /api/chat)
|   |   |-- neo4j.js               #     Live graph queries (drop-in for static exports)
|   |   |-- llm.js                 #     Multi-provider LLM adapter (OpenAI/Gemini/Perplexity)
|   |   |-- analytics.js           #     Analytics query builder
|   |   |-- opportunities.js       #     Expansion cross-tabs
|   |   |-- centrality.js          #     Network centrality / communities
|   |   |-- sentiment.js           #     Sentiment theme extraction
|   |   |-- predictions.js         #     Membership / growth / churn predictions
|   |   |-- .env.example           #     Server env template (LLM keys, API_PORT)
|   |-- src/
|   |   |-- App.jsx                #   Mounts the terminal app only
|   |   |-- terminal/              #   THE ACTIVE APP (30 pages, auth, tactical advisor)
|   |   |-- pages/                 #   Legacy static viewer (superseded — see Roadmap)
|   |-- public/data/              #   Static exports (mostly legacy; deltas still used)
|   |-- vite.config.js            #   Dev proxy: /api → localhost:3005
|
|-- howto.md                       # Pipeline guide + API key setup
|-- final-output-schema.md         # Output CSV schema (27 + 7 PKP fields)
|-- SELL-STRATEGY.md               # Go-to-market / commercialization notes
|-- terminal_master_docs.md        # Terminal product documentation
|-- todo.md                        # Project task tracker
```

---

## Master CSV — `data/master_all_businesses.csv`

**2,884 unique businesses** consolidated from multiple source runs, deduplicated by normalized business name with fuzzy matching. Single source of truth — all legacy intermediate CSVs have been merged in and deleted; raw source CSVs are preserved in `staging/archived/`.

### Coverage & Completeness

| Metric | Count | | Field | Fill Rate |
|--------|------:|-|-------|----------:|
| Total unique businesses | 2,884 | | business_name | 100% |
| Chamber members | 843 | | category_primary | 100% |
| Non-members | 2,041 | | neighborhood_area | 97% |
| **Target** | ~4,400 | | phone | 91% |
| **Gap remaining** | ~1,516 | | rating_primary_value | 88% |
| | | | website | 53% |

### Schema

See [final-output-schema.md](./final-output-schema.md) for the full 27-field + 7 PKP field spec. Key groups: Identity (`business_id`, `business_name`, `phone`, `website`), Location (`address`, `lat`, `lon`, `neighborhood_area`), Classification (`category_primary`, `price_tier`), OSINT (`rating_primary_value`, `top_delights`, `osint_confidence`), Validation (`validation_tier`, `red_flag_present`), PKP graph (`pkp_node_type`, `pkp_edges_summary`, `pkp_primary_actions`).

---

## Collection Pipeline (Agents 0–10)

The Python pipeline that fills the master CSV. Full walkthrough and API-key setup in [howto.md](./howto.md).

### OSINT agents (0–3)

- **Agent 0 — Orchestrator** (`scripts/0. orchestrator.py`): runs the pipeline concurrently (direct imports + `ThreadPoolExecutor`). `--all`, `--sources osm,outscraper`, `--enrich`, `--merge-only`.
- **Agent 1 — Discovery Scraper**: five source adapters (OSM Overpass, Outscraper, Apify, SerpApi, Directory) with concurrent enrichment, retry/backoff, JSONL logging, per-run quality metrics.
- **Agent 2 — Validator & Merger**: vectorized sanitization (11 steps), O(1) dict-keyed merge with fuzzy dedup, plus an `--enrich` mode (geocoding, zip/neighborhood inference, category re-mapping).
- **Agent 3 — Synthesizer & Exporter**: `--action export | stats | schema | synthesize` (PKP graph-field synthesis).

```bash
python "scripts/0. orchestrator.py" --all           # full concurrent run
python "scripts/0. orchestrator.py" --sources osm    # OSM only (free, no keys)
python "scripts/2. agent2-validator.py" --master data/master_all_businesses.csv --enrich
python "scripts/3. agent3-synthesizer.py" --master data/master_all_businesses.csv --action synthesize
```

| Source | Method | Cost | Coverage |
|--------|--------|------|----------|
| OSM Overpass | OpenStreetMap | Free | 13 chunks × 4 sectors = 52 queries |
| Outscraper | Google Maps | 500 free/mo | 4 runs × ~23 queries |
| Apify | Google Places actor | $5 credit | 22 categories × 4 zips |
| SerpApi | Google Maps + directory | 5,000/mo | enrichment + 6 directory queries |

### Lead-gen agents (6–10) — `data/leadgen.csv`

A 5-agent pipeline turning raw marketing-platform contacts into scored, enriched, sales-ready leads: **6** clean/qualify → **7** match against master DB → **8** web-enrich (SerpApi/Outscraper) → **9** score 0–100 + grade A–F → **10** playbook generation. Result: 1,934 raw → **1,457 leads** (546 A-grade / call-ready).

```bash
python "scripts/6. agent6-leadgen-cleaner.py" --input data/leadgen.csv --output data/leadgen.csv
python "scripts/7. agent7-lead-enricher.py"   --leads data/leadgen.csv --master data/master_all_businesses.csv
python "scripts/8. agent8-web-enricher.py"    --leads data/leadgen.csv --source serpapi
python "scripts/9. agent9-lead-scorer.py"     --leads data/leadgen.csv
python "scripts/10. agent10-playbook.py"      --leads data/leadgen.csv
```

---

## Knowledge Graph (Neo4j)

`data/etl/loader.py` transforms the flat master CSV into a property graph. **8 node types** (`Business`, `Category`, `Neighborhood`, `ZipCode`, `SourceFamily`, `MarketForce`, `Supplier`, `ActionItem`) and **10 edge types** (`CLASSIFIED_AS`, `LOCATED_IN`, `NEAR`, `COMPETES_WITH`, `SUPPLIED_BY`, `AFFECTED_BY`, `HAS_ACTION`, …). ~2,884 businesses / ~19,586 real edges.

The live API's Cypher mirrors `export_graph.py`, so **live output == what the static exports contained**. Full schema, Cypher cookbook, and Docker management: [data/etl/README.md](./data/etl/README.md).

---

## Getting Started (pipeline only)

```bash
pip install requests pandas fuzzywuzzy python-Levenshtein
# Per-source (install only what you use):
pip install outscraper apify-client google-search-results anthropic openai

cp .env.example .env         # fill in keys — see howto.md
set -a && source .env && set +a   # export vars so os.environ.get() sees them (bash & zsh)
python "scripts/0. orchestrator.py" --all
```

> **Why `set -a`?** `source .env` sets shell variables but doesn't **export** them; Python's `os.environ.get()` only sees exported vars. `set -a` auto-exports everything sourced, `set +a` turns it back off. Important on macOS/zsh.

For the full dashboard, follow [§ Bring the Dashboard to Life](#bring-the-dashboard-to-life).

---

<a name="roadmap--next-steps-to-full-implementation"></a>
## Roadmap — Next Steps to Full Implementation

The system is functional end-to-end but not production-hardened. Ordered roughly by priority:

### 🔴 Blockers for production
1. **Real authentication.** Login is demo-only — users are hardcoded in [config/roles.js](dashboard/src/terminal/config/roles.js) and the session lives in `localStorage` ([TerminalAuthContext.jsx:22](dashboard/src/terminal/context/TerminalAuthContext.jsx#L22)). Replace with a real auth provider (JWT/OAuth) and server-side session validation.
2. **Protect the API.** Every `/api/*` route is open, including `POST /api/chat`, which spends real LLM tokens on every request. Add auth middleware, rate limiting, and per-user quotas before exposing the server beyond localhost.
3. **Secrets hygiene.** `.env` files are git-ignored (root + `dashboard/`) and none are currently tracked ✓. Still to do: rotate the default Neo4j password (`cgcc2024graph`) for any non-local deployment, and keep it out of `data/etl/docker-compose.yml`.

### 🟠 Complete the live migration
4. **Retire the legacy static viewer.** `dashboard/src/pages/` is no longer routed (App.jsx mounts only the terminal). Delete it and prune the now-unused static exports in `public/data/` (keep only the delta feeds still read at runtime).
5. **Move deltas/enrichment fully server-side.** `latest_delta.json` / `delta_history.json` are still read from disk. Either serve them from an endpoint or generate them from Neo4j so nothing business-facing depends on committed files.
6. **Deployment story.** No Dockerfile/compose for the API+UI, and no hosted Neo4j. Add a compose file that stands up Neo4j + the Node server + a built UI, plus a documented `npm run build` → static-host + reverse-proxy path.

### 🟡 Robustness & product
7. **Server-side derivation for heavy pages.** All stats/market-analytics are recomputed in the browser from the full business list on every load. For larger datasets, push CHI/NOS/HHI/saturation into Neo4j or a cached API response.
8. **Verify the new enrichment endpoints.** `sentiment.js`, `centrality.js`, `predictions.js` are recent/uncommitted — confirm each returns real Neo4j-backed data (not placeholders) and add graceful empty-states in the UI when they 503.
9. **Wire the "Data Refresh" page to actually refresh.** It currently shows coverage from a hardcoded `tenant.lastRefresh`; connect it to a real re-load/ETL trigger and live freshness from `last_reviewed`.
10. **Tests + CI.** There are no automated tests. Add at least: API endpoint smoke tests (with a seeded Neo4j), a loader dry-run check, and a lint/build gate in CI.
11. **Reach the ~4,400 coverage target.** ~1,516 businesses remain; continue the monthly free-tier stacking cadence (Outscraper resets, geocoding backfill, category re-mapping) per [howto.md](./howto.md).

---

## Portability

Domain-agnostic by design. To retarget another city: update geographic constants in `scripts/_shared.py` (zips, bounds, neighborhoods), adjust the category taxonomy and query strings in Agent 1, update the PKP synthesis rules in Agent 3 and graph schema in `loader.py`, then re-run. See [howto.md § Adapting to a Different City](./howto.md#adapting-to-a-different-city).

---

## License

Internal use. Coral Gables OSINT data collected from public sources.
