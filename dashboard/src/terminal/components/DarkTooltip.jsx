export default function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-sm">
      {label != null && (
        <p className="text-[11px] font-medium text-slate-300 mb-1.5 border-b border-slate-700/50 pb-1">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs leading-5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || '#f59e0b' }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-mono font-semibold text-slate-100">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}
