# Validation Pipeline Progress

Google Places -> SunBiz ingest -> Normalization -> Candidate generation ->
Deterministic matching -> Confidence scoring -> Reviewable output.

Target area: Coral Gables Chamber of Commerce footprint, derived as 8 zips
from combined.csv (33133, 33134, 33143, 33144, 33146, 33155, 33156, 33158).

## Phase 0 — Parser Validation: ACCEPTED

- `parser.py` + `config/layouts.json` (fixed-width SunBiz cordata/ficdata layouts).
- `test_parser.py` (12 tests), `validate.py` (threshold gate), `acceptance/sample.csv`.
- Do not revisit unless a bug is found.

## Phase 1 — Data Ingest: ACCEPTED

- `phase1_ingest.py` loads Google Places (`combined.csv`) + SunBiz cordata/ficdata into `ingest.db`.
- Sped up ~15x (see perf note below) and re-run to completion:
  - places: 8,395
  - sunbiz_corp: 353,713 (in-zip)
  - sunbiz_fic: 11,453 (in-zip)
  - quarantine: 101 (all in FICFILE.TXT)
  - decode_replacements: 1
- **Perf fix (parser.py):** `_iter_raw_lines`/`_iter_raw_lines_from` had an O(n^2)
  buffer-slicing bug (`buf = buf[idx+2:]` per line) that dominated runtime
  (93.5s of ~130s per cordata file). Replaced with a `bytes.split(b"\r\n")`
  based streamer (`_stream_lines_from_chunks`) -- verified byte-identical
  output, ~15x faster. Regression-tested (test_parser.py still passes).
- **Perf fix (phase1_ingest.py):** added a cheap zip-field pre-filter before
  full per-field parsing in `stream_cordata`/`stream_ficdata` -- ~97% of
  records fall outside the target zip set and were being fully parsed
  (14 fields) before being discarded. Full 10-file cordata + ficdata ingest
  now takes ~1m36s (was projected 20-30 min).
- Note: `ingest_log` table has duplicate rows for cordata0-2 from an earlier
  interrupted run; cosmetic only (data tables use INSERT OR REPLACE keyed on
  doc_number/place_id, unaffected).

## Phase 2 — Normalization: ACCEPTED

- `normalize.py` (pure functions, 37 unit tests in `test_normalize.py`):
  - `normalize_name` / `strip_legal_suffix` / `significant_tokens` for business names.
  - `normalize_street_address` for freeform SunBiz address lines: extracts
    street_number, abbreviates street suffix/directional tokens, splits out
    suite/unit info, detects "C/O" (care-of) lines and falls back to addr2
    when addr1 is a care-of/person line and addr2 starts with a digit.
  - `normalize_street_name` for Google Places' already-separated street field.
  - Accent-folding (NFKD + combining-mark strip) so Google Places names with
    accents (~1.3% of rows) transliterate to ASCII (CAFÉ -> CAFE) instead of
    losing letters -- SunBiz data is pure ASCII and can never carry an accent,
    so this is required for the two sides to ever match on that token.
- `phase2_normalize.py` driver: adds normalized columns to `places`,
  `sunbiz_corp`, `sunbiz_fic` in ingest.db and populates them.
- Generated per spec:
  - significant name tokens (space-joined in `name_tokens` column)
  - DBA bridge: sunbiz_fic.bridge_doc_number/bridge_status resolved via
    owner1_charter_number -> sunbiz_corp.doc_number (7,245 resolved / 2,226
    unresolved / 1,982 no charter number)
  - mailbox/registered-agent indicator: `is_mailbox_or_agent` = keyword match
    (UPS Store, PMB, etc.) OR shared_address_count >= 20 at the exact
    (street_number, street_norm, unit, city, state) combo -- unit is
    deliberately part of the grouping key so a large legitimate office tower
    with many distinct real tenants isn't conflated with one law firm's
    single suite representing hundreds of client LLCs (verified both
    patterns exist in the real data before picking this design). Threshold
    of 20 chosen empirically against the real distribution (fat-tailed;
    2-10 filings at one address/unit is common and normal for FL real-estate
    LLC structuring, so a low threshold like 5 over-flagged 40%+ of rows).
    Result: 69,916/353,713 (19.8%) sunbiz_corp rows flagged, 683/11,453
    sunbiz_fic rows flagged.
