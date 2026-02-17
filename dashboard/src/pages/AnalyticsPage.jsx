import { useMemo } from 'react'
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
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { TrendingUp, PieChartIcon, BarChart3, Activity, Target, Users } from 'lucide-react'

const COLORS = ['#1e3a5f', '#c9a227', '#e8856c', '#87a878', '#8b5cf6', '#3b82f6', '#f97316', '#22c55e', '#06b6d4', '#ec4899']

export default function AnalyticsPage() {
  const { businesses, stats, loading } = useData()

  const categoryData = useMemo(() => {
    if (!businesses.length) return []
    const categoryMap = {}
    businesses.forEach(b => {
      const cat = b.category_primary || 'Unknown'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, count: 0, totalRating: 0, totalConfidence: 0 }
      }
      categoryMap[cat].count++
      categoryMap[cat].totalRating += b.rating || 0
      categoryMap[cat].totalConfidence += b.osintConfidence || 0
    })
    return Object.values(categoryMap)
      .map(c => ({
        ...c,
        avgRating: (c.totalRating / c.count).toFixed(2),
        avgConfidence: ((c.totalConfidence / c.count) * 100).toFixed(0),
      }))
      .sort((a, b) => b.count - a.count)
  }, [businesses])

  const priceDistribution = useMemo(() => {
    if (!businesses.length) return []
    const priceMap = { '$': 0, '$$': 0, '$$$': 0, '$$$$': 0, 'N/A': 0 }
    businesses.forEach(b => {
      const tier = b.price_tier || 'N/A'
      if (priceMap[tier] !== undefined) {
        priceMap[tier]++
      }
    })
    return Object.entries(priceMap)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
  }, [businesses])

  const confidenceVsRating = useMemo(() => {
    return businesses
      .filter(b => b.rating > 0 && b.osintConfidence > 0)
      .map(b => ({
        name: b.business_name,
        rating: b.rating,
        confidence: b.osintConfidence * 100,
        hasRedFlag: b.hasRedFlag,
      }))
  }, [businesses])

  const sourceFileBreakdown = useMemo(() => {
    if (!businesses.length) return []
    const sourceMap = {}
    businesses.forEach(b => {
      const source = b.source_file?.replace('.csv', '') || 'Unknown'
      sourceMap[source] = (sourceMap[source] || 0) + 1
    })
    return Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [businesses])

  const radarData = useMemo(() => {
    if (!categoryData.length) return []
    return categoryData.slice(0, 6).map(cat => ({
      category: cat.name.substring(0, 15),
      rating: parseFloat(cat.avgRating) * 20,
      confidence: parseFloat(cat.avgConfidence),
      count: (cat.count / businesses.length) * 100,
    }))
  }, [categoryData, businesses.length])

  const validationTierData = useMemo(() => {
    if (!businesses.length) return []
    const tierMap = {}
    businesses.forEach(b => {
      const tier = b.validation_tier || 'Unknown'
      tierMap[tier] = (tierMap[tier] || 0) + 1
    })
    return Object.entries(tierMap).map(([name, value]) => ({ name, value }))
  }, [businesses])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 rounded-xl shimmer"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
          Analytics Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Deep dive into your business intelligence data
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cgcc-navy/10 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-cgcc-navy" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              <p className="text-xs text-gray-500">Total Businesses</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cgcc-gold/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-cgcc-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgRating || 0}</p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cgcc-sage/10 rounded-lg flex items-center justify-center">
              <Target size={20} className="text-cgcc-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgConfidence || 0}%</p>
              <p className="text-xs text-gray-500">Avg Confidence</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cgcc-coral/10 rounded-lg flex items-center justify-center">
              <Activity size={20} className="text-cgcc-coral" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.categories?.length || 0}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution bar chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-cgcc-navy" />
            <h2 className="text-lg font-semibold text-gray-900">Businesses by Category</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => value.length > 18 ? value.substring(0, 18) + '...' : value}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => [value, name === 'count' ? 'Businesses' : name]}
                />
                <Bar dataKey="count" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price tier pie chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={20} className="text-cgcc-gold" />
            <h2 className="text-lg font-semibold text-gray-900">Price Tier Distribution</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priceDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {priceDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category ratings comparison */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-cgcc-sage" />
            <h2 className="text-lg font-semibold text-gray-900">Average Rating by Category</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="avgRating" name="Avg Rating" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source file breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon size={20} className="text-cgcc-coral" />
            <h2 className="text-lg font-semibold text-gray-900">Data Source Breakdown</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceFileBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {sourceFileBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence vs Rating scatter */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} className="text-cgcc-navy" />
            <h2 className="text-lg font-semibold text-gray-900">Confidence vs Rating Analysis</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="rating"
                  name="Rating"
                  domain={[0, 5]}
                  label={{ value: 'Rating', position: 'bottom', offset: 0 }}
                />
                <YAxis
                  type="number"
                  dataKey="confidence"
                  name="Confidence"
                  domain={[0, 100]}
                  label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }}
                />
                <ZAxis range={[50, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => [
                    name === 'confidence' ? `${value.toFixed(0)}%` : value.toFixed(1),
                    name === 'confidence' ? 'Confidence' : 'Rating'
                  ]}
                />
                <Scatter
                  name="Businesses"
                  data={confidenceVsRating.filter(d => !d.hasRedFlag)}
                  fill="#1e3a5f"
                />
                <Scatter
                  name="With Red Flag"
                  data={confidenceVsRating.filter(d => d.hasRedFlag)}
                  fill="#e8856c"
                />
                <Legend />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Validation tier distribution */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-cgcc-sage" />
            <h2 className="text-lg font-semibold text-gray-900">Validation Tier Distribution</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={validationTierData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {validationTierData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category radar chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} className="text-cgcc-gold" />
            <h2 className="text-lg font-semibold text-gray-900">Category Performance Radar</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Rating (scaled)"
                  dataKey="rating"
                  stroke="#c9a227"
                  fill="#c9a227"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Confidence"
                  dataKey="confidence"
                  stroke="#1e3a5f"
                  fill="#1e3a5f"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
