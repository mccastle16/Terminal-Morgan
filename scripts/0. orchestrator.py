#!/usr/bin/env python3
"""
Agent 0 — Concurrent Orchestrator
====================================
Runs the full Agent 1 → Agent 2 → Agent 3 pipeline with concurrent
source collection via direct function calls (no subprocess overhead).

Agent 1 adapters run in parallel threads (I/O-bound API calls),
then Agent 2 merges all staging CSVs, then Agent 3 exports.

Usage:
  # Run all free sources concurrently, then validate + export
  python "0. orchestrator.py" --all

  # Run specific sources in parallel
  python "0. orchestrator.py" --sources osm,outscraper

  # Dry-run: collect data but don't merge into master
  python "0. orchestrator.py" --all --dry-run

  # Skip collection, just run Agent 2 + Agent 3 on existing staging
  python "0. orchestrator.py" --merge-only

  # Run enrichment pass on existing master (geocode, ratings, categories)
  python "0. orchestrator.py" --enrich

Requirements:
  pip install requests pandas fuzzywuzzy python-Levenshtein
  # Per-source (install only what you use):
  pip install outscraper          # for outscraper
  pip install apify-client        # for apify
  pip install google-search-results  # for serpapi
"""

import argparse
import importlib.util
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPTS_DIR.parent
MASTER_CSV = PROJECT_ROOT / "data" / "master_all_businesses.csv"
STAGING_DIR = PROJECT_ROOT / "staging"

# Add scripts dir to sys.path so _shared.py is importable
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


# ── Module loaders (handles filenames with spaces) ───────────────
def _load_module(name: str, filename: str):
    """Load a Python module from scripts/ by filename (supports spaces)."""
    path = SCRIPTS_DIR / filename
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# Lazy-load agent modules (loaded once on first use)
_agent_modules = {}


def _get_agent1():
    if "agent1" not in _agent_modules:
        _agent_modules["agent1"] = _load_module("agent1", "1. agent1-osint.py")
    return _agent_modules["agent1"]


def _get_agent2():
    if "agent2" not in _agent_modules:
        _agent_modules["agent2"] = _load_module("agent2", "2. agent2-validator.py")
    return _agent_modules["agent2"]


def _get_agent3():
    if "agent3" not in _agent_modules:
        _agent_modules["agent3"] = _load_module("agent3", "3. agent3-synthesizer.py")
    return _agent_modules["agent3"]


def _get_agent4():
    if "agent4" not in _agent_modules:
        _agent_modules["agent4"] = _load_module("agent4", "4. agent4-actions.py")
    return _agent_modules["agent4"]


# ── Source definitions ───────────────────────────────────────────
SOURCES = {
    "osm": {"requires_key": False, "env_var": None},
    "outscraper": {"requires_key": True, "env_var": "OUTSCRAPER_KEY"},
    "apify": {"requires_key": True, "env_var": "APIFY_TOKEN"},
    "serpapi": {"requires_key": True, "env_var": "SERPAPI_KEY"},
}


def check_keys(sources: list) -> list:
    """Check which sources have valid API keys. Returns list of runnable sources."""
    runnable = []
    for src in sources:
        cfg = SOURCES[src]
        if not cfg["requires_key"]:
            runnable.append(src)
            continue
        key = os.environ.get(cfg["env_var"], "")
        if key:
            runnable.append(src)
            print(f"  [OK]   {src} — key found ({cfg['env_var']})")
        else:
            print(f"  [SKIP] {src} — no key ({cfg['env_var']} not set)")
    return runnable


