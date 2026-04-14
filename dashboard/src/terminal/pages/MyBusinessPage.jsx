import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Star, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  Building2, ChevronRight, Award, Target, Zap, Users, ArrowRight, Search,
  Shield, Crown, BarChart3, Sparkles,
} from 'lucide-react'

/* ── Gauge Ring ── */
function GaugeRing({ percent, size = 64, strokeWidth = 5, color = '#f59e0b' }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-800" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white font-mono">{percent}%</span>
      </div>
    </div>
  )
}

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
              'text-slate-700'} />
        ))}
      </div>
    )
  }

  const TrendIndicator = ({ value, suffix = '' }) => {
    if (value > 0) return <span className="text-emerald-400 flex items-center gap-1 text-sm font-medium"><TrendingUp size={14} /> +{value.toFixed(2)}{suffix}</span>
    if (value < 0) return <span className="text-red-400 flex items-center gap-1 text-sm font-medium"><TrendingDown size={14} /> {value.toFixed(2)}{suffix}</span>
    return <span className="text-slate-500 flex items-center gap-1 text-sm"><Minus size={14} /> 0{suffix}</span>
  }

  // ── Business selector ──────────────────────────
  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Building2 size={36} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Claim Your Business</h1>
          <p className="text-slate-400 text-sm">Select your business to see your personalized scorecard and competitive position</p>
        </div>

        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search for your business..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800/60 rounded-xl
              focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 outline-none
              placeholder:text-slate-600 text-lg text-slate-200 transition-all"
            autoFocus />
        </div>

        {searchResults.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/60 overflow-hidden">
            {searchResults.map((business) => (
              <button key={business._id} onClick={() => handleSelectBusiness(business._id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/40 transition-all border-b border-slate-800/30 last:border-0 text-left group">
                <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:border-amber-500/30 transition-colors">
                  <span className="text-sm font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                    {business.business_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">{business.business_name}</p>
                  <p className="text-sm text-slate-500 truncate">{business.category_primary?.replace(/_/g, ' ')} · {business.neighborhood_area || 'Coral Gables'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(business._rating)}
                  <span className="text-sm text-slate-400 font-mono">{business._rating.toFixed(1)}</span>
                </div>
                <ChevronRight size={16} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
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
                  className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-amber-500/30 hover:bg-slate-800/40 transition-all text-left group">
                  <p className="font-medium text-slate-200 capitalize text-sm group-hover:text-amber-400 transition-colors">{category.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-600 mt-1">
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
  const topPercentile = benchmarks ? ((benchmarks.overallRank / benchmarks.totalBusinesses) * 100).toFixed(0) : 0
  const confidencePct = Math.round(myBusiness._confidence * 100)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-amber-400">
                  {myBusiness.business_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{myBusiness.business_name}</h1>
                  {myBusiness.isChamberMember && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                      <Crown size={10} /> Chamber Member
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')} · {myBusiness.neighborhood_area || 'Coral Gables'}</p>
                <div className="flex items-center gap-3 mt-2">
                  {renderStars(myBusiness._rating)}
                  <span className="text-sm text-slate-400 font-mono">{myBusiness._rating.toFixed(1)}</span>
                  {myBusiness._reviewCount > 0 && (
                    <span className="text-[11px] text-slate-600">({myBusiness._reviewCount} reviews)</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => { setSelectedBusinessId(''); localStorage.removeItem('terminal_my_business') }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg border border-slate-800/60 hover:border-slate-700 self-start">
              Change business
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SCORECARD GRID ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rating Card */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Your Rating</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Star size={14} className="text-amber-400" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white font-mono">{myBusiness._rating.toFixed(1)}</span>
            <span className="text-slate-600 mb-1 text-sm">/ 5.0</span>
          </div>
          {renderStars(myBusiness._rating)}
          <div className="mt-3 pt-3 border-t border-slate-800/40 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">vs. Category Avg</span>
              <TrendIndicator value={benchmarks?.ratingVsCategory} />
            </div>
          </div>
        </div>

        {/* Category Rank Card */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Category Rank</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Award size={14} className="text-purple-400" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white font-mono">#{benchmarks?.ratingRank}</span>
            <span className="text-slate-600 mb-1 text-sm">of {benchmarks?.totalInCategory}</span>
          </div>
          <p className="text-xs text-slate-500 capitalize">{myBusiness.category_primary?.replace(/_/g, ' ')}</p>
          <div className="mt-3 pt-3 border-t border-slate-800/40 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">Category Avg</span>
              <span className="text-xs font-medium text-slate-300 font-mono">{benchmarks?.categoryAvgRating} ★</span>
            </div>
          </div>
        </div>

        {/* Overall Rank Card */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Overall Rank</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Target size={14} className="text-emerald-400" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-white font-mono">#{benchmarks?.overallRank}</span>
            <span className="text-slate-600 mb-1 text-sm">of {benchmarks?.totalBusinesses}</span>
          </div>
          <p className="text-xs text-slate-500">All Coral Gables businesses</p>
          <div className="mt-3 pt-3 border-t border-slate-800/40 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">Top percentile</span>
              <span className="text-xs font-medium text-emerald-400 font-mono">{topPercentile}%</span>
            </div>
          </div>
        </div>

        {/* Data Confidence Card */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Data Confidence</p>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              myBusiness._hasRedFlag
                ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {myBusiness._hasRedFlag
                ? <AlertTriangle size={14} className="text-red-400" />
                : <Shield size={14} className="text-emerald-400" />}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <GaugeRing percent={confidencePct} size={56} strokeWidth={4}
              color={confidencePct >= 80 ? '#10b981' : confidencePct >= 60 ? '#f59e0b' : '#ef4444'} />
            <div>
              <span className="text-2xl font-bold text-white font-mono">{confidencePct}%</span>
              {myBusiness._hasRedFlag && (
                <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={10} /> Has risk flags
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TWO-COLUMN LAYOUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Strengths */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/40" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={13} className="text-emerald-400" />
                </div>
                Your Strengths
              </h3>
              <div className="space-y-2">
                {myBusiness.top_delights?.split(';').map((delight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <div className="w-6 h-6 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 text-[10px] font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{delight.trim()}</p>
                  </div>
                )) || <p className="text-slate-600 text-sm">No strengths data available</p>}
              </div>
            </div>
          </div>

          {/* Areas to Improve */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500/40" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={13} className="text-red-400" />
                </div>
                Areas to Improve
              </h3>
              <div className="space-y-2">
                {myBusiness.top_pain_points?.split(';').map((pain, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <div className="w-6 h-6 bg-red-500/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-[10px] font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{pain.trim()}</p>
                  </div>
                )) || <p className="text-slate-600 text-sm">No improvement areas identified</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Top Competitors */}
          <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/40" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Users size={13} className="text-blue-400" />
                  </div>
                  Your Top Competitors
                </h3>
                <button onClick={() => navigate('/compare')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                  Compare <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {benchmarks?.topCompetitors.slice(0, 4).map((competitor, i) => {
                  const medalColors = [
                    'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    'bg-slate-600/20 border-slate-500/20 text-slate-300',
                    'bg-amber-700/10 border-amber-700/20 text-amber-600',
                    'bg-slate-800 border-slate-700 text-slate-500',
                  ]
                  return (
                    <div key={competitor._id}
                      className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/explorer/${competitor._id}`)}>
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${medalColors[i] || medalColors[3]}`}>
                        <span className="text-xs font-bold">#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200 text-sm truncate group-hover:text-amber-400 transition-colors">{competitor.business_name}</p>
                        <p className="text-[11px] text-slate-600">{competitor.neighborhood_area || 'Coral Gables'}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star size={11} className="text-amber-500" />
                          <p className="font-semibold text-white font-mono text-sm">{competitor._rating.toFixed(1)}</p>
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
                    </div>
                  )
                }) || <p className="text-slate-600 text-sm">No competitors found</p>}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative bg-gradient-to-br from-amber-500/5 to-amber-500/[0.02] border border-amber-500/15 rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <Sparkles size={13} className="text-amber-400" />
                </div>
                Quick Actions
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'View Action Plan', path: '/my-business/actions', icon: Zap, color: 'text-amber-400' },
                  { label: 'Explore Ecosystem', path: '/ecosystem', icon: Users, color: 'text-blue-400' },
                  { label: 'Market Intelligence', path: '/market', icon: BarChart3, color: 'text-emerald-400' },
                ].map(({ label, path, icon: Icon, color }) => (
                  <button key={path} onClick={() => navigate(path)}
                    className="w-full flex items-center gap-3 p-3.5 bg-slate-900/60 border border-slate-800/40 rounded-xl hover:bg-slate-800/50 hover:border-slate-700 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center group-hover:border-slate-600 transition-colors">
                      <Icon size={14} className={color} />
                    </div>
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{label}</span>
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 ml-auto transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
