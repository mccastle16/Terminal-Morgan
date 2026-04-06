import { useTactical } from '../context/TacticalContext'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { X, Pin, BarChart3, PieChartIcon } from 'lucide-react'

// ── Custom dark tooltip for dynamic charts ───────────────────────

function DynTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl">
      {label && <p className="text-[10px] text-slate-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-slate-100 font-semibold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Render a single chart spec ──────────────────────────────────

function DynamicChart({ spec, onUnpin }) {
  const COLORS = ['#f59e0b', '#3b82f6', '#475569', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {spec.type === 'pie' ? <PieChartIcon size={14} className="text-cyan-400" /> : <BarChart3 size={14} className="text-cyan-400" />}
          <h4 className="text-xs font-semibold text-slate-200">{spec.title}</h4>
        </div>
        {onUnpin && (
          <button onClick={() => onUnpin(spec.id)} className="text-slate-600 hover:text-red-400 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'pie' ? (
            <PieChart>
              <Pie
                data={spec.data}
                cx="50%" cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {spec.data.map((entry, i) => (
                  <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DynTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(val) => <span className="text-slate-400">{val}</span>}
              />
            </PieChart>
          ) : (
            <BarChart data={spec.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DynTooltip />} />
              {getBarKeys(spec.data).map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={30} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Helper to extract bar data keys (exclude 'name', 'fill')
function getBarKeys(data) {
  if (!data?.length) return []
  const skip = new Set(['name', 'fill'])
  return Object.keys(data[0]).filter(k => !skip.has(k))
}

// ── Main Dynamic Graph Panel ────────────────────────────────────

export default function DynamicGraphPanel() {
  const { pinnedCharts, unpinChart, messages } = useTactical()

  // Collect all charts from conversation (most recent first)
  const conversationCharts = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'advisor' && msg.response?.chartSpec?.length > 0) {
      msg.response.chartSpec.forEach(spec => {
        conversationCharts.push({ ...spec, id: `conv_${i}_${conversationCharts.length}`, source: 'conversation' })
      })
    }
  }

  const hasPinned = pinnedCharts.length > 0
  const hasConversation = conversationCharts.length > 0

  return (
    <div className="flex flex-col h-full bg-slate-950/50 rounded-xl border border-slate-800/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center border border-cyan-500/30">
            <BarChart3 size={14} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Dynamic Graphs</p>
            <p className="text-[10px] text-slate-500">
              {pinnedCharts.length} pinned · {conversationCharts.length} from chat
            </p>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-dark">
        {!hasPinned && !hasConversation ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 py-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-500/10 flex items-center justify-center border border-cyan-500/20">
              <BarChart3 size={24} className="text-cyan-400/50" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-300">Dynamic Graph Builder</p>
              <p className="text-[11px] text-slate-500 max-w-xs">Charts appear here as you interact with the AI Advisor. Ask for visualizations or pin charts from responses.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded px-2 py-1">"Show me a pie chart of membership"</span>
              <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded px-2 py-1">"Bar chart of top categories"</span>
              <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded px-2 py-1">"Rating distribution"</span>
            </div>
          </div>
        ) : (
          <>
            {/* Pinned charts */}
            {hasPinned && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 uppercase font-semibold">
                  <Pin size={10} /> Pinned Charts
                </div>
                {pinnedCharts.map(chart => (
                  <DynamicChart key={chart.id} spec={chart} onUnpin={unpinChart} />
                ))}
              </div>
            )}

            {/* Conversation charts */}
            {hasConversation && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-semibold">
                  <BarChart3 size={10} /> From Conversation
                </div>
                {conversationCharts.map(chart => (
                  <DynamicChart key={chart.id} spec={chart} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
