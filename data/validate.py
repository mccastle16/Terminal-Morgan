"""Reusable, thresholded validation gate for SunBiz cordata / ficdata extracts.

Two entry points:
  gate_lines(records, file_type, ...)  -- core logic, operates on an in-memory
                                          list of already-parsed record dicts
                                          (see parser.parse_line). This is what
                                          you call with a hand-built stratified
                                          sample (Phase 0 does this).
  gate_file(path, file_type, ...)      -- convenience wrapper: reads a sample
                                          straight off disk and calls
                                          gate_lines. Point this at any future
                                          quarterly file as a guard:
                                              python validate.py <path> <cordata|ficdata>

FAIL if line length ever mismatches, or if any *gated* field's valid-non-blank
rate falls under 95%. "Valid-non-blank" = of the values that are non-blank,
what fraction match the field's expected shape -- fields that are only
conditionally populated (e.g. cancellation_date on an active record) are not
penalized just for being blank; blank-rate is still reported for visibility.
"""
import collections
import os
import re
import sys

import parser as sunbiz_parser

DOC_NUMBER_RE = re.compile(r"^[A-Z0-9]{1,12}$")
STATE_RE = re.compile(r"^[A-Z]{2}$")
ZIP_RE = re.compile(r"^\d{5}$|^\d{5}-\d{4}$|^\d{9}$")
COUNTRY_RE = re.compile(r"^[A-Z]{2}$")

YEAR_MIN, YEAR_MAX = 1900, 2035
DATE_YEAR_MIN, DATE_YEAR_MAX = 1900, 2099

GATE_THRESHOLD_PCT = 95.0
FL_MAJORITY_WARN_PCT = 70.0
SHIFT_TEST_MIN_DROP_PP = 15.0  # percentage points the shift test must drop by


def check_doc_number(v):
    v = v.upper()
    return bool(DOC_NUMBER_RE.match(v)) and any(c.isdigit() for c in v)


def check_state(v):
    return bool(STATE_RE.match(v.upper()))


def check_zip(v):
    return bool(ZIP_RE.match(v))


def check_country(v):
    return bool(COUNTRY_RE.match(v.upper()))


def check_year(v):
    if not (len(v) == 4 and v.isdigit()):
        return False
    y = int(v)
    return YEAR_MIN <= y <= YEAR_MAX


def _is_valid_date(v, fmt):
    if not (len(v) == 8 and v.isdigit()):
        return False
    if fmt == "MMDDYYYY":
        mm, dd, yyyy = int(v[0:2]), int(v[2:4]), int(v[4:8])
    else:  # YYYYMMDD
        yyyy, mm, dd = int(v[0:4]), int(v[4:6]), int(v[6:8])
    if not (DATE_YEAR_MIN <= yyyy <= DATE_YEAR_MAX):
        return False
    if not (1 <= mm <= 12):
        return False
    if not (1 <= dd <= 31):
        return False
    return True


SHAPE_VALIDATORS = {
    "doc_number": check_doc_number,
    "state": check_state,
    "zip": check_zip,
    "country": check_country,
    "year": check_year,
}


def _gated_fields(spec):
    return [f for f in spec["fields"] if f.get("gate")]


def _analyze_field(name, ftype, values, fspec):
    total = len(values)
    non_blank = [v for v in values if v]
    blank_count = total - len(non_blank)

    if ftype == "status":
        known = set(x.upper() for x in fspec.get("known_set", []))
        observed = collections.Counter(v.upper() for v in non_blank)
        valid_count = sum(c for v, c in observed.items() if v in known)
        extra = {
            "observed_set": dict(observed.most_common()),
            "known_set": sorted(known),
        }
    elif ftype == "date":
        mm = sum(1 for v in non_blank if _is_valid_date(v, "MMDDYYYY"))
        yy = sum(1 for v in non_blank if _is_valid_date(v, "YYYYMMDD"))
        if mm >= yy:
            inferred, valid_count = "MMDDYYYY", mm
        else:
            inferred, valid_count = "YYYYMMDD", yy
        extra = {
            "inferred_format": inferred,
            "mmddyyyy_valid": mm,
            "yyyymmdd_valid": yy,
        }
    else:
        fn = SHAPE_VALIDATORS[ftype]
        valid_count = sum(1 for v in non_blank if fn(v))
        extra = {}

    nb = len(non_blank)
    pct = (valid_count / nb * 100.0) if nb else None
    if nb == 0:
        status = "SKIP(all-blank)"
    elif pct >= GATE_THRESHOLD_PCT:
        status = "PASS"
    else:
        status = "FAIL"

    result = {
        "type": ftype,
        "total": total,
        "blank": blank_count,
        "non_blank": nb,
        "valid": valid_count,
        "valid_nonblank_pct": pct,
        "gate_status": status,
    }
    result.update(extra)
    return result


