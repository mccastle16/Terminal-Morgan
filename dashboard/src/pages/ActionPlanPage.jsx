import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Zap,
  CheckCircle,
  Circle,
  AlertTriangle,
  TrendingUp,
  Star,
  MessageSquare,
  Globe,
  Users,
  Target,
  Clock,
  ArrowRight,
  Lightbulb,
  Building2,
} from 'lucide-react'

export default function ActionPlanPage() {
  const { businesses } = useData()
  const navigate = useNavigate()
  const [completedActions, setCompletedActions] = useState(() => {
    const saved = localStorage.getItem('cgcc_completed_actions')
    return saved ? JSON.parse(saved) : []
  })

  // Get selected business
  const selectedBusinessId = localStorage.getItem('cgcc_my_business')
  const myBusiness = businesses.find(b => b.id === selectedBusinessId)

  // Generate action plan based on business data
  const actionPlan = useMemo(() => {
    if (!myBusiness) return []

    const actions = []

    // Rating-based actions
    if (myBusiness.rating < 4.0) {
      actions.push({
        id: 'improve_rating',
        priority: 'high',
        category: 'Customer Experience',
        title: 'Improve Customer Reviews',
        description: `Your rating of ${myBusiness.rating.toFixed(1)} is below the 4.0 threshold. Focus on addressing common pain points to boost your rating.`,
        impact: 'High impact on customer acquisition',
        icon: Star,
        steps: [
          'Review your top pain points below',
          'Create an action plan for each issue',
          'Train staff on identified areas',
          'Follow up with recent customers',
        ],
      })
    }

    // Pain point-based actions
    if (myBusiness.top_pain_points) {
      const painPoints = myBusiness.top_pain_points.split(';').slice(0, 3)
      painPoints.forEach((pain, i) => {
        actions.push({
          id: `pain_${i}`,
          priority: i === 0 ? 'high' : 'medium',
          category: 'Pain Point Resolution',
          title: `Address: ${pain.trim().substring(0, 50)}...`,
          description: `This is one of your top customer pain points. Resolving it could significantly improve satisfaction.`,
          impact: 'Direct impact on customer satisfaction',
          icon: AlertTriangle,
          steps: [
            'Identify root cause',
            'Develop solution or mitigation',
            'Implement changes',
            'Monitor feedback',
          ],
        })
      })
    }

    // Confidence-based actions
    if (myBusiness.osintConfidence < 0.8) {
      actions.push({
        id: 'improve_presence',
        priority: 'medium',
        category: 'Online Presence',
        title: 'Strengthen Your Online Presence',
        description: `Your data confidence is ${(myBusiness.osintConfidence * 100).toFixed(0)}%. Improving your online presence will increase visibility and trust.`,
        impact: 'Improves discoverability and credibility',
        icon: Globe,
        steps: [
          'Update Google Business Profile',
          'Ensure consistent NAP (Name, Address, Phone)',
          'Add photos and business hours',
          'Respond to online reviews',
        ],
      })
    }

    // Red flag actions
    if (myBusiness.hasRedFlag) {
      actions.push({
        id: 'address_red_flag',
        priority: 'urgent',
        category: 'Risk Mitigation',
        title: 'Address Risk Alert',
        description: `Your business has been flagged with a risk alert: ${myBusiness.red_flag_category || 'Review needed'}. This should be your top priority.`,
        impact: 'Critical for business health',
        icon: AlertTriangle,
        steps: [
          'Review the specific risk details',
          'Consult with relevant professionals',
          'Create remediation plan',
          'Document resolution steps',
        ],
      })
    }

    // Chamber membership opportunity
    if (!myBusiness.isChamberMember) {
      actions.push({
        id: 'join_chamber',
        priority: 'medium',
        category: 'Growth Opportunity',
        title: 'Join the Chamber of Commerce',
        description: 'Chamber members receive increased visibility, networking opportunities, and customer trust.',
        impact: 'Increases credibility and referrals',
        icon: Users,
        steps: [
          'Visit coralgableschamber.org',
          'Review membership benefits',
          'Complete application',
          'Attend networking events',
        ],
      })
    }

    // PKP-based actions
    if (myBusiness.pkp_primary_actions) {
      const pkpActions = myBusiness.pkp_primary_actions.split(';').slice(0, 2)
      pkpActions.forEach((action, i) => {
        actions.push({
          id: `pkp_${i}`,
          priority: 'low',
          category: 'Strategic Action',
          title: action.trim().substring(0, 60),
          description: 'Recommended strategic action based on market analysis.',
          impact: 'Long-term competitive advantage',
          icon: Target,
          steps: [
            'Evaluate feasibility',
            'Allocate resources',
            'Set timeline and milestones',
            'Execute and measure results',
          ],
        })
      })
    }

    // Default action if nothing else
    if (actions.length === 0) {
      actions.push({
        id: 'maintain_excellence',
        priority: 'low',
        category: 'Maintenance',
        title: 'Maintain Your Excellence',
        description: 'Your business is performing well! Focus on maintaining quality and exploring growth opportunities.',
        impact: 'Sustains competitive position',
        icon: TrendingUp,
        steps: [
          'Continue monitoring customer feedback',
          'Stay engaged with the Chamber community',
          'Explore new market opportunities',
          'Invest in team development',
        ],
      })
    }

    return actions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [myBusiness])

  // Toggle action completion
  const toggleAction = (actionId) => {
    setCompletedActions(prev => {
      const newCompleted = prev.includes(actionId)
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId]
      localStorage.setItem('cgcc_completed_actions', JSON.stringify(newCompleted))
      return newCompleted
    })
  }

  // Calculate progress
  const progress = actionPlan.length > 0
    ? Math.round((completedActions.filter(id => actionPlan.some(a => a.id === id)).length / actionPlan.length) * 100)
    : 0

  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-cgcc-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-cgcc-gold" />
        </div>
        <h1 className="text-2xl font-display font-bold text-cgcc-navy mb-2">
          Select Your Business First
        </h1>
        <p className="text-gray-600 mb-6">
          You need to claim a business to see your personalized action plan.
        </p>
        <button
          onClick={() => navigate('/my-business')}
          className="px-6 py-3 bg-cgcc-gold text-white font-semibold rounded-xl hover:bg-cgcc-gold/90 transition-colors"
        >
          Claim Your Business
        </button>
      </div>
    )
  }

  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-cgcc-coral',
    medium: 'bg-cgcc-gold',
    low: 'bg-cgcc-sage',
  }

  const priorityLabels = {
    urgent: 'Urgent',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cgcc-navy">Action Plan</h1>
          <p className="text-gray-600">
            Personalized recommendations for {myBusiness.business_name}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Progress</p>
            <p className="text-2xl font-bold text-cgcc-navy">{progress}%</p>
          </div>
          <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-cgcc-sage rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Actions</p>
          <p className="text-2xl font-bold text-cgcc-navy">{actionPlan.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-cgcc-sage">
            {completedActions.filter(id => actionPlan.some(a => a.id === id)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">High Priority</p>
          <p className="text-2xl font-bold text-cgcc-coral">
            {actionPlan.filter(a => a.priority === 'high' || a.priority === 'urgent').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-cgcc-gold">
            {actionPlan.length - completedActions.filter(id => actionPlan.some(a => a.id === id)).length}
          </p>
        </div>
      </div>

      {/* Action Items */}
      <div className="space-y-4">
        {actionPlan.map((action) => {
          const isCompleted = completedActions.includes(action.id)
          const Icon = action.icon

          return (
            <div
              key={action.id}
              className={`bg-white rounded-xl border transition-all ${
                isCompleted
                  ? 'border-cgcc-sage/30 bg-cgcc-sage/5'
                  : 'border-gray-200 hover:border-cgcc-gold/30 hover:shadow-md'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleAction(action.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-cgcc-sage border-cgcc-sage'
                        : 'border-gray-300 hover:border-cgcc-gold'
                    }`}
                  >
                    {isCompleted && <CheckCircle size={16} className="text-white" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${priorityColors[action.priority]}`}>
                        {priorityLabels[action.priority]}
                      </span>
                      <span className="text-xs text-gray-500">{action.category}</span>
                    </div>

                    <h3 className={`font-semibold mb-2 ${isCompleted ? 'text-gray-400 line-through' : 'text-cgcc-navy'}`}>
                      {action.title}
                    </h3>

                    <p className={`text-sm mb-3 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                      {action.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <TrendingUp size={12} />
                      <span>{action.impact}</span>
                    </div>

                    {/* Steps */}
                    {!isCompleted && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Steps to complete:</p>
                        <div className="space-y-1">
                          {action.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="w-5 h-5 rounded-full bg-cgcc-navy/10 text-cgcc-navy text-xs flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-cgcc-sage/20' : 'bg-cgcc-navy/10'
                  }`}>
                    <Icon size={20} className={isCompleted ? 'text-cgcc-sage' : 'text-cgcc-navy'} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Help CTA */}
      <div className="bg-gradient-to-r from-cgcc-navy to-cgcc-navy/90 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Lightbulb size={24} className="text-cgcc-gold" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Need help with your action plan?</h3>
            <p className="text-white/70 text-sm">
              The Chamber offers resources and connections to help you execute these recommendations.
            </p>
          </div>
          <button
            onClick={() => navigate('/my-business/ecosystem')}
            className="px-5 py-2.5 bg-cgcc-gold text-cgcc-navy font-semibold rounded-lg hover:bg-cgcc-gold/90 transition-colors flex items-center gap-2"
          >
            Find Help <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
