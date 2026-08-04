import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  MapPin, Star, Filter, ChevronRight, AlertTriangle,
} from 'lucide-react'

const memberColors = {
  member: '#f59e0b',
  'non-member': '#64748b',
  unknown: '#f97316',
}

// Keeps the Leaflet view in sync with the active neighborhood / filtered set so
// selecting a neighborhood recenters the map on its businesses.
function FitBounds({ businesses, fallback }) {
  const map = useMap()
  useEffect(() => {
    if (businesses.length === 0) {
      map.setView([fallback.lat, fallback.lon], 13)
      return
    }
    const lats = businesses.map(b => parseFloat(b.lat))
    const lons = businesses.map(b => parseFloat(b.lon))
    const bounds = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [businesses, map, fallback])
  return null
}

export default function MapPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Derive the map's bounding box from the live coordinates instead of the
  // static tenant rectangle, so businesses just outside the old hardcoded box
  // are no longer silently dropped. Uses 1st/99th percentiles to ignore
  // mis-geocoded outliers (e.g. a Coral Gables record accidentally placed in
  // Fort Myers) that would otherwise zoom the map out to uselessness. Falls
  // back to the tenant box when there aren't enough geocoded rows.
  const bbox = useMemo(() => {
    const lats = [], lons = []
    for (const b of rawBusinesses) {
      const lat = parseFloat(b.lat), lon = parseFloat(b.lon)
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue
      lats.push(lat); lons.push(lon)
    }
    if (lats.length < 20) return tenant.boundingBox
    lats.sort((a, b) => a - b); lons.sort((a, b) => a - b)
    const q = (arr, f) => arr[Math.floor((arr.length - 1) * f)]
    const pad = 0.005 // ~500m breathing room around the extremes
    return {
      south: q(lats, 0.01) - pad,
      north: q(lats, 0.99) + pad,
      west: q(lons, 0.01) - pad,
      east: q(lons, 0.99) + pad,
    }
  }, [rawBusinesses, tenant])

  const center = useMemo(() => ({
    lat: (bbox.north + bbox.south) / 2,
    lon: (bbox.east + bbox.west) / 2,
  }), [bbox])

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
      if (!map[hood]) map[hood] = { name: hood, total: 0, members: 0, nonMembers: 0, unknowns: 0 }
      map[hood].total++
      if (b._memberStatus === 'member') map[hood].members++
      else if (b._memberStatus === 'non-member') map[hood].nonMembers++
      else map[hood].unknowns++
    })
    return Object.values(map).map(h => ({
      ...h,
      penetration: h.total > 0 ? ((h.members / h.total) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.total - a.total)
  }, [geoBusinesses])

  const geoCoverage = stats ? stats.dataQuality.geoCoverage : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HERO ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <MapPin size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Geography Map</h1>
              <p className="text-slate-400 text-sm">{tenant.city}, {tenant.state} — {geoBusinesses.length} businesses with geo data ({geoCoverage}% coverage)</p>
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
        <div className="lg:col-span-3 relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden" style={{ minHeight: 560 }}>
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', minHeight: 560, background: '#0f172a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FitBounds businesses={geoBusinesses} fallback={center} />
            {geoBusinesses.map(b => {
              const color = b._hasRedFlag ? '#ef4444' : (memberColors[b._memberStatus] || '#64748b')
              return (
                <CircleMarker
                  key={b._id}
                  center={[parseFloat(b.lat), parseFloat(b.lon)]}
                  radius={b._hasRedFlag ? 6 : 5}
                  pathOptions={{
                    color: '#0f172a',
                    weight: 1,
                    fillColor: color,
                    fillOpacity: 0.85,
                  }}
                  eventHandlers={{ click: () => navigate(`/explorer/${b._id}`) }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-slate-900 text-sm leading-tight">{b.business_name}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{b.category_primary?.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {b._rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-medium">
                            <Star size={10} className="fill-amber-500 text-amber-500" /> {b._rating.toFixed(1)}
                          </span>
                        )}
                        <span className="text-[10px] capitalize text-slate-600">{b._memberStatus}</span>
                        {b._hasRedFlag && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-medium">
                            <AlertTriangle size={9} /> Risk
                          </span>
                        )}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center gap-4 pointer-events-none">
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
