// ─── Business Advisor AI Engine ───────────────────────────────────────────────
// Mirrors a clinical assistant pattern applied to business intelligence:
//   Health topics       → Business topics (explain concepts, break down step-by-step)
//   Track symptoms      → Diagnose business issues (ask probing questions, organize findings)
//   General guidance    → Actionable business tips (quick wins, when to escalate)
//   Organize health info → Compile intel summary for decision-makers
//
// The engine analyzes the business data context, the user's role, and the
// conversation history to produce structured responses with optional chart specs.

// ── Intent classification ─────────────────────────────────────────────────────

const INTENT_PATTERNS = [
  { intent: 'diagnose',    patterns: [/why\s+(is|are|does|do|isn't|aren't)/i, /what('s| is) (wrong|happening|going on)/i, /diagnos/i, /problem|issue|struggle|declining|dropping|losing/i, /red.?flag/i, /risk/i] },
  { intent: 'explain',     patterns: [/what\s+(is|are|does)/i, /explain/i, /how\s+does/i, /tell me about/i, /define/i, /meaning of/i, /step.?by.?step/i, /break.*down/i, /walk.*through/i] },
  { intent: 'compare',     patterns: [/compare/i, /vs\.?|versus/i, /difference between/i, /better|worse/i, /how.*stack/i, /benchmark/i] },
  { intent: 'recommend',   patterns: [/what should/i, /recommend/i, /suggest/i, /tip|advice|guidance/i, /how\s+(can|do|to)\s+(i|we)/i, /improve/i, /boost|increase|grow/i, /next step/i] },
  { intent: 'track',       patterns: [/track/i, /monitor/i, /watch|watching/i, /trend/i, /over time/i, /history/i, /progress/i, /symptom/i] },
  { intent: 'summarize',   patterns: [/summar/i, /overview/i, /brief|briefing/i, /report/i, /recap/i, /status/i, /snapshot/i, /organize/i, /compile/i] },
  { intent: 'experiment',  patterns: [/what\s+if/i, /experiment/i, /simul/i, /test|testing/i, /scenario/i, /hypothe/i, /change.*would/i, /impact.*of/i, /try.*different/i] },
  { intent: 'chart',       patterns: [/chart|graph|plot|visual/i, /show\s+me/i, /draw/i, /pie|bar|line|scatter/i, /distribution/i, /breakdown/i] },
]

export function classifyIntent(message) {
  const msg = message.trim()
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(msg))) return intent
  }
  return 'general'
}

// ── Entity extraction ─────────────────────────────────────────────────────────

export function extractEntities(message, stats, rawBusinesses) {
  const entities = { businesses: [], categories: [], neighborhoods: [], metrics: [] }
  if (!stats) return entities
  const msg = message.toLowerCase()

  // Match business names (fuzzy substring)
  rawBusinesses?.forEach(b => {
    const name = b.business_name?.toLowerCase()
    if (name && name.length > 3 && msg.includes(name.slice(0, Math.min(name.length, 20)))) {
      entities.businesses.push(b)
    }
  })

  // Match categories
  stats.categories?.forEach(cat => {
    const readable = cat.replace(/_/g, ' ').toLowerCase()
    if (msg.includes(readable) || msg.includes(cat.toLowerCase())) {
      entities.categories.push(cat)
    }
  })

  // Match neighborhoods
  stats.neighborhoods?.forEach(hood => {
    if (msg.includes(hood.toLowerCase())) {
      entities.neighborhoods.push(hood)
    }
  })

  // Match metric keywords
  const METRIC_KEYWORDS = {
    rating: [/rating/i, /stars?/i, /review score/i],
    membership: [/member/i, /penetration/i, /chamber/i],
    recruitment: [/recruit/i, /prospect/i, /pipeline/i, /non.?member/i],
    risk: [/risk/i, /flag/i, /red.?flag/i, /danger/i, /warning/i],
    quality: [/quality/i, /validation/i, /coverage/i, /data/i],
    revenue: [/revenue/i, /sales/i, /income/i, /earning/i],
    competition: [/compet/i, /rival/i, /market\s*share/i],
  }
  for (const [metric, patterns] of Object.entries(METRIC_KEYWORDS)) {
    if (patterns.some(p => p.test(message))) entities.metrics.push(metric)
  }

  return entities
}

// ── Response generators by intent ─────────────────────────────────────────────

