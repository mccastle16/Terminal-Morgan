import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import { Eye, EyeOff, AlertCircle, ChevronRight } from 'lucide-react'
import { TERMINAL_USERS } from '../config/roles'
import ParticleNetwork from '../components/ParticleNetwork'

export default function TerminalLoginPage() {
  const { login } = useTerminalAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (email) => {
    const user = TERMINAL_USERS[email]
    setEmail(email)
    setPassword(user.password)
    setError('')
    setLoading(true)
    try {
      await login(email, user.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { email: 'ceo@cgcc.org',        label: 'Leadership',  desc: 'Full market access' },
    { email: 'membership@cgcc.org', label: 'Membership',  desc: 'Recruit queue focus' },
    { email: 'member@cgcc.org',     label: 'Member',      desc: 'Business-centric' },
    { email: 'guest@cgcc.org',      label: 'Non-Member',  desc: 'Teaser preview' },
    { email: 'admin@cgcc.org',      label: 'Admin',       desc: 'Full system access' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] flex relative overflow-hidden">
      {/* Particle background */}
      <div className="absolute inset-0 z-0">
        <ParticleNetwork className="w-full h-full" />
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#020617]/80 via-[#020617]/60 to-[#020617]/80" />

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 border-r border-white/5 relative z-10">
        <div className="flex flex-col justify-center px-16">
          <div className="w-10 h-10 rounded-md bg-amber-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
            <span className="text-sm font-bold text-black">CG</span>
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">The Terminal</h1>
          <p className="text-base text-slate-400 max-w-md mb-10">
            Local Business Intelligence for Chambers of Commerce
          </p>

          <div className="space-y-3 text-sm text-slate-400">
            {[
              'Discover, analyze, and act on market intelligence',
              'Prioritize recruitment with data-driven scoring',
              'Benchmark businesses across the local ecosystem',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-semibold text-slate-300">
                  {i + 1}
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex gap-4">
            {[
              { v: '2,868', l: 'Businesses' },
              { v: '22', l: 'Categories' },
              { v: '9', l: 'Neighborhoods' },
            ].map(({ v, l }) => (
              <div key={l} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3">
                <p className="text-lg font-semibold text-white">{v}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-sm">
          <div className="bg-[#0a0f1a]/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-2xl shadow-black/40">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-md bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-xs font-bold text-black">CG</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">The Terminal</h1>
                <p className="text-xs text-slate-500">Chamber Intelligence</p>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
            <p className="text-sm text-slate-400 mb-6">Access your market intelligence terminal</p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-md bg-red-950/50 border border-red-900/50 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2.5 text-sm text-slate-200
                    placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                  placeholder="name@chamber.org" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2.5 text-sm text-slate-200 pr-10
                      placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none transition-colors"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-md py-2.5 text-sm transition-colors disabled:opacity-50">
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-xs text-slate-500 mb-3">Quick access</p>
              <div className="space-y-1.5">
                {demoAccounts.map(acc => (
                  <button key={acc.email} onClick={() => quickLogin(acc.email)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-white/5
                      hover:border-white/15 hover:bg-white/5 transition-all group text-left">
                    <div>
                      <p className="text-xs text-slate-300 font-medium">{acc.label}</p>
                      <p className="text-[10px] text-slate-600">{acc.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
