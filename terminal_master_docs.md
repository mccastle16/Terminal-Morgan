# terminal_master_docs.md

## 1. Executive Summary

**Observed**
- The current README positions The Terminal as a Coral Gables OSINT business intelligence database and agent-based pipeline for mapping the local business ecosystem. It states coverage of **2,884 unique businesses** against a target of **~4,400**, with chamber-member and non-member coverage already embedded in the current system design.
- The uploaded CSV currently contains **2,868 rows** and **36 columns**.
- The README already describes dashboard views such as Browse / Discover, Business Explorer, Analytics, Risk Radar, Market Intel, Ecosystem, Compare, which means the product is not starting from a blank conceptual slate.

**Inference**
- The strongest product story is not “we could someday build chamber intelligence.” It is “the data substrate, pipeline, and first dashboard grammar already exist; now they need to be packaged as a chamber-grade decision system.”

**Recommendation**
- Position The Terminal as a **local business intelligence system** for chambers of commerce: a decision platform that combines discovery, enrichment, synthesis, scoring, and strategic actioning.
- Keep Coral Gables as the proof-of-concept market, but architect tenancy, taxonomy, and geography layers so the same product can scale to chambers, cities, districts, and local business ecosystems.

**Why it matters**
- Chambers sit on a structurally valuable but under-instrumented position in a local market: they convene businesses, events, sponsorships, partnerships, advocacy, and economic development, yet most chambers still operate from fragmented directories, CRM exports, anecdotal board knowledge, and manual prospecting.
- The Terminal converts that fragmentation into a navigable market map.

**Who it serves**
- Chamber leadership
- Membership and growth teams
- Economic development stakeholders
- Chamber members
- Sponsors and institutional partners
- Non-members who can be converted via teaser access

**Why chambers are the wedge**
- Chambers have a clear need for member growth, sponsor packaging, market visibility, and ecosystem stewardship.
- They already sell membership, sponsorship, events, and access. That creates natural monetization rails for The Terminal.
- Chambers are easier to penetrate than full municipal procurement and more strategic than pure SMB direct sales.

**Why this can become a repeatable category-defining product**
- The README explicitly states the framework is portable across municipalities and districts.
- The CSV schema already mixes identity, location, classification, review signals, validation, risk, and PKP synthesis.
- That combination is not a generic dashboard. It is the beginning of a **local intelligence operating layer**.

---

## 2. Product Vision

### Product vision statement
The Terminal is a Bloomberg-style local business intelligence terminal for chambers of commerce: a system that helps chamber operators and local businesses understand the market, prioritize action, and make better growth decisions.

### Long-term ambition
Create the default intelligence layer for local business ecosystems: one product that can serve chambers, cities, districts, business alliances, and ecosystem partners with shared but permissioned intelligence.

### Category definition
**Category name recommendation:** Local Ecosystem Intelligence Platform  
Alternate names:
- Chamber Intelligence Terminal
- Local Market Command Center
- Business Ecosystem Intelligence System

### Why “Bloomberg-style terminal” is the right metaphor
**Observed**
- The current system already has multiple specialized views, structured data, and synthesis fields.
- The dataset includes both raw business facts and synthesized strategic fields.

**Inference**
- The right mental model is not “directory” or “reporting dashboard.” It is a terminal: dense, navigable, insight-rich, continuously updated, and decision-oriented.

### Jobs this product does by user type
- **Leadership:** Understand market coverage, member penetration, whitespace, risk, and strategic opportunities.
- **Members:** Understand reputation, competitors, local demand signals, and action paths.
- **Non-members:** Get a glimpse of signal quality and be converted into membership or paid access.
- **Sponsors/partners:** Find audience segments, priority sectors, and partnership targets.

### What makes this more than a dashboard
- It combines **collection, normalization, synthesis, ranking, and action recommendations**.
- It supports entity-level exploration and market-level oversight.
- It can become an operational layer for recruitment, retention, sponsorship, and ecosystem development.

---

## 3. Problem Statement

### Chamber leadership
**Observed**
- The README frames the current project around chamber members, non-members, and “everything in between.”
- The CSV includes `chamber_member`, geography, category, validation, risk, and PKP signals.

**Problem**
Chamber leaders usually cannot answer, with confidence:
- Which relevant businesses in the market are not members
- Which categories are underpenetrated
- Which members are strategically important but at risk
- Where the chamber has sponsorship whitespace
- Which sectors are rising, saturated, or underserved

**Revenue problem**
Without this visibility, chambers underperform in:
- member recruitment
- retention targeting
- sponsor packaging
- board-level strategy
- ecosystem positioning

### Chamber members
Members rarely get local-market intelligence. They get events, networking, and promotional placement, but not a structured view of:
- where they sit in the market
- what customers praise or dislike
- who their nearest peers or threats are
- what local whitespace exists

### Non-members
Non-members do not yet feel the intelligence gap. A teaser tier creates a new conversion path by letting them see that the chamber provides not just community, but market signal.

### Local economic development stakeholders
Cities, districts, and institutions need market-level visibility into sector health, concentration, business density, and risk patterns. Most do not have a continuously synthesized local market layer.

### Sponsors / advertisers / partners
Sponsors need audience and category intelligence. They want to know where to place capital, who is influential, and which sectors or corridors matter. Chambers usually sell sponsorship with broad inventory, not intelligence-led packaging.

---

## 4. User Personas

