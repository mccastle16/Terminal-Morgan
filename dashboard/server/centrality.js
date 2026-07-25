// ── Live network centrality ─────────────────────────────────────────────────
// Replaces the offline scripts/15. network_centrality.py. Loads the graph
// (businesses + categories + neighborhoods, edges mirroring export_graph.py incl.
// its 500 closest-NEAR cap) from Neo4j and computes centrality with graphology:
// PageRank, betweenness, and
// Louvain community detection, plus degree/clustering computed inline (they are
// trivial and let us keep degree_by_type + the composite influence blend).
//
// Output matches public/data/network_centrality.json so the Intelligence page's
// Network tab is a drop-in swap. Results are cached briefly since the graph
// changes rarely and betweenness is the most expensive step.

import Graph from 'graphology'
import pagerank from 'graphology-metrics/centrality/pagerank.js'
import betweenness from 'graphology-metrics/centrality/betweenness.js'
import louvain from 'graphology-communities-louvain'
import { getDriver } from './neo4j.js'

const round = (v, d = 4) => { const f = 10 ** d; return Math.round((v || 0) * f) / f }

// Load the graph for centrality. Mirrors export_graph.py node/edge conventions,
// including its 500 closest-NEAR cap, so the numbers stay comparable to the
// export the dashboard has always shown.
async function loadFullGraph(session) {
  const nodes = []
  const links = []
  const bizIds = new Set()

  const biz = await session.run(`
    MATCH (b:Business)
    RETURN b.business_id AS id, b.name AS name, b.category_primary AS category,
           b.neighborhood AS neighborhood, b.chamber_member AS member
  `)
  for (const rec of biz.records) {
    const id = rec.get('id')
    if (!id) continue
    bizIds.add(id)
    nodes.push({
      id, name: rec.get('name') || id, type: 'business',
      category: rec.get('category') || '', neighborhood: rec.get('neighborhood') || 'Coral Gables',
      member: rec.get('member') || false,
    })
  }

  const cats = await session.run(`
    MATCH (c:Category) RETURN c.slug AS id, c.display_name AS name
  `)
  for (const rec of cats.records) {
    nodes.push({ id: `cat:${rec.get('id')}`, name: rec.get('name') || rec.get('id'), type: 'category', category: '', neighborhood: '', member: false })
  }

  const hoods = await session.run(`
    MATCH (n:Neighborhood) RETURN n.name AS id, n.display_name AS name
  `)
  for (const rec of hoods.records) {
    nodes.push({ id: `hood:${rec.get('id')}`, name: rec.get('name') || rec.get('id'), type: 'neighborhood', category: '', neighborhood: '', member: false })
  }

  const nodeIds = new Set(nodes.map(n => n.id))

  const classified = await session.run(`
    MATCH (b:Business)-[:CLASSIFIED_AS]->(c:Category)
    RETURN b.business_id AS source, 'cat:' + c.slug AS target
  `)
  for (const rec of classified.records) {
    if (bizIds.has(rec.get('source'))) links.push({ source: rec.get('source'), target: rec.get('target'), type: 'CLASSIFIED_AS' })
  }

  const located = await session.run(`
    MATCH (b:Business)-[:LOCATED_IN]->(n:Neighborhood)
    RETURN b.business_id AS source, 'hood:' + n.name AS target
  `)
  for (const rec of located.records) {
    if (bizIds.has(rec.get('source'))) links.push({ source: rec.get('source'), target: rec.get('target'), type: 'LOCATED_IN' })
  }

  const competes = await session.run(`
    MATCH (b1:Business)-[:COMPETES_WITH]->(b2:Business)
    RETURN b1.business_id AS source, b2.business_id AS target
  `)
  for (const rec of competes.records) {
    if (bizIds.has(rec.get('source')) && bizIds.has(rec.get('target'))) links.push({ source: rec.get('source'), target: rec.get('target'), type: 'COMPETES_WITH' })
  }

  // NEAR is capped at the 500 closest pairs, matching export_graph.py — the
  // graph the centrality script has always run on. Without the cap, dense
  // geographic proximity swamps the competitive/category structure.
  const near = await session.run(`
    MATCH (b1:Business)-[r:NEAR]->(b2:Business)
    RETURN b1.business_id AS source, b2.business_id AS target
    ORDER BY r.distance_m ASC
    LIMIT 500
  `)
  for (const rec of near.records) {
    if (bizIds.has(rec.get('source')) && bizIds.has(rec.get('target'))) links.push({ source: rec.get('source'), target: rec.get('target'), type: 'NEAR' })
  }

  // Guard against edges referencing nodes we didn't emit.
  const cleanLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target) && l.source !== l.target)
  return { nodes, links: cleanLinks }
}

