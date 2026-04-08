// ─── Information Gain & Bayesian Intelligence Framework ──────────────────────
// Mathematical foundation for the Tactical AI Advisor:
//
//   1. Information Gain:  IG(x) = -log₂(P(x))
//      → Measures how "surprising" an observation is
//      → Rarer issues carry more information value
//
//   2. Bayesian Updating: P(H|E) ∝ P(H) × P(E|H)
//      → Beliefs about a business update as conversation provides evidence
//
//   3. Decision Function:  D = Pb + δ × Pe
//      → Blends base knowledge (confident) with exploratory knowledge (uncertain)
//      → δ controls exploration: 0 = conservative, 1 = full exploration

/**
 * Information gain (surprisal): IG(x) = -log₂(P(x))
 * Rarer events carry more bits of information.
 */
export function informationGain(probability) {
  if (probability <= 0) return 10 // cap at 10 bits
  if (probability >= 1) return 0
  return -Math.log2(probability)
}

// ── Dimension checks ────────────────────────────────────────────
// Each check defines a boolean condition on a business, counts how
// many businesses in the dataset share it, and assigns a severity.

const DIMENSION_CHECKS = [
  {
    dimension: 'low_rating',
    condition: b => b._rating > 0 && b._rating < 3.5,
    label: b => `Low rating (${b._rating?.toFixed(1) || 0})`,
    severity: 'high',
  },
  {
    dimension: 'no_website',
    condition: b => !b._hasWebsite,
    label: () => 'No website presence',
    severity: 'medium',
  },
  {
    dimension: 'no_phone',
    condition: b => !b._hasPhone,
    label: () => 'No phone listed',
    severity: 'medium',
  },
  {
    dimension: 'red_flag',
    condition: b => b._hasRedFlag,
    label: () => 'Active red flags',
    severity: 'high',
  },
  {
    dimension: 'low_validation',
    condition: b => b._validationTier < 2,
    label: () => 'Low data confidence',
    severity: 'low',
  },
  {
    dimension: 'high_value_prospect',
    condition: b => b._memberStatus === 'non-member' && (b._recruitScore || 0) >= 70,
    label: b => `High-value prospect (score: ${b._recruitScore})`,
    severity: 'info',
  },
  {
    dimension: 'low_reviews',
    condition: b => (b._reviewCount || 0) < 5,
    label: b => `Very few reviews (${b._reviewCount || 0})`,
    severity: 'low',
  },
  {
    dimension: 'unknown_status',
    condition: b => b._memberStatus === 'unknown',
    label: () => 'Unknown membership status',
    severity: 'medium',
  },
  // ── Deep analytics dimensions ──
  {
    dimension: 'category_other',
    condition: b => (b.category_primary || '').toLowerCase() === 'other' || !b.category_primary,
    label: () => 'Uncategorized business — limits analytics',
    severity: 'low',
  },
  {
    dimension: 'high_review_volume',
    condition: b => (b._reviewCount || 0) >= 100,
    label: b => `High visibility (${b._reviewCount} reviews)`,
    severity: 'info',
  },
  {
    dimension: 'elite_rating',
    condition: b => b._rating >= 4.8,
    label: b => `Elite rating (${b._rating?.toFixed(1)})`,
    severity: 'info',
  },
  {
    dimension: 'no_digital_presence',
    condition: b => !b._hasWebsite && !b._hasPhone,
    label: () => 'No digital footprint (no website or phone)',
    severity: 'high',
  },
  {
    dimension: 'multi_source_confirmed',
    condition: b => (b._corroboration || 0) >= 3,
    label: b => `High-confidence data (${b._corroboration} sources)`,
    severity: 'info',
  },
]

/**
 * Score each improvement area for a business by how rare that issue is
 * across the full dataset. Returns sorted array: most informative first.
 *
 * P(x) = count of businesses with same issue / total businesses
 * IG(x) = -log₂(P(x))
 */
export function scoreBusinessInsights(business, allBusinesses) {
  const total = allBusinesses.length || 1
  const insights = []

  DIMENSION_CHECKS.forEach(({ dimension, condition, label, severity }) => {
    if (condition(business)) {
      const count = allBusinesses.filter(condition).length
      const p = count / total
      insights.push({
        dimension,
        label: label(business),
        probability: p,
        ig: informationGain(p),
        severity,
        prevalence: count,
      })
    }
  })

  return insights.sort((a, b) => b.ig - a.ig)
}

/**
 * Score category-level insights by rarity across all categories
 */
