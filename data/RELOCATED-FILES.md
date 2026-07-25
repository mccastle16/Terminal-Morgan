# Relocated client data (2026-07-07)

Per REBUILD-PLAN.md risk register D8 #1, the following files were **moved out of
this repository** (removed from the branch tip; git history intentionally NOT
purged, per operator instruction):

| File | Contents | New location |
|---|---|---|
| `lt-patient-list.csv` | 620 patient records (names, emails, phones, 377 DOBs) — unrelated CO_ client engagement | `Desktop\CO_client-data\` on the operator machine |
| `lt-patient-list copy.csv` | byte-identical duplicate | same |
| `leadgen.csv` | 1,457 marketing contacts + generated outreach scripts | same |
| `original-leadgen.csv` | 1,934 raw CRM export (person-level PII, UTMs) | same |
| `leadgen-excel.xlsx` (+ `~$` lock file) | Excel export of the above | same |

`.gitignore` now blocks re-adding them. Also remember: a cleaned variant
(`lt-patient-list_cleaned.csv`) exists on branch `claude/enrich-client-list-DroVR`.

**Action still open:** move `Desktop\CO_client-data\` into CO_'s canonical
private client-file storage (Drive/S3/etc.) — the desktop folder is a staging
spot, not a destination. If the patient-list source is a healthcare provider,
get counsel on BA/HIPAA status before further processing (D8 ⭐).
