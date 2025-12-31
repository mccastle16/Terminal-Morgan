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
  // Higher alpha = more opportunity
  // Based on: pain points, low digital presence, high market potential
  const painCount = business.pain_point_count || 0
  const oppCount = business.opportunity_count || 0
  const completeness = business.data_completeness || 0.5
  const score = capScore(business.engagement_score)

  // Inverse relationship with current score (lower score = more room to grow)
  const growthPotential = (100 - score) / 100
  // More pain points = more opportunity
  const painFactor = Math.min(painCount * 10, 40)
  // More identified opportunities = higher alpha
  const oppFactor = Math.min(oppCount * 8, 30)
  // Data completeness factor
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
// SMART SEGMENTS - Predefined filter combinations
// ============================================================================

const SMART_SEGMENTS = [
  {
    id: 'all',
    name: 'All Targets',
    icon: null,
    filter: () => true
  },
  {
    id: 'hidden_gems',
    name: 'Hidden Gems',
    subtitle: 'High Value, No Tech',
    icon: '💎',
    filter: (b) => {
      const digital = calculateDigitalMaturity(b)
      const score = capScore(b.engagement_score)
      return score >= 80 && digital < 50
    }
  },
  {
    id: 'turnaround',
    name: 'Turnaround',
    subtitle: 'High Pain, Low Rev',
    icon: '🔄',
    filter: (b) => {
      const painCount = b.pain_point_count || 0
      return painCount >= 2 && capScore(b.engagement_score) < 75
    }
  },
  {
    id: 'local_titans',
    name: 'Local Titans',
    subtitle: 'High All',
    icon: '👑',
    filter: (b) => {
      const score = capScore(b.engagement_score)
      const digital = calculateDigitalMaturity(b)
      return score >= 90 && digital >= 60
    }
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
// SUB-COMPONENTS
// ============================================================================

function Header({ businessCount, targetCount }) {
  return (
    <header className="h-12 bg-[#0a0a0a] border-b border-[#222] px-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="live-dot" />
        <span className="font-mono font-bold">CO_TERMINAL</span>
        <span className="text-muted text-xs font-mono">// V5.0 HUNTER</span>
      </div>
      <div className="text-xs font-mono text-muted uppercase tracking-wide">
        CORAL GABLES • {targetCount} TARGETS
      </div>
    </header>
  )
}

function SmartSegmentButton({ segment, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors
        ${isActive
          ? 'bg-[#1a1a1a] text-white border border-[#333]'
          : 'text-muted hover:text-white hover:bg-[#111]'}`}
    >
      <div className="flex items-center gap-2">
        {segment.icon && <span>{segment.icon}</span>}
        <span>{segment.name}</span>
      </div>
      {segment.subtitle && (
        <div className="text-xs text-muted mt-0.5 ml-6">{segment.subtitle}</div>
      )}
    </button>
  )
}

function SectorButton({ sector, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors rounded
        ${isActive
          ? 'bg-cyan text-black font-semibold'
          : 'text-muted hover:text-white'}`}
    >
      {sector.name}
    </button>
  )
}

function LeftSidebar({ segment, onSegmentChange, sector, onSectorChange }) {
  return (
    <aside className="w-48 bg-[#0a0a0a] border-r border-[#222] flex flex-col flex-shrink-0 p-3">
      <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">
        Smart Segments
      </div>
      <div className="space-y-1 mb-6">
        {SMART_SEGMENTS.map((seg) => (
          <SmartSegmentButton
            key={seg.id}
            segment={seg}
            isActive={segment === seg.id}
            onClick={() => onSegmentChange(seg.id)}
          />
        ))}
      </div>

      <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">
        Sector
      </div>
      <div className="space-y-0.5">
        {SECTORS.map((sec) => (
          <SectorButton
            key={sec.id}
            sector={sec}
            isActive={sector === sec.id}
            onClick={() => onSectorChange(sec.id)}
          />
        ))}
      </div>
    </aside>
  )
}

function EntityTable({ businesses, activeId, onSelect }) {
  return (
    <div className="flex-1 flex flex-col bg-[#050505] border-r border-[#222]">
      {/* Quadrant Header Labels */}
      <div className="flex border-b border-[#222]">
        <div className="flex-1 p-2 text-xs font-mono text-muted border-r border-[#222]">
          <div>HIGH DOMINANCE</div>
          <div>LOW DIGITAL</div>
        </div>
        <div className="flex-1 p-2 text-xs font-mono text-muted text-right">
          <div>HIGH DOMINANCE</div>
          <div>HIGH DIGITAL</div>
        </div>
      </div>

      {/* Simple Quadrant Visualization */}
      <div className="h-32 border-b border-[#222] relative bg-[#0a0a0a] flex">
        <div className="flex-1 border-r border-[#222] relative">
          {businesses.slice(0, 3).map((b, i) => {
            const x = 20 + (i * 25)
            const y = 30 + (i * 20)
            return (
              <div
                key={b.business_id}
                className="absolute w-2 h-2 rounded-full bg-cyan cursor-pointer hover:scale-150 transition-transform"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onSelect(b)}
                title={b.name}
              />
            )
          })}
        </div>
        <div className="flex-1 relative">
          {businesses.slice(3, 6).map((b, i) => {
            const x = 20 + (i * 25)
            const y = 20 + (i * 15)
            return (
              <div
                key={b.business_id}
                className="absolute w-2 h-2 rounded-full bg-green cursor-pointer hover:scale-150 transition-transform"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onSelect(b)}
                title={b.name}
              />
            )
          })}
        </div>
      </div>

      {/* Low Dominance Labels */}
      <div className="flex border-b border-[#222]">
        <div className="flex-1 p-2 text-xs font-mono text-dim border-r border-[#222]">
          <div>LOW DOMINANCE</div>
          <div>LOW DIGITAL</div>
        </div>
        <div className="flex-1 p-2 text-xs font-mono text-dim text-right">
          <div>LOW DOMINANCE</div>
          <div>HIGH DIGITAL</div>
        </div>
      </div>

      {/* Entity Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0a0a0a] border-b border-[#222]">
            <tr className="text-xs font-mono text-muted uppercase">
              <th className="text-left p-3">Entity Name</th>
              <th className="text-left p-3">Sector</th>
              <th className="text-center p-3">Opp Score</th>
              <th className="text-center p-3">Fit</th>
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
                  <td className="p-3 text-sm">{b.name}</td>
                  <td className="p-3 text-sm text-muted">{b.category?.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-center">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-sm
                      ${alpha >= 60 ? 'bg-cyan/20 text-cyan' : alpha >= 40 ? 'bg-gold/20 text-gold' : 'bg-[#222] text-muted'}`}>
                      {alpha}
                    </span>
                  </td>
                  <td className={`p-3 text-center text-xs font-mono ${fit.color}`}>
                    {fit.label}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FrictionTag({ text }) {
  return (
    <span className="inline-block px-2 py-1 text-xs bg-[#1a1a1a] text-muted rounded mr-2 mb-2">
      {text}
    </span>
  )
}

function BusinessDossier({ business }) {
  const [copied, setCopied] = useState(false)

  if (!business) {
    return (
      <div className="w-80 bg-[#0a0a0a] flex items-center justify-center text-muted flex-shrink-0">
        <div className="text-center">
          <div className="text-xs font-mono uppercase tracking-wide">Select a target</div>
        </div>
      </div>
    )
  }

  const alpha = calculateOpportunityAlpha(business)
  const digitalMaturity = calculateDigitalMaturity(business)
  const marketPower = capScore(business.engagement_score)
  const thesis = generateThesis(business)
  const script = generateOutreachScript(business)
  const painPoints = business.pain_points || []
  const frictionTags = painPoints.slice(0, 3).map(p => p.category || 'operational')

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="w-80 bg-[#0a0a0a] border-l border-[#222] flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <h2 className="text-xl font-bold mb-1">{business.name}</h2>
        <div className="text-xs text-muted mb-3">
          {business.address?.city || 'Coral Gables'}, {business.address?.state || 'FL'}
        </div>

        {/* Tags */}
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-0.5 text-xs font-mono bg-cyan text-black rounded">
            {business.category?.toUpperCase().replace(/_/g, ' ')}
          </span>
          {business.owner && (
            <span className="px-2 py-0.5 text-xs font-mono bg-accent text-white rounded">
              OWNER OPERATOR
            </span>
          )}
        </div>

        {/* Thesis */}
        <div className="mb-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1">Thesis</div>
          <div className="text-sm">{thesis}</div>
        </div>

        {/* Detected Friction */}
        <div className="mb-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">
            Detected Friction (Pain)
          </div>
          <div>
            {frictionTags.map((tag, i) => (
              <FrictionTag key={i} text={tag} />
            ))}
            {painPoints.length > 3 && (
              <span className="text-xs text-muted">+{painPoints.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Opportunity Alpha */}
        <div className="mb-4">
          <div className="text-xs font-mono text-green uppercase tracking-wide mb-2">
            Opportunity Alpha: {alpha}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <div>Digital Maturity: {digitalMaturity}/100</div>
            <div>Market Power: {marketPower}/100</div>
          </div>
        </div>

        {/* Execution Mode */}
        <div className="border-t border-[#222] pt-4 mt-4">
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
              className="flex-1 btn text-xs bg-accent hover:bg-accent/80 text-white border-none"
            >
              {copied ? 'Copied!' : 'Copy Script'}
            </button>
            <button className="flex-1 btn btn-outline text-xs">
              Log to CRM
            </button>
          </div>
        </div>

        {/* Additional Details */}
        {business.website && (
          <div className="mt-4 pt-4 border-t border-[#222]">
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-2">Contact</div>
            <div className="text-xs text-cyan">{business.website}</div>
            {business.phone?.length > 0 && (
              <div className="text-xs text-muted mt-1">{business.phone[0]}</div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

// ============================================================================
// MAIN TERMINAL COMPONENT
// ============================================================================

export default function Terminal() {
  const [allBusinesses, setAllBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [segment, setSegment] = useState('all')
  const [sector, setSector] = useState('all')

  // Fetch all businesses on mount
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

  // Filter businesses based on segment and sector
  const filteredBusinesses = useMemo(() => {
    let result = [...allBusinesses]

    // Apply smart segment filter
    const segmentConfig = SMART_SEGMENTS.find(s => s.id === segment)
    if (segmentConfig?.filter) {
      result = result.filter(segmentConfig.filter)
    }

    // Apply sector filter
    if (sector !== 'all') {
      result = result.filter(b =>
        b.category?.toLowerCase() === sector.toLowerCase() ||
        b.category?.toLowerCase().includes(sector.toLowerCase())
      )
    }

    // Sort by opportunity alpha
    result.sort((a, b) => calculateOpportunityAlpha(b) - calculateOpportunityAlpha(a))

    return result.slice(0, 100) // Limit for performance
  }, [allBusinesses, segment, sector])

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
    <div className="h-screen flex flex-col bg-[#050505]">
      <Header
        businessCount={allBusinesses.length}
        targetCount={filteredBusinesses.length}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          segment={segment}
          onSegmentChange={setSegment}
          sector={sector}
          onSectorChange={setSector}
        />
        <EntityTable
          businesses={filteredBusinesses}
          activeId={selectedBusiness?.business_id}
          onSelect={handleSelect}
        />
        <BusinessDossier business={selectedBusiness} />
      </div>
    </div>
  )
}