### Chamber CEO / President
- **Goals:** Grow relevance, membership, sponsor revenue, and board confidence
- **Pains:** Fragmented data, anecdotal strategy, manual market understanding
- **Current alternatives:** CRM exports, spreadsheets, board memory, manual Google searches
- **Decisions:** Where to recruit, what to sponsor, which sectors matter, what board story to tell
- **Why they care:** Better strategic visibility and a stronger growth narrative

### Chamber Membership Director
- **Goals:** Acquire and retain members efficiently
- **Pains:** Prospecting is manual and poorly prioritized
- **Current alternatives:** Chamber directory, LinkedIn, local search, lists
- **Decisions:** Who to call first, which corridors to focus on, what value proposition to use
- **Why they pay:** Time savings and higher conversion from prioritized outreach

### Chamber Economic Development Lead
- **Goals:** Understand ecosystem health and sector shifts
- **Pains:** No unified business map with signal quality
- **Current alternatives:** ad hoc studies, census fragments, vendor reports
- **Decisions:** Which sectors to support, where to intervene, who to convene
- **Why they care:** Better local strategy and stakeholder reporting

### Chamber Member — Small Business Owner
- **Goals:** Understand local competition, reviews, and opportunity
- **Pains:** Limited market intelligence budget
- **Current alternatives:** Yelp, Google Maps, intuition
- **Decisions:** Where to improve, who to partner with, how to position locally
- **Why they care:** Better operating decisions from local signal

### Chamber Member — Professional Services Firm
- **Goals:** Find local targets, referral networks, and category whitespace
- **Pains:** Generic directories do not reveal strategic context
- **Current alternatives:** networking and manual business development
- **Decisions:** Which firms to target, which sectors are underserved, where to sponsor
- **Why they care:** Better local commercial focus

### Chamber Member — Hospitality / Retail / Wellness / Legal
- **Goals:** Reputation management, peer comparison, local demand understanding
- **Pains:** Platform metrics are fragmented
- **Current alternatives:** review platforms and instinct
- **Decisions:** pricing, service focus, partnerships, neighborhood positioning
- **Why they care:** Faster response to local market undercurrents

### Non-member local business owner
- **Goals:** Grow visibility and local relevance
- **Pains:** No trusted view of local competitive context
- **Current alternatives:** free search and social listening
- **Decisions:** Whether chamber membership has strategic value
- **Why they care:** teaser insights reveal the opportunity cost of staying out

### Sponsor / Institutional partner
- **Goals:** Reach targeted local business audiences
- **Pains:** Sponsorship packages are broad and not insight-led
- **Current alternatives:** event sponsorship, local media, direct outreach
- **Decisions:** what to sponsor, who to reach, what sectors to back
- **Why they care:** smarter local placement and measurable targeting

---

## 5. Product Tiers and Access Model

| Tier | What they can see | What they cannot see | What is locked/blurred | Conversion logic | Monetization logic |
|---|---|---|---|---|---|
| Leadership Tier | Full market map, member vs non-member analysis, risk, scoring, exports, reports | N/A | None | Anchor product value | Chamber license / seat bundle |
| Member Tier | Own profile, peer compare, category intel, review themes, limited reports | Full recruit list, sensitive flags, cross-market admin views | Deep competitive sets, some exports | Included as member benefit or paid premium | Chamber add-on or member premium |
| Non-member Teaser | Limited profile, a few benchmark insights, glossed market summary | Full reports, deep compare, strategic actions | Competitor names, complete rankings, exports | Convert to chamber membership or paid trial | Lead-gen wedge |
| Sponsor / Partner Tier | Aggregated audience/category insights, sector snapshots, packaging views | Member-sensitive risk flags, full internal ops views | Named sensitive signals | Sell smarter packages | Sponsor insights package |
| Admin / Analyst Tier | Data QA, refresh status, schema health, tenant settings | External commercial views | N/A | Internal efficiency | Internal use |

**Recommendation**
- Leadership should be the initial paid buyer.
- Member access should be a chamber-controlled entitlement.
- Non-member teaser should be visible in demos and on a public landing surface.
- Sponsor tier is a Phase 2 monetization layer, not the wedge.

---

## 6. PRD (Product Requirements Document)

### Product name
The Terminal

### Working tagline options
- Local Business Intelligence for Chambers
- The Chamber Market Map
- Decision Intelligence for Local Business Ecosystems
- A Bloomberg-Style Terminal for Chamber Strategy

### Objective
Turn existing OSINT and chamber-enriched business data into a repeatable chamber product that improves member acquisition, strategic visibility, sponsorship packaging, and ecosystem intelligence.

### Users
- Chamber executives
- Membership teams
- Economic development leads
- Chamber members
- Non-member businesses
- Sponsors / partners
- Internal analysts/admins

### Jobs to be done
- Find and prioritize non-member prospects
- Understand category and corridor penetration
- Benchmark businesses locally
- Surface risk and market shifts
- Package sponsor opportunities with evidence
- Demonstrate chamber value with intelligence, not just access

### Key workflows
1. Leadership opens Overview and sees market health, coverage, and recruit targets
2. Membership Director opens Recruit Queue and works prioritized outreach
3. Member opens their profile and sees peer compare + local actions
4. Non-member sees teaser insights and hits upgrade path
5. Sponsor sees sector audience package and partnership inventory

### Feature set
- Searchable entity directory
- Business profile pages
- Category and geography analytics
- Member vs non-member segmentation
- Compare view
- Risk radar
- Recruitability and influence scoring
- Reports/exports
- Role-based access
- Multi-tenant chamber administration

