import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Building2,
  Star,
  ChevronRight,
  Filter,
  Award,
  ShieldCheck,
  ShieldAlert,
  Users,
  Layers,
} from 'lucide-react'

const COLORS = ['#c9a227', '#1e3a5f', '#e8856c', '#87a878', '#2d3436', '#6b7280']

export default function MarketIntelPage() {
  const { businesses, stats } = useData()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')

  // Filter by category
  const filteredBusinesses = useMemo(() => {
    if (!selectedCategory) return businesses
    return businesses.filter(b => b.category_primary === selectedCategory)
  }, [businesses, selectedCategory])

  // Category performance data
  const categoryPerformance = useMemo(() => {
    if (!stats?.categories) return []

    return stats.categories.map(cat => {
      const catBusinesses = businesses.filter(b => b.category_primary === cat)
      const avgRating = catBusinesses.reduce((acc, b) => acc + b.rating, 0) / catBusinesses.length
      const avgConfidence = catBusinesses.reduce((acc, b) => acc + b.osintConfidence, 0) / catBusinesses.length
      const redFlagCount = catBusinesses.filter(b => b.hasRedFlag).length
      const chamberCount = catBusinesses.filter(b => b.isChamberMember).length

      return {
        name: cat.replace(/_/g, ' '),
        fullName: cat,
        count: catBusinesses.length,
        avgRating: parseFloat(avgRating.toFixed(2)),
        avgConfidence: parseFloat((avgConfidence * 100).toFixed(0)),
        redFlagCount,
        chamberCount,
        chamberPercent: ((chamberCount / catBusinesses.length) * 100).toFixed(0),
      }
    }).sort((a, b) => b.count - a.count)
  }, [businesses, stats])

  // Top performers
  const topPerformers = useMemo(() => {
    return [...filteredBusinesses]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
  }, [filteredBusinesses])

  // At-risk businesses
  const atRiskBusinesses = useMemo(() => {
    return filteredBusinesses
      .filter(b => b.hasRedFlag || b.osintConfidence < 0.6 || b.rating < 3.0)
      .sort((a, b) => {
        // Sort by severity: red flag first, then low confidence, then low rating
        if (a.hasRedFlag && !b.hasRedFlag) return -1
        if (!a.hasRedFlag && b.hasRedFlag) return 1
        if (a.osintConfidence < b.osintConfidence) return -1
        if (a.osintConfidence > b.osintConfidence) return 1
        return a.rating - b.rating
      })
      .slice(0, 5)
  }, [filteredBusinesses])

  // Market health metrics
  const marketHealth = useMemo(() => {
    const total = filteredBusinesses.length
    if (total === 0) return null

    const highRated = filteredBusinesses.filter(b => b.rating >= 4.0).length
    const redFlags = filteredBusinesses.filter(b => b.hasRedFlag).length
    const lowConfidence = filteredBusinesses.filter(b => b.osintConfidence < 0.6).length
    const chamberMembers = filteredBusinesses.filter(b => b.isChamberMember).length

    return {
      healthScore: Math.round(((highRated / total) * 50) + ((1 - redFlags / total) * 30) + ((1 - lowConfidence / total) * 20)),
      highRatedPercent: ((highRated / total) * 100).toFixed(0),
      redFlagPercent: ((redFlags / total) * 100).toFixed(0),
      chamberPercent: ((chamberMembers / total) * 100).toFixed(0),
      avgRating: (filteredBusinesses.reduce((acc, b) => acc + b.rating, 0) / total).toFixed(2),
    }
  }, [filteredBusinesses])

  // Price tier distribution
  const priceTierData = useMemo(() => {
    const tiers = ['$', '$$', '$$$', '$$$$']
    return tiers.map(tier => ({
      name: tier,
      value: filteredBusinesses.filter(b => b.price_tier === tier).length,
    })).filter(d => d.value > 0)
  }, [filteredBusinesses])

  // Radar data for category comparison
  const radarData = useMemo(() => {
    const topCats = categoryPerformance.slice(0, 6)
    return [
      { metric: 'Avg Rating', ...Object.fromEntries(topCats.map(c => [c.name, c.avgRating])) },
      { metric: 'Data Quality', ...Object.fromEntries(topCats.map(c => [c.name, c.avgConfidence / 20])) },
      { metric: 'Chamber %', ...Object.fromEntries(topCats.map(c => [c.name, c.chamberPercent / 20])) },
    ]
  }, [categoryPerformance])

  return (
    <div className="space-y-6">
      {/* Header with filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cgcc-navy">Market Overview</h1>
          <p className="text-gray-600">
            {selectedCategory
              ? `Analyzing ${filteredBusinesses.length} ${selectedCategory.replace(/_/g, ' ')} businesses`
              : `Analyzing ${businesses.length} businesses across ${stats?.categories.length} categories`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
          >
            <option value="">All Categories</option>
            {stats?.categories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Market Health Score */}
      {marketHealth && (
        <div className="bg-gradient-to-br from-cgcc-navy to-cgcc-navy/90 rounded-2xl p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Health Score Circle */}
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <circle
                    cx="56" cy="56" r="48"
                    stroke={marketHealth.healthScore >= 70 ? '#87a878' : marketHealth.healthScore >= 50 ? '#c9a227' : '#e8856c'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${marketHealth.healthScore * 3.01} 301`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl font-bold">{marketHealth.healthScore}</span>
                    <span className="text-sm text-white/60 block">Health</span>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {selectedCategory ? selectedCategory.replace(/_/g, ' ') : 'Coral Gables'} Market
                </h2>
                <p className="text-white/60 text-sm">
                  {marketHealth.healthScore >= 70 ? 'Strong market health' :
                   marketHealth.healthScore >= 50 ? 'Moderate market health' : 'Market needs attention'}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-cgcc-gold" />
                  <span className="text-white/60 text-sm">Avg Rating</span>
                </div>
                <p className="text-2xl font-bold">{marketHealth.avgRating}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-cgcc-sage" />
                  <span className="text-white/60 text-sm">High Rated</span>
                </div>
                <p className="text-2xl font-bold">{marketHealth.highRatedPercent}%</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-cgcc-coral" />
                  <span className="text-white/60 text-sm">Risk Flags</span>
                </div>
                <p className="text-2xl font-bold">{marketHealth.redFlagPercent}%</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-cgcc-gold" />
                  <span className="text-white/60 text-sm">Chamber</span>
                </div>
                <p className="text-2xl font-bold">{marketHealth.chamberPercent}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
            <Building2 size={18} />
            Category Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryPerformance.slice(0, 8)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 5]} tickCount={6} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={75}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-cgcc-navy capitalize">{data.name}</p>
                          <p className="text-sm text-gray-600">{data.count} businesses</p>
                          <p className="text-sm text-gray-600">Avg Rating: {data.avgRating}</p>
                          <p className="text-sm text-gray-600">Chamber: {data.chamberPercent}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="avgRating" fill="#c9a227" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price Tier Distribution */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
            <Target size={18} />
            Price Tier Distribution
          </h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priceTierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {priceTierData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers & At Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-cgcc-navy flex items-center gap-2">
              <ShieldCheck size={18} className="text-cgcc-sage" />
              Top Performers
            </h3>
            <button
              onClick={() => navigate('/discover')}
              className="text-sm text-cgcc-gold hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {topPerformers.map((business, i) => (
              <div
                key={business.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-cgcc-sage/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/discover/browse?business=${business.id}`)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  i === 0 ? 'bg-cgcc-gold text-white' :
                  i === 1 ? 'bg-gray-400 text-white' :
                  i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-cgcc-navy text-sm truncate">{business.business_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{business.category_primary?.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <Star size={14} className="text-cgcc-gold fill-cgcc-gold" />
                  <span className="font-semibold text-cgcc-navy">{business.rating.toFixed(1)}</span>
                </div>
                {business.isChamberMember && (
                  <span className="px-2 py-0.5 bg-cgcc-gold/10 text-cgcc-gold text-xs font-medium rounded-full">
                    Member
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* At Risk */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-cgcc-navy flex items-center gap-2">
              <ShieldAlert size={18} className="text-cgcc-coral" />
              Businesses Needing Attention
            </h3>
            <button
              onClick={() => navigate('/market-intel/risks')}
              className="text-sm text-cgcc-gold hover:underline"
            >
              Risk Radar
            </button>
          </div>
          {atRiskBusinesses.length > 0 ? (
            <div className="space-y-2">
              {atRiskBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex items-center gap-3 p-3 bg-cgcc-coral/5 rounded-lg hover:bg-cgcc-coral/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/discover/browse?business=${business.id}`)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-cgcc-coral/20">
                    <AlertTriangle size={16} className="text-cgcc-coral" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-cgcc-navy text-sm truncate">{business.business_name}</p>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {business.hasRedFlag && (
                        <span className={business.red_flag_severity === 'Critical' ? 'text-red-600 font-semibold' : 'text-cgcc-coral'}>
                          {business.red_flag_severity || 'Red flag'}
                        </span>
                      )}
                      {business.osintConfidence < 0.6 && (
                        <span className="text-amber-600">Low confidence</span>
                      )}
                      {business.rating < 3.0 && (
                        <span className="text-gray-500">Rating: {business.rating.toFixed(1)}</span>
                      )}
                      {business.corroborationCount >= 2 && (
                        <span className="inline-flex items-center gap-0.5 text-purple-600">
                          <Layers size={10} /> {business.corroborationCount} sources
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShieldCheck size={32} className="text-cgcc-sage mx-auto mb-2" />
              <p className="text-gray-600">No businesses at risk in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Cards */}
      <div>
        <h3 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
          <Users size={18} />
          Explore by Category
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categoryPerformance.map((cat, i) => (
            <button
              key={cat.fullName}
              onClick={() => setSelectedCategory(cat.fullName === selectedCategory ? '' : cat.fullName)}
              className={`p-4 rounded-xl border text-left transition-all ${
                cat.fullName === selectedCategory
                  ? 'bg-cgcc-gold/10 border-cgcc-gold'
                  : 'bg-white border-gray-200 hover:border-cgcc-gold/50'
              }`}
            >
              <p className="font-semibold text-cgcc-navy capitalize text-sm truncate">{cat.name}</p>
              <p className="text-2xl font-bold text-cgcc-navy mt-1">{cat.count}</p>
              <div className="flex items-center gap-1 mt-2">
                <Star size={12} className="text-cgcc-gold fill-cgcc-gold" />
                <span className="text-sm text-gray-600">{cat.avgRating}</span>
                {cat.redFlagCount > 0 && (
                  <span className="text-xs text-cgcc-coral ml-2">
                    {cat.redFlagCount} risk
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
