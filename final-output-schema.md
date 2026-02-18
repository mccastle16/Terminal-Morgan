# Output Schema — `master_all_businesses.csv`

> 27 canonical fields + 7 PKP synthesis fields = 34 total columns.

---

## Core Identity & Contact

| Field | Description | Source |
|-------|-------------|--------|
| `business_id` | Unique key (normalized name, stripped of LLC/Inc/etc.) | Agent 2 |
| `business_name` | Legal / DBA name | Agent 1 |
| `contact_name` | Primary contact person | Agent 1 |
| `phone` | Primary phone, normalized to (XXX) XXX-XXXX | Agent 2 |
| `website` | Primary URL | Agent 1 |
| `address` | Street address | Agent 1 / Agent 2 enrichment |
| `lat` | Latitude (WGS84) | Agent 1 / Agent 2 enrichment |
| `lon` | Longitude (WGS84) | Agent 1 / Agent 2 enrichment |
| `postcode` | ZIP code (33134, 33146, 33133, 33143) | Agent 2 (inferred from coords) |
| `neighborhood_area` | Miracle Mile, Merrick Park, etc. | Agent 2 (inferred from coords) |

## Category & Economics

| Field | Description | Source |
|-------|-------------|--------|
| `category_primary` | Top-level sector (food_beverage, legal, healthcare, etc.) | Agent 2 (mapped from raw) |
| `category_secondary` | Raw sub-category / specialty | Agent 1 |
| `price_tier` | $, $$, $$$, $$$$ | Agent 1 |

## Agent 1 — OSINT

| Field | Description | Source |
|-------|-------------|--------|
| `rating_primary_value` | Numeric rating (e.g., 4.5) | Agent 1 (Outscraper/Apify/SerpApi) |
| `rating_primary_source` | Google (Outscraper), Google (Apify), etc. | Agent 2 (inferred from source) |
| `rating_primary_review_count` | Number of reviews | Agent 1 |
| `top_delights` | Positive sentiment themes | Agent 3 (future: NLP) |
| `top_pain_points` | Negative sentiment themes | Agent 3 (future: NLP) |
| `osint_confidence` | 0.0-1.0 confidence score | Agent 2 (validation scoring) |

## Agent 2 — Validation

| Field | Description | Source |
|-------|-------------|--------|
| `validation_tier` | High / Moderate / Low | Agent 2 |
| `red_flag_present` | Y / N | Agent 2 |
| `red_flag_severity` | Operational / Critical | Agent 2 |
| `red_flag_notes` | Details (e.g., "Outside Coral Gables bounds; No phone or website") | Agent 2 |

## Agent 3 — PKP Synthesis

| Field | Description | Source |
|-------|-------------|--------|
| `pkp_node_type` | Infrastructure / Platform / Asset | Agent 3 (`--action synthesize`) |
| `pkp_edges_summary` | Connected entities and clusters | Agent 3 |
| `pkp_picks_shovels_summary` | Enabling infrastructure (supply chains, platforms) | Agent 3 |
| `pkp_undercurrents_summary` | Macro forces affecting this business | Agent 3 |
| `pkp_key_signals` | Metrics to watch (rating trends, visibility) | Agent 3 |
| `pkp_primary_risks` | Risk factors (market, operational, regulatory) | Agent 3 |
| `pkp_primary_actions` | Recommended actions (prospect, enrich, monitor) | Agent 3 |

## Meta

| Field | Description | Source |
|-------|-------------|--------|
| `chamber_member` | Y / N | Agent 1 (CGCC directory) |
| `source_file` | Origin: outscraper, apify, serpapi, osm, cgcc, etc. | Agent 1 |
| `batch_id` | Processing batch identifier | Agent 1 |
| `last_reviewed_date` | Last validation/enrichment date (YYYY-MM-DD) | Agent 2 |

---

## PKP Node Types

| Type | Description | Categories |
|------|-------------|------------|
| **Infrastructure** | Foundational systems the ecosystem depends on | Banking, financial services, insurance, real estate, construction, technology, education |
| **Platform** | Businesses that create value by connecting others | Hospitality, food & beverage, arts & culture, wellness, marketing, consulting |
| **Asset** | Businesses that serve end consumers directly | Retail, personal services, auto, healthcare, legal, accounting, professional services, nonprofit |
