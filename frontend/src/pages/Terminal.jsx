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

function formatPhone(phones) {
  if (!phones || phones.length === 0) return null
  const phone = phones[0]
  if (typeof phone === 'string') return phone
  return phone.number || phone
}

function getScoreClass(score) {
  const s = Math.min(score, 100)
  if (s >= 90) return 'score-high'
  if (s >= 70) return 'score-med'
  return 'score-low'
}

function capScore(score) {
  return Math.min(score || 0, 100)
}

function getTierClass(tier) {
  return `tier-${tier || 4}`
}

function getGrade(value, type = 'default') {
  if (type === 'rating') {
    if (value >= 4.5) return 'A'
    if (value >= 4.0) return 'B'
    if (value >= 3.5) return 'C'
    return 'D'
  }
  if (type === 'sentiment') {
    if (value >= 0.7) return 'A'
    if (value >= 0.5) return 'B'
    if (value >= 0.3) return 'C'
    return 'D'
  }
  if (type === 'completeness') {
    if (value >= 0.8) return 'A'
    if (value >= 0.6) return 'B'
    if (value >= 0.4) return 'C'
    return 'D'
  }
  return 'B'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Header({ businessCount, onDownload }) {
  return (
    <header className="h-12 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222] px-4 flex items-center justify-between flex-shrink-0 z-50">
      <div className="flex items-center gap-2 font-mono font-bold tracking-tight">
        <div className="live-dot" />
        <span>CO_ TERMINAL</span>
        <span className="text-muted text-sm">v4.0</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs font-mono text-muted uppercase tracking-wide hide-mobile">
          {businessCount} ENTITIES // CORAL GABLES
        </div>
        <button onClick={onDownload} className="btn btn-outline text-xs">
          Export JSON
        </button>
      </div>
    </header>
  )
}

function FilterBar({ filter, onFilterChange, searchQuery, onSearchChange }) {
  return (
    <div className="p-3 border-b border-[#222] space-y-3">
      <input
        type="text"
        placeholder="Search businesses..."
        className="input text-sm"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex gap-2">
        {['all', 'opportunities', 'risk'].map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`filter-btn flex-1 ${filter === f ? 'active' : ''}`}
          >
            {f === 'all' ? 'All' : f === 'opportunities' ? 'Opps' : 'Risk'}
          </button>
        ))}
      </div>
    </div>
  )
}

