import { useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import RoleGate from '../components/RoleGate'
import KPICard from '../components/KPICard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import DarkTooltip from '../components/DarkTooltip'
import {
  Lightbulb, TrendingUp, Target, MapPin, Tag, ShieldCheck, Users,
} from 'lucide-react'

export default function MarketIntelPage() {
  const { stats, recruitQueue, rawBusinesses } = useTerminalData()

  // Whitespace analysis: categories with low penetration = opportunity
  const whitespace = useMemo(() => {
    if (!stats) return []
    return stats.categoryPenetration
      .map(c => ({
        category: c.category.replace(/_/g, ' '),
        total: c.total,
        members: c.members,
        nonMembers: c.nonMembers,
        unknowns: c.unknowns,
        penetration: c.total > 0 ? (c.members / c.total * 100) : 0,
        opportunity: c.nonMembers + c.unknowns,
      }))
      .sort((a, b) => b.opportunity - a.opportunity)
  }, [stats])

  // Neighborhood opportunity: hoods with most non-members
  const hoodOpportunity = useMemo(() => {
    if (!stats) return []
    return stats.neighborhoodPenetration
      .map(h => ({
        neighborhood: h.neighborhood,
        total: h.total,
        members: h.members,
        nonMembers: h.nonMembers,
        unknowns: h.unknowns,
        penetration: h.penetration,
        opportunity: h.nonMembers + h.unknowns,
      }))
      .sort((a, b) => b.opportunity - a.opportunity)
  }, [stats])

  // Top recruit categories
  const recruitByCat = useMemo(() => {
    const map = {}
    recruitQueue.forEach(b => {
      const cat = b.category_primary?.replace(/_/g, ' ') || 'Other'
      if (!map[cat]) map[cat] = { count: 0, avgScore: 0, totalScore: 0 }
      map[cat].count++
      map[cat].totalScore += b._recruitScore
    })
    return Object.entries(map)
      .map(([cat, data]) => ({ category: cat.slice(0, 18), count: data.count, avgScore: Math.round(data.totalScore / data.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [recruitQueue])

  if (!stats) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const topOpp = whitespace[0]

  return (
    <RoleGate permission="view_analytics" blur>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Lightbulb size={20} className="text-amber-500" /> Market Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Growth opportunities and whitespace analysis</p>
        </div>

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Recruit Pipeline" value={recruitQueue.length.toLocaleString()} icon={Target} accent="green"
            sub={`${recruitQueue.filter(b => b._recruitBand?.label?.startsWith('A')).length} Band-A prospects`} />
          <KPICard label="Top Opportunity" value={topOpp?.category?.slice(0, 16) ?? '—'} icon={Tag} accent="amber"
            sub={`${topOpp?.opportunity ?? 0} non-member/unknown`} />
          <KPICard label="Untapped Hoods" value={hoodOpportunity.filter(h => h.penetration < 30).length}
            icon={MapPin} accent="blue" sub="<30% penetration" />
          <KPICard label="Unknown Status" value={stats.unknowns.toLocaleString()} icon={Users} accent="red"
            sub="Classify to unlock value" />
        </div>

        {/* Whitespace by Category */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Tag size={14} className="text-emerald-400" /> Category Whitespace</h3>
          <p className="text-[11px] text-slate-500 mb-4">Non-members + unknowns per category — biggest recruitment pools</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={whitespace.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }}
                  formatter={(val, name) => [val, name]} />
                <Bar dataKey="opportunity" name="Non-member + Unknown" radius={[0, 4, 4, 0]}>
                  {whitespace.slice(0, 12).map((_, i) => (
                    <Cell key={i} fill={i < 3 ? '#22c55e' : i < 6 ? '#3b82f6' : '#475569'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two-col: Neighborhood opportunity + Recruit density */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Neighborhood opportunity */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><MapPin size={14} className="text-violet-400" /> Neighborhood Opportunity</h3>
            <p className="text-[11px] text-slate-500 mb-3">Neighborhoods sorted by untapped potential</p>
            <div className="space-y-2.5">
              {hoodOpportunity.map(h => (
                <div key={h.neighborhood}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-300">{h.neighborhood}</span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-slate-500">{h.total} total</span>
                      <span className="text-amber-400 font-bold">{h.opportunity} untapped</span>
                      <span className={`font-mono ${h.penetration > 50 ? 'text-green-400' : h.penetration > 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {h.penetration.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(h.penetration, 2)}%`,
                        backgroundColor: h.penetration > 50 ? '#22c55e' : h.penetration > 25 ? '#eab308' : '#ef4444'
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recruit density by category */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2"><Target size={14} className="text-amber-400" /> Recruit Density by Category</h3>
            <p className="text-[11px] text-slate-500 mb-3">Categories with most recruitable non-members</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recruitByCat} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }} />
                  <Bar dataKey="count" name="Prospects" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  )
}
