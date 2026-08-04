import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import FilterBar from '../components/FilterBar'
import SavedFilters from '../components/SavedFilters'
import RoleGate from '../components/RoleGate'
import { MemberBadge, TrustBadge } from '../components/TrustBadge'
import {
  ArrowUpDown, ChevronUp, ChevronDown, Star, ExternalLink,
  Phone, Globe, MapPin, Download, Search, ChevronLeft, ChevronRight,
  Users, ShieldCheck, TrendingUp,
} from 'lucide-react'

const PAGE_SIZE = 50

const COLUMNS = [
  { key: 'business_name', label: 'Business', sortable: true, width: 'flex-1 min-w-[180px]' },
  { key: 'category_primary', label: 'Category', sortable: true, width: 'w-32' },
  { key: 'neighborhood_area', label: 'Neighborhood', sortable: true, width: 'w-28' },
  { key: '_rating', label: 'Rating', sortable: true, width: 'w-16 text-right' },
  { key: '_memberStatus', label: 'Member', sortable: true, width: 'w-24 text-center' },
  { key: '_validationTier', label: 'Validation', sortable: true, width: 'w-20 text-center' },
  { key: '_recruitScore', label: 'Recruit', sortable: true, width: 'w-16 text-right' },
]

export default function BrowsePage() {
  const { filteredBusinesses: businesses, filters, setFilters, stats } = useTerminalData()
  const { can } = useTerminalAuth()
  const navigate = useNavigate()

  const [sortKey, setSortKey] = useState('business_name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [searchLocal, setSearchLocal] = useState('')

  const toggleSort = useCallback((key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }, [sortKey])

  const sorted = useMemo(() => {
    const arr = [...businesses]
    arr.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string') av = av?.toLowerCase?.() ?? ''
      if (typeof bv === 'string') bv = bv?.toLowerCase?.() ?? ''
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [businesses, sortKey, sortDir])

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, page])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const exportCSV = useCallback(() => {
    if (!can('export_data')) return
    const headers = ['Business Name', 'Category', 'Neighborhood', 'Rating', 'Member Status', 'Validation', 'Recruit Score']
    const rows = sorted.map(b => [
      b.business_name, b.category_primary, b.neighborhood_area,
      b._rating, b._memberStatus, b._validationTier, b._recruitScore,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cgcc_directory_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sorted, can])

  const memberCount = stats?.members ?? 0
  const avgRating = sorted.length > 0
    ? (sorted.reduce((s, b) => s + (b._rating || 0), 0) / sorted.filter(b => b._rating > 0).length).toFixed(1)
    : '—'

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Search size={17} className="text-blue-400" />
            </div>
            Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {sorted.length.toLocaleString()} businesses {sorted.length !== stats?.total ? `(filtered from ${stats?.total?.toLocaleString()})` : ''}
          </p>
        </div>
        <RoleGate permission="export_data">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/50 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-800/80 transition-all border border-slate-800/60 hover:border-slate-700">
            <Download size={13} /> Export CSV
          </button>
        </RoleGate>
      </div>

      {/* Quick stats pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border border-slate-800/60 rounded-xl">
          <Users size={13} className="text-blue-400" />
          <span className="text-[11px] text-slate-500">Total</span>
          <span className="text-xs font-semibold text-white font-mono">{sorted.length.toLocaleString()}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border border-slate-800/60 rounded-xl">
          <ShieldCheck size={13} className="text-amber-400" />
          <span className="text-[11px] text-slate-500">Members</span>
          <span className="text-xs font-semibold text-amber-400 font-mono">{memberCount}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border border-slate-800/60 rounded-xl">
          <Star size={13} className="text-amber-500" />
          <span className="text-[11px] text-slate-500">Avg Rating</span>
          <span className="text-xs font-semibold text-white font-mono">{avgRating}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/40 border border-slate-800/60 rounded-xl">
          <TrendingUp size={13} className="text-emerald-400" />
          <span className="text-[11px] text-slate-500">Categories</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">{stats?.categories?.length ?? '—'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1"><FilterBar /></div>
        <SavedFilters />
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60 bg-slate-900/60 sticky top-0 z-10">
          {COLUMNS.map(col => (
            <button key={col.key} onClick={() => col.sortable && toggleSort(col.key)}
              className={`${col.width} flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                sortKey === col.key ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
              } ${col.sortable ? 'cursor-pointer' : ''} transition-colors`}>
              {col.label}
              {sortKey === col.key ? (
                sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
              ) : col.sortable ? <ArrowUpDown size={9} className="opacity-30" /> : null}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/30">
          {paginated.map(biz => (
            <div key={biz._id}
              onClick={() => navigate(`/explorer/${biz._id}`)}
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/30 cursor-pointer transition-all group">

              <div className="flex-1 min-w-[180px] flex items-center gap-3">
                {/* Initial avatar */}
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0 group-hover:border-slate-600 transition-colors">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                    {biz.business_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                    {biz.business_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-600">
                    {biz.formatted_address && <span className="flex items-center gap-0.5 truncate"><MapPin size={8} /> {biz.formatted_address?.slice(0, 30)}</span>}
                    {biz._hasPhone && <Phone size={8} className="text-green-800" />}
                    {biz._hasWebsite && <Globe size={8} className="text-blue-800" />}
                  </div>
                </div>
              </div>

              <div className="w-32">
                <span className="text-[11px] text-slate-500 truncate block">
                  {biz.category_primary?.replace(/_/g, ' ') ?? '—'}
                </span>
              </div>

              <div className="w-28">
                <span className="text-[11px] text-slate-500 truncate block">
                  {biz.neighborhood_area || '—'}
                </span>
              </div>

              <div className="w-16 text-right">
                {biz._rating > 0 ? (
                  <span className="text-[11px] text-slate-300 flex items-center justify-end gap-0.5">
                    <Star size={10} className="text-amber-500" />
                    {biz._rating.toFixed(1)}
                  </span>
                ) : <span className="text-[10px] text-slate-700">—</span>}
              </div>

              <div className="w-24 text-center">
                <MemberBadge status={biz._memberStatus} />
              </div>

              <div className="w-20 text-center">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${
                  biz._validationTier >= 3 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                  biz._validationTier >= 2 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                  'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  T{biz._validationTier}
                </span>
              </div>

              <div className="w-16 text-right">
                {biz._memberStatus !== 'member' ? (
                  <span className="text-[10px] font-medium"
                    style={{ color: biz._recruitBand?.color ?? '#475569' }}>
                    {biz._recruitScore}
                  </span>
                ) : <span className="text-[10px] text-slate-700">—</span>}
              </div>
            </div>
          ))}
        </div>

        {paginated.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3">
              <Search size={22} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">No businesses match the current filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-600">
              Page {page + 1} of {totalPages} · {sorted.length.toLocaleString()} results
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-500">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                if (p >= totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                      p === page ? 'bg-amber-500/15 border border-amber-500/25 text-amber-400' : 'text-slate-600 hover:bg-slate-800 hover:text-slate-400'
                    } transition-all`}>
                    {p + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-500">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
