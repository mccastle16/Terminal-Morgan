# Output Schema — `all_biz_osint.csv`

---

## Core Identity & Contact

| Field | Description |
|-------|-------------|
| `business_id` | Unique key (normalized name hash) |
| `business_name` | Legal / DBA name |
| `contact_name` | Primary contact |
| `phone` | Primary phone |
| `website` | Primary URL |
| `address` | Street address |
| `neighborhood_area` | Miracle Mile, Merrick Park, etc. |

## Category & Economics

| Field | Description |
|-------|-------------|
| `category_primary` | Top-level sector |
| `category_secondary` | Sub-category / specialty |
| `price_tier` | $, $$, $$$, $$$$ |

## Agent 1 — OSINT

| Field | Description |
|-------|-------------|
| `rating_primary_value` | Numeric rating (e.g., 4.5) |
| `rating_primary_source` | Google, Yelp, etc. |
| `rating_primary_review_count` | Number of reviews |
| `rating_secondary_value` | Alternate platform rating |
| `rating_secondary_source` | Alternate platform name |
| `top_delights` | Positive sentiment themes |
| `top_pain_points` | Negative sentiment themes |
| `osint_confidence` | 0.0–1.0 confidence score |

## Agent 2 — Validation

| Field | Description |
|-------|-------------|
| `validation_tier` | Low / Moderate / High |
| `validation_confidence` | 0.0–1.0 |
| `red_flag_present` | Y / N |
| `red_flag_severity` | Operational / Critical |
| `red_flag_category` | Reputation, Ethics, etc. |
| `red_flag_notes` | Details |

## Agent 3 — PKP Synthesis

| Field | Description |
|-------|-------------|
| `pkp_node_type` | Infrastructure / Platform / Asset |
| `pkp_edges_summary` | Connected entities |
| `pkp_picks_shovels_summary` | Enabling infrastructure |
| `pkp_undercurrents_summary` | Macro forces |
| `pkp_key_signals` | Metrics to watch |
| `pkp_primary_risks` | Risk factors |
| `pkp_primary_actions` | Recommended actions |

## Meta

| Field | Description |
|-------|-------------|
| `chamber_member` | Y / N |
| `batch_id` | Processing batch identifier |
| `last_reviewed_date` | Last validation date |