export function scoreCategoryInsights(catData, allCategoryData) {
  const total = allCategoryData.length || 1
  const insights = []

  if (catData.penetration < 20) {
    const count = allCategoryData.filter(c => c.penetration < 20).length
    insights.push({
      dimension: 'very_low_penetration',
      label: `Very low penetration (${catData.penetration.toFixed(0)}%)`,
      probability: count / total,
      ig: informationGain(count / total),
    })
  }

  if (catData.unknowns > catData.total * 0.3) {
    const count = allCategoryData.filter(c => c.unknowns > c.total * 0.3).length
    insights.push({
      dimension: 'high_unknown_rate',
      label: `High unknown rate (${((catData.unknowns / catData.total) * 100).toFixed(0)}%)`,
      probability: count / total,
      ig: informationGain(count / total),
    })
  }

  return insights.sort((a, b) => b.ig - a.ig)
}

// ── Bayesian Belief State ───────────────────────────────────────

/**
 * Create empty belief state for a conversation session.
 * Tracks P(hypothesis) for each business dimension as evidence accumulates.
 */
export function createBeliefState() {
  return { beliefs: {}, sessionIG: 0, questionCount: 0 }
}

/**
 * Initialize beliefs for a business from its IG-scored insights.
 * Prior = prevalence probability from the dataset.
 */
export function initBusinessBelief(state, businessKey, insights) {
  if (state.beliefs[businessKey]) return state
  const beliefs = { ...state.beliefs }
  beliefs[businessKey] = {}

  insights.forEach(ins => {
    beliefs[businessKey][ins.dimension] = {
      prior: ins.probability,
      posterior: ins.probability,
      ig: ins.ig,
      evidence: [],
    }
  })

  return { ...state, beliefs }
}

/**
 * Bayesian update: P(H|E) ∝ P(H) × likelihood_ratio
 * positive evidence → likelihood 2.0 (doubles belief)
 * negative evidence → likelihood 0.3 (reduces belief)
 */
export function updateBelief(state, businessKey, dimension, positive) {
  if (!state.beliefs[businessKey]?.[dimension]) return state
  const beliefs = JSON.parse(JSON.stringify(state.beliefs))
  const b = beliefs[businessKey][dimension]

  const lr = positive ? 2.0 : 0.3
  const unnorm = b.posterior * lr
  b.posterior = Math.min(0.99, Math.max(0.01, unnorm / (unnorm + (1 - b.posterior))))
  b.evidence.push({ positive, t: Date.now() })

  const igDelta = Math.abs(informationGain(b.posterior) - informationGain(b.prior))

  return {
    beliefs,
    sessionIG: state.sessionIG + igDelta,
    questionCount: state.questionCount + 1,
  }
}

// ── Decision Function ───────────────────────────────────────────

/**
 * D = Pb + δ × Pe
 *
 * Pb = base knowledge  = IG × confidence     (high-confidence, well-supported)
 * Pe = exploratory      = IG × uncertainty    (uncertain but potentially valuable)
 * δ  = exploration parameter (0 = conservative, 1 = full exploration)
 *
 * Returns the original insight enriched with score, confidence, Pb, Pe.
 */
export function decisionScore(insight, beliefState, businessKey, delta) {
  const belief = beliefState?.beliefs?.[businessKey]?.[insight.dimension]

  // Confidence: how sure we are about this dimension
  const confidence = belief ? belief.posterior : insight.probability
  const Pb = insight.ig * confidence

  // Uncertainty: 1 when posterior ≈ 0.5 (max uncertainty), 0 at extremes
  const uncertainty = belief ? (1 - Math.abs(belief.posterior - 0.5) * 2) : 0.5
  const Pe = insight.ig * uncertainty

  const score = Pb + delta * Pe

  return { ...insight, score, confidence, uncertainty, Pb, Pe }
}

/**
 * Rank a set of insights using the decision function.
 * Higher score = more valuable to surface in the response.
 */
export function rankInsights(insights, beliefState, businessKey, delta = 0.3) {
  return insights
    .map(ins => decisionScore(ins, beliefState, businessKey, delta))
    .sort((a, b) => b.score - a.score)
}

// ── Market-Level Analytics ────────────────────────────────────────────────────

/**
 * Score market-level insights using information gain.
 * Generates actionable findings about the overall business ecosystem.
 */
