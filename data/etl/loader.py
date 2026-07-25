#!/usr/bin/env python3
"""
ETL — Neo4j Knowledge Graph Loader
====================================
Reads the master CSV and loads it into Neo4j as a property graph
with typed nodes and edges based on the PKP (Portable Knowledge Protocol).

Architecture:
  Extract  → Read master_all_businesses.csv + action_playbook.json
  Transform → Convert flat rows into graph entities (nodes + edges)
  Load     → Push into Neo4j via Bolt driver with batch transactions

Node Types:
  :Business        — Core entity (2,868+)
  :Category        — 22 canonical categories
  :Neighborhood    — 9 geographic zones
  :ZipCode         — 4 Coral Gables ZIP codes
  :SourceFamily    — 6 data source families
  :MarketForce     — Undercurrents affecting categories
  :Supplier        — Picks & shovels (enabling infrastructure)
  :ActionItem      — Agent 4 recommendations

Edge Types:
  (:Business)-[:LOCATED_IN]->(:Neighborhood)
  (:Business)-[:IN_ZIPCODE]->(:ZipCode)
  (:Business)-[:CLASSIFIED_AS]->(:Category)
  (:Business)-[:MEMBER_OF_CGCC]->(:Business)  [self-ref marker]
  (:Business)-[:SOURCED_FROM]->(:SourceFamily)
  (:Business)-[:CORROBORATED_BY]->(:SourceFamily)
  (:Business)-[:NEAR {distance_m}]->(:Business)
  (:Business)-[:COMPETES_WITH]->(:Business)
  (:Business)-[:REGISTERED_AS {status}]->(:Business)  [SunBiz]
  (:Business)-[:HAS_ACTION]->(:ActionItem)
  (:Category)-[:SUPPLIED_BY]->(:Supplier)
  (:Category)-[:AFFECTED_BY]->(:MarketForce)

Usage:
  # Full load (wipe + rebuild)
  python loader.py

  # Incremental (skip wipe, merge new/updated only)
  python loader.py --incremental

  # Dry run (parse + validate, no Neo4j writes)
  python loader.py --dry-run

  # Custom paths
  python loader.py --master ../../data/master_all_businesses.csv --playbook ../../dashboard/public/data/action_playbook.json

Requirements:
  pip install neo4j pandas
"""

import argparse
import json
import math
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

try:
    from neo4j import GraphDatabase
except ImportError:
    print("ERROR: neo4j driver not installed. Run: pip install neo4j")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_MASTER = PROJECT_ROOT / "data" / "master_all_businesses.csv"
DEFAULT_PLAYBOOK = PROJECT_ROOT / "dashboard" / "public" / "data" / "action_playbook.json"

# ── Neo4j connection ──────────────────────────────────────────────
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "cgcc2024graph")

# ── PKP constants (mirrored from Agent 3) ─────────────────────────
NODE_TYPE_RULES = {
    "infrastructure": [
        "banking", "financial_services", "insurance", "real_estate",
        "construction", "technology", "education",
    ],
    "platform": [
        "hospitality", "food_beverage", "arts_culture", "wellness",
        "marketing", "consulting",
    ],
    "asset": [
        "retail", "personal_services", "auto_dealer", "healthcare",
        "legal", "accounting", "professional_services", "nonprofit",
    ],
}

PICKS_SHOVELS = {
    "food_beverage": ["Sysco", "US Foods supply chain", "POS systems", "Delivery platforms"],
    "legal": ["Westlaw", "LexisNexis", "Court filing systems", "Professional liability carriers"],
    "healthcare": ["EMR systems", "Medical supply distributors", "Insurance billing networks"],
    "real_estate": ["MLS access", "Title companies", "Mortgage originators"],
    "banking": ["Federal Reserve system", "FDIC", "Payment processing networks"],
    "retail": ["POS systems", "Inventory management", "Commercial lease market"],
    "education": ["Accreditation bodies", "EdTech platforms", "Textbook supply"],
    "hospitality": ["OTAs (Booking, Expedia)", "Food distributors", "Linen services"],
    "technology": ["Cloud providers (AWS, Azure)", "Dev talent pipeline", "VC ecosystem"],
    "construction": ["Permitting (City of CG)", "Material suppliers", "Labor unions"],
    "wellness": ["Equipment suppliers", "Certification bodies", "Insurance panels"],
    "consulting": ["CRM platforms", "Professional networks", "Conference circuit"],
}

