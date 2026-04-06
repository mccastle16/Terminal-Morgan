import { useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import RoleGate from '../components/RoleGate'
import KPICard from '../components/KPICard'
import DarkTooltip from '../components/DarkTooltip'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  BarChart3, PieChart as PieIcon, TrendingUp, Star,
  ShieldCheck, ShieldAlert, Users, Database,
} from 'lucide-react'

const MEMBER_COLORS = { member: '#f59e0b', 'non-member': '#3b82f6', unknown: '#475569' }
const TIER_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e', 4: '#8b5cf6' }
const RATING_BUCKET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

function ChartCard({ title, subtitle, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors ${className}`}>
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        {Icon && <Icon size={14} className="text-amber-400/80" />}
        {title}
      </h3>
      {subtitle && <p className="text-[11px] text-slate-500 mb-3 mt-0.5">{subtitle}</p>}
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const { stats, rawBusinesses } = useTerminalData()

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
      name: `Tier ${tier}`, value: count, color: TIER_COLORS[Number(tier)] || '#64748b'
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
      Members: c.members,
      'Non-members': c.nonMembers,
      Unknown: c.unknowns,
      rate: c.total > 0 ? ((c.members / c.total) * 100).toFixed(0) : 0,
    }))
  }, [stats])

  const hoodPenetration = useMemo(() => {
    if (!stats) return []
    return stats.neighborhoodPenetration.map(h => ({
      name: h.neighborhood.slice(0, 16),
      Members: h.members,
      'Non-members': h.nonMembers,
      Unknown: h.unknowns,
      rate: h.penetration.toFixed(0),
    }))
  }, [stats])

  if (!stats) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <RoleGate permission="view_analytics" blur>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <BarChart3 size={20} className="text-amber-500" /> Market Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Membership penetration and data quality deep-dive</p>
        </div>

        {/* Top KPIs */}
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

        {/* Row 1: Membership pie + Validation pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Membership Distribution" subtitle="Member vs non-member vs unknown" icon={PieIcon}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={memberDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {memberDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Validation Tier Distribution" subtitle="Data quality by corroboration level" icon={ShieldCheck}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={validationDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {validationDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Row 2: Rating distribution */}
        <ChartCard title="Rating Distribution" subtitle="Businesses grouped by Google rating" icon={Star}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDist} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ratingDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Row 3: Category Penetration */}
        <ChartCard title="Category Penetration" subtitle="Members / non-members / unknown by business category (top 15)" icon={BarChart3}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catPenetration} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }} />
                <Bar dataKey="Members" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Non-members" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Unknown" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Row 4: Neighborhood Penetration */}
        <ChartCard title="Neighborhood Penetration" subtitle="Membership distribution by neighborhood" icon={Users}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoodPenetration} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }} />
                <Bar dataKey="Members" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Non-members" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Unknown" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </RoleGate>
  )
}
