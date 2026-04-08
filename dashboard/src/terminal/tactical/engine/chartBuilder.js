// ─── Chart Builder ────────────────────────────────────────────────────────────
// Translates lightweight chart instructions from OpenAI into real chartSpec
// objects using live CSV data. OpenAI only decides WHAT to chart (~50 tokens).
// All numbers come from the actual database — zero hallucination risk.

const COLORS = ['#f59e0b', '#3b82f6', '#475569', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316']
const MEMBER_COLORS = { member: '#f59e0b', 'non-member': '#3b82f6', unknown: '#475569' }

/**
 * Apply optional filters to the raw businesses array.
 */
function applyFilters(businesses, filter) {
  if (!filter || !businesses) return businesses
  let result = businesses

  if (filter.category) {
    const cat = filter.category.toLowerCase()
    result = result.filter(b => b.category_primary?.toLowerCase() === cat)
  }
  if (filter.neighborhood) {
    const hood = filter.neighborhood.toLowerCase()
    result = result.filter(b => b.neighborhood_area?.toLowerCase().includes(hood))
  }
  if (filter.memberStatus) {
    const statusMap = { 'member': 'member', 'non-member': 'non-member', 'unknown': 'unknown' }
    const target = statusMap[filter.memberStatus]
    if (target) result = result.filter(b => b._memberStatus === target)
  }
  if (typeof filter.minRating === 'number') {
    result = result.filter(b => b._rating >= filter.minRating)
  }
  if (typeof filter.maxRating === 'number') {
    result = result.filter(b => b._rating <= filter.maxRating)
  }
  if (filter.hasRedFlag === true) {
    result = result.filter(b => b._hasRedFlag)
  } else if (filter.hasRedFlag === false) {
    result = result.filter(b => !b._hasRedFlag)
  }

  return result
}

/**
 * Count items by a groupBy field, return sorted array.
 */
function countByGroup(businesses, groupBy, limit = 10, sortBy = 'count') {
  const counts = {}

  businesses.forEach(b => {
    let key
    switch (groupBy) {
      case 'membership_status': key = b._memberStatus || 'unknown'; break
      case 'category':          key = b.category_primary?.replace(/_/g, ' ') || 'Unknown'; break
      case 'neighborhood':      key = b.neighborhood_area || 'Unknown'; break
      case 'rating_bucket':
        if (!b._rating || b._rating === 0) key = 'No rating'
        else if (b._rating < 2.5)  key = '1–2.5'
        else if (b._rating < 3.5)  key = '2.5–3.5'
        else if (b._rating < 4)    key = '3.5–4'
        else if (b._rating < 4.5)  key = '4–4.5'
        else key = '4.5–5'
        break
      case 'validation_tier':   key = `Tier ${b._validationTier || 0}`; break
      case 'recruit_band':      key = b._recruitBand?.band ? `Band ${b._recruitBand.band}` : 'N/A'; break
      default:                  key = b.category_primary?.replace(/_/g, ' ') || 'Unknown'
    }
    counts[key] = (counts[key] || 0) + 1
  })

  let entries = Object.entries(counts).map(([name, value]) => ({ name: name.slice(0, 18), value }))

  if (sortBy === 'count' || sortBy === 'value') entries.sort((a, b) => b.value - a.value)
  else if (sortBy === 'name') entries.sort((a, b) => a.name.localeCompare(b.name))

  return entries.slice(0, limit)
}

// ── Metric-specific builders ─────────────────────────────────────────────────

function buildMembershipChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter)
  const groupBy = instruction.groupBy || 'membership_status'

  if (instruction.type === 'pie' || (!instruction.groupBy && instruction.type !== 'bar')) {
    const members = filtered.filter(b => b._memberStatus === 'member').length
    const nonMembers = filtered.filter(b => b._memberStatus === 'non-member').length
    const unknowns = filtered.filter(b => b._memberStatus === 'unknown').length
    return {
      type: 'pie',
      title: instruction.title,
      data: [
        { name: 'Members', value: members, color: MEMBER_COLORS.member },
        { name: 'Non-members', value: nonMembers, color: MEMBER_COLORS['non-member'] },
        { name: 'Unknown', value: unknowns, color: MEMBER_COLORS.unknown },
      ].filter(d => d.value > 0),
    }
  }

  // Bar: group membership by another dimension
  const groups = countByGroup(filtered, groupBy, instruction.limit || 10, instruction.sortBy)
  // For each group, split by membership
  const barData = groups.map(g => {
    const groupBiz = filtered.filter(b => {
      const val = groupBy === 'category' ? b.category_primary?.replace(/_/g, ' ')
        : groupBy === 'neighborhood' ? b.neighborhood_area
        : groupBy === 'rating_bucket' ? null // skip for bar
        : null
      return val && val.slice(0, 18) === g.name
    })
    return {
      name: g.name,
      Members: groupBiz.filter(b => b._memberStatus === 'member').length,
      'Non-members': groupBiz.filter(b => b._memberStatus === 'non-member').length,
      Unknown: groupBiz.filter(b => b._memberStatus === 'unknown').length,
    }
  })
  return { type: 'bar', title: instruction.title, data: barData }
}

function buildCategoryChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter)
  const data = countByGroup(filtered, 'category', instruction.limit || 10, instruction.sortBy || 'count')

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })) }
  }
  return { type: 'bar', title: instruction.title, data: data.map(d => ({ name: d.name, count: d.value })) }
}

function buildNeighborhoodChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter)
  const data = countByGroup(filtered, 'neighborhood', instruction.limit || 10, instruction.sortBy || 'count')

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })) }
  }
  // Stacked bar with membership breakdown
  const barData = data.map(g => {
    const hood = filtered.filter(b => b.neighborhood_area && b.neighborhood_area.slice(0, 18) === g.name)
    return {
      name: g.name,
      Members: hood.filter(b => b._memberStatus === 'member').length,
      'Non-members': hood.filter(b => b._memberStatus === 'non-member').length,
      Unknown: hood.filter(b => b._memberStatus === 'unknown').length,
    }
  })
  return { type: 'bar', title: instruction.title, data: barData }
}

function buildRatingChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter).filter(b => b._rating > 0)

  if (instruction.type === 'box') {
    // Box plot data: compute quartiles
    const ratings = filtered.map(b => b._rating).sort((a, b) => a - b)
    const q = (arr, p) => { const i = (arr.length - 1) * p; const lo = Math.floor(i); return arr[lo] + (arr[lo + 1] - arr[lo]) * (i - lo) }
    if (ratings.length < 5) return null
    return {
      type: 'bar', // rendered as bar since Recharts doesn't have native box plot
      title: instruction.title,
      data: [
        { name: 'Min', value: ratings[0], fill: '#ef4444' },
        { name: 'Q1', value: +q(ratings, 0.25).toFixed(2), fill: '#f97316' },
        { name: 'Median', value: +q(ratings, 0.5).toFixed(2), fill: '#eab308' },
        { name: 'Q3', value: +q(ratings, 0.75).toFixed(2), fill: '#84cc16' },
        { name: 'Max', value: ratings[ratings.length - 1], fill: '#22c55e' },
      ],
    }
  }

  // Histogram-style buckets
  const buckets = [
    { name: '1–2.5', min: 0, max: 2.5, count: 0, fill: '#ef4444' },
    { name: '2.5–3.5', min: 2.5, max: 3.5, count: 0, fill: '#f97316' },
    { name: '3.5–4', min: 3.5, max: 4, count: 0, fill: '#eab308' },
    { name: '4–4.5', min: 4, max: 4.5, count: 0, fill: '#84cc16' },
    { name: '4.5–5', min: 4.5, max: 5.1, count: 0, fill: '#22c55e' },
  ]
  filtered.forEach(b => {
    const bk = buckets.find(k => b._rating >= k.min && b._rating < k.max)
    if (bk) bk.count++
  })

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: buckets.map(b => ({ name: b.name, value: b.count, color: b.fill })).filter(d => d.value > 0) }
  }
  return { type: 'bar', title: instruction.title, data: buckets.map(b => ({ name: b.name, count: b.count, fill: b.fill })) }
}

function buildDataQualityChart(instruction, businesses) {
  const total = businesses.length || 1
  const phone = businesses.filter(b => b._hasPhone).length
  const website = businesses.filter(b => b._hasWebsite).length
  const geo = businesses.filter(b => b.latitude && b.longitude).length
  const rated = businesses.filter(b => b._rating > 0).length
  const highValid = businesses.filter(b => b._validationTier >= 3).length

  const data = [
    { name: 'Phone', value: +(phone / total * 100).toFixed(1), fill: '#22c55e' },
    { name: 'Website', value: +(website / total * 100).toFixed(1), fill: '#3b82f6' },
    { name: 'Geo', value: +(geo / total * 100).toFixed(1), fill: '#8b5cf6' },
    { name: 'Rating', value: +(rated / total * 100).toFixed(1), fill: '#f59e0b' },
    { name: 'High Valid.', value: +(highValid / total * 100).toFixed(1), fill: '#06b6d4' },
  ]

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: data.map(d => ({ ...d, color: d.fill })) }
  }
  return { type: 'bar', title: instruction.title, data }
}

function buildRedFlagChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter)
  const flagged = filtered.filter(b => b._hasRedFlag).length
  const clean = filtered.length - flagged

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: [
      { name: 'Flagged', value: flagged, color: '#ef4444' },
      { name: 'Clean', value: clean, color: '#22c55e' },
    ]}
  }

  // Bar: group flagged businesses by category or neighborhood
  const groupBy = instruction.groupBy || 'category'
  const flaggedBiz = filtered.filter(b => b._hasRedFlag)
  const data = countByGroup(flaggedBiz, groupBy, instruction.limit || 10)
  return { type: 'bar', title: instruction.title, data: data.map(d => ({ name: d.name, 'Red Flags': d.value })) }
}

function buildRecruitScoreChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter).filter(b => b._recruitScore > 0)
  const groupBy = instruction.groupBy || 'recruit_band'
  const data = countByGroup(filtered, groupBy, instruction.limit || 10, instruction.sortBy)

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })) }
  }
  return { type: 'bar', title: instruction.title, data: data.map(d => ({ name: d.name, count: d.value })) }
}

function buildReviewsChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter).filter(b => b._reviewCount > 0)
  // Top businesses by review count
  const sorted = [...filtered].sort((a, b) => b._reviewCount - a._reviewCount).slice(0, instruction.limit || 10)
  const data = sorted.map(b => ({
    name: (b.business_name || 'Unknown').slice(0, 16),
    reviews: b._reviewCount,
    fill: b._rating >= 4 ? '#22c55e' : b._rating >= 3 ? '#eab308' : '#ef4444',
  }))

  return { type: 'bar', title: instruction.title, data }
}

function buildValidationChart(instruction, businesses) {
  const filtered = applyFilters(businesses, instruction.filter)
  const data = countByGroup(filtered, 'validation_tier', 6, 'name')

  if (instruction.type === 'pie') {
    return { type: 'pie', title: instruction.title, data: data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })) }
  }
  return { type: 'bar', title: instruction.title, data: data.map(d => ({ name: d.name, count: d.value })) }
}

// ── Deep Analytics Builders ──────────────────────────────────────────────────

function buildCategoryHealthChart(instruction, businesses) {
  // Category Health Index — composite score per category
  const categories = [...new Set(businesses.map(b => b.category_primary).filter(Boolean))]
  const data = categories.map(cat => {
    const bizs = businesses.filter(b => b.category_primary === cat)
    const rated = bizs.filter(b => b._rating > 0)
    const members = bizs.filter(b => b._memberStatus === 'member')
    const withWeb = bizs.filter(b => b._hasWebsite)
    const highVal = bizs.filter(b => b._validationTier >= 3)
    const flagged = bizs.filter(b => b._hasRedFlag)

    const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b._rating, 0) / rated.length : 0
    const avgReviews = rated.length > 0 ? rated.reduce((s, b) => s + b._reviewCount, 0) / rated.length : 0
    const penetration = bizs.length > 0 ? (members.length / bizs.length * 100) : 0
    const webCoverage = bizs.length > 0 ? (withWeb.length / bizs.length * 100) : 0
    const validationRate = bizs.length > 0 ? (highVal.length / bizs.length * 100) : 0
    const riskRate = bizs.length > 0 ? (flagged.length / bizs.length * 100) : 0

    const chi = Math.round(
      (avgRating / 5 * 25) + (Math.min(avgReviews, 100) / 100 * 15) +
      (penetration / 100 * 20) + (webCoverage / 100 * 15) +
      (validationRate / 100 * 15) + ((100 - riskRate) / 100 * 10)
    )

    return { name: cat.replace(/_/g, ' '), chi, penetration: Math.round(penetration), avgRating: Math.round(avgRating * 10) / 10, count: bizs.length }
  }).sort((a, b) => b.chi - a.chi).slice(0, instruction.limit || 15)

  return {
    type: 'bar', title: instruction.title || 'Category Health Index (CHI)',
    data: data.map(d => ({ name: d.name, value: d.chi, fill: d.chi >= 50 ? '#22c55e' : d.chi >= 30 ? '#eab308' : '#ef4444' }))
  }
}