- Acceptance evidence: 8,394/8,395 places, 353,713/353,713 sunbiz_corp,
  11,453/11,453 sunbiz_fic have non-empty name_norm (the 1 places exception
  is a Cyrillic-only name with no ASCII transliteration -- acceptable, SunBiz
  has nothing to match it to either).

## Phase 3 — Candidate Generation: ACCEPTED

- `phase3_candidates.py`: for every Google Place, blocks against both
  `sunbiz_corp` and `sunbiz_fic` on ZIP (implicit -- SunBiz already
  pre-filtered) + full normalized address (number + street + unit) OR 2+
  shared significant name tokens. Writes a `candidates` table
  (place_id, source_table, doc_number, block_address_match,
  block_shared_tokens, block_reason) plus `has_candidate_match` flags on
  sunbiz_corp/sunbiz_fic so retained-but-unmatched SunBiz rows are queryable
  without a join (nothing is ever deleted from those tables).
- Three real bugs found and fixed via inspecting actual output before
  accepting (see conversation record for full detail):
  1. Single shared generic word (e.g. "BAY" from "Biscayne Bay Company")
     was enough to link unrelated businesses -> expanded normalize.py's
     stopword list with geo/category filler words empirically measured from
     the real data, AND added a general backstop: token overlap alone now
     needs >=2 shared tokens (`MIN_SHARED_TOKENS_WITHOUT_STREET_MATCH`).
  2. Street-number-only blocking key (no street name) matched businesses on
     completely different streets that coincidentally shared a house number
     within the same zip -> key changed to full (zip, number, street,
     unit).
  3. Unit/suite wasn't part of the address key at all -> one large office
     building's single SunBiz filing (no unit on file) was matching every
     unrelated tenant in every suite of that building. Fixed by adding
     `unit_norm` to places (via new `normalize.extract_unit_from_text`,
     parsed from Google's `formatted_address` since Places has no separate
     unit field) and reducing both sides to a bare identifier
     (`normalize._strip_unit_keyword`) so "SUITE 106" (SunBiz) and "#106"
     (Google, which usually has no keyword at all) compare equal.
- Also fixed a Windows console crash (cp1252 can't encode many real
  business names) by reconfiguring stdout/stderr to utf-8 with
  errors="replace" in all three phaseN scripts.
- Final real-data result: 146,933 candidate rows for 8,395 places (was
  3.48M before the fixes above -- 23.7x reduction). 6,973/8,395 places
  (83.1%) got >=1 candidate. sunbiz_corp: 55,291/353,713 (15.6%) surfaced as
  a candidate, rest retained unmatched. sunbiz_fic: 2,907/11,453 (25.4%)
  surfaced, rest retained unmatched.
- The remaining long tail of high-candidate-count places (up to 1,387) is
  legitimate, not a bug: those are exactly the registered-agent/service-
  provider addresses Phase 2's `is_mailbox_or_agent` flag already
  identifies (e.g. 2330 Ponce de Leon Blvd, 1,339 SunBiz filings). A real
  business physically at a registered agent's address will correctly match
  every one of that agent's clients via address alone -- Phase 4 must
  downweight address-only matches where the candidate's
  `is_mailbox_or_agent = 1`, using name similarity as the dominant signal
  there instead. Do not try to "fix" this further in Phase 3.

## Phase 4 — Deterministic Matching: ACCEPTED

