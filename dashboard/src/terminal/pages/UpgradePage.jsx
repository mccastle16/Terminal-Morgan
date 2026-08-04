import { useTerminalAuth } from '../context/TerminalAuthContext'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Lock, Crown, BarChart3, Users, Target, FileText,
  MapPin, ShieldCheck, Bell, Star, ArrowRight, Sparkles,
  CheckCircle2, Eye, Download, Network,
} from 'lucide-react'

const TIERS = [
  {
    name: 'Guest Preview',
    role: 'teaser',
    price: 'Free',
    color: 'slate',
    features: [
      { label: 'Browse directory (limited)', included: true },
      { label: 'View public profiles', included: true },
      { label: 'Risk flags & alerts', included: false },
      { label: 'Export data', included: false },
      { label: 'Recruit pipeline', included: false },
      { label: 'Market analytics', included: false },
      { label: 'Actions & playbooks', included: false },
    ],
  },
  {
    name: 'Member',
    role: 'member',
    price: 'Included with membership',
    color: 'amber',
    popular: true,
    features: [
      { label: 'Browse full directory', included: true },
      { label: 'View all profiles', included: true },
      { label: 'Risk flags & alerts', included: true },
      { label: 'Export own data', included: true },
      { label: 'Recruit pipeline', included: false },
      { label: 'Market analytics (basic)', included: true },
      { label: 'Actions & playbooks', included: false },
    ],
  },
  {
    name: 'Leadership',
    role: 'leadership',
    price: 'Board access',
    color: 'emerald',
    features: [
      { label: 'Browse full directory', included: true },
      { label: 'View all profiles', included: true },
      { label: 'Risk flags & alerts', included: true },
      { label: 'Export all data', included: true },
      { label: 'Recruit pipeline', included: true },
      { label: 'Full market analytics', included: true },
      { label: 'Actions & playbooks', included: true },
    ],
  },
]

const VALUE_PROPS = [
  { icon: Eye, title: 'Full Directory Access', desc: 'Browse all 2,800+ businesses with rich profiles', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: BarChart3, title: 'Market Analytics', desc: 'Penetration rates, HHI, category health & more', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: ShieldCheck, title: 'Risk Intelligence', desc: 'Real-time risk flags and data quality alerts', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { icon: Target, title: 'Recruit Pipeline', desc: 'Score and prioritize non-member outreach', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: Download, title: 'Reports & Exports', desc: 'Download CSV/PDF reports for board presentations', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { icon: Network, title: 'Network Graph', desc: 'Explore business relationships and clusters', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
]

export default function UpgradePage() {
  const { user, role } = useTerminalAuth()
  const { stats } = useTerminalData()

  const palette = {
    slate: { border: 'border-slate-700', headerBg: 'bg-slate-800/60', accent: 'text-slate-400', btn: 'bg-slate-700 hover:bg-slate-600 text-slate-300' },
    amber: { border: 'border-amber-500/30', headerBg: 'bg-amber-500/[0.06]', accent: 'text-amber-400', btn: 'bg-amber-500 hover:bg-amber-600 text-black font-bold' },
    emerald: { border: 'border-emerald-500/25', headerBg: 'bg-emerald-500/[0.06]', accent: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' },
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* ═══ HERO ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden text-center p-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
          <Crown size={24} className="text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Unlock the Full Terminal</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
          You're currently on the <span className="text-amber-400 font-semibold capitalize">{user?.role || 'guest'}</span> tier.
          Upgrade your access to unlock powerful intelligence tools for the Coral Gables business ecosystem.
        </p>
        {stats && (
          <div className="flex items-center justify-center gap-6 mt-5">
            <span className="text-xs text-slate-500"><strong className="text-white font-mono">{stats.total}</strong> businesses tracked</span>
            <span className="text-xs text-slate-500"><strong className="text-white font-mono">{stats.categories?.length}</strong> categories</span>
            <span className="text-xs text-slate-500"><strong className="text-white font-mono">{stats.neighborhoods?.length}</strong> neighborhoods</span>
          </div>
        )}
      </div>

      {/* ═══ TIER CARDS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map(tier => {
          const p = palette[tier.color]
          const isCurrent = user?.role === tier.role
          return (
            <div key={tier.name}
              className={`relative bg-slate-900/40 rounded-xl border ${p.border} overflow-hidden transition-all ${tier.popular ? 'ring-1 ring-amber-500/20' : ''}`}>
              {tier.popular && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
              )}
              <div className={`p-5 ${p.headerBg}`}>
                {tier.popular && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                    <Sparkles size={10} /> Most Popular
                  </span>
                )}
                <h3 className={`text-lg font-bold ${p.accent}`}>{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{tier.price}</p>
              </div>
              <div className="p-5 space-y-3">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {f.included ? (
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Lock size={13} className="text-slate-700 shrink-0" />
                    )}
                    <span className={`text-xs ${f.included ? 'text-slate-300' : 'text-slate-600'}`}>{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-center text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700">
                    Current Plan
                  </div>
                ) : (
                  <button className={`w-full py-2.5 rounded-xl text-xs transition-all ${p.btn}`}>
                    {tier.role === 'teaser' ? 'Downgrade' : 'Request Access'} <ArrowRight size={12} className="inline ml-1" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ VALUE PROPS ═══ */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 text-center">What You Get With Full Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALUE_PROPS.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/80 transition-all">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-3 ${bg}`}>
                <Icon size={15} className={color} />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CTA BANNER ═══ */}
      <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-2xl p-6 text-center">
        <h3 className="text-white font-bold">Ready to upgrade?</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
          Contact the Coral Gables Chamber of Commerce membership team to request elevated access to the Business Intelligence Terminal.
        </p>
        <button className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors">
          Contact Membership Team <ArrowRight size={12} className="inline ml-1" />
        </button>
      </div>
    </div>
  )
}
