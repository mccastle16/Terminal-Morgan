import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import FilterBar from '../components/FilterBar'
import RoleGate from '../components/RoleGate'
import { MemberBadge, TrustBadge } from '../components/TrustBadge'
import {
  ArrowUpDown, ChevronUp, ChevronDown, Star, ExternalLink,
  Phone, Globe, MapPin, Download, Search, ChevronLeft, ChevronRight,
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Business Directory</h1>
          <p className="text-sm text-slate-500">
            {sorted.length.toLocaleString()} businesses {sorted.length !== stats?.total ? `(filtered from ${stats?.total?.toLocaleString()})` : ''}
          </p>
        </div>
        <RoleGate permission="export_data">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-500/20 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </RoleGate>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Table */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700/60 transition-colors">
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60 bg-slate-800/20 sticky top-0 z-10">
          {COLUMNS.map(col => (
            <button key={col.key} onClick={() => col.sortable && toggleSort(col.key)}
              className={`${col.width} flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                sortKey === col.key ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              } ${col.sortable ? 'cursor-pointer' : ''} transition-colors`}>
              {col.label}
              {sortKey === col.key ? (
                sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
              ) : col.sortable ? <ArrowUpDown size={9} className="opacity-30" /> : null}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/50">
          {paginated.map(biz => (
            <div key={biz._id}
              onClick={() => navigate(`/terminal/explorer/${biz._id}`)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800/40 cursor-pointer transition-colors group">

              {/* Business name */}
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs text-slate-200 font-medium truncate group-hover:text-amber-400 transition-colors">
                  {biz.business_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-600">
                  {biz.formatted_address && <span className="flex items-center gap-0.5 truncate"><MapPin size={8} /> {biz.formatted_address?.slice(0, 30)}</span>}
                  {biz._hasPhone && <Phone size={8} className="text-green-700" />}
                  {biz._hasWebsite && <Globe size={8} className="text-blue-700" />}
                </div>
              </div>

              {/* Category */}
              <div className="w-32">
                <span className="text-[11px] text-slate-400 truncate block">
                  {biz.category_primary?.replace(/_/g, ' ') ?? '—'}
                </span>
              </div>

              {/* Neighborhood */}
              <div className="w-28">
                <span className="text-[11px] text-slate-400 truncate block">
                  {biz.neighborhood_area || '—'}
                </span>
              </div>

              {/* Rating */}
              <div className="w-16 text-right">
                {biz._rating > 0 ? (
                  <span className="text-[11px] text-slate-300 flex items-center justify-end gap-0.5">
                    <Star size={10} className="text-amber-500" />
                    {biz._rating.toFixed(1)}
                  </span>
                ) : <span className="text-[10px] text-slate-700">—</span>}
              </div>

              {/* Member Status */}
              <div className="w-24 text-center">
                <MemberBadge status={biz._memberStatus} />
              </div>

              {/* Validation */}
              <div className="w-20 text-center">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  biz._validationTier >= 3 ? 'text-green-400 bg-green-950/40' :
                  biz._validationTier >= 2 ? 'text-yellow-400 bg-yellow-950/40' :
                  'text-red-400 bg-red-950/40'
                }`}>
                  T{biz._validationTier}
                </span>
              </div>

              {/* Recruit Score */}
              <div className="w-16 text-right">
                {biz._memberStatus !== 'member' ? (
                  <span className="text-[10px] font-mono font-bold"
                    style={{ color: biz._recruitBand?.color ?? '#64748b' }}>
                    {biz._recruitScore}
                  </span>
                ) : <span className="text-[10px] text-slate-700">—</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="py-12 text-center text-slate-600 text-sm">
            No businesses match the current filters
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500">
              Page {page + 1} of {totalPages} · {sorted.length.toLocaleString()} results
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                if (p >= totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      p === page ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-slate-800'
                    } transition-colors`}>
                    {p + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors text-slate-400">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
