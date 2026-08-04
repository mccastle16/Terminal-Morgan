import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  Rocket, ChevronRight, ChevronLeft, Search, BarChart3,
  Users, ShieldCheck, Target, MapPin, Download,
  CheckCircle2, Sparkles, ArrowRight, Network,
} from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome to the Terminal',
    desc: 'Your real-time business intelligence dashboard for the Coral Gables Commerce ecosystem.',
    icon: Rocket,
    color: 'amber',
    tips: [
      'The Terminal tracks 2,800+ businesses with OSINT-enriched profiles',
      'Data is refreshed weekly from multiple corroborated sources',
      'Your access level determines which features are available',
    ],
  },
  {
    title: 'Browse & Explore',
    desc: 'Discover businesses through the directory and detailed profile explorer.',
    icon: Search,
    color: 'blue',
    route: '/browse',
    tips: [
      'Use Browse to filter businesses by category, neighborhood, or rating',
      'Click any business to see its full Explorer profile',
      'Bookmark businesses for quick access later',
    ],
  },
  {
    title: 'Market Analytics',
    desc: 'Understand market dynamics, penetration rates, and competitive landscape.',
    icon: BarChart3,
    color: 'emerald',
    route: '/home',
    tips: [
      'The Dashboard shows key metrics at a glance',
      'Penetration View reveals membership gaps by category',
      'HHI and concentration metrics track market health',
    ],
  },
  {
    title: 'Risk & Trust',
    desc: 'Monitor data quality, risk flags, and trust indicators across the ecosystem.',
    icon: ShieldCheck,
    color: 'red',
    route: '/alerts',
    tips: [
      'Every business has a confidence score and validation tier',
      'Red flags are automatically detected from OSINT data',
      'The Alerts page surfaces critical issues requiring attention',
    ],
  },
  {
    title: 'Recruit Pipeline',
    desc: 'Identify and prioritize non-member businesses for outreach.',
    icon: Target,
    color: 'purple',
    route: '/recruit',
    tips: [
      'Each non-member is scored 0-100 based on recruit potential',
      'Score factors: rating, review count, website presence, category fit',
      'Use recruit bands (Hot, Warm, Cool, Cold) to prioritize outreach',
    ],
  },
  {
    title: 'Geography & Maps',
    desc: 'Visualize business distribution and neighborhood penetration.',
    icon: MapPin,
    color: 'orange',
    route: '/map',
    tips: [
      'The interactive map shows all geo-coded businesses',
      'Color coding reveals membership status at a glance',
      'Neighborhood sidebar shows penetration by area',
    ],
  },
  {
    title: 'Export & Report',
    desc: 'Download data and generate reports for board presentations.',
    icon: Download,
    color: 'cyan',
    route: '/exports',
    tips: [
      'Pre-built report presets cover common use cases',
      'Custom exports let you filter and select specific fields',
      'Board Summary generates an executive overview',
    ],
  },
  {
    title: 'You\'re Ready!',
    desc: 'You now know the key features. Dive in and explore the Terminal.',
    icon: Sparkles,
    color: 'amber',
    route: '/home',
    tips: [
      'Save filter combinations for quick access',
      'Use the Network Graph to explore business relationships',
      'Submit data corrections if you spot inaccuracies',
    ],
  },
]

const PALETTES = {
  amber:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', fill: 'bg-amber-500' },
  blue:    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', fill: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', fill: 'bg-emerald-500' },
  red:     { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', fill: 'bg-red-500' },
  purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', fill: 'bg-purple-500' },
  orange:  { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', fill: 'bg-orange-500' },
  cyan:    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', fill: 'bg-cyan-500' },
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useTerminalAuth()
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('terminal_onboarding_complete') === 'true'
  )

  const current = STEPS[step]
  const pal = PALETTES[current.color] || PALETTES.amber
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  const handleFinish = () => {
    localStorage.setItem('terminal_onboarding_complete', 'true')
    setDismissed(true)
    navigate(current.route || '/home')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* ═══ PROGRESS ═══ */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? pal.fill : 'bg-slate-800'}`} />
        ))}
      </div>
      <p className="text-[10px] text-slate-600 text-right">Step {step + 1} of {STEPS.length}</p>

      {/* ═══ STEP CARD ═══ */}
      <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${pal.fill}`} />
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl ${pal.bg} border ${pal.border} flex items-center justify-center mx-auto mb-5`}>
            <Icon size={28} className={pal.text} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{current.title}</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{current.desc}</p>
          {user && step === 0 && (
            <p className="text-xs text-slate-500 mt-3">
              Logged in as <span className="text-amber-400 font-semibold">{user.name}</span> · <span className="capitalize">{user.role}</span> access
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="px-8 pb-8">
          <div className="space-y-2.5">
            {current.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/40">
                <CheckCircle2 size={14} className={`${pal.text} mt-0.5 shrink-0`} />
                <span className="text-xs text-slate-300 leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800/60 hover:border-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={14} /> Previous
        </button>

        <button onClick={() => navigate('/home')}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
          Skip tour
        </button>

        {isLast ? (
          <button onClick={handleFinish}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold ${pal.fill} text-black hover:opacity-90 transition-all`}>
            Get Started <Rocket size={14} />
          </button>
        ) : (
          <button onClick={() => setStep(step + 1)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold border ${pal.border} ${pal.text} ${pal.bg} hover:opacity-90 transition-all`}>
            Next <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