function generateDiagnosis(message, entities, stats, rawBusinesses) {
  const sections = []
  const chartSpec = []

  // Business-specific diagnosis
  if (entities.businesses.length > 0) {
    const biz = entities.businesses[0]
    const issues = []
    if (biz._rating < 3.5 && biz._rating > 0) issues.push({ severity: 'high', issue: `Low rating (${biz._rating.toFixed(1)}/5)`, detail: 'Below average rating signals customer dissatisfaction. Common causes: service inconsistency, wait times, or unmet expectations.', action: 'Review recent negative reviews for recurring themes. Address top 2-3 complaints systematically.' })
    if (!biz._hasWebsite) issues.push({ severity: 'medium', issue: 'No website presence', detail: 'Missing website reduces discoverability by ~40%. Potential customers searching online cannot find or verify this business.', action: 'Even a simple single-page site with hours, location, and contact info improves trust. Google Business Profile is free and immediate.' })
    if (!biz._hasPhone) issues.push({ severity: 'medium', issue: 'No phone contact listed', detail: 'Missing phone number reduces trust and makes the business appear inactive or unreachable.', action: 'List a business phone number on Google Business Profile and directory listings.' })
    if (biz._hasRedFlag) issues.push({ severity: 'high', issue: 'Active red flag(s)', detail: `This business has been flagged: ${[biz.red_flag_1, biz.red_flag_2, biz.red_flag_3].filter(Boolean).join(', ')}`, action: 'Investigate flag details. If accuracy confirmed, engagement should be cautious. If data error, flag for review.' })
    if (biz._validationTier < 2) issues.push({ severity: 'low', issue: 'Low data validation', detail: 'Data for this business comes from limited sources. Information may be outdated or inaccurate.', action: 'Cross-reference with official records (Sunbiz, county). Direct outreach can verify key details.' })
    if (biz._memberStatus === 'unknown') issues.push({ severity: 'medium', issue: 'Unknown membership status', detail: 'Cannot determine if this business is a current chamber member. This creates gaps in penetration reporting.', action: 'Check membership database. If not found, classify and add to recruit pipeline if appropriate.' })

    if (issues.length === 0) issues.push({ severity: 'none', issue: 'No immediate issues detected', detail: `${biz.business_name} appears healthy: ${biz._rating > 0 ? `${biz._rating.toFixed(1)} rating` : 'no rating'}, ${biz._hasWebsite ? 'has website' : 'no website'}, validation tier ${biz._validationTier}.`, action: 'Continue monitoring. Consider for case study or testimonial if they are a member.' })

    sections.push({
      title: `Diagnostic Report: ${biz.business_name}`,
      type: 'diagnosis',
      items: issues,
    })
  }

  // Category-level diagnosis
  if (entities.categories.length > 0) {
    entities.categories.forEach(cat => {
      const catData = stats.categoryPenetration?.find(c => c.category === cat)
      if (catData) {
        const issues = []
        if (catData.penetration < 20) issues.push({ severity: 'high', issue: `Very low penetration (${catData.penetration.toFixed(0)}%)`, detail: `Only ${catData.members} of ${catData.total} ${cat.replace(/_/g, ' ')} businesses are members. Large untapped pool of ${catData.nonMembers} non-members.`, action: 'Priority recruitment category. Develop category-specific value proposition for outreach.' })
        else if (catData.penetration < 40) issues.push({ severity: 'medium', issue: `Below-average penetration (${catData.penetration.toFixed(0)}%)`, detail: `${catData.members} members out of ${catData.total}. Room to grow with ${catData.nonMembers} non-members.`, action: 'Targeted campaign for this category. Leverage existing member testimonials.' })
        if (catData.unknowns > catData.total * 0.3) issues.push({ severity: 'medium', issue: `High unknown rate (${catData.unknowns} businesses)`, detail: `${((catData.unknowns / catData.total) * 100).toFixed(0)}% of businesses in this category have unknown membership status.`, action: 'Data enrichment priority. Cross-reference with membership database to resolve unknowns.' })

        sections.push({ title: `Category Diagnosis: ${cat.replace(/_/g, ' ')}`, type: 'diagnosis', items: issues })

        chartSpec.push({
          type: 'pie',
          title: `${cat.replace(/_/g, ' ')} — Membership Breakdown`,
          data: [
            { name: 'Members', value: catData.members, color: '#f59e0b' },
            { name: 'Non-members', value: catData.nonMembers, color: '#3b82f6' },
            { name: 'Unknown', value: catData.unknowns, color: '#475569' },
          ],
        })
      }
    })
  }

  // General market diagnosis
  if (entities.businesses.length === 0 && entities.categories.length === 0) {
    const issues = []
    if (stats.membershipKnownRate < 70) issues.push({ severity: 'high', issue: `Low membership classification rate (${stats.membershipKnownRate.toFixed(0)}%)`, detail: `${stats.unknowns} businesses have unknown membership status. This undermines penetration metrics and recruitment targeting.`, action: 'Prioritize data enrichment. Match against membership database. Classify top-revenue categories first.' })
    if (stats.redFlagCount > stats.total * 0.05) issues.push({ severity: 'medium', issue: `Elevated red flag rate (${stats.redFlagCount} businesses)`, detail: `${((stats.redFlagCount / stats.total) * 100).toFixed(1)}% of businesses flagged. May indicate data quality issues or real market concerns.`, action: 'Audit flags for accuracy. Separate data errors from genuine risks. Brief leadership on confirmed critical flags.' })
    const lowPenHoods = stats.neighborhoodPenetration?.filter(h => h.penetration < 25) || []
    if (lowPenHoods.length > 0) issues.push({ severity: 'medium', issue: `${lowPenHoods.length} neighborhoods under 25% penetration`, detail: `Neighborhoods: ${lowPenHoods.slice(0, 3).map(h => h.neighborhood).join(', ')}${lowPenHoods.length > 3 ? ` (+${lowPenHoods.length - 3} more)` : ''}`, action: 'Geo-targeted outreach campaigns. Consider neighborhood-specific networking events.' })

    sections.push({ title: 'Market Health Diagnosis', type: 'diagnosis', items: issues })
  }

  return { sections, chartSpec, followUp: 'Would you like me to drill deeper into any of these findings, or generate an action plan?' }
}

