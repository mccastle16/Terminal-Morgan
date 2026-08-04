// ── Live analytics queries ──────────────────────────────────────────────────
// Ports data/etl/export_analytics.py to run its 19 pre-built graph/table query
// pairs live against Neo4j. Returns the exact array shape the Graph Analytics
// page previously read from public/data/analytics_queries.json, so the frontend
// is a drop-in swap from the static export to this endpoint.

import { getDriver } from './neo4j.js'

// ── Query definitions (1:1 with export_analytics.py QUERIES) ─────────────────
const QUERIES = [
  {
    id: 'top_competitors',
    title: 'Who has the most competitors?',
    description: 'Businesses ranked by number of competition edges — reveals the most contested market positions in Coral Gables.',
    category: 'Competitive Intel',
    icon: 'swords',
    graph_query: `
      MATCH (b:Business)-[r:COMPETES_WITH]-(rival:Business)
      WITH b, collect(DISTINCT rival) AS rivals, count(DISTINCT rival) AS cnt
      ORDER BY cnt DESC LIMIT 12
      UNWIND rivals[..8] AS rival
      RETURN b, rival
    `,
    table_query: `
      MATCH (b:Business)-[r:COMPETES_WITH]-()
      RETURN b.name AS business, b.category_primary AS category,
             b.neighborhood AS neighborhood, b.rating AS rating,
             count(r) AS competitors
      ORDER BY competitors DESC LIMIT 20
    `,
  },
  {
    id: 'competition_triangles',
    title: "Competition clusters — who's in a 3-way battle?",
    description: 'Triangles of businesses all competing with each other — the tightest competitive arenas.',
    category: 'Competitive Intel',
    icon: 'triangle',
    graph_query: `
      MATCH (a:Business)-[:COMPETES_WITH]->(b:Business)-[:COMPETES_WITH]->(c:Business)-[:COMPETES_WITH]->(a)
      WITH a, b, c LIMIT 10
      RETURN a, b, c
    `,
    table_query: `
      MATCH (a:Business)-[:COMPETES_WITH]->(b:Business)-[:COMPETES_WITH]->(c:Business)-[:COMPETES_WITH]->(a)
      RETURN a.name AS biz_1, b.name AS biz_2, c.name AS biz_3,
             a.category_primary AS category
      LIMIT 20
    `,
  },
  {
    id: 'neighborhood_competition',
    title: 'Which neighborhood is the most competitive?',
    description: 'Neighborhoods ranked by density of competition edges per business.',
    category: 'Competitive Intel',
    icon: 'flame',
    graph_query: `
      MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)-[c:COMPETES_WITH]->()
      WITH n, collect(DISTINCT b)[..15] AS biz
      UNWIND biz AS b
      OPTIONAL MATCH (b)-[r:COMPETES_WITH]->(rival)
      WHERE rival IN biz
      RETURN n, b, rival
    `,
    table_query: `
      MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)-[c:COMPETES_WITH]->()
      RETURN n.display_name AS neighborhood, count(DISTINCT b) AS businesses,
             count(c) AS competition_edges,
             round(toFloat(count(c)) / count(DISTINCT b), 1) AS edges_per_biz
      ORDER BY competition_edges DESC
    `,
  },
  {
    id: 'colocation_clusters',
    title: 'Who shares the same block? (within 50m)',
    description: 'Businesses physically co-located — potential for foot-traffic sharing, cross-promotions, or conflict.',
    category: 'Location & Proximity',
    icon: 'map-pin',
    graph_query: `
      MATCH (a:Business)-[r:NEAR]->(b:Business)
      WHERE r.distance_m < 50
      WITH a, b, r ORDER BY r.distance_m LIMIT 30
      RETURN a, b
    `,
    table_query: `
      MATCH (a:Business)-[r:NEAR]->(b:Business)
      WHERE r.distance_m < 50
      RETURN a.name AS business_1, b.name AS business_2,
             round(r.distance_m, 1) AS meters_apart,
             a.category_primary AS cat_1, b.category_primary AS cat_2
      ORDER BY r.distance_m LIMIT 20
    `,
  },
  {
    id: 'neighborhood_density',
    title: 'Business density by neighborhood',
    description: 'Which neighborhoods are business-dense, with average ratings and chamber membership rates.',
    category: 'Location & Proximity',
    icon: 'layers',
    graph_query: `
      MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
      WITH n, collect(b)[..20] AS biz
      UNWIND biz AS b
      RETURN n, b
    `,
    table_query: `
      MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
      RETURN n.display_name AS neighborhood, count(b) AS businesses,
             round(avg(b.rating), 2) AS avg_rating,
             sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members,
             round(toFloat(sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END)) / count(b) * 100, 1) AS member_pct
      ORDER BY businesses DESC
    `,
  },
  {
    id: 'pkp_breakdown',
    title: 'Infrastructure vs Platform vs Asset — the PKP map',
    description: 'How the Coral Gables business ecosystem breaks down by Portable Knowledge Protocol classification.',
    category: 'PKP Analysis',
    icon: 'network',
    graph_query: `
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
      WITH c, b.node_type AS ntype, collect(b)[..5] AS sample
      UNWIND sample AS b
      RETURN c, b
    `,
    table_query: `
      MATCH (b:Business)
      RETURN b.node_type AS pkp_type, count(*) AS count,
             round(avg(b.rating), 2) AS avg_rating,
             round(avg(b.osint_confidence), 3) AS avg_confidence,
             sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
      ORDER BY count DESC
    `,
  },
  {
    id: 'infrastructure_backbone',
    title: 'The backbone — most connected infrastructure nodes',
    description: 'Infrastructure businesses are the utilities, banks, and services everything depends on. These are the most connected.',
    category: 'PKP Analysis',
    icon: 'building',
    graph_query: `
      MATCH (b:Business {node_type: 'infrastructure'})-[r]-()
      WITH b, count(r) AS deg ORDER BY deg DESC LIMIT 10
      MATCH (b)-[r2:COMPETES_WITH|CLASSIFIED_AS|LOCATED_IN]-(n)
      RETURN b, r2, n
    `,
    table_query: `
      MATCH (b:Business {node_type: 'infrastructure'})-[r]-()
      RETURN b.name AS business, b.category_primary AS category,
             b.neighborhood AS neighborhood, count(r) AS connections, b.rating AS rating
      ORDER BY connections DESC LIMIT 15
    `,
  },
  {
    id: 'platform_hubs',
    title: 'Platform businesses — potential ecosystem hubs',
    description: 'Platforms (restaurants, hotels, retail) with high connectivity could become partnership hubs or event venues.',
    category: 'PKP Analysis',
    icon: 'hub',
    graph_query: `
      MATCH (b:Business {node_type: 'platform'})-[r:COMPETES_WITH|NEAR]-(other)
      WITH b, count(r) AS reach ORDER BY reach DESC LIMIT 8
      MATCH (b)-[r2:COMPETES_WITH]-(rival:Business)
      WITH b, collect(rival)[..6] AS rivals
      UNWIND rivals AS rival
      RETURN b, rival
    `,
    table_query: `
      MATCH (b:Business {node_type: 'platform'})-[r:COMPETES_WITH|NEAR]-()
      WITH b, count(r) AS reach
      WHERE reach > 15
      RETURN b.name AS business, reach, b.category_primary AS category,
             b.neighborhood AS neighborhood, b.rating AS rating
      ORDER BY reach DESC LIMIT 15
    `,
  },
  {
    id: 'risk_hotspots',
    title: 'Risk hotspots — red flags by neighborhood',
    description: 'Where are flagged businesses concentrated? Neighborhoods with clustering risk signals.',
    category: 'Risk & Quality',
    icon: 'alert-triangle',
    graph_query: `
      MATCH (b:Business {red_flag_present: true})-[:LOCATED_IN]->(n:Neighborhood)
      OPTIONAL MATCH (b)-[r:NEAR]->(neighbor:Business)
      WHERE r.distance_m < 100
      WITH n, b, collect(neighbor)[..3] AS nearby
      UNWIND nearby + [b] AS node
      RETURN DISTINCT n, node
    `,
    table_query: `
      MATCH (b:Business {red_flag_present: true})-[:LOCATED_IN]->(n:Neighborhood)
      RETURN n.display_name AS neighborhood, count(b) AS flagged,
             collect(b.name)[..5] AS examples
      ORDER BY flagged DESC
    `,
  },
  {
    id: 'low_confidence',
    title: 'Which businesses need re-validation?',
    description: 'Low OSINT confidence scores indicate sparse or conflicting source data. These need another pass.',
    category: 'Risk & Quality',
    icon: 'shield-question',
    graph_query: `
      MATCH (b:Business)-[:SOURCED_FROM]->(s:SourceFamily)
      WHERE b.osint_confidence < 0.3 AND b.osint_confidence > 0
      WITH b, collect(s) AS sources
      UNWIND sources AS s
      RETURN b, s
    `,
    table_query: `
      MATCH (b:Business)
      WHERE b.osint_confidence < 0.3 AND b.osint_confidence > 0
      RETURN b.name AS business, round(b.osint_confidence, 3) AS confidence,
             b.validation_tier AS tier, b.source_file AS source,
             b.category_primary AS category
      ORDER BY b.osint_confidence ASC LIMIT 20
    `,
  },
  {
    id: 'recruit_targets',
    title: 'Top recruitment targets — high-rated non-members',
    description: 'Successful businesses not yet in the Chamber. The best prospects for membership outreach.',
    category: 'Chamber Membership',
    icon: 'user-plus',
    graph_query: `
      MATCH (b:Business)
      WHERE b.chamber_member = false AND b.rating >= 4.5
      WITH b ORDER BY b.review_count DESC LIMIT 15
      MATCH (b)-[:CLASSIFIED_AS]->(c:Category)
      OPTIONAL MATCH (b)-[:LOCATED_IN]->(n:Neighborhood)
      RETURN b, c, n
    `,
    table_query: `
      MATCH (b:Business)
      WHERE b.chamber_member = false AND b.rating >= 4.5
      RETURN b.name AS business, b.rating AS rating,
             b.review_count AS reviews, b.category_primary AS category,
             b.neighborhood AS neighborhood
      ORDER BY b.review_count DESC LIMIT 20
    `,
  },
  {
    id: 'warm_intros',
    title: 'Warm introductions — non-members next to members',
    description: 'Non-members physically close to existing members. The member could make a personal introduction.',
    category: 'Chamber Membership',
    icon: 'handshake',
    graph_query: `
      MATCH (m:Business {chamber_member: true})-[r:NEAR]->(p:Business {chamber_member: false})
      WHERE r.distance_m < 100
      WITH m, p, r ORDER BY r.distance_m LIMIT 20
      RETURN m, p
    `,
    table_query: `
      MATCH (m:Business {chamber_member: true})-[r:NEAR]->(p:Business {chamber_member: false})
      WHERE r.distance_m < 100
      RETURN p.name AS prospect, p.category_primary AS category, p.rating AS rating,
             m.name AS referring_member, round(r.distance_m) AS meters_away
      ORDER BY r.distance_m LIMIT 20
    `,
  },
  {
    id: 'category_gaps',
    title: 'Category gaps — where is CGCC under-represented?',
    description: 'Categories where the Chamber has low membership penetration — strategic growth opportunities.',
    category: 'Chamber Membership',
    icon: 'pie-chart',
    graph_query: `
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
      WITH c, count(b) AS total,
           sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
      WHERE total > 10
      WITH c, total, members ORDER BY toFloat(members)/total ASC LIMIT 8
      MATCH (c)<-[:CLASSIFIED_AS]-(b:Business)
      WITH c, collect(b)[..10] AS sample
      UNWIND sample AS b
      RETURN c, b
    `,
    table_query: `
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
      WITH c.display_name AS category, count(b) AS total,
           sum(CASE WHEN b.chamber_member THEN 1 ELSE 0 END) AS members
      RETURN category, total, members,
             round(toFloat(members) / total * 100, 1) AS member_pct
      ORDER BY member_pct ASC
    `,
  },
  {
    id: 'market_forces',
    title: 'What market forces shape each category?',
    description: 'Undercurrents and external pressures mapped to business categories — the forces behind the numbers.',
    category: 'Supply Chain & Forces',
    icon: 'wind',
    graph_query: `
      MATCH (c:Category)-[r:AFFECTED_BY]->(m:MarketForce)
      RETURN c, r, m
    `,
    table_query: `
      MATCH (c:Category)-[:AFFECTED_BY]->(m:MarketForce)
      RETURN c.display_name AS category, collect(m.name) AS market_forces
      ORDER BY category
    `,
  },
  {
    id: 'picks_shovels',
    title: 'Picks & shovels — who supplies the ecosystem?',
    description: 'Supplier services that multiple categories depend on — the infrastructure behind the infrastructure.',
    category: 'Supply Chain & Forces',
    icon: 'wrench',
    graph_query: `
      MATCH (c:Category)-[r:SUPPLIED_BY]->(s:Supplier)
      RETURN c, r, s
    `,
    table_query: `
      MATCH (c:Category)-[:SUPPLIED_BY]->(s:Supplier)
      RETURN s.name AS supplier, count(c) AS categories_served,
             collect(c.display_name) AS categories
      ORDER BY categories_served DESC
    `,
  },
  {
    id: 'best_corroborated',
    title: 'Best-verified businesses (multi-source corroboration)',
    description: 'Businesses confirmed by 3+ independent sources — highest data confidence.',
    category: 'Data Intelligence',
    icon: 'shield-check',
    graph_query: `
      MATCH (b:Business)-[r:CORROBORATED_BY]->(s:SourceFamily)
      WITH b, collect(s) AS sources, count(s) AS cnt
      WHERE cnt >= 3
      ORDER BY cnt DESC LIMIT 10
      UNWIND sources AS s
      RETURN b, s
    `,
    table_query: `
      MATCH (b:Business)-[r:CORROBORATED_BY]->()
      WITH b, count(r) AS sources
      WHERE sources >= 3
      RETURN b.name AS business, sources, b.corroboration_sources AS source_list,
             round(b.osint_confidence, 3) AS confidence
      ORDER BY sources DESC LIMIT 15
    `,
  },
  {
    id: 'single_source',
    title: 'Single-source businesses — need more validation',
    description: 'Only verified by one data source. These need additional scraping passes for confidence.',
    category: 'Data Intelligence',
    icon: 'alert-circle',
    graph_query: `
      MATCH (b:Business)-[r:SOURCED_FROM]->(s:SourceFamily)
      WITH b, collect(s) AS sources, count(s) AS cnt
      WHERE cnt = 1
      ORDER BY b.osint_confidence ASC LIMIT 15
      UNWIND sources AS s
      RETURN b, s
    `,
    table_query: `
      MATCH (b:Business)-[r:SOURCED_FROM]->(s:SourceFamily)
      WITH b, count(r) AS source_count, collect(s.display_name) AS sources
      WHERE source_count = 1
      RETURN b.name AS business, sources[0] AS only_source,
             round(b.osint_confidence, 3) AS confidence, b.category_primary AS category
      ORDER BY b.osint_confidence ASC LIMIT 20
    `,
  },
  {
    id: 'most_connected',
    title: 'The 10 most connected nodes in the entire graph',
    description: 'Hub businesses with the highest total edge count — they touch everything.',
    category: 'Graph Traversal',
    icon: 'git-merge',
    graph_query: `
      MATCH (b:Business)-[r]-()
      WITH b, count(r) AS deg ORDER BY deg DESC LIMIT 10
      MATCH (b)-[r2:CLASSIFIED_AS|LOCATED_IN|COMPETES_WITH]-(n)
      WITH b, r2, n LIMIT 80
      RETURN b, r2, n
    `,
    table_query: `
      MATCH (b:Business)-[r]-()
      RETURN b.name AS business, b.node_type AS pkp_type,
             b.category_primary AS category, b.neighborhood AS neighborhood,
             count(r) AS total_connections
      ORDER BY total_connections DESC LIMIT 15
    `,
  },
  {
    id: 'category_ecosystem',
    title: 'Full ecosystem map — categories as hubs',
    description: 'See how businesses cluster around their categories, with neighborhoods as anchors.',
    category: 'Graph Traversal',
    icon: 'orbit',
    graph_query: `
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)-[:LOCATED_IN]->(n:Neighborhood)
      WITH c, n, collect(b)[..5] AS sample
      UNWIND sample AS b
      RETURN c, b, n
    `,
    table_query: `
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
      RETURN c.display_name AS category, count(b) AS businesses,
             round(avg(b.rating), 2) AS avg_rating,
             sum(CASE WHEN b.red_flag_present THEN 1 ELSE 0 END) AS red_flags
      ORDER BY businesses DESC
    `,
  },
]

