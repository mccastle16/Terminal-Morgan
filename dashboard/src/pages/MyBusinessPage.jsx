import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Building2,
  ChevronRight,
  Award,
  Target,
  Zap,
  Users,
  ArrowRight,
  Search,
} from 'lucide-react'

export default function MyBusinessPage() {
  const { businesses, stats } = useData()
  const navigate = useNavigate()
  const [selectedBusinessId, setSelectedBusinessId] = useState(() => {
    return localStorage.getItem('cgcc_my_business') || ''
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Get the selected business
  const myBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBusinessId)
  }, [businesses, selectedBusinessId])

  // Calculate benchmarks for the selected business
  const benchmarks = useMemo(() => {
    if (!myBusiness || !stats) return null

    const categoryPeers = businesses.filter(b => b.category_primary === myBusiness.category_primary)
    const categoryAvgRating = categoryPeers.reduce((acc, b) => acc + b.rating, 0) / categoryPeers.length
    const categoryAvgConfidence = categoryPeers.reduce((acc, b) => acc + b.osintConfidence, 0) / categoryPeers.length

    // Rank within category
    const sortedByRating = [...categoryPeers].sort((a, b) => b.rating - a.rating)
    const ratingRank = sortedByRating.findIndex(b => b.id === myBusiness.id) + 1

    // Overall rank
    const allSortedByRating = [...businesses].sort((a, b) => b.rating - a.rating)
    const overallRank = allSortedByRating.findIndex(b => b.id === myBusiness.id) + 1

    // Chamber member comparison
    const chamberMembers = businesses.filter(b => b.isChamberMember)
    const chamberAvgRating = chamberMembers.reduce((acc, b) => acc + b.rating, 0) / chamberMembers.length

    return {
      categoryAvgRating: categoryAvgRating.toFixed(2),
      categoryAvgConfidence: (categoryAvgConfidence * 100).toFixed(0),
      ratingRank,
      totalInCategory: categoryPeers.length,
      overallRank,
      totalBusinesses: businesses.length,
      chamberAvgRating: chamberAvgRating.toFixed(2),
      ratingVsCategory: myBusiness.rating - categoryAvgRating,
      ratingVsChamber: myBusiness.rating - chamberAvgRating,
      topCompetitors: sortedByRating.slice(0, 5).filter(b => b.id !== myBusiness.id),
    }
  }, [myBusiness, businesses, stats])

  // Handle business selection
  const handleSelectBusiness = (businessId) => {
    setSelectedBusinessId(businessId)
    localStorage.setItem('cgcc_my_business', businessId)
    setSearchQuery('')
  }

  // Filter businesses for search
  const searchResults = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return businesses
      .filter(b =>
        b.business_name?.toLowerCase().includes(query) ||
        b.category_primary?.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [businesses, searchQuery])

  // Render star rating
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < fullStars ? 'text-cgcc-gold fill-cgcc-gold' :
                      (i === fullStars && hasHalf) ? 'text-cgcc-gold fill-cgcc-gold/50' :
                      'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  // Trend indicator
  const TrendIndicator = ({ value, suffix = '' }) => {
    if (value > 0) return <span className="text-cgcc-sage flex items-center gap-1"><TrendingUp size={14} /> +{value.toFixed(2)}{suffix}</span>
    if (value < 0) return <span className="text-cgcc-coral flex items-center gap-1"><TrendingDown size={14} /> {value.toFixed(2)}{suffix}</span>
    return <span className="text-gray-400 flex items-center gap-1"><Minus size={14} /> 0{suffix}</span>
  }

  // If no business selected, show selector
  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cgcc-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-cgcc-gold" />
          </div>
          <h1 className="text-2xl font-display font-bold text-cgcc-navy mb-2">
            Claim Your Business
          </h1>
          <p className="text-gray-600">
            Select your business to see your personalized scorecard and competitive position
          </p>
        </div>

        {/* Search box */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for your business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl
                     focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20
                     placeholder:text-gray-400 text-lg"
            autoFocus
          />
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {searchResults.map((business) => (
              <button
                key={business.id}
                onClick={() => handleSelectBusiness(business.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
              >
                <div className="w-12 h-12 bg-cgcc-navy/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-cgcc-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cgcc-navy truncate">{business.business_name}</p>
                  <p className="text-sm text-gray-500 truncate">{business.category_primary} • {business.neighborhood_area || 'Coral Gables'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(business.rating)}
                  <span className="text-sm text-gray-600">{business.rating.toFixed(1)}</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {/* Or browse categories */}
        {!searchQuery && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4 text-center">Or browse by category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats?.categories.slice(0, 9).map((category) => (
                <button
                  key={category}
                  onClick={() => setSearchQuery(category)}
                  className="p-4 bg-white rounded-xl border border-gray-200 hover:border-cgcc-gold hover:bg-cgcc-gold/5 transition-all text-left"
                >
                  <p className="font-medium text-cgcc-navy capitalize text-sm">{category.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {businesses.filter(b => b.category_primary === category).length} businesses
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main scorecard view
  return (
    <div className="space-y-6">
      {/* Business Header */}
      <div className="bg-gradient-to-br from-cgcc-navy to-cgcc-navy/90 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={28} className="text-cgcc-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-display font-bold">{myBusiness.business_name}</h1>
                {myBusiness.isChamberMember && (
                  <span className="px-2 py-0.5 bg-cgcc-gold/20 text-cgcc-gold text-xs font-semibold rounded-full">
                    CHAMBER MEMBER
                  </span>
                )}
              </div>
              <p className="text-white/60 capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')} • {myBusiness.neighborhood_area || 'Coral Gables'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedBusinessId('')
              localStorage.removeItem('cgcc_my_business')
            }}
            className="text-sm text-white/60 hover:text-white underline"
          >
            Change business
          </button>
        </div>
      </div>

      {/* Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rating Score */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Your Rating</p>
            <Star size={18} className="text-cgcc-gold" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-cgcc-navy">{myBusiness.rating.toFixed(1)}</span>
            <span className="text-gray-400 mb-1">/ 5.0</span>
          </div>
          {renderStars(myBusiness.rating)}
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">vs. Category Avg</span>
              <TrendIndicator value={benchmarks?.ratingVsCategory} />
            </div>
          </div>
        </div>

        {/* Category Rank */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Category Rank</p>
            <Award size={18} className="text-cgcc-coral" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-cgcc-navy">#{benchmarks?.ratingRank}</span>
            <span className="text-gray-400 mb-1">of {benchmarks?.totalInCategory}</span>
          </div>
          <p className="text-sm text-gray-500 capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Category Avg</span>
              <span className="font-medium text-cgcc-navy">{benchmarks?.categoryAvgRating} ★</span>
            </div>
          </div>
        </div>

        {/* Overall Rank */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Overall Rank</p>
            <Target size={18} className="text-cgcc-sage" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-cgcc-navy">#{benchmarks?.overallRank}</span>
            <span className="text-gray-400 mb-1">of {benchmarks?.totalBusinesses}</span>
          </div>
          <p className="text-sm text-gray-500">All Coral Gables businesses</p>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Top</span>
              <span className="font-medium text-cgcc-navy">
                {((benchmarks?.overallRank / benchmarks?.totalBusinesses) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Data Confidence */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Data Confidence</p>
            {myBusiness.hasRedFlag ? (
              <AlertTriangle size={18} className="text-cgcc-coral" />
            ) : (
              <CheckCircle size={18} className="text-cgcc-sage" />
            )}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-cgcc-navy">{(myBusiness.osintConfidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                myBusiness.osintConfidence >= 0.8 ? 'bg-cgcc-sage' :
                myBusiness.osintConfidence >= 0.6 ? 'bg-cgcc-gold' : 'bg-cgcc-coral'
              }`}
              style={{ width: `${myBusiness.osintConfidence * 100}%` }}
            />
          </div>
          {myBusiness.hasRedFlag && (
            <p className="mt-2 text-xs text-cgcc-coral flex items-center gap-1">
              <AlertTriangle size={12} /> Has risk flags
            </p>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths & Weaknesses */}
        <div className="space-y-4">
          {/* Your Strengths */}
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-cgcc-sage" />
              Your Strengths
            </h3>
            <div className="space-y-2">
              {myBusiness.top_delights?.split(';').map((delight, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-cgcc-sage/5 rounded-lg">
                  <div className="w-6 h-6 bg-cgcc-sage/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cgcc-sage text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{delight.trim()}</p>
                </div>
              )) || <p className="text-gray-400 text-sm">No strengths data available</p>}
            </div>
          </div>

          {/* Areas to Improve */}
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-cgcc-coral" />
              Areas to Improve
            </h3>
            <div className="space-y-2">
              {myBusiness.top_pain_points?.split(';').map((pain, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-cgcc-coral/5 rounded-lg">
                  <div className="w-6 h-6 bg-cgcc-coral/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cgcc-coral text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700">{pain.trim()}</p>
                </div>
              )) || <p className="text-gray-400 text-sm">No improvement areas identified</p>}
            </div>
          </div>
        </div>

        {/* Competitive Landscape */}
        <div className="space-y-4">
          {/* Top Competitors */}
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-cgcc-navy flex items-center gap-2">
                <Users size={18} className="text-cgcc-navy" />
                Your Top Competitors
              </h3>
              <button
                onClick={() => navigate('/market-intel/compare')}
                className="text-sm text-cgcc-gold hover:underline flex items-center gap-1"
              >
                Compare <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {benchmarks?.topCompetitors.slice(0, 4).map((competitor, i) => (
                <div
                  key={competitor.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/discover/browse?business=${competitor.id}`)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    i === 0 ? 'bg-cgcc-gold/20 text-cgcc-gold' :
                    i === 1 ? 'bg-gray-300/50 text-gray-600' :
                    i === 2 ? 'bg-amber-600/20 text-amber-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    <span className="text-sm font-bold">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cgcc-navy text-sm truncate">{competitor.business_name}</p>
                    <p className="text-xs text-gray-500">{competitor.neighborhood_area || 'Coral Gables'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cgcc-navy">{competitor.rating.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">rating</p>
                  </div>
                </div>
              )) || <p className="text-gray-400 text-sm">No competitors found</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-cgcc-gold/10 to-cgcc-gold/5 rounded-xl p-5 border border-cgcc-gold/20">
            <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
              <Zap size={18} className="text-cgcc-gold" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/my-business/actions')}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <span className="text-sm font-medium text-cgcc-navy">View Action Plan</span>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              <button
                onClick={() => navigate('/my-business/ecosystem')}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <span className="text-sm font-medium text-cgcc-navy">Explore Ecosystem</span>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
              <button
                onClick={() => navigate('/market-intel')}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <span className="text-sm font-medium text-cgcc-navy">Market Intelligence</span>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
