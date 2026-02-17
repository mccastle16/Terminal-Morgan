# OSINT Full Schema — Field Reference

> Originally `data/3. osint-full.csv` — an empty template containing the canonical 27-field header used across all pipeline outputs.

---

## Fields

| # | Field | Description |
|---|-------|-------------|
| 1 | `business_id` | Unique slug identifier (lowercase, no spaces) |
| 2 | `business_name` | Display name |
| 3 | `contact_name` | Primary contact / owner |
| 4 | `phone` | Phone number |
| 5 | `website` | Website URL |
| 6 | `address` | Street address |
| 7 | `lat` | Latitude |
| 8 | `lon` | Longitude |
| 9 | `postcode` | ZIP code (33134, 33146, 33133, 33143) |
| 10 | `neighborhood_area` | Sub-area within Coral Gables |
| 11 | `category_primary` | Primary business category |
| 12 | `category_secondary` | Secondary category / subcategory |
| 13 | `price_tier` | Price tier ($, $$, $$$, $$$$) |
| 14 | `rating_primary_value` | Primary rating value |
| 15 | `rating_primary_source` | Rating source (Google, Yelp, Multi-platform) |
| 16 | `rating_primary_review_count` | Number of reviews |
| 17 | `top_delights` | Key positive signals from OSINT |
| 18 | `top_pain_points` | Key negative signals from OSINT |
| 19 | `osint_confidence` | Confidence level (Low, Medium, High) |
| 20 | `validation_tier` | Validation quality tier |
| 21 | `red_flag_present` | Whether red flags exist (Y/N) |
| 22 | `red_flag_severity` | Severity if flagged |
| 23 | `red_flag_notes` | Red flag details |
| 24 | `chamber_member` | CGCC member status (Y/N) |
| 25 | `source_file` | Originating data source |
| 26 | `batch_id` | Processing batch identifier |
| 27 | `last_reviewed_date` | Last review/update date |

---

## Usage

This schema is the contract between all three agents:

- **Agent 1** (Discovery) outputs raw records with these fields
- **Agent 2** (Validation) normalizes into this schema
- **Agent 3** (Synthesis) writes final CSV with this header

See also: [final-output-schema.md](../final-output-schema.md)
