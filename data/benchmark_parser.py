"""Three-way benchmark: old (pre-fix) vs current (corrected, always per-field
decode) vs optimized (fast/slow-path adaptive) parser.parse_line implementations.

Isolates pure parse/decode CPU cost by reading each sample's raw lines into
memory ONCE (shared across all three implementations) and timing only the
parse step -- disk I/O is identical for all three and measured separately.

Run from the `data/` directory:  python benchmark_parser.py
"""
import importlib.util
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parser as optimized

SCRATCH_BENCH_DIR = os.environ.get(
    "PARSER_BENCH_DIR",
    r"C:\Users\mccas\AppData\Local\Temp\claude\c--Users-mccas-OneDrive-Documents-GitHub-Terminal"
    r"\5f7c509f-a871-4c03-914a-7c6c6b491a02\scratchpad\parser_bench",
)

FICDATA_PATH = os.path.join("ficdata", "FICFILE.TXT")
CORDATA_PATH = os.path.join("cordata", "cordata0.txt")

FICDATA_SAMPLE_LINES = 200000   # covers all known casualty/corruption lines (max known: 181809)
CORDATA_SAMPLE_LINES = 150000

# real full-dataset sizes, from the actual production run (data/phase1_output.log)
REAL_CORDATA_TOTAL_LINES = 1280693 + 1280953 + 1280886 + 1280973 + 1280925 + 1280730 + 1280786 + 1280748 + 1280754 + 1280748
REAL_FICDATA_TOTAL_LINES = 761101
REAL_CORDATA_FILES = 10

# measured end-to-end (I/O + parse) seconds/file from the actual run using the
# CURRENT (corrected, per-field-decode) implementation -- used to translate
# the pure-parse speedup measured here into a realistic full-run estimate.
MEASURED_CURRENT_CORDATA_SEC_PER_FILE = (112.8 + 132.1 + 152.4) / 3  # first 3 shards, before it was stopped
MEASURED_CURRENT_FICDATA_TOTAL_SEC = None  # never completed under `current`; not available


def _load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


old = _load_module("parser_old", os.path.join(SCRATCH_BENCH_DIR, "parser_old.py"))
current = _load_module("parser_current", os.path.join(SCRATCH_BENCH_DIR, "parser_current.py"))


def read_sample(path, n_lines, encoding):
    lines = []
    for raw, ln in optimized._iter_raw_lines(path, encoding):
        lines.append(raw)
        if len(lines) >= n_lines:
            break
    return lines


def run_old(raw_lines, file_type, layouts, enc):
    ok = length_mismatch = decode_error = 0
    for raw in raw_lines:
        try:
            text = raw.decode(enc)
        except UnicodeDecodeError:
            decode_error += 1
            continue
        rec = old.parse_line(text, file_type, layouts=layouts)
        if rec["_ok"]:
            ok += 1
        else:
            length_mismatch += 1
    return {"ok": ok, "length_mismatch": length_mismatch, "decode_error": decode_error, "decode_replacement": None}


def run_current(raw_lines, file_type, layouts):
    ok = length_mismatch = decode_error = decode_replacement = 0
    for raw in raw_lines:
        rec = current.parse_line(raw, file_type, layouts=layouts)
        if rec["_ok"]:
            ok += 1
            if rec.get("_had_decode_replacement"):
                decode_replacement += 1
        else:
            if rec["_error"]["kind"] == "length_mismatch":
                length_mismatch += 1
            else:
                decode_error += 1
    return {"ok": ok, "length_mismatch": length_mismatch, "decode_error": decode_error,
             "decode_replacement": decode_replacement}


def run_optimized(raw_lines, file_type, layouts):
    ok = length_mismatch = decode_error = decode_replacement = 0
    for raw in raw_lines:
        rec = optimized.parse_line(raw, file_type, layouts=layouts)
        if rec["_ok"]:
            ok += 1
            if rec.get("_had_decode_replacement"):
                decode_replacement += 1
        else:
            if rec["_error"]["kind"] == "length_mismatch":
                length_mismatch += 1
            else:
                decode_error += 1
    return {"ok": ok, "length_mismatch": length_mismatch, "decode_error": decode_error,
             "decode_replacement": decode_replacement}


