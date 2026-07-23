# CO_ Network — The Terminal (web)

> The owner-facing rebuild of The Terminal: a live, claimable business directory
> and relationship network for Coral Gables, FL, operated by CO_.
>
> **Live production deployment:** https://the-terminal-nine.vercel.app
> (alias: `the-terminal-co-the-shift.vercel.app`)
>
> This document is the granular record of the **snapshot → live database
> switch** completed 2026-07-23, the features shipped on the hosted version,
> and the live Supabase database behind it.
>
> **⚠️ All code referenced here lives on branch `zac-terminal-v3`** (the
> `web/` Next.js app, `supabase/migrations/`, `scripts/migrate_to_supabase.py`,
> and the strategy doc `REBUILD-PLAN.md`). This file is pushed to `main` as
> documentation only — `main` does not contain the rebuild code. Check out
> `zac-terminal-v3` to see everything described below.

---

## 1. What switched, in one table

| | Before (main / old dashboard) | Now (this app, hosted) |
|---|---|---|
| Product | Chamber-facing intelligence terminal (Vite SPA) | CO_-owned public directory + owner network (Next.js 16) |
| Data serving | 1.5 MB CSV + 15 JSON files fetched as **unauthenticated static files**, parsed in the browser | **Live Postgres (Supabase)** read server-side through Row-Level Security; browser never receives the raw dataset |
| Auth | Hardcoded demo users in the JS bundle, role stored in localStorage | **Supabase Auth** (real accounts), roles enforced by database RLS policies |
| "Role gating" | CSS blur over data already in the DOM | Postgres policies — ungranted rows/columns never leave the database |
| Person PII (contact names, private phones) | Shipped to every visitor inside the public CSV | `business_private` table, readable only by admin / verified owner / chamber seats (members only) |
| Graph | Neo4j (offline), exported to static JSON | `edges` table in Postgres, 55,175 rows, regenerable by one SQL function |
| Hosting | None (local only) | Vercel project `the-terminal`, team **Co_ The Shift**, account `counderscore` |
| Deploys | — | Vercel CLI from the working tree (bypasses the repo-ownership restriction on Git integration) |

---

## 2. The hosted version

### 2.1 Deployment facts

