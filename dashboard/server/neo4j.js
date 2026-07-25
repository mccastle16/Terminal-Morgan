// ── Neo4j live data layer ───────────────────────────────────────────────────
// Serves the same shapes the dashboard used to read from static exports:
//   getBusinesses() → rows keyed by the master-CSV column names (drop-in for
//                     union_all_businesses.csv)
//   getGraph()      → { nodes, links } identical to graph_data.json
//   getGraphStats() → identical to graph_stats.json
// Cypher mirrors data/etl/export_graph.py so live == exported output.

import neo4j from 'neo4j-driver'

const URI = process.env.NEO4J_URI || 'bolt://localhost:7687'
const USER = process.env.NEO4J_USER || 'neo4j'
const PASS = process.env.NEO4J_PASSWORD || 'cgcc2024graph'

let driver = null

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASS), {
      // Return Neo4j integers as plain JS numbers (counts, degrees).
      disableLosslessIntegers: true,
    })
  }
  return driver
}

export async function verifyConnectivity() {
  await getDriver().verifyConnectivity()
  return true
}

export async function closeDriver() {
  if (driver) {
    await driver.close()
    driver = null
  }
}

// The dashboard's data context / scoring engine were written against the CSV,
// where every cell is a string. Neo4j returns native types, so booleans like
// chamber_member / red_flag_present arrive as true/false and blow up string
// calls (e.g. `.trim()`, `.toUpperCase()`) downstream. Coerce them back to the
// 'Y'/'N' the CSV used. Passes existing strings/blanks through untouched.
function toYN(v) {
  if (typeof v === 'boolean') return v ? 'Y' : 'N'
  return v ?? ''
}

// ── Businesses ────────────────────────────────────────────────────────────────
// Aliases Neo4j property names to the master-CSV column names the dashboard's
// data context and scoring engine expect, so nothing downstream changes.
export async function getBusinesses() {
  const session = getDriver().session()
  try {
    const result = await session.run(`
      MATCH (b:Business)
      RETURN b
      ORDER BY b.name
    `)
    return result.records.map(rec => {
      const p = rec.get('b').properties
      return {
        ...p,
        business_id: p.business_id ?? '',
        business_name: p.name ?? '',
        contact_name: p.contact_name ?? '',
        phone: p.phone ?? '',
        website: p.website ?? '',
        website_verified: p.website_verified ?? '',
        address: p.address ?? '',
        lat: p.lat ?? '',
        lon: p.lon ?? '',
        postcode: p.postcode ?? '',
        neighborhood_area: p.neighborhood ?? '',
        category_primary: p.category_primary ?? '',
        category_secondary: p.category_secondary ?? '',
        price_tier: p.price_tier ?? '',
        rating_primary_value: p.rating ?? '',
        rating_primary_source: p.rating_source ?? '',
        rating_primary_review_count: p.review_count ?? '',
        osint_confidence: p.osint_confidence ?? '',
        validation_tier: p.validation_tier ?? '',
        red_flag_present: toYN(p.red_flag_present),
        red_flag_severity: p.red_flag_severity ?? '',
        red_flag_notes: p.red_flag_notes ?? '',
        chamber_member: toYN(p.chamber_member),
        source_file: p.source_file ?? '',
        corroboration_count: p.corroboration_count ?? '',
        corroboration_sources: p.corroboration_sources ?? '',
        sunbiz_status: p.sunbiz_status ?? '',
        sunbiz_name: p.sunbiz_name ?? '',
        top_delights: p.top_delights ?? '',
        top_pain_points: p.top_pain_points ?? '',
        pkp_node_type: p.node_type ?? '',
      }
    })
  } finally {
    await session.close()
  }
}

