import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap,
} from 'recharts'
import {
  Lightbulb, TrendingUp, MapPin, Target, Building2, Rocket,
  ArrowUpRight, Filter, ChevronDown, ChevronRight, Sparkles,
} from 'lucide-react'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const DEMAND_COLORS = { high: '#10b981', medium: '#f59e0b', low: '#6b7280' }
const DEMAND_LABELS = { high: 'High Demand', medium: 'Medium Demand', low: 'Low' }

function StatCard({ icon: Icon, label, value, sub, color = 'amber' }) {
  const bc = { amber: 'border-amber-500/30', red: 'border-red-500/30', green: 'border-green-500/30', blue: 'border-blue-500/30', purple: 'border-purple-500/30', cyan: 'border-cyan-500/30' }
  const tc = { amber: 'text-amber-400', red: 'text-red-400', green: 'text-green-400', blue: 'text-blue-400', purple: 'text-purple-400', cyan: 'text-cyan-400' }
  return (
    <div className={`bg-slate-900/50 rounded-lg border ${bc[color]} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${tc[color]}`} />
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-amber-500/10 rounded-lg">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function DemandBadge({ level }) {
  const cl = {
    high: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${cl[level] || cl.low}`}>
      {DEMAND_LABELS[level] || level}
    </span>
  )
}

function GapBar({ pct }) {
  const color = pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
    </div>
  )
}

function OpportunityCard({ opp, expanded, onToggle }) {
  return (
    <div className="bg-slate-900/60 rounded-lg border border-slate-700/50 overflow-hidden hover:border-amber-500/30 transition-colors">
      <button onClick={onToggle} className="w-full p-4 text-left flex items-start gap-3">
        <div className="mt-0.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-white">{opp.business_concept}</h4>
            <DemandBadge level={opp.estimated_demand} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Target className="w-3 h-3" /> {opp.category.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {opp.target_neighborhood}
            </span>
            <span className="text-xs text-red-400/80">{opp.category_gap_pct}% underserved</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7 border-t border-slate-800">
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">{opp.rationale}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-xs text-slate-500">
              Category deficit: <span className="text-amber-400 font-medium">+{opp.category_deficit} businesses needed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OpportunitiesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDemand, setFilterDemand] = useState('all')
  const [filterHood, setFilterHood] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetch('/data/opportunities.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.opportunities.filter(o => {
      if (filterCategory !== 'all' && o.category !== filterCategory) return false
      if (filterDemand !== 'all' && o.estimated_demand !== filterDemand) return false
      if (filterHood !== 'all' && o.target_neighborhood !== filterHood) return false
      return true
    })
  }, [data, filterCategory, filterDemand, filterHood])

  const chartData = useMemo(() => {
    if (!data) return {}

    // Category gap chart
    const gapChart = (data.category_gaps || [])
      .filter(g => g.gap_businesses > 0)
      .sort((a, b) => b.gap_businesses - a.gap_businesses)
      .slice(0, 12)
      .map(g => ({
        name: g.category.replace(/_/g, ' '),
        gap: g.gap_businesses,
        current: g.current_count,
        pct: g.gap_pct,
      }))

    // Demand pie
    const demandPie = [
      { name: 'High', value: data.opportunities.filter(o => o.estimated_demand === 'high').length, fill: '#10b981' },
      { name: 'Medium', value: data.opportunities.filter(o => o.estimated_demand === 'medium').length, fill: '#f59e0b' },
    ]

    // By neighborhood
    const hoodMap = {}
    data.opportunities.forEach(o => {
      hoodMap[o.target_neighborhood] = (hoodMap[o.target_neighborhood] || 0) + 1
    })
    const hoodChart = Object.entries(hoodMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))

    // Category breakdown treemap
    const catMap = {}
    data.opportunities.forEach(o => {
      catMap[o.category] = (catMap[o.category] || 0) + 1
    })
    const treemap = Object.entries(catMap).map(([name, size]) => ({
      name: name.replace(/_/g, ' '),
      size,
    }))

    // Categories for filter
    const categories = [...new Set(data.opportunities.map(o => o.category))].sort()
    const neighborhoods = [...new Set(data.opportunities.map(o => o.target_neighborhood))].sort()

    return { gapChart, demandPie, hoodChart, treemap, categories, neighborhoods }
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-400">
        <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p>No opportunity data available. Run the opportunity analyzer script first.</p>
      </div>
    )
  }

  const summary = data.market_summary || {}

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-400" />
            Market Opportunities
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Business gaps and opportunities for Coral Gables — {summary.total_businesses?.toLocaleString()} businesses analyzed
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Generated {new Date(data.generated).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={Building2} label="Current Businesses" value={summary.total_businesses?.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Market Gap" value={`+${summary.total_gap?.toLocaleString()}`} sub="businesses needed" color="red" />
        <StatCard icon={Lightbulb} label="Opportunities" value={data.opportunities.length} sub={`${data.opportunities.filter(o => o.estimated_demand === 'high').length} high demand`} color="amber" />
        <StatCard icon={Target} label="Gap Categories" value={summary.gap_categories} sub="of 19 tracked" color="purple" />
        <StatCard icon={MapPin} label="Neighborhoods" value={data.neighborhood_deserts?.length || 0} sub="with deserts" color="cyan" />
        <StatCard icon={Rocket} label="Median Income" value={`$${(summary.median_income / 1000).toFixed(0)}K`} sub="high spending power" color="green" />
      </div>

      {/* Category Gap Chart */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-5">
        <SectionHeader icon={TrendingUp} title="Category Gap Analysis" subtitle="Current businesses vs. national benchmark per-capita. Red = businesses needed to reach average." />
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData.gapChart} layout="vertical" margin={{ left: 120, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={115} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              formatter={(val, name) => [val, name === 'gap' ? 'Gap (needed)' : 'Current']}
            />
            <Bar dataKey="current" fill="#3b82f6" stackId="a" name="Current" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gap" fill="#ef4444" stackId="a" name="Gap" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: Demand + Neighborhood distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-5">
          <SectionHeader icon={Target} title="Demand Distribution" subtitle="Opportunity count by estimated market demand" />
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData.demandPie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                  {chartData.demandPie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {chartData.demandPie.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: d.fill }} />
                <span className="text-xs text-slate-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-5">
          <SectionHeader icon={MapPin} title="Opportunities by Neighborhood" subtitle="Where new businesses are most needed" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.hoodChart} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Opportunities" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-5">
        <SectionHeader
          icon={Lightbulb}
          title={`Business Opportunities (${filtered.length})`}
          subtitle="Curated business concepts that would fill market gaps in Coral Gables"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Categories</option>
            {(chartData.categories || []).map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={filterDemand}
            onChange={e => setFilterDemand(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Demand Levels</option>
            <option value="high">High Demand</option>
            <option value="medium">Medium Demand</option>
          </select>
          <select
            value={filterHood}
            onChange={e => setFilterHood(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Neighborhoods</option>
            {(chartData.neighborhoods || []).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Cards */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(opp => (
            <OpportunityCard
              key={opp.opportunity_id}
              opp={opp}
              expanded={expandedId === opp.opportunity_id}
              onToggle={() => setExpandedId(expandedId === opp.opportunity_id ? null : opp.opportunity_id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500">No opportunities match your filters</div>
          )}
        </div>
      </div>

      {/* Neighborhood Deserts */}
      {data.neighborhood_deserts?.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg border border-red-500/20 p-5">
          <SectionHeader icon={MapPin} title="Neighborhood Category Deserts" subtitle="Areas with fewer than 3 businesses in essential categories" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.neighborhood_deserts.map(d => (
              <div key={d.neighborhood} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{d.neighborhood}</span>
                  <span className="text-xs text-slate-500">{d.total} businesses</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.missing.map(m => (
                    <span key={m.category} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                      {m.category.replace(/_/g, ' ')} ({m.count})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chamber Cross-Reference */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-5">
        <SectionHeader icon={Building2} title="Neighboring Chambers" subtitle="Data sources for cross-referencing and expanding the business database" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data.neighboring_chambers || {}).map(([key, info]) => (
            <div key={key} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <h4 className="text-sm font-medium text-white mb-1">{info.name}</h4>
              <p className="text-xs text-slate-400">{info.relevance}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
