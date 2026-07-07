# CO_ Network — Strategic & Technical Audit + Rebuild Plan

> **Product pivot:** Chamber-recruitment tool → CO_-owned relationship/data network for every business in Coral Gables, FL.
> **Audited:** 2026-07-07 · branch `terminal-v2` (tip `f5023c6`) · auditor: Claude (Opus 4.8), full-repo read

## ── CURRENT POSITION (update this block as work proceeds) ──

| Milestone | Status |
|---|---|
| Phase 1 — Discovery & current-state model | ✅ Done, confirmed by operator (2026-07-07) |
| Phase 2 — Clarifying questions | ✅ Done, all answered (see Phase 2 table below) |
| Phase 3 — Deep audit, ledger, roadmap, verdicts | ✅ Done (this document) |
| **Week 1 — Foundation** | 🟡 **~80% done — blocked only on Supabase project creation ← YOU ARE HERE** |
| Week 2 — Directory & identity (SSR pages, onboarding, claim + verify) | ⬜ Not started |
| Week 3 — Owner value (dashboard, corrections, benchmarks, ego-graph) | ⬜ Not started |
| Week 4 — CO_ surface & hardening (Digital Presence Report, policies, cron, launch) | ⬜ Not started |

**Week 1 status detail (2026-07-07, branch `co-network` off `terminal-v2`):**
- ✅ Schema + RLS + edge generation written: `supabase/migrations/0001_core_schema.sql` (8 tables + business_private + taxonomy, triggers, privilege guards), `0002_rls.sql` (full D5 scoping matrix), `0003_deterministic_edges.sql` (NEAR/COMPETES_WITH/SAME_OWNER + ego_graph fn).
- ✅ Migration script `scripts/migrate_to_supabase.py` written and dry-run-verified against the real CSV: 2,730 businesses, 21k provenance rows, 941 risk signals, 850 private contacts. **Chamber tri-state restored (843 Y / 806 N / 1,081 unknown)** from git commit `726798f` — the CSV had flattened unknowns into 'N' at `385d93d`.
- ✅ Sensitive files relocated out of repo to `Desktop\CO_client-data\` (move, not purge — see `data/RELOCATED-FILES.md`); `.gitignore` blocks re-adding.
- ✅ Next.js 16 scaffold at `web/` (App Router, TS, Tailwind) with @supabase/ssr wiring (browser/server clients, session-refresh `proxy.ts`, auth callback route). Build verified green.
- 🔴 **BLOCKER: Supabase project cannot be created** — org `ZC Dev` (fceiuyodbrscvcyxupjl) is at its 2-active-free-project limit (LEADR + AetherScripts). Options: upgrade org to Pro ($25/mo — matches D9 budget), pause an existing project, or use a different CO_ org. Once a project exists: apply the 3 migrations, run `migrate_to_supabase.py`, run `generate_deterministic_edges()`, fill `web/.env.local`.
- SunBiz columns are empty in the current data (that enrichment never ran) — SAME_OWNER edges use shared-phone signal (170 phones across 369 businesses) until SunBiz lands.
- New `morgan` branch on remote (1 commit off main: an Agent 1 OSM scrape run, not pivot work).

---

# PHASE 1 — Verified Current-State Model

*(Confirmed by operator 2026-07-07. Everything below is file-traceable unless marked "Inferred.")*

## 1.1 Stack

| Layer | Technology |
|---|---|
| Data pipeline | Python 3 CLI scripts (`scripts/`, 22 scripts + `_shared.py`) — pandas, requests, fuzzywuzzy |
| Frontend | React 18 + Vite 5 SPA, React Router 6, Tailwind 3, Recharts, react-force-graph-2d, PapaParse |
| Backend | One Express server, two endpoints: `POST /api/chat` (OpenAI proxy), `GET /api/health` (`dashboard/server/index.js`) |
| Database | **None in serving path** — flat CSV/JSON static files. Neo4j 5 (Docker, `data/etl/`) exists as offline analytics build step only |
| Auth | Client-side mock — hardcoded users in JS bundle (`dashboard/src/terminal/config/roles.js:103-110`) |
| Deploy | Netlify artifacts present; **no live deployment** (operator-confirmed). Future target: **Vercel** |
| Tests / CI | **None anywhere** |
| LLM usage | OpenAI gpt-4o-mini in: Agent 4 (actions), Agent 10 (playbooks), Agent 11 (reclassifier), chat proxy |

## 1.2 Data model (actual, verified)

**`data/master_all_businesses.csv` — 2,730 rows × 40 columns.** Identity / location / classification / reputation / trust (osint_confidence, validation_tier, corroboration_*) / risk (red_flag_*) / chamber_member / provenance (source_file, batch_id) / 7 PKP columns / **duplicate `latitude`/`longitude` cols 38-39 alongside `lat`/`lon` cols 7-8** (schema drift from `17. data_enhancer.py`).

- `chamber_member` actual distribution: **843 Y / 806 N / ~1,081 blank** (docs' "2,041 non-members" counts blanks as non-members).
- Dashboard feed `union_all_businesses.csv` (43 cols) adds `sunbiz_*`; written by `18. regenerate_outputs.py` which hardcodes its own field list (ignores `_shared.CANONICAL_FIELDS`).
- Docs claim 34 cols/2,884 rows (`final-output-schema.md`) or 36/2,868 (`terminal_master_docs.md`). **No document matches the data.**
- ~96% of businesses are **single-source** (corroboration) per `temp/ENHANCED_VALIDATOR_DOCS.md`; price tiers ~half statistically inferred (`price_tier_source`).

**Other datasets in `data/`:** `leadgen.csv` (1,457 marketing contacts incl. generated outreach scripts) · `original-leadgen.csv` (1,934 raw CRM export) · **`lt-patient-list.csv` + identical copy — 620 patient records: names, emails, phones, 377 DOBs** (unrelated CO_ client engagement; traced via git to `claude/enrich-client-list-DroVR` branch where agents 6-9 got "column auto-detection for client patient lists") · `CGCC-members.md` (~5,400 lines: named contacts + direct phones).

**Derived JSON layer** (`dashboard/public/data/`, 15 files, ~9 MB): graph (2,807 nodes / 19,816 links), predictions (2,730), sentiment profiles (2,730), centrality, 19 canned Cypher exports, opportunities (42 curated concepts), experiment results, action playbook, deltas.

**Neo4j** (offline only): 8 node labels, 12 edge types (`data/etl/loader.py`); creds `neo4j/cgcc2024graph` hardcoded in 3 files; never queried live by the app.

## 1.3 Auth & roles — all mocked

- 6 hardcoded accounts (`roles.js`), password `terminal2026` (guest: `guest`), shipped in client bundle. Second stale credential set in dead `src/context/AuthContext.jsx`.
- Session = `localStorage['terminal_user']` plain JSON; **editing `role` to `"admin"` grants everything**.
- Code has **six** roles (leadership, membership, member, teaser, sponsor, admin), not five.
- `RoleGate.jsx` = CSS blur; denied content remains in the DOM. Only 8 of 24 pages gated at all.
- **Data scoping: zero.** All roles fetch the identical 1.5 MB CSV from unauthenticated static `/data/*`.

## 1.4 Mock vs real

Real: all 2,730 records + enrichment; all scoring math (recruitability, CHI/NOS/HHI, BHS, CSS, MP/GT, centrality); playbook content; client-side exports; Neo4j graph.
Mocked/cosmetic: logins; role separation; alert timestamps; Manual Refresh button; Upgrade/Sponsor CTAs; corrections & membership resolutions (localStorage-only, never flow back); multi-tenancy (scaffold, one tenant); Content Studio (16 static templates).

## 1.5 Pipeline summary

- **Agent 1** (988 ln): OSM Overpass (12 chunks × 4 sectors), Outscraper (4 query sets ≈ 500/mo free), Apify (22 cats × 4 zips), SerpApi gap-targeting (`--target missing-rating|website|address|reviews|any-gap`). Env: `OUTSCRAPER_KEY, APIFY_TOKEN, SERPAPI_KEY`.
- **Agent 2** (1,644 ln, the core): normalize → dedup (exact key → fuzzy 85) → blanks-only merge → 11-step sanitization → validation scoring (tiers ≥0.8 High / ≥0.5 Moderate) → 3-pass cross-source reconciliation (coord 100 m + fuzzy 80/88) → optional **SunBiz** scrape → red flags. `--enrich`: Nominatim geocoding, zip/neighborhood inference, keyword re-categorization.
- **Agent 3**: PKP synthesis + dashboard export. **Agents 6-10**: leadgen clean→match→web-enrich→score (A-F)→playbooks (gpt-4o-mini hybrid). **Scripts 11-21**: reclassifier, snapshots/deltas, price inference, sentiment, centrality, predictions, enhancer, regenerate, validation fixes, Neo4j sync, opportunity analyzer.
- **Orchestrator covers agents 1-4 only; everything else is manual, order-dependent CLI. No cron configured anywhere.**

## 1.6 Data flows

```
1 COLLECT (manual, ~monthly): APIs → Agent1 → staging → Agent2 merge → master CSV → Agent3 → public/data → git
2 INTELLIGENCE (manual):      master → scripts 11-21 + etl → Neo4j → JSON exports → Insights tabs
3 RUNTIME:                    browser fetches ALL data unauthenticated → client-side everything → localStorage → nothing returns
4 CHAT:                       browser → Express proxy → OpenAI → text + chart instructions
```
System is **write-once, read-many, feedback-never** — the opposite of what claim/correct/verify requires.

## 1.7 Critical findings

1. 🔴 Patient list (620 records w/ DOBs) + duplicate in the product repo.
2. 🔴 Full OSINT dossier (959 contact names, ~2,400 phones, SunBiz filings, red-flag notes) served as unauthenticated static files on any deploy. (Mitigated today only by there being no live deployment.)
3. 🟠 No trust boundary: client-side auth, blur-as-RBAC, open-CORS unauthenticated OpenAI proxy, hardcoded Neo4j creds.
4. 🟠 Schema drift: dual lat/lon; taxonomy divergence (`automotive`, `media_entertainment` unknown to `_shared.VALID_CATEGORIES`); no doc matches data.
5. 🟠 ~96% single-source corroboration; historical bug left red-flag fields empty while Agents 3/4 branched on them.
6. 🟡 UI bugs: Recruit band filter/KPIs dead (`.label` vs `.band`); Analytics "Band-A" always 0; Compare shows confidence 0-1 as "%"; Browse renders array where count belongs.
7. 🟡 PKP = homegrown CO_ framework retrofitted from stock analysis; 7 CSV columns + Neo4j taxonomy depend on it.
8. 🟡 Old app (20 pages) unreachable but still mounted — old DataContext double-fetches the 1.5 MB CSV every load. `npm start` broken (`concurrently` not a dependency). Sourcemaps shipped.

**Coverage confidence: ~92%.** Unread: Agent 4 internals (sampled), `coral_gables_pkp_generator.py`, PKP PDF, `export_analytics.py` query bodies, old app pages, git history of other branches, `ghcr.io/counderscore/cgcc-neo4j` image contents.

---

# PHASE 2 — Clarifying Questions & Operator Answers (2026-07-07)

| # | Question | Operator answer |
|---|---|---|
| A1/A2 | Chamber relationship | Originally built for them; refactorable. Chamber intended as **paying customer AND data/channel partner**. |
| A3 | Non-member semantics | "Non-member" = not a Chamber member (data attribute). **"Not linked to a business" is an account status.** Onboarding: create account → search & link to a business, or add a missing one + fill required data. Role selection at signup; privileged roles (admin etc.) not selectable. Elevated states (e.g., chamber-member) require **verification**. |
| B1 | Provenance shown to owners | Show **the data gathered** (not methods). Owners can **correct** out-of-date data. |
| B3 | Adverse signals | Share risk flags & benchmarks with the owner, **framed constructively**. |
| C1 | Team & timeline | CO_ small AI-tooling team; **~4 weeks**. |
| C2/C3 | Platform | Already have **Supabase + Vercel Pro** + enrichment API keys. But **genuinely evaluate alternatives — take nothing for granted**. |
| C4 | Python pipeline | Subject to rewrite; find the optimal approach. |
| D1 | CO_ services | **SEO/AEO/GEO platform already built — integrate via API.** Website builds / analytics retainers = "set a meeting" CTA. |
| D2 | Pricing for owners | **Free for business owners** for now; maybe paywall later. |
| D3 | CO_ operator role | = **admin**; full visibility no owner gets; never assigned to commercial users. |
| E1 | Verification | **SMS to listed business number** approved. |
| E2 | Sources | Nothing off-limits **except Yelp**. |
| E3 | Repo | Private. No live deployment; **Vercel** when going live. Patient list: **do not purge** (explained in audit; recommend relocation, not deletion). |
| Q4 | Sponsor role | Operator unsure of purpose → it's a Chamber-monetization construct (sells Chamber sponsorship packages, `$500-2K/mo` per docs). **Premise dissolves under CO_ ownership → REMOVE.** |

---

# PHASE 3 — Deep Audit & Rebuild Plan

## D1 — Strategic fit

**The data asset and pipeline survive; almost nothing about the serving architecture does.**

| Layer | Verdict |
|---|---|
| 2,730-business dataset | **Core asset** — it IS the cold-start solution |
| Scrape/validate/enrich pipeline | Survives, re-plumbed (sink: CSV → Postgres) |
| Static-CSV serving architecture | Dead for the mission — claim/correct requires read-write + real auth |
| 24-page Terminal UI | Mostly mismatched (surveillance cockpit → owner-facing product); port graph/explorer/chart components |
| Chamber-centric framing | Demoted to one paid module |
| PKP columns/synthesis | Freeze — keep data, stop investing |

Deepest mismatch: today every business is a *target* (recruit scores, red flags, outreach scripts); tomorrow every business is a *user*. Adverse free-text was written for internal eyes → **owner-readability pass required before launch (P0)**.

## D2 — ICP (pressure-tested from data)

Best-fit primary segments: **(1) independent professional services** (~35% of dataset — law, accounting, consulting, RE; referral-driven; high CO_ LTV), **(2) food/beverage + retail storefronts** (~25% — visibility & reviews), **(3) health/wellness practices** (~12% — digitally underinvested). Deprioritize: chains, multinationals, no-digital-surface solos, institutions.
Tension: segments claim only if first session delivers real value; the moment it reads as a funnel, the reputation-sensitive best segment churns silently. Answer = D7 audit-as-value model.

## D3 — Data model & graph

**Verdict: relational Postgres + edges table + pgvector. No graph database.** At ≤5k nodes / ~100k edges every needed query (neighbors, 2-hop, filtered subgraph) is an indexed join / recursive CTE. Evidence the graph DB is already unnecessary: the current app never queries Neo4j live — it reads pre-exported JSON. PageRank/Louvain run as Python batch → node columns.

Core tables: `businesses` · `business_fields` (per-field provenance: field, value, source, confidence, observed_at, corrected_by — the mechanism for "show what we gathered + let them correct it") · `accounts` (role, linked_business_id, verification_state) · `claims` (method, status, evidence, audit) · `edges` (type, weight, confidence, evidence jsonb, status: suggested/confirmed_by_owner/rejected_by_owner, generated_by) · `offers_needs` (taxonomy term + embedding vector) · `scores` · `audit_log`.

Edges, two tiers: **deterministic** (NEAR <200 m, SAME_CATEGORY, COMPETES_WITH, SAME_OWNER via SunBiz — logic already exists in `_shared.py`/`loader.py`) and **inferred** (LLM-extracted offers[]/needs[] against a ~200-term curated local service taxonomy → pgvector cosine match + rule filters → confidence-gated suggestions). **Owner confirm/reject on suggested edges is the flywheel** — training signal + trust deposit. Rendering: keep `react-force-graph-2d`; **ego-graph default**, full-city view is admin/leadership only.

## D4 — Enrichment for the new mission

Every write → `business_fields` with source/confidence/observed_at (no more blind overwrites). Source priority: **owner > SunBiz > Google > OSM**. New sources to add: Coral Gables **BTR**/open data (ground-truth census; closes the ~1,700-business gap), Miami-Dade property appraiser, **FL DBPR licenses** (captures the office-suite professionals invisible to Maps — the biggest known gap segment), **CO_'s own SEO/AEO/GEO platform API** (differentiated enrichment feeding both benchmarks and D7). Keep Agent 2's entity resolution (it's good); add stable UIDs, a match-review queue for 80-90 confidence, staleness-targeted refresh (`observed_at < now() - 90d`). Yelp excluded (operator).

## D5 — RBAC (real design)

Three independent axes — role ≠ Chamber status ≠ link status:
- **Role:** `owner` (default) · `chamber_leadership` / `chamber_membership` (invite-only — paying customer's seats) · `admin` (CO_ operators only, incl. lead-gen views; never selectable).
- **Link status:** `unlinked → pending_claim → verified_owner`.
- **Verified attributes on business:** `chamber_member` = verified badge (asserted → confirmed against Chamber list via partnership), not a role.

Scoping matrix (enforced by **Postgres RLS**, not CSS): directory basics public; contact names owner-own/chamber-members-only/admin; risk flags + provenance + corrections **owner-own only** (+admin); benchmarks owner-own full, aggregate for Chamber seats; recruit queue = chamber_membership + admin; CO_ lead-gen views = admin only. Leakage guards: Chamber seats never see owner-private corrections or edge behavior; **min-cell-size ≥5 on all aggregates**; admin lead-gen activity invisible to owners except honest CO_ disclosure.

## D6 — Claim & verification (ranked)

1. **SMS/voice OTP to phone already on file** — primary (operator-approved). ~$0.05/verify, Twilio Verify; attacker can't supply their own number.
2. **Domain-matched email** — co-primary (free; ~47% have websites).
3. SunBiz officer-name cross-check — background corroboration, never sole factor (scraper exists).
4. Google Business Profile OAuth — v2.
5. Postcard — fallback. 6. Manual admin review — fallback + dispute path.

Flow: claim → auto-checks → SMS OTP → verified; else manual queue w/ document upload. **Dispute (two claimants):** both frozen `contested` → stronger re-verification → admin adjudicates → written reason + appeal. Anti-abuse: ≤2 pending claims/account, transfer cooloff 7d, everything in `audit_log`. Verification documents purged 90 days post-decision.

## D7 — CO_ promotion surface: the Digital Presence Audit

Run CO_'s existing SEO/AEO/GEO platform (via API) against every business as enrichment. Every claimed owner gets a **free Digital Presence Report** — genuinely useful, constructive framing, and each finding carries a clearly-labeled path: platform hookup for SEO/AEO/GEO, "book a call" for websites/retainers.

**Hard boundaries (conflict-of-interest firewall):**
1. **Scoring independence** — benchmark math takes zero input from CO_ sales; scores computed in batch layer, promotion rendered in UI layer, no shared knobs. Audit may *reveal* problems, never *manufacture* them.
2. **Disclosure** — CO_ operates the network and says so on every service prompt.
3. **No cold outreach from platform-private data at launch** — in-product prompts only; prospecting from public fields only.
4. **Corrections are sacred** — never repurposed as sales triggers.
5. **No third-party data sales, ever** (also the moat).

Targeting v1 (public signals only): no website · no GBP · rating < category p25 · low AEO score. ≈50% of directory qualifies.

## D8 — Legal / governance risk register

*(Not legal advice; ⭐ = get Florida counsel.)*

| # | Risk | Sev×Lik | Mitigation |
|---|---|---|---|
| 1 | Patient list w/ DOBs in product repo (+dup, + cleaned variant on `claude/enrich-client-list-DroVR`) | High × certain | **Relocate** to CO_ private client storage (operator: no purge). ⭐ BA/HIPAA status if source is a provider |
| 2 | Defamation/disparagement from flags & benchmarks ⭐ | High × med | Adverse signals **owner-visible only**, evidence-backed, provenance + correction path; no public "worst-of"; opportunity framing |
| 3 | Adverse free-text written for internal eyes | High × certain if shipped | Owner-readability pass (LLM rewrite/quarantine of `red_flag_notes` etc.) — P0 |
| 4 | FCRA-adjacent scoring ⭐ | Med × low | Business scores OK; person-level lead scores (leadgen files) stay admin-only, never for credit/employment-like decisions |
| 5 | Scraping ToS (Google via 3rd-party APIs) | Med × med | Industry gray zone; risk = bans not suits. Public records clean. Yelp excluded |
| 6 | TCPA (SMS verify) | Low | OTP transactional; never reuse numbers for marketing w/o consent |
| 7 | FL Digital Bill of Rights | Low | Thresholds likely don't reach CO_ ⭐; build hygiene anyway (privacy policy, deletion rights) |
| 8 | PII in public bundle (959 contact names, phones) | High × certain on deploy | Structurally fixed by D9 (RLS replaces static files) |
| 9 | Self-dealing optics | Med × med | D7 boundaries + disclosure |
| 10 | Chamber data-license terms ⭐ | Med | Formalize in customer contract (rights to member data if relationship ends) |

## D9 — Architecture & migration

**Supabase wins on merits** (evaluated, not assumed): the three hardest requirements — row-level scoping (D5), auth with verified states (D6), per-field audited writes (B) — are Supabase's native primitives (RLS, Auth, PostgREST/Realtime), pgvector covers D3. Neon = rebuild auth/API/RLS tooling in 4 weeks; Neo4j/AGE = wrong tool at this scale; Firebase = wrong query model.
**Frontend: rebuild on Next.js (App Router) on Vercel** — need SSR public directory pages (each unclaimed business page = SEO landing page for the claim loop), server-side sessions, API routes. Port force-graph/Recharts/explorer components; don't untangle the SPA.
**Pipeline: keep Python, change the sink** (service-role key; GitHub Actions cron). No rewrite in the 4-week window.
**Migration:** one script: master CSV → resolve lat/lon dup + taxonomy → mint UUIDs → `businesses` + `business_fields` (provenance already exists flattened in source_file/osint_confidence/corroboration_*) + `scores`. Regenerate deterministic edges in SQL (don't migrate Neo4j). Predictions/sentiment/centrality JSON → `scores`. Nothing is live; no cutover risk.
**Cost at CG scale:** Supabase Pro $25 + Vercel Pro (owned) + Twilio ~$20/mo + LLM enrichment ~$10-30/batch.

## D10 — UX & trust design

Onboarding: signup → typeahead over 2,730 → claim (verify) or add-new (`unverified` pending checks) → owner dashboard. **Time-to-value < 3 min post-verify:** profile + Digital Presence Report + 3 suggested connections.
Benchmarks: percentile + opportunity language ("p42 for restaurants in Miracle Mile — 3 factors with most headroom"); peer *distributions*, never named loser-leaderboards; named comparisons only owner-initiated.
Provenance UI: extend existing TrustPanel pattern (Observed vs Synthesized, sources, confidence, last-checked) with per-field "Suggest a correction"; auto-apply for verified owners on low-risk fields, review queue for identity fields.
Graph: ego-graph first; edge cards show the *reason*; confirm/reject buttons.

## D11 — Defensibility & cold start

**Cold start is already solved:** directory ships 100% populated; owners find their business already mapped → claim motion = curiosity + control (Google Business/Glassdoor loop). Sequence: (1) public claimable directory → (2) Chamber channel: co-branded "claim your profile" to 843 members (their member-benefit story = what they pay for) → (3) each claimed page is an SEO landing → (4) edge suggestions on at ~50-100 claims.
**Moat:** owner-verified data + confirmed edges are non-scrapable; compounds monthly.
**Expansion:** stay single-city until claim rate proves loop (**target: 5% of directory claimed in 90 days ≈ 135 businesses**); tenancy concept ports to adjacent municipalities later.

---

## Gap analysis

**Class 1 — existing-but-broken (in kept code):** dual lat/lon + 3 scripts on wrong pair · taxonomy divergence · recruit-band bug (`.label` vs `.band`) · red-flag severity computed 2 contradictory ways · ~96% single-source vs trust UI implication · membership blanks miscounted · zero tests · orchestrator covers 1-4 only · `npm start` broken · dead old app double-fetching.

**Class 2 — mission-required, nonexistent:** real auth + RLS · claim/verify subsystem · persisted corrections/write-back · per-field provenance store · edge generation beyond co-location · offers/needs taxonomy + embeddings · owner dashboard (MyBusinessPage ≈30% seed) · SSR public directory pages · CO_ audit surface + platform API integration · scheduled refresh · audit logging · privacy policy/ToS.

## Feature ledger

| Item | Tag | P | Effort | Depends on |
|---|---|---|---|---|
| Supabase schema + RLS + migration script | ADD | P0 | L | — |
| Auth + onboarding (search→claim/create→role) | ADD | P0 | M | schema |
| SMS OTP + domain-email verification + dispute path | ADD | P0 | M | auth |
| Next.js app: SSR directory pages + owner dashboard | ADD | P0 | L | schema |
| Corrections write-back + per-field provenance UI | ADD | P0 | M | schema |
| Owner-readability pass on adverse free-text | REFACTOR | P0 | S-M | — |
| Deterministic edges in SQL | REFACTOR | P0 | S | schema |
| Relocate patient list + leadgen client files out of repo | REFACTOR | P0 | S | — |
| Benchmarks (percentile framing) from existing scoring | REFACTOR | P1 | M | schema |
| Digital Presence Report via CO_ platform API | ADD | P1 | M | claim flow |
| Offers/needs taxonomy + pgvector matching + confirm/reject | ADD | P1 | L | edges |
| Pipeline re-sink to Supabase + GitHub Actions cron | REFACTOR | P1 | M | schema |
| BTR + DBPR + property-appraiser sources | ADD | P2 | M | re-sink |
| Chamber module (leadership/membership seats, re-scoped recruit queue) | REFACTOR | P2 | M | RLS |
| GBP OAuth verification | ADD | P2 | S | claim flow |
| Tactical advisor (local engine) | KEEP-defer | P3 | — | — |
| Neo4j runtime + ETL + 19-query JSON layer | REMOVE | — | S | edges-in-SQL |
| Sponsor role/page · teaser role · Upgrade page | REMOVE | — | S | — |
| Mock auth (both sets) · RoleGate blur · static `/data/*` | REMOVE | P0 | — | auth |
| Old `src/pages` app · `temp/` prototypes · ContentStudio · ExperimentLab UI · PKP investment · duplicate docs/CSVs | REMOVE | — | S | — |

**The 20% → 80%:** schema+RLS+migration · onboarding+claim+verify · SSR directory + owner dashboard w/ corrections · Digital Presence Report.

## 4-week roadmap

- **Wk 1 — Foundation:** Supabase schema, RLS, migration script (lat/lon + taxonomy repair), deterministic edges, relocate sensitive files, Next.js scaffold on Vercel w/ auth.
- **Wk 2 — Directory & identity:** SSR business pages, search, onboarding, claim + SMS/domain verify, admin claim-review queue.
- **Wk 3 — Owner value:** owner dashboard (profile, provenance, corrections, benchmarks), owner-readability pass, ego-graph w/ deterministic edges.
- **Wk 4 — CO_ surface & hardening:** Digital Presence Report + disclosed CTAs, Chamber aggregate views, privacy policy/ToS, audit logging, min-cell guards, pipeline re-sink + weekly cron, launch checklist.
- **Wk 5+:** offers/needs matcher, Chamber module, BTR/DBPR ingestion, GBP OAuth, advisor.

**MVP:** *a fully-populated, claimable Coral Gables business directory where a verified owner sees exactly what's known about them, corrects it, sees constructive benchmarks and their local connections — with CO_'s audit as the disclosed premium hook.*

## Verdicts on the three feature hypotheses

- **(a) Supabase + visual graph → BUILD, one correction:** Supabase yes on merits; graph stored **relationally, no graph DB**; kill Neo4j; render ego-graph-first with existing force-graph component.
- **(b) Claim + verify + self-service → BUILD; it IS the product:** SMS primary + domain email + SunBiz corroboration + manual/dispute path. Converts a surveillance dataset into a consented, self-improving network.
- **(c) In-tool CO_ promotion → BUILD-DIFFERENTLY:** free Digital Presence Report powered by CO_'s existing platform, disclosed CTAs, scoring-independence firewall, no cold outreach from platform-private data. As a funnel it collapses the network; as an audit it aligns lead-gen with owner value.

---

*Remaining uncertainty (~8%): Agent 4 internals, PKP PDF, export_analytics query bodies, other branches' git history, the CO_ SEO/AEO/GEO platform API shape (affects wk-4 integration), Chamber contract terms (affects D5 seat scoping).*
