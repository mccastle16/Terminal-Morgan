import { useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import { StaticBadge } from '../components/TrustBadge'
import {
  RefreshCw, Database, Clock, CheckCircle, AlertTriangle,
  BarChart3, Activity, Shield, Globe, Phone,
  MapPin, Star, Users, FileText,
} from 'lucide-react'

function QualityBar({ label, icon: Icon, percent, threshold = 80 }) {
  const pct = parseFloat(percent) || 0
  const isGood = pct >= threshold
  const isMedium = pct >= threshold * 0.7
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon size={11} className="text-slate-400" />
      </div>
      <span className="text-xs text-slate-400 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isGood ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs w-12 text-right font-mono ${isGood ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-red-400'}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

export default function DataRefreshPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { tenant } = useTerminalAuth()

  const lastRefresh = tenant?.lastRefresh || '2026-03-02'
  const daysSince = Math.floor((Date.now() - new Date(lastRefresh).getTime()) / 86400000)

  const coverage = useMemo(() => {
    if (!rawBusinesses.length) return {}
    const tot = rawBusinesses.length
    return {
      website: (rawBusinesses.filter(b => b._hasWebsite).length / tot * 100),
      phone: (rawBusinesses.filter(b => b._hasPhone).length / tot * 100),
      geo: (rawBusinesses.filter(b => b._hasGeo).length / tot * 100),
      rating: (rawBusinesses.filter(b => b._rating > 0).length / tot * 100),
      address: (rawBusinesses.filter(b => b.formatted_address).length / tot * 100),
      email: (rawBusinesses.filter(b => b.email).length / tot * 100),
      category: (rawBusinesses.filter(b => b.category_primary).length / tot * 100),
      neighborhood: (rawBusinesses.filter(b => b.neighborhood_area).length / tot * 100),
    }
  }, [rawBusinesses])

  const validationDist = useMemo(() => {
    const tiers = { 1: 0, 2: 0, 3: 0, 4: 0 }
    rawBusinesses.forEach(b => { const t = b._validationTier || 1; tiers[t] = (tiers[t] || 0) + 1 })
    return tiers
  }, [rawBusinesses])

  const sourceDist = useMemo(() => {
    const map = {}
    rawBusinesses.forEach(b => {
      (b.source_list || '').split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
        map[s] = (map[s] || 0) + 1
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [rawBusinesses])

  const overallQuality = coverage.website && coverage.phone && coverage.geo && coverage.rating
    ? ((coverage.website + coverage.phone + coverage.geo + coverage.rating) / 4) : 0

  return (
    <RoleGate permission="manage_data" blur>
      <div className="space-y-6 animate-fade-in">
        {/* ═══ HERO ═══ */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                  <Database size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Data Refresh Monitor</h1>
                  <p className="text-slate-400 text-sm">Track data freshness, quality coverage, and source health</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StaticBadge />
                <div className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                  daysSince <= 7 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  daysSince <= 30 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <Clock size={12} className="inline mr-1.5" />
                  Last refresh: {daysSince}d ago
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ KPI ROW ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Records', value: rawBusinesses.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Quality Score', value: `${overallQuality.toFixed(0)}%`, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Sources', value: sourceDist.length, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
            { label: 'Red Flags', value: stats?.redFlagCount || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'High Validation', value: `${((validationDist[3] + validationDist[4]) / rawBusinesses.length * 100 || 0).toFixed(0)}%`, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${bg}`}>
                  <Icon size={13} className={color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ FIELD COVERAGE ═══ */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500/40" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <BarChart3 size={13} className="text-cyan-400" />
                </div>
                Field Coverage
              </h3>
              <QualityBar label="Website" icon={Globe} percent={coverage.website} />
              <QualityBar label="Phone" icon={Phone} percent={coverage.phone} />
              <QualityBar label="Geo location" icon={MapPin} percent={coverage.geo} />
              <QualityBar label="Ratings" icon={Star} percent={coverage.rating} />
              <QualityBar label="Address" icon={MapPin} percent={coverage.address} />
              <QualityBar label="Email" icon={FileText} percent={coverage.email} threshold={50} />
              <QualityBar label="Category" icon={Activity} percent={coverage.category} />
              <QualityBar label="Neighborhood" icon={Users} percent={coverage.neighborhood} />
            </div>
          </div>

          {/* ═══ VALIDATION TIERS ═══ */}
          <div className="space-y-5">
            <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/40" />
              <div className="p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Shield size={13} className="text-amber-400" />
                  </div>
                  Validation Tiers
                </h3>
                {[
                  { tier: 4, label: 'Fully corroborated', color: 'bg-emerald-500' },
                  { tier: 3, label: 'Cross-validated', color: 'bg-amber-500' },
                  { tier: 2, label: 'Multiple sources', color: 'bg-orange-500' },
                  { tier: 1, label: 'Single source', color: 'bg-red-500' },
                ].map(({ tier, label, color }) => {
                  const count = validationDist[tier] || 0
                  const pct = rawBusinesses.length > 0 ? (count / rawBusinesses.length * 100) : 0
                  return (
                    <div key={tier} className="flex items-center gap-3 py-2">
                      <span className="text-xs text-slate-400 w-36">T{tier}: {label}</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-20 text-right font-mono">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ═══ SOURCE BREAKDOWN ═══ */}
            <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/40" />
              <div className="p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Database size={13} className="text-blue-400" />
                  </div>
                  Source Distribution
                </h3>
                <div className="space-y-2">
                  {sourceDist.map(([src, count]) => {
                    const pct = (count / rawBusinesses.length * 100)
                    return (
                      <div key={src} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-32 truncate">{src}</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-20 text-right font-mono">{count}</span>
                      </div>
                    )
                  })}
                  {sourceDist.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">No source data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ REFRESH SCHEDULE ═══ */}
        <div className="bg-cyan-500/[0.04] border border-cyan-500/15 rounded-xl p-4 flex items-center gap-4">
          <RefreshCw size={18} className="text-cyan-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium flex items-center gap-2">
              Refresh Cadence: {tenant?.refreshCadence || 'Weekly'} <StaticBadge />
            </p>
            <p className="text-xs text-slate-400">
              Next scheduled refresh: {new Date(new Date(lastRefresh).getTime() + 7 * 86400000).toLocaleDateString()}
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-bold hover:bg-cyan-500/25 transition-all">
            <RefreshCw size={12} className="inline mr-1.5" /> Manual Refresh
          </button>
        </div>
      </div>
    </RoleGate>
  )
}
