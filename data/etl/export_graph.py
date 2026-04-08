#!/usr/bin/env python3
"""Export graph summary data from Neo4j to JSON for the dashboard.

Usage:
    python export_graph.py                  # Full export
    python export_graph.py --limit 500      # Limit businesses (for lighter payloads)
"""
import json, argparse, sys
from pathlib import Path
from neo4j import GraphDatabase

NEO4J_URI = "bolt://localhost:7688"
NEO4J_USER = "neo4j"
NEO4J_PASS = "cgcc2024graph"

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "dashboard" / "public" / "data"


def export_graph(limit: int = 0):
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    graph = {"nodes": [], "links": []}

    with driver.session() as s:
        # ── Business nodes (top by connection count) ─────────────
        limit_clause = f"LIMIT {limit}" if limit else ""
        biz = s.run(f"""
            MATCH (b:Business)
            OPTIONAL MATCH (b)-[r]-()
            WITH b, count(r) AS deg
            ORDER BY deg DESC
            {limit_clause}
            RETURN b.business_id AS id,
                   b.name AS name,
                   b.category_primary AS category,
                   b.neighborhood AS neighborhood,
                   b.node_type AS node_type,
                   b.rating AS rating,
                   b.osint_confidence AS confidence,
                   b.chamber_member AS member,
                   b.red_flag_present AS red_flag,
                   b.lat AS lat, b.lon AS lon,
                   deg
        """)
        biz_ids = set()
        for rec in biz:
            biz_ids.add(rec["id"])
            graph["nodes"].append({
                "id": rec["id"],
                "name": rec["name"] or rec["id"],
                "group": rec["node_type"] or "asset",
                "category": rec["category"] or "other",
                "neighborhood": rec["neighborhood"] or "Coral Gables",
                "rating": rec["rating"] or 0,
                "confidence": rec["confidence"] or 0,
                "member": rec["member"] or False,
                "red_flag": rec["red_flag"] or False,
                "lat": rec["lat"] or 0,
                "lon": rec["lon"] or 0,
                "deg": rec["deg"],
                "type": "business",
            })

        # ── Category nodes ───────────────────────────────────────
        cats = s.run("""
            MATCH (c:Category)
            OPTIONAL MATCH (c)<-[:CLASSIFIED_AS]-(b:Business)
            RETURN c.slug AS id, c.display_name AS name, c.node_type AS node_type, count(b) AS size
        """)
        for rec in cats:
            graph["nodes"].append({
                "id": f"cat:{rec['id']}",
                "name": rec["name"] or rec["id"],
                "group": "category",
                "size": rec["size"],
                "type": "category",
            })

        # ── Neighborhood nodes ───────────────────────────────────
        hoods = s.run("""
            MATCH (n:Neighborhood)
            OPTIONAL MATCH (n)<-[:LOCATED_IN]-(b:Business)
            RETURN n.name AS id, n.display_name AS name, count(b) AS size
        """)
        for rec in hoods:
            graph["nodes"].append({
                "id": f"hood:{rec['id']}",
                "name": rec["name"] or rec["id"],
                "group": "neighborhood",
                "size": rec["size"],
                "type": "neighborhood",
            })

        # ── CLASSIFIED_AS edges ──────────────────────────────────
        edges = s.run("""
            MATCH (b:Business)-[:CLASSIFIED_AS]->(c:Category)
            RETURN b.business_id AS source, 'cat:' + c.slug AS target
        """)
        for rec in edges:
            if rec["source"] in biz_ids:
                graph["links"].append({
                    "source": rec["source"],
                    "target": rec["target"],
                    "type": "CLASSIFIED_AS",
                })

        # ── LOCATED_IN edges ─────────────────────────────────────
        edges = s.run("""
            MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood)
            RETURN b.business_id AS source, 'hood:' + n.name AS target
        """)
        for rec in edges:
            if rec["source"] in biz_ids:
                graph["links"].append({
                    "source": rec["source"],
                    "target": rec["target"],
                    "type": "LOCATED_IN",
                })

        # ── COMPETES_WITH edges (only between included businesses) ──
        edges = s.run("""
            MATCH (b1:Business)-[:COMPETES_WITH]->(b2:Business)
            RETURN b1.business_id AS source, b2.business_id AS target
        """)
        comp_count = 0
        for rec in edges:
            if rec["source"] in biz_ids and rec["target"] in biz_ids:
                graph["links"].append({
                    "source": rec["source"],
                    "target": rec["target"],
                    "type": "COMPETES_WITH",
                })
                comp_count += 1

        # ── NEAR edges (only top 500 closest pairs) ─────────────
        edges = s.run("""
            MATCH (b1:Business)-[r:NEAR]->(b2:Business)
            RETURN b1.business_id AS source, b2.business_id AS target, r.distance_m AS dist
            ORDER BY r.distance_m ASC
            LIMIT 500
        """)
        near_count = 0
        for rec in edges:
            if rec["source"] in biz_ids and rec["target"] in biz_ids:
                graph["links"].append({
                    "source": rec["source"],
                    "target": rec["target"],
                    "type": "NEAR",
                    "distance": round(rec["dist"], 1),
                })
                near_count += 1

        # ── Stats ────────────────────────────────────────────────
        stats_r = s.run("""
            MATCH (b:Business) WITH count(b) AS biz
            OPTIONAL MATCH ()-[r]->() WITH biz, count(r) AS edges
            RETURN biz, edges
        """).single()

        pkp = s.run("""
            MATCH (b:Business)
            RETURN b.node_type AS type, count(*) AS cnt
            ORDER BY cnt DESC
        """)
        pkp_dist = {rec["type"]: rec["cnt"] for rec in pkp}

        cat_dist = s.run("""
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
            RETURN c.display_name AS cat, count(b) AS cnt
            ORDER BY cnt DESC
        """)
        cat_summary = {rec["cat"]: rec["cnt"] for rec in cat_dist}

        hood_dist = s.run("""
            MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
            RETURN n.display_name AS hood, count(b) AS cnt
            ORDER BY cnt DESC
        """)
        hood_summary = {rec["hood"]: rec["cnt"] for rec in hood_dist}

    driver.close()

    # ── Save graph data ──────────────────────────────────────────
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "graph_data.json"
    with open(out_path, "w") as f:
        json.dump(graph, f, separators=(",", ":"))
    print(f"  Graph data: {out_path}")
    print(f"    {len(graph['nodes'])} nodes, {len(graph['links'])} links")
    print(f"    File size: {out_path.stat().st_size / 1024:.1f} KB")

    # ── Save stats ───────────────────────────────────────────────
    stats_out = {
        "total_businesses": stats_r["biz"],
        "total_edges": stats_r["edges"],
        "pkp_distribution": pkp_dist,
        "category_distribution": cat_summary,
        "neighborhood_distribution": hood_summary,
        "exported_nodes": len(graph["nodes"]),
        "exported_links": len(graph["links"]),
    }
    stats_path = OUT_DIR / "graph_stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats_out, f, indent=2)
    print(f"  Graph stats: {stats_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export graph summary for dashboard")
    parser.add_argument("--limit", type=int, default=0, help="Max businesses to export (0=all)")
    args = parser.parse_args()
    print(f"\n  Exporting graph data (limit={args.limit or 'ALL'})...")
    export_graph(limit=args.limit)
    print("  Done.\n")
