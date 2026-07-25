#!/usr/bin/env python3
"""
Licensing Enricher — cross-checks businesses against FL state license records
=============================================================================
Every business operating in Coral Gables needs licensing at up to three layers:
state (DBPR / Sunbiz), county (Miami-Dade Local Business Tax Receipt) and city
(Coral Gables Certificate of Use + BTR). Of these, the DBPR state extracts are
the only ones published as open, bulk-downloadable CSVs — refreshed weekly at
myfloridalicense.com. This script pulls those extracts, matches them against
master_all_businesses.csv, and FLAGS THE DISCREPANCIES:

  * verified_active     — matched to an active state license (all good)
  * inactive_or_expired — matched, but the license is inactive / past expiry
  * unlicensed          — category REQUIRES a state license, business is in the
                          target area, yet no license was found  ← the big flag
  * out_of_scope        — regulated by another agency we don't pull (e.g. DOH
                          for healthcare) — informational, not a discrepancy
  * not_required        — category isn't state-licensed — informational

Only businesses in the target ZIPs (Coral Gables + neighbors) are evaluated, so
out-of-area rows in the master aren't falsely flagged.

Matching mirrors Agent 8 / the website reviewer: normalize_key exact hit first,
then noise-stripped fuzzy fallback within the same ZIP. A match is a REVIEW
SIGNAL, not ground truth — name/address drift means both false positives and
misses are expected, hence the review CSV.

County LBT (the one license *every* business needs) is not bulk-downloadable;
if you obtain it via a public-records request, pass it with --lbt-csv and it is
matched with the same engine (see LBT_LAYOUT).

Usage:
  python3 scripts/licensing_enricher.py                 # download, match, write review CSV
  python3 scripts/licensing_enricher.py --dry-run        # match, print summary, write nothing
  python3 scripts/licensing_enricher.py --datasets food_service   # subset
  python3 scripts/licensing_enricher.py --apply          # also write license_* cols to master (snapshots first)
  python3 scripts/licensing_enricher.py --lbt-csv data/county_lbt.csv

Requirements:
  pip install pandas requests
"""

import argparse
import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fuzzywuzzy import fuzz

from _shared import CG_ZIPS_SET, normalize_key, strip_noise

ROOT = Path(__file__).resolve().parent.parent
MASTER_CSV = ROOT / "data" / "master_all_businesses.csv"
SNAPSHOT_DIR = ROOT / "data" / "snapshots"
REVIEW_DIR = ROOT / "data" / "license_review"

# Coral Gables (33134/33146/33133/33143) + immediate neighbors: South Miami,
# Coconut Grove, Pinecrest, Westchester/unincorporated Dade. Override with --zips.
TARGET_ZIPS = CG_ZIPS_SET | {"33156", "33158", "33176", "33165", "33155", "33144"}

# token_set_ratio floor for accepting a license as the same business on the
# fuzzy fallback. We use token_set_ratio (not token_sort) because establishments
# register a LONGER DBA than the common name — "Babette" vs "BABETTE AT LA
# JOLLA", "Basilico Ristorante" vs "BASILICO CORAL GABLES" — where set_ratio=100
# but sort_ratio~60. 90 cleanly rejects shared-generic-token pairs (e.g. two
# unrelated "Sushi ..." names score ~70). The fallback is same-ZIP-only, and the
# match_score column lets a human catch the rare generic-token false positive.
NAME_MATCH_THRESHOLD = 90

DOWNLOAD_DIR = ROOT / "data" / "license_extracts"
EXTRACT_BASE = "https://www2.myfloridalicense.com/sto/file_download/extracts/"


# ── Dataset definitions ─────────────────────────────────────────────────
# Each DBPR extract has a fixed column layout (verified against live files on
# 2026-07-23). `has_header` files are keyed by header name; headerless files by
# 0-based index. `active_check(rec)` decides whether a matched license counts as
# active. `use_location` picks the establishment address (food service) over the
# licensee's mailing address when the file carries both.