// ── Graph (nodes + links) ───────────────────────────────────────────────────
// Ported 1:1 from export_graph.py so the Graph Explorer sees identical data.
export async function getGraph(limit = 0) {
  const session = getDriver().session()
  try {
    const graph = { nodes: [], links: [] }
    const bizIds = new Set()

    const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : ''
    const biz = await session.run(`
      MATCH (b:Business)
      OPTIONAL MATCH (b)-[r]-()
      WITH b, count(r) AS deg
      ORDER BY deg DESC
      ${limitClause}
      RETURN b.business_id AS id, b.name AS name, b.category_primary AS category,
             b.neighborhood AS neighborhood, b.node_type AS node_type,
             b.rating AS rating, b.osint_confidence AS confidence,
             b.chamber_member AS member, b.red_flag_present AS red_flag,
             b.lat AS lat, b.lon AS lon, deg
    `)
    for (const rec of biz.records) {
      const id = rec.get('id')
      bizIds.add(id)
      graph.nodes.push({
        id,
        name: rec.get('name') || id,
        group: rec.get('node_type') || 'asset',
        category: rec.get('category') || 'other',
        neighborhood: rec.get('neighborhood') || 'Coral Gables',
        rating: rec.get('rating') || 0,
        confidence: rec.get('confidence') || 0,
        member: rec.get('member') || false,
        red_flag: rec.get('red_flag') || false,
        lat: rec.get('lat') || 0,
        lon: rec.get('lon') || 0,
        deg: rec.get('deg'),
        type: 'business',
      })
    }

    const cats = await session.run(`
      MATCH (c:Category)
      OPTIONAL MATCH (c)<-[:CLASSIFIED_AS]-(b:Business)
      RETURN c.slug AS id, c.display_name AS name, c.node_type AS node_type, count(b) AS size
    `)
    for (const rec of cats.records) {
      graph.nodes.push({
        id: `cat:${rec.get('id')}`,
        name: rec.get('name') || rec.get('id'),
        group: 'category',
        size: rec.get('size'),
        type: 'category',
      })
    }

    const hoods = await session.run(`
      MATCH (n:Neighborhood)
      OPTIONAL MATCH (n)<-[:LOCATED_IN]-(b:Business)
      RETURN n.name AS id, n.display_name AS name, count(b) AS size
    `)
    for (const rec of hoods.records) {
      graph.nodes.push({
        id: `hood:${rec.get('id')}`,
        name: rec.get('name') || rec.get('id'),
        group: 'neighborhood',
        size: rec.get('size'),
        type: 'neighborhood',
      })
    }

    const classified = await session.run(`
      MATCH (b:Business)-[:CLASSIFIED_AS]->(c:Category)
      RETURN b.business_id AS source, 'cat:' + c.slug AS target
    `)
    for (const rec of classified.records) {
      if (bizIds.has(rec.get('source'))) {
        graph.links.push({ source: rec.get('source'), target: rec.get('target'), type: 'CLASSIFIED_AS' })
      }
    }

    const located = await session.run(`
      MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood)
      RETURN b.business_id AS source, 'hood:' + n.name AS target
    `)
    for (const rec of located.records) {
      if (bizIds.has(rec.get('source'))) {
        graph.links.push({ source: rec.get('source'), target: rec.get('target'), type: 'LOCATED_IN' })
      }
    }

    const competes = await session.run(`
      MATCH (b1:Business)-[:COMPETES_WITH]->(b2:Business)
      RETURN b1.business_id AS source, b2.business_id AS target
    `)
    for (const rec of competes.records) {
      if (bizIds.has(rec.get('source')) && bizIds.has(rec.get('target'))) {
        graph.links.push({ source: rec.get('source'), target: rec.get('target'), type: 'COMPETES_WITH' })
      }
    }

    const near = await session.run(`
      MATCH (b1:Business)-[r:NEAR]->(b2:Business)
      RETURN b1.business_id AS source, b2.business_id AS target, r.distance_m AS dist
      ORDER BY r.distance_m ASC
      LIMIT 500
    `)
    for (const rec of near.records) {
      if (bizIds.has(rec.get('source')) && bizIds.has(rec.get('target'))) {
        graph.links.push({
          source: rec.get('source'), target: rec.get('target'),
          type: 'NEAR', distance: Math.round((rec.get('dist') || 0) * 10) / 10,
        })
      }
    }

    return graph
  } finally {
    await session.close()
  }
}

// ── Graph stats ───────────────────────────────────────────────────────────────
export async function getGraphStats() {
  const session = getDriver().session()
  try {
    const statsRec = (await session.run(`
      MATCH (b:Business) WITH count(b) AS biz
      OPTIONAL MATCH ()-[r]->() WITH biz, count(r) AS edges
      RETURN biz, edges
    `)).records[0]

    const pkp = await session.run(`
      MATCH (b:Business) RETURN b.node_type AS type, count(*) AS cnt ORDER BY cnt DESC
    `)
    const pkpDist = {}
    for (const rec of pkp.records) pkpDist[rec.get('type')] = rec.get('cnt')

    const cat = await session.run(`
      MATCH (c:Category)<-[:CLASSIFIED_AS]-(b:Business)
      RETURN c.display_name AS cat, count(b) AS cnt ORDER BY cnt DESC
    `)
    const catDist = {}
    for (const rec of cat.records) catDist[rec.get('cat')] = rec.get('cnt')

    const hood = await session.run(`
      MATCH (n:Neighborhood)<-[:LOCATED_IN]-(b:Business)
      RETURN n.display_name AS hood, count(b) AS cnt ORDER BY cnt DESC
    `)
    const hoodDist = {}
    for (const rec of hood.records) hoodDist[rec.get('hood')] = rec.get('cnt')

    return {
      total_businesses: statsRec.get('biz'),
      total_edges: statsRec.get('edges'),
      pkp_distribution: pkpDist,
      category_distribution: catDist,
      neighborhood_distribution: hoodDist,
    }
  } finally {
    await session.close()
  }
}
