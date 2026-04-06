import { useTactical } from '../context/TacticalContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { FlaskConical, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

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

const COLORS = ['#f59e0b', '#3b82f6', '#475569', '#10b981', '#8b5cf6', '#ef4444']

function ExperimentCard({ exp }) {
  const [expanded, setExpanded] = useState(true)

  // Find chart specs from the messages related to this experiment
  const chartSpec = []
  if (exp.outcomes) {
    // Auto-build a before/after bar chart from outcomes that have deltas with arrows
    const barData = exp.outcomes
      .filter(o => o.delta && o.delta.includes('→'))
      .map(o => {
        const parts = o.delta.split('→').map(s => parseFloat(s.replace(/[^0-9.]/g, '')))
        return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
          ? { name: o.label.slice(0, 18), Before: parts[0], After: parts[1] }
          : null
      })
      .filter(Boolean)

    if (barData.length > 0) {
      chartSpec.push({ type: 'bar', title: 'Before vs After', data: barData })
    }
  }

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800/60 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-800/30 transition-colors">
        {expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        <FlaskConical size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-slate-200 flex-1 text-left truncate">{exp.title}</span>
        <span className="text-[9px] text-slate-600">{new Date(exp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Parameters */}
          {exp.variables?.length > 0 && (
            <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/40">
              <p className="text-[10px] text-slate-500 font-semibold mb-1.5">PARAMETERS</p>
              <div className="space-y-1">
                {exp.variables.map((v, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{v.label}</span>
                    <span className="text-slate-200 font-medium">{v.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes */}
          {exp.outcomes?.length > 0 && (
            <div className="bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-500/15">
              <p className="text-[10px] text-emerald-500 font-semibold mb-1.5">PROJECTED OUTCOMES</p>
              <div className="space-y-1">
                {exp.outcomes.map((o, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{o.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{o.value}</span>
                      {o.delta && <span className="text-emerald-400 text-[10px]">{o.delta}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-generated charts */}
          {chartSpec.map((spec, i) => (
            <div key={i} className="h-44">
              <p className="text-[10px] text-slate-500 font-semibold mb-1.5">{spec.title.toUpperCase()}</p>
              <ResponsiveContainer width="100%" height="100%">
                {spec.type === 'pie' ? (
                  <PieChart>
                    <Pie data={spec.data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" nameKey="name">
                      {spec.data.map((_, j) => <Cell key={j} fill={COLORS[j % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<DynTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(val) => <span className="text-slate-400">{val}</span>} />
                  </PieChart>
                ) : (
                  <BarChart data={spec.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DynTooltip />} />
                    <Bar dataKey="Before" fill="#475569" radius={[3, 3, 0, 0]} maxBarSize={25} />
                    <Bar dataKey="After" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={25} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExperimentPanel() {
  const { experiments, clearExperiments } = useTactical()

  return (
    <div className="flex flex-col h-full bg-slate-950/50 rounded-xl border border-slate-800/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-amber-500/20 flex items-center justify-center border border-emerald-500/30">
            <FlaskConical size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Experiment Lab</p>
            <p className="text-[10px] text-slate-500">{experiments.length} experiment{experiments.length !== 1 ? 's' : ''} run</p>
          </div>
        </div>
        {experiments.length > 0 && (
          <button onClick={clearExperiments} className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      {/* Experiments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-dark">
        {experiments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 py-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/10 to-amber-500/10 flex items-center justify-center border border-emerald-500/20">
              <FlaskConical size={24} className="text-emerald-400/50" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-300">Experiment Runner</p>
              <p className="text-[11px] text-slate-500 max-w-xs">Simulations appear here when you ask "what if" questions in the AI Advisor chat.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded px-2 py-1">"What if we convert 15% of Band-A?"</span>
              <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded px-2 py-1">"What if rating improves by 0.5?"</span>
            </div>
          </div>
        ) : (
          experiments.map(exp => <ExperimentCard key={exp.id} exp={exp} />)
        )}
      </div>
    </div>
  )
}