UNDERCURRENTS = {
    "food_beverage": ["Rising rents on Miracle Mile", "Delivery app commission pressure", "Labor shortage"],
    "legal": ["AI disruption in document review", "Latin America cross-border demand growing"],
    "healthcare": ["Telehealth expansion", "Insurance reimbursement tightening", "Aging population"],
    "real_estate": ["Interest rate sensitivity", "Luxury condo oversupply", "Remote work migration"],
    "banking": ["Fintech competition", "Crypto regulation", "De-risking Latin correspondent banking"],
    "retail": ["E-commerce pressure", "Experiential retail shift", "Tourist foot traffic dependency"],
    "hospitality": ["Short-term rental regulation", "International tourism recovery", "Labor costs"],
    "technology": ["AI talent war", "South Florida tech migration", "VC funding normalization"],
    "insurance": ["Climate risk repricing", "Citizens Insurance reform", "Litigation environment"],
    "construction": ["Material cost inflation", "Permitting delays", "Workforce housing demand"],
}

NEIGHBORHOOD_DISPLAY = {
    "Miracle Mile": "Miracle Mile",
    "Ponce de Leon Corridor": "Ponce de Leon Corridor",
    "Alhambra Circle": "Alhambra Circle",
    "Merrick Park": "Merrick Park",
    "University of Miami": "University of Miami Area",
    "Douglas Road Corridor": "Douglas Road Corridor",
    "Bird Road Corridor": "Bird Road Corridor",
    "Sunset / South Gables": "Sunset / South Gables",
    "Coral Gables": "Coral Gables (General)",
}

CATEGORY_DISPLAY = {
    "food_beverage": "Food & Beverage",
    "legal": "Legal",
    "healthcare": "Healthcare",
    "real_estate": "Real Estate",
    "banking": "Banking",
    "financial_services": "Financial Services",
    "insurance": "Insurance",
    "retail": "Retail",
    "education": "Education",
    "hospitality": "Hospitality",
    "nonprofit": "Nonprofit",
    "personal_services": "Personal Services",
    "wellness": "Wellness",
    "professional_services": "Professional Services",
    "consulting": "Consulting",
    "marketing": "Marketing",
    "construction": "Construction",
    "auto_dealer": "Auto Dealer",
    "arts_culture": "Arts & Culture",
    "technology": "Technology",
    "accounting": "Accounting",
    "other": "Other",
}

SOURCE_FAMILIES = {
    "google": "Google (Outscraper / SerpApi / Apify)",
    "osm": "OpenStreetMap",
    "cgcc": "CGCC Directory",
    "tripadvisor": "TripAdvisor",
    "manual": "Manual Entry",
    "agent1": "Agent 1 Scraper",
}