function generateExplanation(message, entities, stats) {
  const sections = []
  const msg = message.toLowerCase()

  // Explain specific metrics
  if (msg.includes('penetration') || msg.includes('membership rate')) {
    sections.push({
      title: 'Membership Penetration — Explained',
      type: 'explanation',
      steps: [
        { step: 1, title: 'What it is', content: 'Membership penetration measures what percentage of known businesses in an area or category are chamber members. It\'s your market coverage indicator.' },
        { step: 2, title: 'How it\'s calculated', content: `Members ÷ Total Known Businesses × 100. Currently: ${stats?.members || 0} ÷ ${stats?.total || 0} = ${stats ? ((stats.members / stats.total) * 100).toFixed(1) : 0}%` },
        { step: 3, title: 'Why it matters', content: 'Higher penetration = stronger chamber influence, better data quality, more revenue from dues, and more representative voice for the business community.' },
        { step: 4, title: 'What affects it', content: 'New business openings (dilutes rate), successful recruitment (improves rate), member churn (reduces rate), and data classification of unknowns (changes denominator).' },
        { step: 5, title: 'Your current state', content: `${stats?.members || 0} members across ${stats?.categories?.length || 0} categories and ${stats?.neighborhoods?.length || 0} neighborhoods. ${stats?.unknowns || 0} businesses still unclassified.` },
      ],
    })
  }

  if (msg.includes('recruit') || msg.includes('scoring') || msg.includes('band')) {
    sections.push({
      title: 'Recruit Scoring — Explained',
      type: 'explanation',
      steps: [
        { step: 1, title: 'What it is', content: 'A 0-100 score that ranks non-member businesses by how valuable and likely they would be as chamber members.' },
        { step: 2, title: 'Scoring factors', content: 'Category fit (15%), Rating strength (20%), Validation tier (15%), Website presence (10%), Phone listing (10%), Location quality (10%), Corroboration (10%), Review volume (10%).' },
        { step: 3, title: 'Band definitions', content: 'Band A (75+): Top prospects — established, visible businesses in high-value categories. Band B (55-74): Strong candidates worth active outreach. Band C (35-54): Moderate — may need nurturing. Band D (<35): Low priority — limited data or low-value signals.' },
        { step: 4, title: 'How to use it', content: 'Focus outreach on Band A and B. Use recruit reasons to personalize the pitch. Band C prospects may convert with category-specific events.' },
      ],
    })
  }

  if (msg.includes('validation') || msg.includes('data quality') || msg.includes('tier')) {
    sections.push({
      title: 'Data Validation Tiers — Explained',
      type: 'explanation',
      steps: [
        { step: 1, title: 'What it is', content: 'A confidence score for how trustworthy the business data is, based on how many independent sources confirmed it.' },
        { step: 2, title: 'Tier levels', content: 'Tier 3 (High): Confirmed by 3+ sources — very reliable. Tier 2 (Moderate): 2 sources — generally trustworthy. Tier 1 (Low): Single source — may need verification.' },
        { step: 3, title: 'Sources used', content: 'Google Maps, Yelp, Outscraper, OpenStreetMap, SerpAPI, Sunbiz filings, chamber membership databases.' },
        { step: 4, title: 'Why it matters', content: `Currently ${stats?.dataQuality?.highValidationRate?.toFixed(0) || 0}% of businesses are Tier 3. Higher validation means you can trust the data for outreach without manual verification.` },
      ],
    })
  }

  if (msg.includes('red flag') || msg.includes('risk')) {
    sections.push({
      title: 'Red Flags & Risk — Explained',
      type: 'explanation',
      steps: [
        { step: 1, title: 'What they are', content: 'Red flags indicate potential problems: permanent closures, license issues, fraud indicators, negative patterns, or data anomalies.' },
        { step: 2, title: 'Severity levels', content: 'Critical: Potential closures, fraud, legal issues — requires immediate attention. Moderate: Data inconsistencies, negative review patterns — monitor and verify.' },
        { step: 3, title: 'Current state', content: `${stats?.redFlagCount || 0} businesses flagged, ${stats?.criticalFlags || 0} critical. ${stats?.redFlagCount && stats?.total ? ((stats.redFlagCount / stats.total) * 100).toFixed(1) : 0}% flag rate.` },
        { step: 4, title: 'What to do', content: 'Review critical flags first. Verify data accuracy — some flags may be false positives from stale data. Share confirmed risks with leadership for appropriate action.' },
      ],
    })
  }

  // Generic fallback
  if (sections.length === 0) {
    sections.push({
      title: 'Business Intelligence Concepts',
      type: 'explanation',
      steps: [
        { step: 1, title: 'Ask me about specific topics', content: 'I can explain: membership penetration, recruit scoring & bands, data validation tiers, red flags & risk assessment, category analysis, neighborhood analytics, and data quality metrics.' },
        { step: 2, title: 'How I work', content: 'I analyze the full business database, break down concepts step-by-step, and connect them to your specific data. Ask about any metric, business, category, or neighborhood.' },
      ],
    })
  }

  return { sections, chartSpec: [], followUp: 'Want me to explain any of these concepts in more detail, or apply them to a specific business or category?' }
}

