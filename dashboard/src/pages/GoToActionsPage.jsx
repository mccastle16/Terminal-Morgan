import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Zap,
  AlertTriangle,
  TrendingUp,
  Star,
  Globe,
  Shield,
  Target,
  Wrench,
  Database,
  ChevronRight,
  ChevronDown,
  Clock,
  DollarSign,
  BarChart3,
  Filter,
  Search,
  Building2,
  Users,
  CheckCircle,
  Circle,
  ArrowUpRight,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  reputation: { label: 'Reputation', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  visibility: { label: 'Visibility', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  risk: { label: 'Risk', icon: Shield, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  growth: { label: 'Growth', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  operations: { label: 'Operations', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  data_quality: { label: 'Data Quality', icon: Database, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-200' },
  high: { label: 'High', color: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-500', text: 'text-yellow-700', ring: 'ring-yellow-200' },
  low: { label: 'Low', color: 'bg-green-500', text: 'text-green-700', ring: 'ring-green-200' },
}

export default function GoToActionsPage() {
  const { businesses } = useData()
  const navigate = useNavigate()
  const [playbook, setPlaybook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [expandedBusiness, setExpandedBusiness] = useState(null)
  const [expandedActions, setExpandedActions] = useState({})

  // Completed actions (persisted in localStorage)
  const [completedActions, setCompletedActions] = useState(() => {
    const saved = localStorage.getItem('cgcc_goto_completed')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('cgcc_goto_completed', JSON.stringify(completedActions))
  }, [completedActions])

  // Load playbook JSON
  useEffect(() => {
    async function loadPlaybook() {
      try {
        const response = await fetch('/data/action_playbook.json')
        if (!response.ok) {
          setPlaybook(null)
          setLoading(false)
          return
        }
        const data = await response.json()
        setPlaybook(data)
      } catch (err) {
        console.error('Error loading action playbook:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadPlaybook()
  }, [])

  // Filter playbook entries
  const filteredPlaybook = useMemo(() => {
    if (!playbook?.playbook) return []

    let entries = [...playbook.playbook]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      entries = entries.filter(e =>
        e.business_name?.toLowerCase().includes(q) ||
        e.category_primary?.toLowerCase().includes(q) ||
        e.neighborhood_area?.toLowerCase().includes(q) ||
        e.top_action?.toLowerCase().includes(q)
      )
    }

    if (selectedCategory) {
      entries = entries.filter(e =>
        e.actions?.some(a => a.category === selectedCategory)
      )
    }

    if (selectedPriority) {
      entries = entries.filter(e =>
        e.actions?.some(a => a.priority === selectedPriority)
      )
    }

    return entries
  }, [playbook, searchQuery, selectedCategory, selectedPriority])

  // Stats from playbook
  const playbookStats = useMemo(() => {
    if (!playbook?.stats) return null
    return playbook.stats
  }, [playbook])

  const toggleAction = (businessId, actionIdx) => {
    const key = `${businessId}_${actionIdx}`
    setCompletedActions(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key)
      }
      return [...prev, key]
    })
  }

  const toggleExpand = (businessId) => {
    setExpandedBusiness(prev => prev === businessId ? null : businessId)
  }

  const toggleActionExpand = (key) => {
    setExpandedActions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cgcc-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading action playbook...</p>
        </div>
      </div>
    )
  }

  if (!playbook || !playbook.playbook?.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-cgcc-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap size={32} className="text-cgcc-gold" />
        </div>
        <h1 className="text-2xl font-display font-bold text-cgcc-navy mb-2">
          No Action Playbook Generated Yet
        </h1>
        <p className="text-gray-600 mb-4">
          Run Agent 4 to generate contextual actions for every business:
        </p>
        <code className="block bg-gray-100 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
          python "scripts/4. agent4-actions.py" \<br />
          &nbsp;&nbsp;--master data/master_all_businesses.csv
        </code>
        <p className="text-gray-500 text-sm mt-4">
          Or via the orchestrator: <code className="bg-gray-100 px-2 py-1 rounded">python "scripts/0. orchestrator.py" --actions</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cgcc-navy flex items-center gap-2">
            <Zap className="text-cgcc-gold" size={28} />
            Go-To Actions
          </h1>
          <p className="text-gray-600 mt-1">
            Specific, actionable playbooks generated from business analytics — powered by Agent 4
          </p>
        </div>
        {playbookStats && (
          <div className="text-sm text-gray-500">
            Generated: {new Date(playbook.generated_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {playbookStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Businesses Analyzed</p>
            <p className="text-2xl font-bold text-cgcc-navy">{playbookStats.businesses_with_actions?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Actions</p>
            <p className="text-2xl font-bold text-cgcc-gold">{playbookStats.total_actions?.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-sm text-gray-500">Urgent</p>
            <p className="text-2xl font-bold text-red-600">{playbookStats.by_priority?.urgent || 0}</p>
          </div>
          <div className={`bg-white rounded-xl border p-4 ${playbookStats.llm_powered ? 'border-purple-200' : 'border-orange-200'}`}>
            <p className="text-sm text-gray-500">{playbookStats.llm_powered ? 'AI Engine' : 'High Priority'}</p>
            <p className={`text-2xl font-bold ${playbookStats.llm_powered ? 'text-purple-600' : 'text-orange-600'}`}>
              {playbookStats.llm_powered ? (playbookStats.llm_model || 'GPT') : (playbookStats.by_priority?.high || 0)}
            </p>
            {playbookStats.llm_powered && (
              <p className="text-xs text-gray-400 mt-1">{playbookStats.llm_calls} calls &middot; {(playbookStats.llm_tokens_out || 0).toLocaleString()} tokens</p>
            )}
          </div>
        </div>
      )}

      {/* Category breakdown bar */}
      {playbookStats?.by_category && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Actions by Category</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(playbookStats.by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.data_quality
                const Icon = config.icon
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(prev => prev === cat ? '' : cat)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-all ${
                      selectedCategory === cat
                        ? `${config.bg} ${config.border} ${config.color} font-semibold`
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{config.label}</span>
                    <span className="font-bold">{count}</span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search businesses, categories, neighborhoods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20 transition-all"
          />
        </div>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredPlaybook.length} of {playbook.playbook.length} businesses
        {completedActions.length > 0 && (
          <span className="ml-2 text-green-600">
            • {completedActions.length} actions completed
          </span>
        )}
      </p>

      {/* Business Action Cards */}
      <div className="space-y-3">
        {filteredPlaybook.slice(0, 50).map((entry) => {
          const isExpanded = expandedBusiness === entry.business_id
          const businessCompleted = entry.actions?.filter((_, i) =>
            completedActions.includes(`${entry.business_id}_${i}`)
          ).length || 0
          const progressPercent = entry.action_count > 0
            ? Math.round((businessCompleted / entry.action_count) * 100)
            : 0

          return (
            <div
              key={entry.business_id}
              className={`bg-white rounded-xl border transition-all duration-200 ${
                isExpanded ? 'border-cgcc-gold shadow-lg' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Business Header */}
              <button
                onClick={() => toggleExpand(entry.business_id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                {/* Priority indicator */}
                <div className="flex-shrink-0">
                  <div
                    className="w-3 h-12 rounded-full"
                    style={{
                      background: entry.priority_score >= 0.7
                        ? '#ef4444'
                        : entry.priority_score >= 0.5
                        ? '#f97316'
                        : entry.priority_score >= 0.3
                        ? '#eab308'
                        : '#22c55e',
                    }}
                  />
                </div>

                {/* Business info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-cgcc-navy truncate">
                      {entry.business_name}
                    </h3>
                    {entry.chamber_member && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-cgcc-gold/10 text-cgcc-gold text-xs font-medium rounded-full">
                        CGCC
                      </span>
                    )}
                    {entry.action_source === 'llm' && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{entry.category_primary?.replace(/_/g, ' ')}</span>
                    {entry.neighborhood_area && (
                      <>
                        <span>•</span>
                        <span>{entry.neighborhood_area}</span>
                      </>
                    )}
                    {entry.rating > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-600">{entry.rating.toFixed(1)} ★</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions count + progress */}
                <div className="flex-shrink-0 flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-cgcc-navy">{entry.action_count} actions</p>
                    {businessCompleted > 0 && (
                      <p className="text-xs text-green-600">{progressPercent}% done</p>
                    )}
                  </div>
                  {/* Progress ring */}
                  {entry.action_count > 0 && (
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="#c9a227"
                          strokeWidth="3"
                          strokeDasharray={`${progressPercent * 0.942} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-cgcc-navy">
                        {progressPercent}
                      </span>
                    </div>
                  )}
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Expanded: Action list */}
              {isExpanded && entry.actions && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="space-y-3 mt-4">
                    {entry.actions.map((action, actionIdx) => {
                      const catConfig = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.data_quality
                      const prioConfig = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium
                      const CatIcon = catConfig.icon
                      const actionKey = `${entry.business_id}_${actionIdx}`
                      const isCompleted = completedActions.includes(actionKey)
                      const isActionExpanded = expandedActions[actionKey]

                      return (
                        <div
                          key={actionIdx}
                          className={`rounded-lg border transition-all ${
                            isCompleted
                              ? 'bg-green-50/50 border-green-200 opacity-75'
                              : `${catConfig.bg} ${catConfig.border}`
                          }`}
                        >
                          {/* Action header */}
                          <div className="flex items-start gap-3 p-3">
                            <button
                              onClick={() => toggleAction(entry.business_id, actionIdx)}
                              className="flex-shrink-0 mt-0.5"
                            >
                              {isCompleted ? (
                                <CheckCircle size={20} className="text-green-500" />
                              ) : (
                                <Circle size={20} className="text-gray-300 hover:text-cgcc-gold transition-colors" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CatIcon size={14} className={catConfig.color} />
                                <span className={`text-xs font-medium ${catConfig.color}`}>
                                  {catConfig.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${prioConfig.color}`}>
                                  {prioConfig.label}
                                </span>
                              </div>
                              <h4 className={`font-medium mt-1 ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                {action.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{action.description}</p>

                              {/* Meta row */}
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                                {action.timeframe && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {action.timeframe}
                                  </span>
                                )}
                                {action.cost_estimate && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign size={12} />
                                    {action.cost_estimate}
                                  </span>
                                )}
                                {action.expected_impact && (
                                  <span className="flex items-center gap-1">
                                    <ArrowUpRight size={12} />
                                    {action.expected_impact}
                                  </span>
                                )}
                              </div>

                              {/* Expandable steps */}
                              {action.steps?.length > 0 && (
                                <button
                                  onClick={() => toggleActionExpand(actionKey)}
                                  className="flex items-center gap-1 mt-2 text-xs font-medium text-cgcc-navy hover:text-cgcc-gold transition-colors"
                                >
                                  <ChevronRight
                                    size={14}
                                    className={`transition-transform ${isActionExpanded ? 'rotate-90' : ''}`}
                                  />
                                  {isActionExpanded ? 'Hide steps' : `Show ${action.steps.length} steps`}
                                </button>
                              )}

                              {isActionExpanded && action.steps && (
                                <ol className="mt-2 ml-1 space-y-1.5">
                                  {action.steps.map((step, stepIdx) => (
                                    <li key={stepIdx} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cgcc-navy/10 text-cgcc-navy text-xs font-bold flex items-center justify-center mt-0.5">
                                        {stepIdx + 1}
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredPlaybook.length > 50 && (
        <p className="text-center text-sm text-gray-500 py-4">
          Showing top 50 of {filteredPlaybook.length} businesses. Use search/filters to narrow down.
        </p>
      )}
    </div>
  )
}
