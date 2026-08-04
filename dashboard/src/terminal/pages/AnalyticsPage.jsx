import { useMemo, useState } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import RoleGate from '../components/RoleGate'
import KPICard from '../components/KPICard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'
import { VGRADIENTS, HGRADIENTS, ChartTooltip, PieLabel, DonutCenter, axisTick, axisTickLabel, barCursor } from '../components/ChartTheme'
import {
  BarChart3, TrendingUp, Star, ShieldCheck, Users, Database,
  Lightbulb, Target, MapPin, Tag,
} from 'lucide-react'

const MEMBER_COLORS = { member: '#f59e0b', 'non-member': '#3b82f6', unknown: '#334155' }
const TIER_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e', 4: '#8b5cf6' }
const RATING_BUCKET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

function Panel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-lg p-5 ${className}`}>
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

const TABS = [
  { key: 'overview', label: 'Market Overview' },
  { key: 'growth',   label: 'Growth Opportunities' },
]

export default function AnalyticsPage() {
  const { stats, rawBusinesses, recruitQueue } = useTerminalData()
  const [activeTab, setActiveTab] = useState('overview')

  const memberDist = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Members', value: stats.members, color: MEMBER_COLORS.member },
      { name: 'Non-members', value: stats.nonMembers, color: MEMBER_COLORS['non-member'] },
      { name: 'Unknown', value: stats.unknowns, color: MEMBER_COLORS.unknown },
    ]
  }, [stats])

  const validationDist = useMemo(() => {
    if (!rawBusinesses.length) return []
    const counts = {}
    rawBusinesses.forEach(b => { const t = b._validationTier; counts[t] = (counts[t] || 0) + 1 })
    return Object.entries(counts).sort(([a], [b]) => Number(a) - Number(b)).map(([tier, count]) => ({
      name: `Tier ${tier}`, value: count, color: TIER_COLORS[Number(tier)] || '#475569'
    }))
  }, [rawBusinesses])

  const ratingDist = useMemo(() => {
    if (!rawBusinesses.length) return []
    const buckets = [
      { name: '1-2', min: 0, max: 2.5, count: 0 },
      { name: '2-3', min: 2.5, max: 3.5, count: 0 },
      { name: '3-4', min: 3.5, max: 4.0, count: 0 },
      { name: '4-4.5', min: 4.0, max: 4.5, count: 0 },
      { name: '4.5-5', min: 4.5, max: 5.1, count: 0 },
    ]
    rawBusinesses.forEach(b => {
      if (b._rating > 0) {
        const bucket = buckets.find(bk => b._rating >= bk.min && b._rating < bk.max)
        if (bucket) bucket.count++
      }
    })
    return buckets.map((bk, i) => ({ name: bk.name, count: bk.count, fill: RATING_BUCKET_COLORS[i] }))
  }, [rawBusinesses])

  const catPenetration = useMemo(() => {
    if (!stats) return []
    return stats.categoryPenetration.slice(0, 15).map(c => ({
      name: c.category.replace(/_/g, ' ').slice(0, 18),
      Members: c.members, 'Non-members': c.nonMembers, Unknown: c.unknowns,
    }))
  }, [stats])

  const hoodPenetration = useMemo(() => {
    if (!stats) return []
    return stats.neighborhoodPenetration.map(h => ({
      name: h.neighborhood.slice(0, 16),
      Members: h.members, 'Non-members': h.nonMembers, Unknown: h.unknowns,
      rate: h.penetration.toFixed(0),
    }))
  }, [stats])

  const whitespace = useMemo(() => {
    if (!stats) return []
    return stats.categoryPenetration
      .map(c => ({
        category: c.category.replace(/_/g, ' ').slice(0, 18),
        total: c.total, members: c.members,
        opportunity: c.nonMembers + c.unknowns,
        penetration: c.total > 0 ? (c.members / c.total * 100) : 0,
      }))
      .sort((a, b) => b.opportunity - a.opportunity)
  }, [stats])

  const hoodOpportunity = useMemo(() => {
    if (!stats) return []
    return stats.neighborhoodPenetration
      .map(h => ({ neighborhood: h.neighborhood, total: h.total, members: h.members, penetration: h.penetration, opportunity: h.nonMembers + h.unknowns }))
      .sort((a, b) => b.opportunity - a.opportunity)
  }, [stats])

  const recruitByCat = useMemo(() => {
    const map = {}
    recruitQueue?.forEach(b => {
      const cat = b.category_primary?.replace(/_/g, ' ') || 'Other'
      if (!map[cat]) map[cat] = { count: 0, totalScore: 0 }
      map[cat].count++
      map[cat].totalScore += b._recruitScore
    })
    return Object.entries(map)
      .map(([cat, data]) => ({ category: cat.slice(0, 18), count: data.count, avgScore: Math.round(data.totalScore / data.count) }))
      .sort((a, b) => b.count - a.count).slice(0, 12)
  }, [recruitQueue])

  if (!stats) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const topOpp = whitespace[0]

  return (
    <RoleGate permission="view_analytics" blur>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <BarChart3 size={16} className="text-amber-400" />
              </div>
              Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Penetration, quality, and growth intelligence</p>
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-md p-0.5">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard label="Membership Rate" value={`${(stats.members / stats.total * 100).toFixed(1)}%`}
                sub={`${stats.members} of ${stats.total}`} icon={Users} accent="amber" />
              <KPICard label="Known Status" value={`${stats.membershipKnownRate.toFixed(1)}%`}
                sub={`${stats.unknowns} unknown`} icon={Database} accent="blue" />
              <KPICard label="Avg Rating" value={stats.avgRating.toFixed(2)}
                sub="Across all rated" icon={Star} accent="green" />
              <KPICard label="High Validation" value={`${stats.dataQuality.highValidationRate.toFixed(0)}%`}
                sub="T3+ validated" icon={ShieldCheck} accent="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Membership Distribution" subtitle="Member vs non-member vs unknown">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={memberDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value" label={PieLabel} labelLine={false} strokeWidth={0}>
                        {memberDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Validation Tiers" subtitle="Data quality by corroboration level">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={validationDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value" label={PieLabel} labelLine={false} strokeWidth={0}>
                        {validationDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel title="Rating Distribution" subtitle="Businesses by Google rating">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingDist} margin={{ left: 0, right: 10 }}>
                    <defs>{VGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" tick={axisTickLabel} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ratingDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Category Penetration" subtitle="Top 15 categories by membership">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catPenetration} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <defs>{HGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={axisTickLabel} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="Members" stackId="a" fill="url(#gAmberH)" />
                    <Bar dataKey="Non-members" stackId="a" fill="url(#gBlueH)" />
                    <Bar dataKey="Unknown" stackId="a" fill="url(#gSlateH)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Neighborhood Penetration" subtitle="Membership by neighborhood">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoodPenetration} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <defs>{HGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={axisTickLabel} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="Members" stackId="a" fill="url(#gAmberH)" />
                    <Bar dataKey="Non-members" stackId="a" fill="url(#gBlueH)" />
                    <Bar dataKey="Unknown" stackId="a" fill="url(#gSlateH)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </>
        )}

        {activeTab === 'growth' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard label="Recruit Pipeline" value={recruitQueue?.length?.toLocaleString() || '0'} icon={Target} accent="green"
                sub={`${recruitQueue?.filter(b => b._recruitBand?.label?.startsWith('A')).length || 0} Band-A prospects`} />
              <KPICard label="Top Opportunity" value={topOpp?.category?.slice(0, 16) ?? '—'} icon={Tag} accent="amber"
                sub={`${topOpp?.opportunity ?? 0} untapped`} />
              <KPICard label="Low-Penetration" value={hoodOpportunity.filter(h => h.penetration < 30).length}
                icon={MapPin} accent="blue" sub="<30% neighborhoods" />
              <KPICard label="Unknown Status" value={stats.unknowns.toLocaleString()} icon={Users} accent="red"
                sub="Need classification" />
            </div>

            <Panel title="Category Whitespace" subtitle="Biggest recruitment pools by category">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={whitespace.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <defs>{HGRADIENTS}</defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                    <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" width={110} tick={axisTickLabel} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                    <Bar dataKey="opportunity" name="Non-member + Unknown" radius={[0, 4, 4, 0]}>
                      {whitespace.slice(0, 12).map((_, i) => (
                        <Cell key={i} fill={i < 3 ? '#22c55e' : i < 6 ? '#3b82f6' : '#334155'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Neighborhood Opportunity" subtitle="Sorted by untapped potential">
                <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-dark">
                  {hoodOpportunity.map(h => (
                    <div key={h.neighborhood}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">{h.neighborhood}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-600">{h.total} total</span>
                          <span className="text-amber-400">{h.opportunity} untapped</span>
                          <span className={h.penetration > 50 ? 'text-emerald-400' : h.penetration > 25 ? 'text-amber-400' : 'text-red-400'}>
                            {h.penetration.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.max(h.penetration, 2)}%`,
                            backgroundColor: h.penetration > 50 ? '#22c55e' : h.penetration > 25 ? '#eab308' : '#ef4444' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Recruit Density" subtitle="Categories with most prospects">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recruitByCat} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <defs>{HGRADIENTS}</defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={false} vertical={true} />
                      <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="category" width={110} tick={axisTickLabel} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                      <Bar dataKey="count" name="Prospects" fill="url(#gAmberH)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
    </RoleGate>
  )
}