- `phase4_matching.py`: scores every Phase 3 candidate with a transparent,
  additive point system (name similarity via fuzzywuzzy token_sort_ratio,
  0-40 pts; significant-token Jaccard overlap, 0-20 pts; full/partial
  address match, 0-30 pts, reduced to 25% weight when the SunBiz side is
  `is_mailbox_or_agent`; ZIP agreement, 0-5 pts). Classifies LIKELY_MATCH
  (>=65) / AMBIGUOUS (>=30) / NO_MATCH, with a full reason-code list per
  score (e.g. `NAME_SIM_HIGH ADDRESS_FULL_MATCH ZIP_MATCH`). Phone/website
  agreement explicitly recorded as `PHONE_NOT_AVAILABLE`/
  `WEBSITE_NOT_AVAILABLE` -- SunBiz's fixed-width extract has no such
  fields (see layouts.json), so these are honestly marked unavailable
  rather than silently skipped or faked.
- No randomness, no LLM; 9 unit tests in `test_phase4_matching.py` including
  an explicit determinism check (same inputs -> byte-identical output) and
  a check that a mailbox/agent-flagged address match scores strictly lower
  than the same match at a non-flagged address.
- Writes `match_scores` (one row per candidate, full component breakdown)
  and `place_match_summary` (best-scoring candidate per place + counts by
  classification).
- Real-data result (146,933 candidates): LIKELY_MATCH 4,022 (2.7%),
  AMBIGUOUS 45,805 (31.2%), NO_MATCH 97,106 (66.1%). Best-per-place: 3,107
  places (37.0%) best=LIKELY_MATCH, 3,833 (45.7%) best=AMBIGUOUS, 33
  best=NO_MATCH, 1,422 have no candidate at all (matches Phase 3's 0-candidate
  count exactly).