def _shift_and_score(raw_lines, gated_fields, record_length, delta, date_formats):
    """Re-slice raw_lines at every gated field's position shifted by `delta`
    and return one aggregate valid-non-blank rate across all gated fields.
    """
    valid_sum = 0
    nonblank_sum = 0
    for f in gated_fields:
        name, ftype = f["name"], f["type"]
        s = f["start"] + delta
        e = f["end"] + delta
        if e < 1 or s > record_length:
            continue
        s = max(s, 1)
        values = []
        for line in raw_lines:
            raw = line[s - 1:e] if s <= len(line) else ""
            values.append(raw.strip())
        non_blank = [v for v in values if v]
        if not non_blank:
            continue
        if ftype == "status":
            known = set(x.upper() for x in f.get("known_set", []))
            valid = sum(1 for v in non_blank if v.upper() in known)
        elif ftype == "date":
            fmt = date_formats.get(name, "MMDDYYYY")
            valid = sum(1 for v in non_blank if _is_valid_date(v, fmt))
        else:
            fn = SHAPE_VALIDATORS[ftype]
            valid = sum(1 for v in non_blank if fn(v))
        valid_sum += valid
        nonblank_sum += len(non_blank)
    return (valid_sum / nonblank_sum * 100.0) if nonblank_sum else None


def gate_lines(records, file_type, layouts=None, run_shift_test=True, source_desc=""):
    """Core gate logic. `records` is a list of dicts from parser.parse_line
    (or parser.iter_records) for ONE file_type ('cordata' or 'ficdata').
    Returns a result dict; never raises.
    """
    layouts = layouts or sunbiz_parser.load_layouts()
    spec = layouts[file_type]
    gated = _gated_fields(spec)

    total_records = len(records)
    length_errors = [r for r in records if not r["_ok"] and r["_error"]["kind"] == "length_mismatch"]
    decode_errors = [r for r in records if not r["_ok"] and r["_error"]["kind"] == "decode_error"]
    ok_records = [r for r in records if r["_ok"]]

    field_report = {}
    date_formats = {}
    for f in gated:
        name, ftype = f["name"], f["type"]
        values = [r[name] for r in ok_records]
        fr = _analyze_field(name, ftype, values, f)
        field_report[name] = fr
        if ftype == "date":
            date_formats[name] = fr["inferred_format"]

    failing_fields = [n for n, r in field_report.items() if r["gate_status"] == "FAIL"]

    verdict = "PASS"
    reasons = []
    if length_errors:
        verdict = "FAIL"
        reasons.append(f"{len(length_errors)} record(s) with wrong line length")
    if decode_errors:
        verdict = "FAIL"
        reasons.append(f"{len(decode_errors)} record(s) failed to decode")
    if failing_fields:
        verdict = "FAIL"
        reasons.append(f"field(s) below {GATE_THRESHOLD_PCT:.0f}% valid-non-blank: {', '.join(failing_fields)}")

    warnings = []

    shift_result = None
    if run_shift_test and ok_records:
        raw_lines = [r["_raw"] for r in ok_records]
        record_length = spec["record_length"]
        baseline_valid_sum = sum(r["valid"] for r in field_report.values())
        baseline_nb_sum = sum(r["non_blank"] for r in field_report.values())
        baseline_pct = (baseline_valid_sum / baseline_nb_sum * 100.0) if baseline_nb_sum else None
        plus2 = _shift_and_score(raw_lines, gated, record_length, +2, date_formats)
        minus2 = _shift_and_score(raw_lines, gated, record_length, -2, date_formats)
        shift_result = {"baseline_pct": baseline_pct, "shift_plus2_pct": plus2, "shift_minus2_pct": minus2}
        if baseline_pct is not None:
            for label, shifted_pct in (("+2", plus2), ("-2", minus2)):
                if shifted_pct is not None and (baseline_pct - shifted_pct) < SHIFT_TEST_MIN_DROP_PP:
                    warnings.append(
                        f"shift-test WARN: offset {label} only dropped validity from "
                        f"{baseline_pct:.1f}% to {shifted_pct:.1f}% (< {SHIFT_TEST_MIN_DROP_PP:.0f}pp drop) "
                        f"-- alignment signal is loose"
                    )

    fl_result = None
    if file_type == "cordata" and ok_records:
        states = [r.get("princ_state", "").upper() for r in ok_records]
        fl_count = sum(1 for s in states if s == "FL")
        fl_pct = fl_count / len(states) * 100.0 if states else None
        fl_result = {"fl_count": fl_count, "total": len(states), "pct": fl_pct}
        if fl_pct is not None and fl_pct < FL_MAJORITY_WARN_PCT:
            warnings.append(f"princ_state WARN: only {fl_pct:.1f}% are 'FL' (< {FL_MAJORITY_WARN_PCT:.0f}%)")

    return {
        "file_type": file_type,
        "source_desc": source_desc,
        "total_records": total_records,
        "length_error_count": len(length_errors),
        "decode_error_count": len(decode_errors),
        "ok_count": len(ok_records),
        "field_report": field_report,
        "failing_fields": failing_fields,
        "verdict": verdict,
        "reasons": reasons,
        "warnings": warnings,
        "shift_test": shift_result,
        "fl_majority": fl_result,
    }


