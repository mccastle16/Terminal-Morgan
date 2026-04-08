import { useState, useEffect, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Search, Filter, ChevronDown, ChevronUp, CheckCircle2, Circle,
  AlertTriangle, ArrowUpRight, TrendingUp, Target, Shield, Zap,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  growth: { label: 'Growth', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: TrendingUp },
  reputation: { label: 'Reputation', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Shield },
  visibility: { label: 'Visibility', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Target },
  risk: { label: 'Risk Mitigation', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
  data_quality: { label: 'Data Quality', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Zap },
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/20', dot: 'bg-red-400' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20', dot: 'bg-orange-400' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/20', dot: 'bg-amber-400' },
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20', dot: 'bg-green-400' },
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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="text-center py-24">
      <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-300 mb-2">Failed to load playbook</h2>
      <p className="text-slate-500">{error}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Action Playbook</h1>
        <p className="text-slate-400">Strategic actions for every business in the ecosystem</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-slate-500">Businesses</p>
          <p className="text-2xl font-bold text-white">{enrichedPlaybook.length}</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-slate-500">Total Actions</p>
          <p className="text-2xl font-bold text-white">{totalActions}</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{totalCompleted}</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-slate-500">Progress</p>
          <p className="text-2xl font-bold text-amber-400">
            {totalActions > 0 ? Math.round((totalCompleted / totalActions) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search businesses or actions..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
        </div>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300">
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <Filter size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400">No actions match your filters</h3>
          </div>
        )}

        {filtered.map((entry) => {
          const isExpanded = expandedBusiness === entry.business_name
          const actions = entry.actions || []
          const completedCount = actions.filter((_, i) =>
            completedActions[`${entry.business_id || entry.business_name}_${i}`]
          ).length

          return (
            <div key={entry.business_name} className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <button onClick={() => setExpandedBusiness(isExpanded ? null : entry.business_name)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-700/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-200 truncate">{entry.business_name}</h3>
                  <p className="text-xs text-slate-500 capitalize">{(entry.category_primary || entry.matchedBiz?.category_primary || 'uncategorized').replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm text-slate-400">{completedCount}/{actions.length}</span>
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${actions.length > 0 ? (completedCount / actions.length) * 100 : 0}%` }} />
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700/30 p-4 space-y-3">
                  {actions.map((action, i) => {
                    const key = `${entry.business_id || entry.business_name}_${i}`
                    const done = completedActions[key]
                    const catConf = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.growth
                    const priConf = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium
                    const CatIcon = catConf.icon

                    return (
                      <div key={i} className={`rounded-lg p-4 border transition-all ${
                        done ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900/60 border-slate-700/30 hover:border-slate-600'
                      }`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleAction(entry.business_id || entry.business_name, i)}
                            className="mt-0.5 flex-shrink-0">
                            {done ? <CheckCircle2 size={20} className="text-emerald-400" />
                              : <Circle size={20} className="text-slate-600 hover:text-slate-400" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className={`font-medium text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {action.title}
                              </h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${catConf.bg} ${catConf.color}`}>
                                <CatIcon size={10} /> {catConf.label}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700/50">
                                <span className={`w-1.5 h-1.5 rounded-full ${priConf.dot}`} />
                                <span className={priConf.color}>{priConf.label}</span>
                              </span>
                            </div>
                            {action.description && (
                              <p className={`text-xs ${done ? 'text-slate-600' : 'text-slate-400'}`}>{action.description}</p>
                            )}
                            {action.steps && action.steps.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {action.steps.map((step, si) => (
                                  <div key={si} className="flex items-start gap-2 text-xs text-slate-500">
                                    <ArrowUpRight size={10} className="mt-0.5 text-slate-600 flex-shrink-0" />
                                    <span>{step}</span>
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
