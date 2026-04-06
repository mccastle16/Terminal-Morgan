// Recruitability scoring engine
// Ranks non-member businesses by likelihood of chamber relevance and conversion value

const WEIGHTS = {
  categoryFit:      0.15,  // Is it a desirable category for the chamber?
  locationQuality:  0.10,  // Has valid coordinates and good neighborhood?
  websitePresence:  0.10,  // Has a website?
  phonePresence:    0.10,  // Has a phone number?
  ratingStrength:   0.20,  // Strong rating = established business
  validationTier:   0.15,  // Higher validation = more trustworthy data
  corroboration:    0.10,  // Multi-source confirmation
  reviewVolume:     0.10,  // Review count signals visibility
}

// Categories chambers typically want most as members
const HIGH_VALUE_CATEGORIES = new Set([
  'legal', 'financial_services', 'banking', 'insurance', 'real_estate',
  'consulting', 'professional_services', 'technology', 'healthcare',
  'accounting', 'hospitality', 'construction',
])

const MEDIUM_VALUE_CATEGORIES = new Set([
  'food_beverage', 'retail', 'wellness', 'education', 'marketing',
  'arts_culture', 'nonprofit',
])

export function computeRecruitabilityScore(business) {
  let score = 0

  // Category fit (0-100)
  const cat = business.category_primary?.toLowerCase() || ''
  if (HIGH_VALUE_CATEGORIES.has(cat)) score += WEIGHTS.categoryFit * 100
  else if (MEDIUM_VALUE_CATEGORIES.has(cat)) score += WEIGHTS.categoryFit * 60
  else if (cat !== 'other') score += WEIGHTS.categoryFit * 30

  // Location quality
  const hasGeo = business.lat && business.lon && business.lat !== '' && business.lon !== ''
  const hasNeighborhood = business.neighborhood_area && business.neighborhood_area !== '' && business.neighborhood_area !== 'Coral Gables'
  if (hasGeo && hasNeighborhood) score += WEIGHTS.locationQuality * 100
  else if (hasGeo || hasNeighborhood) score += WEIGHTS.locationQuality * 50

  // Website presence
  if (business.website && business.website.trim() !== '') score += WEIGHTS.websitePresence * 100

  // Phone presence
  if (business.phone && business.phone.trim() !== '') score += WEIGHTS.phonePresence * 100

  // Rating strength (scale 0-5 → 0-100)
  const rating = parseFloat(business.rating_primary_value) || 0
  if (rating >= 4.5) score += WEIGHTS.ratingStrength * 100
  else if (rating >= 4.0) score += WEIGHTS.ratingStrength * 85
  else if (rating >= 3.5) score += WEIGHTS.ratingStrength * 60
  else if (rating >= 3.0) score += WEIGHTS.ratingStrength * 40
  else if (rating > 0) score += WEIGHTS.ratingStrength * 20

  // Validation tier
  const tier = business.validation_tier?.toLowerCase() || ''
  if (tier === 'high') score += WEIGHTS.validationTier * 100
  else if (tier === 'moderate') score += WEIGHTS.validationTier * 60
  else if (tier === 'low') score += WEIGHTS.validationTier * 25

  // Corroboration
  const corr = parseInt(business.corroboration_count) || 0
  if (corr >= 3) score += WEIGHTS.corroboration * 100
  else if (corr === 2) score += WEIGHTS.corroboration * 70
  else if (corr === 1) score += WEIGHTS.corroboration * 30

  // Review volume
  const reviews = parseInt(business.rating_primary_review_count) || 0
  if (reviews >= 50) score += WEIGHTS.reviewVolume * 100
  else if (reviews >= 20) score += WEIGHTS.reviewVolume * 75
  else if (reviews >= 5) score += WEIGHTS.reviewVolume * 40
  else if (reviews > 0) score += WEIGHTS.reviewVolume * 15

  return Math.round(score)
}

export function getRecruitabilityBand(score) {
  if (score >= 75) return { band: 'A', label: 'Top Prospect', color: '#22c55e' }
  if (score >= 55) return { band: 'B', label: 'Strong Prospect', color: '#3b82f6' }
  if (score >= 35) return { band: 'C', label: 'Moderate Prospect', color: '#c9a227' }
  return { band: 'D', label: 'Low Priority', color: '#94a3b8' }
}

export function getRecruitReasons(business) {
  const reasons = []
  const rating = parseFloat(business.rating_primary_value) || 0
  const reviews = parseInt(business.rating_primary_review_count) || 0
  const cat = business.category_primary?.toLowerCase() || ''

  if (HIGH_VALUE_CATEGORIES.has(cat)) reasons.push('High-value category for chamber')
  if (rating >= 4.0) reasons.push(`Strong rating (${rating.toFixed(1)})`)
  if (reviews >= 20) reasons.push(`Visible business (${reviews} reviews)`)
  if (business.website) reasons.push('Active web presence')
  if (business.neighborhood_area === 'Miracle Mile' || business.neighborhood_area === 'Merrick Park')
    reasons.push(`Prime location: ${business.neighborhood_area}`)

  const corr = parseInt(business.corroboration_count) || 0
  if (corr >= 2) reasons.push(`Multi-source verified (${corr} sources)`)

  return reasons.length > 0 ? reasons : ['Potential local business prospect']
}