def _food_active(r):  # hrfood* is an active-licenses-only extract
    return True

def _construction_active(r):
    return r["status"].strip().upper() == "A"

def _realestate_active(r):
    return r["status"].strip().lower() == "current"


DATASETS = {
    # Public food service establishments — District 1 = Miami-Dade. Carries the
    # LOCATION (establishment) address, so this is the highest-quality match.
    "food_service": {
        "categories": {"food_beverage"},
        "files": [EXTRACT_BASE + "hrfood1.csv"],
        "has_header": True,
        "cols": {
            "business": "Business Name",
            "licensee": "Licensee Name",
            "city": "Location City",
            "zip": "Location Zip Code",
            "license": "License Number",
            "status": "Primary Status Code",
            "expiry": "License Expiry Date",
        },
        "active_check": _food_active,
        "label": "DBPR Hotels & Restaurants (food service)",
    },
    # Certified/registered construction contractors (statewide, mailing address).
    "construction": {
        "categories": {"construction"},
        "files": [EXTRACT_BASE + "CONSTRUCTIONLICENSE_1.csv"],
        "has_header": False,
        "cols": {  # 0-based indices into the headerless extract
            "business": 3,
            "licensee": 2,
            "city": 8,
            "zip": 10,
            "license": 20,
            "status": 14,
            "expiry": 17,
        },
        "active_check": _construction_active,
        "label": "DBPR Construction Industry",
    },
    # Real-estate corporations & branch offices (business entities, not agents).
    "real_estate": {
        "categories": {"real_estate"},
        "files": [EXTRACT_BASE + "RealEstateCorpLicense.csv"],
        "has_header": False,
        "cols": {
            "business": 1,
            "licensee": 1,
            "city": 7,
            "zip": 9,
            "license": 17,
            "status": 12,
            "expiry": 16,
        },
        "active_check": _realestate_active,
        "label": "DBPR Real Estate Commission (corporations)",
    },
}

# Categories regulated by an agency we don't pull (informational, not flagged).
OUT_OF_SCOPE = {
    "healthcare": "FL Dept. of Health (not DBPR — check flhealthsource.gov)",
    "wellness": "massage/therapy may need DOH license — verify manually",
}

# Optional county Local Business Tax Receipt file (obtain via records request).
# Expected as a headered CSV; adjust these header names to the file you receive.
LBT_LAYOUT = {
    "business": "BUSINESS_NAME",
    "city": "BUSINESS_CITY",
    "zip": "ZIPCODE",
    "license": "RECEIPT_NO",
    "status": "ACCOUNT_STATUS",
    "expiry": "",
}


# ── Extract loading ─────────────────────────────────────────────────────

def _clean_zip(z: str) -> str:
    return "".join(c for c in str(z) if c.isdigit())[:5]