// ── Neo4j value helpers (mirror export_analytics.py) ─────────────────────────
const isNode = (v) => v && Array.isArray(v.labels) && v.properties !== undefined
const isRel = (v) => v && typeof v.type === 'string' && v.start !== undefined && v.properties !== undefined
const isPath = (v) => v && Array.isArray(v.segments)

function nodeId(node) {
  const labels = node.labels
  const p = node.properties
  if (labels.includes('Business')) return p.business_id ?? node.elementId
  if (labels.includes('Category')) return `cat:${p.slug ?? ''}`
  if (labels.includes('Neighborhood')) return `hood:${p.name ?? ''}`
  if (labels.includes('SourceFamily')) return `src:${p.name ?? ''}`
  if (labels.includes('MarketForce')) return `mf:${p.name ?? ''}`
  if (labels.includes('Supplier')) return `sup:${p.name ?? ''}`
  return node.elementId
}

function nodeToDict(node) {
  const labels = node.labels
  const p = node.properties
  const id = nodeId(node)
  if (labels.includes('Business')) {
    return {
      id, name: p.name ?? id, group: p.node_type ?? 'asset', type: 'business',
      category: p.category_primary ?? '', neighborhood: p.neighborhood ?? '',
      rating: p.rating ?? 0, member: p.chamber_member ?? false, red_flag: p.red_flag_present ?? false,
    }
  }
  if (labels.includes('Category')) return { id, name: p.display_name ?? p.slug ?? '', group: 'category', type: 'category' }
  if (labels.includes('Neighborhood')) return { id, name: p.display_name ?? p.name ?? '', group: 'neighborhood', type: 'neighborhood' }
  if (labels.includes('SourceFamily')) return { id, name: p.display_name ?? p.name ?? '', group: 'source', type: 'source' }
  if (labels.includes('MarketForce')) return { id, name: p.name ?? '', group: 'marketforce', type: 'marketforce' }
  if (labels.includes('Supplier')) return { id, name: p.name ?? '', group: 'supplier', type: 'supplier' }
  return { id, name: JSON.stringify(p), group: 'other', type: labels[0]?.toLowerCase() ?? 'unknown' }
}