### Release priorities
- **P0:** Directory, profiles, analytics, member segmentation, compare, risk views
- **P1:** scoring, saved reports, alerts, paywall, member-tier gating
- **P2:** sponsor package tooling, white-labeling, deeper workflow automation

### Constraints
- Current source data has known discrepancies
- `chamber_member` field is incomplete in the uploaded CSV
- Some review-theme fields have sparse fill
- Geography and address completeness are not yet full coverage

### Non-goals
- Full CRM replacement
- Full municipal economic modeling in MVP
- Real-time event-driven ingestion on day one
- Heavy predictive modeling without interpretability

### Success criteria
- Pilot chamber uses product weekly
- Membership team can derive prioritized recruit lists
- Leadership can answer penetration and whitespace questions in-product
- Members perceive intelligence value beyond directory access
- Chamber renews and expands

### Dependencies
- Stable master dataset
- Defined tenant model
- Role-based permissions
- Frontend capable of entity search, compare, and dashboards
- Pipeline refresh cadence and QA workflows

### Assumptions
- Chambers are willing to pay for intelligence if tied to member growth and sponsor revenue
- Current Coral Gables dataset is strong enough for a first pilot narrative
- Portability can be achieved through geography + taxonomy configuration, not total rebuild

---

## 7. Feature Architecture

| Layer | Feature | Description | Target user | Business value | Technical complexity | Priority | Phase |
|---|---|---|---|---|---|---|---|
| Core Data Layer | Canonical business registry | Unified business table with source lineage | All | Foundation of product trust | Medium | P0 | MVP |
| Core Data Layer | Geography normalization | Neighborhood, corridor, zip, map-ready coordinates | Leadership, Members | Market segmentation | Medium | P0 | MVP |
| Intelligence Layer | Member status segmentation | Distinguish members, non-members, unknowns | Leadership | Recruitment engine | Medium | P0 | MVP |
| Intelligence Layer | Recruitability score | Rank likely chamber prospects | Membership | Faster prospecting | Medium | P1 | Phase 2 |
| Intelligence Layer | Influence score | Identify strategically important businesses | Leadership, Sponsors | Better partnerships | Medium | P1 | Phase 2 |
| Intelligence Layer | Reputation score | Combine rating and review proxies | Members, Leadership | Reputation monitoring | Low | P1 | MVP/Phase 2 |
| Intelligence Layer | Market opportunity score | Spot whitespace by category/geography | Leadership, Members | Strategic decisions | Medium | P1 | Phase 2 |
| Dashboard / UX Layer | Overview dashboard | Market snapshot and KPI tiles | Leadership | Immediate value | Medium | P0 | MVP |
| Dashboard / UX Layer | Business Explorer | Rich business profile pages | All | Entity-level actionability | Medium | P0 | MVP |
| Dashboard / UX Layer | Compare | Side-by-side business compare | Members, Leadership | Benchmarking | Low | P0 | MVP |
| Dashboard / UX Layer | Risk Radar | Flag review, validation, or data issues | Leadership | Prioritize intervention | Low | P0 | MVP |
| Conversion Layer | Teaser tier | Limited preview for non-members | Non-members | Lead conversion | Medium | P1 | Phase 2 |
| Monetization Layer | Reports & exports | Packaged PDFs/CSVs/slides | Leadership, Sponsors | Additional revenue | Medium | P1 | Phase 2 |
| Portability Layer | Tenant config | City/chamber-specific geo/taxonomy setup | Internal/Admin | Scale path | High | P1 | Phase 2 |
| Admin Layer | Refresh monitor | Track ingestion and data freshness | Internal/Admin | Trust and operations | Medium | P1 | Phase 2 |

---

## 8. Use Case Expansion

### 1. Chamber Leadership
- **Primary jobs:** understand the ecosystem, recruit strategically, defend board decisions, grow revenue
- **Primary screens:** Overview, Recruit Map, Category Gaps, Risk Radar, Sponsorship Opportunities
- **High-value workflows:** review penetration by sector, export target list, save board-ready report
- **Key decisions enabled:** who to target, what sectors to prioritize, where chamber influence is weak
- **Insights that matter most:** member/non-member ratios, whitespace, influential businesses, risk clusters
- **Alerts/reports/exports:** monthly recruit report, category gap alerts, at-risk flagship members
- **Premium upsell:** additional seats, sponsor packaging, citywide benchmark layer

### 2. Chamber Members
- **Primary jobs:** benchmark locally, improve reputation, spot opportunities, understand peers
- **Primary screens:** My Market Position, Reviews & Themes, Peer Compare, Neighborhood Snapshot
- **High-value workflows:** compare against peers, see top pain points, identify partnership candidates
- **Key decisions enabled:** service improvement, positioning, local partnership, sponsor/event participation
- **Insights that matter most:** reputation, local peer standing, neighborhood demand context
- **Alerts/reports/exports:** monthly reputation digest, compare exports, category report
- **Premium upsell:** advanced benchmarks, custom reports, category leaderboards

### 3. Non-members
- **Primary jobs:** assess whether chamber membership or premium access is worth it
- **Primary screens:** Teaser profile, local snapshot, limited compare, value explainer
- **High-value workflows:** see own profile, view blurred peer ranking, click upgrade
- **Key decisions enabled:** join chamber, request demo, buy premium access
- **Insights that matter most:** partial benchmark, limited review themes, local visibility snapshot
- **Alerts/reports/exports:** gated sample report
- **Premium upsell:** join membership, paid trial, sponsored category package

---

## 9. Information Architecture

