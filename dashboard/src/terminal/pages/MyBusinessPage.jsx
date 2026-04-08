import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Star, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  Building2, ChevronRight, Award, Target, Zap, Users, ArrowRight, Search,
} from 'lucide-react'

export default function MyBusinessPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const navigate = useNavigate()
  const [selectedBusinessId, setSelectedBusinessId] = useState(() =>
    localStorage.getItem('terminal_my_business') || ''
  )
  const [searchQuery, setSearchQuery] = useState('')

  const myBusiness = useMemo(() =>
    rawBusinesses.find(b => b._id === selectedBusinessId),
    [rawBusinesses, selectedBusinessId]
  )

  const benchmarks = useMemo(() => {
    if (!myBusiness || !stats) return null
    const categoryPeers = rawBusinesses.filter(b => b.category_primary === myBusiness.category_primary)
    const categoryAvgRating = categoryPeers.reduce((acc, b) => acc + b._rating, 0) / categoryPeers.length
    const categoryAvgConfidence = categoryPeers.reduce((acc, b) => acc + b._confidence, 0) / categoryPeers.length
    const sortedByRating = [...categoryPeers].sort((a, b) => b._rating - a._rating)
    const ratingRank = sortedByRating.findIndex(b => b._id === myBusiness._id) + 1
    const allSortedByRating = [...rawBusinesses].sort((a, b) => b._rating - a._rating)
    const overallRank = allSortedByRating.findIndex(b => b._id === myBusiness._id) + 1
    const chamberMembers = rawBusinesses.filter(b => b.isChamberMember)
    const chamberAvgRating = chamberMembers.length > 0
      ? chamberMembers.reduce((acc, b) => acc + b._rating, 0) / chamberMembers.length : 0

    return {
      categoryAvgRating: categoryAvgRating.toFixed(2),
      categoryAvgConfidence: (categoryAvgConfidence * 100).toFixed(0),
      ratingRank,
      totalInCategory: categoryPeers.length,
      overallRank,
      totalBusinesses: rawBusinesses.length,
      chamberAvgRating: chamberAvgRating.toFixed(2),
      ratingVsCategory: myBusiness._rating - categoryAvgRating,
      ratingVsChamber: myBusiness._rating - chamberAvgRating,
      topCompetitors: sortedByRating.slice(0, 5).filter(b => b._id !== myBusiness._id),
    }
  }, [myBusiness, rawBusinesses, stats])

  const handleSelectBusiness = (businessId) => {
    setSelectedBusinessId(businessId)
    localStorage.setItem('terminal_my_business', businessId)
    setSearchQuery('')
  }

  const searchResults = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return rawBusinesses
      .filter(b =>
        b.business_name?.toLowerCase().includes(query) ||
        b.category_primary?.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [rawBusinesses, searchQuery])

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16}
            className={i < fullStars ? 'text-amber-400 fill-amber-400' :
              (i === fullStars && hasHalf) ? 'text-amber-400 fill-amber-400/50' :
              'text-slate-600'} />
        ))}
      </div>
    )
  }

  const TrendIndicator = ({ value, suffix = '' }) => {
    if (value > 0) return <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={14} /> +{value.toFixed(2)}{suffix}</span>
    if (value < 0) return <span className="text-red-400 flex items-center gap-1"><TrendingDown size={14} /> {value.toFixed(2)}{suffix}</span>
    return <span className="text-slate-500 flex items-center gap-1"><Minus size={14} /> 0{suffix}</span>
  }

  // ── Business selector ──────────────────────────
  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Claim Your Business</h1>
          <p className="text-slate-400">Select your business to see your personalized scorecard and competitive position</p>
        </div>

        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search for your business..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border border-slate-700/50 rounded-xl
              focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20
              placeholder:text-slate-600 text-lg text-slate-200"
            autoFocus />
        </div>

        {searchResults.length > 0 && (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
            {searchResults.map((business) => (
              <button key={business._id} onClick={() => handleSelectBusiness(business._id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0 text-left">
                <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{business.business_name}</p>
                  <p className="text-sm text-slate-500 truncate">{business.category_primary?.replace(/_/g, ' ')} • {business.neighborhood_area || 'Coral Gables'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(business._rating)}
                  <span className="text-sm text-slate-400">{business._rating.toFixed(1)}</span>
                </div>
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            ))}
          </div>
        )}

        {!searchQuery && stats && (
          <div className="mt-8">
            <p className="text-sm text-slate-500 mb-4 text-center">Or browse by category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats.categories.slice(0, 9).map((category) => (
                <button key={category} onClick={() => setSearchQuery(category)}
                  className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800 transition-all text-left">
                  <p className="font-medium text-slate-200 capitalize text-sm">{category.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {rawBusinesses.filter(b => b.category_primary === category).length} businesses
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main scorecard ─────────────────────────────
  return (
    <div className="space-y-6">
      {/* Business Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-800/60 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={28} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">{myBusiness.business_name}</h1>
                {myBusiness.isChamberMember && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
                    CHAMBER MEMBER
                  </span>
                )}
              </div>
              <p className="text-slate-500 capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')} • {myBusiness.neighborhood_area || 'Coral Gables'}</p>
            </div>
          </div>
          <button onClick={() => { setSelectedBusinessId(''); localStorage.removeItem('terminal_my_business') }}
            className="text-sm text-slate-500 hover:text-slate-300 underline">
            Change business
          </button>
        </div>
      </div>

      {/* Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500 font-medium">Your Rating</p>
            <Star size={18} className="text-amber-400" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white">{myBusiness._rating.toFixed(1)}</span>
            <span className="text-slate-600 mb-1">/ 5.0</span>
          </div>
          {renderStars(myBusiness._rating)}
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">vs. Category Avg</span>
              <TrendIndicator value={benchmarks?.ratingVsCategory} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500 font-medium">Category Rank</p>
            <Award size={18} className="text-red-400" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white">#{benchmarks?.ratingRank}</span>
            <span className="text-slate-600 mb-1">of {benchmarks?.totalInCategory}</span>
          </div>
          <p className="text-sm text-slate-500 capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')}</p>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Category Avg</span>
              <span className="font-medium text-slate-300">{benchmarks?.categoryAvgRating} ★</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500 font-medium">Overall Rank</p>
            <Target size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white">#{benchmarks?.overallRank}</span>
            <span className="text-slate-600 mb-1">of {benchmarks?.totalBusinesses}</span>
          </div>
          <p className="text-sm text-slate-500">All Coral Gables businesses</p>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Top</span>
              <span className="font-medium text-slate-300">
                {((benchmarks?.overallRank / benchmarks?.totalBusinesses) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500 font-medium">Data Confidence</p>
            {myBusiness._hasRedFlag ? (
              <AlertTriangle size={18} className="text-red-400" />
            ) : (
              <CheckCircle size={18} className="text-emerald-400" />
            )}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white">{(myBusiness._confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2">
            <div className={`h-2 rounded-full ${
              myBusiness._confidence >= 0.8 ? 'bg-emerald-500' :
              myBusiness._confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${myBusiness._confidence * 100}%` }} />
          </div>
          {myBusiness._hasRedFlag && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={12} /> Has risk flags
            </p>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" /> Your Strengths
            </h3>
            <div className="space-y-2">
              {myBusiness.top_delights?.split(';').map((delight, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-emerald-500/10 rounded-lg">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-300">{delight.trim()}</p>
                </div>
              )) || <p className="text-slate-600 text-sm">No strengths data available</p>}
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" /> Areas to Improve
            </h3>
            <div className="space-y-2">
              {myBusiness.top_pain_points?.split(';').map((pain, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
                  <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-300">{pain.trim()}</p>
                </div>
              )) || <p className="text-slate-600 text-sm">No improvement areas identified</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users size={18} className="text-slate-400" /> Your Top Competitors
              </h3>
              <button onClick={() => navigate('/compare')}
                className="text-sm text-amber-400 hover:underline flex items-center gap-1">
                Compare <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {benchmarks?.topCompetitors.slice(0, 4).map((competitor, i) => (
                <div key={competitor._id}
                  className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/explorer/${competitor._id}`)}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-600/50 text-slate-300' :
                    i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-700/50 text-slate-500'
                  }`}>
                    <span className="text-sm font-bold">#{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 text-sm truncate">{competitor.business_name}</p>
                    <p className="text-xs text-slate-500">{competitor.neighborhood_area || 'Coral Gables'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{competitor._rating.toFixed(1)}</p>
                    <p className="text-xs text-slate-500">rating</p>
                  </div>
                </div>
              )) || <p className="text-slate-600 text-sm">No competitors found</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl p-5 border border-amber-500/20">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-amber-400" /> Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: 'View Action Plan', path: '/my-business/actions' },
                { label: 'Explore Ecosystem', path: '/ecosystem' },
                { label: 'Market Intelligence', path: '/market' },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => navigate(path)}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/60 rounded-lg hover:bg-slate-800 transition-all">
                  <span className="text-sm font-medium text-slate-200">{label}</span>
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