# ── Agent 1: Direct function calls ──────────────────────────────
def run_agent1(source: str, run_num: int = 1, master: str = "") -> dict:
    """Run Agent 1 scraper for a single source directly. Returns result dict."""
    start = time.time()
    try:
        agent1 = _get_agent1()

        if source == "outscraper":
            records = agent1.scrape_outscraper(run_num)
        elif source == "apify":
            records = agent1.scrape_apify()
        elif source == "serpapi":
            records = agent1.scrape_serpapi(master or str(MASTER_CSV))
        elif source == "osm":
            records = agent1.scrape_osm()
        else:
            return {
                "source": source, "run": run_num, "records": 0,
                "elapsed": 0, "success": False, "error": f"Unknown source: {source}",
            }

        staging_path = agent1.write_staging(records, source, run_num)
        elapsed = round(time.time() - start, 1)

        return {
            "source": source, "run": run_num, "records": len(records),
            "staging_path": staging_path, "elapsed": elapsed, "success": True,
            "error": "",
        }
    except Exception as e:
        return {
            "source": source, "run": run_num, "records": 0,
            "elapsed": round(time.time() - start, 1), "success": False,
            "error": str(e),
        }


# ── Agent 2: Direct function calls ──────────────────────────────
def run_agent2_merge(master: str, staging: str = "", dry_run: bool = False) -> dict:
    """Run Agent 2 validate+merge directly. Returns result dict."""
    start = time.time()
    try:
        agent2 = _get_agent2()
        staging = staging or str(STAGING_DIR)

        # Load & sanitize master
        master_df = agent2.load_master(master)
        master_df, san_stats = agent2.sanitize_master(master_df)
        san_total = sum(san_stats.values())
        if san_total > 0:
            print(f"  Sanitized master ({san_total} fixes)")

        print(f"  Master: {len(master_df)} existing records")

        # Load staging
        raw_records = agent2.load_staging(staging)
        print(f"  Staging: {len(raw_records)} raw records to process")

        if not raw_records:
            print("  No staging records found. Nothing to do.")
            return {"action": "merge", "elapsed": round(time.time() - start, 1),
                    "success": True, "new": 0, "merged": 0}

        # Normalize + validate
        normalized = []
        validation_summary = {"High": 0, "Moderate": 0, "Low": 0}
        for raw in raw_records:
            record = agent2.normalize_record(raw, raw.get("_staging_file", ""))
            if not record:
                continue
            tier, confidence, issues = agent2.validate_record(record)
            record["validation_tier"] = tier
            record["osint_confidence"] = str(confidence)
            if issues:
                record["red_flag_notes"] = "; ".join(issues)
            validation_summary[tier] += 1
            normalized.append(record)

        print(f"  Normalized: {len(normalized)} records")
        print(f"  Validation: High={validation_summary['High']}, "
              f"Moderate={validation_summary['Moderate']}, "
              f"Low={validation_summary['Low']}")

        # Merge
        master_df, merge_stats = agent2.merge_into_master(master_df, normalized, dry_run)
        print(f"  Merge: {merge_stats['new']} new, {merge_stats['merged']} merged, "
              f"{merge_stats['skipped']} skipped")

        # Post-merge sanitization
        master_df, post_san = agent2.sanitize_master(master_df)
        post_total = sum(post_san.values())
        if post_total > 0:
            print(f"  Post-merge sanitization ({post_total} fixes)")

        # Write
        if not dry_run:
            master_df = master_df.sort_values("business_name", key=lambda x: x.str.lower())
            master_df.to_csv(master, index=False)
            print(f"  Master updated: {len(master_df)} total records -> {master}")
            agent2.archive_staging(staging)
        else:
            print(f"  DRY RUN: master would have {len(master_df)} records (not written)")

        return {"action": "merge", "elapsed": round(time.time() - start, 1),
                "success": True, **merge_stats}

    except Exception as e:
        return {"action": "merge", "elapsed": round(time.time() - start, 1),
                "success": False, "error": str(e)}


def run_agent2_enrich(master: str, dry_run: bool = False) -> dict:
    """Run Agent 2 enrichment mode directly."""
    start = time.time()
    try:
        agent2 = _get_agent2()

        # Sanitize before enrichment
        if not dry_run:
            df_pre = agent2.load_master(master)
            df_pre, san_stats = agent2.sanitize_master(df_pre)
            san_total = sum(san_stats.values())
            if san_total > 0:
                df_pre.to_csv(master, index=False)
                print(f"  Pre-enrichment sanitization ({san_total} fixes)")

        agent2.enrich_master(master, dry_run)

        return {"action": "enrich", "elapsed": round(time.time() - start, 1),
                "success": True}
    except Exception as e:
        return {"action": "enrich", "elapsed": round(time.time() - start, 1),
                "success": False, "error": str(e)}


