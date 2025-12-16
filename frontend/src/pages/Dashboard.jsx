import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}

function TierBadge({ tier }) {
  const colors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[tier] || colors[4]}`}>
      Tier {tier}
    </span>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [topBusinesses, setTopBusinesses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [marketRes, businessesRes] = await Promise.all([
          fetch('/api/v2/analytics/market'),
          fetch('/api/v2/businesses?limit=5')
        ])

        const market = await marketRes.json()
        const businesses = await businessesRes.json()

        setStats(market)
        setTopBusinesses(businesses)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Business intelligence overview for Coral Gables</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Businesses"
          value={stats?.total_businesses || 0}
          subtitle="In database"
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Avg Engagement"
          value={stats?.avg_engagement_score?.toFixed(1) || 0}
          subtitle="Out of 100"
          icon="📈"
          color="green"
        />
        <StatCard
          title="Categories"
          value={Object.keys(stats?.by_category || {}).length}
          subtitle="Business types"
          icon="📁"
          color="orange"
        />
        <StatCard
          title="Data Quality"
          value={`${((stats?.avg_data_completeness || 0) * 100).toFixed(0)}%`}
          subtitle="Completeness"
          icon="✓"
          color="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Businesses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Top Engagement Targets</h2>
              <Link to="/businesses" className="text-sm text-coral-600 hover:text-coral-700">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {topBusinesses.map((business) => (
              <Link
                key={business.business_id}
                to={`/businesses/${encodeURIComponent(business.business_id)}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{business.name}</p>
                  <p className="text-sm text-gray-500">{business.category} • {business.district}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <TierBadge tier={business.priority_tier} />
                  <span className="text-sm font-medium text-gray-900">
                    {business.engagement_score?.toFixed(0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(stats?.by_category || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([category, count]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize text-gray-700">{category.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-coral-500 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.total_businesses) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority Tier Distribution</h2>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((tier) => {
            const count = stats?.by_tier?.[tier] || 0
            const labels = {
              1: 'High Priority',
              2: 'Medium-High',
              3: 'Medium',
              4: 'Lower Priority'
            }
            const colors = {
              1: 'bg-green-500',
              2: 'bg-blue-500',
              3: 'bg-yellow-500',
              4: 'bg-gray-400'
            }

            return (
              <div key={tier} className="text-center">
                <div className={`${colors[tier]} text-white rounded-lg p-4`}>
                  <p className="text-3xl font-bold">{count}</p>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-2">Tier {tier}</p>
                <p className="text-xs text-gray-500">{labels[tier]}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