// Build { nodes, links } from a query result. Unlike the Python driver, the JS
// driver's relationships only expose endpoint element-ids (not node objects), so
// we resolve source/target via an elementId→nid map built from the nodes seen.
function buildGraph(records) {
  const nodesMap = new Map()   // nid → node dict
  const elemToNid = new Map()  // node.elementId → nid
  const rawRels = []
  const perRecordNodeNids = []

  const addNode = (node) => {
    const nid = nodeId(node)
    if (!nodesMap.has(nid)) nodesMap.set(nid, nodeToDict(node))
    elemToNid.set(node.elementId, nid)
    return nid
  }

  for (const record of records) {
    const nidsInRecord = []
    for (const value of record.values ? record.values() : Object.values(record)) {
      if (value == null) continue
      if (isNode(value)) {
        nidsInRecord.push(addNode(value))
      } else if (isRel(value)) {
        rawRels.push(value)
      } else if (isPath(value)) {
        for (const seg of value.segments) {
          addNode(seg.start); addNode(seg.end)
          rawRels.push(seg.relationship)
        }
      }
    }
    perRecordNodeNids.push(nidsInRecord)
  }

  const links = []
  for (const rel of rawRels) {
    const source = elemToNid.get(rel.startNodeElementId)
    const target = elemToNid.get(rel.endNodeElementId)
    if (source && target) links.push({ source, target, type: rel.type })
  }

  // Queries that return node pairs without explicit relationships: infer edges
  // by pairing consecutive nodes within each record (matches the Python fallback).
  if (links.length === 0 && nodesMap.size > 1) {
    for (const nids of perRecordNodeNids) {
      for (let i = 0; i < nids.length - 1; i++) {
        links.push({ source: nids[i], target: nids[i + 1], type: 'RELATED' })
      }
    }
  }

  return { nodes: [...nodesMap.values()], links }
}