export function scoreMarketInsights(marketAnalytics, stats) {
  if (!marketAnalytics || !stats) return []
  const insights = []

  // Concentration risk
  if (marketAnalytics.hhiNormalized > 1500) {
    insights.push({
      dimension: 'market_concentration',
      label: `Market is ${marketAnalytics.hhiNormalized > 2500 ? 'highly' : 'moderately'} concentrated (HHI: ${marketAnalytics.hhiNormalized})`,
      ig: informationGain(0.2),
      severity: marketAnalytics.hhiNormalized > 2500 ? 'high' : 'medium',
      action: 'Diversify recruitment across underrepresented categories to reduce concentration risk.',
    })
  }

  // Low health categories
  const weakCats = marketAnalytics.categoryHealth?.filter(c => c.chi < 30) || []
  if (weakCats.length > 0) {
    insights.push({
      dimension: 'weak_categories',
      label: `${weakCats.length} categories below health threshold (CHI < 30): ${weakCats.slice(0, 3).map(c => c.category.replace(/_/g, ' ')).join(', ')}`,
      ig: informationGain(weakCats.length / (marketAnalytics.categoryHealth?.length || 1)),
      severity: 'medium',
      action: 'Investigate root causes — low penetration, poor data quality, or small market size.',
    })
  }

  // High-opportunity neighborhoods
  const hotHoods = marketAnalytics.neighborhoodHealth?.filter(n => n.nos >= 65) || []
  if (hotHoods.length > 0) {
    insights.push({
      dimension: 'expansion_hotspots',
      label: `${hotHoods.length} neighborhoods with strong expansion potential (NOS ≥ 65): ${hotHoods.slice(0, 3).map(n => n.neighborhood).join(', ')}`,
      ig: informationGain(0.15),
      severity: 'info',
      action: 'Prioritize outreach in these areas — large non-member pools with high business quality.',
    })
  }

  // Rating distribution anomalies
  const rp = marketAnalytics.ratingPercentiles
  if (rp && rp.stdDev > 1.2) {
    insights.push({
      dimension: 'rating_bimodal',
      label: `High rating variance (σ=${rp.stdDev.toFixed(2)}) — businesses are polarized between high and low performers`,
      ig: informationGain(0.1),
      severity: 'medium',
      action: 'Low-rated members may need intervention. High-rated non-members are ripe for recruitment.',
    })
  }

  // Top cross-tab opportunities
  const topOpp = marketAnalytics.topOpportunities?.[0]
  if (topOpp && topOpp.nonMembers >= 5) {
    insights.push({
      dimension: 'top_opportunity',
      label: `Best growth opportunity: ${topOpp.category.replace(/_/g, ' ')} in ${topOpp.neighborhood} — ${topOpp.nonMembers} non-members, only ${topOpp.penetration}% penetrated`,
      ig: informationGain(0.05),
      severity: 'info',
      action: `Target this specific category-neighborhood intersection. ${topOpp.nonMembers} prospects available.`,
    })
  }

  return insights.sort((a, b) => b.ig - a.ig)
}

/**
 * Compute a "business health score" for a single business given market context.
 * Contextualizes the business against its category and neighborhood peers.
 */
export function computeBusinessHealthScore(business, allBusinesses, marketAnalytics) {
  if (!business || !allBusinesses.length) return null

  const peers = allBusinesses.filter(b => b.category_primary === business.category_primary && b._id !== business._id)
  const neighborPeers = allBusinesses.filter(b => b.neighborhood_area === business.neighborhood_area && b._id !== business._id)

  const peerRatings = peers.filter(b => b._rating > 0).map(b => b._rating)
  const peerAvgRating = peerRatings.length > 0 ? peerRatings.reduce((a, b) => a + b, 0) / peerRatings.length : 0

  const peerReviews = peers.filter(b => b._reviewCount > 0).map(b => b._reviewCount)
  const peerMedianReviews = peerReviews.length > 0 ? peerReviews.sort((a, b) => a - b)[Math.floor(peerReviews.length / 2)] : 0

  // Rating vs peers (0-25)
  const ratingScore = business._rating > 0
    ? Math.min(25, Math.round((business._rating / Math.max(peerAvgRating, 1)) * 12.5))
    : 0

  // Review volume vs peers (0-20)
  const reviewScore = business._reviewCount > 0
    ? Math.min(20, Math.round((business._reviewCount / Math.max(peerMedianReviews, 1)) * 10))
    : 0

  // Digital presence (0-20)
  const digitalScore = (business._hasWebsite ? 12 : 0) + (business._hasPhone ? 8 : 0)

  // Data confidence (0-15)
  const dataScore = Math.round(business._validationTier / 3 * 15)

  // Risk safety (0-10)
  const riskScore = business._hasRedFlag ? 0 : 10

  // Neighborhood position (0-10)
  const hoodPos = neighborPeers.length > 0
    ? Math.min(10, Math.round((neighborPeers.filter(b => b._rating <= business._rating).length / neighborPeers.length) * 10))
    : 5

  const total = ratingScore + reviewScore + digitalScore + dataScore + riskScore + hoodPos

  return {
    total,
    breakdown: { ratingScore, reviewScore, digitalScore, dataScore, riskScore, hoodPos },
    context: {
      peerAvgRating: Math.round(peerAvgRating * 100) / 100,
      peerMedianReviews,
      peerCount: peers.length,
      neighborhoodPeerCount: neighborPeers.length,
      ratingPercentile: peerRatings.length > 0
        ? Math.round(peerRatings.filter(r => r <= business._rating).length / peerRatings.length * 100)
        : null,
    },
  }
}