function computeCentrality({ nodes, links }) {
  // ── Degree (directed sense) + by_type, computed inline like the script ──────
  const degree = {}, inDeg = {}, outDeg = {}, byType = {}
  const undirected = new Map() // id → Set(neighbors), for clustering
  for (const n of nodes) { degree[n.id] = 0; inDeg[n.id] = 0; outDeg[n.id] = 0; byType[n.id] = {}; undirected.set(n.id, new Set()) }
  for (const l of links) {
    degree[l.source]++; degree[l.target]++
    outDeg[l.source]++; inDeg[l.target]++
    byType[l.source][l.type] = (byType[l.source][l.type] || 0) + 1
    byType[l.target][l.type] = (byType[l.target][l.type] || 0) + 1
    undirected.get(l.source).add(l.target)
    undirected.get(l.target).add(l.source)
  }
  const maxDeg = Math.max(1, ...Object.values(degree))

  // ── Clustering coefficient (undirected) ─────────────────────────────────────
  const clustering = {}
  for (const n of nodes) {
    const nb = [...undirected.get(n.id)]
    const k = nb.length
    if (k < 2) { clustering[n.id] = 0; continue }
    let triangles = 0
    for (let i = 0; i < nb.length; i++) {
      for (let j = i + 1; j < nb.length; j++) {
        if (undirected.get(nb[i]).has(nb[j])) triangles++
      }
    }
    clustering[n.id] = round(2 * triangles / (k * (k - 1)))
  }

  // ── graphology graphs: directed for PageRank, undirected for the rest ───────
  const dg = new Graph({ type: 'directed', multi: false, allowSelfLoops: false })
  const ug = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false })
  for (const n of nodes) { dg.mergeNode(n.id); ug.mergeNode(n.id) }
  for (const l of links) {
    if (!dg.hasEdge(l.source, l.target)) dg.mergeEdge(l.source, l.target)
    if (!ug.hasEdge(l.source, l.target)) ug.mergeEdge(l.source, l.target)
  }

  const prRaw = pagerank(dg)
  const bcRaw = betweenness(ug, { normalized: true })
  const communitiesRaw = louvain(ug) // { id → communityLabel }

  // Max-normalize PageRank & betweenness so the influence blend keeps the same
  // scale as the original script (which divided by the max).
  const prMax = Math.max(1e-12, ...Object.values(prRaw))
  const bcMax = Math.max(1e-12, ...Object.values(bcRaw))

  // Renumber communities to contiguous ids ordered by size (largest = 0).
  const rawCounts = {}
  for (const lab of Object.values(communitiesRaw)) rawCounts[lab] = (rawCounts[lab] || 0) + 1
  const order = Object.keys(rawCounts).sort((a, b) => rawCounts[b] - rawCounts[a])
  const remap = Object.fromEntries(order.map((lab, i) => [lab, i]))

  const centrality = {}
  for (const n of nodes) {
    const c = {
      id: n.id, name: n.name, type: n.type,
      category: n.category, neighborhood: n.neighborhood, member: n.member,
      degree: degree[n.id], degree_norm: round(degree[n.id] / maxDeg),
      in_degree: inDeg[n.id], out_degree: outDeg[n.id],
      degree_by_type: byType[n.id],
      pagerank: round((prRaw[n.id] || 0) / prMax),
      betweenness: round((bcRaw[n.id] || 0) / bcMax),
      clustering: clustering[n.id],
      community: remap[communitiesRaw[n.id]] ?? 0,
    }
    c.influence_score = round(
      c.pagerank * 0.35 + c.betweenness * 0.30 + c.degree_norm * 0.25 + c.clustering * 0.10
    )
    centrality[n.id] = c
  }

  const communitySizes = {}
  for (const c of Object.values(centrality)) communitySizes[c.community] = (communitySizes[c.community] || 0) + 1
  const sortedSizes = Object.fromEntries(Object.entries(communitySizes).sort((a, b) => b[1] - a[1]))

  const all = Object.values(centrality)
  const businesses = all.filter(c => c.type === 'business')
  const stripByType = ({ degree_by_type, ...rest }) => rest // eslint-disable-line no-unused-vars

  return {
    generated_at: new Date().toISOString(),
    total_nodes: nodes.length,
    total_links: links.length,
    num_communities: Object.keys(communitySizes).length,
    community_sizes: sortedSizes,
    top_influencers: [...businesses].sort((a, b) => b.influence_score - a.influence_score).slice(0, 25).map(stripByType),
    bridge_nodes: [...businesses].sort((a, b) => b.betweenness - a.betweenness).slice(0, 15),
    hub_categories: all.filter(c => c.type === 'category').sort((a, b) => b.degree - a.degree),
    hub_neighborhoods: all.filter(c => c.type === 'neighborhood').sort((a, b) => b.degree - a.degree),
    nodes: centrality,
  }
}

// Cache: the graph changes rarely and betweenness is O(V·E). Serve a cached
// result for a short window so repeated page loads are instant.
let cache = null
let cacheTime = 0
const CACHE_MS = 5 * 60 * 1000

export async function getNetworkCentrality() {
  if (cache && Date.now() - cacheTime < CACHE_MS) return cache
  const session = getDriver().session()
  try {
    const graph = await loadFullGraph(session)
    cache = computeCentrality(graph)
    cacheTime = Date.now()
    return cache
  } finally {
    await session.close()
  }
}