function buildTable(records) {
  return records.map(record => {
    const row = {}
    for (const key of record.keys) {
      let val = record.get(key)
      if (Array.isArray(val)) {
        val = val.slice(0, 8).map(v => String(v)).join(', ')
      } else if (val == null) {
        val = ''
      } else if (typeof val === 'number') {
        if (!Number.isInteger(val)) val = Math.round(val * 1000) / 1000
      } else if (typeof val !== 'boolean') {
        val = String(val)
      }
      row[key] = val
    }
    return row
  })
}

// Runs all 19 query pairs live and returns the array the Graph Analytics page
// expects. Individual query failures degrade to an empty result with an error
// field, exactly like the Python exporter's per-query try/except.
export async function getAnalyticsQueries() {
  const session = getDriver().session()
  try {
    const results = []
    for (const q of QUERIES) {
      const meta = { id: q.id, title: q.title, description: q.description, category: q.category, icon: q.icon }
      try {
        const graphRes = await session.run(q.graph_query)
        const tableRes = await session.run(q.table_query)
        const graph = buildGraph(graphRes.records)
        const table = buildTable(tableRes.records)
        results.push({
          ...meta, graph, table,
          columns: table.length ? Object.keys(table[0]) : [],
          nodeCount: graph.nodes.length,
          linkCount: graph.links.length,
          rowCount: table.length,
        })
      } catch (err) {
        results.push({
          ...meta, graph: { nodes: [], links: [] }, table: [],
          columns: [], nodeCount: 0, linkCount: 0, rowCount: 0, error: err.message,
        })
      }
    }
    return results
  } finally {
    await session.close()
  }
}
