import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Filter,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'

export default function InsightsPage() {
  const { businesses, stats, loading } = useData()
  const [selectedCategory, setSelectedCategory] = useState('')
  const [insightType, setInsightType] = useState('pain_points')

  const painPointsAnalysis = useMemo(() => {
    if (!businesses.length) return []

    const filtered = selectedCategory
      ? businesses.filter(b => b.category_primary === selectedCategory)
      : businesses

    const painPointsMap = {}
    filtered.forEach(b => {
      if (b.top_pain_points) {
        const points = b.top_pain_points.split(';').map(p => p.trim())
        points.forEach(point => {
          if (point.length > 10) {
            const key = point.toLowerCase().substring(0, 80)
            if (!painPointsMap[key]) {
              painPointsMap[key] = {
                text: point,
                count: 0,
                businesses: [],
                categories: new Set(),
              }
            }
            painPointsMap[key].count++
            painPointsMap[key].businesses.push(b)
            painPointsMap[key].categories.add(b.category_primary)
          }
        })
      }
    })

    return Object.values(painPointsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [businesses, selectedCategory])

  const delightsAnalysis = useMemo(() => {
    if (!businesses.length) return []

    const filtered = selectedCategory
      ? businesses.filter(b => b.category_primary === selectedCategory)
      : businesses

    const delightsMap = {}
    filtered.forEach(b => {
      if (b.top_delights) {
        const points = b.top_delights.split(';').map(p => p.trim())
        points.forEach(point => {
          if (point.length > 10) {
            const key = point.toLowerCase().substring(0, 80)
            if (!delightsMap[key]) {
              delightsMap[key] = {
                text: point,
                count: 0,
                businesses: [],
                categories: new Set(),
              }
            }
            delightsMap[key].count++
            delightsMap[key].businesses.push(b)
            delightsMap[key].categories.add(b.category_primary)
          }
        })
      }
    })

    return Object.values(delightsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [businesses, selectedCategory])

  const risksAnalysis = useMemo(() => {
    if (!businesses.length) return []

    const filtered = selectedCategory
      ? businesses.filter(b => b.category_primary === selectedCategory)
      : businesses

    const risksMap = {}
    filtered.forEach(b => {
      if (b.pkp_primary_risks) {
        const risks = b.pkp_primary_risks.split(';').map(r => r.trim())
        risks.forEach(risk => {
          if (risk.length > 10) {
            const key = risk.toLowerCase().substring(0, 80)
            if (!risksMap[key]) {
              risksMap[key] = {
                text: risk,
                count: 0,
                businesses: [],
                categories: new Set(),
              }
            }
            risksMap[key].count++
            risksMap[key].businesses.push(b)
            risksMap[key].categories.add(b.category_primary)
          }
        })
      }
    })

    return Object.values(risksMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [businesses, selectedCategory])

  const actionsAnalysis = useMemo(() => {
    if (!businesses.length) return []

    const filtered = selectedCategory
      ? businesses.filter(b => b.category_primary === selectedCategory)
      : businesses

    const actionsMap = {}
    filtered.forEach(b => {
      if (b.pkp_primary_actions) {
        const actions = b.pkp_primary_actions.split(';').map(a => a.trim())
        actions.forEach(action => {
          if (action.length > 10) {
            const key = action.toLowerCase().substring(0, 80)
            if (!actionsMap[key]) {
              actionsMap[key] = {
                text: action,
                count: 0,
                businesses: [],
                categories: new Set(),
              }
            }
            actionsMap[key].count++
            actionsMap[key].businesses.push(b)
            actionsMap[key].categories.add(b.category_primary)
          }
        })
      }
    })

    return Object.values(actionsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [businesses, selectedCategory])

  const currentData = useMemo(() => {
    switch (insightType) {
      case 'pain_points': return painPointsAnalysis
      case 'delights': return delightsAnalysis
      case 'risks': return risksAnalysis
      case 'actions': return actionsAnalysis
      default: return painPointsAnalysis
    }
  }, [insightType, painPointsAnalysis, delightsAnalysis, risksAnalysis, actionsAnalysis])

  const insightTypes = [
    { id: 'pain_points', label: 'Pain Points', icon: AlertTriangle, color: 'cgcc-coral' },
    { id: 'delights', label: 'Delights', icon: Sparkles, color: 'cgcc-sage' },
    { id: 'risks', label: 'Primary Risks', icon: Target, color: 'cgcc-navy' },
    { id: 'actions', label: 'Recommended Actions', icon: Zap, color: 'cgcc-gold' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl shimmer"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Pain Points & Insights
          </h1>
          <p className="text-gray-500 mt-1">
            Discover common patterns across {selectedCategory || 'all'} businesses
          </p>
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-cgcc-gold min-w-[200px]"
          >
            <option value="">All Categories</option>
            {stats?.categories?.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Insight type tabs */}
      <div className="flex flex-wrap gap-2">
        {insightTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setInsightType(type.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all',
              insightType === type.id
                ? `bg-${type.color} text-white shadow-md`
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
            style={insightType === type.id ? {
              backgroundColor: type.color === 'cgcc-coral' ? '#e8856c' :
                             type.color === 'cgcc-sage' ? '#87a878' :
                             type.color === 'cgcc-navy' ? '#1e3a5f' :
                             '#c9a227'
            } : {}}
          >
            <type.icon size={18} />
            {type.label}
          </button>
        ))}
      </div>

      {/* Content generation CTA */}
      <div className="card bg-gradient-to-r from-cgcc-navy to-cgcc-navy/90 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Turn Insights Into Content</h3>
            <p className="text-white/70 mt-1">
              Use these patterns to generate targeted marketing content, address common pain points, or create educational resources.
            </p>
          </div>
          <Link
            to="/content-studio"
            className="btn-gold flex items-center gap-2 w-fit flex-shrink-0"
          >
            <Zap size={18} />
            Open Content Studio
          </Link>
        </div>
      </div>

      {/* Insights grid */}
      {currentData.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No insights found</h3>
          <p className="text-gray-500">Try selecting a different category or insight type</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentData.map((item, index) => (
            <InsightCard
              key={index}
              item={item}
              index={index}
              type={insightType}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ item, index, type }) {
  const [expanded, setExpanded] = useState(false)

  const getTypeStyles = () => {
    switch (type) {
      case 'pain_points':
        return { borderColor: 'border-cgcc-coral', bgColor: 'bg-cgcc-coral/10', textColor: 'text-cgcc-coral' }
      case 'delights':
        return { borderColor: 'border-cgcc-sage', bgColor: 'bg-cgcc-sage/10', textColor: 'text-cgcc-sage' }
      case 'risks':
        return { borderColor: 'border-cgcc-navy', bgColor: 'bg-cgcc-navy/10', textColor: 'text-cgcc-navy' }
      case 'actions':
        return { borderColor: 'border-cgcc-gold', bgColor: 'bg-cgcc-gold/10', textColor: 'text-cgcc-gold' }
      default:
        return { borderColor: 'border-gray-200', bgColor: 'bg-gray-100', textColor: 'text-gray-600' }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className={clsx('card border-l-4', styles.borderColor)}>
      <div className="flex items-start gap-4">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', styles.bgColor)}>
          <span className={clsx('font-bold', styles.textColor)}>
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium leading-relaxed">{item.text}</p>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="badge badge-info">
              {item.count} {item.count === 1 ? 'business' : 'businesses'}
            </span>
            <span className="text-xs text-gray-400">
              {Array.from(item.categories).slice(0, 3).join(', ')}
              {item.categories.size > 3 && ` +${item.categories.size - 3} more`}
            </span>
          </div>

          {/* Expandable business list */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-cgcc-gold hover:text-cgcc-navy font-medium flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'Show'} affected businesses
            <ChevronDown size={14} className={clsx('transition-transform', expanded && 'rotate-180')} />
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-fade-in">
              {item.businesses.slice(0, 5).map((business, i) => (
                <Link
                  key={i}
                  to={`/businesses/${business.id}`}
                  className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm text-gray-600 group-hover:text-cgcc-navy truncate">
                    {business.business_name}
                  </span>
                  <ExternalLink size={14} className="text-gray-400 group-hover:text-cgcc-gold flex-shrink-0" />
                </Link>
              ))}
              {item.businesses.length > 5 && (
                <p className="text-xs text-gray-400 pl-2">
                  +{item.businesses.length - 5} more businesses
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
