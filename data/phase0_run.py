"""Phase 0 one-time driver: runs the thresholded gate on a stratified cordata
sample (spread across all 10 shards) and a ficdata sample, determines the
real cordata<->ficdata bridge field, and exports a manual-anchor acceptance
sample. Does NOT build a database and does NOT do a full ingest -- this is a
one-shot validation run; validate.py is the reusable piece for future quarters.

Run from the `data/` directory:  python phase0_run.py
"""
import csv
import glob
import json
import os
import random
import sys
import time

import parser as sunbiz_parser
import validate

random.seed(20260727)

CORDATA_GLOB = "cordata/cordata*.txt"
FICDATA_PATH = "ficdata/FICFILE.TXT"
LAYOUTS_PATH = os.path.join("config", "layouts.json")
ACCEPTANCE_PATH = os.path.join("acceptance", "sample.csv")

CORDATA_PER_FILE_SAMPLE = 500          # x10 files = ~5000
FICDATA_SAMPLE_TARGET = 5000
CORDATA_RECORD_STRIDE = 1442           # 1440 + CRLF, exact on-disk stride

# byte offsets (0-indexed) into a raw cordata line, mirroring config/layouts.json
CD_STATUS = slice(204, 205)
CD_FILING_TYPE = slice(205, 220)
CD_PRINC_ADDR2 = slice(262, 304)
CD_PRINC_ZIP = slice(334, 344)
CD_FILE_DATE_YEAR = slice(476, 480)

FILING_TYPE_CODES = {
    "llc_domestic": b"FLAL",
    "llc_foreign": b"FORL",
    "profit_domestic": b"DOMP",
    "nonprofit_domestic": b"DOMNP",
    "profit_foreign": b"FORP",
    "nonprofit_foreign": b"FORNP",
    "lp_domestic": b"DOMLP",
}

# Curated ~12-record stratification target (task calls for active/inactive,
# LLC/profit/nonprofit/foreign, a suite in addr2, a ZIP+4, a sparse old
# record). FILING_TYPE_CODES above has more combos available than we need;
# only these specific (label, status) pairs are kept.
TARGET_FILING_STATUS_KEYS = {
    "llc_domestic_active", "llc_domestic_inactive",
    "profit_domestic_active", "profit_domestic_inactive",
    "nonprofit_domestic_active",
    "profit_foreign_active",
    "llc_foreign_active",
    "lp_domestic_active",
    "nonprofit_foreign_active",
}
TARGET_SPECIAL_KEYS = {"suite_addr2", "zip_plus4", "sparse_old"}
TARGET_CORDATA_KEYS = TARGET_FILING_STATUS_KEYS | TARGET_SPECIAL_KEYS


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Cordata: one full sequential pass per shard, building (a) the complete
# doc_number set for the bridge check, (b) a stride-sampled gate sample, and
# (c) candidate rows for the acceptance sample -- all in the same pass.
# ---------------------------------------------------------------------------

