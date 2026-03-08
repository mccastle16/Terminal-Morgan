import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  FlaskConical, TrendingUp, DollarSign, Clock, Shield,
  ChevronDown, ChevronRight, Zap, Target, BarChart3,
  Percent, AlertTriangle, CheckCircle2, ArrowUpRight,
  Brain, Dices, Activity,
} from 'lucide-react'

// ─── Dollar formatter ──────────────────────────────────────────
const fmt = (v) => {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const pct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'

// ─── Color palette ─────────────────────────────────────────────
const COLORS = {
  growth: '#10b981',
  visibility: '#3b82f6',
  reputation: '#f59e0b',
  risk: '#ef4444',
  data_quality: '#8b5cf6',
}

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#6b7280',
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ExperimentLabPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)
  const [view, setView] = useState('overview') // overview | detail | bandit

  useEffect(() => {
    fetch('/data/experiment_results.json')
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (d.businesses?.length) setSelectedBiz(d.businesses[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (!data) return <Error msg="Could not load experiment data" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-indigo-600" />
            Experiment Lab
          </h1>
          <p className="text-gray-500 mt-1">
            Monte Carlo simulation · Thompson Sampling · Q-Learning
          </p>
        </div>
        <div className="flex gap-2">
          {['overview', 'detail', 'bandit'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {v === 'overview' ? 'Overview' : v === 'detail' ? 'Deep Dive' : 'MAB Tracker'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <SummaryStrip data={data} />

      {/* Business selector */}
      <BusinessSelector
        businesses={data.businesses}
        selected={selectedBiz}
        onSelect={(b) => { setSelectedBiz(b); setSelectedAction(null) }}
      />

      {/* Views */}
      {view === 'overview' && selectedBiz && (
        <OverviewPanel biz={selectedBiz} config={data.config} />
      )}
      {view === 'detail' && selectedBiz && (
        <DetailPanel
          biz={selectedBiz}
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
        />
      )}
      {view === 'bandit' && selectedBiz && (
        <BanditPanel biz={selectedBiz} qLearning={data.q_learning} />
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY STRIP
// ═══════════════════════════════════════════════════════════════
function SummaryStrip({ data }) {
  const s = data.summary
  const cards = [
    { label: 'Businesses', value: s.total_businesses, icon: Target, color: 'text-blue-600' },
    { label: 'Strategies Simulated', value: s.total_actions, icon: FlaskConical, color: 'text-indigo-600' },
    { label: 'Avg Expected Profit', value: fmt(s.avg_expected_value), icon: DollarSign, color: 'text-emerald-600' },
    { label: 'Avg P(Profit > 0)', value: pct(s.avg_probability_positive), icon: Percent, color: 'text-amber-600' },
    { label: 'Best Strategy', value: s.best_action?.slice(0, 30), icon: TrendingUp, color: 'text-green-600', sub: fmt(s.best_ev) },
    { label: 'Highest Risk', value: s.riskiest_action?.slice(0, 30), icon: AlertTriangle, color: 'text-red-600', sub: `VaR ${fmt(s.worst_var95)}` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <c.icon className={`w-4 h-4 ${c.color}`} />
            <span className="text-xs text-gray-500 truncate">{c.label}</span>
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">{c.value}</div>
          {c.sub && <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// BUSINESS SELECTOR
// ═══════════════════════════════════════════════════════════════
function BusinessSelector({ businesses, selected, onSelect }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-indigo-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">{selected?.business_name || 'Select business'}</div>
            <div className="text-xs text-gray-500">
              {selected && `${selected.pkp_type} · ★${selected.rating} · ${selected.neighborhood || 'Coral Gables'}`}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-72 overflow-y-auto">
          {businesses.map((b, i) => {
            const ev = b.simulations.reduce((s, a) => s + a.expected_value, 0)
            return (
              <button key={i}
                onClick={() => { onSelect(b); setOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0 ${
                  selected?.business_id === b.business_id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">{b.business_name}</div>
                  <div className="text-xs text-gray-500">{b.pkp_type} · ★{b.rating} · {b.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-600">{fmt(ev)}</div>
                  <div className="text-xs text-gray-400">total E[V]</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// OVERVIEW PANEL — Fan charts + action comparison
// ═══════════════════════════════════════════════════════════════
function OverviewPanel({ biz, config }) {
  const sorted = useMemo(() =>
    [...biz.simulations].sort((a, b) => b.expected_value - a.expected_value),
    [biz]
  )

  return (
    <div className="space-y-6">
      {/* Action cards grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {sorted.map((sim, i) => (
          <ActionCard key={i} sim={sim} rank={i + 1} />
        ))}
      </div>

      {/* Combined fan chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Projected Cumulative Profit — All Actions</h3>
        <p className="text-xs text-gray-500 mb-4">
          Monte Carlo fan chart (P10–P90) over {config.horizon_months} months · {config.n_paths.toLocaleString()} simulation paths
        </p>
        <CombinedFanChart simulations={biz.simulations} />
      </div>

      {/* Comparison bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Strategy Comparison</h3>
        <ComparisonBars simulations={sorted} />
      </div>
    </div>
  )
}


// ─── Action Card ───────────────────────────────────────────────
function ActionCard({ sim, rank }) {
  const catColor = COLORS[sim.category] || '#6b7280'
  const priColor = PRIORITY_COLORS[sim.priority] || '#6b7280'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
            {rank}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: catColor + '20', color: catColor }}>
            {sim.category}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: priColor + '20', color: priColor }}>
            {sim.priority}
          </span>
        </div>
      </div>

      <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{sim.title}</h4>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Metric label="E[Profit]" value={fmt(sim.expected_value)} icon={DollarSign} good />
        <Metric label="P(Profit>0)" value={pct(sim.probability_positive)} icon={CheckCircle2} good />
        <Metric label="Breakeven" value={sim.breakeven_month ? `${sim.breakeven_month}mo` : '—'} icon={Clock} />
        <Metric label="VaR 95" value={fmt(sim.var_95)} icon={Shield}
          good={sim.var_95 > 0} bad={sim.var_95 < 0} />
      </div>

      {/* Mini fan chart */}
      <div className="h-24 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sim.trajectory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${sim.action_id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={catColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={catColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="p90" stroke="none" fill={catColor} fillOpacity={0.1} />
            <Area type="monotone" dataKey="p75" stroke="none" fill={catColor} fillOpacity={0.15} />
            <Area type="monotone" dataKey="p50" stroke={catColor} strokeWidth={2} fill={`url(#grad-${sim.action_id})`} />
            <Area type="monotone" dataKey="p25" stroke="none" fill="transparent" />
            <Area type="monotone" dataKey="p10" stroke="none" fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>Cost: {sim.cost_estimate}</span>
        <span>Time savings: {sim.time_savings_monthly_hrs > 0 ? `+${sim.time_savings_monthly_hrs}h/mo` : `${sim.time_savings_monthly_hrs}h/mo`}</span>
      </div>
    </div>
  )
}


// ─── Small metric ──────────────────────────────────────────────
function Metric({ label, value, icon: Icon, good, bad }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${good ? 'text-emerald-500' : bad ? 'text-red-500' : 'text-gray-400'}`} />
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className={`text-sm font-semibold ${good ? 'text-emerald-700' : bad ? 'text-red-600' : 'text-gray-700'}`}>{value}</div>
      </div>
    </div>
  )
}


// ─── Combined fan chart ────────────────────────────────────────
function CombinedFanChart({ simulations }) {
  // Build per-action trajectory data
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart margin={{ top: 10, right: 30, bottom: 0, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            type="number"
            domain={[1, 12]}
            ticks={[1, 3, 6, 9, 12]}
            tickFormatter={(v) => `M${v}`}
          />
          <YAxis tickFormatter={(v) => fmt(v)} />
          <Tooltip
            formatter={(v, name) => [fmt(v), name]}
            labelFormatter={(v) => `Month ${v}`}
          />
          {simulations.map((sim, i) => {
            const c = colors[i % colors.length]
            return (
              <Area
                key={sim.action_id}
                data={sim.trajectory}
                type="monotone"
                dataKey="p50"
                name={sim.title.slice(0, 35)}
                stroke={c}
                strokeWidth={2}
                fill={c}
                fillOpacity={0.1}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


// ─── Comparison bar chart ──────────────────────────────────────
function ComparisonBars({ simulations }) {
  const barData = simulations.map(s => ({
    name: s.title.length > 30 ? s.title.slice(0, 28) + '…' : s.title,
    expected: s.expected_value,
    var95: s.var_95,
    category: s.category,
  }))

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v) => fmt(v)} />
          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Bar dataKey="expected" name="E[Profit]" radius={[0, 4, 4, 0]}>
            {barData.map((d, i) => (
              <Cell key={i} fill={COLORS[d.category] || '#6366f1'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// DETAIL PANEL — Deep dive into one action
// ═══════════════════════════════════════════════════════════════
function DetailPanel({ biz, selectedAction, onSelectAction }) {
  const action = selectedAction || biz.simulations[0]

  return (
    <div className="space-y-4">
      {/* Action tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {biz.simulations.map((sim, i) => (
          <button key={i}
            onClick={() => onSelectAction(sim)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (selectedAction?.action_id || biz.simulations[0].action_id) === sim.action_id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {sim.title.slice(0, 35)}
          </button>
        ))}
      </div>

      {/* Main fan chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{action.title}</h3>
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (COLORS[action.category] || '#6366f1') + '20', color: COLORS[action.category] || '#6366f1' }}>
                {action.category}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: (PRIORITY_COLORS[action.priority] || '#6b7280') + '20', color: PRIORITY_COLORS[action.priority] || '#6b7280' }}>
                {action.priority}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{fmt(action.expected_value)}</div>
            <div className="text-xs text-gray-500">expected cumulative profit</div>
          </div>
        </div>

        <FanChart trajectory={action.trajectory} color={COLORS[action.category] || '#6366f1'} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Monthly Drift (μ)" value={`${(action.params.mu * 100).toFixed(2)}%`} sub="revenue growth/mo" icon={TrendingUp} />
        <StatBox label="Volatility (σ)" value={`${(action.params.sigma * 100).toFixed(2)}%`} sub="monthly std dev" icon={Activity} />
        <StatBox label="Base Revenue" value={fmt(action.params.base_revenue)} sub="estimated monthly" icon={DollarSign} />
        <StatBox label="Monthly Cost" value={fmt(action.params.monthly_cost)} sub="implementation" icon={ArrowUpRight} />
      </div>

      {/* Percentile table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-900 mb-3">Cumulative Profit Distribution</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Percentile</th>
                <th className="text-right py-2 text-gray-500 font-medium">Cumulative Profit</th>
                <th className="text-right py-2 text-gray-500 font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {[
                { p: 'P10 (Pessimistic)', v: action.cumulative_profit.p10, cls: 'text-red-600' },
                { p: 'P25', v: action.cumulative_profit.p25, cls: 'text-orange-600' },
                { p: 'P50 (Median)', v: action.cumulative_profit.p50, cls: 'text-gray-900 font-bold' },
                { p: 'P75', v: action.cumulative_profit.p75, cls: 'text-emerald-600' },
                { p: 'P90 (Optimistic)', v: action.cumulative_profit.p90, cls: 'text-emerald-700 font-bold' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 text-gray-700">{row.p}</td>
                  <td className={`py-2 text-right ${row.cls}`}>{fmt(row.v)}</td>
                  <td className="py-2 text-right text-gray-500 text-xs">
                    {row.v > 0 ? 'Profitable' : 'Loss scenario'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI & Risk */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-500" /> ROI at Horizon
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Pessimistic (P10)', value: action.roi?.p10, color: 'red' },
              { label: 'Median (P50)', value: action.roi?.p50, color: 'amber' },
              { label: 'Optimistic (P90)', value: action.roi?.p90, color: 'emerald' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{r.label}</span>
                <span className={`text-sm font-bold text-${r.color}-600`}>
                  {r.value != null ? `${r.value}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> Risk Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">P(Profit &gt; 0)</span>
              <span className="text-sm font-bold text-emerald-600">{pct(action.probability_positive)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Value at Risk (5%)</span>
              <span className={`text-sm font-bold ${action.var_95 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(action.var_95)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Breakeven Month</span>
              <span className="text-sm font-bold text-gray-700">{action.breakeven_month || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Time Savings</span>
              <span className={`text-sm font-bold ${action.time_savings_monthly_hrs >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {action.time_savings_monthly_hrs > 0 ? '+' : ''}{action.time_savings_monthly_hrs}h/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model description */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
        <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4" /> Model: Geometric Brownian Motion
        </h4>
        <code className="text-xs text-indigo-800 block mb-2">
          dS = μ·S·dt + σ·S·dW<sub>t</sub>  →  S<sub>t+1</sub> = S<sub>t</sub> · exp[(μ - σ²/2)Δt + σ√Δt · Z]
        </code>
        <p className="text-xs text-indigo-700">
          {action.description || 'Revenue follows a stochastic process calibrated to action type, business category, rating, and competitive intensity. Costs are deterministic. Profits are discounted at 10% annual rate.'}
        </p>
      </div>
    </div>
  )
}


// ─── Full fan chart ────────────────────────────────────────────
function FanChart({ trajectory, color }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trajectory} margin={{ top: 10, right: 30, bottom: 0, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
          <YAxis tickFormatter={(v) => fmt(v)} />
          <Tooltip
            formatter={(v, name) => [fmt(v), name]}
            labelFormatter={(v) => `Month ${v}`}
          />
          <Area type="monotone" dataKey="p90" name="P90" stroke="none" fill={color} fillOpacity={0.08} stackId="fan" />
          <Area type="monotone" dataKey="p75" name="P75" stroke="none" fill={color} fillOpacity={0.12} stackId="fan2" />
          <Area type="monotone" dataKey="p50" name="P50 (Median)" stroke={color} strokeWidth={2.5}
            fill={color} fillOpacity={0.2} />
          <Area type="monotone" dataKey="p25" name="P25" stroke={color} strokeWidth={1} strokeDasharray="4 4"
            fill="none" />
          <Area type="monotone" dataKey="p10" name="P10" stroke={color} strokeWidth={1} strokeDasharray="2 2"
            fill="none" opacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


// ─── Stat box ──────────────────────────────────────────────────
function StatBox({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-4 h-4 text-indigo-500" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// MAB / BANDIT PANEL
// ═══════════════════════════════════════════════════════════════
function BanditPanel({ biz, qLearning }) {
  const bandit = biz.bandit
  if (!bandit) return <div className="text-gray-500 text-center py-8">No bandit data available</div>

  return (
    <div className="space-y-4">
      {/* Arms overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Dices className="w-5 h-5 text-indigo-600" />
          Thompson Sampling — Multi-Armed Bandit
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Each strategy is an "arm". We maintain Beta posteriors: θ ~ Beta(α, β).
          Higher α = more observed successes. The algorithm balances exploration vs. exploitation.
        </p>

        <div className="grid gap-3 lg:grid-cols-3">
          {bandit.arms.map((arm, i) => {
            const isRec = i === bandit.recommendation?.best_arm
            return (
              <div key={i} className={`rounded-lg border p-4 ${isRec ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (COLORS[arm.category] || '#6366f1') + '20', color: COLORS[arm.category] || '#6366f1' }}>
                    {arm.category}
                  </span>
                  {isRec && (
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Recommended
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 text-sm mb-3">{arm.title}</h4>

                {/* Beta distribution visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Prior: Beta({arm.alpha}, {arm.beta})</span>
                    <span>Mean: {arm.mean}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-500 rounded-full h-2 transition-all"
                      style={{ width: `${arm.mean * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>σ² = {arm.variance}</span>
                    <span>Pulls: {arm.n_pulls}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Simulation trace */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-900 mb-3">Simulated Exploration (20 rounds)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500">Round</th>
                <th className="text-left py-2 text-gray-500">Chosen Arm</th>
                <th className="text-center py-2 text-gray-500">Reward</th>
                <th className="text-right py-2 text-gray-500">Posterior Means</th>
              </tr>
            </thead>
            <tbody>
              {bandit.simulated_history.map((h, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-600">{h.round}</td>
                  <td className="py-1.5 text-gray-900 font-medium">{h.chosen_title}</td>
                  <td className="py-1.5 text-center">
                    {h.reward ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right text-gray-500">
                    [{h.arm_means.join(', ')}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Q-Learning skeleton */}
      {qLearning && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Q-Learning (Phase 3)
          </h4>
          <code className="text-xs text-purple-800 block mb-2">
            {qLearning.bellman_equation}
          </code>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-700">{qLearning.states?.length || 0}</div>
              <div className="text-xs text-purple-500">States</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-700">{qLearning.actions?.length || 0}</div>
              <div className="text-xs text-purple-500">Actions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-700">{qLearning.config?.alpha || 0.1}</div>
              <div className="text-xs text-purple-500">α (learn rate)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-700">{qLearning.config?.gamma || 0.95}</div>
              <div className="text-xs text-purple-500">γ (discount)</div>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-3 italic">
            {qLearning.config?.status}
          </p>
        </div>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Running simulations...</p>
      </div>
    </div>
  )
}

function Error({ msg }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-gray-600">{msg}</p>
      </div>
    </div>
  )
}