function generateRecommendation(message, entities, stats, rawBusinesses) {
  const sections = []
  const chartSpec = []

  if (entities.businesses.length > 0) {
    const biz = entities.businesses[0]
    const tips = []
    if (biz._rating < 4.0 && biz._rating > 0) tips.push({ priority: 'high', tip: 'Improve online rating', detail: `Current rating: ${biz._rating.toFixed(1)}. Encourage satisfied customers to leave reviews. Respond professionally to negative reviews within 24 hours. Target: 4.0+ within 6 months.` })
    if (!biz._hasWebsite) tips.push({ priority: 'high', tip: 'Establish web presence', detail: 'Create a basic website or optimize Google Business Profile. Include: business hours, services, contact info, photos. Free options: Google Sites, Carrd, or even a well-maintained GBP.' })
    if (biz._memberStatus === 'non-member') tips.push({ priority: 'medium', tip: 'Consider chamber membership', detail: `Recruit score: ${biz._recruitScore || 'N/A'}. Chamber membership provides networking, referrals, directory listing, and advocacy. Contact membership director for tailored benefits.` })
    if (biz._reviewCount < 10) tips.push({ priority: 'medium', tip: 'Build review volume', detail: `Only ${biz._reviewCount} reviews. Add "Leave us a review" QR codes at point-of-sale. Follow up with customers via email/text. Target: 25+ reviews for credibility threshold.` })
    if (tips.length === 0) tips.push({ priority: 'info', tip: 'Business looks healthy', detail: `${biz.business_name} has solid fundamentals. Focus on maintaining quality and exploring growth opportunities within the ${biz.category_primary?.replace(/_/g, ' ')} sector.` })

    sections.push({ title: `Recommendations for ${biz.business_name}`, type: 'recommendations', items: tips })
  } else if (entities.categories.length > 0) {
    entities.categories.forEach(cat => {
      const catData = stats.categoryPenetration?.find(c => c.category === cat)
      if (catData) {
        const tips = []
        if (catData.penetration < 30) tips.push({ priority: 'high', tip: 'Launch category recruitment campaign', detail: `Only ${catData.penetration.toFixed(0)}% penetration. ${catData.nonMembers} non-members available. Create category-specific value proposition highlighting industry-relevant benefits.` })
        tips.push({ priority: 'medium', tip: 'Host category networking event', detail: `Bring together the ${catData.members} current members with prospects. Category-specific events have higher conversion rates than general mixers.` })
        if (catData.unknowns > 5) tips.push({ priority: 'medium', tip: 'Classify unknown businesses', detail: `${catData.unknowns} businesses in this category have unknown membership status. Resolving these improves targeting accuracy.` })
        sections.push({ title: `Recommendations for ${cat.replace(/_/g, ' ')}`, type: 'recommendations', items: tips })
      }
    })
  } else {
    const tips = [
      { priority: 'high', tip: 'Address data gaps', detail: `${stats?.unknowns || 0} businesses unclassified. Resolve membership status to unlock accurate penetration metrics and recruitment targeting.` },
      { priority: 'high', tip: 'Focus on Band-A recruits', detail: 'Start outreach with highest-scored prospects. Personalize using recruit reasons. Expected conversion rate for Band-A: 15-25%.' },
      { priority: 'medium', tip: 'Improve neighborhood coverage', detail: 'Target low-penetration neighborhoods with geo-specific events and partnerships with anchor businesses.' },
      { priority: 'low', tip: 'Audit red flags', detail: `${stats?.redFlagCount || 0} active flags. Verify accuracy and brief leadership on confirmed critical risks.` },
    ]
    sections.push({ title: 'Strategic Recommendations', type: 'recommendations', items: tips })
  }

  return { sections, chartSpec, followUp: 'Should I create a detailed action plan for any of these recommendations?' }
}

function generateTracking(message, entities, stats) {
  const sections = []

  const questions = [
    'What specific metric or issue are you trying to track?',
    'Is this about a particular business, category, or the overall market?',
    'What time frame are you interested in — weekly, monthly, quarterly?',
    'What would "improvement" look like for this metric? What\'s your target?',
    'Have you noticed any changes recently that prompted this?',
  ]

  if (entities.metrics.length > 0) {
    const tracked = entities.metrics.map(m => {
      switch (m) {
        case 'rating': return { metric: 'Average Rating', current: stats?.avgRating?.toFixed(2) || 'N/A', benchmark: '4.0+ is competitive', trend: 'Stable — check monthly' }
        case 'membership': return { metric: 'Membership Penetration', current: `${stats ? ((stats.members / stats.total) * 100).toFixed(1) : 0}%`, benchmark: '40%+ is strong for a chamber', trend: 'Track after each recruitment push' }
        case 'recruitment': return { metric: 'Recruit Pipeline', current: `${stats?.total - stats?.members || 0} non-members`, benchmark: 'Convert 10-15% of Band-A quarterly', trend: 'Monitor conversion rate monthly' }
        case 'risk': return { metric: 'Red Flag Rate', current: `${stats?.redFlagCount || 0} flagged (${stats ? ((stats.redFlagCount / stats.total) * 100).toFixed(1) : 0}%)`, benchmark: '<3% is healthy', trend: 'Review after each data refresh' }
        case 'quality': return { metric: 'Data Quality', current: `${stats?.dataQuality?.highValidationRate?.toFixed(0) || 0}% high-validation`, benchmark: '70%+ enables confident outreach', trend: 'Improves each refresh cycle' }
        default: return { metric: m, current: 'Ask me for specifics', benchmark: 'Depends on context', trend: 'Let me analyze' }
      }
    })

    sections.push({ title: 'Tracking Dashboard', type: 'tracking', items: tracked })
  } else {
    sections.push({
      title: 'Let\'s Set Up Tracking',
      type: 'intake',
      questions,
      intro: 'To track effectively, I need to understand what you\'re monitoring. Here are some questions to organize your tracking:',
    })
  }

  return { sections, chartSpec: [], followUp: 'Which of these metrics would you like me to monitor? I can create a tracking checklist with targets and review cadence.' }
}