- **Vercel project:** `co-the-shift/the-terminal` · production deployment built 2026-07-23 from the `zac-terminal-v3` working tree (CLI upload — no Git integration, because the GitHub repo is owned by `counderscore` personally and the Vercel GitHub App is not installed there).
- **Production env vars** (set via `vercel env add`, Production scope):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://jmhxnxyjshbqtkzvyjmz.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable key (public-safe; RLS is the boundary)
- **Redeploy after any change:** `cd web && vercel deploy --prod --yes`. What deploys is the local working tree, not a git ref.
- Preview-scope env vars are **not** set (CLI 54.9.1 bug with `env add … preview`); preview deploys therefore fall back to the snapshot provider by design. Add them in the dashboard if preview-with-live-data is wanted.
- The site is **publicly reachable**. Deployment Protection is OFF; enable in Vercel → Project Settings → Deployment Protection to gate it pre-launch.
- Rendering: all data-bearing routes are **server-rendered per request** (the provider's `cache: "no-store"` fetch opts them out of static prerendering), with a 60-second in-memory dataset cache per server instance.

### 2.2 Verification performed (both environments)

The snapshot and the database contain identical data by construction, so "it renders data" proves nothing. The honest test, run against **localhost** and again against **production**:

1. `UPDATE businesses SET website='https://…proof.example.com' WHERE slug='callejo-law'` via the Supabase Management API.
2. Fetch `/b/callejo-law` — the test value rendered in the HTML (production required waiting out the 60 s cache).
3. Revert (`website = null` — verified as the true original value in the snapshot).

Result: **both localhost and the Vercel production site serve from the live database.**

---

## 3. New features on the hosted version

### 3.1 Public surface

**`/` — marketing landing.** Linear.app-anatomy page: app-replica hero terminal, showcase bands, network log, statement band, monochrome editorial design system (`LinearDesign.md` at repo root documents it). All stats on the page (business count, member count, categories) are live provider reads.

**`/directory` — public directory.** Search + category filter + neighborhood filter + pagination (24/page) over all 2,730 businesses.
- Search matches name, address, and category *label* (case-insensitive substring).
- **Ordering is deliberate and defensible:** `rating × min(review_count, 50)` descending, then alphabetical. The 50-review cap prevents review-volume giants from monopolizing page 1; unrated businesses sort last but are never hidden.
- Filter options are computed live with counts per category/neighborhood.

**`/b/[slug]` — business profile pages (2,730 of them, SSR).** Each is a real URL that survives forever (slugs were minted identically in the snapshot and the database — UUID v5 over a fixed namespace — so pre-cutover links did not break). Sections:
- **Identity:** name, category, neighborhood, address, phone, website, price tier (with "inferred" handling — see §4.6), rating + review count (real counts only — see §4.6).
- **Market position (constructive benchmark):** rating percentile among rated category peers ("meets or beats N%"), category average rating, category median review volume. **Min-cell rule: percentile only renders with ≥5 rated peers** (REBUILD-PLAN D5/D8 — no small-cell inference). Framing is opportunity-only: up to 3 "headroom" cards (no website → biggest untapped channel; below-median reviews → room to grow; no rating; no phone). **Never deficiency language, never named loser-comparisons** (D10).
- **Neighbors ≤200 m:** computed from coordinates, closest first, with the reason shown ("84 m away", "same address"). **Exact geocodes only on both endpoints** — approximate (centroid) coordinates are excluded because 818 businesses share just 28 centroid points and would all be "0 m away" (see §4.6).
- **Similar nearby:** same category within 1 km (exact geo) or same non-catchall neighborhood, rating-sorted, reason always attached. This is the COMPETES_WITH edge presented neutrally.
- **Claim CTA** → `/claim/[slug]`.
- **Provenance disclosure:** where the data came from, framed for the business owner reading their own page.

**`/claim/[slug]` and `/claim/new`.** Entry points for the claim-your-business flow (verify ownership → correct data) and the add-a-missing-business flow. UI shipped; the verification backend (SMS OTP to the listed number + domain-matched email, per REBUILD-PLAN D6) is the current Week-2 work.

**`/login`, `/signup`, auth callback.** Wired to **live Supabase Auth** on the production project via `@supabase/ssr` (browser + server clients, session refresh in `src/proxy.ts` — Next 16's successor to middleware). Creating an account on the hosted site creates a real `auth.users` row, and the `handle_new_user()` trigger (§4.4) auto-provisions an `accounts` row with role `owner`.

### 3.2 Owner/terminal surface (`/app/*`)

The full legacy terminal was rebuilt inside the new design system as 16+ role-filtered pages (analytics, advisor with ChatGPT-style composer, alerts, compare, corrections, data-health, ecosystem, exports, intelligence, my-business, playbook, recruit, resolve, risks, sponsor) plus `/app/preview` (deterministic demo-business preview mode: picks a rated, contactable, exactly-geocoded business with ≥1 real neighbor). These render from the same live provider. RBAC hardening of this surface is Week-2/3 work — the database already enforces the data boundary regardless of what the UI requests.

### 3.3 The data provider (the actual "switch")

`src/lib/data/provider.ts` — the one module every page reads through (`@/lib/data`):

- **Live mode** (env vars present): pages fetch `public.directory_businesses` (§4.5) over PostgREST **with the anon key**, i.e. through RLS as an anonymous visitor — the app cannot accidentally read privileged data even server-side. Paged at 1,000 rows/request (PostgREST max), mapped into the shared `Business` type, cached in-module for 60 s with in-flight request de-duplication.
- **Snapshot mode** (env vars absent — e.g. a contributor without credentials, or preview deploys): the same functions serve the committed public-safe snapshot (`src/data/*.json`, emitted by `scripts/emit_local_snapshot.py`). **Same IDs, same slugs, same semantics** — the two sources are interchangeable by construction.
- **Failure mode:** if a live fetch throws (outage, RLS change), the provider logs loudly and serves the snapshot instead of a broken page.
- **Interface change:** every query function became `async` (53 call sites across 25 files were converted); `getCategoryLabel` deliberately stayed **sync** (it is called inside render loops) and is served from the taxonomy map, refreshed on every live dataset load.
- `getDataSource()` reports `"supabase" | "snapshot"` for the data-health page.
- Public proximity ("Neighbors"/"Similar") is **computed from public coordinates** rather than read from the `edges` table — intentional: RLS exposes suggested edges only to the owning business (until owner-confirmed), and public pages must not depend on privileged reads.

---

## 4. The live database

### 4.1 Identity

- **Supabase project:** `The Terminal` · ref `jmhxnxyjshbqtkzvyjmz` · region-standard Supabase Postgres 17 with PostGIS.
- Sibling project in the same CO_ org: `The-Shift` (unrelated product).
- Applied migrations (in `../supabase/migrations/`, executed 2026-07-23 via the Supabase Management API):
  1. `0001_core_schema.sql` — 13 tables, triggers, privilege guards
  2. `0002_rls.sql` — 32 RLS policies + role helper functions (full D5 scoping matrix)
  3. `0003_deterministic_edges.sql` — edge generation + `ego_graph()` function
  4. `0004_directory_view.sql` — public directory read model (added at cutover)

### 4.2 Row counts (as loaded)

| Table | Rows | What it is |
|---|---:|---|
| `businesses` | 2,730 | Core entities; UUID v5 ids (stable across snapshot/DB); tsvector search column |
| `business_fields` | 21,171 | **Per-field provenance**: (business, field, value, source, source_detail, confidence, observed_at). This is the "show me what you gathered on me / let me correct it" substrate — owner corrections insert rows with `source='owner'` |
| `business_private` | 850 | Contact-person names, split out of the public table (was public CSV before) |
| `risk_signals` | 941 | Red flags, **hidden from owners until the D8 readability pass** |
| `scores` | 8,181 | Recruitability/visibility/etc. score rows per business |
| `edges` | 55,175 | 27,373 `near` + 27,560 `competes_with` + 242 `same_owner` |
| `categories` / `neighborhoods` | 25 / 10 | Canonical taxonomy (slug + label + high_value / catchall flags) |
| `accounts`, `claims`, `offers_needs`, `audit_log`, `same_category_pairs` (view) | 0 / scaffolded | Week-2+ surfaces: auth accounts, claim flow, needs↔offers matching, audit trail |

### 4.3 Schema decisions worth knowing

- `businesses.location` is PostGIS `geography(point,4326)` with a companion **`location_precision`** column: `'exact'` (real per-business geocode) vs `'approximate'` (postcode/area centroid). Distance math is only ever valid on exact×exact pairs.
- `businesses.chamber_member` is **tri-state boolean** (`true`/`false`/`NULL` = unknown). Rendering NULL as "not a member" is forbidden (type-level comment enforces awareness).
- `legacy_business_id` preserves the CSV id for idempotent pipeline re-runs.
- Guard triggers: `guard_account_privileges()` blocks self-service role escalation (you cannot UPDATE your own `accounts.role` to admin); `guard_claim_limit()` caps open claims per account (anti-abuse, D6); `handle_new_user()` auto-creates the `accounts` row on signup.

### 4.4 RLS — who can read what (enforced in Postgres, not the UI)

Helper functions: `is_admin()`, `is_chamber_seat()`, `owns_business(uuid)`, `current_role_of(uuid)`.

| Data | anon (public site) | verified owner | chamber seats | admin (CO_) |
|---|---|---|---|---|
| `businesses`, `categories`, `neighborhoods` | ✅ read | ✅ (+ update own low-risk fields) | ✅ | ✅ full |
| `business_private` (contact persons) | ❌ | ✅ own | ✅ members only | ✅ |
| `business_fields` (provenance) | ❌ | ✅ own (+ insert corrections as `source='owner'`) | ❌ | ✅ |
| `risk_signals` | ❌ | (post-readability-pass) own | ❌ | ✅ |
| `scores` | ❌ | ✅ own | ❌ | ✅ |
| `edges` | only `confirmed_by_owner` | ✅ own ego-graph incl. suggested (+ confirm/reject) | ❌ | ✅ |
| identity-field business updates, inserts, deletes | ❌ | via corrections queue only | ❌ | ✅ |

The practical consequence of the switch: **the public site literally cannot leak** contact names, provenance, risk flags, or suggested edges — the anon key's requests are answered by these policies, not by frontend discipline.

### 4.5 `directory_businesses` (migration 0004 — added at cutover)

The app's read model. A `security_invoker = true` view (respects the caller's RLS rather than the view owner's) that:
- joins `categories.slug` and `neighborhoods.label` onto each business (the app's URL/filter vocabulary),
- extracts `lat`/`lon` via `extensions.st_y/st_x(location::geometry)` (PostgREST would otherwise return WKB hex for geography),
- casts `status` enum to text,
- is `GRANT SELECT`-ed to `anon, authenticated`.

### 4.6 Data-quality decisions baked into the load (`scripts/migrate_to_supabase.py`)

These supersede the raw CSV and are why DB numbers differ from naive CSV reads:

1. **Geo precision split** — CSV columns `lat`/`lon` (cols 7-8) are the real geocodes (1,695 distinct points); `latitude`/`longitude` (cols 38-39) are centroid backfill (**only 28 distinct points for 2,650 rows** — an earlier audit had this backwards). Loaded as: 1,832 exact / 818 approximate / 80 none.
2. **Fabricated review counts nulled** — 2,104 of 2,730 CSV review counts were category-median inference (`review_count_source='inferred'`, the same "(87)" stamped across dozens of businesses). Only 277 original counts survive; 53 further artifacts stripped. The UI never renders an inferred count.
3. **Chamber tri-state restored from git history** — the working CSV had flattened all unknowns into `'N'` (commit `385d93d`); the loader restores the true distribution from commit `726798f`: **843 members / 806 confirmed non-members / 1,081 unknown**.
4. **Provenance unpacked, not flattened** — `source_file`/`osint_confidence`/`corroboration_*`/`last_reviewed_date` become 21,171 per-field rows with per-source confidence and `observed_at` timestamps (fallback: load time), enabling per-field freshness targeting later.
5. **Category slug junk prettified** — 735 `category_secondary` values like `food_beverage/pub` cleaned at load.
6. **Idempotent** — upserts key on `legacy_business_id`/PKs with `resolution=merge-duplicates`; the loader can re-run after pipeline refreshes.

Two PostgREST quirks were fixed in the loader during cutover: bulk inserts reject heterogeneous object keys (`PGRST102`), and sending explicit `null` for a `NOT NULL DEFAULT` column violates the constraint — the conditional `observed_at` key is now always present with a real timestamp.

### 4.7 Edge generation (`0003`, run post-load)

`select * from public.generate_deterministic_edges();` produced:

| kind | rows | rule |
|---|---:|---|
| `near` | 27,373 | haversine < 200 m, **exact geo on both endpoints**, distance stored on the edge |
| `competes_with` | 27,560 | same category + geographic overlap, weighted |
| `same_owner` | 242 | shared listed phone number (170 phones spanning 369 businesses) — **placeholder signal until SunBiz officer data lands** (the CSV's sunbiz columns are empty; that enrichment never ran) |

All generated edges are `status='suggested'`, `generated_by='rule'` — owner-visible on their own ego-graph, publicly visible only once a verified owner confirms them. `ego_graph(center uuid, max_edges int)` returns the subgraph for the owner dashboard's graph view.

### 4.8 Credentials & where they live

| Credential | Purpose | Location |
|---|---|---|
| Publishable/anon key | All app reads (RLS-bounded) | `web/.env.local` + Vercel Production env |
| Service-role key | Data loads / batch pipeline only (bypasses RLS) | `web/.env.local` only — **never** in Vercel, never `NEXT_PUBLIC_` |
| Management-API PAT (`sbp_…`) | Applying migrations from the CLI | `web/.env.local` only |

`web/.env.local` is gitignored (`.env*` rule). None of these are in git.

---

## 5. Known gaps (honest list)

- Claim **verification backend** not implemented (UI entry points only) — SMS OTP + domain email + SunBiz cross-check per REBUILD-PLAN D6 is the active work item.
- `risk_signals` are loaded but **not owner-visible** pending the D8 owner-readability rewrite of free-text flag notes.
- `offers_needs` (the AI needs↔offers matching) is schema-only.
- Preview-scope Vercel env vars unset (CLI bug) — previews run snapshot mode.
- `src/lib/data/local.ts` is dead code superseded by `provider.ts`'s built-in fallback; safe to delete.
- SAME_OWNER edges are phone-heuristic until SunBiz enrichment runs.
- Everything documented here exists on branch `zac-terminal-v3` (with uncommitted working-tree changes at the time of writing); **nothing has been merged to `main`**.
