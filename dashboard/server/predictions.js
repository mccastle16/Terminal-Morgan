// ── Live growth & churn predictions ─────────────────────────────────────────
// Ports scripts/16. prediction_model.py (the summary half). A transparent,
// self-contained weighted model — no ML library. Feature weights are learned
// live from the member vs non-member distributions, then each business gets a
// Membership Probability (logistic) and Growth Trajectory (rule-based) score.
//
// The model composes on the other live layers: per-business CSS from sentiment
// and influence/betweenness from centrality. Output matches
// public/data/prediction_summary.json (the only half the dashboard consumes).

import { getBusinesses } from './neo4j.js'
import { computeProfiles } from './sentiment.js'
import { getNetworkCentrality } from './centrality.js'

const sigmoid = (x) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, x))))
const round = (v, d = 0) => { const f = 10 ** d; return Math.round((v || 0) * f) / f }

// Parse numeric values, mapping text labels to numeric equivalents (mirrors
// _safe_float in the Python model).
function safeFloat(val, dflt = 0) {
  if (val === null || val === undefined || String(val).trim() === '') return dflt
  const s = String(val).trim()
  const n = parseFloat(s)
  if (!isNaN(n) && /^-?\d/.test(s)) return n
  return ({ High: 1.0, Moderate: 0.6, Medium: 0.6, Low: 0.3 })[s] ?? dflt
}

