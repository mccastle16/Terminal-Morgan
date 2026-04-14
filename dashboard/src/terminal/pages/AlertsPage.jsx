import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  Bell, ShieldAlert, TrendingDown, AlertTriangle, Clock, RefreshCw,
  Building2, ChevronRight, CheckCircle, Filter, Flame, Eye,
  Lightbulb, Users, Star, XCircle,
} from 'lucide-react'

function AlertCard({ alert, onDismiss, onNavigate }) {
  const priorityStyles = {
    critical: 'border-l-red-500 bg-red-500/[0.03]',
    warning:  'border-l-amber-500 bg-amber-500/[0.02]',
    info:     'border-l-blue-500 bg-blue-500/[0.02]',
    success:  'border-l-emerald-500 bg-emerald-500/[0.02]',
  }
  const priorityBadge = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/25',
    warning:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }
  const Icon = alert.icon

  return (
    <div className={`relative bg-slate-900/40 rounded-xl border-l-[3px] border border-slate-800/60 overflow-hidden transition-all hover:border-slate-700/80 ${priorityStyles[alert.priority]}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${priorityBadge[alert.priority]}`}>
            <Icon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${priorityBadge[alert.priority]}`}>
                {alert.priority}
              </span>
              <span className="text-[10px] text-slate-600">{alert.category}</span>
              <span className="text-[10px] text-slate-700 ml-auto">{alert.time}</span>
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">{alert.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
            {alert.businesses && alert.businesses.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {alert.businesses.slice(0, 3).map((b, i) => (
                  <button key={i} onClick={() => onNavigate(`/explorer/${b._id}`)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800/60 border border-slate-700/40 rounded-md text-[10px] text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-colors">
                    <Building2 size={9} /> {b.business_name?.substring(0, 25)}
                  </button>
                ))}
                {alert.businesses.length > 3 && (
                  <span className="text-[10px] text-slate-600">+{alert.businesses.length - 3} more</span>
                )}
              </div>
            )}
          </div>
          <button onClick={() => onDismiss(alert.id)}
            className="p-1.5 rounded-lg text-slate-700 hover:text-slate-400 hover:bg-slate-800/50 transition-colors flex-shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const { rawBusinesses, stats, deltaData } = useTerminalData()
  const { tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState([])
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const alerts = useMemo(() => {
    if (!stats || rawBusinesses.length === 0) return []
    const items = []
    let id = 0

    // RISK ALERTS — Critical red flags
    const criticalFlags = rawBusinesses.filter(b => b._hasRedFlag && b._redFlagSeverity === 'Critical')
    if (criticalFlags.length > 0) {
      items.push({
        id: id++, priority: 'critical', category: 'Risk Alert',
        icon: Flame,
        title: `${criticalFlags.length} Critical Risk Flag${criticalFlags.length > 1 ? 's' : ''} Detected`,
        description: `${criticalFlags.length} businesses have critical-severity risk flags requiring immediate attention.`,
        businesses: criticalFlags.slice(0, 5),
        time: 'Active',
      })
    }

    // All red flags
    const allFlagged = rawBusinesses.filter(b => b._hasRedFlag)
    if (allFlagged.length > criticalFlags.length) {
      items.push({
        id: id++, priority: 'warning', category: 'Risk Alert',
        icon: ShieldAlert,
        title: `${allFlagged.length} Total Businesses With Risk Flags`,
        description: `${allFlagged.length} businesses have active risk flags (${criticalFlags.length} critical, ${allFlagged.length - criticalFlags.length} other).`,
        businesses: allFlagged.filter(b => b._redFlagSeverity !== 'Critical').slice(0, 5),
        time: 'Active',
      })
    }

    // DATA FRESHNESS — based on lastRefresh
    const lastRefresh = new Date(tenant.lastRefresh)
    const daysSince = Math.floor((Date.now() - lastRefresh.getTime()) / 86400000)
    if (daysSince > 30) {
      items.push({
        id: id++, priority: daysSince > 60 ? 'critical' : 'warning', category: 'Data Freshness',
        icon: Clock,
        title: `Data is ${daysSince} Days Old`,
        description: `Last data refresh was ${tenant.lastRefresh}. Recommended refresh cadence is ${tenant.refreshCadence}.`,
        businesses: [],
        time: `${daysSince}d overdue`,
      })
    }

    // MEMBERSHIP UNKNOWNS
    if (stats.unknowns > 0) {
      const unknowns = rawBusinesses.filter(b => b._memberStatus === 'unknown')
      items.push({
        id: id++,
        priority: stats.unknowns > 500 ? 'critical' : stats.unknowns > 100 ? 'warning' : 'info',
        category: 'Data Quality',
        icon: AlertTriangle,
        title: `${stats.unknowns} Businesses With Unknown Membership`,
        description: 'Unknown membership status weakens penetration metrics. Resolve these to strengthen the core membership story.',
        businesses: unknowns.slice(0, 5),
        time: 'Ongoing',
      })
    }

    // LOW CONFIDENCE businesses
    const lowConfidence = rawBusinesses.filter(b => b._confidence < 0.4)
    if (lowConfidence.length > 0) {
      items.push({
        id: id++, priority: 'warning', category: 'Data Quality',
        icon: Eye,
        title: `${lowConfidence.length} Low-Confidence Records`,
        description: 'These businesses have low data confidence scores (<40%). Consider re-scraping or manual verification.',
        businesses: lowConfidence.slice(0, 5),
        time: 'Active',
      })
    }

    // OPPORTUNITY ALERTS — high-value recruit targets
    const hotRecruits = rawBusinesses.filter(b => b._memberStatus !== 'member' && b._recruitScore >= 80)
    if (hotRecruits.length > 0) {
      items.push({
        id: id++, priority: 'info', category: 'Opportunity',
        icon: Lightbulb,
        title: `${hotRecruits.length} High-Value Recruit Targets`,
        description: 'These non-member businesses have recruitability scores of 80+ — prime candidates for outreach.',
        businesses: hotRecruits.sort((a, b) => b._recruitScore - a._recruitScore).slice(0, 5),
        time: 'Active',
      })
    }

    // LOW RATING MEMBERS
    const lowRatedMembers = rawBusinesses.filter(b => b._memberStatus === 'member' && b._rating > 0 && b._rating < 3.0)
    if (lowRatedMembers.length > 0) {
      items.push({
        id: id++, priority: 'warning', category: 'Member Health',
        icon: TrendingDown,
        title: `${lowRatedMembers.length} Members With Ratings Below 3.0`,
        description: 'These chamber members have concerning ratings. Consider proactive outreach to support improvement.',
        businesses: lowRatedMembers.slice(0, 5),
        time: 'Active',
      })
    }

    // DELTA CHANGES
    if (deltaData?.changes?.length > 0) {
      const negRating = deltaData.changes.filter(d => d.field === 'rating' && d.direction === 'down')
      if (negRating.length > 0) {
        items.push({
          id: id++, priority: 'info', category: 'Change Detection',
          icon: RefreshCw,
          title: `${negRating.length} Rating Declines Detected`,
          description: 'Recent data refresh found businesses with declining ratings since last scrape.',
          businesses: [],
          time: 'Recent',
        })
      }
    }

    // SUCCESS: high penetration categories
    const highPen = stats.categoryPenetration.filter(c => c.penetration > 70 && c.total >= 5)
    if (highPen.length > 0) {
      items.push({
        id: id++, priority: 'success', category: 'Milestone',
        icon: CheckCircle,
        title: `${highPen.length} Categories Above 70% Penetration`,
        description: `Strong chamber presence in: ${highPen.map(c => c.category.replace(/_/g, ' ')).join(', ')}.`,
        businesses: [],
        time: 'Current',
      })
    }

    return items
  }, [rawBusinesses, stats, deltaData, tenant])

  const visible = useMemo(() => {
    return alerts.filter(a => {
      if (dismissed.includes(a.id)) return false
      if (filterPriority && a.priority !== filterPriority) return false
      if (filterCategory && a.category !== filterCategory) return false
      return true
    })
  }, [alerts, dismissed, filterPriority, filterCategory])

  const categories = [...new Set(alerts.map(a => a.category))]
  const criticalCount = alerts.filter(a => a.priority === 'critical' && !dismissed.includes(a.id)).length
  const warningCount = alerts.filter(a => a.priority === 'warning' && !dismissed.includes(a.id)).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center relative">
                <Bell size={20} className="text-amber-400" />
                {criticalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {criticalCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Alerts Center</h1>
                <p className="text-slate-400 text-sm">Risk alerts, data quality warnings, and opportunity notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-medium text-amber-400">
                  {warningCount} Warnings
                </span>
              )}
              <span className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-400">
                {visible.length} Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter size={13} /> <span>Filter:</span>
        </div>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {dismissed.length > 0 && (
          <button onClick={() => setDismissed([])}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Show {dismissed.length} dismissed
          </button>
        )}
      </div>

      {/* ═══ ALERT LIST ═══ */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">All Clear</h3>
            <p className="text-sm text-slate-500">No active alerts at this time</p>
          </div>
        ) : (
          visible.map(alert => (
            <AlertCard key={alert.id} alert={alert}
              onDismiss={(id) => setDismissed(prev => [...prev, id])}
              onNavigate={(path) => navigate(path)} />
          ))
        )}
      </div>
    </div>
  )
}