# ── Haversine ─────────────────────────────────────────────────────
def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two lat/lon points."""
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# ── EXTRACT ───────────────────────────────────────────────────────
def extract_master(path: str) -> pd.DataFrame:
    """Read master CSV into DataFrame."""
    print(f"  [E] Reading master CSV: {path}")
    df = pd.read_csv(path, dtype=str).fillna("")
    print(f"      {len(df)} records, {len(df.columns)} columns")
    return df


def extract_playbook(path: str) -> List[Dict]:
    """Read action playbook JSON."""
    if not os.path.exists(path):
        print(f"  [E] Playbook not found: {path} — skipping actions")
        return []
    print(f"  [E] Reading playbook: {path}")
    with open(path, "r") as f:
        data = json.load(f)
    playbook = data.get("playbook", [])
    print(f"      {len(playbook)} businesses with actions")
    return playbook


# ── TRANSFORM ─────────────────────────────────────────────────────
def classify_node_type(category: str) -> str:
    for node_type, cats in NODE_TYPE_RULES.items():
        if category in cats:
            return node_type
    return "asset"


def safe_float(val: str, default: float = 0.0) -> float:
    try:
        return float(val) if val else default
    except (ValueError, TypeError):
        return default


def safe_int(val: str, default: int = 0) -> int:
    try:
        return int(float(val)) if val else default
    except (ValueError, TypeError):
        return default


def transform_businesses(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Transform CSV rows into Business node dicts."""
    print(f"  [T] Transforming {len(df)} business records...")
    nodes = []
    for _, row in df.iterrows():
        bid = row.get("business_id", "")
        if not bid:
            continue
        nodes.append({
            "business_id": bid,
            "name": row.get("business_name", ""),
            "contact_name": row.get("contact_name", ""),
            "phone": row.get("phone", ""),
            "website": row.get("website", ""),
            "website_verified": row.get("website_verified", ""),
            "address": row.get("address", ""),
            "lat": safe_float(row.get("lat", "")),
            "lon": safe_float(row.get("lon", "")),
            "has_coords": bool(row.get("lat", "").strip() and row.get("lon", "").strip()),
            "postcode": row.get("postcode", ""),
            "neighborhood": row.get("neighborhood_area", "") or "Coral Gables",
            "category_primary": row.get("category_primary", "other") or "other",
            "category_secondary": row.get("category_secondary", ""),
            "price_tier": row.get("price_tier", ""),
            "rating": safe_float(row.get("rating_primary_value", "")),
            "rating_source": row.get("rating_primary_source", ""),
            "review_count": safe_int(row.get("rating_primary_review_count", "")),
            "top_delights": row.get("top_delights", ""),
            "top_pain_points": row.get("top_pain_points", ""),
            "osint_confidence": safe_float(row.get("osint_confidence", "")),
            "validation_tier": row.get("validation_tier", ""),
            "red_flag_present": row.get("red_flag_present", "") == "Y",
            "red_flag_severity": row.get("red_flag_severity", ""),
            "red_flag_notes": row.get("red_flag_notes", ""),
            "chamber_member": row.get("chamber_member", "") == "Y",
            "source_file": row.get("source_file", ""),
            "batch_id": row.get("batch_id", ""),
            "last_reviewed": row.get("last_reviewed_date", ""),
            "corroboration_sources": row.get("corroboration_sources", ""),
            "corroboration_count": safe_int(row.get("corroboration_count", "")),
            "sunbiz_status": row.get("sunbiz_status", ""),
            "sunbiz_name": row.get("sunbiz_name", ""),
            "sunbiz_filing_number": row.get("sunbiz_filing_number", ""),
            # PKP
            "node_type": row.get("pkp_node_type", "") or classify_node_type(row.get("category_primary", "other")),
            "pkp_edges": row.get("pkp_edges_summary", ""),
            "pkp_picks_shovels": row.get("pkp_picks_shovels_summary", ""),
            "pkp_undercurrents": row.get("pkp_undercurrents_summary", ""),
            "pkp_signals": row.get("pkp_key_signals", ""),
            "pkp_risks": row.get("pkp_primary_risks", ""),
            "pkp_actions": row.get("pkp_primary_actions", ""),
        })
    print(f"      {len(nodes)} valid business nodes")
    return nodes


def transform_proximity_edges(businesses: List[Dict], threshold_m: float = 200.0) -> List[Tuple[str, str, float]]:
    """Compute NEAR edges between businesses within threshold meters.
    Uses spatial bucketing for O(n * k) instead of O(n²)."""
    print(f"  [T] Computing proximity edges (threshold={threshold_m}m)...")
    
    # Only businesses with coordinates
    with_coords = [(b["business_id"], b["lat"], b["lon"]) for b in businesses if b["has_coords"]]
    print(f"      {len(with_coords)} businesses with coordinates")
    
    if not with_coords:
        return []
    
    # Spatial bucketing (~200m grid cells)
    BUCKET_SIZE = 0.002  # ~200m in degrees at 25°N latitude
    buckets: Dict[Tuple[int, int], List] = defaultdict(list)
    
    for bid, lat, lon in with_coords:
        bx = int(lat / BUCKET_SIZE)
        by = int(lon / BUCKET_SIZE)
        buckets[(bx, by)].append((bid, lat, lon))
    
    edges = []
    seen = set()
    
    for (bx, by), items in buckets.items():
        # Check this bucket + 8 adjacent buckets
        neighbors = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                neighbors.extend(buckets.get((bx + dx, by + dy), []))
        
        for bid1, lat1, lon1 in items:
            for bid2, lat2, lon2 in neighbors:
                if bid1 >= bid2:
                    continue
                pair = (bid1, bid2)
                if pair in seen:
                    continue
                
                dist = haversine_m(lat1, lon1, lat2, lon2)
                if dist <= threshold_m:
                    edges.append((bid1, bid2, round(dist, 1)))
                    seen.add(pair)
    
    print(f"      {len(edges)} NEAR edges found")
    return edges


