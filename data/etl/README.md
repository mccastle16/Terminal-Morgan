# ETL — Knowledge Graph

Transforms the flat `master_all_businesses.csv` into a Neo4j property graph.

## Quick Start

```bash
# 1. Start Neo4j
cd data/etl
docker compose up -d

# 2. Wait ~30s for Neo4j to initialize, then run the loader
pip install neo4j pandas
python loader.py

# 3. Open Neo4j Browser
open http://localhost:7474
# Login: neo4j / cgcc2024graph
```

## Architecture

```
data/master_all_businesses.csv   ──Extract──▶  pandas DataFrame
dashboard/public/data/action_playbook.json       │
                                            ──Transform──▶  Nodes + Edges
                                                  │
                                            ───Load───▶  Neo4j (Docker)
```

### ETL Steps

| Step | What | Details |
|------|------|---------|
| **Extract** | Read master CSV + playbook JSON | 2,868 records, 36 columns |
| **Transform** | Convert rows → graph entities | 8 node types, 10 edge types |
| **Load** | Batch-write to Neo4j via Bolt | UNWIND batches of 500 |

## Graph Schema

### Nodes (8 types)

| Label | Count | Key Property | Source |
|-------|-------|-------------|--------|
| `:Business` | ~2,868 | `business_id` | master CSV |
| `:Category` | 22 | `slug` | PKP taxonomy |
| `:Neighborhood` | 9 | `name` | geo-inference |
| `:ZipCode` | 4 | `code` | 33134/33146/33133/33143 |
| `:SourceFamily` | 6 | `name` | google/osm/cgcc/etc. |
| `:MarketForce` | ~25 | `name` | PKP undercurrents |
| `:Supplier` | ~40 | `name` | PKP picks & shovels |
| `:ActionItem` | ~30 | `action_id` | Agent 4 playbook |

### Edges (10 relationship types)

| Relationship | Pattern | Description |
|---|---|---|
| `CLASSIFIED_AS` | Business → Category | Primary category assignment |
| `LOCATED_IN` | Business → Neighborhood | Geographic zone |
| `IN_ZIPCODE` | Business → ZipCode | ZIP assignment |
| `SOURCED_FROM` | Business → SourceFamily | Original data source |
| `CORROBORATED_BY` | Business → SourceFamily | Cross-source verification |
| `NEAR` | Business → Business | Within 200m (distance_m property) |
| `COMPETES_WITH` | Business → Business | Same category + neighborhood |
| `SUPPLIED_BY` | Category → Supplier | Enabling infrastructure |
| `AFFECTED_BY` | Category → MarketForce | Market undercurrents |
| `HAS_ACTION` | Business → ActionItem | Agent 4 recommendations |

## Usage

```bash
# Full rebuild (wipe + reload)
python loader.py

# Incremental (merge, don't wipe)
python loader.py --incremental

# Dry run (validate, no writes)
python loader.py --dry-run

# Skip expensive edge computation
python loader.py --skip-proximity --skip-competition

# Custom Neo4j credentials
python loader.py --uri bolt://remote:7687 --user neo4j --password secret

# Custom data paths
python loader.py --master ../../data/master_all_businesses.csv
```

## Example Cypher Queries

```cypher
-- Find competitors of a specific business
MATCH (b:Business {name: "Luca Osteria"})-[:COMPETES_WITH]-(comp)
RETURN comp.name, comp.rating, comp.review_count
ORDER BY comp.rating DESC

-- Businesses near a location
MATCH (b:Business {name: "Bulla Gastrobar"})-[r:NEAR]-(neighbor)
RETURN neighbor.name, r.distance_m, neighbor.category_primary
ORDER BY r.distance_m

-- Category ecosystem: what supplies food & beverage?
MATCH (c:Category {slug: "food_beverage"})-[:SUPPLIED_BY]->(s)
RETURN s.name

-- Market forces affecting a category
MATCH (c:Category {slug: "real_estate"})-[:AFFECTED_BY]->(m)
RETURN m.name

-- Top-rated businesses by neighborhood
MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood {name: "Miracle Mile"})
WHERE b.rating > 0
RETURN b.name, b.category_primary, b.rating, b.review_count
ORDER BY b.rating DESC LIMIT 20

-- Find all red-flagged businesses and their actions
MATCH (b:Business {red_flag_present: true})-[:HAS_ACTION]->(a:ActionItem)
RETURN b.name, b.red_flag_severity, a.title, a.priority

-- Shortest path between two businesses  
MATCH path = shortestPath(
  (a:Business {name: "Amerant Bank"})-[*]-(b:Business {name: "Luca Osteria"})
)
RETURN path

-- Community: all businesses in Alhambra financial cluster
MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood {name: "Alhambra Circle"})
MATCH (b)-[:CLASSIFIED_AS]->(c:Category)
WHERE c.node_type = "infrastructure"
RETURN b.name, c.slug, b.rating
```

## Docker Management

```bash
docker compose up -d          # Start Neo4j
docker compose stop           # Stop (keep data)
docker compose down           # Stop + remove container
docker compose down -v        # Stop + delete all data
docker compose logs neo4j     # View logs
```

## File Structure

```
data/etl/
├── docker-compose.yml    # Neo4j container config
├── loader.py             # ETL script (Extract → Transform → Load)
├── README.md             # This file
└── import/               # CSV drop zone (for LOAD CSV if needed)
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt endpoint |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `cgcc2024graph` | Neo4j password |
