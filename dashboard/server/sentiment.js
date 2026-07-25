// ── Live sentiment themes ────────────────────────────────────────────────────
// Ports scripts/14. sentiment_extractor.py (the aggregate themes half). Since
// raw review text isn't stored, sentiment is derived from data already on the
// Business nodes: rating band, delight/pain keyword themes, red-flag signals,
// and a Composite Sentiment Score (CSS). Reuses getBusinesses() because it
// already returns the exact CSV-column shape the Python script read from
// master_all_businesses.csv. Output matches public/data/sentiment_themes.json.

import { getBusinesses } from './neo4j.js'

// Theme → keyword mapping (identical to the Python extractor).
const THEME_KEYWORDS = {
  service_quality: ['service', 'staff', 'friendly', 'professional', 'helpful', 'attentive', 'rude', 'slow', 'unhelpful'],
  value_pricing: ['price', 'expensive', 'cheap', 'value', 'overpriced', 'affordable', 'cost', 'worth'],
  location_access: ['location', 'parking', 'access', 'convenient', 'traffic', 'far', 'close', 'downtown'],
  ambiance_design: ['ambiance', 'atmosphere', 'design', 'interior', 'modern', 'clean', 'dirty', 'outdated', 'beautiful'],
  food_quality: ['food', 'fresh', 'delicious', 'taste', 'quality', 'bland', 'cold'],
  innovation_tech: ['technology', 'digital', 'innovation', 'app', 'online', 'modern'],
  reliability: ['reliable', 'consistent', 'trust', 'dependable', 'late', 'cancel', 'failure'],
  growth_momentum: ['growth', 'expand', 'new', 'opening', 'development', 'capital', 'anchor'],
}

function extractThemes(text) {
  if (!text || !text.trim()) return []
  const lower = text.toLowerCase()
  const matched = []
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) matched.push(theme)
  }
  return matched
}

function ratingSentiment(rating) {
  if (rating >= 4.5) return 'very_positive'
  if (rating >= 3.8) return 'positive'
  if (rating >= 3.0) return 'neutral'
  if (rating > 0) return 'negative'
  return 'unrated'
}

// Composite Sentiment Score (0-100): rating 40%, review volume 15%,
// red-flag penalty up to -20, delight bonus 15%, digital presence 10%.
function computeCss(row, rating) {
  const ratingScore = rating > 0 ? rating / 5.0 * 40 : 20
  const reviews = parseInt(parseFloat(row.rating_primary_review_count) || 0, 10)
  const reviewScore = Math.min(reviews, 200) / 200 * 15

  const hasFlag = (row.red_flag_present || '').trim().toUpperCase() === 'Y'
  const severity = (row.red_flag_severity || '').trim().toLowerCase()
  const flagPenalty = hasFlag ? ({ critical: 20, high: 15, medium: 10, low: 5 }[severity] ?? 10) : 0

  const delights = (row.top_delights || '').trim()
  const delightScore = delights ? Math.min(delights.split(';').length * 5, 15) : 0

  const hasWeb = !!(row.website || '').trim()
  const hasPhone = !!(row.phone || '').trim()
  const digitalScore = (hasWeb ? 5 : 0) + (hasPhone ? 5 : 0)

  return Math.max(0, Math.min(100, Math.round(ratingScore + reviewScore - flagPenalty + delightScore + digitalScore)))
}

// Sort a {key: count} object by count desc, like Counter.most_common().
const sortByCountDesc = (obj) => Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]))

// Per-business sentiment profiles — the core the themes aggregate is built from,
// and the CSS source the prediction model composes on. Returns one profile per
// row, in row order, matching the shape sentiment_profiles.json used.
export function computeProfiles(rows) {
  return rows.map(row => {
    const rating = parseFloat(row.rating_primary_value) || 0
    const reviews = parseInt(parseFloat(row.rating_primary_review_count) || 0, 10)
    const delights = (row.top_delights || '').trim()
    const pains = (row.top_pain_points || '').trim()

    const delightItems = delights ? delights.split(';').map(d => d.trim()).filter(Boolean) : []
    const painItems = pains ? pains.split(';').map(p => p.trim()).filter(Boolean) : []

    return {
      business_id: row.business_id || '',
      sentiment: ratingSentiment(rating),
      css: computeCss(row, rating),
      rating,
      review_count: reviews,
      delight_themes: extractThemes(delights),
      pain_themes: extractThemes(pains),
      delights: delightItems.slice(0, 3),
      pains: painItems.slice(0, 3),
      has_sentiment_text: !!(delights || pains),
    }
  })
}

export async function getSentimentThemes() {
  const rows = await getBusinesses()
  const profiles = computeProfiles(rows)

  const delightThemeCounts = {}
  const painThemeCounts = {}
  const sentimentDist = {}
  const categoryAgg = {} // category → { ratings:[], css:[], sentiments:{} }

  profiles.forEach((p, i) => {
    const category = rows[i].category_primary || 'other'
    for (const t of p.delight_themes) delightThemeCounts[t] = (delightThemeCounts[t] || 0) + 1
    for (const t of p.pain_themes) painThemeCounts[t] = (painThemeCounts[t] || 0) + 1
    sentimentDist[p.sentiment] = (sentimentDist[p.sentiment] || 0) + 1

    if (!categoryAgg[category]) categoryAgg[category] = { ratings: [], css: [], sentiments: {} }
    if (p.rating > 0) categoryAgg[category].ratings.push(p.rating)
    categoryAgg[category].css.push(p.css)
    categoryAgg[category].sentiments[p.sentiment] = (categoryAgg[category].sentiments[p.sentiment] || 0) + 1
  })

  // ── Category summaries ─────────────────────────────────────────────────────
  const categorySummaries = Object.entries(categoryAgg)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([cat, data]) => {
      const avgRating = data.ratings.length ? data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length : 0
      const avgCss = data.css.length ? data.css.reduce((s, c) => s + c, 0) / data.css.length : 0
      const dominant = Object.entries(data.sentiments).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unrated'
      const n = data.css.length
      return {
        category: cat,
        avg_rating: Math.round(avgRating * 100) / 100,
        avg_css: Math.round(avgCss),
        dominant_sentiment: dominant,
        count: n,
        positive_pct: Math.round(((data.sentiments.very_positive || 0) + (data.sentiments.positive || 0)) / n * 100),
        negative_pct: Math.round((data.sentiments.negative || 0) / n * 100),
      }
    })
    .sort((a, b) => b.avg_css - a.avg_css)

  return {
    generated_at: new Date().toISOString(),
    total_businesses: rows.length,
    with_sentiment_text: profiles.filter(p => p.has_sentiment_text).length,
    sentiment_distribution: sentimentDist,
    delight_themes: sortByCountDesc(delightThemeCounts),
    pain_themes: sortByCountDesc(painThemeCounts),
    category_sentiment: categorySummaries,
    top_positive: profiles.filter(p => p.css >= 70).sort((a, b) => b.css - a.css).slice(0, 20),
    top_negative: profiles.filter(p => p.css <= 35).sort((a, b) => a.css - b.css).slice(0, 20),
  }
}