function generateSummary(message, entities, stats, rawBusinesses) {
  const sections = []
  const chartSpec = []

  if (entities.businesses.length > 0) {
    const biz = entities.businesses[0]
    sections.push({
      title: `Intel Summary: ${biz.business_name}`,
      type: 'summary',
      summary: {
        business: biz.business_name,
        category: biz.category_primary?.replace(/_/g, ' '),
        neighborhood: biz.neighborhood_area || 'Coral Gables',
        memberStatus: biz._memberStatus,
        rating: biz._rating > 0 ? `${biz._rating.toFixed(1)} (${biz._reviewCount} reviews)` : 'No rating',
        validation: `Tier ${biz._validationTier}`,
        webPresence: [biz._hasWebsite && 'Website', biz._hasPhone && 'Phone'].filter(Boolean).join(', ') || 'Limited',
        riskFlags: biz._hasRedFlag ? [biz.red_flag_1, biz.red_flag_2, biz.red_flag_3].filter(Boolean) : ['None'],
        recruitScore: biz._memberStatus !== 'member' ? `${biz._recruitScore} (${biz._recruitBand?.label})` : 'N/A (member)',
      },
      needsAttention: biz._hasRedFlag || biz._rating < 3 || biz._validationTier < 2,
      clinicianNote: biz._hasRedFlag
        ? 'This business has active flags that warrant leadership review before engagement.'
        : biz._memberStatus === 'non-member' && biz._recruitScore >= 55
          ? 'Strong recruit candidate — recommend passing to membership director for outreach.'
          : 'Standard profile. No immediate escalation needed.',
    })
  } else {
    sections.push({
      title: 'Market Intelligence Briefing',
      type: 'summary',
      summary: {
        totalBusinesses: stats?.total?.toLocaleString() || 0,
        members: `${stats?.members?.toLocaleString() || 0} (${stats ? ((stats.members / stats.total) * 100).toFixed(1) : 0}%)`,
        nonMembers: `${stats?.nonMembers?.toLocaleString() || 0}`,
        unknown: `${stats?.unknowns?.toLocaleString() || 0}`,
        avgRating: stats?.avgRating?.toFixed(2) || 'N/A',
        topCategory: stats?.categoryPenetration?.[0]?.category?.replace(/_/g, ' ') || 'N/A',
        riskFlags: `${stats?.redFlagCount || 0} (${stats?.criticalFlags || 0} critical)`,
        dataQuality: `${stats?.dataQuality?.highValidationRate?.toFixed(0) || 0}% high-validation`,
      },
      needsAttention: (stats?.unknowns || 0) > (stats?.total || 1) * 0.3 || (stats?.criticalFlags || 0) > 0,
      clinicianNote: (stats?.criticalFlags || 0) > 0
        ? `${stats.criticalFlags} critical flags require leadership review.`
        : (stats?.unknowns || 0) > (stats?.total || 1) * 0.3
          ? 'High unclassified rate impacts reporting accuracy. Data enrichment recommended.'
          : 'Market data is in good shape. Continue regular monitoring.',
    })

    chartSpec.push({
      type: 'pie',
      title: 'Current Membership Distribution',
      data: [
        { name: 'Members', value: stats?.members || 0, color: '#f59e0b' },
        { name: 'Non-members', value: stats?.nonMembers || 0, color: '#3b82f6' },
        { name: 'Unknown', value: stats?.unknowns || 0, color: '#475569' },
      ],
    })
  }

  return { sections, chartSpec, followUp: 'Would you like me to flag anything specific for leadership review, or dive deeper into any area?' }
}

