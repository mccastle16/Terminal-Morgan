import { useState, useEffect, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Search, Filter, ChevronDown, ChevronUp, CheckCircle2, Circle,
  AlertTriangle, ArrowUpRight, TrendingUp, Target, Shield, Zap,
  Building2, ListChecks, BarChart3,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  growth:       { label: 'Growth',         color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', icon: TrendingUp },
  reputation:   { label: 'Reputation',     color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/25',    icon: Shield },
  visibility:   { label: 'Visibility',     color: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/25',  icon: Target },
  risk:         { label: 'Risk Mitigation',color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/25',     icon: AlertTriangle },
  data_quality: { label: 'Data Quality',   color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/25',   icon: Zap },
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/15',    dot: 'bg-red-400',    border: 'border-l-red-400' },
  high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/15', dot: 'bg-orange-400', border: 'border-l-orange-400' },
  medium: { label: 'Medium', color: 'text-amber-400',  bg: 'bg-amber-500/15',  dot: 'bg-amber-400',  border: 'border-l-amber-400' },
  low:    { label: 'Low',    color: 'text-green-400',  bg: 'bg-green-500/15',  dot: 'bg-green-400',  border: 'border-l-green-400' },
}

/* ── Progress Ring ── */
function ProgressRing({ percent, size = 72, strokeWidth = 6 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-800" />
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#playbook-pg)" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs>
          <linearGradient id="playbook-pg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white font-mono">{percent}%</span>
      </div>
    </div>
  )
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, color = 'slate' }) {
  const palette = {
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
    slate:   'bg-slate-800/60 border-slate-700/50 text-slate-400',
  }
  const iconBg = {
    blue:    'bg-blue-500/15 border-blue-500/25',
    emerald: 'bg-emerald-500/15 border-emerald-500/25',
    amber:   'bg-amber-500/15 border-amber-500/25',
    purple:  'bg-purple-500/15 border-purple-500/25',
    slate:   'bg-slate-800 border-slate-700',
  }
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/80 transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBg[color]}`}>
          <Icon size={16} className={palette[color]?.split(' ').pop()} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-semibold text-white font-mono">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function GoToActionsPage() {
  const { rawBusinesses } = useTerminalData()
  const [playbook, setPlaybook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [expandedBusiness, setExpandedBusiness] = useState(null)
  const [completedActions, setCompletedActions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('terminal_playbook_completed') || '{}') } catch { return {} }
  })

  useEffect(() => {
    fetch('/data/action_playbook.json')
      .then(res => { if (!res.ok) throw new Error('Failed to load'); return res.json() })
      .then(data => { setPlaybook(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const toggleAction = (bizId, actionIdx) => {
    setCompletedActions(prev => {
      const key = `${bizId}_${actionIdx}`
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('terminal_playbook_completed', JSON.stringify(next))
      return next
    })
  }

  const enrichedPlaybook = useMemo(() => {
    if (!playbook?.playbook) return []
    return playbook.playbook.map(entry => {
      const match = rawBusinesses.find(b =>
        b.business_name?.toLowerCase() === entry.business_name?.toLowerCase() ||
        b._id === entry.business_id
      )
      return { ...entry, matchedBiz: match || null }
    })
  }, [playbook, rawBusinesses])

  const filtered = useMemo(() => {
    let items = enrichedPlaybook
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(e =>
        e.business_name?.toLowerCase().includes(q) ||
        e.actions?.some(a => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q))
      )
    }
    if (selectedCategory) items = items.filter(e => e.actions?.some(a => a.category === selectedCategory))
    if (selectedPriority) items = items.filter(e => e.actions?.some(a => a.priority === selectedPriority))
    return items
  }, [enrichedPlaybook, searchQuery, selectedCategory, selectedPriority])

  const totalActions = enrichedPlaybook.reduce((sum, e) => sum + (e.actions?.length || 0), 0)
  const totalCompleted = Object.values(completedActions).filter(Boolean).length
  const progressPct = totalActions > 0 ? Math.round((totalCompleted / totalActions) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-300 mb-2">Failed to load playbook</h2>
      <p className="text-sm text-slate-500">{error}</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HEADER with Progress Ring ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Zap size={18} className="text-amber-400" />
              </div>
              Action Playbook
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">Strategic actions for every business in the ecosystem</p>
          </div>
          <ProgressRing percent={progressPct} />
        </div>
      </div>

      {/* ═══ STATS ROW ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Businesses" value={enrichedPlaybook.length} color="blue" />
        <StatCard icon={ListChecks} label="Total Actions" value={totalActions} color="purple" />
        <StatCard icon={CheckCircle2} label="Completed" value={totalCompleted} color="emerald" />
        <StatCard icon={BarChart3} label="Progress" value={`${progressPct}%`} color="amber" />
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search businesses or actions..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/50 border border-slate-800/60 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all" />
        </div>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2.5 bg-slate-900/50 border border-slate-800/60 rounded-xl text-sm text-slate-300 outline-none focus:border-amber-500/50 transition-all">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}
          className="px-3 py-2.5 bg-slate-900/50 border border-slate-800/60 rounded-xl text-sm text-slate-300 outline-none focus:border-amber-500/50 transition-all">
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* ═══ BUSINESS ACTION LIST ═══ */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <Filter size={28} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-400 mb-1">No actions match your filters</h3>
            <p className="text-sm text-slate-600">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {filtered.map((entry) => {
          const isExpanded = expandedBusiness === entry.business_name
          const actions = entry.actions || []
          const completedCount = actions.filter((_, i) =>
            completedActions[`${entry.business_id || entry.business_name}_${i}`]
          ).length
          const pct = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0

          return (
            <div key={entry.business_name}
              className="bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all">
              <button onClick={() => setExpandedBusiness(isExpanded ? null : entry.business_name)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-800/20 transition-colors">

                {/* Initial avatar */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-slate-400">
                    {entry.business_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-200 truncate">{entry.business_name}</h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                    {(entry.category_primary || entry.matchedBiz?.category_primary || 'uncategorized').replace(/_/g, ' ')}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-300">{completedCount}<span className="text-slate-600">/{actions.length}</span></span>
                    <p className="text-[10px] text-slate-600">actions</p>
                  </div>
                  <div className="w-28 space-y-1">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100  ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #10b981)',
                        }} />
                    </div>
                    <p className="text-[9px] text-slate-600 text-right">{pct}%</p>
                  </div>
                  <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={16} className="text-slate-500" />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-800/40 p-4 space-y-3 bg-slate-950/20">
                  {actions.map((action, i) => {
                    const key = `${entry.business_id || entry.business_name}_${i}`
                    const done = completedActions[key]
                    const catConf = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.growth
                    const priConf = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium
                    const CatIcon = catConf.icon

                    return (
                      <div key={i}
                        className={`relative rounded-xl p-4 border-l-[3px] border transition-all ${
                          done
                            ? 'bg-emerald-500/5 border-emerald-500/20 border-l-emerald-500/50'
                            : 'bg-slate-900/60 border-slate-800/50 hover:border-slate-700/60 ' + (priConf.border || 'border-l-slate-600')
                        }`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleAction(entry.business_id || entry.business_name, i)}
                            className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
                            {done
                              ? <CheckCircle2 size={20} className="text-emerald-400" />
                              : <Circle size={20} className="text-slate-600 hover:text-slate-400 transition-colors" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h4 className={`font-medium text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {action.title}
                              </h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${catConf.bg} ${catConf.color} ${catConf.border}`}>
                                <CatIcon size={10} /> {catConf.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800/60 border border-slate-700/50`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priConf.dot}`} />
                                <span className={priConf.color}>{priConf.label}</span>
                              </span>
                            </div>
                            {action.description && (
                              <p className={`text-xs leading-relaxed ${done ? 'text-slate-600' : 'text-slate-400'}`}>
                                {action.description}
                              </p>
                            )}
                            {action.steps && action.steps.length > 0 && (
                              <div className="mt-3 space-y-1.5 pl-1">
                                {action.steps.map((step, si) => (
                                  <div key={si} className="flex items-start gap-2 text-xs text-slate-500">
                                    <ArrowUpRight size={10} className="mt-0.5 text-slate-600 flex-shrink-0" />
                                    <span className={done ? 'line-through text-slate-700' : ''}>{step}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
