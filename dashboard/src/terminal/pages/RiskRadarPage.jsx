import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import RoleGate from '../components/RoleGate'
import { MemberBadge } from '../components/TrustBadge'
import KPICard from '../components/KPICard'
import {
  ShieldAlert, AlertTriangle, Star, ChevronRight, Filter,
  XCircle, Search, Eye,
} from 'lucide-react'

export default function RiskRadarPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState('all') // all | critical | moderate
  const [catFilter, setCatFilter] = useState('')

  const flaggedBusinesses = useMemo(() => {
    return rawBusinesses.filter(b => b._hasRedFlag).map(b => {
      const flags = [b.red_flag_1, b.red_flag_2, b.red_flag_3].filter(Boolean)
      const isCritical = flags.some(f => /perm|close|shut|fraud|legal|unsafe/i.test(f))
      return { ...b, _flags: flags, _isCritical: isCritical }
    })
  }, [rawBusinesses])

  const filtered = useMemo(() => {
    let list = flaggedBusinesses
    if (severityFilter === 'critical') list = list.filter(b => b._isCritical)
    if (severityFilter === 'moderate') list = list.filter(b => !b._isCritical)
    if (catFilter) list = list.filter(b => b.category_primary === catFilter)
    return list.sort((a, b) => (b._isCritical ? 1 : 0) - (a._isCritical ? 1 : 0) || b._flags.length - a._flags.length)
  }, [flaggedBusinesses, severityFilter, catFilter])

  const categories = useMemo(() => {
    const set = new Set(flaggedBusinesses.map(b => b.category_primary).filter(Boolean))
    return Array.from(set).sort()
  }, [flaggedBusinesses])

  const criticalCount = useMemo(() => flaggedBusinesses.filter(b => b._isCritical).length, [flaggedBusinesses])

  return (
    <RoleGate permission="view_risk_flags" blur>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <ShieldAlert size={20} className="text-red-500" /> Risk Radar
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Businesses with red flags requiring attention</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPICard label="Flagged Businesses" value={flaggedBusinesses.length} icon={AlertTriangle} accent="red" />
          <KPICard label="Critical" value={criticalCount} sub="Potential closures / serious" icon={XCircle} accent="red" />
          <KPICard label="Moderate" value={flaggedBusinesses.length - criticalCount} icon={ShieldAlert} accent="amber" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-lg p-1">
            {['all', 'critical', 'moderate'].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                  severityFilter === s ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'
                }`}>{s}</button>
            ))}
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-red-500">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
          <span className="text-[11px] text-slate-600 ml-auto">{filtered.length} results</span>
        </div>

        {/* List */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl divide-y divide-slate-800/40 hover:border-slate-700/60 transition-colors">
          {filtered.slice(0, 50).map(biz => (
            <div key={biz._id}
              onClick={() => navigate(`/explorer/${biz._id}`)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 cursor-pointer transition-colors group">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${biz._isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-200 font-medium truncate group-hover:text-amber-400 transition-colors">
                    {biz.business_name}
                  </p>
                  <MemberBadge status={biz._memberStatus} />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {biz.category_primary?.replace(/_/g, ' ')} · {biz.neighborhood_area || 'Coral Gables'}
                </p>
                <div className="mt-1.5 space-y-1">
                  {biz._flags.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle size={10} className={biz._isCritical ? 'text-red-400' : 'text-amber-500'} />
                      <span className="text-[11px] text-red-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Eye size={14} className="text-slate-700 group-hover:text-amber-400 transition-colors mt-1" />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-600 text-sm">No flagged businesses match filters</div>
          )}
          {filtered.length > 50 && (
            <div className="px-4 py-2 text-[11px] text-slate-600 text-center">
              Showing 50 of {filtered.length} — use filters to narrow
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  )
}
