import { useTerminalAuth } from '../context/TerminalAuthContext'

// Hides children if user lacks required permission
export default function RoleGate({ permission, fallback = null, blur = false, children }) {
  const { can } = useTerminalAuth()

  if (!permission || can(permission)) return children

  if (blur) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-center">
            <p className="text-xs text-slate-400">Upgrade access to view</p>
            <p className="text-[10px] text-slate-600 mt-1">Contact your chamber administrator</p>
          </div>
        </div>
      </div>
    )
  }

  return fallback
}
