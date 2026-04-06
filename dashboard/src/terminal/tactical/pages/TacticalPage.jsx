import { useState } from 'react'
import { TacticalProvider } from '../context/TacticalContext'
import AdvisorChat from '../components/AdvisorChat'
import DynamicGraphPanel from '../components/DynamicGraphPanel'
import ExperimentPanel from '../components/ExperimentPanel'
import { MessageSquare, BarChart3, FlaskConical } from 'lucide-react'

const RIGHT_TABS = [
  { id: 'graphs', label: 'Dynamic Graphs', icon: BarChart3 },
  { id: 'experiments', label: 'Experiment Lab', icon: FlaskConical },
]

function TacticalContent() {
  const [rightTab, setRightTab] = useState('graphs')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Tactical Development</h1>
          <p className="text-[11px] text-slate-500">AI-powered business intelligence — Chat, visualize, and experiment in real time</p>
        </div>
      </div>

      {/* Split view: Chat (left) | Graphs + Experiments (right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: AI Chat */}
        <div className="min-h-0">
          <AdvisorChat />
        </div>

        {/* Right: Graphs / Experiments with tabs */}
        <div className="min-h-0 flex flex-col">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-2">
            {RIGHT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setRightTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
                  ${rightTab === tab.id
                    ? 'bg-slate-800 text-slate-200 border border-slate-700/60'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 border border-transparent'}`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {rightTab === 'graphs' ? <DynamicGraphPanel /> : <ExperimentPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TacticalPage() {
  return (
    <TacticalProvider>
      <TacticalContent />
    </TacticalProvider>
  )
}
