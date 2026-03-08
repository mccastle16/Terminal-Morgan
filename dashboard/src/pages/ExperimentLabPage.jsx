import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts'
import {
  FlaskConical, TrendingUp, ChevronDown, Zap, Target, BarChart3,
  AlertTriangle, CheckCircle2, ArrowUpRight, Brain, Dices, Activity,
  Heart, Shield, Eye, Network, Search,
} from 'lucide-react'

// ─── BHS formatters ────────────────────────────────────────────
const bhs = (v) => v != null ? v.toFixed(1) : '—'
const pct = (v) => v != null ? `${(v * 100).toFixed(0)}%` : '—'
const delta = (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '—'

// ─── Path colors ───────────────────────────────────────────────
const PATH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']
const BASELINE_COLOR = '#9ca3af'

const COMPONENT_ICONS = {
  visibility: Eye,
  network: Network,
  trust: Shield,
  rating: Heart,
}

const COMPONENT_COLORS = {
  visibility: '#3b82f6',
  network: '#8b5cf6',
  trust: '#10b981',
  rating: '#f59e0b',
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ExperimentLabPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [selectedPath, setSelectedPath] = useState(null)
  const [view, setView] = useState('overview') // overview | compare | bandit
  const [searchQ, setSearchQ] = useState('')

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
  if (!data) return <ErrorMsg msg="Could not load experiment data" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-indigo-600" />
            Experiment Lab
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Business Health Score · Empirically Calibrated · {data.config.n_paths.toLocaleString()} Monte Carlo paths
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { v: 'overview', label: 'Paths' },
            { v: 'compare', label: 'Compare' },
            { v: 'bandit', label: 'AI Advisor' },
          ].map(({ v, label }) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {label}
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
        onSelect={(b) => { setSelectedBiz(b); setSelectedPath(null) }}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
      />

      {/* Current state card */}
      {selectedBiz && <BHSCard biz={selectedBiz} bhsDist={data.bhs_distribution} />}

      {/* Views */}
      {view === 'overview' && selectedBiz && (
        <PathsPanel biz={selectedBiz} config={data.config}
          selectedPath={selectedPath} onSelectPath={setSelectedPath} />
      )}
      {view === 'compare' && selectedBiz && (
        <ComparePanel biz={selectedBiz} config={data.config} />
      )}
      {view === 'bandit' && selectedBiz && (
        <AdvisorPanel biz={selectedBiz} qLearning={data.q_learning} qPolicy={data.q_policy} />
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY STRIP
// ═══════════════════════════════════════════════════════════════
function SummaryStrip({ data }) {
  const s = data.summary
  const d = data.bhs_distribution
  const cards = [
    { label: 'Businesses Analyzed', value: s.total_businesses_analyzed.toLocaleString(), icon: Target, color: 'text-blue-600' },
    { label: 'With Strategy Paths', value: s.businesses_with_paths, icon: FlaskConical, color: 'text-indigo-600' },
    { label: 'Treatment Effects', value: s.treatment_effects_measured, icon: Activity, color: 'text-emerald-600' },
    { label: 'Avg BHS', value: bhs(s.avg_bhs), icon: Heart, color: 'text-rose-500', sub: `of 100` },
    { label: 'BHS Range (P10–P90)', value: `${bhs(d.p10)} – ${bhs(d.p90)}`, icon: BarChart3, color: 'text-amber-600' },
    { label: 'Avg Improvement', value: `+${bhs(s.avg_improvement_potential)}`, icon: TrendingUp, color: 'text-green-600', sub: 'BHS potential' },
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
function BusinessSelector({ businesses, selected, onSelect, searchQ, setSearchQ }) {
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return businesses
    const q = searchQ.toLowerCase()
    return businesses.filter(b =>
      b.business_name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.neighborhood?.toLowerCase().includes(q)
    )
  }, [businesses, searchQ])

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
              {selected && `BHS ${bhs(selected.bhs)} · ${selected.category} · ${selected.neighborhood || 'Coral Gables'}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selected && (
            <div className="text-right">
              <div className="text-sm font-bold text-indigo-600">+{bhs(selected.improvement_potential)}</div>
              <div className="text-xs text-gray-400">potential</div>
            </div>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-80 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search businesses..."
                className="bg-transparent text-sm outline-none flex-1"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {filtered.map((b, i) => (
              <button key={i}
                onClick={() => { onSelect(b); setOpen(false); setSearchQ('') }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0 ${
                  selected?.business_id === b.business_id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">{b.business_name}</div>
                  <div className="text-xs text-gray-500">{b.category} · {b.pkp_type} · {b.neighborhood}</div>
                </div>
                <div className="text-right">
                  <BHSBadge value={b.bhs} />
                  <div className="text-xs text-gray-400 mt-0.5">{b.paths.length} actions</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BHSBadge({ value }) {
  const color = value >= 70 ? 'bg-emerald-100 text-emerald-700'
    : value >= 50 ? 'bg-amber-100 text-amber-700'
    : value >= 30 ? 'bg-orange-100 text-orange-700'
    : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {bhs(value)}
    </span>
  )
}


// ═══════════════════════════════════════════════════════════════
// BHS STATE CARD — Shows current business health breakdown
// ═══════════════════════════════════════════════════════════════
function BHSCard({ biz, bhsDist }) {
  const c = biz.bhs_components
  const components = [
    { key: 'rating', label: 'Rating', value: c.rating, max: 35, color: '#f59e0b' },
    { key: 'visibility', label: 'Visibility', value: c.visibility, max: 25, color: '#3b82f6' },
    { key: 'trust', label: 'Trust', value: c.trust, max: 25, color: '#10b981' },
    { key: 'network', label: 'Network', value: c.network, max: 15, color: '#8b5cf6' },
  ]

  const percentile = biz.bhs <= bhsDist.p10 ? '<10th'
    : biz.bhs <= bhsDist.p50 ? '10-50th'
    : biz.bhs <= bhsDist.p90 ? '50-90th'
    : '>90th'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Business Health Score
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Composite of {components.length} observable dimensions · State: <code className="bg-gray-100 px-1 rounded">{biz.state}</code>
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{bhs(biz.bhs)}</div>
          <div className="text-xs text-gray-500">{percentile} percentile · of 100</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {components.map((comp) => {
          const pctFill = (comp.value / comp.max) * 100
          return (
            <div key={comp.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{comp.label}</span>
                <span className="text-xs font-bold" style={{ color: comp.color }}>
                  {comp.value.toFixed(1)}/{comp.max}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="rounded-full h-2 transition-all duration-500"
                  style={{ width: `${pctFill}%`, backgroundColor: comp.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// PATHS PANEL — Diverging strategy paths from same starting BHS
// ═══════════════════════════════════════════════════════════════
function PathsPanel({ biz, config, selectedPath, onSelectPath }) {
  const activePath = selectedPath || biz.paths[0]

  return (
    <div className="space-y-6">
      {/* Path selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {biz.paths.map((p, i) => (
          <button key={p.action_id}
            onClick={() => onSelectPath(p)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              (selectedPath?.action_id || biz.paths[0].action_id) === p.action_id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PATH_COLORS[i] }} />
            {p.action_name}
          </button>
        ))}
      </div>

      {/* Active path detail */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{activePath.action_name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: (COMPONENT_COLORS[activePath.component_affected] || '#6366f1') + '20',
                color: COMPONENT_COLORS[activePath.component_affected] || '#6366f1'
              }}>
              affects {activePath.component_affected}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">{activePath.description}</p>

          {/* Fan chart: this path vs baseline */}
          <PathVsBaselineChart path={activePath} baseline={biz.baseline} biz={biz}
            color={PATH_COLORS[biz.paths.indexOf(activePath)] || '#6366f1'} />
        </div>

        {/* Path stats */}
        <div className="space-y-3">
          <StatCard label="Expected BHS Change" value={delta(activePath.simulation.expected_delta)}
            sub={`${bhs(activePath.simulation.bhs_start)} → ${bhs(activePath.simulation.bhs_end_median)}`}
            icon={TrendingUp} good={activePath.simulation.expected_delta > 0}
            bad={activePath.simulation.expected_delta < 0} />
          <StatCard label="P(Improvement)" value={pct(activePath.simulation.prob_improve)}
            sub="probability BHS goes up" icon={CheckCircle2}
            good={activePath.simulation.prob_improve > 0.5} />
          <StatCard label="Downside (VaR 5%)" value={delta(activePath.simulation.var_5)}
            sub="worst 5% scenario" icon={Shield}
            good={activePath.simulation.var_5 > 0} bad={activePath.simulation.var_5 < 0} />
          <StatCard label="Empirical Effect" value={delta(activePath.empirical_delta)}
            sub={`from ${activePath.n_evidence.toLocaleString()} businesses`}
            icon={BarChart3} good={activePath.empirical_delta > 0} />
          <StatCard label="Success Rate" value={pct(activePath.empirical_success_rate)}
            sub={`observed in treated group`} icon={Activity}
            good={activePath.empirical_success_rate > 0.5} />
        </div>
      </div>

      {/* BHS Endpoint Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-900 mb-3">12-Month BHS Projection</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Scenario</th>
                <th className="text-right py-2 text-gray-500 font-medium">BHS at 12mo</th>
                <th className="text-right py-2 text-gray-500 font-medium">Change</th>
                <th className="text-right py-2 text-gray-500 font-medium">vs Baseline</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Pessimistic (P10)', val: activePath.simulation.bhs_end_p10, base: biz.baseline.bhs_end_p10, cls: 'text-red-600' },
                { label: 'Median (P50)', val: activePath.simulation.bhs_end_median, base: biz.baseline.bhs_end_median, cls: 'text-gray-900 font-bold' },
                { label: 'Optimistic (P90)', val: activePath.simulation.bhs_end_p90, base: biz.baseline.bhs_end_p90, cls: 'text-emerald-600' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 text-gray-700">{row.label}</td>
                  <td className={`py-2 text-right ${row.cls}`}>{bhs(row.val)}</td>
                  <td className="py-2 text-right text-gray-600">{delta(row.val - biz.bhs)}</td>
                  <td className="py-2 text-right text-indigo-600 font-medium">
                    {delta(row.val - row.base)} vs baseline
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
        <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4" /> Model: Additive BHS with Exponential Ramp-In
        </h4>
        <code className="text-xs text-indigo-800 block mb-2">
          BHS(t) = BHS₀ + μ · (1 - e<sup>-t/τ</sup>) + σ · Σ noise · 0.3
        </code>
        <p className="text-xs text-indigo-700">
          μ = {activePath.empirical_delta.toFixed(2)} (empirical cross-sectional Δ), σ = {activePath.empirical_sigma.toFixed(2)} (within-group std),
          τ = {config.tau_months} months (ramp-in). Based on {activePath.n_evidence.toLocaleString()} real businesses.
        </p>
      </div>
    </div>
  )
}

// ─── Path vs Baseline fan chart ────────────────────────────────
function PathVsBaselineChart({ path, baseline, biz, color }) {
  const data = path.simulation.trajectory.map((pt, i) => ({
    month: pt.month,
    path_p10: pt.p10,
    path_p25: pt.p25,
    path_p50: pt.p50,
    path_p75: pt.p75,
    path_p90: pt.p90,
    base_p50: baseline.trajectory[i]?.p50 ?? biz.bhs,
    base_p10: baseline.trajectory[i]?.p10 ?? biz.bhs,
    base_p90: baseline.trajectory[i]?.p90 ?? biz.bhs,
  }))

  // Prepend starting point
  data.unshift({
    month: 0,
    path_p10: biz.bhs, path_p25: biz.bhs, path_p50: biz.bhs, path_p75: biz.bhs, path_p90: biz.bhs,
    base_p50: biz.bhs, base_p10: biz.bhs, base_p90: biz.bhs,
  })

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tickFormatter={(v) => v === 0 ? 'Now' : `M${v}`} />
          <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
          <Tooltip
            formatter={(v, name) => [v.toFixed(1), name]}
            labelFormatter={(v) => v === 0 ? 'Now' : `Month ${v}`}
          />
          {/* Baseline band */}
          <Area type="monotone" dataKey="base_p90" stroke="none" fill={BASELINE_COLOR} fillOpacity={0.06} />
          <Area type="monotone" dataKey="base_p50" name="Baseline (do nothing)" stroke={BASELINE_COLOR}
            strokeWidth={2} strokeDasharray="6 3" fill="none" />
          <Area type="monotone" dataKey="base_p10" stroke="none" fill="none" />
          {/* Action path band */}
          <Area type="monotone" dataKey="path_p90" stroke="none" fill={color} fillOpacity={0.08} />
          <Area type="monotone" dataKey="path_p75" stroke="none" fill={color} fillOpacity={0.1} />
          <Area type="monotone" dataKey="path_p50" name="Action path (P50)" stroke={color}
            strokeWidth={2.5} fill={color} fillOpacity={0.15} />
          <Area type="monotone" dataKey="path_p25" stroke={color} strokeWidth={1} strokeDasharray="4 4" fill="none" />
          <Area type="monotone" dataKey="path_p10" stroke={color} strokeWidth={1} strokeDasharray="2 2"
            fill="none" opacity={0.5} />
          <Legend />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


// ─── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, good, bad }) {
  const accent = good ? 'border-l-emerald-500' : bad ? 'border-l-red-500' : 'border-l-gray-300'
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${accent} p-3`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`w-3.5 h-3.5 ${good ? 'text-emerald-500' : bad ? 'text-red-500' : 'text-gray-400'}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`text-lg font-bold ${good ? 'text-emerald-700' : bad ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// COMPARE PANEL — All paths diverging from same starting point
// ═══════════════════════════════════════════════════════════════
function ComparePanel({ biz, config }) {
  // Build merged dataset for the chart
  const merged = useMemo(() => {
    const months = Array.from({ length: 13 }, (_, i) => i) // 0-12
    return months.map(m => {
      const row = { month: m }
      if (m === 0) {
        biz.paths.forEach((p, i) => { row[`path${i}`] = biz.bhs })
        row.baseline = biz.bhs
      } else {
        const mi = m - 1
        biz.paths.forEach((p, i) => {
          row[`path${i}`] = p.simulation.trajectory[mi]?.p50 ?? null
        })
        row.baseline = biz.baseline.trajectory[mi]?.p50 ?? biz.bhs
      }
      return row
    })
  }, [biz])

  // Bar data for endpoint comparison
  const barData = useMemo(() => {
    const rows = biz.paths.map((p, i) => ({
      name: p.action_name.length > 28 ? p.action_name.slice(0, 26) + '…' : p.action_name,
      delta: p.simulation.expected_delta,
      color: PATH_COLORS[i],
      prob: p.simulation.prob_improve,
    }))
    rows.push({
      name: 'Do Nothing',
      delta: biz.baseline.expected_delta,
      color: BASELINE_COLOR,
      prob: biz.baseline.prob_improve,
    })
    return rows.sort((a, b) => b.delta - a.delta)
  }, [biz])

  return (
    <div className="space-y-6">
      {/* All-paths diverging chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Strategy Paths — Diverging from BHS {bhs(biz.bhs)}</h3>
        <p className="text-xs text-gray-500 mb-4">
          Each line = median trajectory (P50) of {config.n_paths.toLocaleString()} Monte Carlo paths · {config.horizon_months} month horizon
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 10, right: 30, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={(v) => v === 0 ? 'Now' : `M${v}`} />
              <YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
              <Tooltip
                formatter={(v, name) => [v?.toFixed(1), name]}
                labelFormatter={(v) => v === 0 ? 'Now' : `Month ${v}`}
              />
              <Line dataKey="baseline" name="Do Nothing" stroke={BASELINE_COLOR}
                strokeWidth={2} strokeDasharray="6 3" dot={false} />
              {biz.paths.map((p, i) => (
                <Line key={p.action_id} dataKey={`path${i}`} name={p.action_name}
                  stroke={PATH_COLORS[i]} strokeWidth={2.5} dot={false} />
              ))}
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Delta bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Expected BHS Improvement at 12 Months</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(v) => delta(v)}
                domain={['auto', 'auto']} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v.toFixed(1) + ' BHS', 'Expected Δ']} />
              <Bar dataKey="delta" name="Expected Δ BHS" radius={[0, 4, 4, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-gray-900 mb-3">Path Comparison Table</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Strategy</th>
                <th className="text-center py-2 text-gray-500 font-medium">Component</th>
                <th className="text-right py-2 text-gray-500 font-medium">Δ BHS</th>
                <th className="text-right py-2 text-gray-500 font-medium">End P50</th>
                <th className="text-right py-2 text-gray-500 font-medium">P(↑)</th>
                <th className="text-right py-2 text-gray-500 font-medium">VaR 5%</th>
                <th className="text-right py-2 text-gray-500 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {biz.paths.map((p, i) => (
                <tr key={p.action_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PATH_COLORS[i] }} />
                      <span className="text-gray-900 font-medium">{p.action_name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: (COMPONENT_COLORS[p.component_affected] || '#6366f1') + '20',
                        color: COMPONENT_COLORS[p.component_affected] || '#6366f1'
                      }}>
                      {p.component_affected}
                    </span>
                  </td>
                  <td className={`py-2 text-right font-bold ${p.simulation.expected_delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {delta(p.simulation.expected_delta)}
                  </td>
                  <td className="py-2 text-right text-gray-700">{bhs(p.simulation.bhs_end_median)}</td>
                  <td className="py-2 text-right text-gray-700">{pct(p.simulation.prob_improve)}</td>
                  <td className={`py-2 text-right ${p.simulation.var_5 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {delta(p.simulation.var_5)}
                  </td>
                  <td className="py-2 text-right text-gray-500">{p.n_evidence.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0 bg-gray-400" />
                    <span className="text-gray-500 font-medium italic">Do Nothing</span>
                  </div>
                </td>
                <td className="py-2 text-center text-gray-400">—</td>
                <td className="py-2 text-right text-gray-500">{delta(biz.baseline.expected_delta)}</td>
                <td className="py-2 text-right text-gray-500">{bhs(biz.baseline.bhs_end_median)}</td>
                <td className="py-2 text-right text-gray-500">{pct(biz.baseline.prob_improve)}</td>
                <td className="py-2 text-right text-gray-500">{delta(biz.baseline.var_5)}</td>
                <td className="py-2 text-right text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════
// AI ADVISOR PANEL — Thompson Sampling + Q-Learning
// ═══════════════════════════════════════════════════════════════
function AdvisorPanel({ biz, qLearning, qPolicy }) {
  const bandit = biz.bandit
  const qRec = biz.q_recommendation

  return (
    <div className="space-y-6">
      {/* Recommendations summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Thompson Sampling recommendation */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5">
          <h3 className="font-semibold text-indigo-900 mb-1 flex items-center gap-2">
            <Dices className="w-5 h-5 text-indigo-600" />
            Thompson Sampling Recommends
          </h3>
          <p className="text-xs text-indigo-600 mb-3">
            Multi-armed bandit with Beta-Bernoulli posteriors · 30-round simulation
          </p>
          {bandit?.recommendation ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-bold text-indigo-900">{bandit.recommendation.best_action}</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-indigo-700">Confidence: <strong>{(bandit.recommendation.confidence * 100).toFixed(0)}%</strong></span>
                <span className="text-indigo-600">Chosen {bandit.recommendation.times_chosen}/30 rounds</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No bandit data available</p>
          )}
        </div>

        {/* Q-Learning recommendation */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Q-Learning Recommends
          </h3>
          <p className="text-xs text-purple-600 mb-3">
            Trained on {qLearning?.episodes?.toLocaleString() || '10,000'} episodes across {qLearning?.states_count || 0} states
          </p>
          {qRec ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-bold text-purple-900">{qRec.best_action_name}</span>
              </div>
              <div className="text-sm text-purple-700">
                Q-value: <strong>{qRec.q_value.toFixed(1)}</strong> · State: <code className="bg-purple-100 px-1 rounded text-xs">{biz.state}</code>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No Q-Learning policy for this state</p>
          )}
        </div>
      </div>

      {/* Bandit arms */}
      {bandit?.arms?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-4">Thompson Sampling Arms</h4>
          <div className="grid gap-3 lg:grid-cols-3">
            {bandit.arms.map((arm, i) => {
              const isRec = arm.action_id === bandit.recommendation?.best_action_id
              return (
                <div key={i} className={`rounded-lg border p-4 ${isRec ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      n={arm.n_treated.toLocaleString()} treated
                    </span>
                    {isRec && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Best
                      </span>
                    )}
                  </div>
                  <h5 className="font-medium text-gray-900 text-sm mb-3">{arm.action_name}</h5>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Prior: Beta({arm.alpha}, {arm.beta})</span>
                      <span>Empirical: {pct(arm.empirical_success_rate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-500 rounded-full h-2 transition-all"
                        style={{ width: `${arm.mean_final * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Posterior mean: {arm.mean_final}</span>
                      <span>Chosen: {arm.times_chosen}×</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Q-value breakdown */}
      {qRec && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 mb-3">Q-Values for State: {biz.state}</h4>
          <p className="text-xs text-gray-500 mb-4">
            Each Q-value represents the long-term expected BHS improvement from taking that action in this state.
          </p>
          <div className="space-y-2">
            {Object.entries(qRec.all_q)
              .sort(([,a], [,b]) => b - a)
              .map(([action, qv], i) => {
                const maxQ = Math.max(...Object.values(qRec.all_q))
                const pctWidth = maxQ > 0 ? (Math.max(0, qv) / maxQ) * 100 : 0
                const isBest = action === qRec.best_action
                return (
                  <div key={action} className="flex items-center gap-3">
                    <div className="w-48 text-sm text-gray-700 truncate">
                      {isBest && <Zap className="w-3 h-3 inline text-amber-500 mr-1" />}
                      {action.replace(/_/g, ' ')}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                      <div className={`h-5 rounded-full transition-all ${isBest ? 'bg-purple-500' : 'bg-purple-300'}`}
                        style={{ width: `${pctWidth}%` }} />
                      <span className="absolute right-2 top-0.5 text-xs font-medium text-gray-700">
                        {qv.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Bandit simulation trace (collapsed) */}
      {bandit?.history?.length > 0 && (
        <BanditTrace history={bandit.history} />
      )}

      {/* Model card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
        <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4" /> Reinforcement Learning Models
        </h4>
        <div className="grid lg:grid-cols-2 gap-4 text-xs text-purple-800">
          <div>
            <strong>Thompson Sampling:</strong> θ ~ Beta(α, β). Priors from empirical success rates.
            Reward = 1 if treated group member exceeds category median BHS. Posterior updated via Bayesian conjugate.
          </div>
          <div>
            <strong>Q-Learning:</strong> Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') − Q(s,a)].
            α={qLearning?.alpha || 0.1}, γ={qLearning?.gamma || 0.95}, ε={qLearning?.epsilon || 0.15}.
            {qLearning?.states_count || 0} states, {qLearning?.actions?.length || 0} actions, {qLearning?.episodes?.toLocaleString() || 0} episodes.
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Bandit trace (collapsible) ────────────────────────────────
function BanditTrace({ history }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? history : history.slice(0, 10)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Exploration Trace ({history.length} rounds)</h4>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-600 hover:underline">
          {expanded ? 'Collapse' : 'Show all'}
        </button>
      </div>
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
            {shown.map((h, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-600">{h.round}</td>
                <td className="py-1.5 text-gray-900 font-medium">{h.chosen_name}</td>
                <td className="py-1.5 text-center">
                  {h.reward ? (
                    <span className="text-emerald-600 font-bold">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-gray-500 font-mono">
                  [{h.posteriors.join(', ')}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <p className="text-gray-500 text-sm">Loading experiment data...</p>
      </div>
    </div>
  )
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-gray-600">{msg}</p>
      </div>
    </div>
  )
}