def download_extract(url: str) -> Path:
    """Download an extract to data/license_extracts/, caching by filename."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    fname = url.rstrip("/").split("/")[-1]
    dest = DOWNLOAD_DIR / fname
    if dest.exists():
        print(f"    cached: {fname} ({dest.stat().st_size/1e6:.1f} MB)")
        return dest
    print(f"    downloading: {fname} ...", flush=True)
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    print(f"      → {dest.stat().st_size/1e6:.1f} MB")
    return dest


def load_records(cfg: Dict) -> List[Dict]:
    """
    Load one dataset's extract(s) into normalized license records, keeping only
    rows in TARGET_ZIPS. Returns dicts: business, licensee, city, zip, license,
    status, expiry, active(bool), key(normalized business name).
    """
    cols = cfg["cols"]
    records: List[Dict] = []
    for url in cfg["files"]:
        path = download_extract(url)
        with open(path, newline="", encoding="latin-1") as f:
            reader = csv.DictReader(f) if cfg["has_header"] else csv.reader(f)
            for row in reader:
                def get(field):
                    return (row[cols[field]] if not cfg["has_header"]
                            else row.get(cols[field], "")) or ""

                z = _clean_zip(get("zip"))
                if z not in TARGET_ZIPS:
                    continue
                license_no = get("license").strip()
                if not license_no:
                    # Qualifier/registration link rows (FRO, QB) carry no license
                    # number and aren't standalone licenses — skip them.
                    continue
                business = get("business").strip() or get("licensee").strip()
                rec = {
                    "business": business,
                    "licensee": get("licensee").strip(),
                    "city": get("city").strip(),
                    "zip": z,
                    "license": license_no,
                    "status": get("status").strip(),
                    "expiry": (get("expiry").strip() if cols.get("expiry") else ""),
                    "key": normalize_key(business),
                }
                rec["active"] = cfg["active_check"](rec)
                records.append(rec)
    return records


# ── Matching ────────────────────────────────────────────────────────────

def build_index(records: List[Dict]) -> Dict[str, List[Dict]]:
    """Index license records by normalized business-name key."""
    idx: Dict[str, List[Dict]] = {}
    for rec in records:
        if rec["key"]:
            idx.setdefault(rec["key"], []).append(rec)
    return idx


def match_score(name: str, rec: Dict) -> int:
    """
    token_set_ratio of a business name against a license record, scored against
    both the establishment (DBA) name and the licensee/corp name, requiring at
    least one shared significant (noise-stripped) token to avoid matching on
    fuzz alone. Returns 0 when nothing significant is shared.
    """
    a = strip_noise(name)
    if not a:
        return 0
    a_tokens = set(a.split())
    best = 0
    for candidate in (rec["business"], rec["licensee"]):
        b = strip_noise(candidate)
        if not b or not (a_tokens & set(b.split())):
            continue
        best = max(best, fuzz.token_set_ratio(a, b))
    return best


def match_business(name: str, zipcode: str, records: List[Dict],
                   index: Dict[str, List[Dict]]) -> Optional[Dict]:
    """
    Find the best license record for a business. Exact normalized-key hit wins;
    otherwise a token_set_ratio fuzzy match within the same ZIP (>= threshold).
    Prefers an ACTIVE record over an inactive one on ties.
    """
    key = normalize_key(name)
    candidates = list(index.get(key, []))
    if not candidates:
        z = _clean_zip(zipcode)
        scored = []
        for rec in records:
            if z and rec["zip"] and rec["zip"] != z:
                continue
            score = match_score(name, rec)
            if score >= NAME_MATCH_THRESHOLD:
                scored.append((rec["active"], score, rec))
        if not scored:
            return None
        # Prefer an active license, then the highest name score.
        scored.sort(key=lambda t: (t[0], t[1]), reverse=True)
        return scored[0][2]
    # Exact-key candidates: prefer an active one, then a stable license order.
    candidates.sort(key=lambda r: (r["active"], r["license"]), reverse=True)
    return candidates[0]


# ── Evaluation ──────────────────────────────────────────────────────────

def dataset_for_category(category: str) -> Optional[str]:
    for name, cfg in DATASETS.items():
        if category in cfg["categories"]:
            return name
    return None


def evaluate(master: pd.DataFrame, loaded: Dict[str, Dict]) -> List[Dict]:
    """
    Walk the master, decide each in-area business's license status, and return
    per-business review rows. `loaded[name]` = {"records":[...], "index":{...}}.
    """
    rows: List[Dict] = []
    for _, biz in master.iterrows():
        zipcode = _clean_zip(biz.get("postcode", ""))
        if zipcode not in TARGET_ZIPS:
            continue  # out of area — don't flag

        category = (biz.get("category_primary", "") or "").strip()
        name = (biz.get("business_name", "") or "").strip()
        ds_name = dataset_for_category(category)

        status, matched, notes = "not_required", None, ""
        expected = ds_name or ("out_of_scope" if category in OUT_OF_SCOPE else "")

        if ds_name:
            data = loaded.get(ds_name)
            if data is None:
                status, notes = "unknown", f"{ds_name} dataset not loaded"
            else:
                matched = match_business(name, zipcode, data["records"], data["index"])
                if matched is None:
                    status = "unlicensed"
                    notes = f"no active {DATASETS[ds_name]['label']} license found in area"
                elif matched["active"]:
                    status = "verified_active"
                else:
                    status = "inactive_or_expired"
                    notes = f"license {matched['license']} status={matched['status']}"
        elif category in OUT_OF_SCOPE:
            status, notes = "out_of_scope", OUT_OF_SCOPE[category]

        rows.append({
            "business_id": biz.get("business_id", ""),
            "business_name": name,
            "category_primary": category,
            "postcode": zipcode,
            "expected_dataset": expected,
            "license_status": status,
            "license_number": matched["license"] if matched else "",
            "license_expiry": matched["expiry"] if matched else "",
            "matched_name": matched["business"] if matched else "",
            "match_score": (match_score(name, matched) if matched else ""),
            "notes": notes,
        })
    return rows


# ── Output ──────────────────────────────────────────────────────────────

DISCREPANCY_STATUSES = {"unlicensed", "inactive_or_expired"}


def write_review(rows: List[Dict]) -> Path:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = REVIEW_DIR / f"license_review_{ts}.csv"
    pd.DataFrame(rows).to_csv(out, index=False)
    # Also write a discrepancies-only file for quick triage.
    disc = [r for r in rows if r["license_status"] in DISCREPANCY_STATUSES]
    disc_path = REVIEW_DIR / f"license_discrepancies_{ts}.csv"
    pd.DataFrame(disc).to_csv(disc_path, index=False)
    print(f"\n  Review CSV:        {out.relative_to(ROOT)} ({len(rows)} rows)")
    print(f"  Discrepancies CSV: {disc_path.relative_to(ROOT)} ({len(disc)} rows)")
    return out


def apply_to_master(master: pd.DataFrame, rows: List[Dict]):
    """Write license_* columns back onto the master (snapshots first)."""
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    snap = SNAPSHOT_DIR / f"master_all_businesses_pre_license_{ts}.csv"
    shutil.copy2(MASTER_CSV, snap)
    print(f"\n  Snapshot: {snap.relative_to(ROOT)}")

    by_id = {r["business_id"]: r for r in rows}
    for col in ["license_status", "license_number", "license_expiry",
                "license_flag", "license_notes"]:
        if col not in master.columns:
            master[col] = ""
    for idx, biz in master.iterrows():
        r = by_id.get(biz.get("business_id", ""))
        if not r:
            continue
        master.at[idx, "license_status"] = r["license_status"]
        master.at[idx, "license_number"] = r["license_number"]
        master.at[idx, "license_expiry"] = r["license_expiry"]
        master.at[idx, "license_flag"] = "Y" if r["license_status"] in DISCREPANCY_STATUSES else "N"
        master.at[idx, "license_notes"] = r["notes"]
    master.to_csv(MASTER_CSV, index=False)
    print(f"  Wrote license_* columns to {MASTER_CSV.relative_to(ROOT)}")


def print_summary(rows: List[Dict]):
    from collections import Counter
    counts = Counter(r["license_status"] for r in rows)
    print(f"\n{'='*60}\n  LICENSING SUMMARY ({len(rows)} in-area businesses)\n{'='*60}")
    order = ["verified_active", "unlicensed", "inactive_or_expired",
             "out_of_scope", "not_required", "unknown"]
    for st in order:
        if counts.get(st):
            tag = "  ⚑ DISCREPANCY" if st in DISCREPANCY_STATUSES else ""
            print(f"    {st:22s} {counts[st]:5d}{tag}")
    disc = [r for r in rows if r["license_status"] in DISCREPANCY_STATUSES]
    if disc:
        print(f"\n  Top discrepancies to review:")
        for r in disc[:15]:
            print(f"    [{r['license_status']:19s}] {r['business_name'][:34]:34s} "
                  f"{r['category_primary']:16s} {r['postcode']}")
    print(f"{'='*60}")


# ── LBT (optional county file) ──────────────────────────────────────────

def load_lbt(path: Path) -> Dict:
    df = pd.read_csv(path, dtype=str).fillna("")
    records = []
    for _, row in df.iterrows():
        z = _clean_zip(row.get(LBT_LAYOUT["zip"], ""))
        if z not in TARGET_ZIPS:
            continue
        business = str(row.get(LBT_LAYOUT["business"], "")).strip()
        rec = {
            "business": business, "licensee": business, "city": "",
            "zip": z, "license": str(row.get(LBT_LAYOUT["license"], "")).strip(),
            "status": str(row.get(LBT_LAYOUT["status"], "")).strip(),
            "expiry": "", "key": normalize_key(business),
        }
        rec["active"] = "active" in rec["status"].lower() or rec["status"] == ""
        records.append(rec)
    return {"records": records, "index": build_index(records)}


# ── Main ────────────────────────────────────────────────────────────────

def run(datasets: List[str], dry_run: bool, apply: bool,
        zips: Optional[set], lbt_csv: Optional[str]):
    global TARGET_ZIPS
    if zips:
        TARGET_ZIPS = zips

    print(f"\n{'='*60}\n  Licensing Enricher — {datetime.now():%Y-%m-%d %H:%M:%S}\n{'='*60}")
    master = pd.read_csv(MASTER_CSV, dtype=str).fillna("")
    print(f"Loaded {len(master)} businesses; target ZIPs: {sorted(TARGET_ZIPS)}")

    loaded: Dict[str, Dict] = {}
    for name in datasets:
        cfg = DATASETS[name]
        print(f"\n── {name}: {cfg['label']} ──")
        records = load_records(cfg)
        loaded[name] = {"records": records, "index": build_index(records)}
        print(f"    {len(records)} in-area license records")

    if lbt_csv:
        p = Path(lbt_csv)
        if not p.exists():
            print(f"\n  WARNING: --lbt-csv {lbt_csv} not found, skipping LBT.")
        else:
            print(f"\n── county_lbt: Miami-Dade Local Business Tax Receipt ──")
            loaded["county_lbt"] = load_lbt(p)
            # Every in-area business is expected to have an LBT.
            for cfg_name in list(DATASETS):
                DATASETS[cfg_name]  # (no-op; LBT handled separately below)
            print(f"    {len(loaded['county_lbt']['records'])} in-area LBT records")

    rows = evaluate(master, loaded)
    print_summary(rows)

    if dry_run:
        print("\n[DRY RUN] No files written.")
        return
    write_review(rows)
    if apply:
        apply_to_master(master, rows)


def main():
    ap = argparse.ArgumentParser(description="Cross-check businesses vs FL state license extracts")
    ap.add_argument("--datasets", nargs="+", choices=list(DATASETS),
                    default=list(DATASETS), help="Which DBPR datasets to pull")
    ap.add_argument("--dry-run", action="store_true", help="Match + summarize, write nothing")
    ap.add_argument("--apply", action="store_true", help="Also write license_* columns to master (snapshots first)")
    ap.add_argument("--zips", nargs="+", help="Override target ZIPs")
    ap.add_argument("--lbt-csv", help="Optional county Local Business Tax Receipt CSV")
    args = ap.parse_args()

    if not MASTER_CSV.exists():
        print(f"Error: {MASTER_CSV} not found")
        sys.exit(1)

    run(datasets=args.datasets, dry_run=args.dry_run, apply=args.apply,
        zips=set(args.zips) if args.zips else None, lbt_csv=args.lbt_csv)


if __name__ == "__main__":
    main()
