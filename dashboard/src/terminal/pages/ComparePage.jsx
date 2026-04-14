import { useState, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import RoleGate from '../components/RoleGate'
import { MemberBadge, TrustBadge } from '../components/TrustBadge'
import {
  Columns2, Search, Star, Phone, Globe, MapPin, ShieldAlert,
  CheckCircle2, XCircle, X,
} from 'lucide-react'

function Slot({ label, biz, onRemove, onSearch }) {
  if (!biz) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-slate-700 transition-colors">
        <Columns2 size={24} className="text-slate-700" />
        <p className="text-xs text-slate-600">{label}</p>
        <div className="relative w-full max-w-xs mt-2">
          <Search size={14} className="absolute left-2.5 top-2 text-slate-600" />
          <input type="text" placeholder="Search by name..."
            onChange={e => onSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-amber-500 focus:border-amber-500" />
        </div>
      </div>
    )
  }

  const delights = [biz.review_theme_delight_1, biz.review_theme_delight_2].filter(Boolean)
  const pains = [biz.review_theme_pain_1, biz.review_theme_pain_2].filter(Boolean)
  const flags = [biz.red_flag_1, biz.red_flag_2].filter(Boolean)

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 relative hover:border-slate-700 transition-colors">
      <button onClick={onRemove}
        className="absolute top-2 right-2 text-slate-600 hover:text-red-400 transition-colors">
        <X size={14} />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <MemberBadge status={biz._memberStatus} />
        <TrustBadge confidence={biz._confidence} validationTier={biz._validationTier} />
      </div>

      <h3 className="text-sm font-semibold text-white truncate">{biz.business_name}</h3>
      <p className="text-[11px] text-slate-500 truncate mt-0.5">{biz.category_primary?.replace(/_/g, ' ')}</p>

      <div className="mt-3 space-y-2">
        {/* Rating */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase">Rating</span>
          {biz._rating > 0 ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-white">
              <Star size={12} className="text-amber-500" /> {biz._rating.toFixed(1)}
              <span className="text-[10px] text-slate-500 font-normal">({biz._reviewCount})</span>
            </span>
          ) : <span className="text-xs text-slate-600">—</span>}
        </div>

        {/* Contact */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase">Contact</span>
          <div className="flex gap-2">
            {biz._hasPhone ? <Phone size={12} className="text-green-500" /> : <Phone size={12} className="text-slate-700" />}
            {biz._hasWebsite ? <Globe size={12} className="text-blue-500" /> : <Globe size={12} className="text-slate-700" />}
            {biz._hasGeo ? <MapPin size={12} className="text-purple-500" /> : <MapPin size={12} className="text-slate-700" />}
          </div>
        </div>

        {/* Validation */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase">Validation</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            biz._validationTier >= 3 ? 'text-green-400 bg-green-950/40' :
            biz._validationTier >= 2 ? 'text-yellow-400 bg-yellow-950/40' : 'text-red-400 bg-red-950/40'
          }`}>T{biz._validationTier} · {biz._confidence}%</span>
        </div>

        {/* Recruit score (non-members only) */}
        {biz._memberStatus !== 'member' && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Recruit Score</span>
            <span className="text-sm font-semibold font-mono" style={{ color: biz._recruitBand?.color }}>
              {biz._recruitScore}
            </span>
          </div>
        )}

        {/* Neighborhood */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase">Neighborhood</span>
          <span className="text-[11px] text-slate-300">{biz.neighborhood_area || '—'}</span>
        </div>
      </div>

      {/* Themes */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        {delights.length > 0 && (
          <div className="mb-2">
            <p className="text-[9px] text-green-500 uppercase tracking-wider mb-1">Positives</p>
            {delights.map((d, i) => (
              <p key={i} className="text-[10px] text-slate-400 flex items-start gap-1 mb-0.5">
                <CheckCircle2 size={9} className="text-green-600 mt-0.5 shrink-0" /> {d}
              </p>
            ))}
          </div>
        )}
        {pains.length > 0 && (
          <div className="mb-2">
            <p className="text-[9px] text-red-500 uppercase tracking-wider mb-1">Pain Points</p>
            {pains.map((p, i) => (
              <p key={i} className="text-[10px] text-slate-400 flex items-start gap-1 mb-0.5">
                <XCircle size={9} className="text-red-600 mt-0.5 shrink-0" /> {p}
              </p>
            ))}
          </div>
        )}
        {flags.length > 0 && (
          <div>
            <p className="text-[9px] text-amber-500 uppercase tracking-wider mb-1">Risk Flags</p>
            {flags.map((f, i) => (
              <p key={i} className="text-[10px] text-red-300 flex items-start gap-1 mb-0.5">
                <ShieldAlert size={9} className="text-red-500 mt-0.5 shrink-0" /> {f}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComparePage() {
  const { rawBusinesses } = useTerminalData()
  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [searchA, setSearchA] = useState('')
  const [searchB, setSearchB] = useState('')

  const searchResults = (term) => {
    if (!term || term.length < 2) return []
    const lower = term.toLowerCase()
    return rawBusinesses.filter(b => b.business_name?.toLowerCase().includes(lower)).slice(0, 8)
  }

  const resultsA = useMemo(() => searchResults(searchA), [searchA, rawBusinesses])
  const resultsB = useMemo(() => searchResults(searchB), [searchB, rawBusinesses])

  return (
    <RoleGate permission="view_compare" blur>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Columns2 size={16} className="text-amber-400" />
            </div>
            Compare Businesses
          </h1>
          <p className="text-sm text-slate-500">Side-by-side business intelligence comparison</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
          {/* Left slot */}
          <div className="relative">
            <Slot label="Select first business" biz={left} onRemove={() => { setLeft(null); setSearchA('') }}
              onSearch={setSearchA} />
            {!left && resultsA.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl max-h-48 overflow-auto">
                {resultsA.map(b => (
                  <button key={b._id} onClick={() => { setLeft(b); setSearchA('') }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left">
                    <span className="truncate">{b.business_name}</span>
                    <MemberBadge status={b._memberStatus} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right slot */}
          <div className="relative">
            <Slot label="Select second business" biz={right} onRemove={() => { setRight(null); setSearchB('') }}
              onSearch={setSearchB} />
            {!right && resultsB.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl max-h-48 overflow-auto">
                {resultsB.map(b => (
                  <button key={b._id} onClick={() => { setRight(b); setSearchB('') }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left">
                    <span className="truncate">{b.business_name}</span>
                    <MemberBadge status={b._memberStatus} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGate>
  )
}
