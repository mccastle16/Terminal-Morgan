import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Zap, CheckCircle, AlertTriangle, TrendingUp, Star, Globe, Users,
  Target, Lightbulb, Building2, ArrowRight,
} from 'lucide-react'

export default function ActionPlanPage() {
  const { rawBusinesses } = useTerminalData()
  const navigate = useNavigate()
  const [completedActions, setCompletedActions] = useState(() => {
    const saved = localStorage.getItem('terminal_completed_actions')
    return saved ? JSON.parse(saved) : []
  })

  const selectedBusinessId = localStorage.getItem('terminal_my_business')
  const myBusiness = rawBusinesses.find(b => b._id === selectedBusinessId)

  const actionPlan = useMemo(() => {
    if (!myBusiness) return []
    const actions = []

    if (myBusiness._rating < 4.0) {
      actions.push({
        id: 'improve_rating', priority: 'high', category: 'Customer Experience',
        title: 'Improve Customer Reviews',
        description: `Your rating of ${myBusiness._rating.toFixed(1)} is below the 4.0 threshold. Focus on addressing common pain points.`,
        impact: 'High impact on customer acquisition', icon: Star,
        steps: ['Review your top pain points below', 'Create an action plan for each issue', 'Train staff on identified areas', 'Follow up with recent customers'],
      })
    }

    if (myBusiness.top_pain_points) {
      myBusiness.top_pain_points.split(';').slice(0, 3).forEach((pain, i) => {
        actions.push({
          id: `pain_${i}`, priority: i === 0 ? 'high' : 'medium', category: 'Pain Point Resolution',
          title: `Address: ${pain.trim().substring(0, 50)}...`,
          description: 'This is one of your top customer pain points. Resolving it could significantly improve satisfaction.',
          impact: 'Direct impact on customer satisfaction', icon: AlertTriangle,
          steps: ['Identify root cause', 'Develop solution or mitigation', 'Implement changes', 'Monitor feedback'],
        })
      })
    }

    if (myBusiness._confidence < 0.8) {
      actions.push({
        id: 'improve_presence', priority: 'medium', category: 'Online Presence',
        title: 'Strengthen Your Online Presence',
        description: `Your data confidence is ${(myBusiness._confidence * 100).toFixed(0)}%. Improving your online presence will increase visibility.`,
        impact: 'Improves discoverability and credibility', icon: Globe,
        steps: ['Update Google Business Profile', 'Ensure consistent NAP (Name, Address, Phone)', 'Add photos and business hours', 'Respond to online reviews'],
      })
    }

    if (myBusiness._hasRedFlag) {
      actions.push({
        id: 'address_red_flag', priority: 'urgent', category: 'Risk Mitigation',
        title: 'Address Risk Alert',
        description: `Your business has been flagged with a risk alert: ${myBusiness.red_flag_category || 'Review needed'}.`,
        impact: 'Critical for business health', icon: AlertTriangle,
        steps: ['Review the specific risk details', 'Consult with relevant professionals', 'Create remediation plan', 'Document resolution steps'],
      })
    }

    if (!myBusiness.isChamberMember) {
      actions.push({
        id: 'join_chamber', priority: 'medium', category: 'Growth Opportunity',
        title: 'Join the Chamber of Commerce',
        description: 'Chamber members receive increased visibility, networking opportunities, and customer trust.',
        impact: 'Increases credibility and referrals', icon: Users,
        steps: ['Visit coralgableschamber.org', 'Review membership benefits', 'Complete application', 'Attend networking events'],
      })
    }

    if (myBusiness.pkp_primary_actions) {
      myBusiness.pkp_primary_actions.split(';').slice(0, 2).forEach((action, i) => {
        actions.push({
          id: `pkp_${i}`, priority: 'low', category: 'Strategic Action',
          title: action.trim().substring(0, 60),
          description: 'Recommended strategic action based on market analysis.',
          impact: 'Long-term competitive advantage', icon: Target,
          steps: ['Evaluate feasibility', 'Allocate resources', 'Set timeline and milestones', 'Execute and measure results'],
        })
      })
    }

    if (actions.length === 0) {
      actions.push({
        id: 'maintain_excellence', priority: 'low', category: 'Maintenance',
        title: 'Maintain Your Excellence',
        description: 'Your business is performing well! Focus on maintaining quality and exploring growth opportunities.',
        impact: 'Sustains competitive position', icon: TrendingUp,
        steps: ['Continue monitoring customer feedback', 'Stay engaged with the Chamber community', 'Explore new market opportunities', 'Invest in team development'],
      })
    }

    return actions.sort((a, b) => {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 }
      return order[a.priority] - order[b.priority]
    })
  }, [myBusiness])

  const toggleAction = (actionId) => {
    setCompletedActions(prev => {
      const next = prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
      localStorage.setItem('terminal_completed_actions', JSON.stringify(next))
      return next
    })
  }

  const progress = actionPlan.length > 0
    ? Math.round((completedActions.filter(id => actionPlan.some(a => a.id === id)).length / actionPlan.length) * 100) : 0

  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Select Your Business First</h1>
        <p className="text-slate-400 mb-6">You need to claim a business to see your personalized action plan.</p>
        <button onClick={() => navigate('/my-business')}
          className="px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-xl hover:bg-amber-400 transition-colors">
          Claim Your Business
        </button>
      </div>
    )
  }

  const priorityColors = { urgent: 'bg-red-500', high: 'bg-red-400', medium: 'bg-amber-500', low: 'bg-emerald-500' }
  const priorityLabels = { urgent: 'Urgent', high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Plan</h1>
          <p className="text-slate-400">Personalized recommendations for {myBusiness.business_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">Progress</p>
            <p className="text-2xl font-bold text-white">{progress}%</p>
          </div>
          <div className="w-32 h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Actions', value: actionPlan.length, color: 'text-white' },
          { label: 'Completed', value: completedActions.filter(id => actionPlan.some(a => a.id === id)).length, color: 'text-emerald-400' },
          { label: 'High Priority', value: actionPlan.filter(a => a.priority === 'high' || a.priority === 'urgent').length, color: 'text-red-400' },
          { label: 'In Progress', value: actionPlan.length - completedActions.filter(id => actionPlan.some(a => a.id === id)).length, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {actionPlan.map((action) => {
          const isCompleted = completedActions.includes(action.id)
          const Icon = action.icon
          return (
            <div key={action.id}
              className={`bg-slate-800/60 rounded-xl border transition-all ${
                isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/50 hover:border-amber-500/30'
              }`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleAction(action.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-amber-500'
                    }`}>
                    {isCompleted && <CheckCircle size={16} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${priorityColors[action.priority]}`}>
                        {priorityLabels[action.priority]}
                      </span>
                      <span className="text-xs text-slate-500">{action.category}</span>
                    </div>
                    <h3 className={`font-semibold mb-2 ${isCompleted ? 'text-slate-600 line-through' : 'text-white'}`}>{action.title}</h3>
                    <p className={`text-sm mb-3 ${isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>{action.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <TrendingUp size={12} /> <span>{action.impact}</span>
                    </div>
                    {!isCompleted && (
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">Steps to complete:</p>
                        <div className="space-y-1">
                          {action.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="w-5 h-5 rounded-full bg-slate-700/50 text-slate-400 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-500/20' : 'bg-slate-700/50'
                  }`}>
                    <Icon size={20} className={isCompleted ? 'text-emerald-400' : 'text-slate-400'} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
            <Lightbulb size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-white">Need help with your action plan?</h3>
            <p className="text-slate-400 text-sm">The Chamber offers resources and connections to help you execute these recommendations.</p>
          </div>
          <button onClick={() => navigate('/ecosystem')}
            className="px-5 py-2.5 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-2">
            Find Help <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
