import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  MapPin, Building2, Users, Star, Filter, ChevronRight,
  ZoomIn, ZoomOut, Layers, AlertTriangle, Eye,
} from 'lucide-react'

/* ── Dot map rendered on a canvas-like SVG ── */
const MAP_W = 800
const MAP_H = 600

function projectGeo(lat, lon, bbox) {
  const x = ((lon - bbox.west) / (bbox.east - bbox.west)) * MAP_W
  const y = ((bbox.north - lat) / (bbox.north - bbox.south)) * MAP_H
  return { x, y }
}

const memberColors = {
  member: '#f59e0b',
  'non-member': '#64748b',
  unknown: '#f97316',
}

export default function MapPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredBiz, setHoveredBiz] = useState(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const svgRef = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  const bbox = tenant.boundingBox

  const geoBusinesses = useMemo(() => {
    return rawBusinesses.filter(b => {
      if (!b._hasGeo) return false
      const lat = parseFloat(b.lat)
      const lon = parseFloat(b.lon)
      if (isNaN(lat) || isNaN(lon)) return false
      if (lat < bbox.south || lat > bbox.north || lon < bbox.west || lon > bbox.east) return false
      if (selectedNeighborhood && b.neighborhood_area !== selectedNeighborhood) return false
      if (memberFilter && b._memberStatus !== memberFilter) return false
      if (categoryFilter && b.category_primary !== categoryFilter) return false
      return true
    })
  }, [rawBusinesses, bbox, selectedNeighborhood, memberFilter, categoryFilter])

  // Aggregate by neighborhood for the side panel
  const neighborhoodStats = useMemo(() => {
    const map = {}
    geoBusinesses.forEach(b => {
      const hood = b.neighborhood_area || 'Unknown'
      if (!map[hood]) map[hood] = { name: hood, total: 0, members: 0, nonMembers: 0, unknowns: 0, avgLat: 0, avgLon: 0 }
      map[hood].total++
      if (b._memberStatus === 'member') map[hood].members++
      else if (b._memberStatus === 'non-member') map[hood].nonMembers++
      else map[hood].unknowns++
      map[hood].avgLat += parseFloat(b.lat)
      map[hood].avgLon += parseFloat(b.lon)
    })
    return Object.values(map).map(h => ({
      ...h,
      avgLat: h.avgLat / h.total,
      avgLon: h.avgLon / h.total,
      penetration: h.total > 0 ? ((h.members / h.total) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.total - a.total)
  }, [geoBusinesses])

  const handleMouseDown = (e) => {
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }
  const handleMouseMove = (e) => {
    if (!isPanning.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }
  const handleMouseUp = () => { isPanning.current = false }

  const geoCoverage = stats ? stats.dataQuality.geoCoverage : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HERO ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <MapPin size={20} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Geography Map</h1>
                <p className="text-slate-400 text-sm">{tenant.city}, {tenant.state} — {geoBusinesses.length} businesses with geo data ({geoCoverage}% coverage)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.min(z + 0.3, 4))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-colors">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors">
                Reset
              </button>
              <button onClick={() => setZoom(z => Math.max(z - 0.3, 0.5))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-colors">
                <ZoomOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter size={13} /> <span>Filter map:</span>
        </div>
        <select value={selectedNeighborhood} onChange={(e) => setSelectedNeighborhood(e.target.value)}
          className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
          <option value="">All Neighborhoods</option>
          {stats?.neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}
          className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
          <option value="">All Statuses</option>
          <option value="member">Members</option>
          <option value="non-member">Non-Members</option>
          <option value="unknown">Unknown</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
          <option value="">All Categories</option>
          {stats?.categories.slice(0, 20).map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* MAP CANVAS */}
        <div className="lg:col-span-3 relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden" style={{ minHeight: 500 }}>
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Grid */}
              {[...Array(11)].map((_, i) => (
                <line key={`v${i}`} x1={i * MAP_W / 10} y1={0} x2={i * MAP_W / 10} y2={MAP_H}
                  stroke="#1e293b" strokeWidth={0.5} />
              ))}
              {[...Array(9)].map((_, i) => (
                <line key={`h${i}`} x1={0} y1={i * MAP_H / 8} x2={MAP_W} y2={i * MAP_H / 8}
                  stroke="#1e293b" strokeWidth={0.5} />
              ))}

              {/* Neighborhood labels */}
              {neighborhoodStats.map(hood => {
                const pos = projectGeo(hood.avgLat, hood.avgLon, bbox)
                return (
                  <g key={hood.name}>
                    <text x={pos.x} y={pos.y - 12} textAnchor="middle"
                      className="fill-slate-600 text-[8px] font-medium pointer-events-none select-none">
                      {hood.name}
                    </text>
                  </g>
                )
              })}

              {/* Business dots */}
              {geoBusinesses.map(b => {
                const pos = projectGeo(parseFloat(b.lat), parseFloat(b.lon), bbox)
                const color = memberColors[b._memberStatus] || '#64748b'
                const isHovered = hoveredBiz?._id === b._id
                return (
                  <g key={b._id}>
                    <circle cx={pos.x} cy={pos.y} r={isHovered ? 6 : b._hasRedFlag ? 4 : 3}
                      fill={b._hasRedFlag ? '#ef4444' : color}
                      opacity={isHovered ? 1 : 0.7}
                      stroke={isHovered ? '#fff' : 'none'} strokeWidth={isHovered ? 1.5 : 0}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredBiz(b)}
                      onMouseLeave={() => setHoveredBiz(null)}
                      onClick={() => navigate(`/explorer/${b._id}`)} />
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Hover tooltip */}
          {hoveredBiz && (
            <div className="absolute top-3 left-3 bg-slate-900/95 border border-slate-700 rounded-xl p-3 max-w-[260px] pointer-events-none z-10">
              <p className="font-semibold text-white text-sm truncate">{hoveredBiz.business_name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{hoveredBiz.category_primary?.replace(/_/g, ' ')}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {hoveredBiz._rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <Star size={10} className="fill-amber-400" /> {hoveredBiz._rating.toFixed(1)}
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  hoveredBiz._memberStatus === 'member' ? 'bg-amber-500/10 text-amber-400' :
                  hoveredBiz._memberStatus === 'non-member' ? 'bg-slate-700 text-slate-300' :
                  'bg-orange-500/10 text-orange-400'
                }`}>{hoveredBiz._memberStatus}</span>
                {hoveredBiz._hasRedFlag && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400">
                    <AlertTriangle size={9} /> Risk
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center gap-4">
            {[
              { color: '#f59e0b', label: 'Member' },
              { color: '#64748b', label: 'Non-Member' },
              { color: '#f97316', label: 'Unknown' },
              { color: '#ef4444', label: 'Risk Flag' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NEIGHBORHOOD SIDEBAR */}
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Neighborhoods</p>
          {neighborhoodStats.map(hood => (
            <button key={hood.name}
              onClick={() => setSelectedNeighborhood(selectedNeighborhood === hood.name ? '' : hood.name)}
              className={`w-full text-left p-3 rounded-xl border transition-all group ${
                selectedNeighborhood === hood.name
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700/80'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">{hood.name}</span>
                <ChevronRight size={12} className="text-slate-700" />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>{hood.total} biz</span>
                <span className="text-amber-400">{hood.members} mem</span>
                <span>{hood.penetration}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${hood.penetration}%` }} />
              </div>
            </button>
          ))}
          {neighborhoodStats.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-8">No geo data for current filters</p>
          )}
        </div>
      </div>
    </div>
  )
}
