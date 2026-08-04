import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  Share2, Search, Table, Network, ChevronRight, AlertTriangle,
} from 'lucide-react'

const CATEGORY_COLORS = {
  'Competitive Intel': '#f59e0b',
  'Location & Proximity': '#3b82f6',
  'Chamber Membership': '#10b981',
  'Risk & Quality': '#ef4444',
  'Data Intelligence': '#a855f7',
  'PKP Analysis': '#ec4899',
  'Supply Chain & Forces': '#06b6d4',
  'Graph Traversal': '#6366f1',
}

const NODE_COLORS = {
  business: '#f59e0b',
  category: '#3b82f6',
  neighborhood: '#10b981',
  default: '#6b7280',
}

export default function GraphExplorerPage() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [viewMode, setViewMode] = useState('graph')
  const [searchQuery, setSearchQuery] = useState('')
  const graphRef = useRef()

  useEffect(() => {
    fetch('/api/analytics-queries')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(d => { setQueries(d); if (d.length) setSelectedQuery(d[0]); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const categories = useMemo(() => {
    const groups = {}
    queries.forEach(q => {
      if (!groups[q.category]) groups[q.category] = []
      groups[q.category].push(q)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [queries])

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    const q = searchQuery.toLowerCase()
    return categories.map(([cat, items]) => [
      cat,
      items.filter(i => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)),
    ]).filter(([, items]) => items.length > 0)
  }, [categories, searchQuery])

  const graphData = useMemo(() => {
    if (!selectedQuery?.graph) return { nodes: [], links: [] }
    return {
      nodes: selectedQuery.graph.nodes || [],
      links: (selectedQuery.graph.links || []).map(l => ({ ...l })),
    }
  }, [selectedQuery])

  const paintNode = useCallback((node, ctx, globalScale) => {
    const r = Math.max(3, 6 / Math.sqrt(globalScale))
    const color = NODE_COLORS[node.type] || NODE_COLORS.default
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
    if (globalScale > 1.5) {
      ctx.font = `${Math.max(3, 10 / globalScale)}px sans-serif`
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.fillText(node.name || node.id, node.x, node.y + r + 8 / globalScale)
    }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="text-center py-24">
      <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-300">Failed to load graph data</h2>
      <p className="text-sm text-slate-500 mt-1">{error}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
            <Share2 size={16} className="text-cyan-400" />
          </div>
          Graph Analytics
        </h1>
        <p className="text-slate-400">{queries.length} pre-built queries across {categories.length} categories</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Query Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search queries..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filteredCategories.map(([catName, items]) => (
              <div key={catName}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[catName] || '#6b7280' }} />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{catName}</span>
                </div>
                {items.map(q => (
                  <button key={q.id} onClick={() => setSelectedQuery(q)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all mb-1 ${
                      selectedQuery?.id === q.id
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                    }`}>
                    <span className="block truncate">{q.title}</span>
                    <span className="text-[10px] text-slate-600">{q.nodeCount} nodes · {q.linkCount} links</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-3">
          {selectedQuery ? (
            <div className="bg-slate-800/60 rounded-lg border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">{selectedQuery.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedQuery.description}</p>
                </div>
                <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-slate-800">
                  <button onClick={() => setViewMode('graph')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      viewMode === 'graph' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    <Network size={12} /> Graph
                  </button>
                  <button onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                      viewMode === 'table' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    <Table size={12} /> Table
                  </button>
                </div>
              </div>

              {viewMode === 'graph' ? (
                <div className="h-[500px] bg-slate-950/50">
                  {graphData.nodes.length > 0 ? (
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={graphData}
                      nodeCanvasObject={paintNode}
                      linkColor={() => 'rgba(71, 85, 105, 0.4)'}
                      linkWidth={0.5}
                      backgroundColor="transparent"
                      enableZoomInteraction={true}
                      enablePanInteraction={true}
                      cooldownTicks={80}
                      onNodeClick={(node) => {
                        if (graphRef.current) {
                          graphRef.current.centerAt(node.x, node.y, 400)
                          graphRef.current.zoom(3, 400)
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                      No graph data for this query
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {selectedQuery.table?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/30">
                          {selectedQuery.columns?.map(col => (
                            <th key={col} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuery.table.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                            {selectedQuery.columns?.map(col => (
                              <td key={col} className="px-4 py-2.5 text-slate-300">
                                {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col] ?? '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                      No table data for this query
                    </div>
                  )}
                  {selectedQuery.table?.length > 50 && (
                    <p className="text-xs text-slate-600 p-3 text-center">
                      Showing 50 of {selectedQuery.table.length} rows
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-800/30 rounded-lg border border-slate-800">
              <div className="text-center">
                <Share2 size={32} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Select a query to explore</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
