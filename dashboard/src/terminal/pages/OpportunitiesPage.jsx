import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import { VGRADIENTS, HGRADIENTS, ChartTooltip, PieLabel, axisTick, axisTickLabel, barCursor } from '../components/ChartTheme'
import InfoTooltip from '../components/InfoTooltip'
import {
  Lightbulb, TrendingUp, MapPin, Target, Building2, Rocket,
  ChevronDown, ChevronRight,
} from 'lucide-react'

const DEMAND_LABELS = { high: 'High Demand', medium: 'Medium Demand', low: 'Low' }

function Panel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-lg p-5 ${className}`}>
      {title && <h3 className="text-sm font-medium text-white">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && title && <div className="mb-4" />}
      {children}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, info }) {
  return (
    <div className="relative bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
      {info && (
        <div className="absolute bottom-2 right-2">
          <InfoTooltip text={info} side="top" align="right" />
        </div>
      )}
    </div>
  )
}

function StaticTag() {
  return (
    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-500 border border-slate-700/60 align-middle">
      Static data
    </span>
  )
}

function DemandBadge({ level }) {
  const cl = {
    high: 'bg-emerald-500/10 text-emerald-400',
    medium: 'bg-amber-500/10 text-amber-400',
    low: 'bg-slate-800 text-slate-400',
  }
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${cl[level] || cl.low}`}>
      {DEMAND_LABELS[level] || level}
    </span>
  )
}

function OpportunityCard({ opp, expanded, onToggle }) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors">
      <button onClick={onToggle} className="w-full p-4 text-left flex items-start gap-3">
        <div className="mt-0.5">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-white">{opp.business_concept}</h4>
            <DemandBadge level={opp.estimated_demand} />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Target className="w-3 h-3" /> {opp.category.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {opp.target_neighborhood}
            </span>
            <span className="text-xs text-red-400/80">{opp.category_gap_pct}% underserved</span>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7 border-t border-slate-800">
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">{opp.rationale}</p>
          <div className="mt-3 text-xs text-slate-500">
            Category deficit: <span className="text-amber-400 font-medium">+{opp.category_deficit} needed</span>
          </div>
        </div>
      )}
    </div>
  )
}

const selectClass = 'bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-slate-600'

