import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import ErrorBoundary from './ErrorBoundary'
import ModuleSwitcher from './ModuleSwitcher'
import {
  LayoutDashboard, Search, Building2, BarChart3, GitCompare, ShieldAlert,
  UserPlus, TrendingUp, LogOut, ChevronLeft, ChevronRight, Terminal,
  User, Shield, Database, Crosshair, Zap, Users, Share2, FlaskConical, FileText, Brain,
} from 'lucide-react'

const STRATEGIC_NAV = [
  { to: '/overview',    icon: LayoutDashboard, label: 'Overview',       permission: null },
  { to: '/my-business', icon: Building2,       label: 'My Business',    permission: null },
  { to: '/browse',      icon: Search,          label: 'Browse',         permission: 'view_all_businesses' },
  { to: '/analytics',   icon: BarChart3,       label: 'Analytics',      permission: 'view_analytics' },
  { to: '/compare',     icon: GitCompare,      label: 'Compare',        permission: 'view_compare' },
  { to: '/risks',       icon: ShieldAlert,     label: 'Risk Radar',     permission: 'view_risk_flags' },
  { to: '/recruit',     icon: UserPlus,        label: 'Recruit Queue',  permission: 'view_recruit_queue' },
  { to: '/playbook',    icon: Zap,             label: 'Playbook',       permission: 'view_analytics' },
  { to: '/ecosystem',   icon: Users,           label: 'Ecosystem',      permission: null },
]

const TACTICAL_NAV = [
  { to: '/tactical',      icon: Crosshair,       label: 'AI Advisor',     permission: null },
  { to: '/intelligence',  icon: Brain,           label: 'Intelligence',   permission: 'view_analytics' },
  { to: '/graph',         icon: Share2,          label: 'Graph Analytics', permission: 'view_analytics' },
  { to: '/experiments',   icon: FlaskConical,    label: 'Experiments',    permission: 'view_analytics' },
  { to: '/content',       icon: FileText,        label: 'Content Studio', permission: null },
]

export default function TerminalLayout() {
  const { user, logout, can, tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isTactical = location.pathname.startsWith('/tactical') ||
    location.pathname.startsWith('/intelligence') ||
    location.pathname.startsWith('/graph') ||
    location.pathname.startsWith('/experiments') ||
    location.pathname.startsWith('/content')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = isTactical ? TACTICAL_NAV : STRATEGIC_NAV
  const visibleNav = navItems.filter(item => !item.permission || can(item.permission))

  return (
    <div className="h-screen flex bg-slate-950 text-slate-200 overflow-hidden terminal-charts">
      {/* ── Nav Rail ─────────────────────────────────── */}
      <aside className={`flex flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Brand */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/5">
            <Terminal size={18} className="text-amber-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">The Terminal</p>
              <p className="text-[10px] text-slate-500 truncate">{tenant.shortName}</p>
            </div>
          )}
        </div>

        {/* Module Switcher */}
        <ModuleSwitcher collapsed={collapsed} />

        {/* Navigation */}
        <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto px-2">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/overview'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 group
                ${isActive
                  ? 'bg-amber-500/10 text-amber-400 font-medium shadow-sm shadow-amber-500/5 border border-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'}`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2 space-y-1">
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 w-full transition-colors">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!collapsed && <span>Collapse</span>}
          </button>

          {!collapsed && user && (
            <div className="px-2.5 py-2 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <User size={12} className="text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <Shield size={8} />
                    {user.roleConfig?.label}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-950/30 w-full transition-colors">
            <LogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Canvas ──────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 flex items-center justify-between px-5 border-b border-slate-800/60 bg-slate-900/30 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database size={10} />
              <span className="text-slate-400 font-medium">{tenant.city}, {tenant.state}</span>
              <span className="text-slate-700">|</span>
              <span>Refresh: {tenant.lastRefresh}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
              {user?.roleConfig?.label}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-dark">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