function EntityRow({ business, isActive, onClick }) {
  const score = business.engagement_score || 0
  const scoreClass = getScoreClass(score)

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-[#1a1a1a] cursor-pointer transition-colors
        ${isActive ? 'bg-[#141414] border-l-2 border-l-[#00F0FF]' : 'hover:bg-[#111]'}`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{business.name}</div>
          <div className="text-xs text-muted mt-0.5 truncate">
            {business.category} {business.district && `• ${business.district}`}
          </div>
        </div>
        <div className={`alpha-badge ${scoreClass} ml-2 flex-shrink-0`}>
          {capScore(score).toFixed(0)}
        </div>
      </div>
    </div>
  )
}

function EntityList({ businesses, activeId, onSelect, filter, onFilterChange, searchQuery, onSearchChange }) {
  return (
    <aside className="w-72 bg-[#0a0a0a] border-r border-[#222] flex flex-col flex-shrink-0">
      <FilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />
      <div className="flex-1 overflow-y-auto">
        {businesses.map((b) => (
          <EntityRow
            key={b.business_id}
            business={b}
            isActive={activeId === b.business_id}
            onClick={() => onSelect(b)}
          />
        ))}
        {businesses.length === 0 && (
          <div className="p-4 text-center text-muted text-sm">
            No businesses found
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[#222] text-xs text-muted font-mono">
        {businesses.length} results
      </div>
    </aside>
  )
}

function GradeBox({ label, grade }) {
  return (
    <div className="bg-[#0e0e0e] border border-[#222] p-4 rounded-md flex flex-col items-center">
      <div className={`grade-circle grade-${grade}`}>{grade}</div>
      <div className="text-xs text-muted mt-2 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function DataRow({ label, value, highlight }) {
  return (
    <div className="data-row">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className={`font-mono font-semibold ${highlight || ''}`}>{value}</span>
    </div>
  )
}

function LockedSection({ business, isRevealed, onUnlock, unlockLog }) {
  const phone = formatPhone(business.phone)
  const revenue = business.estimated_revenue
  const employees = business.estimated_employees
  const techGaps = business.technology_gaps || []
  const painPoints = business.pain_points || []

  return (
    <div className={`mt-6 border border-dashed border-[#333] bg-[#080808] rounded-lg relative overflow-hidden ${isRevealed ? 'revealed' : ''}`}>
      {!isRevealed && (
        <div className="absolute inset-0 bg-[#050505]/80 z-10 flex flex-col items-center justify-center">
          <svg className="mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <button onClick={onUnlock} className="btn btn-primary">
            Decrypt Dossier
          </button>
          {unlockLog && (
            <div className="console-text mt-3 text-xs">{unlockLog}</div>
          )}
        </div>
      )}

      <div className={`p-5 ${!isRevealed ? 'blur-data' : ''}`}>
        <DataRow
          label="Est. Revenue"
          value={revenue ? `${formatCurrency(revenue.low)} - ${formatCurrency(revenue.high)}` : 'N/A'}
          highlight="text-gold"
        />
        <DataRow
          label="Est. Employees"
          value={employees ? `${employees.low} - ${employees.high}` : 'N/A'}
        />
        <DataRow
          label="Direct Phone"
          value={phone || 'Not available'}
          highlight="text-cyan"
        />
        <DataRow
          label="Website"
          value={business.website || 'N/A'}
          highlight="text-cyan"
        />
        {business.email && business.email.length > 0 && (
          <DataRow
            label="Email"
            value={business.email[0]}
          />
        )}

        {techGaps.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Technology Gaps</div>
            <div className="bg-[#111] p-3 rounded font-mono text-xs text-orange">
              {techGaps.map((gap, i) => (
                <div key={i} className="mb-1">&gt; {gap}</div>
              ))}
            </div>
          </div>
        )}

        {painPoints.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Pain Points Detected</div>
            <div className="space-y-2">
              {painPoints.slice(0, 4).map((pp, i) => (
                <div key={i} className="bg-[#111] p-3 rounded border-l-2 border-accent">
                  <div className="text-sm">{pp.pain_point || pp.point}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted">{pp.category}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#222] text-accent">{pp.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ClaimBanner({ businessName }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="mt-6 border border-[#333] bg-[#0a0a0a] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Own this business?</div>
          <div className="text-xs text-muted mt-1">Claim it to update information and respond to insights</div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-outline text-xs"
        >
          {showForm ? 'Cancel' : 'Claim Business'}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 pt-4 border-t border-[#222] space-y-3">
          <input type="text" placeholder="Your name" className="input" />
          <input type="email" placeholder="Business email" className="input" />
          <input type="tel" placeholder="Phone number" className="input" />
          <button className="btn btn-primary w-full">Submit Claim Request</button>
          <p className="text-xs text-muted text-center">We'll verify ownership and contact you within 48 hours</p>
        </div>
      )}
    </div>
  )
}

function BusinessDossier({ business }) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [unlockLog, setUnlockLog] = useState('')

  // Reset reveal state when business changes
  useEffect(() => {
    setIsRevealed(false)
    setUnlockLog('')
  }, [business?.business_id])

  const handleUnlock = () => {
    const steps = [
      "INITIATING HANDSHAKE...",
      "QUERYING OSINT SOURCES...",
      "VALIDATING DATA...",
      "CROSS-REFERENCING...",
      "DECRYPTING PAYLOAD...",
      "ACCESS GRANTED."
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval)
        setIsRevealed(true)
      } else {
        setUnlockLog(steps[i])
        i++
      }
    }, 250)
  }

  if (!business) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted">
        <div className="font-mono text-xl mb-2">AWAITING TARGET</div>
        <div className="text-xs uppercase tracking-wide">Select an entity to initialize scan</div>
      </div>
    )
  }

  const avgRating = business.ratings?.average || business.ratings?.google || 0
  const sentiment = business.sentiment?.positive || 0
  const completeness = business.data_completeness || 0
  const opportunities = business.opportunities || []
  const solutions = business.co_fit_solutions || []

  // Generate a sample review/sentiment quote
  const sentimentQuote = business.reviews?.sample?.[0] ||
    (avgRating > 4.5 ? "Consistently excellent service and quality. A local favorite." :
     avgRating > 4.0 ? "Great experience overall with minor areas for improvement." :
     avgRating > 3.5 ? "Good but inconsistent. Has potential for growth." :
     "Mixed reviews suggest operational challenges.")

  return (
    <main className="flex-1 overflow-y-auto bg-[#050505]">
      <div className="max-w-4xl mx-auto p-8" style={{ animation: 'slideUp 0.3s ease forwards' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-mono font-bold">{business.name}</h1>
          <div className="text-xs font-mono text-muted">ID: {business.business_id?.slice(0, 8)}</div>
        </div>

        <div className="text-xs text-muted uppercase tracking-wide mb-6">
          {business.category?.replace(/_/g, ' ')}
          {business.subcategory && ` // ${business.subcategory.replace(/_/g, ' ')}`}
          {business.owner && ` // ${business.owner}`}
        </div>

        {/* Hero Stats */}
        <div className="flex gap-4 mb-6">
          <div className="hero-stat">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Market Score</div>
            <div className="text-2xl font-mono font-bold">{capScore(business.engagement_score).toFixed(0)}/100</div>
          </div>
          <div className="hero-stat">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Priority Tier</div>
            <div className={`text-2xl font-mono font-bold ${business.priority_tier === 1 ? 'text-green' : business.priority_tier === 2 ? 'text-cyan' : 'text-gold'}`}>
              Tier {business.priority_tier || 4}
            </div>
          </div>
          <div className="hero-stat">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Data Quality</div>
            <div className="text-2xl font-mono font-bold">{(completeness * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Digital Health Scorecard */}
        <div className="text-xs font-mono text-muted uppercase tracking-wide mb-3">Digital Health Scorecard</div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <GradeBox label="Rating" grade={getGrade(avgRating, 'rating')} />
          <GradeBox label="Sentiment" grade={getGrade(sentiment, 'sentiment')} />
          <GradeBox label="Data" grade={getGrade(completeness, 'completeness')} />
        </div>

        {/* Location & Hours */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Location</div>
            <div className="text-sm">
              {business.address?.street && <div>{business.address.street}</div>}
              <div>{business.address?.city || 'Coral Gables'}, {business.address?.state || 'FL'} {business.address?.zip}</div>
              {business.district && <div className="text-cyan mt-1">{business.district.replace(/_/g, ' ')}</div>}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Operations</div>
            <div className="text-sm space-y-1">
              {business.founded && <div>Founded: {business.founded}</div>}
              {business.years_in_business && <div>{business.years_in_business} years in business</div>}
              {business.chamber_membership?.is_member && (
                <div className="text-green">Chamber Member</div>
              )}
            </div>
          </div>
        </div>

        {/* Ratings Detail */}
        {business.ratings && (
          <div className="card p-4 mb-6">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-3">Ratings & Reviews</div>
            <div className="grid grid-cols-3 gap-4">
              {business.ratings.google && (
                <div>
                  <div className="text-2xl font-mono font-bold text-gold">{business.ratings.google}</div>
                  <div className="text-xs text-muted">Google</div>
                </div>
              )}
              {business.ratings.yelp && (
                <div>
                  <div className="text-2xl font-mono font-bold text-accent">{business.ratings.yelp}</div>
                  <div className="text-xs text-muted">Yelp</div>
                </div>
              )}
              {business.reviews?.total && (
                <div>
                  <div className="text-2xl font-mono font-bold">{business.reviews.total}</div>
                  <div className="text-xs text-muted">Total Reviews</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sentiment Quote */}
        <div className="sentiment-box mb-6">
          {sentimentQuote}
        </div>

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-3">
              Growth Opportunities ({opportunities.length})
            </div>
            <div className="space-y-2">
              {opportunities.map((opp, i) => (
                <div key={i} className="card p-3 border-l-2 border-l-green">
                  <div className="text-sm">{opp.opportunity}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted">{opp.category}</span>
                    {opp.potential_impact && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#222] text-green">
                        {opp.potential_impact} impact
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solutions */}
        {solutions.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-3">
              Recommended Solutions ({solutions.length})
            </div>
            <div className="grid grid-cols-2 gap-3">
              {solutions.slice(0, 4).map((sol, i) => (
                <div key={i} className="card p-3">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold">{sol.solution_name || sol.solution || sol.name}</div>
                    {sol.priority && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-cyan/20 text-cyan">#{sol.priority}</span>
                    )}
                  </div>
                  {sol.description && (
                    <div className="text-xs text-muted mt-1">{sol.description}</div>
                  )}
                  {sol.estimated_impact && (
                    <div className="text-xs text-green mt-2">{sol.estimated_impact}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Intel Section */}
        <LockedSection
          business={business}
          isRevealed={isRevealed}
          onUnlock={handleUnlock}
          unlockLog={unlockLog}
        />

        {/* Claim Business */}
        <ClaimBanner businessName={business.name} />

        {/* Data Sources */}
        <div className="mt-6 pt-4 border-t border-[#222]">
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="font-mono uppercase tracking-wide">
              Sources: {(business.data_sources || []).join(' • ')}
            </div>
            <div>
              Last updated: {business.last_updated ? new Date(business.last_updated).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ============================================================================
// MAIN TERMINAL COMPONENT
// ============================================================================

export default function Terminal() {
  const [businesses, setBusinesses] = useState([])
  const [allBusinesses, setAllBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all businesses on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/v2/businesses?limit=1000')
        const data = await res.json()
        setAllBusinesses(data)
        setBusinesses(data)
      } catch (error) {
        console.error('Failed to fetch businesses:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let result = [...allBusinesses]

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.district?.toLowerCase().includes(q)
      )
    }

    // Apply filter
    if (filter === 'opportunities') {
      // High opportunity: has identified opportunities OR high score with solutions
      result = result.filter(b => (b.opportunity_count || 0) > 0 && (b.solution_count || 0) > 0)
    } else if (filter === 'risk') {
      // At risk: low score OR many pain points
      result = result.filter(b => (b.engagement_score || 0) < 80 || (b.pain_point_count || 0) >= 2)
    }

    // Sort by score
    result.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))

    return result
  }, [allBusinesses, filter, searchQuery])

  // Fetch full business details when selected
  const handleSelect = async (business) => {
    try {
      const res = await fetch(`/api/v2/businesses/${encodeURIComponent(business.business_id)}`)
      const fullData = await res.json()
      setSelectedBusiness(fullData)
    } catch (error) {
      console.error('Failed to fetch business details:', error)
      setSelectedBusiness(business)
    }
  }

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allBusinesses, null, 2))
    const el = document.createElement('a')
    el.setAttribute("href", dataStr)
    el.setAttribute("download", "CoralGables_Terminal_Export.json")
    document.body.appendChild(el)
    el.click()
    el.remove()
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="live-dot mx-auto mb-4" style={{ width: 12, height: 12 }} />
          <div className="font-mono text-muted uppercase tracking-wide text-sm">
            Initializing Terminal...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <Header businessCount={allBusinesses.length} onDownload={handleDownload} />
      <div className="flex flex-1 overflow-hidden">
        <EntityList
          businesses={filteredBusinesses}
          activeId={selectedBusiness?.business_id}
          onSelect={handleSelect}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <BusinessDossier business={selectedBusiness} />
      </div>
    </div>
  )
}
