import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, Clock } from 'lucide-react'

export function TrustBadge({ validation, confidence, corroboration, compact = false }) {
  const conf = parseFloat(confidence) || 0
  const tier = validation || 'Unknown'
  const corr = parseInt(corroboration) || 0

  const cfg = {
    High:     { icon: ShieldCheck,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'High confidence' },
    Moderate: { icon: ShieldAlert,   color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Moderate confidence' },
    Low:      { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Low confidence' },
    Unknown:  { icon: HelpCircle,    color: 'text-slate-500', bg: 'bg-slate-800',     label: 'Unvalidated' },
  }[tier] || { icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-800', label: 'Unvalidated' }

  const Icon = cfg.icon
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
        <Icon size={10} /> {tier}
      </span>
    )
  }
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${cfg.bg}`}>
      <Icon size={14} className={cfg.color} />
      <div>
        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
        <p className="text-[11px] text-slate-500">{(conf * 100).toFixed(0)}% confidence · {corr} source{corr !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

export function MemberBadge({ status }) {
  const cfg = {
    member:       { label: 'Member',     color: 'text-amber-400 bg-amber-500/10' },
    'non-member': { label: 'Non-member', color: 'text-slate-400 bg-slate-800' },
    unknown:      { label: 'Unknown',    color: 'text-orange-400 bg-orange-500/10' },
  }[status] || { label: 'Unknown', color: 'text-slate-500 bg-slate-800' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export function DataQualityBar({ label, percent, threshold = 80 }) {
  const pct = parseFloat(percent) || 0
  const isGood = pct >= threshold
  const isMedium = pct >= threshold * 0.7
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isGood ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs w-10 text-right ${isGood ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-red-400'}`}>
        {pct}%
      </span>
    </div>
  )
}

export function FreshnessBadge({ date }) {
  if (!date) return null
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${days <= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
      <Clock size={10} /> {days === 0 ? 'Today' : `${days}d ago`}
    </span>
  )
}
