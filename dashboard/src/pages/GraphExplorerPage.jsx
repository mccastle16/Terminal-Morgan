import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  Share2,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  X,
  Search,
  ChevronDown,
  Building2,
  Tag,
  MapPin,
} from 'lucide-react'

// ── Color palette ────────────────────────────────────────────────
const GROUP_COLORS = {
  infrastructure: '#D97706',  // amber
  platform:       '#2563EB',  // blue
  asset:          '#059669',  // emerald
  category:       '#7C3AED',  // violet
  neighborhood:   '#DC2626',  // red
}
const EDGE_COLORS = {
  CLASSIFIED_AS:  'rgba(124, 58, 237, 0.15)',
  LOCATED_IN:     'rgba(220, 38, 38, 0.12)',
  COMPETES_WITH:  'rgba(234, 88, 12, 0.25)',
  NEAR:           'rgba(59, 130, 246, 0.08)',
}

// ── Main component ──────────────────────────────────────────────
export default function GraphExplorerPage() {
  const fgRef = useRef()
  const containerRef = useRef()
  const [graphData, setGraphData] = useState(null)
  const [graphStats, setGraphStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    showCategories: true,
    showNeighborhoods: true,
    edgeTypes: ['CLASSIFIED_AS', 'COMPETES_WITH'],
    nodeTypes: ['infrastructure', 'platform', 'asset'],
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/data/graph_data.json').then(r => r.json()),
      fetch('/data/graph_stats.json').then(r => r.json()),
    ]).then(([graph, stats]) => {
      setGraphData(graph)
      setGraphStats(stats)
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load graph data:', err)
      setLoading(false)
    })
  }, [])

  // ── Responsive sizing ─────────────────────────────────────────
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // ── Filter graph data ────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    // Build visible node set
    const visibleNodes = new Set()
    const nodes = graphData.nodes.filter(n => {
      if (n.type === 'business') {
        if (!filters.nodeTypes.includes(n.group)) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (!n.name.toLowerCase().includes(q) && !n.category?.toLowerCase().includes(q)) return false
        }
        visibleNodes.add(n.id)
        return true
      }
      if (n.type === 'category' && filters.showCategories) {
        visibleNodes.add(n.id)
        return true
      }
      if (n.type === 'neighborhood' && filters.showNeighborhoods) {
        visibleNodes.add(n.id)
        return true
      }
      return false
    })

    // Filter links to only visible nodes + allowed edge types
    const links = graphData.links.filter(l => {
      if (!filters.edgeTypes.includes(l.type)) return false
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      return visibleNodes.has(src) && visibleNodes.has(tgt)
    })

    return { nodes, links }
  }, [graphData, filters, searchQuery])

  // ── Node rendering ────────────────────────────────────────────
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHovered = hoveredNode === node.id
    const isSelected = selectedNode?.id === node.id
    const label = node.name || ''
    const fontSize = Math.max(10 / globalScale, 1.5)

    let radius
    if (node.type === 'category') radius = Math.max(Math.sqrt(node.size || 10) * 1.2, 8)
    else if (node.type === 'neighborhood') radius = Math.max(Math.sqrt(node.size || 10) * 1.5, 10)
    else radius = Math.max(3, Math.min(node.deg / 10, 12))

    const color = GROUP_COLORS[node.group] || '#6B7280'
    const alpha = isHovered || isSelected ? 1.0 : 0.85

    // Draw node
    ctx.beginPath()
    if (node.type === 'category') {
      // Diamond for categories
      ctx.moveTo(node.x, node.y - radius)
      ctx.lineTo(node.x + radius, node.y)
      ctx.lineTo(node.x, node.y + radius)
      ctx.lineTo(node.x - radius, node.y)
    } else if (node.type === 'neighborhood') {
      // Square for neighborhoods
      ctx.rect(node.x - radius, node.y - radius, radius * 2, radius * 2)
    } else {
      // Circle for businesses
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    }
    ctx.closePath()
    ctx.fillStyle = color + (alpha === 1.0 ? 'ff' : 'd9')
    ctx.fill()

    // Highlight ring
    if (isHovered || isSelected) {
      ctx.strokeStyle = '#FBBF24'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    // Red flag indicator
    if (node.red_flag) {
      ctx.beginPath()
      ctx.arc(node.x + radius * 0.7, node.y - radius * 0.7, 3 / globalScale, 0, 2 * Math.PI)
      ctx.fillStyle = '#EF4444'
      ctx.fill()
    }

    // Chamber member badge
    if (node.member) {
      ctx.beginPath()
      ctx.arc(node.x - radius * 0.7, node.y - radius * 0.7, 3 / globalScale, 0, 2 * Math.PI)
      ctx.fillStyle = '#FBBF24'
      ctx.fill()
    }

    // Label (only when zoomed in enough or hovered)
    if (globalScale > 1.5 || isHovered || isSelected || node.type !== 'business') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${fontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = isHovered || isSelected ? '#111827' : '#4B5563'

      // Background for readability
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fillRect(node.x - textWidth / 2 - 1, node.y + radius + 1, textWidth + 2, fontSize + 2)

      ctx.fillStyle = isHovered || isSelected ? '#111827' : '#4B5563'
      ctx.fillText(label, node.x, node.y + radius + 2)
    }
  }, [hoveredNode, selectedNode])

  // ── Edge rendering ────────────────────────────────────────────
  const paintLink = useCallback((link, ctx) => {
    const color = EDGE_COLORS[link.type] || 'rgba(156, 163, 175, 0.1)'
    ctx.strokeStyle = color
    ctx.lineWidth = link.type === 'COMPETES_WITH' ? 1.5 : 0.5
    ctx.beginPath()
    ctx.moveTo(link.source.x, link.source.y)
    ctx.lineTo(link.target.x, link.target.y)
    ctx.stroke()
  }, [])

  // ── Node click handler ────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 400)
      fgRef.current.zoom(3, 400)
    }
  }, [])

  // ── Zoom controls ─────────────────────────────────────────────
  const zoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.5, 300)
  const zoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.5, 300)
  const zoomFit = () => fgRef.current?.zoomToFit(400, 50)

  // ── Toggle helpers ────────────────────────────────────────────
  const toggleEdgeType = (type) => {
    setFilters(prev => ({
      ...prev,
      edgeTypes: prev.edgeTypes.includes(type)
        ? prev.edgeTypes.filter(t => t !== type)
        : [...prev.edgeTypes, type],
    }))
  }
  const toggleNodeType = (type) => {
    setFilters(prev => ({
      ...prev,
      nodeTypes: prev.nodeTypes.includes(type)
        ? prev.nodeTypes.filter(t => t !== type)
        : [...prev.nodeTypes, type],
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Share2 className="w-12 h-12 text-cgcc-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading knowledge graph...</p>
        </div>
      </div>
    )
  }

  if (!graphData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Share2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">Graph data not available</p>
          <p className="text-sm mt-1">Run the ETL loader to generate graph data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] relative">
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 z-10">
        <Share2 className="w-5 h-5 text-cgcc-gold" />
        <h1 className="font-semibold text-gray-900">Knowledge Graph</h1>
        <span className="text-xs text-gray-400 hidden sm:inline">
          {filteredData.nodes.length} nodes · {filteredData.links.length} edges
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-cgcc-gold/50 focus:border-cgcc-gold w-48"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            filterOpen ? 'bg-cgcc-gold/10 border-cgcc-gold text-cgcc-gold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-3 h-3 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Zoom controls */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={zoomIn} className="p-1.5 hover:bg-gray-50" title="Zoom in">
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={zoomOut} className="p-1.5 hover:bg-gray-50 border-x border-gray-200" title="Zoom out">
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={zoomFit} className="p-1.5 hover:bg-gray-50" title="Fit to screen">
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Info toggle */}
        <button
          onClick={() => setInfoOpen(!infoOpen)}
          className={`p-1.5 rounded-lg border transition-colors ${
            infoOpen ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Info className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* ── Filter panel ─────────────────────────────────────── */}
      {filterOpen && (
        <div className="absolute top-12 right-16 z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Node Types (PKP)</h3>
          <div className="space-y-2 mb-4">
            {['infrastructure', 'platform', 'asset'].map(type => (
              <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.nodeTypes.includes(type)}
                  onChange={() => toggleNodeType(type)}
                  className="rounded border-gray-300"
                />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GROUP_COLORS[type] }} />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>

          <h3 className="font-semibold text-sm text-gray-700 mb-3">Reference Nodes</h3>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showCategories}
                onChange={() => setFilters(p => ({ ...p, showCategories: !p.showCategories }))}
                className="rounded border-gray-300"
              />
              <Tag className="w-3 h-3 text-violet-500" />
              <span>Categories</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showNeighborhoods}
                onChange={() => setFilters(p => ({ ...p, showNeighborhoods: !p.showNeighborhoods }))}
                className="rounded border-gray-300"
              />
              <MapPin className="w-3 h-3 text-red-500" />
              <span>Neighborhoods</span>
            </label>
          </div>

          <h3 className="font-semibold text-sm text-gray-700 mb-3">Edge Types</h3>
          <div className="space-y-2">
            {[
              { type: 'CLASSIFIED_AS', label: 'Category membership', color: '#7C3AED' },
              { type: 'LOCATED_IN', label: 'Location', color: '#DC2626' },
              { type: 'COMPETES_WITH', label: 'Competition', color: '#EA580C' },
              { type: 'NEAR', label: 'Proximity', color: '#3B82F6' },
            ].map(({ type, label, color }) => (
              <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.edgeTypes.includes(type)}
                  onChange={() => toggleEdgeType(type)}
                  className="rounded border-gray-300"
                />
                <span className="w-4 h-0.5" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Info panel (stats) ───────────────────────────────── */}
      {infoOpen && graphStats && (
        <div className="absolute top-12 right-4 z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Graph Statistics</h3>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-lg font-bold text-gray-900">{graphStats.total_businesses?.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Businesses</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-lg font-bold text-gray-900">{graphStats.total_edges?.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total Edges</div>
            </div>
          </div>

          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">PKP Distribution</h4>
          {graphStats.pkp_distribution && Object.entries(graphStats.pkp_distribution).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[type] }} />
                <span className="capitalize">{type}</span>
              </div>
              <span className="text-gray-500">{count}</span>
            </div>
          ))}

          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-3 mb-2">Top Categories</h4>
          {graphStats.category_distribution && Object.entries(graphStats.category_distribution).slice(0, 5).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between text-sm mb-1">
              <span className="truncate mr-2">{cat}</span>
              <span className="text-gray-500">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur rounded-lg border border-gray-200 px-3 py-2 text-xs">
        <div className="font-medium text-gray-600 mb-1.5">Legend</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(GROUP_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 ${name === 'category' ? 'rotate-45' : name === 'neighborhood' ? '' : 'rounded-full'}`}
                style={{ backgroundColor: color, display: 'inline-block' }}
              />
              <span className="capitalize text-gray-600">{name}</span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> CGCC</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Risk</span>
        </div>
      </div>

      {/* ── Selected node detail ─────────────────────────────── */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{selectedNode.name}</h3>
              <span
                className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: GROUP_COLORS[selectedNode.group] || '#6B7280' }}
              >
                {selectedNode.group || selectedNode.type}
              </span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedNode.type === 'business' && (
            <div className="space-y-1.5 text-xs text-gray-600">
              {selectedNode.category && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span>{selectedNode.category}</span>
                </div>
              )}
              {selectedNode.neighborhood && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Neighborhood</span>
                  <span>{selectedNode.neighborhood}</span>
                </div>
              )}
              {selectedNode.rating > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Rating</span>
                  <span>{'★'.repeat(Math.round(selectedNode.rating))} {selectedNode.rating.toFixed(1)}</span>
                </div>
              )}
              {selectedNode.confidence > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">OSINT Confidence</span>
                  <span>{(selectedNode.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Connections</span>
                <span className="font-medium">{selectedNode.deg}</span>
              </div>
              <div className="flex gap-2 mt-1">
                {selectedNode.member && (
                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">CGCC Member</span>
                )}
                {selectedNode.red_flag && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs">Red Flag</span>
                )}
              </div>
            </div>
          )}

          {selectedNode.type === 'category' && (
            <div className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Businesses</span>
                <span>{selectedNode.size}</span>
              </div>
            </div>
          )}

          {selectedNode.type === 'neighborhood' && (
            <div className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">Businesses</span>
                <span>{selectedNode.size}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Graph canvas ─────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 bg-gray-50">
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          onNodeHover={node => setHoveredNode(node?.id || null)}
          nodeLabel=""
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          linkDirectionalParticles={0}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          minZoom={0.3}
          maxZoom={12}
        />
      </div>
    </div>
  )
}
