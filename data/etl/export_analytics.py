#!/usr/bin/env python3
"""Export pre-computed analytical query results from Neo4j for the dashboard.

Each query produces both:
  - A graph result (nodes + links for force-graph visualization)
  - A table result (rows for tabular display)

Output: dashboard/public/data/analytics_queries.json
"""
import json, sys
from pathlib import Path
from neo4j import GraphDatabase

NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASS = "cgcc2024graph"

OUT = Path(__file__).resolve().parent.parent.parent / "dashboard" / "public" / "data" / "analytics_queries.json"

# ── Color/group mapping ──────────────────────────────────────────
GROUP_COLORS = {
    "infrastructure": "#D97706",
    "platform": "#2563EB",
    "asset": "#059669",
    "category": "#7C3AED",
    "neighborhood": "#DC2626",
    "supplier": "#F59E0B",
    "marketforce": "#8B5CF6",
}

# ── Query definitions ────────────────────────────────────────────
QUERIES = [
    # ── COMPETITIVE INTELLIGENCE ─────────────────────────────
    {
        "id": "top_competitors",
        "title": "Who has the most competitors?",
        "description": "Businesses ranked by number of competition edges — reveals the most contested market positions in Coral Gables.",
        "category": "Competitive Intel",
        "icon": "swords",
        "graph_query": """
            MATCH (b:Business)-[r:COMPETES_WITH]-(rival:Business)
            WITH b, collect(DISTINCT rival) AS rivals, count(DISTINCT rival) AS cnt
            ORDER BY cnt DESC LIMIT 12
            UNWIND rivals[..8] AS rival
            RETURN b, rival
        """,
        "table_query": """
            MATCH (b:Business)-[r:COMPETES_WITH]-()
            RETURN b.name AS business, b.category_primary AS category,
                   b.neighborhood AS neighborhood, b.rating AS rating,
                   count(r) AS competitors
            ORDER BY competitors DESC LIMIT 20
        """,
    },
    {
        "id": "competition_triangles",
        "title": "Competition clusters — who's in a 3-way battle?",
        "description": "Triangles of businesses all competing with each other — the tightest competitive arenas.",
        "category": "Competitive Intel",
        "icon": "triangle",
        "graph_query": """
            MATCH (a:Business)-[:COMPETES_WITH]->(b:Business)-[:COMPETES_WITH]->(c:Business)-[:COMPETES_WITH]->(a)
            WITH a, b, c LIMIT 10
            RETURN a, b, c
        """,
        "table_query": """
            MATCH (a:Business)-[:COMPETES_WITH]->(b:Business)-[:COMPETES_WITH]->(c:Business)-[:COMPETES_WITH]->(a)
            RETURN a.name AS biz_1, b.name AS biz_2, c.name AS biz_3,
                   a.category_primary AS category
            LIMIT 20
        """,
    },
    {
        "id": "neighborhood_competition",
        "title": "Which neighborhood is the most competitive?",
        "description": "Neighborhoods ranked by density of competition edges per business.",
        "category": "Competitive Intel",
        "icon": "flame",
        "graph_query": """
            MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)-[c:COMPETES_WITH]->()
            WITH n, collect(DISTINCT b)[..15] AS biz
            UNWIND biz AS b
            OPTIONAL MATCH (b)-[r:COMPETES_WITH]->(rival)
            WHERE rival IN biz
            RETURN n, b, rival
        """,
        "table_query": """
            MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)-[c:COMPETES_WITH]->()
            RETURN n.display_name AS neighborhood, count(DISTINCT b) AS businesses,
                   count(c) AS competition_edges,
                   round(toFloat(count(c)) / count(DISTINCT b), 1) AS edges_per_biz
            ORDER BY competition_edges DESC
        """,
    },

    # ── LOCATION & PROXIMITY ─────────────────────────────────
    {
        "id": "colocation_clusters",
        "title": "Who shares the same block? (within 50m)",
        "description": "Businesses physically co-located — potential for foot-traffic sharing, cross-promotions, or conflict.",
        "category": "Location & Proximity",
        "icon": "map-pin",
        "graph_query": """
            MATCH (a:Business)-[r:NEAR]->(b:Business)
            WHERE r.distance_m < 50
            WITH a, b, r ORDER BY r.distance_m LIMIT 30
            RETURN a, b
        """,
        "table_query": """
            MATCH (a:Business)-[r:NEAR]->(b:Business)
            WHERE r.distance_m < 50
            RETURN a.name AS business_1, b.name AS business_2,
                   round(r.distance_m, 1) AS meters_apart,
                   a.category_primary AS cat_1, b.category_primary AS cat_2
            ORDER BY r.distance_m LIMIT 20
        """,
    },
    {
        "id": "neighborhood_density",
        "title": "Business density by neighborhood",
        "description": "Which neighborhoods are business-dense, with average ratings and chamber membership rates.",
        "category": "Location & Proximity",
        "icon": "layers",
        "graph_query": """
            MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
            WITH n, collect(b)[..20] AS biz
            UNWIND biz AS b
            RETURN n, b
        """,
        "table_query": """
            MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
            RETURN n.display_name AS neighborhood, count(b) AS businesses,
                   round(avg(b.rating), 2) AS avg_rating,
                   sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members,
                   round(toFloat(sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END)) / count(b) * 100, 1) AS member_pct
            ORDER BY businesses DESC
        """,
    },

    # ── PKP (NODE TYPE ANALYSIS) ─────────────────────────────
    {
        "id": "pkp_breakdown",
        "title": "Infrastructure vs Platform vs Asset — the PKP map",
        "description": "How the Coral Gables business ecosystem breaks down by Portable Knowledge Protocol classification.",
        "category": "PKP Analysis",
        "icon": "network",
        "graph_query": """
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
            WITH c, b.node_type AS ntype, collect(b)[..5] AS sample
            UNWIND sample AS b
            RETURN c, b
        """,
        "table_query": """
            MATCH (b:Business)
            RETURN b.node_type AS pkp_type, count(*) AS count,
                   round(avg(b.rating), 2) AS avg_rating,
                   round(avg(b.osint_confidence), 3) AS avg_confidence,
                   sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
            ORDER BY count DESC
        """,
    },
    {
        "id": "infrastructure_backbone",
        "title": "The backbone — most connected infrastructure nodes",
        "description": "Infrastructure businesses are the utilities, banks, and services everything depends on. These are the most connected.",
        "category": "PKP Analysis",
        "icon": "building",
        "graph_query": """
            MATCH (b:Business {node_type: 'infrastructure'})-[r]-()
            WITH b, count(r) AS deg ORDER BY deg DESC LIMIT 10
            MATCH (b)-[r2:COMPETES_WITH|CLASSIFIED_AS|LOCATED_IN]-(n)
            RETURN b, r2, n
        """,
        "table_query": """
            MATCH (b:Business {node_type: 'infrastructure'})-[r]-()
            RETURN b.name AS business, b.category_primary AS category,
                   b.neighborhood AS neighborhood, count(r) AS connections, b.rating AS rating
            ORDER BY connections DESC LIMIT 15
        """,
    },
    {
        "id": "platform_hubs",
        "title": "Platform businesses — potential ecosystem hubs",
        "description": "Platforms (restaurants, hotels, retail) with high connectivity could become partnership hubs or event venues.",
        "category": "PKP Analysis",
        "icon": "hub",
        "graph_query": """
            MATCH (b:Business {node_type: 'platform'})-[r:COMPETES_WITH|NEAR]-(other)
            WITH b, count(r) AS reach ORDER BY reach DESC LIMIT 8
            MATCH (b)-[r2:COMPETES_WITH]-(rival:Business)
            WITH b, collect(rival)[..6] AS rivals
            UNWIND rivals AS rival
            RETURN b, rival
        """,
        "table_query": """
            MATCH (b:Business {node_type: 'platform'})-[r:COMPETES_WITH|NEAR]-()
            WITH b, count(r) AS reach
            WHERE reach > 15
            RETURN b.name AS business, reach, b.category_primary AS category,
                   b.neighborhood AS neighborhood, b.rating AS rating
            ORDER BY reach DESC LIMIT 15
        """,
    },

    # ── RISK & RED FLAGS ─────────────────────────────────────
    {
        "id": "risk_hotspots",
        "title": "Risk hotspots — red flags by neighborhood",
        "description": "Where are flagged businesses concentrated? Neighborhoods with clustering risk signals.",
        "category": "Risk & Quality",
        "icon": "alert-triangle",
        "graph_query": """
            MATCH (b:Business {red_flag_present: true})-[:LOCATED_IN]->(n:Neighborhood)
            OPTIONAL MATCH (b)-[r:NEAR]->(neighbor:Business)
            WHERE r.distance_m < 100
            WITH n, b, collect(neighbor)[..3] AS nearby
            UNWIND nearby + [b] AS node
            RETURN DISTINCT n, node
        """,
        "table_query": """
            MATCH (b:Business {red_flag_present: true})-[:LOCATED_IN]->(n:Neighborhood)
            RETURN n.display_name AS neighborhood, count(b) AS flagged,
                   collect(b.name)[..5] AS examples
            ORDER BY flagged DESC
        """,
    },
    {
        "id": "low_confidence",
        "title": "Which businesses need re-validation?",
        "description": "Low OSINT confidence scores indicate sparse or conflicting source data. These need another pass.",
        "category": "Risk & Quality",
        "icon": "shield-question",
        "graph_query": """
            MATCH (b:Business)-[:SOURCED_FROM]->(s:SourceFamily)
            WHERE b.osint_confidence < 0.3 AND b.osint_confidence > 0
            WITH b, collect(s) AS sources
            UNWIND sources AS s
            RETURN b, s
        """,
        "table_query": """
            MATCH (b:Business)
            WHERE b.osint_confidence < 0.3 AND b.osint_confidence > 0
            RETURN b.name AS business, round(b.osint_confidence, 3) AS confidence,
                   b.validation_tier AS tier, b.source_file AS source,
                   b.category_primary AS category
            ORDER BY b.osint_confidence ASC LIMIT 20
        """,
    },

    # ── CHAMBER MEMBERSHIP ───────────────────────────────────
    {
        "id": "recruit_targets",
        "title": "Top recruitment targets — high-rated non-members",
        "description": "Successful businesses not yet in the Chamber. The best prospects for membership outreach.",
        "category": "Chamber Membership",
        "icon": "user-plus",
        "graph_query": """
            MATCH (b:Business)
            WHERE b.chamber_member = false AND b.rating >= 4.5
            WITH b ORDER BY b.review_count DESC LIMIT 15
            MATCH (b)-[:CLASSIFIED_AS]->(c:Category)
            OPTIONAL MATCH (b)-[:LOCATED_IN]->(n:Neighborhood)
            RETURN b, c, n
        """,
        "table_query": """
            MATCH (b:Business)
            WHERE b.chamber_member = false AND b.rating >= 4.5
            RETURN b.name AS business, b.rating AS rating,
                   b.review_count AS reviews, b.category_primary AS category,
                   b.neighborhood AS neighborhood
            ORDER BY b.review_count DESC LIMIT 20
        """,
    },
    {
        "id": "warm_intros",
        "title": "Warm introductions — non-members next to members",
        "description": "Non-members physically close to existing members. The member could make a personal introduction.",
        "category": "Chamber Membership",
        "icon": "handshake",
        "graph_query": """
            MATCH (m:Business {chamber_member: true})-[r:NEAR]->(p:Business {chamber_member: false})
            WHERE r.distance_m < 100
            WITH m, p, r ORDER BY r.distance_m LIMIT 20
            RETURN m, p
        """,
        "table_query": """
            MATCH (m:Business {chamber_member: true})-[r:NEAR]->(p:Business {chamber_member: false})
            WHERE r.distance_m < 100
            RETURN p.name AS prospect, p.category_primary AS category, p.rating AS rating,
                   m.name AS referring_member, round(r.distance_m) AS meters_away
            ORDER BY r.distance_m LIMIT 20
        """,
    },
    {
        "id": "category_gaps",
        "title": "Category gaps — where is CGCC under-represented?",
        "description": "Categories where the Chamber has low membership penetration — strategic growth opportunities.",
        "category": "Chamber Membership",
        "icon": "pie-chart",
        "graph_query": """
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
            WITH c, count(b) AS total,
                 sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
            WHERE total > 10
            WITH c, total, members ORDER BY toFloat(members)/total ASC LIMIT 8
            MATCH (c)<-[:CLASSIFIED_AS]-(b:Business)
            WITH c, collect(b)[..10] AS sample
            UNWIND sample AS b
            RETURN c, b
        """,
        "table_query": """
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
            WITH c.display_name AS category, count(b) AS total,
                 sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
            RETURN category, total, members,
                   round(toFloat(members) / total * 100, 1) AS member_pct
            ORDER BY member_pct ASC
        """,
    },

    # ── SUPPLY CHAIN & MARKET FORCES ─────────────────────────
    {
        "id": "market_forces",
        "title": "What market forces shape each category?",
        "description": "Undercurrents and external pressures mapped to business categories — the forces behind the numbers.",
        "category": "Supply Chain & Forces",
        "icon": "wind",
        "graph_query": """
            MATCH (c:Category)-[r:AFFECTED_BY]->(m:MarketForce)
            RETURN c, r, m
        """,
        "table_query": """
            MATCH (c:Category)-[:AFFECTED_BY]->(m:MarketForce)
            RETURN c.display_name AS category, collect(m.name) AS market_forces
            ORDER BY category
        """,
    },
    {
        "id": "picks_shovels",
        "title": "Picks & shovels — who supplies the ecosystem?",
        "description": "Supplier services that multiple categories depend on — the infrastructure behind the infrastructure.",
        "category": "Supply Chain & Forces",
        "icon": "wrench",
        "graph_query": """
            MATCH (c:Category)-[r:SUPPLIED_BY]->(s:Supplier)
            RETURN c, r, s
        """,
        "table_query": """
            MATCH (c:Category)-[:SUPPLIED_BY]->(s:Supplier)
            RETURN s.name AS supplier, count(c) AS categories_served,
                   collect(c.display_name) AS categories
            ORDER BY categories_served DESC
        """,
    },

    # ── DATA QUALITY ─────────────────────────────────────────
    {
        "id": "best_corroborated",
        "title": "Best-verified businesses (multi-source corroboration)",
        "description": "Businesses confirmed by 3+ independent sources — highest data confidence.",
        "category": "Data Intelligence",
        "icon": "shield-check",
        "graph_query": """
            MATCH (b:Business)-[r:CORROBORATED_BY]->(s:SourceFamily)
            WITH b, collect(s) AS sources, count(s) AS cnt
            WHERE cnt >= 3
            ORDER BY cnt DESC LIMIT 10
            UNWIND sources AS s
            RETURN b, s
        """,
        "table_query": """
            MATCH (b:Business)-[r:CORROBORATED_BY]->()
            WITH b, count(r) AS sources
            WHERE sources >= 3
            RETURN b.name AS business, sources, b.corroboration_sources AS source_list,
                   round(b.osint_confidence, 3) AS confidence
            ORDER BY sources DESC LIMIT 15
        """,
    },
    {
        "id": "single_source",
        "title": "Single-source businesses — need more validation",
        "description": "Only verified by one data source. These need additional scraping passes for confidence.",
        "category": "Data Intelligence",
        "icon": "alert-circle",
        "graph_query": """
            MATCH (b:Business)-[r:SOURCED_FROM]->(s:SourceFamily)
            WITH b, collect(s) AS sources, count(s) AS cnt
            WHERE cnt = 1
            ORDER BY b.osint_confidence ASC LIMIT 15
            UNWIND sources AS s
            RETURN b, s
        """,
        "table_query": """
            MATCH (b:Business)-[r:SOURCED_FROM]->(s:SourceFamily)
            WITH b, count(r) AS source_count, collect(s.display_name) AS sources
            WHERE source_count = 1
            RETURN b.name AS business, sources[0] AS only_source,
                   round(b.osint_confidence, 3) AS confidence, b.category_primary AS category
            ORDER BY b.osint_confidence ASC LIMIT 20
        """,
    },

    # ── GRAPH TRAVERSAL ──────────────────────────────────────
    {
        "id": "most_connected",
        "title": "The 10 most connected nodes in the entire graph",
        "description": "Hub businesses with the highest total edge count — they touch everything.",
        "category": "Graph Traversal",
        "icon": "git-merge",
        "graph_query": """
            MATCH (b:Business)-[r]-()
            WITH b, count(r) AS deg ORDER BY deg DESC LIMIT 10
            MATCH (b)-[r2:CLASSIFIED_AS|LOCATED_IN|COMPETES_WITH]-(n)
            WITH b, r2, n LIMIT 80
            RETURN b, r2, n
        """,
        "table_query": """
            MATCH (b:Business)-[r]-()
            RETURN b.name AS business, b.node_type AS pkp_type,
                   b.category_primary AS category, b.neighborhood AS neighborhood,
                   count(r) AS total_connections
            ORDER BY total_connections DESC LIMIT 15
        """,
    },
    {
        "id": "category_ecosystem",
        "title": "Full ecosystem map — categories as hubs",
        "description": "See how businesses cluster around their categories, with neighborhoods as anchors.",
        "category": "Graph Traversal",
        "icon": "orbit",
        "graph_query": """
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)-[:LOCATED_IN]->(n:Neighborhood)
            WITH c, n, collect(b)[..5] AS sample
            UNWIND sample AS b
            RETURN c, b, n
        """,
        "table_query": """
            MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
            RETURN c.display_name AS category, count(b) AS businesses,
                   round(avg(b.rating), 2) AS avg_rating,
                   sum(CASE WHEN b.red_flag_present THEN 1 ELSE 0 END) AS red_flags
            ORDER BY businesses DESC
        """,
    },
]