def transform_competition_edges(businesses: List[Dict]) -> List[Tuple[str, str]]:
    """Compute COMPETES_WITH edges: same category + same neighborhood."""
    print(f"  [T] Computing competition edges...")
    
    # Group by (category, neighborhood)
    groups: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for b in businesses:
        cat = b["category_primary"]
        hood = b["neighborhood"]
        if cat and cat != "other" and hood:
            groups[(cat, hood)].append(b["business_id"])
    
    edges = []
    for (cat, hood), bids in groups.items():
        if len(bids) < 2 or len(bids) > 50:  # skip huge groups to avoid edge explosion
            continue
        for i in range(len(bids)):
            for j in range(i + 1, len(bids)):
                edges.append((bids[i], bids[j]))
    
    print(f"      {len(edges)} COMPETES_WITH edges")
    return edges


def transform_actions(playbook: List[Dict]) -> List[Dict]:
    """Transform playbook JSON into ActionItem nodes."""
    print(f"  [T] Transforming action playbook...")
    items = []
    for entry in playbook:
        bid = entry.get("business_id", "")
        for idx, action in enumerate(entry.get("actions", [])):
            items.append({
                "action_id": f"{bid}_action_{idx}",
                "business_id": bid,
                "action_type": action.get("action_type", ""),
                "category": action.get("category", ""),
                "title": action.get("title", ""),
                "description": action.get("description", ""),
                "steps": "; ".join(action.get("steps", [])),
                "timeframe": action.get("timeframe", ""),
                "cost_estimate": action.get("cost_estimate", ""),
                "expected_impact": action.get("expected_impact", ""),
                "priority": action.get("priority", ""),
                "source": entry.get("action_source", "rules"),
            })
    print(f"      {len(items)} action items")
    return items


