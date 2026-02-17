import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Shield,
  AlertTriangle,
  Award,
  Search,
  X,
  Plus,
  Building2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = ['#c9a227', '#1e3a5f', '#e8856c', '#87a878']

export default function ComparePage() {
  const { businesses, stats } = useData()
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return businesses
      .filter(b =>
        !selectedBusinesses.find(s => s.id === b.id) &&
        (b.business_name?.toLowerCase().includes(query) ||
         b.category_primary?.toLowerCase().includes(query))
      )
      .slice(0, 8)
  }, [businesses, searchQuery, selectedBusinesses])

  // Add business to comparison
  const addBusiness = (business) => {
    if (selectedBusinesses.length < 4) {
      setSelectedBusinesses([...selectedBusinesses, business])
      setSearchQuery('')
      setShowSearch(false)
    }
  }

  // Remove business from comparison
  const removeBusiness = (businessId) => {
    setSelectedBusinesses(selectedBusinesses.filter(b => b.id !== businessId))
  }

  // Radar chart data
  const radarData = useMemo(() => {
    if (selectedBusinesses.length === 0) return []

    return [
      {
        metric: 'Rating',
        ...Object.fromEntries(selectedBusinesses.map(b => [b.business_name, b.rating])),
        fullMark: 5,
      },
      {
        metric: 'Confidence',
        ...Object.fromEntries(selectedBusinesses.map(b => [b.business_name, b.osintConfidence * 5])),
        fullMark: 5,
      },
      {
        metric: 'Reviews',
        ...Object.fromEntries(selectedBusinesses.map(b => [
          b.business_name,
          Math.min(5, (b.reviewCount || 0) / 100)
        ])),
        fullMark: 5,
      },
    ]
  }, [selectedBusinesses])

  // Calculate comparison metrics
  const comparisonMetrics = useMemo(() => {
    if (selectedBusinesses.length < 2) return null

    const metrics = selectedBusinesses.map(b => ({
      id: b.id,
      name: b.business_name,
      rating: b.rating,
      confidence: b.osintConfidence,
      hasRedFlag: b.hasRedFlag,
      isChamberMember: b.isChamberMember,
      strengths: b.top_delights?.split(';').filter(Boolean).length || 0,
      weaknesses: b.top_pain_points?.split(';').filter(Boolean).length || 0,
    }))

    // Find best in each category
    const bestRating = Math.max(...metrics.map(m => m.rating))
    const bestConfidence = Math.max(...metrics.map(m => m.confidence))
    const mostStrengths = Math.max(...metrics.map(m => m.strengths))
    const leastWeaknesses = Math.min(...metrics.map(m => m.weaknesses))

    return metrics.map(m => ({
      ...m,
      isBestRating: m.rating === bestRating,
      isBestConfidence: m.confidence === bestConfidence,
      hasMostStrengths: m.strengths === mostStrengths,
      hasLeastWeaknesses: m.weaknesses === leastWeaknesses,
    }))
  }, [selectedBusinesses])

  // Render stars
  const renderStars = (rating, size = 14) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < fullStars ? 'text-cgcc-gold fill-cgcc-gold' :
                      (i === fullStars && hasHalf) ? 'text-cgcc-gold fill-cgcc-gold/50' :
                      'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-cgcc-navy">Compare Businesses</h1>
        <p className="text-gray-600">
          Select up to 4 businesses to compare side-by-side
        </p>
      </div>

      {/* Selection Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap gap-3">
          {/* Selected businesses */}
          {selectedBusinesses.map((business, index) => (
            <div
              key={business.id}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2"
              style={{ borderColor: COLORS[index] }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="font-medium text-cgcc-navy">{business.business_name}</span>
              <button
                onClick={() => removeBusiness(business.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          ))}

          {/* Add button */}
          {selectedBusinesses.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-cgcc-gold hover:text-cgcc-gold transition-colors"
              >
                <Plus size={18} />
                Add Business
              </button>

              {/* Search dropdown */}
              {showSearch && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-20">
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search businesses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((business) => (
                        <button
                          key={business.id}
                          onClick={() => addBusiness(business)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                        >
                          <Building2 size={16} className="text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-cgcc-navy text-sm truncate">{business.business_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{business.category_primary?.replace(/_/g, ' ')}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-cgcc-gold fill-cgcc-gold" />
                            <span className="text-sm text-gray-600">{business.rating.toFixed(1)}</span>
                          </div>
                        </button>
                      ))
                    ) : searchQuery ? (
                      <p className="p-4 text-sm text-gray-500 text-center">No businesses found</p>
                    ) : (
                      <p className="p-4 text-sm text-gray-500 text-center">Type to search...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Content */}
      {selectedBusinesses.length >= 2 ? (
        <>
          {/* Radar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-cgcc-navy mb-4">Performance Overview</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  {selectedBusinesses.map((business, index) => (
                    <Radar
                      key={business.id}
                      name={business.business_name}
                      dataKey={business.business_name}
                      stroke={COLORS[index]}
                      fill={COLORS[index]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Metric</th>
                    {selectedBusinesses.map((business, index) => (
                      <th key={business.id} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index] }}
                          />
                          <span className="font-semibold text-cgcc-navy text-sm">{business.business_name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Rating */}
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Rating</td>
                    {comparisonMetrics?.map((m) => (
                      <td key={m.id} className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-cgcc-navy">{m.rating.toFixed(1)}</span>
                            {m.isBestRating && (
                              <span className="px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                                Best
                              </span>
                            )}
                          </div>
                          {renderStars(m.rating)}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Confidence */}
                  <tr className="bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Data Confidence</td>
                    {comparisonMetrics?.map((m) => (
                      <td key={m.id} className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-cgcc-navy">{(m.confidence * 100).toFixed(0)}%</span>
                            {m.isBestConfidence && (
                              <span className="px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                                Best
                              </span>
                            )}
                          </div>
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                m.confidence >= 0.8 ? 'bg-cgcc-sage' :
                                m.confidence >= 0.6 ? 'bg-cgcc-gold' : 'bg-cgcc-coral'
                              }`}
                              style={{ width: `${m.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Chamber Member */}
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Chamber Member</td>
                    {selectedBusinesses.map((b) => (
                      <td key={b.id} className="px-4 py-4 text-center">
                        {b.isChamberMember ? (
                          <div className="flex items-center justify-center gap-2">
                            <Award size={18} className="text-cgcc-gold" />
                            <span className="text-cgcc-gold font-medium">Yes</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Risk Status */}
                  <tr className="bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Risk Status</td>
                    {selectedBusinesses.map((b) => (
                      <td key={b.id} className="px-4 py-4 text-center">
                        {b.hasRedFlag ? (
                          <div className="flex items-center justify-center gap-2">
                            <AlertTriangle size={18} className="text-cgcc-coral" />
                            <span className="text-cgcc-coral font-medium">Alert</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Shield size={18} className="text-cgcc-sage" />
                            <span className="text-cgcc-sage font-medium">Clear</span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Strengths Count */}
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Documented Strengths</td>
                    {comparisonMetrics?.map((m) => (
                      <td key={m.id} className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle size={16} className="text-cgcc-sage" />
                          <span className="text-lg font-semibold text-cgcc-navy">{m.strengths}</span>
                          {m.hasMostStrengths && m.strengths > 0 && (
                            <span className="px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                              Most
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Weaknesses Count */}
                  <tr className="bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Known Pain Points</td>
                    {comparisonMetrics?.map((m) => (
                      <td key={m.id} className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <XCircle size={16} className="text-cgcc-coral" />
                          <span className="text-lg font-semibold text-cgcc-navy">{m.weaknesses}</span>
                          {m.hasLeastWeaknesses && (
                            <span className="px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                              Fewest
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Category */}
                  <tr>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Category</td>
                    {selectedBusinesses.map((b) => (
                      <td key={b.id} className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-cgcc-navy/10 text-cgcc-navy text-sm font-medium rounded-full capitalize">
                          {b.category_primary?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Price Tier */}
                  <tr className="bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">Price Tier</td>
                    {selectedBusinesses.map((b) => (
                      <td key={b.id} className="px-4 py-4 text-center">
                        <span className="text-lg font-semibold text-cgcc-navy">
                          {b.price_tier || '—'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Strengths & Weaknesses Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedBusinesses.map((business, index) => (
              <div key={business.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="px-4 py-3 border-b border-gray-100"
                  style={{ borderLeftWidth: 4, borderLeftColor: COLORS[index] }}
                >
                  <h3 className="font-semibold text-cgcc-navy">{business.business_name}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {/* Strengths */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Strengths</p>
                    {business.top_delights ? (
                      <div className="space-y-1">
                        {business.top_delights.split(';').slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle size={14} className="text-cgcc-sage mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{item.trim()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No data available</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pain Points</p>
                    {business.top_pain_points ? (
                      <div className="space-y-1">
                        {business.top_pain_points.split(';').slice(0, 3).map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <XCircle size={14} className="text-cgcc-coral mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{item.trim()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No data available</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Select at least 2 businesses to compare
          </h3>
          <p className="text-gray-500">
            Use the search above to add businesses to your comparison
          </p>
        </div>
      )}
    </div>
  )
}