// Feature extractors — identical to the Python model.
const FEATURES = {
  rating: r => parseFloat(r.rating_primary_value) || 0,
  reviews: r => Math.min(parseInt(parseFloat(r.rating_primary_review_count) || 0, 10), 500),
  confidence: r => safeFloat(r.osint_confidence),
  has_website: r => (r.website || '').trim() ? 1.0 : 0.0,
  has_phone: r => (r.phone || '').trim() ? 1.0 : 0.0,
  corroboration: r => Math.min(parseInt(r.corroboration_count || 0, 10) || 0, 10),
  red_flag: r => (r.red_flag_present || '').trim().toUpperCase() === 'Y' ? -1.0 : 0.0,
  validation: r => ({ High: 3, Moderate: 2, Low: 1 })[(r.validation_tier || '').trim()] ?? 0,
  price_tier: r => ({ '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 })[(r.price_tier || '').trim()] ?? 2,
}

const isMemberRow = (r) => (r.chamber_member || '').trim().toUpperCase() === 'Y'
const isNonMemberRow = (r) => (r.chamber_member || '').trim().toUpperCase() === 'N'

// Learn discriminative weights from member vs non-member feature means.
function learnFeatureWeights(rows) {
  const members = rows.filter(isMemberRow)
  const nonMembers = rows.filter(isNonMemberRow)
  if (!members.length || !nonMembers.length) return {}

  const weights = {}
  for (const [fname, extractor] of Object.entries(FEATURES)) {
    const mVals = members.map(extractor)
    const nmVals = nonMembers.map(extractor)
    const mMean = mVals.reduce((s, v) => s + v, 0) / mVals.length
    const nmMean = nmVals.reduce((s, v) => s + v, 0) / nmVals.length
    const variance = mVals.reduce((s, v) => s + (v - mMean) ** 2, 0) / mVals.length
    const mStd = Math.max(0.1, Math.sqrt(variance))
    weights[fname] = {
      member_mean: round(mMean, 3),
      non_member_mean: round(nmMean, 3),
      direction: round((mMean - nmMean) / mStd, 3),
      extractor,
    }
  }
  return weights
}

// Membership Probability (0-100): logistic regression over feature deltas plus
// sentiment and network-influence bonuses.
function predictMembership(row, weights, sentimentMap, centralityNodes) {
  let z = 0
  for (const w of Object.values(weights)) z += w.direction * w.extractor(row) * 0.3

  const bizId = row.business_id || ''
  if (sentimentMap[bizId]) {
    const css = sentimentMap[bizId].css ?? 50
    z += (css - 50) / 100 * 0.5
  }
  if (centralityNodes[bizId]) {
    z += (centralityNodes[bizId].influence_score || 0) * 0.8
  }
  return round(sigmoid(z) * 100)
}

// Growth Trajectory (-50..+50): rule-based momentum signal.
function predictGrowth(row, sentimentMap, centralityNodes) {
  let score = 0
  const rating = parseFloat(row.rating_primary_value) || 0
  const reviews = parseInt(parseFloat(row.rating_primary_review_count) || 0, 10)
  const hasWeb = !!(row.website || '').trim()
  const hasPhone = !!(row.phone || '').trim()
  const hasFlag = (row.red_flag_present || '').trim().toUpperCase() === 'Y'
  const bizId = row.business_id || ''

  if (rating >= 4.5) score += 10
  else if (rating >= 3.8) score += 3
  else if (rating > 0 && rating < 3.0) score -= 10

  if (reviews >= 100) score += 8
  else if (reviews >= 30) score += 4
  else if (reviews > 0) score += 1

  if (hasWeb && hasPhone) score += 5
  else if (hasWeb || hasPhone) score += 2
  else score -= 5

  if (hasFlag) {
    const severity = (row.red_flag_severity || '').trim().toLowerCase()
    score += ({ critical: -15, high: -10, medium: -5, low: -2 })[severity] ?? -5
  }

  if (sentimentMap[bizId]) {
    const css = sentimentMap[bizId].css ?? 50
    if (css >= 70) score += 6
    else if (css <= 30) score -= 6
  }

  if (centralityNodes[bizId]) {
    const node = centralityNodes[bizId]
    if ((node.betweenness || 0) > 0.01) score += 5
    if ((node.influence_score || 0) > 0.15) score += 3
  }

  const corrob = parseInt(row.corroboration_count || 0, 10) || 0
  if (corrob >= 4) score += 3
  else if (corrob >= 2) score += 1

  return Math.max(-50, Math.min(50, round(score)))
}

export async function getPredictionSummary() {
  const rows = await getBusinesses()

  // Compose on the other live layers.
  const sentimentMap = {}
  for (const p of computeProfiles(rows)) sentimentMap[p.business_id] = p
  let centralityNodes = {}
  try {
    centralityNodes = (await getNetworkCentrality()).nodes || {}
  } catch { /* centrality optional — predictions still work without it */ }

  const weights = learnFeatureWeights(rows)

  const mpDist = {}, gtDist = {}
  const categoryAgg = {} // category → { mp:[], gt:[] }
  let membersCount = 0, churnHigh = 0, churnMed = 0, topRecruits = 0
  let mpSum = 0, gtSum = 0

  for (const row of rows) {
    const mp = predictMembership(row, weights, sentimentMap, centralityNodes)
    const gt = predictGrowth(row, sentimentMap, centralityNodes)
    const member = isMemberRow(row)

    const mpBand = mp >= 70 ? 'high' : mp >= 40 ? 'medium' : 'low'
    const gtBand = gt >= 10 ? 'growing' : gt >= -5 ? 'stable' : 'declining'
    mpDist[mpBand] = (mpDist[mpBand] || 0) + 1
    gtDist[gtBand] = (gtDist[gtBand] || 0) + 1

    if (member) {
      membersCount++
      if (gt <= -10) churnHigh++
      else if (gt <= -3) churnMed++
    } else if (mp >= 60) {
      topRecruits++
    }

    const cat = row.category_primary || 'other'
    if (!categoryAgg[cat]) categoryAgg[cat] = { mp: [], gt: [] }
    categoryAgg[cat].mp.push(mp)
    categoryAgg[cat].gt.push(gt)

    mpSum += mp
    gtSum += gt
  }

  const categoryPredictions = Object.entries(categoryAgg)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, d]) => ({
      category,
      count: d.mp.length,
      avg_membership_prob: round(d.mp.reduce((s, v) => s + v, 0) / d.mp.length),
      avg_growth_trajectory: round(d.gt.reduce((s, v) => s + v, 0) / d.gt.length, 1),
    }))
    .sort((a, b) => b.avg_growth_trajectory - a.avg_growth_trajectory)

  const featureWeights = {}
  for (const [fname, w] of Object.entries(weights)) {
    featureWeights[fname] = { member_mean: w.member_mean, non_member_mean: w.non_member_mean, direction: w.direction }
  }

  return {
    generated_at: new Date().toISOString(),
    total_businesses: rows.length,
    membership_distribution: mpDist,
    growth_distribution: gtDist,
    avg_membership_probability: round(mpSum / rows.length),
    avg_growth_trajectory: round(gtSum / rows.length, 1),
    members_count: membersCount,
    churn_risk_high: churnHigh,
    churn_risk_medium: churnMed,
    churn_risk_low: membersCount - churnHigh - churnMed,
    high_potential_recruits: topRecruits,
    category_predictions: categoryPredictions,
    feature_weights: featureWeights,
  }
}