### Top-level nav
- Overview
- Browse
- Business Explorer
- Analytics
- Risk Radar
- Market Intel
- Ecosystem
- Compare
- Reports
- Alerts
- Admin

### Sub-pages / modules
- Overview
  - Executive Summary
  - Membership Penetration
  - Category Gaps
  - Geography Heatmap
- Browse
  - Directory Table
  - Saved Filters
- Business Explorer
  - Profile
  - Reviews & Themes
  - Signals
  - Risks
  - Actions
- Analytics
  - Category
  - Neighborhood
  - Member vs Non-member
- Market Intel
  - Whitespace
  - Emerging Sectors
  - Partnership Signals
- Compare
  - Side-by-side compare
  - Peer sets
- Reports
  - Scheduled reports
  - Exports
- Alerts
  - Data freshness
  - Risk alerts
  - Opportunity alerts
- Admin
  - Tenant settings
  - User roles
  - Refresh status
  - Schema health

### Search and filters
- Business name
- Category
- Neighborhood/corridor
- Member status
- Validation tier
- Red flag status
- Rating band
- Website present / missing
- Coordinates present / missing
- Source lineage

### Paywall / upgrade paths
- Non-member profile lock states
- Blurred compare leaderboards
- Export disabled states
- Upgrade CTAs tied to chamber membership or premium access

---

## 10. UX / UI Blueprint

### Design principles
- Dense but navigable
- Analytical, not ornamental
- Trust-forward with visible data lineage
- Fast search and compare
- Clear gating by tier

### Visual tone
A modern local-intelligence terminal:
- dark or neutral foundation
- high-contrast typography
- restrained accent colors for status, risk, and opportunities
- map + table + card hybrid layout

### Panel system
- Left navigation rail
- Primary content canvas
- Optional right-side detail or action drawer
- Persistent filter chips

### Modules
- KPI cards for coverage, penetration, risk, recruitability
- Table views for prospecting and exports
- Map views for corridor/neighborhood analysis
- Comparison modules for peers
- Alerts center
- Scorecards with explainability
- Profiles with evidence, signals, and recommended actions

### Tier-gated behavior
- Leadership sees full panels and exports
- Members see business-centric views, limited market views
- Non-members see partial cards and blurred competitor data

### Mobile vs desktop
- Desktop is primary for leadership workflows
- Mobile supports quick lookups, teaser access, and member profile checks
- Heavy compare and analytics should remain desktop-first

---

## 11. Data Model and Entity Model

### Core entities
- **Business**
- **Chamber**
- **Membership Status**
- **Category**
- **Neighborhood**
- **Review Signal**
- **Risk Signal**
- **Opportunity Signal**
- **Competitor Set**
- **Report**
- **Alert**
- **User**
- **Subscription Tier**
- **Tenant / Account**
- **Playbook**

### Likely relationships
- Chamber has many users
- Chamber has many businesses in coverage universe
- Business belongs to zero/one chamber membership state per tenant
- Business belongs to one primary category and optional subcategory
- Business maps to one or more neighborhoods/corridors over time
- Business has many review/risk/opportunity signals
- Business belongs to zero/many competitor sets
- User belongs to one tenant and one or more permission roles

### Primary keys
- `business_id` should remain the business natural/normalized identifier, but production should also add a stable UUID
- `tenant_id`
- `user_id`
- `report_id`
- `alert_id`
- `competitor_set_id`

### Important dimensions
- category
- neighborhood
- member status
- validation tier
- source lineage
- rating band
- review count band
- data freshness

### Metrics
- total businesses in universe
- member count
- non-member count
- unknown membership count
- penetration ratio
- category coverage
- neighborhood density
- average rating by cohort
- red flag incidence
- recruitability score distribution

### How the CSV maps into production schema
**Observed**
- The CSV is already effectively a denormalized business mart.
- It contains identity, location, classification, review, risk, synthesis, and provenance fields.

**Recommendation**
Split into:
1. `business_core`
2. `business_location`
3. `business_classification`
4. `business_reputation`
5. `business_validation`
6. `business_membership`
7. `business_pkp_signals`
8. `business_source_evidence`

That keeps ingestion simple while enabling tenant-aware overlays later.

---

## 12. Intelligence Model

### Recruitability Score
- **Purpose:** rank non-member or unknown businesses by likelihood of chamber relevance and conversion value
- **Inputs:** category fit, location quality, website presence, phone presence, review strength, validation tier, source corroboration
- **Output:** 0-100 score plus band
- **Business use:** membership prioritization
- **Caution:** do not equate data completeness with business desirability

### Business Influence Score
- **Purpose:** identify locally important businesses
- **Inputs:** review volume, source corroboration, category prominence, corridor visibility, PKP node type
- **Output:** influence rank
- **Business use:** partnership, board, sponsor, flagship attention
- **Caution:** influence proxies may favor digitally visible businesses

### Local Visibility Score
- **Purpose:** estimate discoverability in the local ecosystem
- **Inputs:** website presence, rating presence, review count, corroboration count, category visibility
- **Output:** visibility band
- **Business use:** member coaching, teaser value
- **Caution:** should be framed as proxy, not absolute truth

### Reputation Score
- **Purpose:** summarize market-facing reputation
- **Inputs:** rating value, review count, pain/delight themes, red flags
- **Output:** reputation scorecard
- **Business use:** member benchmarking
- **Caution:** sparse review-theme coverage requires transparent confidence

