/**
 * Shared chart theme – premium dark terminal aesthetic.
 * Import once per page that uses Recharts.
 */

/* ── Axis / cursor constants ──────────────────────────────────────── */
export const axisTick     = { fontSize: 11, fill: '#475569', fontFamily: 'Inter, sans-serif' }
export const axisTickLabel = { fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }
export const barCursor     = { fill: 'rgba(255,255,255,0.04)' }

export const gridStyle = {
  stroke: '#1e293b',
  strokeDasharray: '3 6',
  vertical: false,
}

/* ── Gradient definitions you can drop inside <defs> ──────────────── */
export const GRADIENTS = {
  amber:   { id: 'gAmber',   c1: '#f59e0b', c2: '#d97706' },
  blue:    { id: 'gBlue',    c1: '#3b82f6', c2: '#2563eb' },
  green:   { id: 'gGreen',   c1: '#10b981', c2: '#059669' },
  red:     { id: 'gRed',     c1: '#ef4444', c2: '#dc2626' },
  purple:  { id: 'gPurple',  c1: '#8b5cf6', c2: '#7c3aed' },
  cyan:    { id: 'gCyan',    c1: '#06b6d4', c2: '#0891b2' },
  pink:    { id: 'gPink',    c1: '#ec4899', c2: '#db2777' },
  lime:    { id: 'gLime',    c1: '#84cc16', c2: '#65a30d' },
  slate:   { id: 'gSlate',   c1: '#475569', c2: '#334155' },
}

/**
 * Raw gradient arrays — use inside a plain <defs> element within each chart.
 * Recharts only passes through raw SVG elements, not React components,
 * so these must be rendered as: <defs>{VGRADIENTS}</defs>
 */
export const VGRADIENTS = [
  ...Object.values(GRADIENTS).map(g => (
    <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor={g.c1} stopOpacity={0.9} />
      <stop offset="100%" stopColor={g.c2} stopOpacity={0.6} />
    </linearGradient>
  )),
  ...Object.values(GRADIENTS).map(g => (
    <linearGradient key={`${g.id}Area`} id={`${g.id}Area`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stopColor={g.c1} stopOpacity={0.25} />
      <stop offset="100%" stopColor={g.c1} stopOpacity={0} />
    </linearGradient>
  )),
]

/* ── Horizontal gradient variant (for horizontal bars) ────────────── */
export const HGRADIENTS = Object.values(GRADIENTS).map(g => (
  <linearGradient key={`${g.id}H`} id={`${g.id}H`} x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stopColor={g.c2} stopOpacity={0.6} />
    <stop offset="100%" stopColor={g.c1} stopOpacity={0.9} />
  </linearGradient>
))

/* ── Custom tooltip ───────────────────────────────────────────────── */
export function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  const displayLabel = labelFormatter ? labelFormatter(label) : label
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-xl shadow-black/30 px-3.5 py-2.5 min-w-[140px]">
      {displayLabel && (
        <p className="text-[11px] font-medium text-slate-400 mb-1.5 border-b border-slate-800 pb-1.5">{displayLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400">{entry.name}</span>
            </div>
            <span className="font-semibold text-white tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Custom pie label (external, clean) ───────────────────────────── */
export function PieLabel({ cx, cy, midAngle, outerRadius, name, percent }) {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central" fontSize={11} fontFamily="Inter, sans-serif">
      {name} {(percent * 100).toFixed(0)}%
    </text>
  )
}

/* ── Center stat shown inside donut charts ────────────────────────── */
export function DonutCenter({ cx, cy, value, label }) {
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f8fafc" fontSize={22}
        fontWeight={600} fontFamily="Inter, sans-serif">
        {value}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize={10}
        fontFamily="Inter, sans-serif">
        {label}
      </text>
    </g>
  )
}

/* ── Legend renderer (inline, minimal) ────────────────────────────── */
export function ChartLegend({ payload }) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}
