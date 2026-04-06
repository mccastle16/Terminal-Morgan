import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Crosshair } from 'lucide-react'

const MODULES = [
  { id: 'strategic', label: 'Strategic', icon: LayoutDashboard, path: '/terminal/overview', description: 'Dashboards & Analytics' },
  { id: 'tactical',  label: 'Tactical',  icon: Crosshair,       path: '/terminal/tactical', description: 'AI Advisor & Experiments' },
]

export default function ModuleSwitcher({ collapsed }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isTactical = location.pathname.startsWith('/terminal/tactical')
  const activeModule = isTactical ? 'tactical' : 'strategic'

  return (
    <div className="px-2 py-2">
      {collapsed ? (
        // Collapsed: just show icons
        <div className="space-y-1">
          {MODULES.map(mod => (
            <button key={mod.id} onClick={() => navigate(mod.path)}
              className={`w-full flex items-center justify-center p-2 rounded-lg transition-all
                ${activeModule === mod.id
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'}`}
              title={`${mod.label} Development`}
            >
              <mod.icon size={16} />
            </button>
          ))}
        </div>
      ) : (
        // Expanded: pill toggle
        <div className="bg-slate-800/50 rounded-lg p-1 flex gap-1">
          {MODULES.map(mod => (
            <button key={mod.id} onClick={() => navigate(mod.path)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all
                ${activeModule === mod.id
                  ? 'bg-slate-900 text-amber-400 shadow-sm border border-amber-500/20'
                  : 'text-slate-500 hover:text-slate-300'}`}
            >
              <mod.icon size={11} />
              <span>{mod.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
