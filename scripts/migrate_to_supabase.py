#!/usr/bin/env python3
"""
CO_ Network — one-time migration: master CSV -> Supabase (Week 1, REBUILD-PLAN.md D9)
=====================================================================================
Reads data/master_all_businesses.csv (2,730 rows, 40 cols) and loads the new
relational schema (supabase/migrations/0001-0003), applying four data repairs:

  1. lat/lon duplication  — coalesce(latitude, lat) / coalesce(longitude, lon)
                            (cols 38-39 have 2,650 filled vs 1,832 in cols 7-8)
  2. taxonomy divergence  — canonical category + neighborhood mapping
                            (auto_dealer->automotive, case-duplicate neighborhoods)
  3. chamber tri-state    — the CSV flattened ~1,081 unknown memberships into 'N'
                            (commit 385d93d); restores NULL=unknown from the
                            pre-flattening CSV at commit 726798f via `git show`
  4. provenance unpack    — flattened source_file/osint_confidence/corroboration_*
                            become per-field rows in business_fields

Also loads: business_private (contact names), risk_signals (owner_visible=false
until the readability pass), and optional scores from the derived JSON layer.

Usage:
  export SUPABASE_URL=https://<ref>.supabase.co
  export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
  python scripts/migrate_to_supabase.py --dry-run          # validate + counts only
  python scripts/migrate_to_supabase.py                    # full load
  python scripts/migrate_to_supabase.py --with-scores      # + predictions/sentiment/centrality
  python scripts/migrate_to_supabase.py --replace-fields   # re-sink pipeline provenance
                                                           # (never touches source='owner' rows)

Idempotent: business UUIDs are deterministic (uuid5 of legacy business_id),
all writes are upserts. Owner-generated rows are never modified.
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import uuid
from collections import Counter
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "data" / "master_all_businesses.csv"
PUB = ROOT / "dashboard" / "public" / "data"
PRE_FLATTEN_COMMIT = "726798f"  # last commit where chamber_member blanks survived

UUID_NS = uuid.uuid5(uuid.NAMESPACE_DNS, "co-network.coral-gables.businesses")

# ── Canonical taxonomy ───────────────────────────────────────────────────────

# slug -> (label, high_value)  — high_value mirrors the ICP segment-1 tier
CATEGORIES = {
    "food_beverage":        ("Food & Beverage", False),
    "retail":               ("Retail", False),
    "healthcare":           ("Healthcare", True),
    "education":            ("Education", False),
    "legal":                ("Legal", True),
    "accounting":           ("Accounting", True),
    "professional_services": ("Professional Services", True),
    "nonprofit":            ("Nonprofit", False),
    "wellness":             ("Wellness", False),
    "hospitality":          ("Hospitality", False),
    "personal_services":    ("Personal Services", False),
    "construction":         ("Construction", False),
    "real_estate":          ("Real Estate", True),
    "arts_culture":         ("Arts & Culture", False),
    "financial_services":   ("Financial Services", True),
    "marketing":            ("Marketing", True),
    "insurance":            ("Insurance", True),
    "banking":              ("Banking", False),
    "technology":           ("Technology", True),
    "consulting":           ("Consulting", True),
    "automotive":           ("Automotive", False),
    "government":           ("Government", False),
    "media_entertainment":  ("Media & Entertainment", False),
    "transportation":       ("Transportation", False),
    "other":                ("Other", False),
}
CATEGORY_ALIASES = {
    "auto_dealer": "automotive",   # taxonomy divergence repair
}

# canonical label -> is_catchall
NEIGHBORHOODS = {
    "Miracle Mile":             False,
    "Giralda Plaza":            False,
    "Merrick Park":             False,
    "Alhambra Circle":          False,
    "Ponce de Leon Corridor":   False,
    "Douglas Road Corridor":    False,
    "Bird Road Corridor":       False,
    "Sunset / South Gables":    False,
    "University of Miami Area": False,
    "Coral Gables":             True,   # generic catch-all bucket (1,581 rows)
}
NEIGHBORHOOD_ALIASES = {   # lowercase input -> canonical label
    "university of miami": "University of Miami Area",
    "merrick park / shops at merrick park": "Merrick Park",
    "downtown coral gables": "Coral Gables",  # too vague to place; don't invent precision
}

# source_file -> field_source enum
SOURCE_MAP = {
    "outscraper": "google",
    "osm": "osm",
    "osint-cgcc-v1": "chamber",
    "cgcc": "chamber",
    "non-cgcc-run1": "pipeline",
    "non-cgcc-run2": "pipeline",
    "agent1-scraper": "pipeline",
    "ta": "other",
}

# CSV column -> business_fields.field  (fields worth per-field provenance)
PROVENANCE_FIELDS = [
    "phone", "website", "address", "postcode",
    "rating_primary_value", "rating_primary_review_count",
    "price_tier", "category_primary", "neighborhood_area",
    "top_delights", "top_pain_points", "contact_name",
]


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s[:60] or "business"


def clean(v):
    v = (v or "").strip()
    return v if v else None


def load_pre_flatten_membership() -> dict:
    """business_id -> 'Y'|'N'|'' from the pre-flattening CSV (git history)."""
    try:
        out = subprocess.run(
            ["git", "show", f"{PRE_FLATTEN_COMMIT}:data/master_all_businesses.csv"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            cwd=ROOT, check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("WARNING: could not read pre-flattening CSV from git history "
              f"({PRE_FLATTEN_COMMIT}); chamber_member 'N' values will be kept "
              "as-is, which wrongly labels ~1,081 unknowns as non-members.")
        return {}
    rdr = csv.DictReader(out.splitlines())
    return {r["business_id"]: (r.get("chamber_member") or "").strip() for r in rdr}


def tri_state_membership(row, old_map) -> "bool | None":
    cur = (row.get("chamber_member") or "").strip().upper()
    if cur == "Y":
        return True
    old = old_map.get(row["business_id"], None)
    if old == "N":
        return False
    if old == "Y":  # shouldn't happen if cur != Y, but trust history
        return True
    # blank in history (or row minted after flattening with no evidence) -> unknown
    return None if old == "" or old is None else False


def parse_rows():
    with open(MASTER, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def build_payloads(rows, old_membership):
    cats, nbhs = {}, {}
    businesses, privates, fields, risks = [], [], [], []
    slugs_seen = set()
    stats = Counter()

    for r in rows:
        bid = r["business_id"]
        buid = str(uuid.uuid5(UUID_NS, bid))

        # taxonomy repair
        cat = (r.get("category_primary") or "other").strip().lower()
        cat = CATEGORY_ALIASES.get(cat, cat)
        if cat not in CATEGORIES:
            stats[f"unknown_category:{cat}"] += 1
            cat = "other"
        cats[cat] = CATEGORIES[cat]

        nb_raw = (r.get("neighborhood_area") or "").strip()
        nb = None
        if nb_raw:
            nb = NEIGHBORHOOD_ALIASES.get(nb_raw.lower())
            if nb is None:
                # case-insensitive match against canonical labels
                for label in NEIGHBORHOODS:
                    if label.lower() == nb_raw.lower():
                        nb = label
                        break
            if nb is None:
                stats[f"unknown_neighborhood:{nb_raw}"] += 1
                nb = "Coral Gables"
            nbhs[nb] = NEIGHBORHOODS[nb]

        # lat/lon repair: prefer the fuller latitude/longitude columns
        lat = clean(r.get("latitude")) or clean(r.get("lat"))
        lon = clean(r.get("longitude")) or clean(r.get("lon"))
        location = f"SRID=4326;POINT({lon} {lat})" if lat and lon else None

        member = tri_state_membership(r, old_membership)
        stats["member_true" if member is True else
              "member_false" if member is False else "member_unknown"] += 1

        base_slug = slugify(r.get("business_name"))
        slug = base_slug if base_slug not in slugs_seen else f"{base_slug}-{buid[:6]}"
        slugs_seen.add(slug)

        rating = clean(r.get("rating_primary_value"))
        reviews = clean(r.get("rating_primary_review_count"))
        conf = clean(r.get("osint_confidence"))

        businesses.append({
            "id": buid,
            "legacy_business_id": bid,
            "name": (r.get("business_name") or "").strip() or bid,
            "slug": slug,
            "category_slug": cat,            # resolved to category_id at load time
            "category_secondary": clean(r.get("category_secondary")),
            "neighborhood_label": nb,        # resolved to neighborhood_id at load time
            "address": clean(r.get("address")),
            "postcode": clean(r.get("postcode")),
            "location": location,
            "phone": clean(r.get("phone")),
            "website": clean(r.get("website")),
            "price_tier": clean(r.get("price_tier")),
            "price_tier_inferred": (r.get("price_tier_source") or "").strip() == "inferred",
            "rating": float(rating) if rating else None,
            "review_count": int(float(reviews)) if reviews else None,
            "chamber_member": member,
            "status": "active",
            "osint_confidence": float(conf) if conf else None,
            "validation_tier": clean(r.get("validation_tier")),
        })

        contact = clean(r.get("contact_name"))
        if contact:
            privates.append({"business_id": buid, "contact_name": contact})

        # provenance unpack
        src = SOURCE_MAP.get((r.get("source_file") or "").strip(), "pipeline")
        observed = clean(r.get("last_reviewed_date"))
        observed_ts = f"{observed}T00:00:00Z" if observed and len(observed) == 10 else None
        for col in PROVENANCE_FIELDS:
            val = clean(r.get(col))
            if val is None:
                continue
            fields.append({
                "business_id": buid,
                "field": col,
                "value": val,
                "source": src,
                "source_detail": clean(r.get("source_file")) or "unknown",
                "confidence": float(conf) if conf else None,
                **({"observed_at": observed_ts} if observed_ts else {}),
            })

        # risk signals — hidden from owners until the readability pass (P0, D8 #3)
        if (r.get("red_flag_present") or "").strip().upper() == "Y":
            sev = (r.get("red_flag_severity") or "operational").strip().lower()
            sev = sev if sev in ("info", "operational", "critical") else "operational"
            notes = clean(r.get("red_flag_notes")) or "unspecified"
            for note in [n.strip() for n in notes.split(";") if n.strip()]:
                risks.append({
                    "business_id": buid,
                    "signal_type": re.sub(r"\(.*\)$", "", note).strip()[:60] or "flag",
                    "severity": sev,
                    "detail": note,
                    "owner_visible": False,
                    "source": "pipeline",
                })

    return cats, nbhs, businesses, privates, fields, risks, stats


def build_scores():
    """Optional: fold the derived JSON layer into scores."""
    out = []
    def buid_for(legacy):
        return str(uuid.uuid5(UUID_NS, legacy))
    preds = PUB / "predictions.json"
    if preds.exists():
        for p in json.loads(preds.read_text(encoding="utf-8")):
            bid = p.get("business_id")
            if not bid:
                continue
            if p.get("membership_probability") is not None:
                out.append({"business_id": buid_for(bid), "score_type": "membership_probability",
                            "value": p["membership_probability"], "inputs": {"src": "prediction_model_v1"}})
            if p.get("growth_trajectory") is not None:
                out.append({"business_id": buid_for(bid), "score_type": "growth_trajectory",
                            "value": p["growth_trajectory"], "inputs": {"src": "prediction_model_v1"}})
    sent = PUB / "sentiment_profiles.json"
    if sent.exists():
        data = json.loads(sent.read_text(encoding="utf-8"))
        items = data if isinstance(data, list) else data.get("profiles", [])
        for p in items:
            bid = p.get("business_id")
            css = p.get("css") or p.get("css_score")
            if bid and css is not None:
                out.append({"business_id": buid_for(bid), "score_type": "sentiment_css",
                            "value": css, "inputs": {"src": "sentiment_extractor_v1"}})
    cent = PUB / "network_centrality.json"
    if cent.exists():
        data = json.loads(cent.read_text(encoding="utf-8"))
        items = data if isinstance(data, list) else data.get("businesses", [])
        for p in items:
            bid = p.get("business_id")
            infl = p.get("influence") or p.get("influence_score")
            if bid and infl is not None:
                out.append({"business_id": buid_for(bid), "score_type": "network_influence",
                            "value": infl, "inputs": {"src": "network_centrality_v1"}})
    return out


# ── Supabase REST loader ─────────────────────────────────────────────────────

class Supa:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not key:
            sys.exit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example)")
        self.h = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, rows, on_conflict=None, batch=500):
        if not rows:
            return 0
        params = {"on_conflict": on_conflict} if on_conflict else {}
        headers = {**self.h, "Prefer": "resolution=merge-duplicates,return=minimal"}
        n = 0
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            resp = requests.post(f"{self.url}/rest/v1/{table}", params=params,
                                 headers=headers, json=chunk, timeout=60)
            if resp.status_code >= 300:
                sys.exit(f"upsert {table} failed [{resp.status_code}]: {resp.text[:500]}")
            n += len(chunk)
            print(f"  {table}: {n}/{len(rows)}")
        return n

    def select(self, table, columns="*"):
        resp = requests.get(f"{self.url}/rest/v1/{table}", params={"select": columns},
                            headers={**self.h, "Range": "0-9999"}, timeout=60)
        resp.raise_for_status()
        return resp.json()

    def delete_where(self, table, filt: dict):
        resp = requests.delete(f"{self.url}/rest/v1/{table}", params=filt,
                               headers=self.h, timeout=120)
        if resp.status_code >= 300:
            sys.exit(f"delete {table} failed [{resp.status_code}]: {resp.text[:500]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--with-scores", action="store_true")
    ap.add_argument("--replace-fields", action="store_true",
                    help="delete non-owner business_fields before reinserting (pipeline re-sink)")
    args = ap.parse_args()

    rows = parse_rows()
    old_membership = load_pre_flatten_membership()
    cats, nbhs, businesses, privates, fields, risks, stats = build_payloads(rows, old_membership)
    scores = build_scores() if args.with_scores else []

    print(f"parsed {len(rows)} CSV rows ->")
    print(f"  categories:       {len(cats)}")
    print(f"  neighborhoods:    {len(nbhs)}")
    print(f"  businesses:       {len(businesses)}")
    print(f"  business_private: {len(privates)}")
    print(f"  business_fields:  {len(fields)}")
    print(f"  risk_signals:     {len(risks)}")
    print(f"  scores:           {len(scores)}")
    print("  membership tri-state:",
          {k: v for k, v in stats.items() if k.startswith('member_')})
    oddities = {k: v for k, v in stats.items() if not k.startswith('member_')}
    if oddities:
        print("  taxonomy oddities:", oddities)

    if args.dry_run:
        print("\n--dry-run: no writes. Sample business payload:")
        print(json.dumps(businesses[0], indent=2)[:800])
        return

    db = Supa()

    print("\nloading taxonomy...")
    db.upsert("categories",
              [{"slug": s, "label": l, "high_value": hv} for s, (l, hv) in sorted(cats.items())],
              on_conflict="slug")
    db.upsert("neighborhoods",
              [{"slug": slugify(l), "label": l, "is_catchall": c} for l, c in sorted(nbhs.items())],
              on_conflict="slug")

    cat_ids = {c["slug"]: c["id"] for c in db.select("categories", "id,slug")}
    nb_ids = {n["label"]: n["id"] for n in db.select("neighborhoods", "id,label")}

    for b in businesses:
        b["category_id"] = cat_ids.get(b.pop("category_slug"))
        b["neighborhood_id"] = nb_ids.get(b.pop("neighborhood_label"))

    print("loading businesses...")
    db.upsert("businesses", businesses, on_conflict="id")

    print("loading business_private...")
    db.upsert("business_private", privates, on_conflict="business_id")

    if args.replace_fields:
        print("replacing pipeline provenance (source != owner)...")
        db.delete_where("business_fields", {"source": "neq.owner"})
    print("loading business_fields...")
    db.upsert("business_fields", fields)

    print("loading risk_signals...")
    # risk signals have no natural key; wipe pipeline-sourced rows for idempotency
    db.delete_where("risk_signals", {"source": "eq.pipeline"})
    db.upsert("risk_signals", risks)

    if scores:
        print("loading scores...")
        db.upsert("scores", scores, on_conflict="business_id,score_type")

    print("\ndone. Next: select * from public.generate_deterministic_edges();")


if __name__ == "__main__":
    main()