# ── LOAD ──────────────────────────────────────────────────────────
class Neo4jLoader:
    """Manages Neo4j connection and batch loading."""
    
    BATCH_SIZE = 500
    
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        # Verify connectivity
        self.driver.verify_connectivity()
        print(f"  [L] Connected to Neo4j at {uri}")
    
    def close(self):
        self.driver.close()
    
    def _run(self, query: str, params: dict = None):
        """Execute a single Cypher query."""
        with self.driver.session() as session:
            session.run(query, params or {})
    
    def _run_batch(self, query: str, items: List[Dict], label: str = "items"):
        """Execute a batched UNWIND query."""
        total = len(items)
        batches = math.ceil(total / self.BATCH_SIZE)
        for i in range(batches):
            chunk = items[i * self.BATCH_SIZE : (i + 1) * self.BATCH_SIZE]
            with self.driver.session() as session:
                session.run(query, {"batch": chunk})
            loaded = min((i + 1) * self.BATCH_SIZE, total)
            print(f"      [{loaded}/{total}] {label}")
    
    # ── Schema ────────────────────────────────────────────────────
    def create_constraints_and_indexes(self):
        """Create uniqueness constraints and indexes."""
        print(f"  [L] Creating constraints and indexes...")
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (b:Business) REQUIRE b.business_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Category) REQUIRE c.slug IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Neighborhood) REQUIRE n.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (z:ZipCode) REQUIRE z.code IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (s:SourceFamily) REQUIRE s.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (m:MarketForce) REQUIRE m.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (su:Supplier) REQUIRE su.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (a:ActionItem) REQUIRE a.action_id IS UNIQUE",
        ]
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.name)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.category_primary)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.neighborhood)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.rating)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.osint_confidence)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.node_type)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.chamber_member)",
            "CREATE INDEX IF NOT EXISTS FOR (b:Business) ON (b.red_flag_present)",
        ]
        # Full-text search index
        fulltext = [
            """CREATE FULLTEXT INDEX business_search IF NOT EXISTS 
               FOR (b:Business) ON EACH [b.name, b.address, b.category_secondary]""",
        ]
        
        with self.driver.session() as session:
            for q in constraints + indexes:
                session.run(q)
            for q in fulltext:
                try:
                    session.run(q)
                except Exception:
                    pass  # May already exist
        print(f"      {len(constraints)} constraints, {len(indexes)} indexes, {len(fulltext)} fulltext")
    
    def wipe(self):
        """Delete all nodes and edges."""
        print(f"  [L] Wiping graph...")
        with self.driver.session() as session:
            result = session.run("MATCH (n) RETURN count(n) AS c").single()
            count = result["c"] if result else 0
            if count > 0:
                # Delete in batches to avoid memory issues
                session.run("MATCH (n) DETACH DELETE n")
                print(f"      Deleted {count} nodes")
            else:
                print(f"      Graph already empty")
    
    # ── Reference nodes ───────────────────────────────────────────
    def load_categories(self):
        """Create :Category nodes."""
        print(f"  [L] Loading categories...")
        items = []
        for slug, display in CATEGORY_DISPLAY.items():
            node_type = classify_node_type(slug)
            items.append({"slug": slug, "display": display, "node_type": node_type})
        
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (c:Category {slug: row.slug})
            SET c.display_name = row.display,
                c.node_type = row.node_type
        """, items, "categories")
    
    def load_neighborhoods(self):
        """Create :Neighborhood nodes."""
        print(f"  [L] Loading neighborhoods...")
        items = [{"name": k, "display": v} for k, v in NEIGHBORHOOD_DISPLAY.items()]
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (n:Neighborhood {name: row.name})
            SET n.display_name = row.display
        """, items, "neighborhoods")
    
    def load_zipcodes(self):
        """Create :ZipCode nodes."""
        print(f"  [L] Loading ZIP codes...")
        zips = [
            {"code": "33134", "name": "Downtown Coral Gables"},
            {"code": "33146", "name": "UM / Merrick Park"},
            {"code": "33133", "name": "North Coral Gables"},
            {"code": "33143", "name": "South / Sunset Corridor"},
        ]
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (z:ZipCode {code: row.code})
            SET z.name = row.name
        """, zips, "zipcodes")
    
    def load_source_families(self):
        """Create :SourceFamily nodes."""
        print(f"  [L] Loading source families...")
        items = [{"name": k, "display": v} for k, v in SOURCE_FAMILIES.items()]
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (s:SourceFamily {name: row.name})
            SET s.display_name = row.display
        """, items, "source families")
    
    def load_market_forces(self):
        """Create :MarketForce nodes from undercurrents."""
        print(f"  [L] Loading market forces...")
        items = []
        seen = set()
        for cat, forces in UNDERCURRENTS.items():
            for force in forces:
                if force not in seen:
                    items.append({"name": force, "category": cat})
                    seen.add(force)
        
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (m:MarketForce {name: row.name})
        """, items, "market forces")
        
        # Create AFFECTED_BY edges
        edges = []
        for cat, forces in UNDERCURRENTS.items():
            for force in forces:
                edges.append({"category": cat, "force": force})
        
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (c:Category {slug: row.category})
            MATCH (m:MarketForce {name: row.force})
            MERGE (c)-[:AFFECTED_BY]->(m)
        """, edges, "category→market force edges")
    
    def load_suppliers(self):
        """Create :Supplier nodes from picks & shovels."""
        print(f"  [L] Loading suppliers (picks & shovels)...")
        items = []
        seen = set()
        for cat, suppliers in PICKS_SHOVELS.items():
            for sup in suppliers:
                if sup not in seen:
                    items.append({"name": sup})
                    seen.add(sup)
        
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (s:Supplier {name: row.name})
        """, items, "suppliers")
        
        # Create SUPPLIED_BY edges
        edges = []
        for cat, suppliers in PICKS_SHOVELS.items():
            for sup in suppliers:
                edges.append({"category": cat, "supplier": sup})
        
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (c:Category {slug: row.category})
            MATCH (s:Supplier {name: row.supplier})
            MERGE (c)-[:SUPPLIED_BY]->(s)
        """, edges, "category→supplier edges")
    
    # ── Business nodes ────────────────────────────────────────────
    def load_businesses(self, businesses: List[Dict]):
        """Create :Business nodes with all properties."""
        print(f"  [L] Loading {len(businesses)} business nodes...")
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (b:Business {business_id: row.business_id})
            SET b.name = row.name,
                b.contact_name = row.contact_name,
                b.phone = row.phone,
                b.website = row.website,
                b.website_verified = row.website_verified,
                b.address = row.address,
                b.lat = row.lat,
                b.lon = row.lon,
                b.has_coords = row.has_coords,
                b.postcode = row.postcode,
                b.neighborhood = row.neighborhood,
                b.category_primary = row.category_primary,
                b.category_secondary = row.category_secondary,
                b.price_tier = row.price_tier,
                b.rating = row.rating,
                b.rating_source = row.rating_source,
                b.review_count = row.review_count,
                b.top_delights = row.top_delights,
                b.top_pain_points = row.top_pain_points,
                b.osint_confidence = row.osint_confidence,
                b.validation_tier = row.validation_tier,
                b.red_flag_present = row.red_flag_present,
                b.red_flag_severity = row.red_flag_severity,
                b.red_flag_notes = row.red_flag_notes,
                b.chamber_member = row.chamber_member,
                b.source_file = row.source_file,
                b.batch_id = row.batch_id,
                b.last_reviewed = row.last_reviewed,
                b.corroboration_sources = row.corroboration_sources,
                b.corroboration_count = row.corroboration_count,
                b.sunbiz_status = row.sunbiz_status,
                b.sunbiz_name = row.sunbiz_name,
                b.sunbiz_filing_number = row.sunbiz_filing_number,
                b.node_type = row.node_type,
                b.pkp_edges = row.pkp_edges,
                b.pkp_picks_shovels = row.pkp_picks_shovels,
                b.pkp_undercurrents = row.pkp_undercurrents,
                b.pkp_signals = row.pkp_signals,
                b.pkp_risks = row.pkp_risks,
                b.pkp_actions = row.pkp_actions
        """, businesses, "businesses")
    
    # ── Relationship edges ────────────────────────────────────────
    def load_business_category_edges(self, businesses: List[Dict]):
        """Create (:Business)-[:CLASSIFIED_AS]->(:Category) edges."""
        print(f"  [L] Loading CLASSIFIED_AS edges...")
        items = [{"bid": b["business_id"], "cat": b["category_primary"]} for b in businesses]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            MATCH (c:Category {slug: row.cat})
            MERGE (b)-[:CLASSIFIED_AS]->(c)
        """, items, "business→category")
    
    def load_business_neighborhood_edges(self, businesses: List[Dict]):
        """Create (:Business)-[:LOCATED_IN]->(:Neighborhood) edges."""
        print(f"  [L] Loading LOCATED_IN edges...")
        items = [{"bid": b["business_id"], "hood": b["neighborhood"]} for b in businesses]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            MATCH (n:Neighborhood {name: row.hood})
            MERGE (b)-[:LOCATED_IN]->(n)
        """, items, "business→neighborhood")
    
    def load_business_zipcode_edges(self, businesses: List[Dict]):
        """Create (:Business)-[:IN_ZIPCODE]->(:ZipCode) edges."""
        print(f"  [L] Loading IN_ZIPCODE edges...")
        items = [{"bid": b["business_id"], "zip": b["postcode"]}
                 for b in businesses if b["postcode"] in ("33134", "33146", "33133", "33143")]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            MATCH (z:ZipCode {code: row.zip})
            MERGE (b)-[:IN_ZIPCODE]->(z)
        """, items, "business→zipcode")
    
    def load_business_source_edges(self, businesses: List[Dict]):
        """Create (:Business)-[:SOURCED_FROM]->(:SourceFamily) and CORROBORATED_BY edges."""
        print(f"  [L] Loading SOURCED_FROM + CORROBORATED_BY edges...")
        
        # Map source_file to source family
        SOURCE_TO_FAMILY = {
            "outscraper": "google", "apify": "google", "serpapi": "google",
            "osm": "osm", "cgcc": "cgcc", "osint-cgcc-v1": "cgcc",
            "ta": "tripadvisor", "non-cgcc-run1": "manual", "non-cgcc-run2": "manual",
            "agent1-scraper": "agent1",
        }
        
        sourced = []
        for b in businesses:
            family = SOURCE_TO_FAMILY.get(b["source_file"], "")
            if family:
                sourced.append({"bid": b["business_id"], "family": family})
        
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            MATCH (s:SourceFamily {name: row.family})
            MERGE (b)-[:SOURCED_FROM]->(s)
        """, sourced, "business→source")
        
        # Corroboration edges
        corr_edges = []
        for b in businesses:
            sources = b["corroboration_sources"]
            if sources:
                for src in sources.split(","):
                    src = src.strip()
                    if src and src in SOURCE_FAMILIES:
                        corr_edges.append({"bid": b["business_id"], "family": src})
        
        if corr_edges:
            self._run_batch("""
                UNWIND $batch AS row
                MATCH (b:Business {business_id: row.bid})
                MATCH (s:SourceFamily {name: row.family})
                MERGE (b)-[:CORROBORATED_BY]->(s)
            """, corr_edges, "business→corroboration")
    
    def load_near_edges(self, near_edges: List[Tuple[str, str, float]]):
        """Create (:Business)-[:NEAR {distance_m}]->(:Business) edges."""
        if not near_edges:
            return
        print(f"  [L] Loading {len(near_edges)} NEAR edges...")
        items = [{"bid1": e[0], "bid2": e[1], "dist": e[2]} for e in near_edges]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (a:Business {business_id: row.bid1})
            MATCH (b:Business {business_id: row.bid2})
            MERGE (a)-[:NEAR {distance_m: row.dist}]->(b)
        """, items, "NEAR edges")
    
    def load_competition_edges(self, comp_edges: List[Tuple[str, str]]):
        """Create (:Business)-[:COMPETES_WITH]->(:Business) edges."""
        if not comp_edges:
            return
        print(f"  [L] Loading {len(comp_edges)} COMPETES_WITH edges...")
        items = [{"bid1": e[0], "bid2": e[1]} for e in comp_edges]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (a:Business {business_id: row.bid1})
            MATCH (b:Business {business_id: row.bid2})
            MERGE (a)-[:COMPETES_WITH]->(b)
        """, items, "COMPETES_WITH edges")
    
    def load_action_items(self, action_items: List[Dict]):
        """Create :ActionItem nodes and HAS_ACTION edges."""
        if not action_items:
            return
        print(f"  [L] Loading {len(action_items)} action items...")
        
        # Create ActionItem nodes
        self._run_batch("""
            UNWIND $batch AS row
            MERGE (a:ActionItem {action_id: row.action_id})
            SET a.action_type = row.action_type,
                a.category = row.category,
                a.title = row.title,
                a.description = row.description,
                a.steps = row.steps,
                a.timeframe = row.timeframe,
                a.cost_estimate = row.cost_estimate,
                a.expected_impact = row.expected_impact,
                a.priority = row.priority,
                a.source = row.source
        """, action_items, "action items")
        
        # Create HAS_ACTION edges
        edges = [{"bid": a["business_id"], "aid": a["action_id"]} for a in action_items]
        self._run_batch("""
            UNWIND $batch AS row
            MATCH (b:Business {business_id: row.bid})
            MATCH (a:ActionItem {action_id: row.aid})
            MERGE (b)-[:HAS_ACTION]->(a)
        """, edges, "business→action")
    
    # ── Stats ─────────────────────────────────────────────────────
    def print_stats(self):
        """Query and print graph statistics."""
        print(f"\n  {'='*55}")
        print(f"  KNOWLEDGE GRAPH STATS")
        print(f"  {'='*55}\n")
        
        queries = [
            ("Businesses", "MATCH (b:Business) RETURN count(b) AS c"),
            ("Categories", "MATCH (c:Category) RETURN count(c) AS c"),
            ("Neighborhoods", "MATCH (n:Neighborhood) RETURN count(n) AS c"),
            ("ZIP Codes", "MATCH (z:ZipCode) RETURN count(z) AS c"),
            ("Source Families", "MATCH (s:SourceFamily) RETURN count(s) AS c"),
            ("Market Forces", "MATCH (m:MarketForce) RETURN count(m) AS c"),
            ("Suppliers", "MATCH (s:Supplier) RETURN count(s) AS c"),
            ("Action Items", "MATCH (a:ActionItem) RETURN count(a) AS c"),
            ("─── EDGES ───", None),
            ("CLASSIFIED_AS", "MATCH ()-[r:CLASSIFIED_AS]->() RETURN count(r) AS c"),
            ("LOCATED_IN", "MATCH ()-[r:LOCATED_IN]->() RETURN count(r) AS c"),
            ("IN_ZIPCODE", "MATCH ()-[r:IN_ZIPCODE]->() RETURN count(r) AS c"),
            ("SOURCED_FROM", "MATCH ()-[r:SOURCED_FROM]->() RETURN count(r) AS c"),
            ("CORROBORATED_BY", "MATCH ()-[r:CORROBORATED_BY]->() RETURN count(r) AS c"),
            ("NEAR", "MATCH ()-[r:NEAR]->() RETURN count(r) AS c"),
            ("COMPETES_WITH", "MATCH ()-[r:COMPETES_WITH]->() RETURN count(r) AS c"),
            ("SUPPLIED_BY", "MATCH ()-[r:SUPPLIED_BY]->() RETURN count(r) AS c"),
            ("AFFECTED_BY", "MATCH ()-[r:AFFECTED_BY]->() RETURN count(r) AS c"),
            ("HAS_ACTION", "MATCH ()-[r:HAS_ACTION]->() RETURN count(r) AS c"),
        ]
        
        with self.driver.session() as session:
            for label, query in queries:
                if query is None:
                    print(f"  {label}")
                    continue
                result = session.run(query).single()
                count = result["c"] if result else 0
                print(f"  {label:<25} {count:>8,}")
        
        # Total
        with self.driver.session() as session:
            nodes = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
            edges = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
            print(f"\n  {'─'*35}")
            print(f"  Total nodes:            {nodes:>8,}")
            print(f"  Total edges:            {edges:>8,}")
        
        print(f"\n  {'='*55}\n")


# ── MAIN ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="ETL — Load master CSV into Neo4j Knowledge Graph")
    parser.add_argument("--master", default=str(DEFAULT_MASTER), help="Path to master_all_businesses.csv")
    parser.add_argument("--playbook", default=str(DEFAULT_PLAYBOOK), help="Path to action_playbook.json")
    parser.add_argument("--uri", default=NEO4J_URI, help="Neo4j Bolt URI")
    parser.add_argument("--user", default=NEO4J_USER, help="Neo4j username")
    parser.add_argument("--password", default=NEO4J_PASSWORD, help="Neo4j password")
    parser.add_argument("--incremental", action="store_true", help="Skip wipe, merge into existing graph")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate only, no Neo4j writes")
    parser.add_argument("--skip-proximity", action="store_true", help="Skip NEAR edge computation (faster)")
    parser.add_argument("--skip-competition", action="store_true", help="Skip COMPETES_WITH edge computation")
    parser.add_argument("--proximity-threshold", type=float, default=200.0, help="NEAR edge threshold in meters")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  ETL — KNOWLEDGE GRAPH LOADER")
    print(f"  Master:  {args.master}")
    print(f"  Neo4j:   {args.uri}")
    print(f"  Mode:    {'INCREMENTAL' if args.incremental else 'FULL REBUILD'}")
    print(f"  Dry run: {args.dry_run}")
    print(f"{'='*60}\n")

    start = time.time()

    # ── EXTRACT ───────────────────────────────────────────────────
    df = extract_master(args.master)
    playbook = extract_playbook(args.playbook)

    # ── TRANSFORM ─────────────────────────────────────────────────
    businesses = transform_businesses(df)
    
    near_edges = []
    if not args.skip_proximity:
        near_edges = transform_proximity_edges(businesses, args.proximity_threshold)
    
    comp_edges = []
    if not args.skip_competition:
        comp_edges = transform_competition_edges(businesses)
    
    action_items = transform_actions(playbook)

    # ── Summary ───────────────────────────────────────────────────
    print(f"\n  Transform Summary:")
    print(f"    Business nodes:       {len(businesses):>6,}")
    print(f"    NEAR edges:           {len(near_edges):>6,}")
    print(f"    COMPETES_WITH edges:  {len(comp_edges):>6,}")
    print(f"    Action items:         {len(action_items):>6,}")

    if args.dry_run:
        elapsed = time.time() - start
        print(f"\n  DRY RUN complete in {elapsed:.1f}s — no data written to Neo4j\n")
        return

    # ── LOAD ──────────────────────────────────────────────────────
    loader = Neo4jLoader(args.uri, args.user, args.password)

    try:
        if not args.incremental:
            loader.wipe()
        
        loader.create_constraints_and_indexes()
        
        # Reference nodes
        loader.load_categories()
        loader.load_neighborhoods()
        loader.load_zipcodes()
        loader.load_source_families()
        loader.load_market_forces()
        loader.load_suppliers()
        
        # Business nodes
        loader.load_businesses(businesses)
        
        # Edges
        loader.load_business_category_edges(businesses)
        loader.load_business_neighborhood_edges(businesses)
        loader.load_business_zipcode_edges(businesses)
        loader.load_business_source_edges(businesses)
        loader.load_near_edges(near_edges)
        loader.load_competition_edges(comp_edges)
        loader.load_action_items(action_items)
        
        # Stats
        loader.print_stats()
        
    finally:
        loader.close()

    elapsed = time.time() - start
    print(f"  ETL complete in {elapsed:.1f}s")
    print(f"  Neo4j Browser: http://localhost:7474")
    print(f"  Bolt endpoint: bolt://localhost:7687\n")


if __name__ == "__main__":
    main()
