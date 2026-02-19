# scripts/ Agent Efficiency Review

## Executive answer

Short answer: **partly**.

- The pipeline design is good for I/O-heavy collection (Agent 0 parallelizes source calls).
- Agent 2 has one expensive step (fuzzy dedup) that is not asymptotically minimized.
- Agent 3 synthesis is linear, but implemented with `iterrows()+loc` so it is slower than necessary.

For your current scale (~3k rows), this is acceptable. For 10k+ rows, you should optimize fuzzy matching and row-wise DataFrame mutation.

## Big-O by script

| Script | Dominant operation | Big-O (rough) | Notes |
|---|---|---:|---|
| `0. orchestrator.py` | Job building + future collection | **O(s + j)** | Efficient orchestration; wall time improves via thread parallelism for I/O calls. |
| `1. agent1-osint.py` | External API fetch loops | **O(r)** local work | Mostly network-bound; local CPU complexity is fine. |
| `2. agent2-validator.py` | Exact-key merge + fuzzy matching | **O(n + m·n)** worst-case | Dict-based exact dedup is good; fuzzy fallback compares each new name against all existing names. |
| `3. agent3-synthesizer.py` | Single pass synthesis | **O(n)** | Correct asymptotic complexity; implementation overhead from row-wise writes. |

Legend: `n` = existing master rows, `m` = incoming normalized rows, `r` = returned API records, `s` = requested sources, `j` = generated jobs.

## What is already efficient

1. **Concurrent I/O orchestration (good):**
   Agent 0 uses `ThreadPoolExecutor` and `as_completed`, which is the right model for external API calls.

2. **Hash-based exact dedup in Agent 2 (good):**
   Agent 2 precomputes key/name lookup dicts so exact matches are O(1).

3. **Vectorized sanitization in Agent 2 (good):**
   Many cleanup passes are vectorized pandas operations rather than Python row loops.

## Main inefficiencies

1. **Agent 2 fuzzy dedup path is expensive:**
   `fuzzy_match(name, existing_names)` runs `extractOne` against the full `existing_names` list for each unmatched incoming record. In worst case this becomes O(m·n) string-comparison-heavy work.

2. **Agent 2 build of lookup dicts uses `iterrows()`:**
   This is still O(n) but has higher constant factors than column-vectorized / zipped access.

3. **Agent 3 synthesis uses `iterrows()` with repeated `df.loc[idx, col]` assignment:**
   Still O(n), but each cell write has overhead; vectorized/`apply`/list-accumulate then single assignment would be faster.

## Are you running these efficiently today?

**Yes for current scale, with caveats.**

- If your monthly increments are a few hundred to low-thousands of rows, current runtime is practical.
- If you expect frequent full re-merges or growth toward 10k–50k rows, your bottleneck will be Agent 2 fuzzy dedup.

## Practical optimization order (highest ROI first)

1. **Block fuzzy candidates before `extractOne`:**
   Compare only names sharing simple keys (first token, first letter + zip, trigram bucket).
2. **Use RapidFuzz instead of fuzzywuzzy:**
   Lower constant factors, same matching style.
3. **Batch Agent 3 writes:**
   Compute output columns into Python lists and assign full columns once.
4. **Avoid full-file rewrites when not needed:**
   If possible, append-only plus periodic compact/sort.

## Recommended run strategy

- Keep using Agent 0 with selective sources (`--sources ...`) and avoid unnecessary full `--all` runs.
- Prefer `--merge-only` when staging already exists.
- Run `--enrich` less frequently than collection (e.g., weekly/monthly), since it is network-latency-bound.
- Keep `--workers` near API/provider limits; increasing threads past that gives little benefit.
