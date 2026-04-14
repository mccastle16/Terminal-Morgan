import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import ErrorBoundary from './ErrorBoundary'
import {
  LayoutDashboard, Search, Building2, BarChart3, GitCompare, ShieldAlert,
  UserPlus, Zap, Users, Share2, FlaskConical, FileText, Brain, Lightbulb,
  LogOut, ChevronLeft, ChevronRight, User, Crosshair,
  MapPin, Bell, Download, HelpCircle, Pencil, Database, Crown, Rocket,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/overview',    icon: LayoutDashboard, label: 'Overview' },
      { to: '/browse',      icon: Search,          label: 'Directory',      permission: 'view_all_businesses' },
      { to: '/map',         icon: MapPin,          label: 'Map',            permission: 'view_all_businesses' },
      { to: '/analytics',   icon: BarChart3,       label: 'Analytics',      permission: 'view_analytics' },
      { to: '/my-business', icon: Building2,       label: 'My Business' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/opportunities', icon: Lightbulb,     label: 'Opportunities',  permission: 'view_analytics' },
      { to: '/intelligence',  icon: Brain,          label: 'Intelligence',   permission: 'view_analytics' },
      { to: '/graph',         icon: Share2,         label: 'Graph',          permission: 'view_analytics' },
      { to: '/ecosystem',     icon: Users,          label: 'Ecosystem' },
      { to: '/sponsor',       icon: Crown,          label: 'Sponsor Intel',  permission: 'view_sponsorship' },
    ],
  },
  {
    label: 'Actions',
    items: [
      { to: '/recruit',     icon: UserPlus,        label: 'Recruit',        permission: 'view_recruit_queue' },
      { to: '/risks',       icon: ShieldAlert,     label: 'Risks',          permission: 'view_risk_flags' },
      { to: '/alerts',      icon: Bell,            label: 'Alerts',         permission: 'view_risk_flags' },
      { to: '/playbook',    icon: Zap,             label: 'Playbook',       permission: 'view_analytics' },
      { to: '/compare',     icon: GitCompare,      label: 'Compare',        permission: 'view_compare' },
      { to: '/resolve',     icon: HelpCircle,      label: 'Resolve',        permission: 'view_member_status' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/tactical',     icon: Crosshair,      label: 'AI Advisor' },
      { to: '/exports',      icon: Download,        label: 'Exports',       permission: 'export_data' },
      { to: '/corrections',  icon: Pencil,          label: 'Corrections' },
      { to: '/experiments',  icon: FlaskConical,    label: 'Experiments',   permission: 'view_analytics' },
      { to: '/content',      icon: FileText,        label: 'Content' },
      { to: '/data-refresh', icon: Database,         label: 'Data Health',  permission: 'manage_data' },
      { to: '/onboarding',   icon: Rocket,          label: 'Tour' },
    ],
  },
]

export default function TerminalLayout() {
  const { user, logout, can, tenant } = useTerminalAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="h-screen flex bg-[#020617] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-slate-800 bg-[#020617] transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 h-12 border-b border-slate-800 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
            <span className="text-[11px] font-bold text-black">CG</span>
          </div>
          {!collapsed && <span className="text-sm font-semibold text-white truncate">Terminal</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-dark py-2 px-1.5">
          {NAV_SECTIONS.map(section => {
            const visible = section.items.filter(item => !item.permission || can(item.permission))
            if (!visible.length) return null
            return (
              <div key={section.label} className="mb-3">
                {!collapsed && (
                  <p className="px-2 mb-1 text-[10px] font-medium text-slate-600 uppercase tracking-widest">
                    {section.label}
                  </p>
                )}
                <div className="space-y-px">
                  {visible.map(item => (
                    <NavLink key={item.to} to={item.to} end={item.to === '/overview'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors duration-100
                        ${isActive ? 'bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`
                      }>
                      <item.icon size={15} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-1.5 space-y-0.5">
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 w-full transition-colors">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!collapsed && <span>Collapse</span>}
          </button>
          {!collapsed && user && (
            <div className="px-2 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <User size={11} className="text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-600 truncate">{user.roleConfig?.label}</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-slate-600 hover:text-red-400 hover:bg-slate-800/50 w-full transition-colors">
            <LogOut size={13} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 flex items-center justify-between px-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">{tenant.city}, {tenant.state}</span>
            <span className="text-slate-700">·</span>
            <span>Updated {tenant.lastRefresh}</span>
          </div>
          <span className="text-xs text-slate-600 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            {user?.roleConfig?.label}
          </span>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            <ErrorBoundary><Outlet /></ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  )
}