# ── Agent 3: Direct function calls ──────────────────────────────
def run_agent3(master: str, action: str = "export") -> dict:
    """Run Agent 3 action directly."""
    start = time.time()
    try:
        agent3 = _get_agent3()

        if action == "export":
            agent3.action_export(master)
        elif action == "stats":
            agent3.action_stats(master)
        elif action == "schema":
            agent3.action_schema(master)
        elif action == "synthesize":
            agent3.action_synthesize(master)

        return {"action": action, "elapsed": round(time.time() - start, 1),
                "success": True}
    except Exception as e:
        return {"action": action, "elapsed": round(time.time() - start, 1),
                "success": False, "error": str(e)}


# ── Agent 4: Direct function calls ──────────────────────────────
def run_agent4(master: str, top_n: int = 0, category: str = "", dry_run: bool = False, use_llm: bool = True) -> dict:
    """Run Agent 4 action generation directly. Returns result dict."""
    start = time.time()
    try:
        agent4 = _get_agent4()
        result = agent4.generate_all_actions(master, top_n, category, use_llm=use_llm)
        agent4.print_summary(result)
        agent4.write_playbook(result, dry_run)
        return {"action": "actions", "elapsed": round(time.time() - start, 1),
                "success": True, "total_actions": result["stats"]["total_actions"],
                "llm_powered": result["stats"].get("llm_powered", False)}
    except Exception as e:
        return {"action": "actions", "elapsed": round(time.time() - start, 1),
                "success": False, "error": str(e)}


# ── Job builder ──────────────────────────────────────────────────
def build_collection_jobs(sources: list) -> list:
    """Build list of (source, run_num) tuples for parallel execution."""
    jobs = []
    for src in sources:
        if src == "outscraper":
            for run_num in [1, 2, 3]:
                jobs.append((src, run_num))
        else:
            jobs.append((src, 1))
    return jobs