function generateComparison(message, entities, stats, rawBusinesses) {
  const sections = []
  const chartSpec = []

  if (entities.businesses.length >= 2) {
    const [a, b] = entities.businesses
    const fields = [
      { label: 'Rating', a: a._rating > 0 ? a._rating.toFixed(1) : '—', b: b._rating > 0 ? b._rating.toFixed(1) : '—', winner: a._rating >= b._rating ? 'A' : 'B' },
      { label: 'Reviews', a: String(a._reviewCount), b: String(b._reviewCount), winner: a._reviewCount >= b._reviewCount ? 'A' : 'B' },
      { label: 'Validation', a: `Tier ${a._validationTier}`, b: `Tier ${b._validationTier}`, winner: a._validationTier >= b._validationTier ? 'A' : 'B' },
      { label: 'Web Presence', a: a._hasWebsite ? 'Yes' : 'No', b: b._hasWebsite ? 'Yes' : 'No', winner: a._hasWebsite && !b._hasWebsite ? 'A' : !a._hasWebsite && b._hasWebsite ? 'B' : 'tie' },
      { label: 'Member Status', a: a._memberStatus, b: b._memberStatus, winner: 'tie' },
    ]

    sections.push({
      title: `${a.business_name} vs ${b.business_name}`,
      type: 'comparison',
      businessA: a.business_name,
      businessB: b.business_name,
      fields,
    })

    chartSpec.push({
      type: 'bar',
      title: 'Head-to-Head Comparison',
      data: [
        { name: 'Rating', [a.business_name]: a._rating, [b.business_name]: b._rating },
        { name: 'Reviews', [a.business_name]: a._reviewCount, [b.business_name]: b._reviewCount },
        { name: 'Validation', [a.business_name]: a._validationTier, [b.business_name]: b._validationTier },
      ],
    })
  } else if (entities.categories.length >= 2) {
    const cats = entities.categories.slice(0, 2).map(cat => stats.categoryPenetration?.find(c => c.category === cat)).filter(Boolean)
    if (cats.length === 2) {
      sections.push({
        title: `${cats[0].category.replace(/_/g, ' ')} vs ${cats[1].category.replace(/_/g, ' ')}`,
        type: 'comparison',
        businessA: cats[0].category.replace(/_/g, ' '),
        businessB: cats[1].category.replace(/_/g, ' '),
        fields: [
          { label: 'Total', a: String(cats[0].total), b: String(cats[1].total), winner: cats[0].total >= cats[1].total ? 'A' : 'B' },
          { label: 'Members', a: String(cats[0].members), b: String(cats[1].members), winner: cats[0].members >= cats[1].members ? 'A' : 'B' },
          { label: 'Penetration', a: `${cats[0].penetration.toFixed(0)}%`, b: `${cats[1].penetration.toFixed(0)}%`, winner: cats[0].penetration >= cats[1].penetration ? 'A' : 'B' },
        ],
      })
    }
  } else {
    sections.push({
      title: 'Comparison',
      type: 'prompt',
      content: 'Tell me which two businesses, categories, or neighborhoods you\'d like to compare. For example:\n\n• "Compare food beverage vs healthcare"\n• "Compare Miracle Mile vs Merrick Park"\n• Mention two business names in your message',
    })
  }

  return { sections, chartSpec, followUp: 'Want me to dig deeper into any specific aspect of this comparison?' }
}