### Market Opportunity Score
- **Purpose:** detect whitespace by category and geography
- **Inputs:** local density, member penetration, rating dispersion, category gaps, undercurrents
- **Output:** opportunity band
- **Business use:** chamber strategy, sponsor packages, member expansion thinking
- **Caution:** requires market calibration and local human sense-check

### Competitor Threat Score
- **Purpose:** help members assess local competition
- **Inputs:** peer density, reputation, visibility, corridor clustering
- **Output:** ranked threat set
- **Business use:** member decision support
- **Caution:** must be presented carefully to avoid overstated certainty

### Sponsorship Value Score
- **Purpose:** package sponsor opportunities with evidence
- **Inputs:** sector density, influence, events relevance, category concentration, partner fit
- **Output:** sponsor package ranking
- **Business use:** non-dues revenue
- **Caution:** requires sponsor inventory model and chamber packaging rules

---

## 13. Analytics and KPI Framework

### North star metric
**Qualified ecosystem actions generated per month**, defined as high-confidence decisions or workflows triggered by the platform (recruit targets actioned, sponsor packages created, member benchmark reports used).

### Leadership KPIs
- member penetration by category
- member penetration by neighborhood
- recruit target count
- recruit conversion rate
- sponsor package yield
- strategic business coverage

### Member engagement KPIs
- member logins
- benchmark reports viewed
- compare actions taken
- profile claim/completion
- renewal correlation with product usage

### Non-member conversion KPIs
- teaser views
- demo requests
- membership inquiries
- teaser-to-member conversion
- teaser-to-paid report conversion

### Product health KPIs
- WAU/MAU by role
- report exports
- search-to-profile clickthrough
- save/share actions
- alert interaction rate

### Data freshness / intelligence quality
- % records refreshed within SLA
- % records with valid geo
- % records with rating signal
- % records with corroboration > 1
- discrepancy resolution time

### Revenue / monetization
- chamber license ARR
- sponsor package revenue
- member premium attach rate
- paid reports revenue
- expansion revenue by chamber

### Health thresholds
- Membership unknowns should trend down
- refresh coverage should trend up
- chamber leadership weekly engagement should exceed casual monthly check-in patterns
- error/dispute resolution should stay operationally manageable

### Cohort views
- by chamber
- by user role
- by category
- by geography
- by membership tenure

### Funnel views
- non-member teaser → inquiry → membership
- leadership demo → pilot → annual contract
- member entitlement → active usage → renewal

---

## 14. Monetization Strategy

### Core business model
1. **Chamber license**
2. **Seat or role-based access**
3. **Member premium intelligence**
4. **Sponsor insights package**
5. **Paid reports / exports**
6. **White-labeled city intelligence subscriptions**

### Packaging logic
- **Pricing hypothesis:** annual chamber license should be primary, because strategic systems are budgeted more easily than per-report ad hoc purchases
- **Pricing estimate logic:** size pricing by business universe size, seat count, and feature depth
- **Packaging option:** starter, growth, and flagship chamber packages

### Revenue layers
- Chamber base license
- Additional leadership seats
- Member premium upgrade
- Sponsor insight deck / category report
- Custom ecosystem reports
- White-label city or district instance

### Annual vs monthly
- Annual should be default for chambers
- Monthly can exist for pilots or teaser packages
- Member premium can be monthly or included in premium chamber memberships

### Enterprise vs chamber-tier packaging
- Enterprise/city tier should include multi-stakeholder access, benchmarking across zones, and white-label outputs
- Chamber-tier should focus on leadership decision support and member value

---

## 15. GTM Strategy

### Wedge
Sell to chambers as a **member growth + sponsor intelligence** system, not as generic analytics software.

### ICP
- Growth-minded chambers
- Chambers with meaningful non-dues revenue ambitions
- Chambers that want a modern board story
- Chambers serving dense local business ecosystems

### Buyer map
- President/CEO
- Membership Director
- Economic Development lead
- Sponsorship/partnership lead
- Board champions

### Objections
- “We already have a CRM.”
- “We already have a member directory.”
- “This feels too advanced.”
- “Is this data trustworthy?”
- “Will staff actually use it?”

### Proof points
- Existing Coral Gables substrate
- Current multi-agent pipeline
- Existing dashboard views
- chamber/non-member framing already embedded in source material

### Pilot motion
- 1 chamber
- fixed time-box
- clear baseline and success metrics
- founder-led implementation and training

### Sales motion
- founder-led discovery
- live demo on Coral Gables
- show recruit queue, category gaps, teaser/member differentiation
- sell annual pilot with success criteria

### Partnership motion
- chamber associations
- local economic development groups
- sponsor networks
- city/district alliances

### Demo flow
1. Executive overview
2. Market coverage and penetration
3. Recruit targets
4. Business explorer
5. Member benchmarking
6. Non-member teaser
7. Reports and expansion path

### Land-and-expand
- Start with leadership tier
- add member access
- add sponsor package tooling
- add white-label district/city layer

### Why Coral Gables is the proof of concept
- Dense and prestigious market
- Clear chamber structure
- existing data already assembled
- credible wedge for adjacent South Florida expansion

---

## 16. Competitive Framing

### What this product is
A local business intelligence system that combines directory-scale coverage with enrichment, validation, synthesis, and decision support.

### What this product is not
- not just a CRM report
- not just a chamber directory
- not just Yelp/Google browsing
- not just a BI dashboard
- not a generic market research tool