# ── Execute and export ───────────────────────────────────────────
def run_query_to_graph(session, cypher: str) -> dict:
    """Run a Cypher query and extract nodes + links from the result."""
    result = session.run(cypher)
    nodes_map = {}
    links = []

    for record in result:
        for value in record.values():
            if value is None:
                continue
            # Check if it's a node
            if hasattr(value, 'labels'):
                nid = node_id(value)
                if nid not in nodes_map:
                    nodes_map[nid] = node_to_dict(value)
            # Check if it's a relationship
            elif hasattr(value, 'type'):
                links.append(rel_to_dict(value))
            # Check if it's a path
            elif hasattr(value, 'nodes'):
                for n in value.nodes:
                    nid = node_id(n)
                    if nid not in nodes_map:
                        nodes_map[nid] = node_to_dict(n)
                for r in value.relationships:
                    links.append(rel_to_dict(r))

    # For queries that return node pairs without explicit relationships,
    # infer edges from the result pattern
    if not links and len(nodes_map) > 1:
        records = session.run(cypher)
        for record in records:
            vals = [v for v in record.values() if v is not None and hasattr(v, 'labels')]
            for i in range(len(vals) - 1):
                links.append({
                    "source": node_id(vals[i]),
                    "target": node_id(vals[i + 1]),
                    "type": "RELATED",
                })

    return {"nodes": list(nodes_map.values()), "links": links}


