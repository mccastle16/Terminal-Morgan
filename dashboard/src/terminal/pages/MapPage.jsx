import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, Pane } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  MapPin, Star, Filter, ChevronRight,
  ZoomIn, ZoomOut, AlertTriangle, Maximize2,
} from 'lucide-react'

const memberColors = {
  member: '#f59e0b',
  'non-member': '#64748b',
  unknown: '#f97316',
}

function neighborhoodIcon(name) {
  return L.divIcon({
    className: 'leaflet-div-icon neighborhood-label',
    html: name,
    iconSize: null,
    iconAnchor: [0, 0],
  })
}

export default function MapPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [memberFilter, setMemberFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const mapRef = useRef(null)

  const bbox = tenant.boundingBox
  const bounds = useMemo(() => [[bbox.south, bbox.west], [bbox.north, bbox.east]], [bbox])

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

  // Aggregate by neighborhood for the side panel + map labels
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

  const geoCoverage = stats ? stats.dataQuality.geoCoverage : 0

  // Bounding box per neighborhood (independent of member/category filters) so
  // selecting a neighborhood always zooms to its full extent.
  const neighborhoodBounds = useMemo(() => {
    const map = {}
    rawBusinesses.forEach(b => {
      if (!b._hasGeo) return
      const lat = parseFloat(b.lat)
      const lon = parseFloat(b.lon)
      if (isNaN(lat) || isNaN(lon)) return
      if (lat < bbox.south || lat > bbox.north || lon < bbox.west || lon > bbox.east) return
      const hood = b.neighborhood_area || 'Unknown'
      if (!map[hood]) map[hood] = { minLat: lat, maxLat: lat, minLon: lon, maxLon: lon }
      else {
        map[hood].minLat = Math.min(map[hood].minLat, lat)
        map[hood].maxLat = Math.max(map[hood].maxLat, lat)
        map[hood].minLon = Math.min(map[hood].minLon, lon)
        map[hood].maxLon = Math.max(map[hood].maxLon, lon)
      }
    })
    return map
  }, [rawBusinesses, bbox])

  // Auto-fly the map to the selected neighborhood's extent, or back to the full view when cleared.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!selectedNeighborhood) {
      map.flyToBounds(bounds, { padding: [20, 20] })
      return
    }
    const nb = neighborhoodBounds[selectedNeighborhood]
    if (!nb) return
    map.flyToBounds([[nb.minLat, nb.minLon], [nb.maxLat, nb.maxLon]], { padding: [40, 40], maxZoom: 16 })
  }, [selectedNeighborhood, neighborhoodBounds, bounds])

  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const resetView = () => mapRef.current?.flyToBounds(bounds, { padding: [20, 20] })

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
              <button onClick={zoomIn}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition-colors">
                <ZoomIn size={16} />
              </button>
              <button onClick={resetView}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors">
                <Maximize2 size={13} /> Reset
              </button>
              <button onClick={zoomOut}
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
        {/* MAP */}
        <div className="lg:col-span-3 relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden" style={{ minHeight: 500, height: 600 }}>
          <MapContainer
            ref={mapRef}
            bounds={bounds}
            boundsOptions={{ padding: [20, 20] }}
            maxBounds={[[bbox.south - 0.08, bbox.west - 0.08], [bbox.north + 0.08, bbox.east + 0.08]]}
            maxBoundsViscosity={0.6}
            minZoom={11}
            maxZoom={18}
            scrollWheelZoom={true}
            zoomControl={false}
            attributionControl={true}
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
            />

            {/* Neighborhood labels */}
            {neighborhoodStats.map(hood => (
              <Marker
                key={hood.name}
                position={[hood.avgLat, hood.avgLon]}
                icon={neighborhoodIcon(hood.name)}
                interactive={false}
              />
            ))}

            {/* Business dots — own pane, above the neighborhood-label markers (z 600),
                so a label never sits on top of a dot and blocks its hover/tooltip */}
            <Pane name="business-dots" style={{ zIndex: 620 }}>
              {geoBusinesses.map(b => {
                const color = b._hasRedFlag ? '#ef4444' : (memberColors[b._memberStatus] || '#64748b')
                return (
                  <CircleMarker
                    key={b._id}
                    center={[parseFloat(b.lat), parseFloat(b.lon)]}
                    radius={b._hasRedFlag ? 5 : 4}
                    pathOptions={{ color: 'transparent', weight: 0, fillColor: color, fillOpacity: 0.75 }}
                    eventHandlers={{
                      mouseover: (e) => { e.target.setStyle({ fillOpacity: 1, weight: 1.5, color: '#fff' }); e.target.bringToFront() },
                      mouseout: (e) => { e.target.setStyle({ fillOpacity: 0.75, weight: 0, color: 'transparent' }) },
                      click: () => navigate(`/explorer/${b._id}`),
                    }}
                  >
                    <Tooltip pane="tooltipPane" direction="top" offset={[0, -4]} opacity={1} className="map-tooltip-dark">
                      <div className="p-2.5 min-w-[160px]">
                        <p className="font-semibold text-white text-sm truncate">{b.business_name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{b.category_primary?.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {b._rating > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <Star size={10} className="fill-amber-400" /> {b._rating.toFixed(1)}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            b._memberStatus === 'member' ? 'bg-amber-500/10 text-amber-400' :
                            b._memberStatus === 'non-member' ? 'bg-slate-700 text-slate-300' :
                            'bg-orange-500/10 text-orange-400'
                          }`}>{b._memberStatus}</span>
                          {b._hasRedFlag && (
                            <span className="flex items-center gap-1 text-[10px] text-red-400">
                              <AlertTriangle size={9} /> Risk
                            </span>
                          )}
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                )
              })}
            </Pane>
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center gap-4" style={{ zIndex: 1000 }}>
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
