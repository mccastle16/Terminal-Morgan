import { useState, useEffect, useMemo } from 'react'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value) {
  if (!value) return 'N/A'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function capScore(score) {
  return Math.min(score || 0, 100)
}

function calculateOpportunityAlpha(business) {
  const painCount = business.pain_point_count || 0
  const oppCount = business.opportunity_count || 0
  const completeness = business.data_completeness || 0.5
  const score = capScore(business.engagement_score)

  const growthPotential = (100 - score) / 100
  const painFactor = Math.min(painCount * 10, 40)
  const oppFactor = Math.min(oppCount * 8, 30)
  const dataFactor = completeness * 20

  return Math.round(growthPotential * 30 + painFactor + oppFactor + dataFactor)
}

function calculateDigitalMaturity(business) {
  let score = 0
  if (business.website) score += 25
  if (business.social_media?.instagram) score += 20
  if (business.social_media?.facebook) score += 15
  if (business.email?.length > 0) score += 15
  if (business.ratings?.google) score += 15
  if (business.ratings?.yelp) score += 10
  return Math.min(score, 100)
}

function generateThesis(business) {
  const category = business.category?.replace(/_/g, ' ') || 'business'
  const specialties = business.specialties?.slice(0, 2).join(' and ') || business.services?.slice(0, 2).join(' and ')

  if (specialties) {
    return `${category.charAt(0).toUpperCase() + category.slice(1)} specializing in ${specialties}`
  }
  if (business.subcategory) {
    return `${business.subcategory.replace(/_/g, ' ')} ${category} in Coral Gables`
  }
  return `Local ${category} serving the Coral Gables community`
}

function generateOutreachScript(business) {
  const painPoints = business.pain_points || []
  const mainPain = painPoints[0]?.pain_point || painPoints[0]?.point || 'operational efficiency'
  const category = business.category?.replace(/_/g, ' ') || 'business'

  return `SUBJECT: Quick Question re: ${business.name}

Hi Owner,

I'm a local strategist in Coral Gables, walking by ${business.name}, ${category.toLowerCase()}.

I noticed you're dealing with ${mainPain.toLowerCase()}.

We built a tool that solves this by [INSERT SOLUTION].

Are you around Tuesday?`
}

function getFitLevel(business) {
  const alpha = calculateOpportunityAlpha(business)
  if (alpha >= 60) return { label: 'HIGH', color: 'text-green' }
  if (alpha >= 40) return { label: 'MED', color: 'text-gold' }
  return { label: 'LOW', color: 'text-muted' }
}

// ============================================================================
// SMART SEGMENTS
// ============================================================================

const SMART_SEGMENTS = [
  { id: 'all', name: 'All Targets', icon: null, filter: () => true },
  {
    id: 'hidden_gems', name: 'Hidden Gems', subtitle: 'High Value, No Tech', icon: '💎',
    filter: (b) => capScore(b.engagement_score) >= 80 && calculateDigitalMaturity(b) < 50
  },
  {
    id: 'turnaround', name: 'Turnaround', subtitle: 'High Pain, Low Rev', icon: '🔄',
    filter: (b) => (b.pain_point_count || 0) >= 2 && capScore(b.engagement_score) < 75
  },
  {
    id: 'local_titans', name: 'Local Titans', subtitle: 'High All', icon: '👑',
    filter: (b) => capScore(b.engagement_score) >= 90 && calculateDigitalMaturity(b) >= 60
  }
]

const SECTORS = [
  { id: 'all', name: 'All Sectors' },
  { id: 'restaurant', name: 'Dining' },
  { id: 'retail', name: 'Retail' },
  { id: 'professional_services', name: 'Professional' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'spa', name: 'Salons & Spas' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'financial_services', name: 'Financial' },
  { id: 'nonprofit', name: 'Nonprofit' },
  { id: 'real_estate', name: 'Real Estate' }
]

// ============================================================================
// HEADER
// ============================================================================

function Header({ businessCount, targetCount }) {
  return (
    <header className="h-12 bg-[#0a0a0a] border-b border-[#222] px-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="live-dot" />
        <span className="font-mono font-bold">CO_TERMINAL</span>
        <span className="text-muted text-xs font-mono hidden sm:inline">// V5.0 HUNTER</span>
      </div>
      <div className="text-xs font-mono text-muted uppercase tracking-wide">
        <span className="hidden sm:inline">CORAL GABLES • </span>{targetCount} TARGETS
      </div>
    </header>
  )
}

// ============================================================================
// LEFT SIDEBAR
// ============================================================================

function LeftSidebar({ segment, onSegmentChange, sector, onSectorChange, isMobileOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-56 bg-[#0a0a0a] border-r border-[#222] flex flex-col flex-shrink-0 p-3
        transform transition-transform lg:transform-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Smart Segments</div>
        <div className="space-y-1 mb-6">
          {SMART_SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              onClick={() => { onSegmentChange(seg.id); onClose(); }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors
                ${segment === seg.id ? 'bg-[#1a1a1a] text-white border border-[#333]' : 'text-muted hover:text-white hover:bg-[#111]'}`}
            >
              <div className="flex items-center gap-2">
                {seg.icon && <span>{seg.icon}</span>}
                <span>{seg.name}</span>
              </div>
              {seg.subtitle && <div className="text-xs text-muted mt-0.5 ml-6">{seg.subtitle}</div>}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Sector</div>
        <div className="space-y-0.5 overflow-y-auto flex-1">
          {SECTORS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => { onSectorChange(sec.id); onClose(); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors rounded
                ${sector === sec.id ? 'bg-cyan text-black font-semibold' : 'text-muted hover:text-white'}`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}

// ============================================================================
// QUADRANT CHART - Plots ALL businesses
// ============================================================================

function QuadrantChart({ businesses, onSelect, activeId }) {
  // Plot businesses based on actual Dominance (engagement) and Digital maturity
  const plotData = useMemo(() => {
    return businesses.slice(0, 200).map(b => ({
      business: b,
      x: calculateDigitalMaturity(b), // 0-100, left to right
      y: capScore(b.engagement_score), // 0-100, bottom to top
    }))
  }, [businesses])

  return (
    <div className="h-48 border-b border-[#222] relative bg-[#0a0a0a] hidden md:block">
      {/* Quadrant labels */}
      <div className="absolute top-1 left-2 text-[10px] font-mono text-muted">HIGH DOM / LOW DIG</div>
      <div className="absolute top-1 right-2 text-[10px] font-mono text-muted text-right">HIGH DOM / HIGH DIG</div>
      <div className="absolute bottom-1 left-2 text-[10px] font-mono text-dim">LOW DOM / LOW DIG</div>
      <div className="absolute bottom-1 right-2 text-[10px] font-mono text-dim text-right">LOW DOM / HIGH DIG</div>

      {/* Grid lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-[#222]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-full w-px bg-[#222]" />
      </div>

      {/* Plot points */}
      {plotData.map(({ business, x, y }) => {
        const isActive = activeId === business.business_id
        const isHighValue = y >= 50 && x < 50 // High dominance, low digital = hidden gem

        return (
          <div
            key={business.business_id}
            className={`absolute rounded-full cursor-pointer transition-all
              ${isActive ? 'w-3 h-3 ring-2 ring-white z-10' : 'w-1.5 h-1.5 hover:w-3 hover:h-3 hover:z-10'}
              ${isHighValue ? 'bg-cyan' : 'bg-green'}`}
            style={{
              left: `${Math.max(5, Math.min(95, x))}%`,
              bottom: `${Math.max(5, Math.min(95, y))}%`,
              transform: 'translate(-50%, 50%)'
            }}
            onClick={() => onSelect(business)}
            title={`${business.name} (Score: ${y}, Digital: ${x})`}
          />
        )
      })}
    </div>
  )
}

// ============================================================================
// ENTITY TABLE
// ============================================================================

function EntityTable({ businesses, activeId, onSelect, onMenuClick }) {
  return (
    <div className="flex-1 flex flex-col bg-[#050505] min-w-0">
      {/* Mobile menu button */}
      <div className="lg:hidden p-2 border-b border-[#222]">
        <button onClick={onMenuClick} className="text-xs font-mono text-muted px-3 py-1 border border-[#333] rounded">
          ☰ Filters
        </button>
      </div>

      <QuadrantChart businesses={businesses} onSelect={onSelect} activeId={activeId} />

      {/* Entity Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0a0a0a] border-b border-[#222]">
            <tr className="text-xs font-mono text-muted uppercase">
              <th className="text-left p-2 sm:p-3">Entity Name</th>
              <th className="text-left p-2 sm:p-3 hidden sm:table-cell">Sector</th>
              <th className="text-center p-2 sm:p-3">Alpha</th>
              <th className="text-center p-2 sm:p-3">Fit</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => {
              const alpha = calculateOpportunityAlpha(b)
              const fit = getFitLevel(b)
              const isActive = activeId === b.business_id

              return (
                <tr
                  key={b.business_id}
                  onClick={() => onSelect(b)}
                  className={`border-b border-[#1a1a1a] cursor-pointer transition-colors
                    ${isActive ? 'bg-[#141414]' : 'hover:bg-[#111]'}`}
                >
                  <td className="p-2 sm:p-3 text-sm truncate max-w-[150px] sm:max-w-none">{b.name}</td>
                  <td className="p-2 sm:p-3 text-sm text-muted hidden sm:table-cell">{b.category?.replace(/_/g, ' ')}</td>
                  <td className="p-2 sm:p-3 text-center">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs sm:text-sm
                      ${alpha >= 60 ? 'bg-cyan/20 text-cyan' : alpha >= 40 ? 'bg-gold/20 text-gold' : 'bg-[#222] text-muted'}`}>
                      {alpha}
                    </span>
                  </td>
                  <td className={`p-2 sm:p-3 text-center text-xs font-mono ${fit.color}`}>
                    {fit.label}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="p-3 text-xs text-muted font-mono border-t border-[#222]">
          Showing {businesses.length} businesses
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// BUSINESS DOSSIER - Enhanced with more fields
// ============================================================================

function BusinessDossier({ business, onClose }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  if (!business) {
    return (
      <div className="w-80 bg-[#0a0a0a] items-center justify-center text-muted flex-shrink-0 hidden lg:flex">
        <div className="text-xs font-mono uppercase tracking-wide">Select a target</div>
      </div>
    )
  }

  const alpha = calculateOpportunityAlpha(business)
  const digitalMaturity = calculateDigitalMaturity(business)
  const marketPower = capScore(business.engagement_score)
  const thesis = generateThesis(business)
  const script = generateOutreachScript(business)
  const painPoints = business.pain_points || []
  const opportunities = business.opportunities || []
  const solutions = business.co_fit_solutions || []
  const techGaps = business.technology_gaps || []

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className={`
      fixed lg:relative inset-0 lg:inset-auto z-50 lg:z-auto
      w-full lg:w-96 bg-[#0a0a0a] border-l border-[#222] flex flex-col flex-shrink-0 overflow-hidden
      ${business ? 'block' : 'hidden lg:block'}
    `}>
      {/* Mobile close button */}
      <div className="lg:hidden p-3 border-b border-[#222] flex justify-between items-center">
        <span className="font-mono text-sm">Business Details</span>
        <button onClick={onClose} className="text-muted hover:text-white">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222]">
        {['overview', 'intel', 'action'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-mono uppercase tracking-wide transition-colors
              ${activeTab === tab ? 'text-cyan border-b-2 border-cyan' : 'text-muted hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Header - Always visible */}
        <h2 className="text-xl font-bold mb-1">{business.name}</h2>
        <div className="text-xs text-muted mb-3">
          {business.address?.street && `${business.address.street}, `}
          {business.address?.city || 'Coral Gables'}, {business.address?.state || 'FL'}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-0.5 text-xs font-mono bg-cyan text-black rounded">
            {business.category?.toUpperCase().replace(/_/g, ' ')}
          </span>
          {business.subcategory && (
            <span className="px-2 py-0.5 text-xs font-mono bg-[#222] text-muted rounded">
              {business.subcategory.replace(/_/g, ' ')}
            </span>
          )}
          {business.chamber_membership?.is_member && (
            <span className="px-2 py-0.5 text-xs font-mono bg-green/20 text-green rounded">
              CHAMBER
            </span>
          )}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Thesis */}
            <div className="mb-4">
              <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Thesis</div>
              <div className="text-sm">{thesis}</div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#111] p-3 rounded text-center">
                <div className="text-xl font-mono font-bold text-cyan">{alpha}</div>
                <div className="text-[10px] text-muted uppercase">Alpha</div>
              </div>
              <div className="bg-[#111] p-3 rounded text-center">
                <div className="text-xl font-mono font-bold text-green">{digitalMaturity}</div>
                <div className="text-[10px] text-muted uppercase">Digital</div>
              </div>
              <div className="bg-[#111] p-3 rounded text-center">
                <div className="text-xl font-mono font-bold text-gold">{marketPower}</div>
                <div className="text-[10px] text-muted uppercase">Power</div>
              </div>
            </div>

            {/* Business Info */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-mono text-muted uppercase tracking-wide">Business Info</div>
              {business.owner && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Owner</span>
                  <span>{business.owner}</span>
                </div>
              )}
              {business.founded && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Founded</span>
                  <span>{business.founded}</span>
                </div>
              )}
              {business.years_in_business && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Years Active</span>
                  <span>{business.years_in_business} years</span>
                </div>
              )}
              {business.district && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">District</span>
                  <span className="text-cyan">{business.district.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {/* Ratings */}
            {business.ratings && (
              <div className="mb-4">
                <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Ratings</div>
                <div className="flex gap-4">
                  {business.ratings.google && (
                    <div>
                      <span className="text-lg font-mono font-bold text-gold">{business.ratings.google}</span>
                      <span className="text-xs text-muted ml-1">Google</span>
                    </div>
                  )}
                  {business.ratings.yelp && (
                    <div>
                      <span className="text-lg font-mono font-bold text-accent">{business.ratings.yelp}</span>
                      <span className="text-xs text-muted ml-1">Yelp</span>
                    </div>
                  )}
                  {business.reviews?.total && (
                    <div>
                      <span className="text-lg font-mono font-bold">{business.reviews.total}</span>
                      <span className="text-xs text-muted ml-1">Reviews</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="mb-4">
              <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Contact</div>
              <div className="space-y-1 text-sm">
                {business.website && <div className="text-cyan truncate">{business.website}</div>}
                {business.phone?.length > 0 && <div className="text-muted">{business.phone[0]}</div>}
                {business.email?.length > 0 && <div className="text-muted truncate">{business.email[0]}</div>}
              </div>
            </div>

            {/* Services */}
            {business.services?.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Services</div>
                <div className="flex flex-wrap gap-1">
                  {business.services.slice(0, 6).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-[#1a1a1a] text-muted rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'intel' && (
          <>
            {/* Pain Points */}
            <div className="mb-4">
              <div className="text-xs font-mono text-accent uppercase tracking-wide mb-2">
                Detected Friction ({painPoints.length})
              </div>
              {painPoints.length > 0 ? (
                <div className="space-y-2">
                  {painPoints.map((pp, i) => (
                    <div key={i} className="bg-[#111] p-2 rounded border-l-2 border-accent">
                      <div className="text-sm">{pp.pain_point || pp.point}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs text-muted">{pp.category}</span>
                        <span className="text-xs px-1 bg-[#222] text-accent rounded">{pp.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">No pain points detected</div>
              )}
            </div>

            {/* Opportunities */}
            <div className="mb-4">
              <div className="text-xs font-mono text-green uppercase tracking-wide mb-2">
                Opportunities ({opportunities.length})
              </div>
              {opportunities.length > 0 ? (
                <div className="space-y-2">
                  {opportunities.map((opp, i) => (
                    <div key={i} className="bg-[#111] p-2 rounded border-l-2 border-green">
                      <div className="text-sm">{opp.opportunity}</div>
                      <div className="text-xs text-muted mt-1">{opp.potential_impact} impact</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">No opportunities identified</div>
              )}
            </div>

            {/* Tech Gaps */}
            {techGaps.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-mono text-orange uppercase tracking-wide mb-2">
                  Technology Gaps
                </div>
                <div className="bg-[#111] p-2 rounded font-mono text-xs text-orange">
                  {techGaps.map((gap, i) => (
                    <div key={i}>&gt; {gap}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Solutions */}
            {solutions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-mono text-cyan uppercase tracking-wide mb-2">
                  Recommended Solutions
                </div>
                <div className="space-y-2">
                  {solutions.map((sol, i) => (
                    <div key={i} className="bg-[#111] p-2 rounded">
                      <div className="text-sm font-semibold">{sol.solution_name || sol.solution}</div>
                      {sol.estimated_impact && (
                        <div className="text-xs text-green mt-1">{sol.estimated_impact}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Financials */}
            {business.estimated_revenue && (
              <div className="mb-4">
                <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Est. Financials</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Revenue</span>
                    <span className="text-gold">{formatCurrency(business.estimated_revenue.low)} - {formatCurrency(business.estimated_revenue.high)}</span>
                  </div>
                  {business.estimated_employees && (
                    <div className="flex justify-between">
                      <span className="text-muted">Employees</span>
                      <span>{business.estimated_employees.low} - {business.estimated_employees.high}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'action' && (
          <>
            {/* Execution Mode */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gold">⚡</span>
                <span className="text-xs font-mono text-gold uppercase tracking-wide">Execution Mode</span>
              </div>
              <div className="bg-[#111] border border-[#222] rounded p-3 text-xs font-mono whitespace-pre-wrap text-muted mb-4">
                {script}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyScript}
                  className="flex-1 py-2 text-xs font-mono uppercase bg-accent hover:bg-accent/80 text-white rounded"
                >
                  {copied ? 'Copied!' : 'Copy Script'}
                </button>
                <button className="flex-1 py-2 text-xs font-mono uppercase border border-[#333] text-muted hover:text-white rounded">
                  Log to CRM
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Quick Actions</div>
              <div className="space-y-2">
                {business.website && (
                  <a href={`https://${business.website}`} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2 text-xs font-mono text-center border border-[#333] text-cyan hover:bg-[#111] rounded">
                    Visit Website →
                  </a>
                )}
                {business.phone?.length > 0 && (
                  <a href={`tel:${business.phone[0]}`}
                    className="block w-full py-2 text-xs font-mono text-center border border-[#333] text-green hover:bg-[#111] rounded">
                    Call Business →
                  </a>
                )}
              </div>
            </div>

            {/* Claim Business */}
            <div className="border-t border-[#222] pt-4">
              <div className="text-sm font-semibold mb-1">Own this business?</div>
              <div className="text-xs text-muted mb-3">Claim it to update information</div>
              <button className="w-full py-2 text-xs font-mono uppercase border border-cyan text-cyan hover:bg-cyan/10 rounded">
                Claim Business
              </button>
            </div>
          </>
        )}
      </div>

      {/* Data source footer */}
      <div className="p-3 border-t border-[#222] text-[10px] text-muted">
        Sources: {(business.data_sources || []).slice(0, 3).join(' • ')} | Updated: {business.last_updated ? new Date(business.last_updated).toLocaleDateString() : 'N/A'}
      </div>
    </aside>
  )
}

// ============================================================================
// MAIN TERMINAL
// ============================================================================

export default function Terminal() {
  const [allBusinesses, setAllBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState('all')
  const [sector, setSector] = useState('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/v2/businesses?limit=1000')
        const data = await res.json()
        setAllBusinesses(data)
      } catch (error) {
        console.error('Failed to fetch businesses:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredBusinesses = useMemo(() => {
    let result = [...allBusinesses]

    const segmentConfig = SMART_SEGMENTS.find(s => s.id === segment)
    if (segmentConfig?.filter) {
      result = result.filter(segmentConfig.filter)
    }

    if (sector !== 'all') {
      result = result.filter(b =>
        b.category?.toLowerCase() === sector.toLowerCase() ||
        b.category?.toLowerCase().includes(sector.toLowerCase())
      )
    }

    result.sort((a, b) => calculateOpportunityAlpha(b) - calculateOpportunityAlpha(a))
    return result // No limit - show all
  }, [allBusinesses, segment, sector])

  const handleSelect = async (business) => {
    try {
      const res = await fetch(`/api/v2/businesses/${encodeURIComponent(business.business_id)}`)
      const fullData = await res.json()
      setSelectedBusiness(fullData)
    } catch (error) {
      setSelectedBusiness(business)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="live-dot mx-auto mb-4" style={{ width: 12, height: 12 }} />
          <div className="font-mono text-muted uppercase tracking-wide text-sm">Initializing Terminal...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#050505]">
      <Header businessCount={allBusinesses.length} targetCount={filteredBusinesses.length} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          segment={segment}
          onSegmentChange={setSegment}
          sector={sector}
          onSectorChange={setSector}
          isMobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <EntityTable
          businesses={filteredBusinesses}
          activeId={selectedBusiness?.business_id}
          onSelect={handleSelect}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <BusinessDossier
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
        />
      </div>
    </div>
  )
}
