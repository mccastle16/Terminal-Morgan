import { useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import {
  Crown, Users, BarChart3, TrendingUp, Star,
  MapPin, Tag, DollarSign, Target, Eye,
  ThumbsUp, Briefcase, PieChart, ArrowRight,
} from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color = 'text-amber-400', bg = 'bg-amber-500/10 border-amber-500/20' }) {
  return (
    <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/60 hover:border-slate-700/80 transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${bg}`}>
          <Icon size={13} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function SponsorPage() {
  const { rawBusinesses, stats, marketAnalytics } = useTerminalData()
  const { tenant } = useTerminalAuth()

  const audience = useMemo(() => {
    if (!rawBusinesses.length) return {}
    const members = rawBusinesses.filter(b => b._memberStatus === 'member')
    const topCategories = stats?.categoryPenetration?.slice(0, 8) || []
    const topNeighborhoods = stats?.neighborhoodPenetration?.slice(0, 6) || []
    const priceDist = stats?.priceTierDist || []
    const avgMemberRating = members.length > 0
      ? (members.reduce((s, b) => s + b._rating, 0) / members.length).toFixed(1)
      : 0
    const websiteRate = members.length > 0
      ? (members.filter(b => b._hasWebsite).length / members.length * 100).toFixed(0)
      : 0

    return { members, topCategories, topNeighborhoods, priceDist, avgMemberRating, websiteRate }
  }, [rawBusinesses, stats])

  return (
    <RoleGate permission="view_sponsorship" blur>
      <div className="space-y-6 animate-fade-in">
        {/* ═══ HERO ═══ */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Crown size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Sponsor Intelligence</h1>
                <p className="text-slate-400 text-sm">
                  Audience data & category intelligence for {tenant?.name || 'Coral Gables'} sponsors and partners
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ AUDIENCE OVERVIEW ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Audience" value={stats?.total || 0} sub="Businesses in ecosystem" icon={Users} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
          <StatCard label="Members" value={stats?.members || 0} sub={`${stats ? ((stats.members / stats.total) * 100).toFixed(0) : 0}% penetration`} icon={Crown} />
          <StatCard label="Avg Rating" value={audience.avgMemberRating || '—'} sub="Member businesses" icon={Star} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
          <StatCard label="Categories" value={stats?.categories?.length || 0} sub="Active business types" icon={Tag} color="text-purple-400" bg="bg-purple-500/10 border-purple-500/20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ TOP CATEGORIES ═══ */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500/40" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <PieChart size={13} className="text-purple-400" />
                </div>
                Category Distribution
              </h3>
              <div className="space-y-2.5">
                {(audience.topCategories || []).map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-32 truncate capitalize">{cat.category.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500/50 rounded-full"
                        style={{ width: `${(cat.total / (stats?.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right font-mono">{cat.total}</span>
                    <span className="text-[10px] text-amber-400 w-10 text-right">{cat.penetration.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ NEIGHBORHOODS ═══ */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/40" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MapPin size={13} className="text-emerald-400" />
                </div>
                Geographic Reach
              </h3>
              <div className="space-y-2.5">
                {(audience.topNeighborhoods || []).map(h => (
                  <div key={h.neighborhood} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-32 truncate">{h.neighborhood}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/50 rounded-full"
                        style={{ width: `${(h.total / (stats?.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right font-mono">{h.total}</span>
                    <span className="text-[10px] text-amber-400 w-10 text-right">{h.penetration.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ AUDIENCE INSIGHTS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden p-5">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/40" />
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <DollarSign size={13} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Price Tier Mix</h3>
            </div>
            <div className="space-y-2">
              {(audience.priceDist || []).map(({ tier, count }) => (
                <div key={tier} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-10">{tier}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/50 rounded-full"
                      style={{ width: `${(count / (stats?.total || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden p-5">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/40" />
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Eye size={13} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Digital Presence</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Website rate</span>
                  <span className="text-xs text-blue-400 font-mono">{audience.websiteRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${audience.websiteRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {audience.websiteRate}% of member businesses have a website presence
              </p>
            </div>
          </div>

          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden p-5">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/40" />
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp size={13} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Market Health</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Market Health Score</span>
                <span className="text-xs text-emerald-400 font-mono">{marketAnalytics?.marketHealthScore?.toFixed(0) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">HHI (Concentration)</span>
                <span className="text-xs text-slate-300 font-mono">{marketAnalytics?.hhi?.toFixed(0) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Top Opportunities</span>
                <span className="text-xs text-amber-400 font-mono">{marketAnalytics?.topOpportunities?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-2xl p-6 text-center">
          <h3 className="text-white font-bold">Interested in Partnership?</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto">
            These insights help sponsors understand the Coral Gables business audience.
            Contact the Chamber for custom audience reports and sponsorship opportunities.
          </p>
          <button className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors">
            Request Custom Report <ArrowRight size={12} className="inline ml-1" />
          </button>
        </div>
      </div>
    </RoleGate>
  )
}
