import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Zap, CheckCircle, AlertTriangle, TrendingUp, Star, Globe, Users,
  Target, Lightbulb, Building2, ArrowRight, ListChecks, Flame, Clock,
} from 'lucide-react'

/* ── Progress Ring ── */
function ProgressRing({ percent, size = 64, strokeWidth = 5 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-800" />
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#progressGrad)" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white font-mono">{percent}%</span>
      </div>
    </div>
  )
}

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

  const completedCount = completedActions.filter(id => actionPlan.some(a => a.id === id)).length
  const progress = actionPlan.length > 0
    ? Math.round((completedCount / actionPlan.length) * 100) : 0

  if (!myBusiness) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Building2 size={36} className="text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Select Your Business First</h1>
        <p className="text-slate-400 mb-6 text-sm">You need to claim a business to see your personalized action plan.</p>
        <button onClick={() => navigate('/my-business')}
          className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors">
          Claim Your Business
        </button>
      </div>
    )
  }

  const priorityColors = {
    urgent: 'bg-red-500/15 text-red-400 border-red-500/25',
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }
  const priorityBorderColors = {
    urgent: 'border-l-red-500',
    high: 'border-l-red-400',
    medium: 'border-l-amber-500',
    low: 'border-l-emerald-500',
  }
  const priorityLabels = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }

  const statCards = [
    { label: 'Total Actions', value: actionPlan.length, icon: ListChecks, iconColor: 'text-slate-400', iconBg: 'bg-slate-500/10 border-slate-500/20' },
    { label: 'Completed', value: completedCount, icon: CheckCircle, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'High Priority', value: actionPlan.filter(a => a.priority === 'high' || a.priority === 'urgent').length, icon: Flame, iconColor: 'text-red-400', iconBg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Remaining', value: actionPlan.length - completedCount, icon: Clock, iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10 border-amber-500/20' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ HERO HEADER ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Action Plan</h1>
                <p className="text-slate-400 text-sm">Personalized recommendations for {myBusiness.business_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 bg-slate-900/60 rounded-xl border border-slate-800/40 px-5 py-3">
              <ProgressRing percent={progress} size={56} strokeWidth={4} />
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Progress</p>
                <p className="text-sm text-slate-300"><span className="font-bold text-white">{completedCount}</span> of {actionPlan.length} completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, iconColor, iconBg }) => (
          <div key={label} className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/60 hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${iconBg}`}>
                <Icon size={13} className={iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* ═══ ACTION ITEMS ═══ */}
      <div className="space-y-3">
        {actionPlan.map((action) => {
          const isCompleted = completedActions.includes(action.id)
          const Icon = action.icon
          return (
            <div key={action.id}
              className={`relative bg-slate-900/40 rounded-xl border-l-[3px] border transition-all overflow-hidden ${
                isCompleted
                  ? 'border-emerald-500/30 border-l-emerald-500 bg-emerald-500/[0.03]'
                  : `border-slate-800/60 ${priorityBorderColors[action.priority]} hover:border-slate-700/80`
              }`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleAction(action.id)}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-700 hover:border-amber-500/50 bg-transparent'
                    }`}>
                    {isCompleted && <CheckCircle size={14} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${priorityColors[action.priority]}`}>
                        {priorityLabels[action.priority]}
                      </span>
                      <span className="text-[11px] text-slate-600">{action.category}</span>
                    </div>
                    <h3 className={`font-semibold mb-1.5 ${isCompleted ? 'text-slate-600 line-through' : 'text-white'}`}>{action.title}</h3>
                    <p className={`text-sm mb-3 leading-relaxed ${isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>{action.description}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <TrendingUp size={11} className="text-emerald-500/60" /> <span>{action.impact}</span>
                    </div>
                    {!isCompleted && (
                      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/40">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Steps to complete</p>
                        <div className="space-y-2">
                          {action.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-slate-400">
                              <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700/50 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/60 border-slate-700/40'
                  }`}>
                    <Icon size={16} className={isCompleted ? 'text-emerald-400' : 'text-slate-500'} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ BOTTOM CTA ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 rounded-2xl overflow-hidden border border-slate-800/60">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
            <Lightbulb size={20} className="text-amber-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-white">Need help with your action plan?</h3>
            <p className="text-slate-400 text-sm">The Chamber offers resources and connections to help you execute these recommendations.</p>
          </div>
          <button onClick={() => navigate('/ecosystem')}
            className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-2 text-sm flex-shrink-0">
            Find Help <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