def gate_file(path, file_type, layouts=None, max_records=5000, run_shift_test=True):
    """Convenience: read up to max_records from the start of `path` and gate
    them. This is the "point it at next quarter's file" entry point.
    """
    layouts = layouts or sunbiz_parser.load_layouts()
    records = []
    for rec in sunbiz_parser.iter_records(path, file_type, layouts=layouts):
        records.append(rec)
        if max_records and len(records) >= max_records:
            break
    return gate_lines(records, file_type, layouts=layouts, run_shift_test=run_shift_test, source_desc=path)


def format_report(result):
    lines = []
    ft = result["file_type"]
    lines.append(f"=== Gate report: {ft} ({result['source_desc']}) ===")
    lines.append(f"records sampled: {result['total_records']}  ok: {result['ok_count']}  "
                 f"length-mismatch: {result['length_error_count']}  decode-error: {result['decode_error_count']}")
    lines.append("")
    lines.append(f"{'field':<24}{'type':<10}{'non-blank':>10}{'blank':>8}{'valid':>8}{'valid%':>9}{'status':>10}")
    for name, r in result["field_report"].items():
        pct_str = f"{r['valid_nonblank_pct']:.1f}" if r["valid_nonblank_pct"] is not None else "N/A"
        lines.append(f"{name:<24}{r['type']:<10}{r['non_blank']:>10}{r['blank']:>8}{r['valid']:>8}{pct_str:>9}  {r['gate_status']}")
        if r["type"] == "status":
            lines.append(f"    observed set: {r['observed_set']}  (known: {r['known_set']})")
        if r["type"] == "date":
            lines.append(f"    inferred format: {r['inferred_format']}  "
                         f"(MMDDYYYY valid={r['mmddyyyy_valid']}, YYYYMMDD valid={r['yyyymmdd_valid']})")
    lines.append("")
    if result["shift_test"]:
        st = result["shift_test"]
        base = f"{st['baseline_pct']:.1f}%" if st["baseline_pct"] is not None else "N/A"
        p2 = f"{st['shift_plus2_pct']:.1f}%" if st["shift_plus2_pct"] is not None else "N/A"
        m2 = f"{st['shift_minus2_pct']:.1f}%" if st["shift_minus2_pct"] is not None else "N/A"
        lines.append(f"shift-test: baseline={base}  shift+2={p2}  shift-2={m2}")
    if result["fl_majority"]:
        fm = result["fl_majority"]
        pct_str = f"{fm['pct']:.1f}%" if fm["pct"] is not None else "N/A"
        lines.append(f"princ_state == 'FL': {fm['fl_count']}/{fm['total']} ({pct_str})")
    for w in result["warnings"]:
        lines.append(f"WARN: {w}")
    lines.append("")
    lines.append(f"VERDICT: {result['verdict']}" + (f"  ({'; '.join(result['reasons'])})" if result["reasons"] else ""))
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: python validate.py <path> <cordata|ficdata> [max_records]")
        sys.exit(2)
    path, file_type = sys.argv[1], sys.argv[2]
    max_records = int(sys.argv[3]) if len(sys.argv) > 3 else 5000
    result = gate_file(path, file_type, max_records=max_records)
    print(format_report(result))
    sys.exit(0 if result["verdict"] == "PASS" else 1)
