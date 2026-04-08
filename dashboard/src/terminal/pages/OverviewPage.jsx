import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import KPICard from '../components/KPICard'
import RoleGate from '../components/RoleGate'
import { DataQualityBar, MemberBadge } from '../components/TrustBadge'
import {
  Building2, Users, UserPlus, ShieldAlert, BarChart3, Star,
  AlertTriangle, ArrowRight, Globe, Phone, MapPin, Database,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import DarkTooltip from '../components/DarkTooltip'

const BAR_COLORS = ['#f59e0b', '#3b82f6', '#6b7280']

export default function OverviewPage() {
  const { stats, recruitQueue, rawBusinesses } = useTerminalData()
  const { user, can } = useTerminalAuth()
  const navigate = useNavigate()

  const topRecruits = useMemo(() => recruitQueue.slice(0, 5), [recruitQueue])

  const penetrationData = useMemo(() => {
    if (!stats) return []
    return stats.categoryPenetration.slice(0, 12).map(c => ({
      name: c.category.replace(/_/g, ' ').slice(0, 14),
      Members: c.members,
      'Non-members': c.nonMembers,
      Unknown: c.unknowns,
    }))
  }, [stats])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Market Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          <span className="text-slate-400 font-medium">{stats.total.toLocaleString()}</span> businesses across{' '}
          <span className="text-slate-400 font-medium">{stats.categories.length}</span> categories ·{' '}
          <span className="text-slate-400 font-medium">{stats.neighborhoods.length}</span> neighborhoods
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Businesses" value={stats.total.toLocaleString()} icon={Building2} accent="amber" />
        <KPICard label="Chamber Members" value={stats.members.toLocaleString()}
          sub={`${(stats.members / stats.total * 100).toFixed(1)}% penetration`} icon={Users} accent="blue" />
        <KPICard label="Non-Members" value={stats.nonMembers.toLocaleString()}
          sub={`${stats.unknowns.toLocaleString()} unknown`} icon={UserPlus} accent="green" />
        <KPICard label="Risk Flags" value={stats.redFlagCount.toLocaleString()}
          sub={`${stats.criticalFlags} critical`} icon={ShieldAlert} accent="red" />
      </div>

      {/* Two-column: Penetration Chart + Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Penetration chart */}
        <RoleGate permission="view_analytics" blur>
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 size={14} className="text-amber-400" />
                  Membership Penetration by Category
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Members vs non-members vs unknowns per sector</p>
              </div>
              <button onClick={() => navigate('/analytics')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors">
                Full analytics <ArrowRight size={12} />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={penetrationData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }} />
                  <Bar dataKey="Members" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Non-members" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Unknown" stackId="a" fill="#475569" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Members</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Non-members</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-600" /> Unknown</span>
            </div>
          </div>
        </RoleGate>

        {/* Data Quality Panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-blue-400/80" />
            <h3 className="text-sm font-semibold text-white">Data Quality</h3>
          </div>
          <div className="space-y-3">
            <DataQualityBar label="Phone" percent={stats.dataQuality.phoneCoverage} />
            <DataQualityBar label="Website" percent={stats.dataQuality.websiteCoverage} />
            <DataQualityBar label="Coordinates" percent={stats.dataQuality.geoCoverage} />
            <DataQualityBar label="Rating" percent={stats.dataQuality.ratingCoverage} />
            <DataQualityBar label="High valid." percent={stats.dataQuality.highValidationRate} threshold={50} />
          </div>

          {/* Membership data quality warning */}
          {stats.unknowns > 0 && (
            <div className="mt-4 p-2.5 rounded-lg bg-orange-950/30 border border-orange-900/30">
              <p className="text-[11px] text-orange-400 font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} />
                {stats.unknowns.toLocaleString()} businesses have unknown membership status
              </p>
              <p className="text-[10px] text-orange-600 mt-1">
                {(100 - stats.membershipKnownRate).toFixed(1)}% of records need membership classification
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Top Recruit Targets + Risk Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top recruit targets */}
        <RoleGate permission="view_recruit_queue" blur>
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <UserPlus size={14} className="text-emerald-400" />
                  Top Recruitment Targets
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Highest-scored non-member prospects</p>
              </div>
              <button onClick={() => navigate('/recruit')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors">
                Full queue <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-1.5">
              {topRecruits.map((biz, i) => (
                <div key={biz._id}
                  onClick={() => navigate(`/explorer/${biz._id}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <span className="text-[10px] font-mono text-slate-600 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 font-medium truncate group-hover:text-amber-400 transition-colors">
                      {biz.business_name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {biz.category_primary?.replace(/_/g, ' ')} · {biz.neighborhood_area || 'Coral Gables'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {biz._rating > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Star size={10} className="text-amber-500" /> {biz._rating.toFixed(1)}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono`}
                      style={{ color: biz._recruitBand?.color, backgroundColor: biz._recruitBand?.color + '15' }}>
                      {biz._recruitScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RoleGate>

        {/* Neighborhood penetration */}
        <RoleGate permission="view_analytics" blur>
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin size={14} className="text-violet-400" />
                Penetration by Neighborhood
              </h3>
              <button onClick={() => navigate('/analytics')}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors">
                Detail <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {stats.neighborhoodPenetration.slice(0, 8).map(hood => (
                <div key={hood.neighborhood} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-300">{hood.neighborhood}</span>
                    <span className="text-[10px] text-slate-500">
                      {hood.members}/{hood.total} · <span className="text-amber-400">{hood.penetration.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.max(hood.penetration, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RoleGate>
      </div>
    </div>
  )
}
