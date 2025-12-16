import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

function ConfidenceBadge({ confidence }) {
  let color = 'bg-gray-100 text-gray-800'
  if (confidence >= 0.8) color = 'bg-green-100 text-green-800'
  else if (confidence >= 0.6) color = 'bg-blue-100 text-blue-800'
  else if (confidence >= 0.4) color = 'bg-yellow-100 text-yellow-800'
  else color = 'bg-red-100 text-red-800'

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {(confidence * 100).toFixed(0)}% confidence
    </span>
  )
}

function SeverityBadge({ severity }) {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[severity] || colors.medium}`}>
      {severity}
    </span>
  )
}

function BusinessDetail() {
  const { id } = useParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await fetch(`/api/v2/businesses/${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error('Business not found')
        const data = await res.json()
        setBusiness(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/businesses" className="text-coral-600 hover:underline">
          ← Back to businesses
        </Link>
      </div>
    )
  }

  const painPoints = business?.pain_points || []
  const opportunities = business?.opportunities || []
  const solutions = business?.co_fit_solutions || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/businesses" className="hover:text-coral-600">Businesses</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{business?.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
            <p className="text-gray-500 mt-1 capitalize">
              {business?.category?.replace(/_/g, ' ')}
              {business?.subcategory && ` • ${business.subcategory.replace(/_/g, ' ')}`}
            </p>
            {business?.district && (
              <p className="text-gray-500 text-sm mt-1">📍 {business.district}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="text-center px-4 py-2 bg-coral-50 rounded-lg">
              <p className="text-2xl font-bold text-coral-600">
                {business?.engagement_score?.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Engagement</p>
            </div>
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">
                {business?.priority_tier}
              </p>
              <p className="text-xs text-gray-500">Tier</p>
            </div>
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">
                {((business?.data_completeness || 0) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">Data Quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pain Points */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-red-500 mr-2">●</span>
              Pain Points ({painPoints.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {painPoints.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No pain points identified</p>
            ) : (
              painPoints.map((pp, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-gray-900 text-sm">
                      {pp.pain_point || pp.point}
                    </p>
                    <div className="flex-shrink-0">
                      <ConfidenceBadge confidence={pp.confidence || 0.5} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 capitalize">
                      {pp.category || pp.pain_category || 'general'}
                    </span>
                    {pp.severity && (
                      <>
                        <span className="text-gray-300">•</span>
                        <SeverityBadge severity={pp.severity} />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Opportunities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-green-500 mr-2">●</span>
              Opportunities ({opportunities.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {opportunities.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No opportunities identified</p>
            ) : (
              opportunities.map((opp, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-gray-900 text-sm">{opp.opportunity}</p>
                    <div className="flex-shrink-0">
                      <ConfidenceBadge confidence={opp.confidence || 0.5} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 capitalize">
                      {opp.category || opp.opportunity_category || 'general'}
                    </span>
                    {opp.potential_impact && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">
                          Impact: {opp.potential_impact}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Solutions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-blue-500 mr-2">●</span>
            Recommended Solutions ({solutions.length})
          </h2>
        </div>
        <div className="p-4">
          {solutions.length === 0 ? (
            <p className="text-gray-500 text-center">No solutions recommended yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {solutions.map((sol, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900">
                      {sol.solution || sol.name}
                    </h3>
                    {sol.priority && (
                      <span className="text-xs bg-coral-100 text-coral-700 px-2 py-1 rounded-full">
                        #{sol.priority}
                      </span>
                    )}
                  </div>
                  {sol.description && (
                    <p className="text-sm text-gray-500 mt-2">{sol.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <span className="capitalize">{sol.category || sol.solution_category}</span>
                    {sol.complexity && (
                      <>
                        <span>•</span>
                        <span>Complexity: {sol.complexity}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Back Link */}
      <div className="pt-4">
        <Link
          to="/businesses"
          className="text-coral-600 hover:text-coral-700 font-medium"
        >
          ← Back to all businesses
        </Link>
      </div>
    </div>
  )
}

export default BusinessDetail
