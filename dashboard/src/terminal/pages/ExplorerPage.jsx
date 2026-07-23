import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import { TrustBadge, MemberBadge, FreshnessBadge } from '../components/TrustBadge'
import {
  ArrowLeft, Star, Phone, Globe, MapPin, Mail, Building2,
  ShieldAlert, ThumbsUp, Users, ExternalLink,
  Tag, Network, AlertTriangle, CheckCircle2, XCircle,
  Bookmark, BookmarkCheck, ChevronRight, Layers,
  Eye, EyeOff, ChevronDown, Database, Clock,
} from 'lucide-react'

/* ── Styled sub-components ── */

function QuickAction({ icon: Icon, label, href, color = 'slate' }) {
  const palette = {
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
    green:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
    amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    slate:  'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/60',
  }
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${palette[color]}`}>
      <Icon size={14} /> {label}
    </a>
  )
}

function MetricCard({ label, value, sub, color = 'slate' }) {
  const text = { amber: 'text-amber-400', emerald: 'text-emerald-400', blue: 'text-blue-400', slate: 'text-white' }
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${text[color] || text.slate}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function Card({ title, icon: Icon, iconColor = 'text-amber-400', children, accentColor }) {
  const bg = {
    'text-amber-400':   'bg-amber-500/10 border-amber-500/20',
    'text-blue-400':    'bg-blue-500/10 border-blue-500/20',
    'text-emerald-400': 'bg-emerald-500/10 border-emerald-500/20',
    'text-red-400':     'bg-red-500/10 border-red-500/20',
    'text-purple-400':  'bg-purple-500/10 border-purple-500/20',
    'text-slate-500':   'bg-slate-800 border-slate-700',
  }
  return (
    <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all duration-200">
      {accentColor && <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentColor}`} />}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          {Icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${bg[iconColor] || 'bg-slate-800 border-slate-700'}`}>
              <Icon size={13} className={iconColor} />
            </div>
          )}
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, href, icon: Icon, mono = false, badge = null }) {
  if (!value || value === 'undefined' || value === 'null') return null
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800/30 last:border-0">
      {Icon && <Icon size={13} className="text-slate-600 shrink-0" />}
      <span className="text-[11px] text-slate-500 w-24 shrink-0 uppercase tracking-wider font-medium">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className={`text-xs text-blue-400 hover:text-blue-300 truncate flex items-center gap-1 transition-colors ${mono ? 'font-mono' : ''}`}>
          {value} <ExternalLink size={9} className="opacity-60" />
        </a>
      ) : (
        <span className={`text-xs ${mono ? 'font-mono text-slate-400' : 'text-slate-300'}`}>{value}</span>
      )}
      {badge}
    </div>
  )
}

/* ── Website verification badge ──
   Flags websites that could NOT be confirmed to belong to the business during
   the maps re-validation pass. `verified` shows a subtle check; anything with a
   website that isn't verified shows an amber "Unverified" warning. */
function WebsiteVerifyBadge({ biz }) {
  if (!biz._hasWebsite) return null
  if (biz._websiteUnverified) {
    return (
      <span title="This website could not be confirmed to belong to this business. Treat with caution."
        className="ml-1 shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <AlertTriangle size={9} /> Unverified
      </span>
    )
  }
  if (biz._websiteVerified === 'verified') {
    return (
      <span title="Website confirmed to match this business during re-validation."
        className="ml-1 shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={9} /> Verified
      </span>
    )
  }
  return null
}

/* ── Trust Panel (expanded provenance view) ── */

function TrustPanel({ biz, redFlagsCount }) {
  const [open, setOpen] = useState(false)
  const conf = parseFloat(biz._confidence) || 0
  const sources = (biz.source_list || '').split(',').map(s => s.trim()).filter(Boolean)
  const tier = biz._validationTier || 0
  const observed = ['business_name','phone','formatted_address','category_primary','website_url'].filter(f => biz[f])
  const synthesized = ['_rating','_recruitScore','_confidence','_memberStatus','_pkpType'].filter(f => biz[f] != null)
  const tierLabels = { 1: 'Single unverified source', 2: 'Multiple sources, some fields unconfirmed', 3: 'Cross-validated across sources', 4: 'Fully corroborated, high-assurance' }

  return (
    <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/40" />
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-900/60">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Eye size={13} className="text-blue-400" />
        </div>
        <span className="text-sm font-semibold text-slate-200 flex-1">Trust & Provenance Detail</span>
        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${conf >= 70 ? 'bg-emerald-500/10 text-emerald-400' : conf >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
          {conf}% confidence
        </span>
        <ChevronDown size={14} className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-800/40">
          {/* Confidence gauge */}
          <div className="pt-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Confidence Score</p>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${conf >= 70 ? 'bg-emerald-500' : conf >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(conf, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-700">0%</span>
              <span className="text-[9px] text-slate-700">100%</span>
            </div>
          </div>
          {/* Validation tier */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Validation Tier</p>
            <div className="flex items-center gap-2">
              {[1,2,3,4].map(t => (
                <div key={t} className={`flex-1 h-1.5 rounded-full ${t <= tier ? 'bg-amber-500' : 'bg-slate-800'}`} />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Tier {tier}: {tierLabels[tier] || 'Unknown'}</p>
          </div>
          {/* Source breakdown */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Source Breakdown ({sources.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.length > 0 ? sources.map(s => (
                <span key={s} className="px-2 py-1 rounded-md bg-blue-500/8 border border-blue-500/15 text-[10px] text-blue-400 font-medium">{s}</span>
              )) : <span className="text-xs text-slate-600">No sources listed</span>}
            </div>
          </div>
          {/* Observed vs Synthesized */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1"><Database size={9} /> Observed Fields</p>
              <div className="space-y-1">
                {observed.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 size={9} /> <span className="text-slate-400">{f.replace(/_/g, ' ')}</span>
                  </div>
                ))}
                {observed.length === 0 && <span className="text-[10px] text-slate-600">None</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1"><EyeOff size={9} /> Synthesized Fields</p>
              <div className="space-y-1">
                {synthesized.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-[10px] text-amber-400">
                    <AlertTriangle size={9} /> <span className="text-slate-400">{f.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Freshness */}
          {(biz.last_scraped || biz.data_date) && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 flex items-center gap-1"><Clock size={9} /> Last Refreshed</p>
              <p className="text-xs text-slate-400">{biz.last_scraped || biz.data_date}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */

export default function ExplorerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getBusinessById, getPeers, isBookmarked, toggleBookmark } = useTerminalData()
  const { can } = useTerminalAuth()

  const biz = useMemo(() => getBusinessById(id), [id, getBusinessById])
  const peers = useMemo(() => biz ? getPeers(biz) : [], [biz, getPeers])
  const bookmarked = isBookmarked?.(id)

  if (!biz) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center">
          <XCircle size={28} className="text-slate-600" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Business not found</p>
        <button onClick={() => navigate('/browse')}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
          <ArrowLeft size={12} /> Back to directory
        </button>
      </div>
    )
  }

  const delights = [biz.review_theme_delight_1, biz.review_theme_delight_2, biz.review_theme_delight_3].filter(Boolean)
  const pains = [biz.review_theme_pain_1, biz.review_theme_pain_2, biz.review_theme_pain_3].filter(Boolean)
  const redFlags = [biz.red_flag_1, biz.red_flag_2, biz.red_flag_3].filter(Boolean)
  const actions = [biz.action_1, biz.action_2, biz.action_3].filter(Boolean)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back nav */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      {/* ═══ HERO HEADER ═══ */}
      <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <MemberBadge status={biz._memberStatus} />
                <FreshnessBadge date={biz.last_scraped || biz.data_date} />
                <TrustBadge confidence={biz._confidence} corroboration={biz._corroboration} validationTier={biz._validationTier} compact />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{biz.business_name}</h1>
              <p className="text-sm text-slate-400">
                {biz.category_primary?.replace(/_/g, ' ')}
                {biz.category_secondary && <span className="text-slate-600"> · </span>}
                {biz.category_secondary && <span className="text-slate-500">{biz.category_secondary.replace(/_/g, ' ')}</span>}
              </p>
              {biz.formatted_address && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-600" /> {biz.formatted_address}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              {biz._rating > 0 && (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-0.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span className="text-xl font-bold text-white font-mono">{biz._rating.toFixed(1)}</span>
                  </div>
                  {biz._reviewCount > 0 && (
                    <span className="text-[9px] text-slate-500">{biz._reviewCount} reviews</span>
                  )}
                </div>
              )}
              {biz._memberStatus !== 'member' && biz._recruitScore > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Recruit</span>
                  <span className="text-sm font-bold font-mono" style={{ color: biz._recruitBand?.color }}>
                    {biz._recruitScore}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                    style={{ color: biz._recruitBand?.color, backgroundColor: biz._recruitBand?.color + '15' }}>
                    {biz._recruitBand?.label}
                  </span>
                </div>
              )}
              {toggleBookmark && (
                <button onClick={() => toggleBookmark(id)}
                  className={`p-2 rounded-lg border transition-all ${
                    bookmarked
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500 hover:text-slate-300'
                  }`}>
                  {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <QuickAction icon={Phone} label="Call" href={biz.phone ? `tel:${biz.phone}` : null} color="green" />
            <QuickAction icon={Globe} label="Website" href={biz.website_url || biz.website} color="blue" />
            {biz._websiteUnverified && (
              <span title="This website could not be confirmed to belong to this business."
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={11} /> Unverified site
              </span>
            )}
            <QuickAction icon={Mail} label="Email" href={biz.email ? `mailto:${biz.email}` : null} color="purple" />
            <QuickAction icon={MapPin} label="View on Map" href={biz.google_maps_url} color="amber" />
          </div>
        </div>
      </div>

      {/* ═══ METRICS ROW ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Confidence" value={`${biz._confidence}%`} color="blue" />
        <MetricCard label="Sources" value={biz._corroboration} sub={biz.source_list} color="emerald" />
        <MetricCard label="Validation" value={`Tier ${biz._validationTier}`} color="amber" />
        <MetricCard label="Risk Flags" value={redFlags.length}
          color={redFlags.length > 0 ? 'amber' : 'emerald'}
          sub={redFlags.length === 0 ? 'All clear' : `${redFlags.length} detected`} />
      </div>

      {/* ═══ TRUST PANEL (expanded) ═══ */}
      <TrustPanel biz={biz} redFlagsCount={redFlags.length} />

      {/* ═══ MAIN CONTENT GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Left (3 cols): Contact + Classification + Reviews + Actions */}
        <div className="lg:col-span-3 space-y-5">
          <Card title="Contact & Links" icon={Phone} iconColor="text-blue-400" accentColor="bg-blue-500/40">
            <InfoRow label="Phone" value={biz.phone} icon={Phone} href={biz.phone ? `tel:${biz.phone}` : null} />
            <InfoRow label="Website" value={biz.website_url || biz.website} icon={Globe}
              href={biz.website_url || biz.website} badge={<WebsiteVerifyBadge biz={biz} />} />
            <InfoRow label="Email" value={biz.email} icon={Mail} href={biz.email ? `mailto:${biz.email}` : null} />
            <InfoRow label="Google Maps" value={biz.google_maps_url ? 'View on map' : null} icon={MapPin}
              href={biz.google_maps_url} />
            <InfoRow label="Place ID" value={biz.google_place_id} mono />
          </Card>

          <Card title="Classification" icon={Tag} iconColor="text-purple-400" accentColor="bg-purple-500/40">
            <InfoRow label="Primary" value={biz.category_primary?.replace(/_/g, ' ')} />
            <InfoRow label="Secondary" value={biz.category_secondary?.replace(/_/g, ' ')} />
            <InfoRow label="Sub-type" value={biz.business_sub_type} />
            <InfoRow label="PKP Type" value={biz._pkpType?.replace(/_/g, ' ')} />
            <InfoRow label="Neighborhood" value={biz.neighborhood_area} icon={MapPin} />
            <InfoRow label="Zipcode" value={biz.zip_code} />
          </Card>

          <RoleGate permission="view_reviews" blur>
            <Card title="Customer Themes" icon={ThumbsUp} iconColor="text-emerald-400" accentColor="bg-emerald-500/40">
              {delights.length > 0 && (
                <div className="space-y-2 mb-5">
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Positive themes
                  </p>
                  {delights.map((d, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{d}</span>
                    </div>
                  ))}
                </div>
              )}
              {pains.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Pain points
                  </p>
                  {pains.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                      <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {delights.length === 0 && pains.length === 0 && (
                <p className="text-xs text-slate-600">No customer themes extracted yet</p>
              )}
            </Card>
          </RoleGate>

          <RoleGate permission="view_actions" blur>
            <Card title="Recommended Actions" icon={Building2} iconColor="text-amber-400" accentColor="bg-amber-500/40">
              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-colors">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                        <span className="text-amber-400 font-bold text-[11px]">{i + 1}</span>
                      </div>
                      <span className="text-xs text-slate-200 leading-relaxed">{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No actions generated</p>
              )}
            </Card>
          </RoleGate>
        </div>

        {/* Right (2 cols): Provenance + Risk + Peers */}
        <div className="lg:col-span-2 space-y-5">
          <Card title="Data Provenance" icon={Layers} iconColor="text-blue-400">
            <InfoRow label="Sources" value={biz.source_list} />
            <InfoRow label="Source Count" value={biz._corroboration} mono />
            <InfoRow label="Valid. Tier" value={`T${biz._validationTier}`} mono />
            <InfoRow label="Confidence" value={`${biz._confidence}%`} mono />
            <InfoRow label="Latitude" value={biz.latitude} mono />
            <InfoRow label="Longitude" value={biz.longitude} mono />
          </Card>

          <Card title="Risk Assessment" icon={ShieldAlert} iconColor="text-red-400"
            accentColor={redFlags.length > 0 ? 'bg-red-500/40' : 'bg-emerald-500/40'}>
            {redFlags.length > 0 ? (
              <div className="space-y-2">
                {redFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-200 leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-xs text-emerald-400 font-medium">No risk flags detected</span>
              </div>
            )}
          </Card>

          <Card title="Category Peers" icon={Users} iconColor="text-purple-400">
            {peers.length > 0 ? (
              <div className="space-y-1">
                {peers.slice(0, 8).map(peer => (
                  <div key={peer._id}
                    onClick={() => navigate(`/explorer/${peer._id}`)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">
                        {peer.business_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate group-hover:text-amber-400 transition-colors font-medium">
                        {peer.business_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MemberBadge status={peer._memberStatus} />
                        {peer._rating > 0 && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <Star size={8} className="text-amber-500" /> {peer._rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
                  </div>
                ))}
                {peers.length > 8 && (
                  <p className="text-[10px] text-slate-600 text-center pt-2 pb-1">
                    +{peers.length - 8} more peers in this category
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600">No peers found in this category</p>
            )}
          </Card>

          <RoleGate permission="manage_data">
            <Card title="Raw Record" icon={Network} iconColor="text-slate-500">
              <pre className="text-[9px] text-slate-500 overflow-auto max-h-64 leading-relaxed font-mono bg-slate-950/50 rounded-lg p-3 border border-slate-800/30">
                {JSON.stringify(Object.fromEntries(
                  Object.entries(biz).filter(([k]) => !k.startsWith('_'))
                ), null, 2)}
              </pre>
            </Card>
          </RoleGate>
        </div>
      </div>
    </div>
  )
}