### Conceptual comparisons
- **CRM reports:** know contacts, not the market
- **Local directories:** list businesses, but do not synthesize strategy
- **Yelp / Google Maps browsing:** fragmented, manual, not chamber-aware
- **Chamber membership lists:** only show members, not the full opportunity universe
- **BI dashboards:** summarize metrics, but often lack entity-level operability
- **Economic development tools:** often macro and static, not chamber-operational
- **Generic market research tools:** broad but not local and not tenant-specific

### Differentiation
The Terminal sits between directory, OSINT stack, and strategic operating layer. Its edge is local density plus chamber-specific actionability.

---

## 17. Roadmap

### 0-30 days
- **Product:** define MVP workflows and role gating
- **Data:** resolve membership discrepancies and document source lineage
- **UX:** finalize IA and low-fidelity terminal layout
- **Infrastructure:** stand up stable data serving path
- **Monetization:** define pilot package
- **GTM:** build demo narrative and one-pager
- **Pilot/CS:** identify first pilot chamber

### 31-60 days
- **Product:** build overview, browse, explorer, analytics, compare, risk
- **Data:** normalize membership overlay and QA exception list
- **UX:** implement desktop-first UI
- **Infrastructure:** role-based auth and export controls
- **Monetization:** package leadership + member entitlements
- **GTM:** run founder demos
- **Pilot/CS:** onboard pilot chamber

### 61-90 days
- **Product:** add saved reports, alerts, scoring v1
- **Data:** refresh workflows and discrepancy resolution loop
- **UX:** polish gating and teaser views
- **Infrastructure:** tenant abstraction basics
- **Monetization:** test sponsor insight package
- **GTM:** convert pilot to annual
- **Pilot/CS:** collect usage proofs and testimonials

### 6 months
- Multi-tenant foundation
- recruitability scoring
- member premium workflows
- sponsor packaging module
- case studies and repeatable implementation playbook

### 12 months
- White-label capability
- city/district expansion
- richer alerting and automation
- benchmark layer across chambers
- institutional partner packages

---

## 18. Delivery Plan

### Fastest path to MVP
- Use current Coral Gables dataset
- Build a leadership-first dashboard on top of current business mart
- Resolve membership field ambiguity with a deterministic overlay table
- Launch with browse, profiles, analytics, compare, risk, and exports

### Pilot-ready version
- Add auth, role gating, branded chamber layer, and onboarding
- Add recruit queue and presentation-ready reports
- Add member-facing profile and benchmark views

### Production SaaS version
- Multi-tenant data model
- tenant-specific branding and permissions
- structured refresh and QA ops
- billing and entitlements

### Multi-tenant version
- chamber as tenant
- tenant-specific business membership overlays
- separate user bases
- tenant-specific reports and exports

### White-label version
- variable geography and taxonomy configs
- brand pack per tenant
- optional city/district mode

---

## 19. Technical Architecture

### Likely architecture
- **Ingestion:** batch source collection from OSM, Outscraper, SerpApi, directory discovery
- **Enrichment:** validation, geocoding, category remap, review/rating enrichment
- **Validation:** canonical schema checks, deduplication, discrepancy logging
- **Synthesis:** PKP fields and strategic summaries
- **Storage:** normalized warehouse plus denormalized serving layer
- **API layer:** read API for business search, profiles, reports, and admin health
- **Frontend:** modern web app, likely React-based given current dashboard
- **Auth:** role-based auth with chamber tenant awareness
- **RBAC:** leadership, member, teaser, sponsor, admin
- **Multi-tenancy:** chamber/tenant model with shared core schema and tenant overlays
- **Observability:** ingestion logs, refresh status, schema validation, row-level QA exceptions
- **Data refresh cadence:** batch weekly or monthly in MVP; selective refresh later
- **Versioning:** dataset snapshots by batch/date
- **Export layer:** CSV/PDF/report exports with entitlement checks

### What can remain batch-based
- source collection
- enrichment
- score recomputation
- nightly/weekly export generation

### What should become event-driven later
- alerts
- in-app report generation
- usage analytics
- dispute/correction routing

### What needs to be tenant-aware from day one
- users
- roles
- entitlements
- branding
- membership overlays
- exports/reports access

---

## 20. Governance, Risk, and Trust

### Principles
- public-data provenance must remain visible
- confidence should be explicit, not implied
- sensitive or adverse signals should be explainable
- correction workflows must exist
- chamber ethics matter because local reputations are involved

### Governance components
- provenance by source
- freshness timestamps
- confidence bands
- dispute handling
- audit trail for changes
- permissioning by role and tenant

### Risks
- false positives in membership or risk flags
- overconfidence from sparse data
- reputation sensitivity when showing competitor or risk views
- unclear ownership of “truth” when public sources disagree
- tenant leakage if multi-tenancy is implemented poorly

### Recommendation
Introduce a trust layer in-product:
- “Observed facts”
- “Synthesized signals”
- “Confidence”
- “Last refreshed”
- “Request correction”

---

## 21. RASCI

| Workstream | Founder / CEO | Product Lead | Engineering Lead | Data Engineering | Frontend Engineer | Design | GTM / Sales | Chamber Success | Legal / Compliance | Research / OSINT Ops |
|---|---|---|---|---|---|---|---|---|---|---|
| Product strategy | A | R | C | C | C | C | C | C | I | C |
| Data ingestion | I | C | A | R | I | I | I | I | I | S |
| Enrichment | I | C | A | R | I | I | I | I | I | S |
| Scoring | C | A | C | R | I | I | I | I | I | S |
| UI build | I | A | C | I | R | S | I | C | I | I |
| QA | I | A | C | R | R | C | I | C | I | C |
| Pricing | A | R | I | I | I | I | S | C | C | I |
| Sales collateral | A | C | I | I | I | S | R | C | I | I |
| Pilot onboarding | A | C | I | I | I | I | C | R | I | I |
| Support | I | C | I | I | I | I | I | A/R | I | I |
| Analytics | C | A | C | R | C | I | I | C | I | I |
| Security | I | C | A | R | C | I | I | I | C | I |
| Roadmap ownership | A | R | C | C | C | C | C | C | I | I |