- Spot-checked samples confirm the scoring behaves as intended: near-exact
  name+address matches score ~95 (e.g. "A1-Stop Insurance Agency Inc." <->
  "A1-STOP INSURANCE AGENCY, INC."); fuzzy token-sort correctly handles
  name-order differences ("Acevedo-Crespo Juan Carlos MD" <-> "JUAN CARLOS
  ACEVEDO-CRESPO, M.D., P.A."); same-address-different-business pairs
  correctly land in AMBIGUOUS, not LIKELY_MATCH; generic-category false
  leads from Phase 3 blocking (multiple "Plastic Surgery" LLCs near one
  Google place) correctly land in NO_MATCH once name similarity is scored.

## Phase 5 — Confidence: ACCEPTED

- `phase5_confidence.py`: four SEPARATE deterministic 0-1 confidence scores
  per place (kept separate on purpose, not collapsed into one number, per
  spec) for every place with a LIKELY_MATCH or AMBIGUOUS best candidate:
  - match_confidence: Phase 4 best_score normalized to [0,1].
  - entity_confidence: base by source table, -0.3 if `is_mailbox_or_agent`,
    -0.1 if SunBiz status inactive, +/-0.15/0.05 for DBA bridge resolution
    (fic only).
  - location_confidence: tiered by Phase 4's address-match reason code
    (full/partial/street-number-only/none), -0.3 if mailbox/agent, +0.05 if
    Google has a geocode.
  - operational_confidence: Google business_status + SunBiz filing status
    agreement/conflict (e.g. Google OPERATIONAL + SunBiz inactive scores
    ~0.4-0.5, a genuine "something's off, look closer" signal rather than
    silently averaging away the conflict).
  Website validation, GIS polygon validation, and business-status
  re-verification are explicitly deferred (need new external data sources
  neither Google Places nor SunBiz currently provide) -- only already-
  ingested data is used.
- 16 unit tests in `test_phase5_confidence.py`, all passing.
- Real-data result (6,940/8,395 places with a candidate): match_confidence
  avg 0.68, entity avg 0.57, location avg 0.82, operational avg 0.82.
  Spot-checked: near-identical name+address pairs (e.g. "Books & Books" <->
  "BOOKS & BOOKS") score ~1.0/0.75/0.95/1.0 across all four dimensions;
  the lowest-entity-confidence sample correctly surfaces exactly the risky
  pattern (mailbox/agent address + inactive SunBiz filing + Google says
  operational) for human review, even in cases Phase 4 alone might have
  scored as a passable address-only match.

## Phase 6 — Provenance: ACCEPTED

- `phase6_provenance.py`: builds `validation_report` (one row per Google
  place, PK) with RAW Google fields, RAW matched-SunBiz fields, and
  CURATED/DERIVED fields in clearly separate column groups -- curated
  fields never overwrite raw ones, they sit alongside them so a reviewer
  can always compare "what the sources said" vs "what the pipeline
  concluded." Every row carries the full reason-code evidence trail
  (Phase 3 block_reason + Phase 4 match_reason_codes + all three Phase 5
  reason-code columns) and a `source_attribution` string naming exactly
  which phase/script produced each field group. Exports to
  `validation_report.csv` (the literal reviewable-output deliverable).
- `validation_status` rollup (deterministic from classification + the four
  confidence scores, threshold 0.5 on entity/location/operational):
  VERIFIED_MATCH / LIKELY_MATCH_NEEDS_REVIEW / AMBIGUOUS_NEEDS_REVIEW /
  NO_MATCH / NO_SUNBIZ_CANDIDATE.
- Also builds `sunbiz_unmatched_report` / `.csv`: every SunBiz corp/fic row
  never surfaced as a candidate for any place (has_candidate_match=0),
  carrying `is_mailbox_or_agent` so registered-agent noise is distinguishable
  from genuine "might be a real local business missing from Google Places"
  gap candidates -- nothing is a guess, the flag is the same one computed
  in Phase 2 from real shared-suite filing volume.
- Real-data result: 8,395 validation_report rows -- VERIFIED_MATCH 2,303
  (27.4%), AMBIGUOUS_NEEDS_REVIEW 3,833 (45.7%), NO_SUNBIZ_CANDIDATE 1,422
  (16.9%), LIKELY_MATCH_NEEDS_REVIEW 804 (9.6%), NO_MATCH 33 (0.4%).
  sunbiz_unmatched_report: 306,968 rows, 46,774 mailbox/agent-flagged,
  260,194 not flagged. **Context for that large unmatched count:** the 8
  target zips cover a broad swath of Miami-Dade (not just Coral Gables
  proper), and SunBiz's ~365K in-zip filings include huge numbers of
  holding companies, home-registered LLCs, and inactive/historical filings
  that were never going to have a Google Places storefront presence at all
  -- a large unmatched count is expected, not a sign the pipeline missed
  real businesses. Filter to `is_mailbox_or_agent=0` and `status=A` for a
  more realistic outreach-candidate subset.

---

## End-to-end pipeline: COMPLETE (2026-07-27)

All 6 phases accepted with real data, unit tests, and inspected samples at
every stage. Run order from a clean `ingest.db`:

```
python phase1_ingest.py      # ~1.5 min -- Google Places + SunBiz -> ingest.db
python phase2_normalize.py   # ~35s     -- normalized name/address columns
python phase3_candidates.py  # ~5s      -- candidates table (blocking)
python phase4_matching.py    # ~10s     -- match_scores + place_match_summary
python phase5_confidence.py  # ~1s      -- confidence_scores
python phase6_provenance.py  # ~2s      -- validation_report.csv + sunbiz_unmatched_report.csv
```

Deliverables: `validation_report.csv` (8,395 rows, one per Google place),
`sunbiz_unmatched_report.csv` (306,968 rows, retained-unmatched SunBiz).

**Known first-pass simplifications, worth revisiting before production use**
(deliberately deferred per "optimize for working end-to-end first"):
- Score weights and thresholds (Phase 4's 65/30 cut points, Phase 5's 0.5
  review threshold, Phase 3's shared-address threshold of 20) were tuned by
  inspecting real samples but are not statistically validated against a
  labeled ground-truth set. No labeled ground truth exists yet.
- No phone/website agreement scoring -- SunBiz's extract structurally has
  neither field.
- `ingest_log` has cosmetic duplicate rows from an early interrupted run
  (data tables unaffected, see Phase 1 notes).
- `_UNIT_ID_RE` unit extraction, `LEGAL_SUFFIXES`, and the geo/category
  stopword list in normalize.py were built from real-data inspection but
  are not exhaustive -- expect occasional misses on unusual formatting.
