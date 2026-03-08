import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  Share2, Search, X, ChevronDown, ChevronRight, ArrowLeft,
  Swords, Triangle, Flame, MapPin, Layers, Network, Building2,
  AlertTriangle, UserPlus, Handshake, PieChart,
  Wind, Wrench, ShieldCheck, AlertCircle, GitMerge,
  BarChart3, ZoomIn, ZoomOut, Maximize2, Eye,
} from 'lucide-react'

// ── Icon mapping ────────────────────────────────────────────────
const ICON_MAP = {
  swords: Swords, triangle: Triangle, flame: Flame, 'map-pin': MapPin,
  layers: Layers, network: Network, building: Building2,
  hub: Network, 'alert-triangle': AlertTriangle, 'shield-question': AlertCircle,
  'user-plus': UserPlus, handshake: Handshake, 'pie-chart': PieChart,
  wind: Wind, wrench: Wrench, 'shield-check': ShieldCheck,
  'alert-circle': AlertCircle, 'git-merge': GitMerge, orbit: Share2,
}

// ── Category colors ─────────────────────────────────────────────
const CAT_COLORS = {
  'Competitive Intel': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  'Location & Proximity': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  'PKP Analysis': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  'Risk & Quality': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  'Chamber Membership': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  'Supply Chain & Forces': { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', accent: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
  'Data Intelligence': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', accent: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
  'Graph Traversal': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', accent: 'bg-gray-600', badge: 'bg-gray-100 text-gray-700' },
}

// ── Node colors for graph ───────────────────────────────────────
const GROUP_COLORS = {
  infrastructure: '#D97706',
  platform: '#2563EB',
  asset: '#059669',
  category: '#7C3AED',
  neighborhood: '#DC2626',
  source: '#0891B2',
  marketforce: '#8B5CF6',
  supplier: '#F59E0B',
  other: '#6B7280',
}

// Table icon (inline since lucide may not have Table2)
function TableIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function GraphExplorerPage() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeQuery, setActiveQuery] = useState(null)
  const [viewMode, setViewMode] = useState('graph')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCats, setExpandedCats] = useState(new Set())
  const fgRef = useRef()
  const containerRef = useRef()
  const [dims, setDims] = useState({ width: 800, height: 500 })

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/data/analytics_queries.json')
      .then(r => r.json())
      .then(data => {
        setQueries(data)
        setExpandedCats(new Set(data.map(q => q.category)))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ── Responsive sizing ─────────────────────────────────────
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setDims({ width: e.contentRect.width, height: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [activeQuery])

  // ── Group queries by category ─────────────────────────────
  const grouped = useMemo(() => {
    const map = {}
    const q = searchQuery.toLowerCase()
    for (const query of queries) {
      if (q && !query.title.toLowerCase().includes(q) && !query.description.toLowerCase().includes(q) && !query.category.toLowerCase().includes(q)) continue
      if (!map[query.category]) map[query.category] = []
      map[query.category].push(query)
    }
    return map
  }, [queries, searchQuery])

  // ── Node paint ────────────────────────────────────────────
  const paintNode = useCallback((node, ctx, globalScale) => {
    const color = GROUP_COLORS[node.group] || '#6B7280'
    const r = node.type === 'business' ? 5 : 8
    const fontSize = Math.max(11 / globalScale, 2)

    ctx.beginPath()
    if (node.type === 'category') {
      ctx.moveTo(node.x, node.y - r); ctx.lineTo(node.x + r, node.y)
      ctx.lineTo(node.x, node.y + r); ctx.lineTo(node.x - r, node.y)
    } else if (node.type === 'neighborhood') {
      ctx.rect(node.x - r, node.y - r, r * 2, r * 2)
    } else {
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.9
    ctx.fill()
    ctx.globalAlpha = 1

    if (node.red_flag) {
      ctx.beginPath()
      ctx.arc(node.x + r * 0.7, node.y - r * 0.7, 2.5 / globalScale, 0, Math.PI * 2)
      ctx.fillStyle = '#EF4444'
      ctx.fill()
    }

    if (globalScale > 1.2 || node.type !== 'business') {
      const label = node.name || ''
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillRect(node.x - tw / 2 - 1, node.y + r + 1, tw + 2, fontSize + 2)
      ctx.fillStyle = '#374151'
      ctx.fillText(label, node.x, node.y + r + 2)
    }
  }, [])

  const paintLink = useCallback((link, ctx) => {
    ctx.strokeStyle = 'rgba(156,163,175,0.25)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(link.source.x, link.source.y)
    ctx.lineTo(link.target.x, link.target.y)
    ctx.stroke()
  }, [])

  // ── Zoom helpers ──────────────────────────────────────────
  const zoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.5, 300)
  const zoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.5, 300)
  const zoomFit = () => fgRef.current?.zoomToFit(400, 40)

  // ── Toggle category ───────────────────────────────────────
  const toggleCat = (cat) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Share2 className="w-12 h-12 text-cgcc-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE QUERY VIEW — graph/table result
  // ═══════════════════════════════════════════════════════════
  if (activeQuery) {
    const q = activeQuery
    const catStyle = CAT_COLORS[q.category] || CAT_COLORS['Graph Traversal']
    const hasGraph = q.graph?.nodes?.length > 0
    const hasTable = q.table?.length > 0

    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveQuery(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Questions
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catStyle.badge}`}>
              {q.category}
            </span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{q.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{q.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-3 text-xs text-gray-400 mr-2">
                {q.nodeCount > 0 && <span>{q.nodeCount} nodes</span>}
                {q.linkCount > 0 && <span>{q.linkCount} edges</span>}
                {q.rowCount > 0 && <span>{q.rowCount} rows</span>}
              </div>
              {hasGraph && (
                <button
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    viewMode === 'graph' ? 'bg-cgcc-gold/10 border-cgcc-gold text-cgcc-gold font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  Graph
                </button>
              )}
              {hasTable && (
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    viewMode === 'table' ? 'bg-cgcc-gold/10 border-cgcc-gold text-cgcc-gold font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  Table
                </button>
              )}
              {viewMode === 'graph' && hasGraph && (
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-1">
                  <button onClick={zoomIn} className="p-1.5 hover:bg-gray-50"><ZoomIn className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={zoomOut} className="p-1.5 hover:bg-gray-50 border-x border-gray-200"><ZoomOut className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={zoomFit} className="p-1.5 hover:bg-gray-50"><Maximize2 className="w-4 h-4 text-gray-500" /></button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {viewMode === 'graph' && hasGraph ? (
            <div className="relative h-full">
              {/* Dynamic legend */}
              <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur rounded-lg border border-gray-200 px-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(GROUP_COLORS).filter(([k]) =>
                    q.graph.nodes.some(n => n.group === k)
                  ).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                      <span className="capitalize text-gray-600">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div ref={containerRef} className="h-full w-full">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={q.graph}
                  width={dims.width}
                  height={dims.height}
                  nodeCanvasObject={paintNode}
                  linkCanvasObject={paintLink}
                  nodeLabel={n => `${n.name}${n.category ? ` (${n.category})` : ''}`}
                  cooldownTicks={80}
                  d3AlphaDecay={0.025}
                  d3VelocityDecay={0.3}
                  enableNodeDrag={true}
                  minZoom={0.3}
                  maxZoom={12}
                />
              </div>
            </div>
          ) : viewMode === 'table' && hasTable ? (
            <div className="h-full overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 border-b border-gray-200">#</th>
                    {q.columns.map(col => (
                      <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-100 border-b border-gray-200 whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {q.table.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-xs text-gray-400 font-mono">{i + 1}</td>
                      {q.columns.map(col => (
                        <td key={col} className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate">
                          {typeof row[col] === 'boolean' ? (row[col] ? '✓' : '—') :
                           typeof row[col] === 'number' ? (
                             Number.isInteger(row[col]) ? row[col].toLocaleString() : row[col]
                           ) : (row[col] || '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Eye className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No results for this query</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // QUESTION BROWSER — the main Q&A list
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Share2 className="w-6 h-6 text-cgcc-gold" />
          <h1 className="text-xl font-bold text-gray-900">Knowledge Graph Analytics</h1>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          {queries.length} analytical questions powered by the Neo4j knowledge graph. Click any question to see it visualized.
        </p>

        {/* Search */}
        <div className="mt-4 relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-cgcc-gold/50 focus:border-cgcc-gold"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Question cards by category */}
      <div className="p-6 max-w-5xl">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No questions match &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => {
          const style = CAT_COLORS[category] || CAT_COLORS['Graph Traversal']
          const isExpanded = expandedCats.has(category)

          return (
            <div key={category} className="mb-6">
              {/* Category header */}
              <button
                onClick={() => toggleCat(category)}
                className="flex items-center gap-2 mb-3 group w-full text-left"
              >
                <div className={`w-1.5 h-6 rounded-full ${style.accent}`} />
                <h2 className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>
                  {category}
                </h2>
                <span className="text-xs text-gray-400 font-normal">({items.length})</span>
                <div className="flex-1" />
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                }
              </button>

              {/* Cards grid */}
              {isExpanded && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(q => {
                    const Icon = ICON_MAP[q.icon] || BarChart3
                    return (
                      <button
                        key={q.id}
                        onClick={() => { setActiveQuery(q); setViewMode(q.nodeCount > 0 ? 'graph' : 'table') }}
                        className={`text-left p-4 rounded-xl border ${style.border} ${style.bg} hover:shadow-md hover:scale-[1.01] transition-all duration-150 group`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${style.accent} text-white shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-gray-700">
                              {q.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {q.description}
                            </p>
                          </div>
                        </div>

                        {/* Stats footer */}
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-200/60">
                          {q.nodeCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Share2 className="w-3 h-3" />
                              {q.nodeCount} nodes
                            </span>
                          )}
                          {q.rowCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <TableIcon className="w-3 h-3" />
                              {q.rowCount} rows
                            </span>
                          )}
                          <div className="flex-1" />
                          <span className={`text-xs font-medium ${style.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                            Explore →
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
