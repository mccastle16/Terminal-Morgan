import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import { TrustBadge, MemberBadge, FreshnessBadge } from '../components/TrustBadge'
import {
  ArrowLeft, Star, Phone, Globe, MapPin, Mail, Building2,
  ShieldAlert, ThumbsUp, ThumbsDown, Users, ExternalLink,
  Tag, Network, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react'

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/60 transition-colors ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={14} className="text-amber-400/70" />}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, href, icon: Icon, mono = false }) {
  if (!value || value === 'undefined' || value === 'null') return null
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
      {Icon && <Icon size={12} className="text-slate-600 mt-0.5 shrink-0" />}
      <span className="text-[10px] text-slate-500 w-24 shrink-0 uppercase tracking-wider">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className={`text-xs text-blue-400 hover:text-blue-300 truncate ${mono ? 'font-mono' : ''}`}>
          {value} <ExternalLink size={9} className="inline ml-0.5" />
        </a>
      ) : (
        <span className={`text-xs text-slate-300 ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  )
}

export default function ExplorerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getBusinessById, getPeers } = useTerminalData()
  const { can } = useTerminalAuth()

  const biz = useMemo(() => getBusinessById(id), [id, getBusinessById])
  const peers = useMemo(() => biz ? getPeers(biz) : [], [biz, getPeers])

  if (!biz) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle size={32} className="text-slate-600" />
        <p className="text-sm text-slate-500">Business not found</p>
        <button onClick={() => navigate('/browse')}
          className="text-xs text-amber-400 hover:text-amber-300">← Back to directory</button>
      </div>
    )
  }

  const delights = [biz.review_theme_delight_1, biz.review_theme_delight_2, biz.review_theme_delight_3].filter(Boolean)
  const pains = [biz.review_theme_pain_1, biz.review_theme_pain_2, biz.review_theme_pain_3].filter(Boolean)
  const redFlags = [biz.red_flag_1, biz.red_flag_2, biz.red_flag_3].filter(Boolean)
  const actions = [biz.action_1, biz.action_2, biz.action_3].filter(Boolean)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back nav */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Entity Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MemberBadge status={biz._memberStatus} />
              <FreshnessBadge date={biz.last_scraped || biz.data_date} />
            </div>
            <h1 className="text-lg font-bold text-white truncate">{biz.business_name}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {biz.category_primary?.replace(/_/g, ' ')}
              {biz.category_secondary ? ` · ${biz.category_secondary.replace(/_/g, ' ')}` : ''}
            </p>
            {biz.formatted_address && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={11} /> {biz.formatted_address}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <TrustBadge confidence={biz._confidence} corroboration={biz._corroboration} validationTier={biz._validationTier} />
            {biz._rating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-amber-500" />
                <span className="text-lg font-bold text-white font-mono">{biz._rating.toFixed(1)}</span>
                {biz._reviewCount > 0 && (
                  <span className="text-[10px] text-slate-500">({biz._reviewCount} reviews)</span>
                )}
              </div>
            )}
            {biz._memberStatus !== 'member' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Recruit:</span>
                <span className="text-sm font-bold font-mono" style={{ color: biz._recruitBand?.color }}>
                  {biz._recruitScore}
                </span>
                <span className="text-[10px] px-1 rounded font-bold"
                  style={{ color: biz._recruitBand?.color, backgroundColor: biz._recruitBand?.color + '15' }}>
                  {biz._recruitBand?.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Contact + Classification */}
        <div className="space-y-4">
          <Section title="Contact & Links" icon={Phone}>
            <InfoRow label="Phone" value={biz.phone} icon={Phone} href={biz.phone ? `tel:${biz.phone}` : null} />
            <InfoRow label="Website" value={biz.website_url || biz.website} icon={Globe}
              href={biz.website_url || biz.website} />
            <InfoRow label="Email" value={biz.email} icon={Mail} href={biz.email ? `mailto:${biz.email}` : null} />
            <InfoRow label="Google Maps" value={biz.google_maps_url ? 'View on map' : null} icon={MapPin}
              href={biz.google_maps_url} />
            <InfoRow label="Place ID" value={biz.google_place_id} mono />
          </Section>

          <Section title="Classification" icon={Tag}>
            <InfoRow label="Primary" value={biz.category_primary?.replace(/_/g, ' ')} />
            <InfoRow label="Secondary" value={biz.category_secondary?.replace(/_/g, ' ')} />
            <InfoRow label="Sub-type" value={biz.business_sub_type} />
            <InfoRow label="PKP Type" value={biz._pkpType?.replace(/_/g, ' ')} />
            <InfoRow label="Neighborhood" value={biz.neighborhood_area} icon={MapPin} />
            <InfoRow label="Zipcode" value={biz.zip_code} />
          </Section>

          <Section title="Data Provenance" icon={Network}>
            <InfoRow label="Sources" value={biz.source_list} />
            <InfoRow label="Source Count" value={biz._corroboration} mono />
            <InfoRow label="Valid. Tier" value={`T${biz._validationTier}`} mono />
            <InfoRow label="Confidence" value={`${biz._confidence}%`} mono />
            <InfoRow label="Latitude" value={biz.latitude} mono />
            <InfoRow label="Longitude" value={biz.longitude} mono />
          </Section>
        </div>

        {/* Center: Reviews + Risk */}
        <div className="space-y-4">
          <RoleGate permission="view_reviews" blur>
            <Section title="Customer Themes" icon={ThumbsUp}>
              {delights.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] text-green-500 uppercase tracking-wider font-semibold">Positive themes</p>
                  {delights.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 mb-4">No positive themes extracted</p>
              )}
              {pains.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold">Pain points</p>
                  {pains.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No pain points extracted</p>
              )}
            </Section>
          </RoleGate>

          {/* Risk flags */}
          <Section title="Risk Flags" icon={ShieldAlert}>
            {redFlags.length > 0 ? (
              <div className="space-y-2">
                {redFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-950/20 border border-red-900/20">
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-300">{f}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-950/20 border border-green-900/20">
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-xs text-green-400">No risk flags detected</span>
              </div>
            )}
          </Section>

          {/* AI-generated actions */}
          <RoleGate permission="view_actions" blur>
            <Section title="Recommended Actions" icon={Building2}>
              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-950/20 border border-amber-900/20">
                      <span className="text-amber-500 font-bold text-[10px] mt-0.5">{i + 1}</span>
                      <span className="text-xs text-amber-200">{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No actions generated</p>
              )}
            </Section>
          </RoleGate>
        </div>

        {/* Right: Peers + Recruit intel */}
        <div className="space-y-4">
          {/* Peers in category */}
          <Section title="Category Peers" icon={Users}>
            {peers.length > 0 ? (
              <div className="space-y-1">
                {peers.slice(0, 8).map(peer => (
                  <div key={peer._id}
                    onClick={() => navigate(`/explorer/${peer._id}`)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-300 truncate group-hover:text-amber-400 transition-colors">
                        {peer.business_name}
                      </p>
                    </div>
                    <MemberBadge status={peer._memberStatus} />
                    {peer._rating > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono">{peer._rating.toFixed(1)}</span>
                    )}
                  </div>
                ))}
                {peers.length > 8 && (
                  <p className="text-[10px] text-slate-600 text-center pt-1">
                    +{peers.length - 8} more peers
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-600">No peers in this category</p>
            )}
          </Section>

          {/* Raw data debug (admin only) */}
          <RoleGate permission="manage_data">
            <Section title="Raw Record" icon={Network}>
              <pre className="text-[9px] text-slate-500 font-mono overflow-auto max-h-64 leading-relaxed">
                {JSON.stringify(Object.fromEntries(
                  Object.entries(biz).filter(([k]) => !k.startsWith('_'))
                ), null, 2)}
              </pre>
            </Section>
          </RoleGate>
        </div>
      </div>
    </div>
  )
}