Legend: R = Responsible, A = Accountable, S = Support, C = Consulted, I = Informed

---

## 22. Documentation Set Recommendation

| File | Purpose | Owner | When to create |
|---|---|---|---|
| `PRD.md` | Product definition and requirements | Product Lead | Immediately |
| `roadmap.md` | Delivery sequencing | Product + Founder | Immediately |
| `architecture.md` | Technical architecture and tenancy model | Engineering Lead | Immediately |
| `data-model.md` | Canonical schema and normalized entities | Data Engineering | Immediately |
| `pricing-packaging.md` | Commercial packaging and pricing hypotheses | Founder + GTM | Before pilot pricing |
| `gtm.md` | ICP, pitch, objections, demo flow | GTM / Founder | Before outreach |
| `analytics-kpis.md` | Success metrics and product instrumentation | Product + Data | Before pilot |
| `risk-governance.md` | Trust, provenance, disputes, permissions | Legal + Product | Before external launch |
| `pilot-plan.md` | Pilot execution plan | Chamber Success | Before pilot onboarding |
| `onboarding.md` | User onboarding and training | Chamber Success | Before first customer |
| `faq.md` | Sales and customer FAQs | GTM + Success | Before scaled selling |

---

## 23. Pilot Plan

### Included
- Leadership dashboard
- Browse, explorer, analytics, compare, risk views
- Chamber member vs non-member overlay
- Recruit target list
- Training session and monthly review

### Timeline
- Week 1: data reconciliation and configuration
- Week 2-4: product setup and role configuration
- Week 5-8: pilot usage, training, iteration
- Week 9-12: ROI review and renewal proposal

### Success metrics
- weekly leadership usage
- recruit list actionability
- member-facing perceived value
- sponsor story usefulness
- renewal / expansion decision

### Data needed
- chamber member roster with stable identifiers
- sponsorship inventory
- user list and roles
- current strategic priorities by category/geography

### Onboarding steps
1. chamber kickoff
2. data reconciliation
3. role setup
4. training
5. weekly check-ins
6. final review

### Outputs
- executive baseline report
- recruitability shortlist
- category gap report
- sponsor opportunity snapshot
- renewal recommendation

### Renewal / expansion triggers
- pilot used in leadership workflows
- membership team adopts recruit queue
- chamber wants member access
- sponsor packaging shows value

---

## 24. Open Questions

### Product
- Should member access be included or upsold?
- How much of compare should be exposed to non-members?
- Which actions should be automated vs advisory?

### Data
- What is the authoritative chamber membership source?
- How should unknown/blank membership states be treated operationally?
- What refresh SLA is realistic for pilot vs production?

### Commercial
- Is the wedge sold as retention + growth, or intelligence + revenue?
- Is sponsor packaging a module or service layer?
- What packaging size best fits mid-market chambers?

### Legal / trust
- What adverse business signals should be shown externally?
- What correction rights do businesses have?
- What disclaimers are required for public-source intelligence?

### Technical
- Do you serve directly from CSV in MVP or move immediately to a database/API?
- What tenancy model is simplest without rework?
- How do you snapshot historical refreshes?

### Design
- How dense should the terminal feel for chamber operators?
- Where should trust indicators live in each profile?
- What is the minimum viable mobile experience?

---

## 25. Founder Recommendation

Build **leadership-first chamber intelligence** before broader ecosystem ambitions.

### What to build first
- Overview
- Browse
- Business Explorer
- Analytics
- Compare
- Risk Radar
- Recruit target workflow
- Basic exports
- Role gating

### What not to build yet
- full white-label infrastructure
- complex predictive AI
- real-time ingestion
- heavy sponsor workflow automation
- macro economic development modules beyond current data support

### Monetization wedge
Sell a chamber license around **member growth, whitespace visibility, and sponsor intelligence**.

### First buyer
Chamber CEO / President with Membership Director as operational co-owner.

### Strongest story
“The chamber already convenes the market. The Terminal lets it finally see the market.”

---

# Appendix A — Source File Facts

## README.md
**Observed**
- Describes an OSINT pipeline covering Coral Gables zip codes 33134, 33146, 33133, 33143.
- States **2,884 unique businesses** and target of ~4,400.
- States chamber members = **843** and non-members = **2,041**.
- Describes production-ready agents for orchestrator, discovery, validation, and synthesis.
- Describes a React/Vite dashboard with views including Browse, Business Explorer, Analytics, Risk Radar, Market Intel, Ecosystem, and Compare.
- States portability is designed into the framework.

