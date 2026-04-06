import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function KPICard({ label, value, sub, icon: Icon, trend, accent = 'amber' }) {
  const accentMap = {
    amber:  { text: 'text-amber-400',   bg: 'bg-amber-500/10',   glow: 'shadow-amber-500/5',   border: 'hover:border-amber-500/20', ring: 'ring-amber-500/10' },
    blue:   { text: 'text-blue-400',     bg: 'bg-blue-500/10',    glow: 'shadow-blue-500/5',    border: 'hover:border-blue-500/20',  ring: 'ring-blue-500/10'  },
    green:  { text: 'text-emerald-400',  bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/5', border: 'hover:border-emerald-500/20', ring: 'ring-emerald-500/10' },
    red:    { text: 'text-red-400',      bg: 'bg-red-500/10',     glow: 'shadow-red-500/5',     border: 'hover:border-red-500/20',   ring: 'ring-red-500/10'   },
    purple: { text: 'text-violet-400',   bg: 'bg-violet-500/10',  glow: 'shadow-violet-500/5',  border: 'hover:border-violet-500/20', ring: 'ring-violet-500/10' },
    slate:  { text: 'text-slate-400',    bg: 'bg-slate-700',      glow: 'shadow-slate-500/5',   border: 'hover:border-slate-600',    ring: 'ring-slate-500/10' },
  }

  const a = accentMap[accent] || accentMap.amber

  return (
    <div className={`group relative bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-4 ${a.border} transition-all duration-300 hover:shadow-lg ${a.glow}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center ring-1 ${a.ring} transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={15} className={a.text} />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white font-mono tracking-tight">{value}</span>
        {sub && <span className="text-xs text-slate-500 mb-0.5">{sub}</span>}
      </div>
      {trend !== undefined && (
        <div className="mt-2.5 flex items-center gap-1 text-xs">
          {trend > 0 && <><TrendingUp size={12} className="text-emerald-400" /><span className="text-emerald-400 font-medium">+{trend}%</span></>}
          {trend < 0 && <><TrendingDown size={12} className="text-red-400" /><span className="text-red-400 font-medium">{trend}%</span></>}
          {trend === 0 && <><Minus size={12} className="text-slate-500" /><span className="text-slate-500">No change</span></>}
        </div>
      )}
    </div>
  )
}

export function KPICardMini({ label, value, color = 'slate' }) {
  const colorMap = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-violet-400',
    slate: 'text-slate-300',
  }
  return (
    <div className="bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/30 hover:border-slate-700/60 transition-colors">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold font-mono ${colorMap[color] || colorMap.slate}`}>{value}</p>
    </div>
  )
}
