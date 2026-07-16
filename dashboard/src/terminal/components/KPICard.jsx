import { TrendingUp, TrendingDown } from 'lucide-react'
import InfoTooltip from './InfoTooltip'

export default function KPICard({ label, value, sub, icon: Icon, trend, accent = 'amber', info }) {
  const iconColors = {
    amber:  'text-amber-400',
    blue:   'text-blue-400',
    green:  'text-emerald-400',
    red:    'text-red-400',
    purple: 'text-violet-400',
    slate:  'text-slate-400',
  }
  const bgColors = {
    amber:  'bg-amber-500/10 border-amber-500/20',
    blue:   'bg-blue-500/10 border-blue-500/20',
    green:  'bg-emerald-500/10 border-emerald-500/20',
    red:    'bg-red-500/10 border-red-500/20',
    purple: 'bg-violet-500/10 border-violet-500/20',
    slate:  'bg-slate-500/10 border-slate-500/20',
  }
  const iconColor = iconColors[accent] || iconColors.amber
  const bgColor = bgColors[accent] || bgColors.amber

  return (
    <div className="relative bg-slate-900/50 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors duration-150">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${bgColor}`}>
            <Icon size={14} className={iconColor} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-white tracking-tight">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {trend !== undefined && trend !== 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend > 0 ? <><TrendingUp size={12} className="text-emerald-400" /><span className="text-emerald-400">+{trend}%</span></> : null}
          {trend < 0 ? <><TrendingDown size={12} className="text-red-400" /><span className="text-red-400">{trend}%</span></> : null}
        </div>
      )}
      {info && (
        <div className="absolute bottom-2 right-2">
          <InfoTooltip text={info} side="top" align="right" />
        </div>
      )}
    </div>
  )
}

export function KPICardMini({ label, value, color = 'slate' }) {
  const colorMap = {
    amber: 'text-amber-400', blue: 'text-blue-400', green: 'text-emerald-400',
    red: 'text-red-400', purple: 'text-violet-400', slate: 'text-slate-300',
  }
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${colorMap[color] || colorMap.slate}`}>{value}</p>
    </div>
  )
}
