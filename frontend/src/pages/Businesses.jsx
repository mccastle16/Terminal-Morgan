import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

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

function Businesses() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: '',
    tier: '',
    search: ''
  })
  const [categories, setCategories] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams()
        if (filters.category) params.append('category', filters.category)
        if (filters.tier) params.append('tier', filters.tier)
        params.append('limit', '100')

        const url = filters.search
          ? `/api/v2/search/businesses?q=${encodeURIComponent(filters.search)}&limit=100`
          : `/api/v2/businesses?${params}`

        const res = await fetch(url)
        const data = await res.json()
        setBusinesses(data)

        // Get categories from market analytics
        const marketRes = await fetch('/api/v2/analytics/market')
        const market = await marketRes.json()
        setCategories(Object.keys(market.by_category || {}))
      } catch (error) {
        console.error('Error fetching businesses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters.category, filters.tier, filters.search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-gray-500 mt-1">{businesses.length} businesses found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search businesses..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              value={filters.category}
              onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority Tier</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              value={filters.tier}
              onChange={(e) => setFilters(f => ({ ...f, tier: e.target.value }))}
            >
              <option value="">All Tiers</option>
              <option value="1">Tier 1 (High Priority)</option>
              <option value="2">Tier 2 (Medium-High)</option>
              <option value="3">Tier 3 (Medium)</option>
              <option value="4">Tier 4 (Lower)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Business List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insights
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businesses.map((business) => (
                <tr key={business.business_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/businesses/${encodeURIComponent(business.business_id)}`}
                      className="text-coral-600 hover:text-coral-700 font-medium"
                    >
                      {business.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {business.category?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {business.district || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-coral-500 h-2 rounded-full"
                          style={{ width: `${business.engagement_score || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {business.engagement_score?.toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TierBadge tier={business.priority_tier} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center">
                      <span className="text-red-500 mr-1">●</span>
                      {business.pain_point_count} pain points
                    </span>
                    <span className="mx-2">•</span>
                    <span className="inline-flex items-center">
                      <span className="text-green-500 mr-1">●</span>
                      {business.opportunity_count} opportunities
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {businesses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No businesses found matching your criteria
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Businesses
