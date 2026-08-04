import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import KPICard from '../components/KPICard'
import RoleGate from '../components/RoleGate'
import { DataQualityBar, MemberBadge } from '../components/TrustBadge'
import {
  Building2, Users, UserPlus, ShieldAlert, BarChart3, Star,
  AlertTriangle, ArrowRight, Database, LayoutDashboard,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { HGRADIENTS, ChartTooltip, axisTick, axisTickLabel, barCursor } from '../components/ChartTheme'

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
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-amber-400" />
          </div>
          Overview
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {stats.total.toLocaleString()} businesses · {stats.categories.length} categories · {stats.neighborhoods.length} neighborhoods
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

      {/* Chart + Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RoleGate permission="view_analytics" blur>
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <BarChart3 size={12} className="text-amber-400" />
                  </div>
                  Membership by Category
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 ml-[34px]">Top 12 sectors</p>
              </div>
              <button onClick={() => navigate('/analytics')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={penetrationData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                  <defs>{HGRADIENTS}</defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={axisTickLabel} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={barCursor} />
                  <Bar dataKey="Members" stackId="a" fill="url(#gAmberH)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Non-members" stackId="a" fill="url(#gBlueH)" />
                  <Bar dataKey="Unknown" stackId="a" fill="url(#gSlateH)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Members</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Non-members</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-slate-600" /> Unknown</span>
            </div>
          </div>
        </RoleGate>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Database size={12} className="text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-white">Data Quality</h3>
          </div>
          <div className="space-y-3">
            <DataQualityBar label="Phone" percent={stats.dataQuality.phoneCoverage} />
            <DataQualityBar label="Website" percent={stats.dataQuality.websiteCoverage} />
            <DataQualityBar label="Coordinates" percent={stats.dataQuality.geoCoverage} />
            <DataQualityBar label="Rating" percent={stats.dataQuality.ratingCoverage} />
            <DataQualityBar label="High valid." percent={stats.dataQuality.highValidationRate} threshold={50} />
          </div>
          {stats.unknowns > 0 && (
            <div className="mt-4 p-3 rounded-md bg-orange-500/5 border border-orange-500/10">
              <p className="text-xs text-orange-400 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                {stats.unknowns.toLocaleString()} unknown membership status
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                {(100 - stats.membershipKnownRate).toFixed(1)}% need classification
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Recruit Targets */}
      <RoleGate permission="view_recruit_queue" blur>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <UserPlus size={12} className="text-emerald-400" />
                </div>
                Top Recruitment Targets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 ml-[34px]">Highest-scored prospects</p>
            </div>
            <button onClick={() => navigate('/recruit')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
              Full queue <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-px">
            {topRecruits.map((biz, i) => (
              <div key={biz._id}
                onClick={() => navigate(`/explorer/${biz._id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800/50 cursor-pointer transition-colors group">
                <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                    {biz.business_name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {biz.category_primary?.replace(/_/g, ' ')} · {biz.neighborhood_area || 'Coral Gables'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {biz._rating > 0 && (
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Star size={11} className="text-amber-500" /> {biz._rating.toFixed(1)}
                    </span>
                  )}
                  <MemberBadge status={biz._memberStatus} />
                  <span className="text-xs text-emerald-400">{biz._recruitScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RoleGate>
    </div>
  )
}

