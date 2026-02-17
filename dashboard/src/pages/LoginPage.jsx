import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ArrowRight, Building2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const demoCredentials = [
    { email: 'admin@cgcc.org', password: 'cgcc2024', label: 'Admin' },
    { email: 'member@cgcc.org', password: 'member2024', label: 'Member' },
    { email: 'demo@cgcc.org', password: 'demo', label: 'Demo' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-cgcc-navy relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="mb-8">
            <div className="w-16 h-16 bg-cgcc-gold rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={32} className="text-cgcc-navy" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold text-white mb-4">
              CGCC Insights
            </h1>
            <p className="text-xl text-white/70 max-w-md">
              Business Intelligence Dashboard for Coral Gables Chamber of Commerce Members
            </p>
          </div>

          <div className="space-y-4 text-white/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-cgcc-gold text-sm font-bold">1</span>
              </div>
              <span>Access enriched business intelligence data</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-cgcc-gold text-sm font-bold">2</span>
              </div>
              <span>Discover insights and pain points</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="text-cgcc-gold text-sm font-bold">3</span>
              </div>
              <span>Generate content and take action</span>
            </div>
          </div>

          {/* Stats preview */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <p className="text-3xl font-bold text-white">410+</p>
              <p className="text-white/50 text-sm">Businesses</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <p className="text-3xl font-bold text-white">10</p>
              <p className="text-white/50 text-sm">Categories</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
              <p className="text-3xl font-bold text-white">4.3</p>
              <p className="text-white/50 text-sm">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cgcc-gold/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-cgcc-gold/10 rounded-full blur-3xl"></div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-cgcc-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-cgcc-gold" />
            </div>
            <h1 className="text-2xl font-display font-bold text-cgcc-navy">CGCC Insights</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-cgcc-charcoal/30 border-t-cgcc-charcoal rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
              <div className="flex gap-2">
                {demoCredentials.map((cred) => (
                  <button
                    key={cred.email}
                    onClick={() => {
                      setEmail(cred.email)
                      setPassword(cred.password)
                    }}
                    className="flex-1 px-3 py-2 text-xs font-medium text-cgcc-navy bg-gray-100
                             hover:bg-cgcc-gold/20 rounded-lg transition-colors"
                  >
                    {cred.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Coral Gables Chamber of Commerce Member Portal
          </p>
        </div>
      </div>
    </div>
  )
}