function buildSaturationChart(instruction, businesses) {
  // Competitive saturation — density heatmap data
  const filtered = applyFilters(businesses, instruction.filter)
  const groupBy = instruction.groupBy || 'category'

  if (groupBy === 'neighborhood') {
    const hoods = [...new Set(filtered.map(b => b.neighborhood_area).filter(Boolean))]
    const data = hoods.map(hood => {
      const bizs = filtered.filter(b => b.neighborhood_area === hood)
      const cats = new Set(bizs.map(b => b.category_primary).filter(Boolean)).size
      return { name: hood, value: bizs.length, categories: cats }
    }).sort((a, b) => b.value - a.value).slice(0, instruction.limit || 12)

    return { type: 'bar', title: instruction.title || 'Business Density by Neighborhood', data }
  }

  // Default: category density
  const cats = [...new Set(filtered.map(b => b.category_primary).filter(Boolean))]
  const data = cats.map(cat => {
    const bizs = filtered.filter(b => b.category_primary === cat)
    const hoods = new Set(bizs.map(b => b.neighborhood_area).filter(Boolean)).size
    return { name: cat.replace(/_/g, ' '), value: bizs.length, neighborhoods: hoods }
  }).sort((a, b) => b.value - a.value).slice(0, instruction.limit || 15)

  return { type: 'bar', title: instruction.title || 'Category Density', data }
}

function buildOpportunityChart(instruction, businesses) {
  // Cross-tab: where to focus expansion
  const hoods = [...new Set(businesses.map(b => b.neighborhood_area).filter(Boolean))]
  const cats = [...new Set(businesses.map(b => b.category_primary).filter(Boolean))]

  // Find cells with businesses but low penetration
  const opportunities = []
  hoods.forEach(hood => {
    cats.forEach(cat => {
      const bizs = businesses.filter(b => b.neighborhood_area === hood && b.category_primary === cat)
      if (bizs.length === 0) return
      const members = bizs.filter(b => b._memberStatus === 'member')
      const penetration = members.length / bizs.length * 100
      if (penetration < 40 && bizs.length >= 3) {
        opportunities.push({
          name: `${hood} × ${cat.replace(/_/g, ' ')}`,
          nonMembers: bizs.length - members.length,
          penetration: Math.round(penetration),
          total: bizs.length,
        })
      }
    })
  })
  opportunities.sort((a, b) => b.nonMembers - a.nonMembers)

  const data = opportunities.slice(0, instruction.limit || 10).map(o => ({
    name: o.name, value: o.nonMembers,
    fill: o.penetration < 15 ? '#ef4444' : o.penetration < 30 ? '#eab308' : '#3b82f6',
  }))

  return { type: 'bar', title: instruction.title || 'Top Expansion Opportunities', data }
}

// ── Main builder ─────────────────────────────────────────────────────────────

const METRIC_BUILDERS = {
  membership:      buildMembershipChart,
  category:        buildCategoryChart,
  neighborhood:    buildNeighborhoodChart,
  rating:          buildRatingChart,
  data_quality:    buildDataQualityChart,
  red_flags:       buildRedFlagChart,
  recruit_score:   buildRecruitScoreChart,
  reviews:         buildReviewsChart,
  validation:      buildValidationChart,
  category_health: buildCategoryHealthChart,
  saturation:      buildSaturationChart,
  opportunity:     buildOpportunityChart,
}

/**
 * Convert an array of lightweight LLM chart instructions into real chartSpec
 * objects populated with data from the live business database.
 *
 * @param {Array} instructions - Chart instructions from OpenAI (tiny JSON)
 * @param {Array} rawBusinesses - Full business dataset from CSV
 * @returns {Array} chartSpec objects ready for DynamicGraphPanel
 */
export function buildChartsFromInstructions(instructions, rawBusinesses) {
  if (!instructions?.length || !rawBusinesses?.length) return []

  const charts = []

  for (const inst of instructions) {
    const builder = METRIC_BUILDERS[inst.metric]
    if (!builder) continue

    const chart = builder(inst, rawBusinesses)
    if (chart && chart.data?.length > 0) {
      charts.push({ ...chart, source: 'ai' })
    }
  }

  return charts
}
