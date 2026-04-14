import { useState, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import {
  Pencil, Search, Send, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronRight, Building2, Filter, MessageSquare,
} from 'lucide-react'

const CORRECTABLE_FIELDS = [
  'business_name', 'formatted_address', 'phone', 'website_url', 'email',
  'category_primary', 'category_secondary', 'neighborhood_area',
  'membership_status', 'price_level', 'business_sub_type',
]

const STATUS_CFG = {
  pending:  { label: 'Pending',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
}

function loadCorrections() {
  try { return JSON.parse(localStorage.getItem('terminal_corrections')) || [] } catch { return [] }
}

export default function CorrectionPage() {
  const { rawBusinesses } = useTerminalData()
  const { user, can } = useTerminalAuth()
  const [corrections, setCorrections] = useState(loadCorrections)
  const [search, setSearch] = useState('')
  const [selectedBiz, setSelectedBiz] = useState(null)
  const [field, setField] = useState(CORRECTABLE_FIELDS[0])
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return []
    const q = search.toLowerCase()
    return rawBusinesses.filter(b =>
      b.business_name?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [search, rawBusinesses])

  const filteredCorrections = useMemo(() => {
    let list = corrections
    if (filterStatus) list = list.filter(c => c.status === filterStatus)
    return list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  }, [corrections, filterStatus])

  const persist = (list) => {
    setCorrections(list)
    localStorage.setItem('terminal_corrections', JSON.stringify(list))
  }

  const handleSubmit = () => {
    if (!selectedBiz || !newValue.trim()) return
    const entry = {
      id: Date.now(),
      businessId: selectedBiz._id,
      businessName: selectedBiz.business_name,
      field,
      oldValue: selectedBiz[field] || '',
      newValue: newValue.trim(),
      reason: reason.trim(),
      submittedBy: user?.name || 'Anonymous',
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }
    persist([entry, ...corrections])
    setSelectedBiz(null); setNewValue(''); setReason(''); setSearch('')
  }

  const handleReview = (id, status) => {
    persist(corrections.map(c => c.id === id ? { ...c, status, reviewedAt: new Date().toISOString() } : c))
  }

  return (
    <RoleGate permission="view_member_status" blur>
      <div className="space-y-6 animate-fade-in">
        {/* ═══ HERO ═══ */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Pencil size={20} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Data Corrections</h1>
                <p className="text-slate-400 text-sm">
                  Submit corrections or disputes for business records — {corrections.filter(c => c.status === 'pending').length} pending review
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ═══ SUBMIT FORM (left 3 cols) ═══ */}
          <div className="lg:col-span-3 space-y-5">
            <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500/40" />
              <div className="p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <MessageSquare size={13} className="text-violet-400" />
                  </div>
                  Submit Correction
                </h3>

                {/* Business search */}
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Business</label>
                  {selectedBiz ? (
                    <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                      <Building2 size={14} className="text-violet-400" />
                      <span className="text-sm text-white font-medium flex-1">{selectedBiz.business_name}</span>
                      <button onClick={() => { setSelectedBiz(null); setSearch('') }}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors">Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input type="text" placeholder="Search for a business..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg text-slate-300 placeholder:text-slate-700 focus:border-violet-500/50 outline-none" />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                          {searchResults.map(b => (
                            <button key={b._id} onClick={() => { setSelectedBiz(b); setSearch('') }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-800/30 last:border-0">
                              <span className="text-xs text-slate-300 flex-1 truncate">{b.business_name}</span>
                              <span className="text-[10px] text-slate-600 capitalize">{b.category_primary?.replace(/_/g, ' ')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Field selector */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Field to Correct</label>
                    <select value={field} onChange={e => setField(e.target.value)}
                      className="w-full text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2.5 text-slate-300 focus:border-violet-500/50 outline-none">
                      {CORRECTABLE_FIELDS.map(f => (
                        <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  {selectedBiz && (
                    <p className="text-[10px] text-slate-600">
                      Current value: <span className="text-slate-400 font-mono">{selectedBiz[field] || '(empty)'}</span>
                    </p>
                  )}

                  {/* New value */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Corrected Value</label>
                    <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)}
                      placeholder="Enter the correct value..."
                      className="w-full px-3 py-2.5 text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg text-slate-300 placeholder:text-slate-700 focus:border-violet-500/50 outline-none" />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Reason (optional)</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      placeholder="Why is this correction needed?"
                      className="w-full px-3 py-2.5 text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg text-slate-300 placeholder:text-slate-700 focus:border-violet-500/50 outline-none resize-none" />
                  </div>

                  <button onClick={handleSubmit}
                    disabled={!selectedBiz || !newValue.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 font-bold text-xs hover:bg-violet-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send size={13} /> Submit Correction
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ HISTORY (right 2 cols) ═══ */}
          <div className="lg:col-span-2 space-y-5">
            <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-600/40" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Clock size={13} className="text-slate-400" />
                    </div>
                    History
                  </h3>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="text-[10px] bg-slate-900/60 border border-slate-800/60 rounded-lg px-2 py-1 text-slate-400 outline-none">
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {filteredCorrections.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-8">No corrections submitted yet</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredCorrections.map(c => {
                      const sCfg = STATUS_CFG[c.status]
                      const SIcon = sCfg.icon
                      return (
                        <div key={c.id} className={`p-3 rounded-lg border ${sCfg.bg} transition-all`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <SIcon size={12} className={sCfg.color} />
                            <span className="text-xs text-white font-medium flex-1 truncate">{c.businessName}</span>
                            <span className={`text-[9px] font-bold uppercase ${sCfg.color}`}>{sCfg.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            <span className="capitalize">{c.field.replace(/_/g, ' ')}</span>: <span className="line-through text-slate-600">{c.oldValue || '(empty)'}</span> → <span className="text-slate-300">{c.newValue}</span>
                          </p>
                          {c.reason && <p className="text-[10px] text-slate-600 mt-1 italic">"{c.reason}"</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] text-slate-700">{new Date(c.submittedAt).toLocaleDateString()}</span>
                            {c.status === 'pending' && can('manage_data') && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleReview(c.id, 'approved')}
                                  className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                  Approve
                                </button>
                                <button onClick={() => handleReview(c.id, 'rejected')}
                                  className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  )
}
