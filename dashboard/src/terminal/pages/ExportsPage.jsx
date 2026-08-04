import { useState, useMemo } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import RoleGate from '../components/RoleGate'
import {
  Download, FileText, FileSpreadsheet, Table2, Filter,
  Building2, Users, ShieldAlert, TrendingUp, Briefcase,
  ChevronDown, CheckCircle, Loader2,
} from 'lucide-react'

/* ── CSV builder ── */
function buildCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(escape).join(',')]
  rows.forEach(row => lines.push(headers.map(h => escape(row[h])).join(',')))
  return lines.join('\n')
}

function downloadBlob(content, filename, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Report presets ── */
const REPORT_PRESETS = [
  {
    id: 'full_directory',
    label: 'Full Business Directory',
    description: 'Complete export of all businesses with ratings, contact info, membership status, and categories.',
    icon: Building2,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    permission: 'export_data',
    fields: ['business_name', 'category_primary', 'neighborhood_area', '_memberStatus', '_rating', '_reviewCount', 'phone', 'website_url', 'formatted_address', '_confidence', '_validationTier'],
  },
  {
    id: 'membership_report',
    label: 'Membership Penetration Report',
    description: 'Member vs non-member breakdown by category and neighborhood with penetration rates.',
    icon: Users,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    permission: 'export_reports',
    type: 'summary',
  },
  {
    id: 'recruit_pipeline',
    label: 'Recruit Pipeline Export',
    description: 'Non-member and unknown businesses ranked by recruitability score with reasons.',
    icon: Briefcase,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    permission: 'view_recruit_queue',
    fields: ['business_name', 'category_primary', 'neighborhood_area', '_memberStatus', '_rating', '_recruitScore', '_recruitBand', '_recruitReasons', 'phone', 'website_url'],
    filter: (b) => b._memberStatus !== 'member',
  },
  {
    id: 'risk_report',
    label: 'Risk & Red Flag Report',
    description: 'All businesses with active risk flags, severity levels, and flag categories.',
    icon: ShieldAlert,
    iconBg: 'bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-400',
    permission: 'view_risk_flags',
    fields: ['business_name', 'category_primary', '_memberStatus', '_hasRedFlag', '_redFlagSeverity', 'red_flag_category', 'red_flag_1', 'red_flag_2', '_confidence', '_validationTier'],
    filter: (b) => b._hasRedFlag,
  },
  {
    id: 'data_quality',
    label: 'Data Quality Audit',
    description: 'Coverage gaps — businesses missing website, phone, geo, or with low validation scores.',
    icon: Table2,
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
    permission: 'view_data_quality',
    fields: ['business_name', 'category_primary', '_hasWebsite', '_hasPhone', '_hasGeo', '_confidence', '_corroboration', '_validationTier', 'source_list'],
  },
  {
    id: 'board_summary',
    label: 'Board Summary Report',
    description: 'Executive summary with KPIs: total businesses, membership rate, avg rating, data quality, top opportunities.',
    icon: TrendingUp,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    permission: 'export_reports',
    type: 'board',
  },
]

export default function ExportsPage() {
  const { rawBusinesses, stats, marketAnalytics } = useTerminalData()
  const { can } = useTerminalAuth()
  const [exporting, setExporting] = useState(null)
  const [completed, setCompleted] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('')

  const filteredBusinesses = useMemo(() => {
    let data = rawBusinesses
    if (categoryFilter) data = data.filter(b => b.category_primary === categoryFilter)
    if (neighborhoodFilter) data = data.filter(b => b.neighborhood_area === neighborhoodFilter)
    return data
  }, [rawBusinesses, categoryFilter, neighborhoodFilter])

  const handleExport = async (preset) => {
    setExporting(preset.id)
    await new Promise(r => setTimeout(r, 800)) // simulate processing

    const ts = new Date().toISOString().split('T')[0]

    if (preset.type === 'summary') {
      // Membership penetration summary
      const lines = ['Coral Gables Chamber — Membership Penetration Report', `Generated: ${ts}`, '']
      lines.push(`Total Businesses: ${stats.total}`)
      lines.push(`Members: ${stats.members} (${(stats.members / stats.total * 100).toFixed(1)}%)`)
      lines.push(`Non-Members: ${stats.nonMembers} (${(stats.nonMembers / stats.total * 100).toFixed(1)}%)`)
      lines.push(`Unknown: ${stats.unknowns} (${(stats.unknowns / stats.total * 100).toFixed(1)}%)`)
      lines.push('')
      lines.push('Category,Total,Members,Non-Members,Unknown,Penetration %')
      stats.categoryPenetration.forEach(c => {
        lines.push(`${c.category},${c.total},${c.members},${c.nonMembers},${c.unknowns},${c.penetration.toFixed(1)}%`)
      })
      lines.push('')
      lines.push('Neighborhood,Total,Members,Non-Members,Unknown,Penetration %')
      stats.neighborhoodPenetration.forEach(n => {
        lines.push(`${n.neighborhood},${n.total},${n.members},${n.nonMembers},${n.unknowns},${n.penetration.toFixed(1)}%`)
      })
      downloadBlob(lines.join('\n'), `cgcc_membership_report_${ts}.csv`)
    } else if (preset.type === 'board') {
      // Board summary text report
      const lines = [
        '═══════════════════════════════════════════════',
        'CORAL GABLES CHAMBER OF COMMERCE',
        'BOARD SUMMARY — BUSINESS INTELLIGENCE REPORT',
        `Generated: ${ts}`,
        '═══════════════════════════════════════════════',
        '',
        '── KEY METRICS ──',
        `Total Businesses Tracked: ${stats.total}`,
        `Chamber Members: ${stats.members} (${(stats.members / stats.total * 100).toFixed(1)}%)`,
        `Non-Members: ${stats.nonMembers}`,
        `Unknown Status: ${stats.unknowns}`,
        `Average Rating: ${stats.avgRating.toFixed(2)} / 5.0`,
        `Red Flags: ${stats.redFlagCount} (${stats.criticalFlags} critical)`,
        '',
        '── DATA QUALITY ──',
        `Website Coverage: ${stats.dataQuality.websiteCoverage}%`,
        `Phone Coverage: ${stats.dataQuality.phoneCoverage}%`,
        `Geo Coverage: ${stats.dataQuality.geoCoverage}%`,
        `Rating Coverage: ${stats.dataQuality.ratingCoverage}%`,
        `High Validation Rate: ${stats.dataQuality.highValidationRate}%`,
        '',
        '── TOP CATEGORIES BY COUNT ──',
      ]
      stats.categoryPenetration.slice(0, 10).forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.category.replace(/_/g, ' ')} — ${c.total} businesses, ${c.penetration.toFixed(1)}% penetration`)
      })
      if (marketAnalytics?.marketHealthScore) {
        lines.push('')
        lines.push(`── MARKET HEALTH SCORE: ${marketAnalytics.marketHealthScore} / 100 ──`)
      }
      downloadBlob(lines.join('\n'), `cgcc_board_summary_${ts}.txt`, 'text/plain')
    } else {
      // Standard CSV export
      let data = preset.filter ? filteredBusinesses.filter(preset.filter) : filteredBusinesses
      const fields = preset.fields
      const rows = data.map(b => {
        const row = {}
        fields.forEach(f => {
          let val = b[f]
          if (f === '_recruitBand') val = val?.label || ''
          if (f === '_recruitReasons') val = Array.isArray(val) ? val.join('; ') : val
          if (typeof val === 'boolean') val = val ? 'Yes' : 'No'
          row[f] = val
        })
        return row
      })
      const csv = buildCSV(fields, rows)
      downloadBlob(csv, `cgcc_${preset.id}_${ts}.csv`)
    }

    setCompleted(prev => [...prev, preset.id])
    setExporting(null)
  }

  return (
    <RoleGate permission="export_data" blur>
      <div className="space-y-6 animate-fade-in">
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Download size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Exports</h1>
                <p className="text-slate-400 text-sm">Download data, generate reports, and export insights for leadership and stakeholders</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FILTER BAR ═══ */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter size={13} />
            <span>Filter exports:</span>
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
            <option value="">All Categories</option>
            {stats?.categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select value={neighborhoodFilter} onChange={(e) => setNeighborhoodFilter(e.target.value)}
            className="text-xs bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 text-slate-300 focus:border-amber-500/50 outline-none">
            <option value="">All Neighborhoods</option>
            {stats?.neighborhoods.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {(categoryFilter || neighborhoodFilter) && (
            <span className="text-xs text-amber-400 font-mono">{filteredBusinesses.length} businesses</span>
          )}
        </div>

        {/* ═══ REPORT CARDS GRID ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_PRESETS.map(preset => {
            const Icon = preset.icon
            const hasAccess = !preset.permission || can(preset.permission)
            const isExporting = exporting === preset.id
            const isDone = completed.includes(preset.id)

            return (
              <div key={preset.id}
                className={`relative bg-slate-900/40 border rounded-xl overflow-hidden transition-all ${
                  isDone ? 'border-emerald-500/30' : 'border-slate-800/60 hover:border-slate-700/80'
                }`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${preset.iconBg}`}>
                      <Icon size={18} className={preset.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm mb-1">{preset.label}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">{preset.description}</p>

                      {hasAccess ? (
                        <button onClick={() => handleExport(preset)} disabled={isExporting}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                            isDone
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : isExporting
                                ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-wait'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                          }`}>
                          {isDone ? <><CheckCircle size={13} /> Downloaded</> :
                           isExporting ? <><Loader2 size={13} className="animate-spin" /> Generating...</> :
                           <><Download size={13} /> Export {preset.type === 'board' ? 'TXT' : 'CSV'}</>}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Requires elevated access</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ═══ CUSTOM EXPORT ═══ */}
        <div className="relative bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/40" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                <FileSpreadsheet size={14} className="text-slate-400" />
              </div>
              <h3 className="font-semibold text-white text-sm">Custom Filtered Export</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Use the filter bar above to narrow by category and neighborhood, then export the filtered set.
            </p>
            <button onClick={() => {
              const fields = ['business_name', 'category_primary', 'neighborhood_area', '_memberStatus', '_rating', '_reviewCount', '_confidence', '_validationTier', 'phone', 'website_url', 'formatted_address']
              const rows = filteredBusinesses.map(b => {
                const row = {}
                fields.forEach(f => { row[f] = b[f] ?? '' })
                return row
              })
              const csv = buildCSV(fields, rows)
              const ts = new Date().toISOString().split('T')[0]
              downloadBlob(csv, `cgcc_custom_export_${ts}.csv`)
            }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all">
              <Download size={13} /> Export Filtered ({filteredBusinesses.length} records)
            </button>
          </div>
        </div>
      </div>
    </RoleGate>
  )
}