def bench(fn, *args):
    t0 = time.perf_counter()
    result = fn(*args)
    elapsed = time.perf_counter() - t0
    return elapsed, result


def report_file_type(name, path, file_type, n_lines, layouts, total_real_lines, real_file_count=1,
                      measured_current_full_run_sec_per_file=None):
    enc = layouts[file_type]["encoding"]
    print(f"\n{'=' * 78}\n{name}: sampling {n_lines} lines from {path}\n{'=' * 78}")
    raw_lines = read_sample(path, n_lines, enc)
    n = len(raw_lines)
    print(f"sample size actually read: {n}")

    results = {}
    for label, fn, args in (
        ("old (whole-line decode, char-slice)", run_old, (raw_lines, file_type, layouts, enc)),
        ("current (per-field byte-decode)", run_current, (raw_lines, file_type, layouts)),
        ("optimized (fast/slow-path adaptive)", run_optimized, (raw_lines, file_type, layouts)),
    ):
        elapsed, counts = bench(fn, *args)
        rps = n / elapsed if elapsed > 0 else float("inf")
        results[label] = (elapsed, rps, counts)
        est_full_sec = (total_real_lines / rps) if rps else None
        print(f"\n{label}")
        print(f"  elapsed: {elapsed:.3f}s   throughput: {rps:,.0f} records/sec")
        print(f"  counts: ok={counts['ok']}  length_mismatch={counts['length_mismatch']}  "
              f"decode_error={counts['decode_error']}  decode_replacement={counts['decode_replacement']}")
        print(f"  pure-parse estimate for full dataset ({total_real_lines:,} lines): {est_full_sec:.1f}s "
              f"({est_full_sec / 60:.1f} min)")

    cur_counts = results["current (per-field byte-decode)"][2]
    opt_counts = results["optimized (fast/slow-path adaptive)"][2]
    identical = (cur_counts["ok"] == opt_counts["ok"]
                 and cur_counts["length_mismatch"] == opt_counts["length_mismatch"]
                 and cur_counts["decode_error"] == opt_counts["decode_error"]
                 and cur_counts["decode_replacement"] == opt_counts["decode_replacement"])
    print(f"\ncurrent vs optimized counts identical: {identical}")
    if not identical:
        print(f"  current:   {cur_counts}")
        print(f"  optimized: {opt_counts}")

    cur_rps = results["current (per-field byte-decode)"][1]
    opt_rps = results["optimized (fast/slow-path adaptive)"][1]
    speedup = opt_rps / cur_rps if cur_rps else float("inf")
    print(f"\noptimized is {speedup:.1f}x faster than current (pure parse throughput)")

    if measured_current_full_run_sec_per_file is not None:
        est_optimized_sec_per_file = measured_current_full_run_sec_per_file / speedup
        est_optimized_total = est_optimized_sec_per_file * real_file_count
        print(f"\nreal-world extrapolation (I/O + parse), using measured 'current' end-to-end time "
              f"({measured_current_full_run_sec_per_file:.1f}s/file from the actual production run) "
              f"scaled by the {speedup:.1f}x pure-parse speedup:")
        print(f"  estimated optimized: ~{est_optimized_sec_per_file:.1f}s/file x {real_file_count} files "
              f"= ~{est_optimized_total:.1f}s (~{est_optimized_total / 60:.1f} min) total")

    return results


def main():
    layouts = optimized.load_layouts(force_reload=True)

    report_file_type(
        "FICDATA", FICDATA_PATH, "ficdata", FICDATA_SAMPLE_LINES, layouts,
        total_real_lines=REAL_FICDATA_TOTAL_LINES, real_file_count=1,
        measured_current_full_run_sec_per_file=None,  # never finished under `current`
    )

    report_file_type(
        "CORDATA", CORDATA_PATH, "cordata", CORDATA_SAMPLE_LINES, layouts,
        total_real_lines=REAL_CORDATA_TOTAL_LINES // REAL_CORDATA_FILES, real_file_count=REAL_CORDATA_FILES,
        measured_current_full_run_sec_per_file=MEASURED_CURRENT_CORDATA_SEC_PER_FILE,
    )


if __name__ == "__main__":
    main()
