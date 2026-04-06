import { useState, useRef, useEffect } from 'react'
import { useTactical } from '../context/TacticalContext'
import {
  Send, Trash2, Stethoscope, BookOpen, Target, Activity,
  FileText, BarChart3, FlaskConical, Pin, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Info, ArrowRight, Loader2,
} from 'lucide-react'

// ── Severity badge ──────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const styles = {
    high:   'bg-red-500/15 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    low:    'bg-blue-500/15 text-blue-400 border-blue-500/20',
    none:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    info:   'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[severity] || styles.info}`}>
      {severity}
    </span>
  )
}

// ── Section renderers ───────────────────────────────────────────

function DiagnosisSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      {section.items?.map((item, i) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-1.5">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={item.severity} />
            <span className="text-xs font-medium text-slate-200">{item.issue}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</p>
          {item.action && (
            <div className="flex items-start gap-1.5 pt-1">
              <ArrowRight size={10} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-400/80">{item.action}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ExplanationSection({ section }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300">
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {section.title}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 ml-2 border-l-2 border-amber-500/20 pl-3">
          {section.steps?.map((step, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{step.step}</span>
                <span className="text-xs font-medium text-slate-200">{step.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed ml-7">{step.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationsSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      {section.items?.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
          <div className={`mt-0.5 flex-shrink-0 ${item.priority === 'high' ? 'text-red-400' : item.priority === 'medium' ? 'text-amber-400' : 'text-blue-400'}`}>
            {item.priority === 'high' ? <AlertTriangle size={12} /> : item.priority === 'medium' ? <Target size={12} /> : <Info size={12} />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">{item.tip}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TrackingSection({ section }) {
  if (section.type === 'intake') {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
        <p className="text-[11px] text-slate-400">{section.intro}</p>
        <ol className="space-y-1.5 ml-1">
          {section.questions?.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
              <span className="text-amber-500 font-bold">{i + 1}.</span> {q}
            </li>
          ))}
        </ol>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      <div className="grid grid-cols-1 gap-2">
        {section.items?.map((item, i) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-200">{item.metric}</p>
              <p className="text-[10px] text-slate-500">{item.benchmark}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-amber-400">{item.current}</p>
              <p className="text-[10px] text-slate-500">{item.trend}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummarySection({ section }) {
  const summary = section.summary
  if (!summary) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
        {Object.entries(summary).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-slate-200 font-medium">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
          </div>
        ))}
      </div>
      {section.clinicianNote && (
        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
          <Stethoscope size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-400/90">{section.clinicianNote}</p>
        </div>
      )}
    </div>
  )
}

function ComparisonSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
        <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-500 border-b border-slate-700/50 px-3 py-2">
          <span>Metric</span>
          <span className="text-center">{section.businessA}</span>
          <span className="text-center">{section.businessB}</span>
        </div>
        {section.fields?.map((f, i) => (
          <div key={i} className="grid grid-cols-3 text-[11px] px-3 py-2 border-b border-slate-800/50 last:border-0">
            <span className="text-slate-400">{f.label}</span>
            <span className={`text-center ${f.winner === 'A' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>{f.a}</span>
            <span className={`text-center ${f.winner === 'B' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>{f.b}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExperimentSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
        <FlaskConical size={14} /> {section.title}
      </h4>
      {section.variables && (
        <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
          <p className="text-[10px] text-slate-500 font-semibold uppercase mb-1.5">Parameters</p>
          {section.variables.map((v, i) => (
            <div key={i} className="flex justify-between text-[11px] py-0.5">
              <span className="text-slate-400">{v.label}</span>
              <span className="text-slate-200 font-medium">{v.value}</span>
            </div>
          ))}
        </div>
      )}
      {section.outcomes && (
        <div className="bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-500 font-semibold uppercase mb-1.5">Projected Outcomes</p>
          {section.outcomes.map((o, i) => (
            <div key={i} className="flex justify-between text-[11px] py-0.5">
              <span className="text-slate-400">{o.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-medium">{o.value}</span>
                {o.delta && <span className="text-emerald-400 text-[10px]">{o.delta}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GuideSection({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      <div className="grid grid-cols-1 gap-2">
        {section.capabilities?.map((cap, i) => {
          const icons = { Stethoscope, BookOpen, Target, Activity, FileText, BarChart3, FlaskConical }
          const Icon = icons[cap.icon] || Info
          return (
            <div key={i} className="flex items-start gap-2.5 bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/40 hover:border-amber-500/20 transition-colors">
              <Icon size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-200">{cap.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{cap.description}</p>
                <p className="text-[10px] text-amber-500/70 mt-1 italic">{cap.example}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PromptSection({ section }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-semibold text-amber-400">{section.title}</h4>
      <div className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">{section.content}</div>
    </div>
  )
}

// ── Section router ──────────────────────────────────────────────

function ResponseSection({ section }) {
  switch (section.type) {
    case 'diagnosis':       return <DiagnosisSection section={section} />
    case 'explanation':     return <ExplanationSection section={section} />
    case 'recommendations': return <RecommendationsSection section={section} />
    case 'tracking':
    case 'intake':          return <TrackingSection section={section} />
    case 'summary':         return <SummarySection section={section} />
    case 'comparison':      return <ComparisonSection section={section} />
    case 'experiment':      return <ExperimentSection section={section} />
    case 'guide':           return <GuideSection section={section} />
    case 'prompt':
    case 'info':            return <PromptSection section={section} />
    default:                return <PromptSection section={section} />
  }
}

// ── Chat message bubble ─────────────────────────────────────────

function ChatMessage({ msg, onPinChart }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-amber-500/10 border border-amber-500/20 rounded-xl rounded-tr-sm px-3 py-2">
          <p className="text-xs text-slate-200">{msg.text}</p>
          <p className="text-[9px] text-slate-600 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    )
  }

  const { response } = msg
  if (!response) return null

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-3">
        {/* Advisor avatar */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-cyan-500/20 flex items-center justify-center border border-amber-500/30">
            <Stethoscope size={12} className="text-amber-400" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Business Advisor</span>
          <span className="text-[9px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Response sections */}
        <div className="bg-slate-900/50 rounded-xl rounded-tl-sm border border-slate-800/50 p-3.5 space-y-3">
          {response.sections.map((section, i) => (
            <ResponseSection key={i} section={section} />
          ))}

          {/* Chart pin buttons */}
          {response.chartSpec?.length > 0 && (
            <div className="pt-2 border-t border-slate-800/50 flex flex-wrap gap-1.5">
              {response.chartSpec.map((chart, i) => (
                <button key={i} onClick={() => onPinChart(chart)}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-2 py-1 hover:bg-cyan-500/20 transition-colors">
                  <Pin size={10} /> Pin: {chart.title}
                </button>
              ))}
            </div>
          )}

          {/* Follow-up prompt */}
          {response.followUp && (
            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/30">{response.followUp}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Quick prompts ───────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: 'Market briefing', prompt: 'Give me a market intelligence briefing' },
  { label: 'Diagnose issues', prompt: 'What are the biggest issues in our market data?' },
  { label: 'Top recruits', prompt: 'Who are our best recruitment prospects?' },
  { label: 'Explain scoring', prompt: 'Explain how recruit scoring works step by step' },
  { label: 'Run experiment', prompt: 'What if we convert 15% of Band-A recruits?' },
  { label: 'Data quality', prompt: 'Show me a chart of data quality coverage' },
]

// ── Main Chat Component ─────────────────────────────────────────

export default function AdvisorChat() {
  const { messages, sendMessage, clearChat, isProcessing, pinChart } = useTactical()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isProcessing) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/50 rounded-xl border border-slate-800/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-cyan-500/20 flex items-center justify-center border border-amber-500/30">
            <Stethoscope size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">AI Business Advisor</p>
            <p className="text-[10px] text-slate-500">Diagnose · Explain · Recommend · Experiment</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Trash2 size={10} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-dark">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/10 to-cyan-500/10 flex items-center justify-center border border-amber-500/20">
              <Stethoscope size={24} className="text-amber-400/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-300">Business Intelligence Advisor</p>
              <p className="text-[11px] text-slate-500 max-w-xs">Ask me about your market data. I can diagnose issues, explain metrics, recommend actions, build charts, and run experiments.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
              {QUICK_PROMPTS.map((qp, i) => (
                <button key={i} onClick={() => sendMessage(qp.prompt)}
                  className="text-[10px] text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 hover:border-amber-500/30 hover:text-amber-400 transition-all">
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} onPinChart={pinChart} />
          ))
        )}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 size={14} className="animate-spin text-amber-400" />
            <span className="text-[11px]">Analyzing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/60 p-3 bg-slate-900/20">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business data..."
            rows={1}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 
                       focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 resize-none
                       min-h-[36px] max-h-[80px]"
            style={{ fieldSizing: 'content' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || isProcessing}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 
                       hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
