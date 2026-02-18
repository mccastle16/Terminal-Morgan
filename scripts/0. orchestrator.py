#!/usr/bin/env python3
"""
Agent 0 — Concurrent Orchestrator
====================================
Runs the full Agent 1 → Agent 2 → Agent 3 pipeline with concurrent
source collection.  Agent 1 adapters run in parallel (one process per
source), then Agent 2 merges all staging CSVs, then Agent 3 exports.

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
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
MASTER_CSV = Path(__file__).parent.parent / "data" / "master_all_businesses.csv"
STAGING_DIR = Path(__file__).parent.parent / "staging"

# Source definitions: name → (requires_key, env_var, extra_args)
SOURCES = {
    "osm": {
        "requires_key": False,
        "env_var": None,
        "args": ["--source", "osm"],
    },
    "outscraper": {
        "requires_key": True,
        "env_var": "OUTSCRAPER_KEY",
        "args": ["--source", "outscraper", "--run", "{run}"],
    },
    "apify": {
        "requires_key": True,
        "env_var": "APIFY_TOKEN",
        "args": ["--source", "apify"],
    },
    "serpapi": {
        "requires_key": True,
        "env_var": "SERPAPI_KEY",
        "args": ["--source", "serpapi", "--master", str(MASTER_CSV)],
    },
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


def run_agent1(source: str, run_num: int = 1) -> dict:
    """Run Agent 1 for a single source. Returns result dict."""
    agent1 = SCRIPTS_DIR / "1. agent1-osint.py"
    cfg = SOURCES[source]
    args = [a.replace("{run}", str(run_num)) for a in cfg["args"]]

    cmd = [sys.executable, str(agent1)] + args
    start = time.time()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 min timeout per source
            cwd=str(SCRIPTS_DIR.parent),
        )
        elapsed = time.time() - start
        return {
            "source": source,
            "run": run_num,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "elapsed": round(elapsed, 1),
            "success": result.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        return {
            "source": source,
            "run": run_num,
            "returncode": -1,
            "stdout": "",
            "stderr": "Timeout (600s)",
            "elapsed": 600,
            "success": False,
        }
    except Exception as e:
        return {
            "source": source,
            "run": run_num,
            "returncode": -1,
            "stdout": "",
            "stderr": str(e),
            "elapsed": time.time() - start,
            "success": False,
        }


def run_agent2(master: str, dry_run: bool = False) -> dict:
    """Run Agent 2 to validate and merge staging into master."""
    agent2 = SCRIPTS_DIR / "2. agent2-validator.py"
    cmd = [sys.executable, str(agent2), "--master", master]
    if dry_run:
        cmd.append("--dry-run")

    start = time.time()
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=300,
        cwd=str(SCRIPTS_DIR.parent),
    )
    return {
        "action": "validate+merge",
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "elapsed": round(time.time() - start, 1),
        "success": result.returncode == 0,
    }


def run_agent2_enrich(master: str) -> dict:
    """Run Agent 2 in enrichment mode to backfill existing master rows."""
    agent2 = SCRIPTS_DIR / "2. agent2-validator.py"
    cmd = [sys.executable, str(agent2), "--master", master, "--enrich"]

    start = time.time()
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=600,
        cwd=str(SCRIPTS_DIR.parent),
    )
    return {
        "action": "enrich",
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "elapsed": round(time.time() - start, 1),
        "success": result.returncode == 0,
    }


def run_agent3(master: str, action: str = "export") -> dict:
    """Run Agent 3 to export/stats/synthesize."""
    agent3 = SCRIPTS_DIR / "3. agent3-synthesizer.py"
    cmd = [sys.executable, str(agent3), "--master", master, "--action", action]

    start = time.time()
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=300,
        cwd=str(SCRIPTS_DIR.parent),
    )
    return {
        "action": action,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "elapsed": round(time.time() - start, 1),
        "success": result.returncode == 0,
    }


def build_collection_jobs(sources: list) -> list:
    """Build list of (source, run_num) tuples for parallel execution."""
    jobs = []
    for src in sources:
        if src == "outscraper":
            # Run all 3 Outscraper chunks concurrently
            for run_num in [1, 2, 3]:
                jobs.append((src, run_num))
        else:
            jobs.append((src, 1))
    return jobs


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
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Run all sources with valid API keys")
    group.add_argument("--sources", type=str, help="Comma-separated sources: osm,outscraper,apify,serpapi")
    group.add_argument("--merge-only", action="store_true", help="Skip collection, run Agent 2 + 3 on existing staging")
    group.add_argument("--enrich", action="store_true", help="Run enrichment pass on existing master (geocode, ratings)")

    parser.add_argument("--master", type=str, default=str(MASTER_CSV), help="Path to master CSV")
    parser.add_argument("--dry-run", action="store_true", help="Collect data but don't modify master CSV")
    parser.add_argument("--workers", type=int, default=4, help="Max parallel workers (default: 4)")
    parser.add_argument("--synthesize", action="store_true", help="Also run PKP synthesis after export")
    args = parser.parse_args()

    start_time = datetime.now()
    print(f"\n{'='*60}")
    print(f"  AGENT 0 — CONCURRENT PIPELINE ORCHESTRATOR")
    print(f"  Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Master:  {args.master}")
    print(f"  Mode:    {'DRY RUN' if args.dry_run else 'LIVE'}")
    print(f"{'='*60}\n")

    # ── Enrichment-only mode ─────────────────────────────────────
    if args.enrich:
        print("  Phase: ENRICHMENT (backfill existing master rows)\n")
        result = run_agent2_enrich(args.master)
        print(result["stdout"])
        if result["stderr"]:
            print(result["stderr"])

        if result["success"]:
            print("\n  Phase: EXPORT\n")
            export = run_agent3(args.master, "export")
            print(export["stdout"])
            stats = run_agent3(args.master, "stats")
            print(stats["stdout"])

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n  Total time: {elapsed:.0f}s")
        return

    # ── Merge-only mode ──────────────────────────────────────────
    if args.merge_only:
        print("  Phase: MERGE (Agent 2 on existing staging)\n")
        result = run_agent2(args.master, args.dry_run)
        print(result["stdout"])
        if result["stderr"]:
            print(result["stderr"])

        if result["success"] and not args.dry_run:
            print("\n  Phase: EXPORT\n")
            export = run_agent3(args.master, "export")
            print(export["stdout"])

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

    # Run Agent 1 concurrently
    results = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(run_agent1, src, run): (src, run)
            for src, run in jobs
        }
        for future in as_completed(futures):
            src, run = futures[future]
            try:
                result = future.result()
                results.append(result)
                status = "OK" if result["success"] else "FAIL"
                print(f"    [{status}] {src} run={run} ({result['elapsed']}s)")
                if not result["success"] and result["stderr"]:
                    for line in result["stderr"].strip().split("\n")[:3]:
                        print(f"           {line}")
            except Exception as e:
                print(f"    [ERR] {src} run={run}: {e}")

    # Summary
    ok = sum(1 for r in results if r["success"])
    fail = len(results) - ok
    print(f"\n  Collection: {ok} succeeded, {fail} failed")

    # Print Agent 1 output
    for r in results:
        if r["stdout"]:
            print(f"\n  --- {r['source']} (run {r['run']}) ---")
            # Show last 5 lines of output (the summary)
            lines = r["stdout"].strip().split("\n")
            for line in lines[-5:]:
                print(f"  {line}")

    # ── Agent 2: Validate & Merge ────────────────────────────────
    if ok > 0:
        print(f"\n  Phase 3: VALIDATE & MERGE (Agent 2)\n")
        merge_result = run_agent2(args.master, args.dry_run)
        print(merge_result["stdout"])
        if merge_result["stderr"]:
            print(merge_result["stderr"])

        # ── Agent 3: Export ──────────────────────────────────────
        if merge_result["success"] and not args.dry_run:
            print(f"\n  Phase 4: EXPORT (Agent 3)\n")
            export = run_agent3(args.master, "export")
            print(export["stdout"])

            if args.synthesize:
                print(f"\n  Phase 5: SYNTHESIZE (Agent 3)\n")
                synth = run_agent3(args.master, "synthesize")
                print(synth["stdout"])

            # Final stats
            print(f"\n  Phase FINAL: STATS\n")
            stats = run_agent3(args.master, "stats")
            print(stats["stdout"])

    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE")
    print(f"  Total time: {elapsed:.0f}s")
    print(f"  Results: {ok}/{len(jobs)} collection jobs succeeded")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