function generateChartResponse(message, entities, stats, rawBusinesses) {
  const chartSpec = []
  const sections = []
  const msg = message.toLowerCase()

  if (msg.includes('pie') || msg.includes('distribution') || msg.includes('breakdown')) {
    if (msg.includes('member')) {
      chartSpec.push({ type: 'pie', title: 'Membership Distribution', data: [
        { name: 'Members', value: stats?.members || 0, color: '#f59e0b' },
        { name: 'Non-members', value: stats?.nonMembers || 0, color: '#3b82f6' },
        { name: 'Unknown', value: stats?.unknowns || 0, color: '#475569' },
      ] })
    } else if (entities.categories.length > 0) {
      const cat = entities.categories[0]
      const data = stats?.categoryPenetration?.find(c => c.category === cat)
      if (data) chartSpec.push({ type: 'pie', title: `${cat.replace(/_/g, ' ')} Breakdown`, data: [
        { name: 'Members', value: data.members, color: '#f59e0b' },
        { name: 'Non-members', value: data.nonMembers, color: '#3b82f6' },
        { name: 'Unknown', value: data.unknowns, color: '#475569' },
      ] })
    }
  }

  if (msg.includes('bar') || msg.includes('category') || msg.includes('top')) {
    const topCats = stats?.categoryPenetration?.slice(0, 10)?.map(c => ({
      name: c.category.replace(/_/g, ' ').slice(0, 14), Members: c.members, 'Non-members': c.nonMembers, Unknown: c.unknowns,
    })) || []
    if (topCats.length > 0) chartSpec.push({ type: 'bar', title: 'Top Categories by Size', data: topCats })
  }

  if (msg.includes('neighborhood') || msg.includes('hood')) {
    const hoods = stats?.neighborhoodPenetration?.map(h => ({
      name: h.neighborhood.slice(0, 14), Members: h.members, 'Non-members': h.nonMembers, Unknown: h.unknowns,
    })) || []
    if (hoods.length > 0) chartSpec.push({ type: 'bar', title: 'Neighborhoods — Membership', data: hoods })
  }

  if (msg.includes('rating')) {
    const buckets = [{ name: '1-2', min: 0, max: 2.5, count: 0 }, { name: '2-3', min: 2.5, max: 3.5, count: 0 }, { name: '3-4', min: 3.5, max: 4, count: 0 }, { name: '4-4.5', min: 4, max: 4.5, count: 0 }, { name: '4.5-5', min: 4.5, max: 5.1, count: 0 }]
    rawBusinesses?.forEach(b => { if (b._rating > 0) { const bk = buckets.find(k => b._rating >= k.min && b._rating < k.max); if (bk) bk.count++ } })
    chartSpec.push({ type: 'bar', title: 'Rating Distribution', data: buckets.map((b, i) => ({ name: b.name, count: b.count, fill: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'][i] })) })
  }

  if (msg.includes('quality') || msg.includes('coverage')) {
    const dq = stats?.dataQuality
    if (dq) chartSpec.push({ type: 'bar', title: 'Data Quality Coverage', data: [
      { name: 'Phone', value: dq.phoneCoverage, fill: '#22c55e' },
      { name: 'Website', value: dq.websiteCoverage, fill: '#3b82f6' },
      { name: 'Geo', value: dq.geoCoverage, fill: '#8b5cf6' },
      { name: 'Rating', value: dq.ratingCoverage, fill: '#f59e0b' },
      { name: 'High Valid.', value: dq.highValidationRate, fill: '#06b6d4' },
    ] })
  }

  if (chartSpec.length === 0) {
    sections.push({
      title: 'Dynamic Chart Builder',
      type: 'prompt',
      content: 'Tell me what you\'d like to visualize. I can build:\n\n• **Pie charts**: membership distribution, category breakdowns\n• **Bar charts**: top categories, neighborhoods, ratings, data quality\n• **Comparisons**: category vs category, neighborhood vs neighborhood\n\nExamples:\n• "Show me a pie chart of membership distribution"\n• "Bar chart of top categories"\n• "Rating distribution chart"\n• "Data quality coverage chart"',
    })
  } else {
    sections.push({ title: 'Charts Generated', type: 'info', content: `Generated ${chartSpec.length} chart${chartSpec.length > 1 ? 's' : ''} based on your request. See below.` })
  }

  return { sections, chartSpec, followUp: 'Want me to adjust these charts, add more detail, or try a different visualization?' }
}

function generateExperiment(message, entities, stats, rawBusinesses) {
  const sections = []
  const chartSpec = []
  const msg = message.toLowerCase()

  // Extract experiment parameters
  let scenario = null

  if (msg.includes('recruit') || msg.includes('convert')) {
    const conversionRate = msg.match(/(\d+)%/) ? parseInt(msg.match(/(\d+)%/)[1]) / 100 : 0.15
    const bandACount = rawBusinesses?.filter(b => b._recruitBand?.band === 'A').length || 0
    const bandBCount = rawBusinesses?.filter(b => b._recruitBand?.band === 'B').length || 0
    const newMembersA = Math.round(bandACount * conversionRate)
    const newMembersB = Math.round(bandBCount * (conversionRate * 0.6))
    const totalNew = newMembersA + newMembersB
    const newTotal = (stats?.members || 0) + totalNew
    const newPenetration = stats?.total ? (newTotal / stats.total * 100) : 0

    scenario = {
      title: `Recruitment Campaign Simulation (${(conversionRate * 100).toFixed(0)}% conversion)`,
      variables: [
        { label: 'Band-A targets', value: bandACount },
        { label: 'Band-B targets', value: bandBCount },
        { label: 'Assumed conversion rate', value: `${(conversionRate * 100).toFixed(0)}% Band-A, ${(conversionRate * 60).toFixed(0)}% Band-B` },
      ],
      outcomes: [
        { label: 'New members from Band-A', value: newMembersA, delta: `+${newMembersA}` },
        { label: 'New members from Band-B', value: newMembersB, delta: `+${newMembersB}` },
        { label: 'Total new members', value: totalNew, delta: `+${totalNew}` },
        { label: 'New membership count', value: newTotal, delta: `${stats?.members || 0} → ${newTotal}` },
        { label: 'New penetration rate', value: `${newPenetration.toFixed(1)}%`, delta: `${stats ? ((stats.members / stats.total) * 100).toFixed(1) : 0}% → ${newPenetration.toFixed(1)}%` },
      ],
    }

    chartSpec.push({ type: 'bar', title: 'Before vs After Recruitment Campaign', data: [
      { name: 'Members', Before: stats?.members || 0, After: newTotal },
      { name: 'Non-members', Before: stats?.nonMembers || 0, After: (stats?.nonMembers || 0) - totalNew },
      { name: 'Unknown', Before: stats?.unknowns || 0, After: stats?.unknowns || 0 },
    ] })
  } else if (msg.includes('rating') || msg.includes('review')) {
    const improvement = msg.match(/(\d+\.?\d*)/) ? parseFloat(msg.match(/(\d+\.?\d*)/)[1]) : 0.3
    const currentAvg = stats?.avgRating || 0
    const newAvg = Math.min(5, currentAvg + improvement)
    const below4 = rawBusinesses?.filter(b => b._rating > 0 && b._rating < 4).length || 0
    const potentialUplifted = Math.round(below4 * 0.3)

    scenario = {
      title: `Rating Improvement Simulation (+${improvement} avg boost)`,
      variables: [
        { label: 'Current avg rating', value: currentAvg.toFixed(2) },
        { label: 'Businesses below 4.0', value: below4 },
        { label: 'Assumed improvement', value: `+${improvement} points avg` },
      ],
      outcomes: [
        { label: 'New avg rating', value: newAvg.toFixed(2), delta: `${currentAvg.toFixed(2)} → ${newAvg.toFixed(2)}` },
        { label: 'Businesses potentially lifted above 4.0', value: potentialUplifted, delta: `+${potentialUplifted}` },
        { label: 'Impact on recruit quality', value: 'Higher avg ratings improve recruit scoring for the entire market', delta: 'Positive' },
      ],
    }
  } else if (msg.includes('data') || msg.includes('classify') || msg.includes('unknown')) {
    const unknowns = stats?.unknowns || 0
    const classifyRate = msg.match(/(\d+)%/) ? parseInt(msg.match(/(\d+)%/)[1]) / 100 : 0.5
    const classified = Math.round(unknowns * classifyRate)
    const likelyMembers = Math.round(classified * 0.15)
    const likelyNonMembers = classified - likelyMembers
    const newMembers = (stats?.members || 0) + likelyMembers
    const newNonMembers = (stats?.nonMembers || 0) + likelyNonMembers
    const newUnknowns = unknowns - classified

    scenario = {
      title: `Data Classification Simulation (${(classifyRate * 100).toFixed(0)}% resolution)`,
      variables: [
        { label: 'Current unknowns', value: unknowns },
        { label: 'Classification rate', value: `${(classifyRate * 100).toFixed(0)}%` },
        { label: 'Assumed member ratio', value: '15% of newly classified' },
      ],
      outcomes: [
        { label: 'Businesses classified', value: classified, delta: `+${classified} resolved` },
        { label: 'Discovered members', value: likelyMembers, delta: `+${likelyMembers}` },
        { label: 'New non-member pool', value: likelyNonMembers, delta: `+${likelyNonMembers} recruit targets` },
        { label: 'Remaining unknowns', value: newUnknowns, delta: `${unknowns} → ${newUnknowns}` },
        { label: 'New known rate', value: `${stats?.total ? (((newMembers + newNonMembers) / stats.total) * 100).toFixed(1) : 0}%`, delta: `${stats?.membershipKnownRate?.toFixed(1) || 0}% → ${stats?.total ? (((newMembers + newNonMembers) / stats.total) * 100).toFixed(1) : 0}%` },
      ],
    }

    chartSpec.push({ type: 'pie', title: 'After Classification', data: [
      { name: 'Members', value: newMembers, color: '#f59e0b' },
      { name: 'Non-members', value: newNonMembers, color: '#3b82f6' },
      { name: 'Unknown', value: newUnknowns, color: '#475569' },
    ] })
  }

  if (scenario) {
    sections.push({ title: scenario.title, type: 'experiment', ...scenario })
  } else {
    sections.push({
      title: 'Experiment Lab',
      type: 'prompt',
      content: 'Tell me what change you want to simulate. I can model:\n\n• **Recruitment campaigns**: "What if we convert 15% of Band-A prospects?"\n• **Rating improvements**: "What if avg rating improves by 0.5?"\n• **Data classification**: "What if we classify 50% of unknowns?"\n• **Category focus**: "What if we focus entirely on healthcare recruitment?"\n\nInclude specific numbers for more precise modeling.',
    })
  }

  return { sections, chartSpec, followUp: 'Want to adjust the parameters and run another scenario, or compare multiple experiments?' }
}

function generateGeneral(message, entities, stats) {
  const sections = [{
    title: 'How I Can Help',
    type: 'guide',
    capabilities: [
      { icon: 'Stethoscope', title: 'Diagnose Issues', description: 'Tell me about a problem and I\'ll analyze root causes, severity, and recommended actions.', example: '"Why is healthcare penetration so low?"' },
      { icon: 'BookOpen', title: 'Explain Concepts', description: 'I break down business intelligence topics step-by-step in plain language.', example: '"Explain recruit scoring"' },
      { icon: 'Target', title: 'Recommend Actions', description: 'Get tailored recommendations for businesses, categories, or the whole market.', example: '"How can we improve membership in Miracle Mile?"' },
      { icon: 'Activity', title: 'Track Metrics', description: 'Set up monitoring for KPIs with targets and review cadence.', example: '"Track our membership penetration rate"' },
      { icon: 'FileText', title: 'Compile Summaries', description: 'Organize intelligence into actionable briefings for stakeholders.', example: '"Give me a market briefing"' },
      { icon: 'BarChart3', title: 'Build Charts', description: 'Generate dynamic visualizations from natural language requests.', example: '"Show me a pie chart of membership"' },
      { icon: 'FlaskConical', title: 'Run Experiments', description: 'Simulate business changes and see projected outcomes instantly.', example: '"What if we convert 20% of Band-A recruits?"' },
    ],
  }]

  return { sections, chartSpec: [], followUp: 'What would you like to explore? Ask me anything about your business data.' }
}

// ── Main advisor function ─────────────────────────────────────────────────────

export function getAdvisorResponse(message, { stats, rawBusinesses, conversationHistory = [] }) {
  const intent = classifyIntent(message)
  const entities = extractEntities(message, stats, rawBusinesses)

  let response
  switch (intent) {
    case 'diagnose':   response = generateDiagnosis(message, entities, stats, rawBusinesses); break
    case 'explain':    response = generateExplanation(message, entities, stats); break
    case 'recommend':  response = generateRecommendation(message, entities, stats, rawBusinesses); break
    case 'track':      response = generateTracking(message, entities, stats); break
    case 'summarize':  response = generateSummary(message, entities, stats, rawBusinesses); break
    case 'compare':    response = generateComparison(message, entities, stats, rawBusinesses); break
    case 'chart':      response = generateChartResponse(message, entities, stats, rawBusinesses); break
    case 'experiment': response = generateExperiment(message, entities, stats, rawBusinesses); break
    default:           response = generateGeneral(message, entities, stats); break
  }

  return {
    ...response,
    intent,
    entities,
    timestamp: new Date().toISOString(),
  }
}