def scan_cordata(layouts):
    docnum_set = set()
    gate_sample_records = []
    acceptance_candidates = {}  # category -> parsed record dict

    files = sorted(glob.glob(CORDATA_GLOB))
    for fn in files:
        t0 = time.time()
        fname = os.path.basename(fn)
        size = os.path.getsize(fn)
        total_records = size // CORDATA_RECORD_STRIDE
        stride = max(1, total_records // CORDATA_PER_FILE_SAMPLE)
        taken_this_file = 0

        with open(fn, "rb") as f:
            line_no = 0
            for raw in f:
                line_no += 1
                line = raw[:-2] if raw.endswith(b"\r\n") else raw
                doc = line[0:12].strip()
                if doc:
                    docnum_set.add(doc)

                is_sample_tick = (line_no % stride == 0) and taken_this_file < CORDATA_PER_FILE_SAMPLE
                need_candidate = _cordata_wants_candidate(line, acceptance_candidates)

                if is_sample_tick or need_candidate:
                    rec = sunbiz_parser.parse_line(line, "cordata", source_file=fname,
                                                    line_number=line_no, layouts=layouts)
                    if is_sample_tick:
                        gate_sample_records.append(rec)
                        taken_this_file += 1
                    if need_candidate and rec["_ok"]:
                        _cordata_fill_candidates(rec, acceptance_candidates)

        log(f"cordata scan {fname}: {line_no} lines, {taken_this_file} sampled, "
            f"{round(time.time() - t0, 1)}s")

    return docnum_set, gate_sample_records, acceptance_candidates


def _cordata_wants_candidate(line, candidates):
    if TARGET_CORDATA_KEYS.issubset(candidates.keys()):
        return False
    if "suite_addr2" not in candidates and line[CD_PRINC_ADDR2].strip():
        return True
    if "zip_plus4" not in candidates and b"-" in line[CD_PRINC_ZIP]:
        return True
    if "sparse_old" not in candidates and line[CD_FILE_DATE_YEAR].isdigit() and line[CD_FILE_DATE_YEAR] < b"1980":
        return True
    status = line[CD_STATUS]
    filing = line[CD_FILING_TYPE]
    for label, code in FILING_TYPE_CODES.items():
        for st, st_label in ((b"A", "active"), (b"I", "inactive")):
            key = f"{label}_{st_label}"
            if key in TARGET_FILING_STATUS_KEYS and key not in candidates and filing.startswith(code) and status == st:
                return True
    return False


def _cordata_fill_candidates(rec, candidates):
    if "suite_addr2" not in candidates and rec.get("princ_addr2"):
        candidates["suite_addr2"] = rec
    # require a genuinely valid ZIP+4 (5-4 or 9-digit), not just any dash --
    # the raw data contains garbage like "34759--440" that a naive dash-check would grab
    if "zip_plus4" not in candidates and validate.check_zip(rec.get("princ_zip", "")) and "-" in rec.get("princ_zip", ""):
        candidates["zip_plus4"] = rec
    fd = rec.get("file_date", "")
    if "sparse_old" not in candidates and len(fd) == 8 and fd.isdigit() and fd[4:8] < "1980":
        candidates["sparse_old"] = rec
    status = rec.get("status")
    filing = rec.get("filing_type", "")
    for label, code in FILING_TYPE_CODES.items():
        st_label = "active" if status == "A" else ("inactive" if status == "I" else None)
        if st_label is None:
            continue
        key = f"{label}_{st_label}"
        if key in TARGET_FILING_STATUS_KEYS and key not in candidates and filing.startswith(code.decode()):
            candidates[key] = rec


# ---------------------------------------------------------------------------
# Ficdata: one full sequential pass. Reservoir-samples ~5000 records for the
# gate (uniform across the whole file, no need to know total count up
# front), collects every corporate-owner (name_format == 'C') record's
# owner1_doc_number / owner1_charter_number for the bridge check, and grabs
# acceptance-sample candidates.
# ---------------------------------------------------------------------------

def scan_ficdata(layouts):
    reservoir = []
    corp_pairs = []  # (owner1_doc_number, owner1_charter_number)
    acceptance_candidates = {}
    total_seen = 0
    total_length_mismatch = 0
    corp_count = 0

    seen = 0
    t0 = time.time()
    for rec in sunbiz_parser.iter_records(FICDATA_PATH, "ficdata", layouts=layouts):
        total_seen += 1
        seen += 1
        if not rec["_ok"]:
            if rec["_error"]["kind"] == "length_mismatch":
                total_length_mismatch += 1
        else:
            if rec.get("owner1_name_format") == "C":
                corp_count += 1
                corp_pairs.append((rec.get("owner1_doc_number", ""), rec.get("owner1_charter_number", "")))
                if "corporate_owner" not in acceptance_candidates:
                    acceptance_candidates["corporate_owner"] = rec
            elif rec.get("owner1_name_format") == "P" and "individual_owner" not in acceptance_candidates:
                acceptance_candidates["individual_owner"] = rec

            status = rec.get("status")
            if status == "E" and "expired" not in acceptance_candidates:
                acceptance_candidates["expired"] = rec
            elif status == "C" and "cancelled" not in acceptance_candidates:
                acceptance_candidates["cancelled"] = rec
            if rec.get("more_owners_flag") == "Y" and "multi_owner" not in acceptance_candidates:
                acceptance_candidates["multi_owner"] = rec
            if rec.get("addr2") and "addr2_suite" not in acceptance_candidates:
                acceptance_candidates["addr2_suite"] = rec
            if validate.check_zip(rec.get("zip", "")) and "-" in rec.get("zip", "") and "zip_plus4" not in acceptance_candidates:
                acceptance_candidates["zip_plus4"] = rec

        # reservoir sampling (Algorithm R), over ALL records including errors
        if len(reservoir) < FICDATA_SAMPLE_TARGET:
            reservoir.append(rec)
        else:
            j = random.randint(0, total_seen - 1)
            if j < FICDATA_SAMPLE_TARGET:
                reservoir[j] = rec

        if seen % 200000 == 0:
            log(f"ficdata scan: {seen} records, {round(time.time() - t0, 1)}s")

    log(f"ficdata scan complete: {total_seen} records, {corp_count} corporate-owner, "
        f"{total_length_mismatch} full-file length mismatches, {round(time.time() - t0, 1)}s")

    return reservoir, corp_pairs, acceptance_candidates, total_seen, total_length_mismatch, corp_count


# ---------------------------------------------------------------------------
# Bridge check
# ---------------------------------------------------------------------------

def bridge_check(corp_pairs, docnum_set):
    doc_total = doc_nonblank = doc_match = 0
    chg_total = chg_nonblank = chg_match = 0
    for owner_doc, owner_charter in corp_pairs:
        doc_total += 1
        owner_doc = owner_doc.strip()
        if owner_doc:
            doc_nonblank += 1
            if owner_doc.encode("ascii", errors="replace") in docnum_set:
                doc_match += 1
        chg_total += 1
        owner_charter = owner_charter.strip()
        if owner_charter:
            chg_nonblank += 1
            if owner_charter.encode("ascii", errors="replace") in docnum_set:
                chg_match += 1

    doc_rate = (doc_match / doc_nonblank * 100.0) if doc_nonblank else 0.0
    chg_rate = (chg_match / chg_nonblank * 100.0) if chg_nonblank else 0.0

    if doc_rate < 5.0 and chg_rate < 5.0:
        winner = None  # both low -- misalignment
    else:
        winner = "owner1_doc_number" if doc_rate >= chg_rate else "owner1_charter_number"

    return {
        "owner1_doc_number": {"total": doc_total, "non_blank": doc_nonblank, "match": doc_match, "match_pct": doc_rate},
        "owner1_charter_number": {"total": chg_total, "non_blank": chg_nonblank, "match": chg_match, "match_pct": chg_rate},
        "winner": winner,
    }


# ---------------------------------------------------------------------------
# Acceptance sample export
# ---------------------------------------------------------------------------

def export_acceptance_sample(layouts, cordata_candidates, ficdata_candidates):
    cordata_cols = [f["name"] for f in layouts["cordata"]["fields"]]
    ficdata_cols = [f["name"] for f in layouts["ficdata"]["fields"]]
    combined_cols = cordata_cols + [c for c in ficdata_cols if c not in cordata_cols]
    header = ["record_type", "source_file", "line_number", "category"] + combined_cols + ["manual_check_pass"]

    os.makedirs(os.path.dirname(ACCEPTANCE_PATH), exist_ok=True)
    with open(ACCEPTANCE_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for category, rec in cordata_candidates.items():
            row = {"record_type": "cordata", "source_file": rec["_source_file"],
                   "line_number": rec["_line_number"], "category": category, "manual_check_pass": ""}
            for c in combined_cols:
                row[c] = rec.get(c, "")
            w.writerow(row)
        for category, rec in ficdata_candidates.items():
            row = {"record_type": "ficdata", "source_file": rec["_source_file"],
                   "line_number": rec["_line_number"], "category": category, "manual_check_pass": ""}
            for c in combined_cols:
                row[c] = rec.get(c, "")
            w.writerow(row)
    return header


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    layouts = sunbiz_parser.load_layouts(LAYOUTS_PATH, force_reload=True)

    log("scanning cordata (10 shards): building doc_number set + stratified gate sample + acceptance candidates")
    docnum_set, cordata_sample, cordata_candidates = scan_cordata(layouts)
    log(f"cordata doc_number set size: {len(docnum_set)}; gate sample: {len(cordata_sample)}; "
        f"acceptance candidates found: {sorted(cordata_candidates.keys())}")

    cordata_result = validate.gate_lines(cordata_sample, "cordata", layouts=layouts,
                                          source_desc=f"{len(cordata_sample)} records stratified across 10 cordata shards")

    log("scanning ficdata (1 shard): reservoir gate sample + all corporate-owner pairs + acceptance candidates")
    fic_reservoir, corp_pairs, fic_candidates, fic_total, fic_total_mismatch, fic_corp_count = scan_ficdata(layouts)
    log(f"ficdata acceptance candidates found: {sorted(fic_candidates.keys())}")

    ficdata_result = validate.gate_lines(fic_reservoir, "ficdata", layouts=layouts,
                                          source_desc=f"{len(fic_reservoir)}-record reservoir sample of {fic_total} total")

    log(f"bridge check over {len(corp_pairs)} corporate-owner ficdata records")
    bridge = bridge_check(corp_pairs, docnum_set)

    layouts["ficdata"]["bridge_field"] = bridge["winner"]
    with open(LAYOUTS_PATH, "w", encoding="utf-8") as f:
        json.dump(layouts, f, indent=2)
        f.write("\n")

    header = export_acceptance_sample(layouts, cordata_candidates, fic_candidates)

    # ------------------------------------------------------------------
    # Final report (stdout)
    # ------------------------------------------------------------------
    print("\n" + "#" * 78)
    print("# PHASE 0 REPORT")
    print("#" * 78 + "\n")

    print(validate.format_report(cordata_result))
    print()
    print(validate.format_report(ficdata_result))

    print("\n--- Multibyte risk (ficdata) ---")
    print(f"within the {len(fic_reservoir)}-record gate sample: "
          f"{ficdata_result['length_error_count']} record(s) had decoded length != 2098")
    print(f"across the full file ({fic_total} records scanned): "
          f"{fic_total_mismatch} record(s) had decoded length != 2098 "
          f"({fic_total_mismatch / fic_total * 100:.3f}%)")

    print("\n--- Cross-file bridge check ---")
    d = bridge["owner1_doc_number"]
    c = bridge["owner1_charter_number"]
    print(f"corporate-owner (name_format=='C') ficdata records checked: {len(corp_pairs)} "
          f"(out of {fic_total} total ficdata records)")
    print(f"owner1_doc_number      : {d['match']}/{d['non_blank']} non-blank values exist in cordata.doc_number "
          f"({d['match_pct']:.2f}%)  [total incl. blank: {d['total']}]")
    print(f"owner1_charter_number  : {c['match']}/{c['non_blank']} non-blank values exist in cordata.doc_number "
          f"({c['match_pct']:.2f}%)  [total incl. blank: {c['total']}]")
    if bridge["winner"]:
        print(f"BRIDGE FIELD: {bridge['winner']}  (written to config/layouts.json -> ficdata.bridge_field)")
    else:
        print("BRIDGE FIELD: UNDETERMINED -- both candidates matched < 5% of cordata doc_numbers. "
              "Flag for manual review; layout offsets for the owner1_* fields may be misaligned.")

    print(f"\n--- Acceptance sample ---\npath: {ACCEPTANCE_PATH}")
    print(f"cordata categories exported: {len(cordata_candidates)} / 12 target -> {sorted(cordata_candidates.keys())}")
    print(f"ficdata categories exported: {len(fic_candidates)} / 5 target -> {sorted(fic_candidates.keys())}")

    print("\n" + "#" * 78)
    print(f"# CORDATA GATE VERDICT : {cordata_result['verdict']}")
    print(f"# FICDATA GATE VERDICT : {ficdata_result['verdict']}")
    print("#" * 78)


if __name__ == "__main__":
    main()