def run_query_to_table(session, cypher: str) -> list:
    """Run a Cypher query and return list of row dicts."""
    result = session.run(cypher)
    rows = []
    for record in result:
        row = {}
        for key in record.keys():
            val = record[key]
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val[:8])
            elif isinstance(val, float):
                val = round(val, 3)
            elif val is None:
                val = ""
            else:
                val = str(val) if not isinstance(val, (int, bool)) else val
            row[key] = val
        rows.append(row)
    return rows


def node_id(neo4j_node) -> str:
    """Generate a stable string ID for a Neo4j node."""
    labels = list(neo4j_node.labels)
    props = dict(neo4j_node)
    if "Business" in labels:
        return props.get("business_id", str(neo4j_node.element_id))
    elif "Category" in labels:
        return f"cat:{props.get('slug', '')}"
    elif "Neighborhood" in labels:
        return f"hood:{props.get('name', '')}"
    elif "SourceFamily" in labels:
        return f"src:{props.get('name', '')}"
    elif "MarketForce" in labels:
        return f"mf:{props.get('name', '')}"
    elif "Supplier" in labels:
        return f"sup:{props.get('name', '')}"
    else:
        return str(neo4j_node.element_id)


def node_to_dict(neo4j_node) -> dict:
    """Convert a Neo4j node to a JSON-friendly dict."""
    labels = list(neo4j_node.labels)
    props = dict(neo4j_node)
    nid = node_id(neo4j_node)

    base = {"id": nid}
    if "Business" in labels:
        base.update({
            "name": props.get("name", nid),
            "group": props.get("node_type", "asset"),
            "type": "business",
            "category": props.get("category_primary", ""),
            "neighborhood": props.get("neighborhood", ""),
            "rating": props.get("rating", 0),
            "member": props.get("chamber_member", False),
            "red_flag": props.get("red_flag_present", False),
        })
    elif "Category" in labels:
        base.update({
            "name": props.get("display_name", props.get("slug", "")),
            "group": "category",
            "type": "category",
        })
    elif "Neighborhood" in labels:
        base.update({
            "name": props.get("display_name", props.get("name", "")),
            "group": "neighborhood",
            "type": "neighborhood",
        })
    elif "SourceFamily" in labels:
        base.update({
            "name": props.get("display_name", props.get("name", "")),
            "group": "source",
            "type": "source",
        })
    elif "MarketForce" in labels:
        base.update({
            "name": props.get("name", ""),
            "group": "marketforce",
            "type": "marketforce",
        })
    elif "Supplier" in labels:
        base.update({
            "name": props.get("name", ""),
            "group": "supplier",
            "type": "supplier",
        })
    else:
        base.update({"name": str(props), "group": "other", "type": labels[0].lower() if labels else "unknown"})

    return base


