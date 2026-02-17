import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  Star,
  ArrowRight,
  Activity,
  Target,
  Lightbulb,
  ExternalLink,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = ['#1e3a5f', '#c9a227', '#e8856c', '#87a878', '#8b5cf6', '#3b82f6', '#94a3b8', '#22c55e']

export default function DashboardPage() {
  const { user } = useAuth()
  const { businesses, stats, loading } = useData()

  const topPainPoints = useMemo(() => {
    if (!businesses.length) return []

    const painPointsMap = {}
    businesses.forEach(b => {
      if (b.top_pain_points) {
        const points = b.top_pain_points.split(';').map(p => p.trim().toLowerCase())
        points.forEach(point => {
          if (point.length > 5) {
            const key = point.substring(0, 50)
            painPointsMap[key] = (painPointsMap[key] || 0) + 1
          }
        })
      }
    })

    return Object.entries(painPointsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }))
  }, [businesses])

  const recentBusinesses = useMemo(() => {
    return [...businesses]
      .sort((a, b) => new Date(b.last_reviewed_date) - new Date(a.last_reviewed_date))
      .slice(0, 5)
  }, [businesses])

  const riskBusinesses = useMemo(() => {
    return businesses.filter(b => b.hasRedFlag || b.osintConfidence < 0.7).slice(0, 5)
  }, [businesses])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl shimmer"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl shimmer"></div>
          <div className="h-80 rounded-xl shimmer"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your business intelligence data
          </p>
        </div>
        <Link to="/businesses" className="btn-primary flex items-center gap-2 w-fit">
          Explore Businesses
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card group hover:border-cgcc-navy/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Businesses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
              <p className="text-xs text-gray-400 mt-2">{stats?.chamberMembers || 0} chamber members</p>
            </div>
            <div className="w-12 h-12 bg-cgcc-navy/10 rounded-xl flex items-center justify-center group-hover:bg-cgcc-navy group-hover:text-white transition-colors">
              <Building2 size={24} className="text-cgcc-navy group-hover:text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card group hover:border-cgcc-gold/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.avgRating || '0.0'}</p>
              <div className="flex items-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < Math.round(parseFloat(stats?.avgRating || 0)) ? 'text-cgcc-gold fill-cgcc-gold' : 'text-gray-300'}
                  />
                ))}
              </div>
            </div>
            <div className="w-12 h-12 bg-cgcc-gold/10 rounded-xl flex items-center justify-center group-hover:bg-cgcc-gold transition-colors">
              <Star size={24} className="text-cgcc-gold group-hover:text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card group hover:border-cgcc-sage/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">OSINT Confidence</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.avgConfidence || 0}%</p>
              <p className="text-xs text-gray-400 mt-2">
                {stats?.confidenceLevels?.high || 0} high confidence
              </p>
            </div>
            <div className="w-12 h-12 bg-cgcc-sage/10 rounded-xl flex items-center justify-center group-hover:bg-cgcc-sage transition-colors">
              <Target size={24} className="text-cgcc-sage group-hover:text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card group hover:border-cgcc-coral/40">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Risk Alerts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.redFlagCount || 0}</p>
              <p className="text-xs text-gray-400 mt-2">
                {stats?.highRiskCount || 0} high severity
              </p>
            </div>
            <div className="w-12 h-12 bg-cgcc-coral/10 rounded-xl flex items-center justify-center group-hover:bg-cgcc-coral transition-colors">
              <AlertTriangle size={24} className="text-cgcc-coral group-hover:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Category Distribution</h2>
            <Link to="/analytics" className="text-sm text-cgcc-gold hover:text-cgcc-navy flex items-center gap-1">
              View details <ExternalLink size={14} />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.categoryBreakdown || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(stats?.categoryBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Rating Distribution</h2>
            <Link to="/analytics" className="text-sm text-cgcc-gold hover:text-cgcc-navy flex items-center gap-1">
              View details <ExternalLink size={14} />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.ratingDistribution || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="range" type="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#c9a227" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top pain points */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} className="text-cgcc-gold" />
            <h2 className="text-lg font-semibold text-gray-900">Top Pain Points</h2>
          </div>
          <div className="space-y-3">
            {topPainPoints.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-cgcc-coral/10 rounded-full flex items-center justify-center text-xs font-medium text-cgcc-coral">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-gray-600 line-clamp-1">{item.text}</span>
                <span className="text-xs text-gray-400">{item.count}x</span>
              </div>
            ))}
            {topPainPoints.length === 0 && (
              <p className="text-sm text-gray-400">No pain points data available</p>
            )}
          </div>
          <Link
            to="/insights"
            className="mt-4 block text-center text-sm text-cgcc-gold hover:text-cgcc-navy font-medium"
          >
            View all insights
          </Link>
        </div>

        {/* Recently reviewed */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} className="text-cgcc-sage" />
            <h2 className="text-lg font-semibold text-gray-900">Recently Reviewed</h2>
          </div>
          <div className="space-y-3">
            {recentBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/businesses/${business.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-cgcc-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-cgcc-navy">
                    {business.business_name?.charAt(0) || 'B'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {business.business_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {business.category_primary}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-cgcc-gold">
                  <Star size={12} className="fill-cgcc-gold" />
                  <span className="text-xs font-medium">{business.rating?.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Risk watch */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-cgcc-coral" />
            <h2 className="text-lg font-semibold text-gray-900">Risk Watch</h2>
          </div>
          <div className="space-y-3">
            {riskBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/businesses/${business.id}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${business.hasRedFlag ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {business.business_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {business.hasRedFlag ? 'Red flag present' : 'Low confidence data'}
                  </p>
                </div>
              </Link>
            ))}
            {riskBusinesses.length === 0 && (
              <p className="text-sm text-gray-400">No risk alerts</p>
            )}
          </div>
          <Link
            to="/businesses?hasRedFlag=true"
            className="mt-4 block text-center text-sm text-cgcc-coral hover:text-red-700 font-medium"
          >
            View all risks
          </Link>
        </div>
      </div>
    </div>
  )
}