# ── Main ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agent 0 — Concurrent Pipeline Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python "0. orchestrator.py" --all
  python "0. orchestrator.py" --sources osm,outscraper
  python "0. orchestrator.py" --sources osm --dry-run
  python "0. orchestrator.py" --merge-only
  python "0. orchestrator.py" --enrich
  python "0. orchestrator.py" --actions
  python "0. orchestrator.py" --all --act
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Run all sources with valid API keys")
    group.add_argument("--sources", type=str, help="Comma-separated sources: osm,outscraper,apify,serpapi")
    group.add_argument("--merge-only", action="store_true", help="Skip collection, run Agent 2 + 3 on existing staging")
    group.add_argument("--enrich", action="store_true", help="Run enrichment pass on existing master (geocode, ratings)")
    group.add_argument("--actions", action="store_true", help="Run Agent 4 action generation only")

    parser.add_argument("--master", type=str, default=str(MASTER_CSV), help="Path to master CSV")
    parser.add_argument("--dry-run", action="store_true", help="Collect data but don't modify master CSV")
    parser.add_argument("--workers", type=int, default=4, help="Max parallel workers (default: 4)")
    parser.add_argument("--synthesize", action="store_true", help="Also run PKP synthesis after export")
    parser.add_argument("--act", action="store_true", help="Also run Agent 4 action generation after pipeline")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM strategist in Agent 4, use rule-based only")
    args = parser.parse_args()

    start_time = datetime.now()
    print(f"\n{'='*60}")
    print(f"  AGENT 0 — PIPELINE ORCHESTRATOR")
    print(f"  Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Master:  {args.master}")
    print(f"  Mode:    {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"{'='*60}\n")

    # ── Actions-only mode ────────────────────────────────────────
    if args.actions:
        print("  Phase: ACTION GENERATION (Agent 4)\n")
        result = run_agent4(args.master, dry_run=args.dry_run, use_llm=not args.no_llm)
        if result["success"]:
            print(f"  Actions generated in {result['elapsed']}s")
        else:
            print(f"  Action generation failed: {result.get('error', 'unknown')}")
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n  Total time: {elapsed:.0f}s")
        return

    # ── Enrichment-only mode ─────────────────────────────────────
    if args.enrich:
        print("  Phase: ENRICHMENT (backfill existing master rows)\n")
        result = run_agent2_enrich(args.master, args.dry_run)

        if result["success"]:
            print("\n  Phase: EXPORT\n")
            run_agent3(args.master, "export")
            run_agent3(args.master, "stats")
        else:
            print(f"  Enrichment failed: {result.get('error', 'unknown')}")

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n  Total time: {elapsed:.0f}s")
        return

    # ── Merge-only mode ──────────────────────────────────────────
    if args.merge_only:
        print("  Phase: MERGE (Agent 2 on existing staging)\n")
        result = run_agent2_merge(args.master, dry_run=args.dry_run)

        if result["success"] and not args.dry_run:
            print("\n  Phase: EXPORT\n")
            run_agent3(args.master, "export")

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n  Total time: {elapsed:.0f}s")
        return

    # ── Collection mode ──────────────────────────────────────────
    if args.all:
        requested = list(SOURCES.keys())
    else:
        requested = [s.strip() for s in args.sources.split(",")]
        invalid = [s for s in requested if s not in SOURCES]
        if invalid:
            print(f"  ERROR: Unknown sources: {invalid}")
            print(f"  Valid: {list(SOURCES.keys())}")
            return

    # Check API keys
    print("  Phase 1: KEY CHECK\n")
    runnable = check_keys(requested)
    if not runnable:
        print("\n  No runnable sources. Set API keys and retry.")
        return

    # Build job list
    jobs = build_collection_jobs(runnable)
    print(f"\n  Phase 2: COLLECTION ({len(jobs)} jobs, {args.workers} workers)\n")

    # Run Agent 1 scrapers concurrently (ThreadPool — these are I/O-bound)
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(run_agent1, src, run, args.master): (src, run)
            for src, run in jobs
        }
        for future in as_completed(futures):
            src, run = futures[future]
            try:
                result = future.result()
                results.append(result)
                status = "OK" if result["success"] else "FAIL"
                detail = f"{result['records']} records" if result["success"] else result.get("error", "")
                print(f"    [{status}] {src} run={run} ({result['elapsed']}s) {detail}")
            except Exception as e:
                print(f"    [ERR] {src} run={run}: {e}")

    # Summary
    ok = sum(1 for r in results if r["success"])
    total_records = sum(r.get("records", 0) for r in results)
    fail = len(results) - ok
    print(f"\n  Collection: {ok} succeeded, {fail} failed, {total_records} total records")

    # ── Agent 2: Validate & Merge ────────────────────────────────
    if ok > 0:
        print(f"\n  Phase 3: VALIDATE & MERGE (Agent 2)\n")
        merge_result = run_agent2_merge(args.master, dry_run=args.dry_run)

        # ── Agent 3: Export ──────────────────────────────────────
        if merge_result["success"] and not args.dry_run:
            print(f"\n  Phase 4: EXPORT (Agent 3)\n")
            run_agent3(args.master, "export")

            if args.synthesize:
                print(f"\n  Phase 5: SYNTHESIZE (Agent 3)\n")
                run_agent3(args.master, "synthesize")

            # Agent 4: Actions
            if args.act:
                print(f"\n  Phase 6: ACTIONS (Agent 4)\n")
                run_agent4(args.master, dry_run=args.dry_run, use_llm=not args.no_llm)

            # Final stats
            print(f"\n  Phase FINAL: STATS\n")
            run_agent3(args.master, "stats")

    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE")
    print(f"  Total time: {elapsed:.0f}s")
    print(f"  Results: {ok}/{len(jobs)} collection jobs succeeded")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