def rel_to_dict(neo4j_rel) -> dict:
    """Convert a Neo4j relationship to a JSON-friendly dict."""
    return {
        "source": node_id(neo4j_rel.start_node),
        "target": node_id(neo4j_rel.end_node),
        "type": neo4j_rel.type,
    }


def main():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    results = []

    with driver.session() as session:
        for i, q in enumerate(QUERIES):
            print(f"  [{i+1}/{len(QUERIES)}] {q['title'][:60]}...", end=" ", flush=True)
            try:
                graph = run_query_to_graph(session, q["graph_query"])
                table = run_query_to_table(session, q["table_query"])
                results.append({
                    "id": q["id"],
                    "title": q["title"],
                    "description": q["description"],
                    "category": q["category"],
                    "icon": q["icon"],
                    "graph": graph,
                    "table": table,
                    "columns": list(table[0].keys()) if table else [],
                    "nodeCount": len(graph["nodes"]),
                    "linkCount": len(graph["links"]),
                    "rowCount": len(table),
                })
                print(f"OK ({len(graph['nodes'])} nodes, {len(table)} rows)")
            except Exception as e:
                print(f"ERROR: {e}")
                results.append({
                    "id": q["id"],
                    "title": q["title"],
                    "description": q["description"],
                    "category": q["category"],
                    "icon": q["icon"],
                    "graph": {"nodes": [], "links": []},
                    "table": [],
                    "columns": [],
                    "nodeCount": 0,
                    "linkCount": 0,
                    "rowCount": 0,
                    "error": str(e),
                })

    driver.close()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(results, f, separators=(",", ":"))
    size_kb = OUT.stat().st_size / 1024
    print(f"\n  Exported {len(results)} queries → {OUT}")
    print(f"  File size: {size_kb:.1f} KB")


if __name__ == "__main__":
    print(f"\n  Exporting {len(QUERIES)} analytical queries...")
    main()
    print("  Done.\n")
