import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import {
  HelpCircle, CheckCircle, Users, Building2, ChevronRight,
  Search, Filter, Star, ArrowRight, AlertTriangle,
  UserCheck, UserX, ClipboardList, BarChart3,
} from 'lucide-react'

export default function MembershipResolutionPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { can } = useTerminalAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('')
  const [resolutions, setResolutions] = useState(() => {
    const saved = localStorage.getItem('terminal_membership_resolutions')
    return saved ? JSON.parse(saved) : {}
  })
  const [sortBy, setSortBy] = useState('rating')

  const unknowns = useMemo(() => {
    let data = rawBusinesses.filter(b => b._memberStatus === 'unknown')
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(b =>
        b.business_name?.toLowerCase().includes(q) ||
        b.category_primary?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter) data = data.filter(b => b.category_primary === categoryFilter)
    if (neighborhoodFilter) data = data.filter(b => b.neighborhood_area === neighborhoodFilter)

    if (sortBy === 'rating') data = [...data].sort((a, b) => b._rating - a._rating)
    else if (sortBy === 'confidence') data = [...data].sort((a, b) => b._confidence - a._confidence)
    else if (sortBy === 'name') data = [...data].sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''))

    return data
  }, [rawBusinesses, searchQuery, categoryFilter, neighborhoodFilter, sortBy])

  const resolvedCount = Object.keys(resolutions).length
  const resolvedAsMembers = Object.values(resolutions).filter(v => v === 'member').length
  const resolvedAsNon = Object.values(resolutions).filter(v => v === 'non-member').length

  const handleResolve = (bizId, status) => {
    setResolutions(prev => {
      const next = { ...prev }
      if (next[bizId] === status) delete next[bizId] // toggle off
      else next[bizId] = status
      localStorage.setItem('terminal_membership_resolutions', JSON.stringify(next))
      return next
    })
  }

  const unknownCategories = useMemo(() => {
    const cats = {}
    rawBusinesses.filter(b => b._memberStatus === 'unknown').forEach(b => {
      const cat = b.category_primary || 'other'
      cats[cat] = (cats[cat] || 0) + 1
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1])
  }, [rawBusinesses])

  return (
    <RoleGate permission="view_member_status" blur>
      <div className="space-y-6 animate-fade-in">
        {/* ═══ HERO ═══ */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                  <HelpCircle size={20} className="text-orange-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Membership Resolution</h1>
                  <p className="text-slate-400 text-sm">
                    {stats?.unknowns || 0} businesses with unknown membership status — resolve to strengthen penetration metrics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs font-medium text-orange-400">
                  {(stats?.unknowns || 0) - resolvedCount} Remaining
                </span>
                {resolvedCount > 0 && (
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-400">
                    {resolvedCount} Resolved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Unknown', value: stats?.unknowns || 0, icon: HelpCircle, iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Resolved', value: resolvedCount, icon: CheckCircle, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Flagged Member', value: resolvedAsMembers, icon: UserCheck, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Flagged Non-Member', value: resolvedAsNon, icon: UserX, iconColor: 'text-slate-400', iconBg: 'bg-slate-500/10 border-slate-500/20' },
          ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
            <div key={label} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/60 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${iconBg}`}>
                  <Icon size={13} className={iconColor} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{value}</p>
            </div>
          ))}
        </div>

        {/* ═══ IMPACT BANNER ═══ */}
        <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl p-4 flex items-center gap-4">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">
              Current known membership rate: {stats ? ((stats.members / (stats.members + stats.nonMembers)) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-slate-400">
              Resolving all {stats?.unknowns || 0} unknowns could shift penetration by up to {stats ? ((stats.unknowns / stats.total) * 100).toFixed(1) : 0} percentage points
            </p>
          </div>
        </div>

        {/* ═══ FILTERS ═══ */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="text" placeholder="Search businesses..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg text-slate-300 placeholder:text-slate-700 focus:border-amber-500/50 outline-none" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
            <option value="">All Categories</option>
            {unknownCategories.map(([cat, count]) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')} ({count})</option>
            ))}
          </select>
          <select value={neighborhoodFilter} onChange={(e) => setNeighborhoodFilter(e.target.value)}
            className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
            <option value="">All Neighborhoods</option>
            {stats?.neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
            <option value="rating">Sort: Rating</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="name">Sort: Name</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{unknowns.length} shown</span>
        </div>

        {/* ═══ BUSINESS LIST ═══ */}
        <div className="space-y-2">
          {unknowns.slice(0, 50).map(biz => {
            const resolved = resolutions[biz._id]
            return (
              <div key={biz._id}
                className={`relative bg-slate-900/40 rounded-xl border-l-[3px] border transition-all overflow-hidden ${
                  resolved === 'member' ? 'border-l-amber-500 border-amber-500/20 bg-amber-500/[0.02]' :
                  resolved === 'non-member' ? 'border-l-slate-500 border-slate-600/30 bg-slate-800/20' :
                  'border-l-orange-500/40 border-slate-800/60 hover:border-slate-700/80'
                }`}>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-slate-400">{biz.business_name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/explorer/${biz._id}`)}
                      className="font-semibold text-sm text-white hover:text-amber-400 transition-colors truncate block">
                      {biz.business_name}
                    </button>
                    <p className="text-[11px] text-slate-500 capitalize truncate">
                      {biz.category_primary?.replace(/_/g, ' ')} · {biz.neighborhood_area || 'Coral Gables'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {biz._rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Star size={10} className="fill-amber-400" /> {biz._rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 font-mono">{(biz._confidence * 100).toFixed(0)}%</span>
                  </div>

                  {/* Resolution buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleResolve(biz._id, 'member')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        resolved === 'member'
                          ? 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                          : 'border-slate-700/50 text-slate-600 hover:text-amber-400 hover:border-amber-500/30'
                      }`}>
                      <UserCheck size={12} />
                    </button>
                    <button onClick={() => handleResolve(biz._id, 'non-member')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        resolved === 'non-member'
                          ? 'bg-slate-600/20 border-slate-500/30 text-slate-300'
                          : 'border-slate-700/50 text-slate-600 hover:text-slate-300 hover:border-slate-500/30'
                      }`}>
                      <UserX size={12} />
                    </button>
                  </div>

                  <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />
                </div>
              </div>
            )
          })}
          {unknowns.length > 50 && (
            <p className="text-center text-xs text-slate-600 py-4">
              Showing 50 of {unknowns.length} — use filters to narrow
            </p>
          )}
          {unknowns.length === 0 && (
            <div className="text-center py-16">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold">All Resolved</p>
              <p className="text-xs text-slate-500 mt-1">No unknowns match the current filters</p>
            </div>
          )}
        </div>

        {/* ═══ CATEGORY BREAKDOWN ═══ */}
        <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500/40" />
          <div className="p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <BarChart3 size={13} className="text-orange-400" />
              </div>
              Unknown by Category
            </h3>
            <div className="space-y-2">
              {unknownCategories.slice(0, 10).map(([cat, count]) => {
                const pct = ((count / (stats?.unknowns || 1)) * 100).toFixed(1)
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-36 truncate capitalize">{cat.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right font-mono">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  )
}
