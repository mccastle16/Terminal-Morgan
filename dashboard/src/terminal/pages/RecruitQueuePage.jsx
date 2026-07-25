import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import KPICard, { KPICardMini } from '../components/KPICard'
import { MemberBadge } from '../components/TrustBadge'
import {
  UserPlus, Download, Star, ChevronLeft, ChevronRight, ArrowUpDown,
  ChevronsLeft, ChevronsRight,
  ChevronUp, ChevronDown, Target, Trophy, Filter, Eye, Phone,
  Globe, MapPin, CheckCircle2, Info, AlertTriangle,
} from 'lucide-react'

const PAGE_SIZE = 40

// Top Prospect -> Strong Prospect -> Moderate Prospect -> Low Priority
const BAND_RANK = { A: 0, B: 1, C: 2, D: 3 }

const BAND_FILTERS = [
  { key: 'all', label: 'All', color: '#94a3b8' },
  { key: 'A', label: 'A — Top Prospect', color: '#22c55e' },
  { key: 'B', label: 'B — Strong Prospect', color: '#3b82f6' },
  { key: 'C', label: 'C — Moderate Prospect', color: '#f59e0b' },
  { key: 'D', label: 'D — Low Priority', color: '#ef4444' },
]

export default function RecruitQueuePage() {
  const { recruitQueue, stats, filters, setFilters } = useTerminalData()
  const { can } = useTerminalAuth()
  const navigate = useNavigate()

  const [bandFilter, setBandFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('')
  const [hoodFilter, setHoodFilter] = useState('')
  const [sortKey, setSortKey] = useState('_recruitScore')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    let q = [...recruitQueue]
    if (bandFilter !== 'all') q = q.filter(b => b._recruitBand?.band === bandFilter)
    if (catFilter) q = q.filter(b => b.category_primary === catFilter)
    if (hoodFilter) q = q.filter(b => b.neighborhood_area === hoodFilter)
    q.sort((a, b) => {
      let av, bv
      if (sortKey === '_recruitBand') {
        av = BAND_RANK[a._recruitBand?.band] ?? -1
        bv = BAND_RANK[b._recruitBand?.band] ?? -1
      } else {
        av = a[sortKey]
        bv = b[sortKey]
      }
      if (typeof av === 'string') av = av?.toLowerCase?.() ?? ''
      if (typeof bv === 'string') bv = bv?.toLowerCase?.() ?? ''
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return q
  }, [recruitQueue, bandFilter, catFilter, hoodFilter, sortKey, sortDir])

  const paginated = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const bandStats = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 }
    recruitQueue.forEach(b => {
      const band = b._recruitBand?.band
      if (band && counts[band] !== undefined) counts[band]++
    })
    return counts
  }, [recruitQueue])

  const categories = useMemo(() => {
    const set = new Set(recruitQueue.map(b => b.category_primary).filter(Boolean))
    return Array.from(set).sort()
  }, [recruitQueue])

  const neighborhoods = useMemo(() => {
    const set = new Set(recruitQueue.map(b => b.neighborhood_area).filter(Boolean))
    return Array.from(set).sort()
  }, [recruitQueue])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const exportQueue = useCallback(() => {
    if (!can('export_data')) return
    const headers = ['Rank', 'Business', 'Category', 'Neighborhood', 'Rating', 'Phone', 'Website', 'Score', 'Band', 'Reasons']
    const rows = filtered.map((b, i) => [
      i + 1, b.business_name, b.category_primary, b.neighborhood_area,
      b._rating, b.phone, b.website_url || b.website,
      b._recruitScore, b._recruitBand?.label, b._recruitReasons?.join('; '),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cgcc_recruit_queue_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered, can])

  return (
    <RoleGate permission="view_recruit_queue" blur>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-3 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Target size={16} className="text-amber-400" />
              </div>
              Recruit Queue
            </h1>
            <p className="text-sm text-slate-500">
              {recruitQueue.length.toLocaleString()} non-member prospects ranked by recruitability
            </p>
          </div>
          <RoleGate permission="export_data">
            <button onClick={exportQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-500/20 transition-colors">
              <Download size={13} /> Export Queue
            </button>
          </RoleGate>
        </div>

        {/* KPI Band Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard label="Total Prospects" value={recruitQueue.length.toLocaleString()} icon={UserPlus} accent="amber" />
          <KPICardMini label="Band A — Top Prospect" value={bandStats.A} color="#22c55e" />
          <KPICardMini label="Band B — Strong Prospect" value={bandStats.B} color="#3b82f6" />
          <KPICardMini label="Band C — Moderate Prospect" value={bandStats.C} color="#f59e0b" />
          <KPICardMini label="Band D — Low Priority" value={bandStats.D} color="#ef4444" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-lg p-1">
            {BAND_FILTERS.map(bf => (
              <button key={bf.key} onClick={() => { setBandFilter(bf.key); setPage(0) }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  bandFilter === bf.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={bandFilter === bf.key ? { backgroundColor: bf.color + '25', color: bf.color } : {}}>
                {bf.label}
              </button>
            ))}
          </div>

          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0) }}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>

          <select value={hoodFilter} onChange={e => { setHoodFilter(e.target.value); setPage(0) }}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 focus:border-amber-500">
            <option value="">All neighborhoods</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <span className="text-[11px] text-slate-600 ml-auto">
            {filtered.length.toLocaleString()} prospects
          </span>
        </div>

        {/* Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800 bg-slate-800/20">
            <span className="w-8 text-[10px] text-slate-600 font-semibold">#</span>
            {[
              { key: 'business_name', label: 'Business', w: 'flex-1 min-w-[160px]' },
              { key: 'category_primary', label: 'Category', w: 'w-28' },
              { key: 'neighborhood_area', label: 'Neighborhood', w: 'w-24' },
              { key: '_rating', label: 'Rating', w: 'w-14 text-right' },
              { key: '_recruitScore', label: 'Score', w: 'w-14 text-right' },
              { key: '_recruitBand', label: 'Band', w: 'w-16 text-center' },
            ].map(col => (
              <button key={col.key} onClick={() => toggleSort(col.key)}
                className={`${col.w} flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                  sortKey === col.key ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                } transition-colors cursor-pointer`}>
                {col.label}
                {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={9} className="opacity-30" />}
              </button>
            ))}
            <span className="w-8" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800/50">
            {paginated.map((biz, idx) => (
              <div key={biz._id}>
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800/30 cursor-pointer transition-colors group"
                  onClick={() => setExpandedId(expandedId === biz._id ? null : biz._id)}>
                  <span className="w-8 text-[10px] text-slate-600">
                    {page * PAGE_SIZE + idx + 1}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-xs text-slate-200 font-medium truncate group-hover:text-amber-400 transition-colors">
                      {biz.business_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {biz._hasPhone && <Phone size={8} className="text-green-700" />}
                      {biz._hasWebsite && <Globe size={8} className="text-blue-700" />}
                      {biz._hasGeo && <MapPin size={8} className="text-purple-700" />}
                    </div>
                  </div>

                  {/* Category */}
                  <span className="w-28 text-[11px] text-slate-400 truncate">
                    {biz.category_primary?.replace(/_/g, ' ') ?? '—'}
                  </span>

                  {/* Neighborhood */}
                  <span className="w-24 text-[11px] text-slate-400 truncate">
                    {biz.neighborhood_area || '—'}
                  </span>

                  {/* Rating */}
                  <div className="w-14 text-right">
                    {biz._rating > 0 ? (
                      <span className="text-[11px] text-slate-300 flex items-center justify-end gap-0.5">
                        <Star size={10} className="text-amber-500" /> {biz._rating.toFixed(1)}
                      </span>
                    ) : <span className="text-[10px] text-slate-700">—</span>}
                  </div>

                  {/* Score */}
                  <div className="w-14 text-right">
                    <span className="text-sm font-semibold font-mono" style={{ color: biz._recruitBand?.color }}>
                      {biz._recruitScore}
                    </span>
                  </div>

                  {/* Band */}
                  <div className="w-16 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ color: biz._recruitBand?.color, backgroundColor: biz._recruitBand?.color + '15' }}>
                      {biz._recruitBand?.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <button onClick={e => { e.stopPropagation(); navigate(`/explorer/${biz._id}`) }}
                    className="w-8 text-center text-slate-600 hover:text-amber-400 transition-colors" title="View profile">
                    <Eye size={14} />
                  </button>
                </div>

                {/* Expanded detail */}
                {expandedId === biz._id && (
                  <div className="px-10 py-3 bg-slate-950/50 border-t border-slate-800/30 space-y-2 animate-fade-in">
                    {biz._recruitReasons?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Why this prospect scores well</p>
                        <div className="flex flex-wrap gap-1.5">
                          {biz._recruitReasons.map((r, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green-950/30 text-green-400 border border-green-900/20">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      {biz.phone && <span className="flex items-center gap-1"><Phone size={10} /> {biz.phone}</span>}
                      {(biz.website_url || biz.website) && (
                        <a href={biz.website_url || biz.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                          <Globe size={10} /> website
                          {biz._websiteUnverified && (
                            <AlertTriangle size={10} className="text-amber-400"
                              title="Website not verified to this business" />
                          )}
                        </a>
                      )}
                      {biz.formatted_address && <span className="flex items-center gap-1"><MapPin size={10} /> {biz.formatted_address}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty */}
          {paginated.length === 0 && (
            <div className="py-12 text-center text-slate-600 text-sm">No prospects match filters</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">Page {page + 1} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(0, page - 5))} disabled={page === 0}
                  title="Back 5 pages"
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400"><ChevronsLeft size={16} /></button>
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400"><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                  if (p >= totalPages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-2 py-0.5 rounded text-[11px] ${p === page ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-slate-800'} transition-colors`}>
                      {p + 1}
                    </button>
                  )
                })}
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400"><ChevronRight size={16} /></button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 5))} disabled={page >= totalPages - 1}
                  title="Forward 5 pages"
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400"><ChevronsRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  )
}