## master_all_businesses.csv
**Observed**
- Current uploaded CSV has **2,868 rows** and **36 columns**.
- Top membership value counts: {'': 1219, 'Y': 843, 'N': 806}.
- Top categories: {'other': 691, 'food_beverage': 417, 'retail': 233, 'education': 197, 'healthcare': 179, 'legal': 138, 'accounting': 107, 'professional_services': 98, 'wellness': 96, 'construction': 89, 'hospitality': 88, 'personal_services': 82, 'nonprofit': 66, 'marketing': 58, 'banking': 58}.
- Top neighborhoods: {'Coral Gables': 1542, 'Ponce de Leon Corridor': 299, 'Bird Road Corridor': 240, 'Sunset / South Gables': 187, 'Miracle Mile': 182, 'Douglas Road Corridor': 147, 'University of Miami Area': 96, '': 78, 'Alhambra Circle': 45, 'University of Miami': 26, 'downtown coral gables': 6, 'Merrick Park': 5}.
- PKP node type counts: {'asset': 1649, 'platform': 720, 'infrastructure': 499}.
- Validation tiers: {'Moderate': 1319, 'High': 1174, 'Low': 368, '': 7}.
- Red flag counts: {'Y': 1471, 'N': 1397}.

---

# Appendix B — CSV Data Dictionary

| Column | Likely meaning |
|---|---|
| `business_id` | Internal identifier or normalized slug for a business entity. |
| `business_name` | Canonical display name for the business. |
| `contact_name` | Named operator or contact when available. |
| `phone` | Primary business phone. |
| `website` | Primary website URL. |
| `address` | Street address or display address. |
| `lat` | Latitude coordinate. |
| `lon` | Longitude coordinate. |
| `postcode` | Postal code; useful for geography and service area cuts. |
| `neighborhood_area` | Neighborhood or corridor label. |
| `category_primary` | Primary business taxonomy bucket. |
| `category_secondary` | Subcategory or source-level classification. |
| `price_tier` | Price tier proxy from source listings. |
| `rating_primary_value` | Primary external rating value, usually review-platform derived. |
| `rating_primary_source` | Source of the rating field. |
| `rating_primary_review_count` | Review volume tied to the primary rating. |
| `top_delights` | Positive review themes or synthesized delights. |
| `top_pain_points` | Negative review themes or synthesized pain points. |
| `osint_confidence` | Confidence estimate for OSINT synthesis. |
| `validation_tier` | Validation quality tier. |
| `red_flag_present` | Binary flag for notable issues. |
| `red_flag_severity` | Severity of issue if flagged. |
| `red_flag_notes` | Human-readable reason for risk or data issue. |
| `chamber_member` | Membership indicator as represented in current dataset. |
| `source_file` | Source lineage or originating import. |
| `batch_id` | Load or pipeline batch identifier. |
| `last_reviewed_date` | Last review/enrichment date. |
| `pkp_node_type` | PKP entity role classification. |
| `pkp_edges_summary` | Relationship summary in PKP framing. |
| `pkp_picks_shovels_summary` | Infrastructure/support role summary. |
| `pkp_undercurrents_summary` | Macro undercurrent summary for local market. |
| `pkp_key_signals` | Important synthesized market signals. |
| `pkp_primary_risks` | Main synthesized risks. |
| `pkp_primary_actions` | Suggested next actions. |
| `corroboration_sources` | Sources used to corroborate the record. |
| `corroboration_count` | Count of corroborating sources. |

---

# Appendix C — MVP vs Later


| Capability | User | Why it matters | Can build now from current source data? | Phase |
|---|---|---|---|---|
| Business directory with search and filters | All | Turns raw coverage into usable exploration | Yes | MVP |
| Business profile pages | Leadership, Members | Makes every entity legible and actionable | Yes | MVP |
| Chamber member vs non-member segmentation | Leadership | Core recruitment and penetration analysis | Partial | MVP |
| Category and neighborhood analytics | Leadership | Reveals gaps and whitespace | Yes | MVP |
| Risk radar based on existing flags | Leadership | Surfaces records needing verification or intervention | Yes | MVP |
| Compare businesses side by side | Members, Leadership | Enables local benchmarking | Yes | MVP |
| Review-theme insights | Members | Converts ratings into action | Partial | Phase 2 |
| Recruitability scoring | Membership Director | Prioritizes outreach | Partial | Phase 2 |
| Sponsorship value scoring | Leadership, Sponsors | Packages audience and influence for revenue | Partial | Phase 2 |
| Alerts and recurring reports | Leadership, Members | Moves from browse-only to decision system | Partial | Phase 2 |
| Multi-tenant chamber support | Internal/Admin | Enables repeatability across cities | Partial | Phase 2 |
| Self-serve non-member teaser with paywall | Non-members | Conversion wedge | Partial | Phase 2 |
| White-label city intelligence portals | Chambers/Cities | Scale path beyond Coral Gables | No | Phase 3 |


# Appendix D — Source Discrepancies and Resolutions

| Discrepancy | Likely cause | Operational fix | Product implication |
|---|---|---|---|
| README says 2,884 businesses; uploaded CSV has 2,868 rows | README not updated after latest export, or uploaded CSV is a later filtered snapshot | Establish versioned dataset manifest and reconcile counts per batch | Trust risk if product KPIs are presented without version stamp |
| README says 843 chamber members and 2,041 non-members; CSV contains 843 `Y`, 806 `N`, and 1,219 blank membership values | Membership overlay likely incomplete in current CSV export | Create authoritative membership overlay table and backfill unknowns | Leadership recruit analysis is weakened until membership states are resolved |
| README notes 70% lat/lon completeness; uploaded CSV shows 68.3% for `lat` and 68.3% for `lon` | dataset drift or different counting method | Define fill-rate calculation rules in stats job | KPI reporting needs a single measurement method |
| README frames dashboard as 15+ pages; uploaded artifact set only includes README + CSV | Documentation exists outside current upload set | Create explicit product docs set and pin the source-of-truth repo state | Product planning should not assume artifacts are always present in sales/pilot contexts |

