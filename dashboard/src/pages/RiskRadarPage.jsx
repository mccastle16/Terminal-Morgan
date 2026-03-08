import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Eye,
  Filter,
  ChevronRight,
  Star,
  Building2,
  AlertCircle,
  Activity,
  Target,
  Layers,
} from 'lucide-react'
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
} from 'recharts'

const COLORS = ['#e8856c', '#c9a227', '#87a878', '#1e3a5f']

export default function RiskRadarPage() {
  const { businesses, stats } = useData()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')

  // Risk analysis
  const riskAnalysis = useMemo(() => {
    let filtered = businesses

    if (selectedCategory) {
      filtered = filtered.filter(b => b.category_primary === selectedCategory)
    }

    // Categorize risks
    const redFlagBusinesses = filtered.filter(b => b.hasRedFlag)
    const lowConfidenceBusinesses = filtered.filter(b => b.osintConfidence < 0.6 && !b.hasRedFlag)
    const lowRatingBusinesses = filtered.filter(b => b.rating < 3.0 && !b.hasRedFlag && b.osintConfidence >= 0.6)
    const healthyBusinesses = filtered.filter(b => !b.hasRedFlag && b.osintConfidence >= 0.6 && b.rating >= 3.0)

    // Risk by category
    const riskByCategory = stats?.categories.map(cat => {
      const catBusinesses = businesses.filter(b => b.category_primary === cat)
      const atRisk = catBusinesses.filter(b => b.hasRedFlag || b.osintConfidence < 0.6 || b.rating < 3.0)
      return {
        name: cat.replace(/_/g, ' '),
        fullName: cat,
        total: catBusinesses.length,
        atRisk: atRisk.length,
        riskPercent: catBusinesses.length > 0 ? ((atRisk.length / catBusinesses.length) * 100).toFixed(0) : 0,
      }
    }).filter(c => c.total > 0).sort((a, b) => b.atRisk - a.atRisk) || []

    // Severity distribution — uses actual red_flag_severity from Agent 2
    const criticalCount = redFlagBusinesses.filter(b => b.red_flag_severity === 'Critical').length
    const operationalCount = redFlagBusinesses.filter(b => b.red_flag_severity === 'Operational').length
    const corroboratedCount = filtered.filter(b => b.corroborationCount >= 2).length

    const severityDistribution = [
      { name: 'Critical', value: criticalCount, color: '#dc2626' },
      { name: 'Operational', value: operationalCount, color: '#e8856c' },
      { name: 'Warning (Low Confidence)', value: lowConfidenceBusinesses.length, color: '#c9a227' },
      { name: 'Monitor (Low Rating)', value: lowRatingBusinesses.length, color: '#6b7280' },
      { name: 'Healthy', value: healthyBusinesses.length, color: '#87a878' },
    ].filter(d => d.value > 0)

    return {
      total: filtered.length,
      redFlag: redFlagBusinesses,
      lowConfidence: lowConfidenceBusinesses,
      lowRating: lowRatingBusinesses,
      healthy: healthyBusinesses,
      riskByCategory,
      severityDistribution,
      criticalCount,
      operationalCount,
      corroboratedCount,
      overallRiskScore: filtered.length > 0
        ? Math.round(((redFlagBusinesses.length * 3 + lowConfidenceBusinesses.length * 2 + lowRatingBusinesses.length) / (filtered.length * 3)) * 100)
        : 0,
    }
  }, [businesses, stats, selectedCategory])

  // Get at-risk businesses based on filter
  const atRiskBusinesses = useMemo(() => {
    switch (riskFilter) {
      case 'red-flag':
        return riskAnalysis.redFlag
      case 'low-confidence':
        return riskAnalysis.lowConfidence
      case 'low-rating':
        return riskAnalysis.lowRating
      default:
        return [...riskAnalysis.redFlag, ...riskAnalysis.lowConfidence, ...riskAnalysis.lowRating]
          .sort((a, b) => {
            // Sort by severity: red flag first, then low confidence, then low rating
            if (a.hasRedFlag && !b.hasRedFlag) return -1
            if (!a.hasRedFlag && b.hasRedFlag) return 1
            return a.osintConfidence - b.osintConfidence
          })
    }
  }, [riskAnalysis, riskFilter])

  // Render stars
  const renderStars = (rating, size = 12) => {
    const fullStars = Math.floor(rating)
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < fullStars ? 'text-cgcc-gold fill-cgcc-gold' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cgcc-navy">Risk Radar</h1>
          <p className="text-gray-600">
            Monitor business health and identify early warning signs
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Risk Score</p>
            <Activity size={18} className={
              riskAnalysis.overallRiskScore > 30 ? 'text-cgcc-coral' :
              riskAnalysis.overallRiskScore > 15 ? 'text-cgcc-gold' : 'text-cgcc-sage'
            } />
          </div>
          <p className="text-3xl font-bold text-cgcc-navy">{riskAnalysis.overallRiskScore}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {riskAnalysis.overallRiskScore > 30 ? 'High risk level' :
             riskAnalysis.overallRiskScore > 15 ? 'Moderate risk' : 'Low risk'}
          </p>
        </div>

        <div className="bg-cgcc-coral/5 rounded-xl p-5 border border-cgcc-coral/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-cgcc-coral font-medium">Red Flags</p>
            <AlertTriangle size={18} className="text-cgcc-coral" />
          </div>
          <p className="text-3xl font-bold text-cgcc-coral">{riskAnalysis.redFlag.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {riskAnalysis.criticalCount} critical · {riskAnalysis.operationalCount} operational
          </p>
        </div>

        <div className="bg-cgcc-gold/5 rounded-xl p-5 border border-cgcc-gold/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-cgcc-gold font-medium">Low Confidence</p>
            <Eye size={18} className="text-cgcc-gold" />
          </div>
          <p className="text-3xl font-bold text-cgcc-gold">{riskAnalysis.lowConfidence.length}</p>
          <p className="text-xs text-gray-500 mt-1">Need verification</p>
        </div>

        <div className="bg-cgcc-sage/5 rounded-xl p-5 border border-cgcc-sage/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-cgcc-sage font-medium">Healthy</p>
            <ShieldCheck size={18} className="text-cgcc-sage" />
          </div>
          <p className="text-3xl font-bold text-cgcc-sage">{riskAnalysis.healthy.length}</p>
          <p className="text-xs text-gray-500 mt-1">No issues detected</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk by Category */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-cgcc-navy mb-4">Risk by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskAnalysis.riskByCategory.slice(0, 8)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-cgcc-navy capitalize">{data.name}</p>
                          <p className="text-sm text-cgcc-coral">{data.atRisk} at risk</p>
                          <p className="text-sm text-gray-500">{data.total} total ({data.riskPercent}%)</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="atRisk" fill="#e8856c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-cgcc-navy mb-4">Health Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskAnalysis.severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskAnalysis.severityDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {riskAnalysis.severityDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* At-Risk Businesses List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-cgcc-navy flex items-center gap-2">
            <ShieldAlert size={18} className="text-cgcc-coral" />
            Businesses Requiring Attention ({atRiskBusinesses.length})
          </h3>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold"
            >
              <option value="all">All Issues</option>
              <option value="red-flag">Red Flags Only</option>
              <option value="low-confidence">Low Confidence Only</option>
              <option value="low-rating">Low Rating Only</option>
            </select>
          </div>
        </div>

        {atRiskBusinesses.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {atRiskBusinesses.slice(0, 20).map((business) => (
              <div
                key={business.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4"
                onClick={() => navigate(`/discover/browse?business=${business.id}`)}
              >
                {/* Risk indicator */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  business.hasRedFlag ? 'bg-cgcc-coral/10' :
                  business.osintConfidence < 0.6 ? 'bg-cgcc-gold/10' : 'bg-gray-100'
                }`}>
                  {business.hasRedFlag ? (
                    <AlertTriangle size={20} className="text-cgcc-coral" />
                  ) : business.osintConfidence < 0.6 ? (
                    <Eye size={20} className="text-cgcc-gold" />
                  ) : (
                    <TrendingDown size={20} className="text-gray-500" />
                  )}
                </div>

                {/* Business info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-cgcc-navy truncate">{business.business_name}</h4>
                    {business.hasRedFlag && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        business.red_flag_severity === 'Critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-cgcc-coral/10 text-cgcc-coral'
                      }`}>
                        {business.red_flag_severity || 'Red Flag'}
                      </span>
                    )}
                    {business.corroborationCount >= 2 && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Layers size={10} /> {business.corroborationCount} sources
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">
                    {business.category_primary?.replace(/_/g, ' ')}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      {renderStars(business.rating)}
                      <span className="text-sm font-medium text-cgcc-navy ml-1">{business.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-400">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${
                      business.osintConfidence >= 0.8 ? 'text-cgcc-sage' :
                      business.osintConfidence >= 0.6 ? 'text-cgcc-gold' : 'text-cgcc-coral'
                    }`}>
                      {(business.osintConfidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-400">Confidence</p>
                  </div>
                </div>

                {/* Issue summary */}
                <div className="w-48 hidden lg:block">
                  {business.hasRedFlag && business.red_flag_category && (
                    <p className="text-xs text-cgcc-coral truncate">{business.red_flag_category}</p>
                  )}
                  {!business.hasRedFlag && business.osintConfidence < 0.6 && (
                    <p className="text-xs text-cgcc-gold">Low data confidence</p>
                  )}
                  {!business.hasRedFlag && business.osintConfidence >= 0.6 && business.rating < 3.0 && (
                    <p className="text-xs text-gray-500">Below average rating</p>
                  )}
                </div>

                <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <ShieldCheck size={48} className="text-cgcc-sage mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">All Clear</h3>
            <p className="text-gray-500">No businesses with risk indicators in this selection</p>
          </div>
        )}
      </div>

      {/* Risk Insights */}
      <div className="bg-gradient-to-br from-cgcc-navy to-cgcc-navy/90 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Target size={24} className="text-cgcc-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Risk Insights</h3>
            <div className="space-y-2 text-white/80 text-sm">
              {riskAnalysis.redFlag.length > 0 && (
                <p>• {riskAnalysis.redFlag.length} business{riskAnalysis.redFlag.length > 1 ? 'es have' : ' has'} red flags ({riskAnalysis.criticalCount} critical, {riskAnalysis.operationalCount} operational)</p>
              )}
              {riskAnalysis.corroboratedCount > 0 && (
                <p>• {riskAnalysis.corroboratedCount} business{riskAnalysis.corroboratedCount > 1 ? 'es are' : ' is'} verified by multiple independent data sources</p>
              )}
              {riskAnalysis.lowConfidence.length > 0 && (
                <p>• {riskAnalysis.lowConfidence.length} business{riskAnalysis.lowConfidence.length > 1 ? 'es need' : ' needs'} data verification to improve confidence scores</p>
              )}
              {riskAnalysis.riskByCategory.length > 0 && riskAnalysis.riskByCategory[0].atRisk > 0 && (
                <p>• {riskAnalysis.riskByCategory[0].name} has the highest number of at-risk businesses ({riskAnalysis.riskByCategory[0].atRisk})</p>
              )}
              {riskAnalysis.overallRiskScore < 15 && (
                <p>• Overall market health is good with a low risk score of {riskAnalysis.overallRiskScore}%</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
