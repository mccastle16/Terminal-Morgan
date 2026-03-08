import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  Building2,
  BarChart3,
  Compass,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  Settings,
  User,
  Download,
  Briefcase,
  Target,
  Users,
  TrendingUp,
  Star,
  AlertTriangle,
  Zap,
  Share2,
} from 'lucide-react'

// Three main modes with their sub-navigation
const modes = [
  {
    id: 'my-business',
    name: 'My Business',
    description: 'Your scorecard & actions',
    href: '/my-business',
    icon: Briefcase,
    color: 'cgcc-gold',
    subNav: [
      { name: 'Scorecard', href: '/my-business', icon: Star },
      { name: 'Action Plan', href: '/my-business/actions', icon: Zap },
      { name: 'Go-To Actions', href: '/my-business/go-to-actions', icon: Target },
      { name: 'My Ecosystem', href: '/my-business/ecosystem', icon: Users },
    ],
  },
  {
    id: 'market-intel',
    name: 'Market Intel',
    description: 'Competitive landscape',
    href: '/market-intel',
    icon: Target,
    color: 'cgcc-coral',
    subNav: [
      { name: 'Overview', href: '/market-intel', icon: BarChart3 },
      { name: 'Compare', href: '/market-intel/compare', icon: TrendingUp },
      { name: 'Risk Radar', href: '/market-intel/risks', icon: AlertTriangle },
    ],
  },
  {
    id: 'discover',
    name: 'Discover',
    description: 'Find trusted businesses',
    href: '/discover',
    icon: Compass,
    color: 'cgcc-sage',
    subNav: [
      { name: 'Best Of', href: '/discover', icon: Star },
      { name: 'Browse All', href: '/discover/browse', icon: Building2 },
      { name: 'Knowledge Graph', href: '/discover/graph', icon: Share2 },
    ],
  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { filters, setFilters, exportData, stats } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }))
    if (e.target.value && !location.pathname.includes('/discover')) {
      navigate('/discover/browse')
    }
  }

  // Determine active mode
  const activeMode = modes.find(m => location.pathname.startsWith(m.href)) || modes[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-cgcc-navy transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cgcc-gold rounded-lg flex items-center justify-center">
                <span className="text-cgcc-navy font-bold text-lg">CG</span>
              </div>
              <div>
                <h1 className="text-white font-display font-bold text-lg">CGCC Insights</h1>
                <p className="text-white/60 text-xs">Business Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mode Selector - The Three Pillars */}
          <div className="px-4 py-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-2">Choose Your View</p>
            <div className="space-y-2">
              {modes.map((mode) => {
                const isActive = location.pathname.startsWith(mode.href)
                return (
                  <NavLink
                    key={mode.id}
                    to={mode.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? `bg-${mode.color}/20 border border-${mode.color}/30`
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? `bg-${mode.color}` : 'bg-white/10'
                    }`}>
                      <mode.icon size={20} className={isActive ? 'text-cgcc-navy' : 'text-white/60'} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isActive ? 'text-white' : 'text-white/80'}`}>
                        {mode.name}
                      </p>
                      <p className="text-white/40 text-xs">{mode.description}</p>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Sub-navigation for active mode */}
          <div className="px-4 flex-1 overflow-y-auto">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2 px-2">
              {activeMode.name} Menu
            </p>
            <nav className="space-y-1">
              {activeMode.subNav.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === activeMode.href}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={18} />
                  <span className="font-medium text-sm">{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Quick Stats - Chamber Value Prop */}
          {stats && (
            <div className="px-4 py-4 border-t border-white/10">
              <div className="bg-gradient-to-br from-cgcc-gold/20 to-cgcc-gold/5 rounded-xl p-4 border border-cgcc-gold/20">
                <p className="text-cgcc-gold text-xs uppercase tracking-wider mb-3 font-semibold">Chamber Impact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-white text-xl font-bold">{stats.chamberMembers}</p>
                    <p className="text-white/40 text-xs">Members</p>
                  </div>
                  <div>
                    <p className="text-white text-xl font-bold">{stats.total}</p>
                    <p className="text-white/40 text-xs">Businesses</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Avg Rating</span>
                    <span className="text-cgcc-gold font-semibold">{stats.avgRating} ★</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User section */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-cgcc-gold/20 rounded-full flex items-center justify-center">
                <User size={20} className="text-cgcc-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user?.name}</p>
                <p className="text-white/40 text-xs truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu size={24} />
            </button>

            {/* Breadcrumb / Mode indicator */}
            <div className="hidden lg:flex items-center gap-2">
              <activeMode.icon size={20} className="text-cgcc-navy" />
              <span className="font-semibold text-cgcc-navy">{activeMode.name}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-600">{activeMode.description}</span>
            </div>

            {/* Search bar */}
            <div className={`flex-1 max-w-md mx-4 transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <div className="relative">
                <Search
                  size={20}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    searchFocused ? 'text-cgcc-gold' : 'text-gray-400'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={filters.search}
                  onChange={handleSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-xl
                           focus:bg-white focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20
                           placeholder:text-gray-400 transition-all duration-200"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Export button */}
              <button
                onClick={() => exportData('csv')}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-cgcc-navy
                         hover:bg-gray-100 rounded-lg transition-colors"
                title="Export Data"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export</span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-cgcc-coral rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-cgcc-navy rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <button className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 hover:bg-gray-50">
                          <Settings size={16} />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={16} />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