export default function OpportunitiesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDemand, setFilterDemand] = useState('all')
  const [filterHood, setFilterHood] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetch('/api/opportunities')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
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
    const gapChart = (data.category_gaps || [])
      .filter(g => g.gap_businesses > 0)
      .sort((a, b) => b.gap_businesses - a.gap_businesses)
      .slice(0, 12)
      .map(g => ({ name: g.category.replace(/_/g, ' '), gap: g.gap_businesses, current: g.current_count, pct: g.gap_pct }))

    const demandPie = [
      { name: 'High Demand', value: data.opportunities.filter(o => o.estimated_demand === 'high').length, fill: '#10b981' },
      { name: 'Medium Demand', value: data.opportunities.filter(o => o.estimated_demand === 'medium').length, fill: '#f59e0b' },
    ]

    const hoodMap = {}
    data.opportunities.forEach(o => { hoodMap[o.target_neighborhood] = (hoodMap[o.target_neighborhood] || 0) + 1 })
    const hoodChart = Object.entries(hoodMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

    const categories = [...new Set(data.opportunities.map(o => o.category))].sort()
    const neighborhoods = [...new Set(data.opportunities.map(o => o.target_neighborhood))].sort()

    return { gapChart, demandPie, hoodChart, categories, neighborhoods }
  }, [data])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Lightbulb className="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <p>No opportunity data available. The live database could not be reached.</p>
      </div>
    )
  }

  const summary = data.market_summary || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Lightbulb size={16} className="text-emerald-400" />
            </div>
            Opportunities
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Business gaps in Coral Gables — {summary.total_businesses?.toLocaleString()} businesses analyzed
          </p>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            A business gap counts all the existing businesses in Coral Gables and compares each category (restaurants, gyms, salons, etc.) against a benchmark of how many businesses that category "should" have given the population.
          </p>
        </div>
        <span className="text-xs text-slate-600">Generated {new Date(data.generated).toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Building2} label="Businesses" value={summary.total_businesses?.toLocaleString()}
          info="Total businesses in Coral Gables that fall into one of the 19 benchmark categories." />
        <StatCard icon={TrendingUp} label="Market Gap" value={`+${summary.total_gap?.toLocaleString()}`} sub="needed"
          info="The total number of additional businesses needed across all tracked categories to reach benchmark levels for the area's population." />
        <StatCard icon={Lightbulb} label="Opportunities" value={data.opportunities.length} sub={`${data.opportunities.filter(o => o.estimated_demand === 'high').length} high demand`}
          info="Business concepts for underserved markets, rated by estimated demand." />
        <StatCard icon={Target} label="Gap Categories" value={summary.gap_categories} sub="of 19 tracked"
          info="The number of tracked business categories that currently have fewer businesses than the benchmark expects for the area's population." />
        <StatCard icon={MapPin} label="Deserts" value={data.neighborhood_deserts?.length || 0} sub="neighborhoods"
          info="Neighborhoods short on at least one of the 5 essential categories — under 3 businesses in food, retail, healthcare, professional services, or wellness." />
        <StatCard icon={Rocket} label="Median Income" value={`$${(summary.median_income / 1000).toFixed(0)}K`} sub="spending power"
          info="The median household income for the target area, used as an indicator of local spending power when evaluating new business opportunities." />
      </div>

      <Panel title="Category Gap Analysis" subtitle="Current businesses vs. benchmark. Red = businesses needed.">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData.gapChart} layout="vertical" margin={{ left: 120, right: 20 }}>
            <defs>{HGRADIENTS}</defs>
            <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={axisTickLabel} width={115} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={barCursor} />
            <Bar dataKey="current" fill="url(#gBlueH)" stackId="a" name="Current" />
            <Bar dataKey="gap" fill="url(#gRedH)" stackId="a" name="Gap" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={<>Demand Distribution<StaticTag /></>} subtitle="Opportunities by estimated market demand">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.demandPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={0} dataKey="value"
                  label={PieLabel} labelLine={false} stroke="#000000" strokeWidth={2}>
                  {chartData.demandPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {chartData.demandPie.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-xs text-slate-500">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={<>By Neighborhood<StaticTag /></>} subtitle="Where new businesses are most needed">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.hoodChart} margin={{ left: 0, right: 10 }}>
              <defs>{VGRADIENTS}</defs>
              <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-20} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={barCursor} />
              <Bar dataKey="value" fill="url(#gAmber)" radius={[4, 4, 0, 0]} name="Opportunities" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title={<>Business Opportunities ({filtered.length})<StaticTag /></>} subtitle="Curated business concepts filling market gaps in Coral Gables">
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectClass}>
            <option value="all">All Categories</option>
            {(chartData.categories || []).map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filterDemand} onChange={e => setFilterDemand(e.target.value)} className={selectClass}>
            <option value="all">All Demand</option>
            <option value="high">High Demand</option>
            <option value="medium">Medium Demand</option>
          </select>
          <select value={filterHood} onChange={e => setFilterHood(e.target.value)} className={selectClass}>
            <option value="all">All Neighborhoods</option>
            {(chartData.neighborhoods || []).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-dark pr-1">
          {filtered.map(opp => (
            <OpportunityCard key={opp.opportunity_id} opp={opp}
              expanded={expandedId === opp.opportunity_id}
              onToggle={() => setExpandedId(expandedId === opp.opportunity_id ? null : opp.opportunity_id)} />
          ))}
          {filtered.length === 0 && <div className="text-center py-8 text-slate-600">No opportunities match your filters</div>}
        </div>
      </Panel>

      {data.neighborhood_deserts?.length > 0 && (
        <Panel title="Neighborhood Deserts" subtitle="Areas with fewer than 3 businesses in essential categories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.neighborhood_deserts.map(d => (
              <div key={d.neighborhood} className="bg-slate-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{d.neighborhood}</span>
                  <span className="text-xs text-slate-600">{d.total} businesses</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.missing.map(m => (
                    <span key={m.category} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                      {m.category.replace(/_/g, ' ')} ({m.count})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title={<>Neighboring Chambers<StaticTag /></>} subtitle="Cross-reference data sources">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data.neighboring_chambers || {}).map(([key, info]) => (
            <div key={key} className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-1">{info.name}</h4>
              <p className="text-xs text-slate-500">{info.relevance}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
