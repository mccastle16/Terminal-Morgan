#!/usr/bin/env python3
"""Quick verification queries against the knowledge graph."""
from neo4j import GraphDatabase

d = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "cgcc2024graph"))
with d.session() as s:
    # Top 5 most connected businesses
    r = s.run("""
        MATCH (b:Business)
        OPTIONAL MATCH (b)-[r]-()
        RETURN b.name AS name, b.node_type AS type, count(r) AS connections
        ORDER BY connections DESC LIMIT 5
    """)
    print("=== TOP 5 MOST CONNECTED BUSINESSES ===")
    for rec in r:
        print(f"  {rec['name']:40s} {str(rec['type']):15s} {rec['connections']} edges")

    # Category distribution
    r2 = s.run("""
        MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
        RETURN c.display_name AS category, count(b) AS count
        ORDER BY count DESC LIMIT 5
    """)
    print("\n=== TOP 5 CATEGORIES ===")
    for rec in r2:
        print(f"  {rec['category']:30s} {rec['count']} businesses")

    # Neighborhood stats
    r3 = s.run("""
        MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
        RETURN n.display_name AS hood, count(b) AS count
        ORDER BY count DESC
    """)
    print("\n=== NEIGHBORHOODS ===")
    for rec in r3:
        print(f"  {rec['hood']:30s} {rec['count']} businesses")

    # PKP node type distribution
    r4 = s.run("""
        MATCH (b:Business)
        RETURN b.node_type AS type, count(*) AS cnt
        ORDER BY cnt DESC
    """)
    print("\n=== PKP NODE TYPES ===")
    for rec in r4:
        print(f"  {str(rec['type']):20s} {rec['cnt']}")

    # Sample path query: Find businesses near a competitor
    r5 = s.run("""
        MATCH (b1:Business)-[:COMPETES_WITH]->(b2:Business)
        WHERE b1.node_type = 'platform'
        RETURN b1.name AS biz, b2.name AS competitor
        LIMIT 5
    """)
    print("\n=== SAMPLE COMPETITION PATHS (platform nodes) ===")
    for rec in r5:
        print(f"  {rec['biz']} --> COMPETES_WITH --> {rec['competitor']}")

d.close()
