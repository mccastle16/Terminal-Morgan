import { useState, useEffect, useMemo } from 'react'
import {
  FlaskConical, TrendingUp, AlertTriangle, ArrowUpRight, ChevronDown,
  BarChart3, Activity, Target, Search,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, CartesianGrid,
} from 'recharts'
import { VGRADIENTS, HGRADIENTS, ChartTooltip, axisTick, axisTickLabel, barCursor } from '../components/ChartTheme'

const COMPONENT_COLORS = {
  rating: '#f59e0b',
  visibility: '#3b82f6',
  trust: '#10b981',
  network: '#a855f7',
}

export default function ExperimentLabPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTreatment, setSelectedTreatment] = useState(null)

  useEffect(() => {
    fetch('/data/experiment_results.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const treatments = useMemo(() => {
    if (!data?.treatment_effects) return []
    return Object.entries(data.treatment_effects).map(([key, t]) => ({
      key, ...t,
      effective: t.mu_delta > 0 && t.success_rate > 0.5,
    })).sort((a, b) => b.mu_delta - a.mu_delta)
  }, [data])

  const filteredBiz = useMemo(() => {
    if (!data?.businesses) return []
    const q = searchQuery.toLowerCase()
    return data.businesses
      .filter(b => !q || b.business_name?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q))
      .sort((a, b) => b.bhs - a.bhs)
  }, [data, searchQuery])

  const bizDetail = useMemo(() => {
    if (!selectedBiz || !data?.businesses) return null
    return data.businesses.find(b => b.business_id === selectedBiz)
  }, [selectedBiz, data])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="text-center py-24">
      <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-300">Failed to load experiment data</h2>
      <p className="text-sm text-slate-500 mt-1">{error}</p>
    </div>
  )

  const bhs = data.bhs_distribution
  const config = data.config

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
            <FlaskConical size={16} className="text-violet-400" />
          </div>
          Experiment Lab
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Monte Carlo simulation — {config.n_paths.toLocaleString()} paths, {config.horizon_months}-month horizon
        </p>
      </div>

      {/* BHS Distribution Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Mean BHS', value: bhs.mean.toFixed(1), color: 'text-white' },
          { label: 'Std Dev', value: `±${bhs.std.toFixed(1)}`, color: 'text-slate-400' },
          { label: 'P10', value: bhs.p10.toFixed(1), color: 'text-red-400' },
          { label: 'Median', value: bhs.p50.toFixed(1), color: 'text-amber-400' },
          { label: 'P90', value: bhs.p90.toFixed(1), color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Treatment Effects */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Activity size={14} className="text-blue-400" />
          </div>
          Treatment Effects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {treatments.map(t => (
            <button key={t.key} onClick={() => setSelectedTreatment(selectedTreatment === t.key ? null : t.key)}
              className={`text-left bg-slate-800/60 rounded-lg border p-4 transition-all ${
                selectedTreatment === t.key ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 hover:border-slate-600'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-slate-200 text-sm">{t.action_name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  t.effective ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {t.effective ? 'Effective' : 'Weak'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.description}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className={`text-sm font-semibold ${t.mu_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.mu_delta > 0 ? '+' : ''}{t.mu_delta.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-slate-600">Δ BHS</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">{(t.success_rate * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-slate-600">Success</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">{t.n_treated.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-600">Treated</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: COMPONENT_COLORS[t.component] || '#6b7280' }} />
                <span className="text-[10px] text-slate-500 capitalize">{t.component}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Treatment Detail Bar */}
      {selectedTreatment && (() => {
        const t = data.treatment_effects[selectedTreatment]
        const chartData = [
          { name: 'Control', value: 0, fill: '#475569' },
          { name: 'Treated', value: t.mu_delta, fill: t.mu_delta > 0 ? '#10b981' : '#ef4444' },
        ]
        return (
          <div className="bg-slate-800/60 rounded-lg border border-slate-800 p-5">
            <h3 className="font-semibold text-white mb-1">{t.action_name}</h3>
            <p className="text-sm text-slate-400 mb-4">{t.description}</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <defs>{HGRADIENTS}</defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={axisTickLabel} width={70} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-3 text-xs text-slate-500">
              <span>σ = {t.sigma.toFixed(2)}</span>
              <span>n_treated = {t.n_treated}</span>
              <span>n_control = {t.n_control}</span>
            </div>
          </div>
        )
      })()}

      {/* Business Simulator */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Target size={14} className="text-amber-400" />
          </div>
          Business Paths ({data.businesses.length})
        </h2>
        <div className="relative mb-3 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search businesses..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBiz.slice(0, 12).map(b => {
            const isSelected = selectedBiz === b.business_id
            return (
              <button key={b.business_id} onClick={() => setSelectedBiz(isSelected ? null : b.business_id)}
                className={`text-left rounded-lg border p-4 transition-all ${
                  isSelected ? 'bg-amber-500/5 border-amber-500/40' : 'bg-slate-800/60 border-slate-800 hover:border-slate-600'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-200 text-sm truncate flex-1">{b.business_name}</h3>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-lg font-semibold ${b.bhs >= 60 ? 'text-emerald-400' : b.bhs >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {b.bhs.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500">BHS</span>
                  <span className="text-xs text-slate-600">|</span>
                  <span className="text-xs text-emerald-400">+{b.improvement_potential.toFixed(1)} potential</span>
                </div>
                <div className="flex gap-1.5">
                  {Object.entries(b.bhs_components).map(([k, v]) => (
                    <div key={k} className="flex-1">
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(v, 100)}%`, background: COMPONENT_COLORS[k] }} />
                      </div>
                      <p className="text-[9px] text-slate-600 mt-0.5 capitalize">{k}</p>
                    </div>
                  ))}
                </div>
                {b.q_recommendation && (
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <ArrowUpRight size={10} className="text-amber-400" /> {b.q_recommendation.best_action_name || b.q_recommendation.best_action || ''}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Business Trajectory */}
      {bizDetail && (
        <div className="bg-slate-800/60 rounded-lg border border-slate-800 p-5">
          <h3 className="font-semibold text-white mb-1">{bizDetail.business_name}</h3>
          <p className="text-sm text-slate-400 mb-4">
            {bizDetail.category} · {bizDetail.neighborhood || 'Coral Gables'} · BHS {bizDetail.bhs.toFixed(1)}
          </p>

          {/* Baseline Trajectory */}
          {bizDetail.baseline?.trajectory && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-2 font-medium">Baseline Trajectory (12 months)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bizDetail.baseline.trajectory}>
                    <defs>
                      <linearGradient id="bhsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#475569" tick={axisTick} tickFormatter={m => `M${m}`} />
                    <YAxis stroke="#475569" tick={axisTick} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="#475569" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="p90" stroke="none" fill="#475569" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="p50" stroke="#f59e0b" fill="url(#bhsGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Strategy Paths */}
          {bizDetail.paths && bizDetail.paths.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Top Strategy Paths</p>
              <div className="space-y-2">
                {bizDetail.paths.slice(0, 5).map((path, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/30">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-500'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate">
                        {path.action_name || path.actions?.join(' → ') || `Path ${i + 1}`}
                      </p>
                      {path.description && <p className="text-xs text-slate-500 truncate">{path.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${(path.empirical_delta || path.delta || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(path.empirical_delta || path.delta || 0) > 0 ? '+' : ''}{(path.empirical_delta || path.delta || 0).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-slate-600">Δ BHS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bandit Info */}
          {bizDetail.bandit?.arms && (
            <div className="mt-4 p-3 bg-slate-900/30 rounded-lg border border-slate-700/20">
              <p className="text-xs text-slate-500 font-medium mb-2">Thompson Sampling Bandit</p>
              <div className="flex flex-wrap gap-3">
                {bizDetail.bandit.arms.map((arm) => (
                  <div key={arm.action_id} className="text-xs text-slate-400">
                    <span className="text-slate-500">{arm.action_name || arm.action_id}:</span>{' '}
                    α={arm.alpha}, β={arm.beta}, chosen={arm.times_chosen}×
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
