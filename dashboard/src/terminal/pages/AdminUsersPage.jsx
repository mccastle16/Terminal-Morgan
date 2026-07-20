import { useState, useEffect, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import { apiJson } from '../lib/api'
import { ROLES } from '../config/roles'
import {
  UserCog, UserPlus, CheckCircle, Clock, Building2, Search, ShieldAlert, Loader2,
} from 'lucide-react'

// Admin-only console for real auth: create :User accounts and approve the
// business claims that link a user to their :Business. Members and other roles
// cannot self-claim — an admin does it here on their behalf.
export default function AdminUsersPage() {
  const { can } = useTerminalAuth()
  const { rawBusinesses } = useTerminalData()

  const [users, setUsers] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // New-user form
  const [form, setForm] = useState({ email: '', password: '', name: '', title: '', role: 'member' })
  // Claim form
  const [claimEmail, setClaimEmail] = useState('')
  const [bizQuery, setBizQuery] = useState('')
  const [bizId, setBizId] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [{ users }, { claims }] = await Promise.all([
        apiJson('/api/users'),
        apiJson('/api/claims'),
      ])
      setUsers(users || [])
      setClaims(claims || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const bizMatches = useMemo(() => {
    if (!bizQuery) return []
    const q = bizQuery.toLowerCase()
    return rawBusinesses
      .filter(b => b.business_name?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [bizQuery, rawBusinesses])

  if (!can('manage_users')) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <ShieldAlert size={36} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-1">Admin access required</h1>
        <p className="text-slate-400 text-sm">You don’t have permission to manage users.</p>
      </div>
    )
  }

  const submitUser = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await apiJson('/api/users', { method: 'POST', body: JSON.stringify(form) })
      setForm({ email: '', password: '', name: '', title: '', role: 'member' })
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const submitClaim = async (e) => {
    e.preventDefault()
    if (!claimEmail || !bizId) { setError('Pick a user and a business'); return }
    setBusy(true); setError('')
    try {
      await apiJson('/api/claims', { method: 'POST', body: JSON.stringify({ email: claimEmail, businessId: bizId }) })
      setClaimEmail(''); setBizQuery(''); setBizId('')
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const approve = async (email, businessId) => {
    setBusy(true); setError('')
    try {
      await apiJson('/api/claims/approve', { method: 'POST', body: JSON.stringify({ email, businessId }) })
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const inputCls = 'w-full bg-slate-900/50 border border-slate-800/60 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
          <UserCog size={22} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Users &amp; Business Claims</h1>
          <p className="text-slate-400 text-sm">Create accounts and approve which business each user represents.</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-950/50 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <ShieldAlert size={14} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create user */}
        <form onSubmit={submitUser} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><UserPlus size={16} className="text-amber-400" /> Create user</h2>
          <input className={inputCls} type="email" placeholder="email@chamber.org" value={form.email} required
            onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className={inputCls} type="password" placeholder="temp password (min 8 chars)" value={form.password} required minLength={8}
            onChange={e => setForm({ ...form, password: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <select className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {Object.values(ROLES).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button type="submit" disabled={busy}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-50">
            {busy ? 'Working…' : 'Create user'}
          </button>
        </form>

        {/* Link a business (create claim) */}
        <form onSubmit={submitClaim} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Building2 size={16} className="text-amber-400" /> Link a business to a user</h2>
          <select className={inputCls} value={claimEmail} onChange={e => setClaimEmail(e.target.value)}>
            <option value="">Select user…</option>
            {users.map(u => <option key={u.email} value={u.email}>{u.email} ({u.role})</option>)}
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${inputCls} pl-9`} placeholder="Search business by name…"
              value={bizId ? (rawBusinesses.find(b => b._id === bizId)?.business_name || bizQuery) : bizQuery}
              onChange={e => { setBizQuery(e.target.value); setBizId('') }} />
          </div>
          {!bizId && bizMatches.length > 0 && (
            <div className="border border-slate-800/60 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {bizMatches.map(b => (
                <button type="button" key={b._id} onClick={() => { setBizId(b._id); setBizQuery(b.business_name) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50 border-b border-slate-800/30 last:border-0">
                  {b.business_name} <span className="text-slate-600">· {b.category_primary?.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          )}
          <button type="submit" disabled={busy || !claimEmail || !bizId}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg py-2 text-sm transition-colors disabled:opacity-40">
            Create claim (pending approval)
          </button>
        </form>
      </div>

      {/* Claims list */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Business claims</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-6 justify-center"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : claims.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">No claims yet. Link a business to a user above.</p>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {claims.map(c => (
              <div key={`${c.email}-${c.businessId}`} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{c.businessName || c.businessId}</p>
                  <p className="text-xs text-slate-500 truncate">{c.email}{c.userName ? ` · ${c.userName}` : ''}</p>
                </div>
                {c.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                    <CheckCircle size={13} /> Approved
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25">
                      <Clock size={13} /> Pending
                    </span>
                    <button onClick={() => approve(c.email, c.businessId)} disabled={busy}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg px-3 py-1 transition-colors disabled:opacity-50">
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
