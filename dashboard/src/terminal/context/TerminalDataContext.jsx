import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useTerminalAuth } from './TerminalAuthContext'
import { computeRecruitabilityScore, getRecruitabilityBand, getRecruitReasons } from '../config/scoring'

const TerminalDataContext = createContext(null)

// Neighborhood names arrive from Neo4j with inconsistent casing/whitespace
// (e.g. "chapinero", "Chapinero", "CHAPINERO "), which otherwise show up as
// separate entries in penetration charts and filters. Canonicalize to a single
// Title Case form so casing variants collapse into one neighborhood.
function normalizeNeighborhood(raw) {
  if (!raw) return raw
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  if (!cleaned) return cleaned
  return cleaned
    .toLowerCase()
    .replace(/\b\p{L}/gu, (ch) => ch.toUpperCase())
}

export function TerminalDataProvider({ children }) {
  const { tenant } = useTerminalAuth()
  const [rawBusinesses, setRawBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '', category: '', neighborhood: '', memberStatus: '',
    validationTier: '', riskLevel: '', minRating: '', hasWebsite: null,
  })
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('terminal_bookmarks')
    return saved ? JSON.parse(saved) : []
  })
  // Data source is always the live Neo4j API. Kept as state so the UI can
  // distinguish "connected" from "still loading / errored".
  const [dataSource, setDataSource] = useState(null)

  useEffect(() => {
    localStorage.setItem('terminal_bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  useEffect(() => { loadData() }, [tenant])

  // Load businesses strictly from the live Neo4j API. There is no static
  // fallback — if the database is unavailable we surface an error rather than
  // serving stale exports.
  const loadLive = async () => {
    const response = await fetch('/api/businesses')
    if (!response.ok) {
      let detail = ''
      try { detail = (await response.json())?.detail || '' } catch { /* ignore */ }
      throw new Error(detail || `Live data unavailable (HTTP ${response.status})`)
    }
    const data = await response.json()
    if (!Array.isArray(data.businesses)) {
      throw new Error('Live data response was malformed (no businesses array)')
    }
    return data.businesses
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const rows = await loadLive()
      setDataSource('live')

      const processed = rows.map((row, i) => {
        const memberRaw = (row.chamber_member || '').trim().toUpperCase()
        const memberStatus = memberRaw === 'Y' ? 'member' : memberRaw === 'N' ? 'non-member' : 'unknown'

        const biz = {
          ...row,
          neighborhood_area: normalizeNeighborhood(row.neighborhood_area),
          _id: row.business_id || `biz_${i}`,
          _rating: parseFloat(row.rating_primary_value) || 0,
          _reviewCount: parseInt(row.rating_primary_review_count) || 0,
          _confidence: parseFloat(row.osint_confidence) || 0,
          _hasRedFlag: row.red_flag_present?.toUpperCase() === 'Y',
          _redFlagSeverity: row.red_flag_severity || null,
          _memberStatus: memberStatus,
          _validationTier: (() => {
            const v = (row.validation_tier || '').trim()
            if (v === 'High') return 3
            if (v === 'Moderate') return 2
            if (v === 'Low') return 1
            const n = parseFloat(v)
            if (!isNaN(n)) return n >= 0.7 ? 3 : n >= 0.4 ? 2 : 1
            return 0
          })(),
          _corroboration: parseInt(row.corroboration_count) || 0,
          _hasWebsite: !!(row.website && row.website.trim()),
          _hasPhone: !!(row.phone && row.phone.trim()),
          _hasGeo: !!(row.lat && row.lon && row.lat !== '' && row.lon !== ''),
          _pkpType: row.pkp_node_type || 'unknown',
        }

        // Compute recruitability for non-members and unknowns
        if (memberStatus !== 'member') {
          biz._recruitScore = computeRecruitabilityScore(row)
          biz._recruitBand = getRecruitabilityBand(biz._recruitScore)
          biz._recruitReasons = getRecruitReasons(row)
        }

        // Legacy-compatible aliases for ported pages
        biz.id = biz._id
        biz.rating = biz._rating
        biz.reviewCount = biz._reviewCount
        biz.osintConfidence = biz._confidence
        biz.isChamberMember = memberStatus === 'member'
        biz.hasRedFlag = biz._hasRedFlag

        return biz
      })

      setRawBusinesses(processed)
    } catch (err) {
      setError(err.message)
      setDataSource(null)
      setRawBusinesses([])
    } finally {
      setLoading(false)
    }
  }

  // Filtered businesses
  const businesses = useMemo(() => {
    return rawBusinesses.filter(b => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const match = b.business_name?.toLowerCase().includes(q) ||
          b.category_primary?.toLowerCase().includes(q) ||
          b.neighborhood_area?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filters.category && b.category_primary !== filters.category) return false
      if (filters.neighborhood && b.neighborhood_area !== filters.neighborhood) return false
      if (filters.memberStatus && b._memberStatus !== filters.memberStatus) return false
      if (filters.validationTier && b._validationTier !== Number(filters.validationTier)) return false
      if (filters.minRating && b._rating < parseFloat(filters.minRating)) return false
      if (filters.hasWebsite === true && !b._hasWebsite) return false
      if (filters.hasWebsite === false && b._hasWebsite) return false
      if (filters.riskLevel === 'flagged' && !b._hasRedFlag) return false
      if (filters.riskLevel === 'clean' && b._hasRedFlag) return false
      return true
    })
  }, [rawBusinesses, filters])

  // Most recent review date across the live dataset. Drives the "Updated …"
  // freshness label instead of the hardcoded tenant.lastRefresh. Falls back to
  // the tenant config only when no rows carry a parseable last_reviewed date.
  const lastRefresh = useMemo(() => {
    let maxT = 0
    let maxV = null
    for (const b of rawBusinesses) {
      const t = Date.parse(b.last_reviewed)
      if (!isNaN(t) && t > maxT) { maxT = t; maxV = b.last_reviewed }
    }
    return maxV || tenant.lastRefresh
  }, [rawBusinesses, tenant])

  // Market statistics
  const stats = useMemo(() => {
    const all = rawBusinesses
    if (all.length === 0) return null

    const members = all.filter(b => b._memberStatus === 'member')
    const nonMembers = all.filter(b => b._memberStatus === 'non-member')
    const unknowns = all.filter(b => b._memberStatus === 'unknown')

    const categories = [...new Set(all.map(b => b.category_primary).filter(Boolean))].sort()
    const neighborhoods = [...new Set(all.map(b => b.neighborhood_area).filter(Boolean))].sort()

    const avgRating = all.reduce((s, b) => s + b._rating, 0) / all.length
    const ratedBusinesses = all.filter(b => b._rating > 0)
    const avgRatedRating = ratedBusinesses.length > 0
      ? ratedBusinesses.reduce((s, b) => s + b._rating, 0) / ratedBusinesses.length : 0

    const redFlagCount = all.filter(b => b._hasRedFlag).length
    const criticalFlags = all.filter(b => b._redFlagSeverity === 'Critical').length

    // Data quality
    const withWebsite = all.filter(b => b._hasWebsite).length
    const withPhone = all.filter(b => b._hasPhone).length
    const withGeo = all.filter(b => b._hasGeo).length
    const withRating = ratedBusinesses.length
    const highValidation = all.filter(b => b._validationTier >= 3).length

    // Penetration by category
    const categoryPenetration = categories.map(cat => {
      const total = all.filter(b => b.category_primary === cat)
      const mem = total.filter(b => b._memberStatus === 'member')
      const nonMem = total.filter(b => b._memberStatus === 'non-member')
      const unk = total.filter(b => b._memberStatus === 'unknown')
      return {
        category: cat,
        total: total.length,
        members: mem.length,
        nonMembers: nonMem.length,
        unknowns: unk.length,
        penetration: total.length > 0 ? (mem.length / total.length * 100) : 0,
        avgRating: total.reduce((s, b) => s + b._rating, 0) / (total.length || 1),
      }
    }).sort((a, b) => b.total - a.total)

    // Penetration by neighborhood
    const neighborhoodPenetration = neighborhoods.map(hood => {
      const total = all.filter(b => b.neighborhood_area === hood)
      const mem = total.filter(b => b._memberStatus === 'member')
      const nonMem = total.filter(b => b._memberStatus === 'non-member')
      const unk = total.filter(b => b._memberStatus === 'unknown')
      return {
        neighborhood: hood,
        total: total.length,
        members: mem.length,
        nonMembers: nonMem.length,
        unknowns: unk.length,
        penetration: total.length > 0 ? (mem.length / total.length * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)

    // Price tier distribution
    const priceTiers = ['$', '$$', '$$$', '$$$$']
    const priceTierDist = priceTiers.map(tier => ({
      tier,
      count: all.filter(b => b.price_tier === tier).length,
      members: all.filter(b => b.price_tier === tier && b._memberStatus === 'member').length,
      avgRating: (() => {
        const rated = all.filter(b => b.price_tier === tier && b._rating > 0)
        return rated.length > 0 ? rated.reduce((s, b) => s + b._rating, 0) / rated.length : 0
      })(),
    }))
    const priceCoverage = all.filter(b => priceTiers.includes(b.price_tier)).length

    return {
      total: all.length,
      members: members.length,
      nonMembers: nonMembers.length,
      unknowns: unknowns.length,
      membershipKnownRate: ((members.length + nonMembers.length) / all.length * 100),
      categories, neighborhoods,
      categoryPenetration, neighborhoodPenetration,
      priceTierDist,
      priceCoverage: parseFloat((priceCoverage / all.length * 100).toFixed(1)),
      avgRating: avgRatedRating,
      avgRatedRating: avgRatedRating,
      redFlagCount, criticalFlags,
      dataQuality: {
        websiteCoverage: parseFloat((withWebsite / all.length * 100).toFixed(1)),
        phoneCoverage: parseFloat((withPhone / all.length * 100).toFixed(1)),
        geoCoverage: parseFloat((withGeo / all.length * 100).toFixed(1)),
        ratingCoverage: parseFloat((withRating / all.length * 100).toFixed(1)),
        highValidationRate: parseFloat((highValidation / all.length * 100).toFixed(1)),
      },
      lastRefresh,
    }
  }, [rawBusinesses, lastRefresh])

  // ── Deep Market Analytics ───────────────────────────────────────────────────
  const marketAnalytics = useMemo(() => {
    const all = rawBusinesses
    if (all.length === 0) return null

    // 1. Competitive Saturation Index — businesses per category per neighborhood
    const saturationGrid = {}
    all.forEach(b => {
      const cat = b.category_primary || 'other'
      const hood = b.neighborhood_area || 'Unknown'
      const key = `${cat}|${hood}`
      if (!saturationGrid[key]) saturationGrid[key] = { category: cat, neighborhood: hood, total: 0, members: 0, avgRating: 0, ratings: [] }
      saturationGrid[key].total++
      if (b._memberStatus === 'member') saturationGrid[key].members++
      if (b._rating > 0) saturationGrid[key].ratings.push(b._rating)
    })

    const saturation = Object.values(saturationGrid).map(s => ({
      ...s,
      avgRating: s.ratings.length > 0 ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length : 0,
      penetration: s.total > 0 ? (s.members / s.total * 100) : 0,
      density: s.total, // raw count = density signal
    }))

    // 2. Category Health Index (CHI) — composite score per category
    const categories = [...new Set(all.map(b => b.category_primary).filter(Boolean))]
    const categoryHealth = categories.map(cat => {
      const bizs = all.filter(b => b.category_primary === cat)
      const rated = bizs.filter(b => b._rating > 0)
      const members = bizs.filter(b => b._memberStatus === 'member')
      const withWeb = bizs.filter(b => b._hasWebsite)
      const withPhone = bizs.filter(b => b._hasPhone)
      const highVal = bizs.filter(b => b._validationTier >= 3)
      const flagged = bizs.filter(b => b._hasRedFlag)

      const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b._rating, 0) / rated.length : 0
      const avgReviews = rated.length > 0 ? rated.reduce((s, b) => s + b._reviewCount, 0) / rated.length : 0
      const penetration = bizs.length > 0 ? (members.length / bizs.length * 100) : 0
      const webCoverage = bizs.length > 0 ? (withWeb.length / bizs.length * 100) : 0
      const phoneCoverage = bizs.length > 0 ? (withPhone.length / bizs.length * 100) : 0
      const validationRate = bizs.length > 0 ? (highVal.length / bizs.length * 100) : 0
      const riskRate = bizs.length > 0 ? (flagged.length / bizs.length * 100) : 0

      // CHI = weighted composite (0-100)
      const chi = Math.round(
        (avgRating / 5 * 25) +            // rating quality (25%)
        (Math.min(avgReviews, 100) / 100 * 15) + // review volume (15%)
        (penetration / 100 * 20) +         // membership penetration (20%)
        (webCoverage / 100 * 15) +         // digital presence (15%)
        (validationRate / 100 * 15) +      // data confidence (15%)
        ((100 - riskRate) / 100 * 10)      // risk safety (10%)
      )

      return {
        category: cat,
        count: bizs.length,
        members: members.length,
        penetration: Math.round(penetration * 10) / 10,
        avgRating: Math.round(avgRating * 100) / 100,
        avgReviews: Math.round(avgReviews),
        webCoverage: Math.round(webCoverage * 10) / 10,
        phoneCoverage: Math.round(phoneCoverage * 10) / 10,
        validationRate: Math.round(validationRate * 10) / 10,
        riskRate: Math.round(riskRate * 10) / 10,
        chi,
      }
    }).sort((a, b) => b.chi - a.chi)

    // 3. Neighborhood Opportunity Score (NOS) — where to focus expansion
    const neighborhoods = [...new Set(all.map(b => b.neighborhood_area).filter(Boolean))]
    const neighborhoodHealth = neighborhoods.map(hood => {
      const bizs = all.filter(b => b.neighborhood_area === hood)
      const members = bizs.filter(b => b._memberStatus === 'member')
      const nonMembers = bizs.filter(b => b._memberStatus === 'non-member')
      const rated = bizs.filter(b => b._rating > 0)
      const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b._rating, 0) / rated.length : 0
      const penetration = bizs.length > 0 ? (members.length / bizs.length * 100) : 0
      const catDiversity = new Set(bizs.map(b => b.category_primary).filter(Boolean)).size

      // NOS: High score = great opportunity for chamber growth
      // Factors: large pool, low penetration, good business quality, diverse categories
      const nos = Math.round(
        (Math.min(nonMembers.length, 50) / 50 * 30) +  // non-member pool size (30%)
        ((100 - penetration) / 100 * 25) +               // room to grow (25%)
        (avgRating / 5 * 20) +                            // business quality (20%)
        (Math.min(catDiversity, 15) / 15 * 15) +         // category diversity (15%)
        (Math.min(bizs.length, 100) / 100 * 10)          // total market size (10%)
      )

      return {
        neighborhood: hood,
        total: bizs.length,
        members: members.length,
        nonMembers: nonMembers.length,
        penetration: Math.round(penetration * 10) / 10,
        avgRating: Math.round(avgRating * 100) / 100,
        categoryDiversity: catDiversity,
        nos,
      }
    }).sort((a, b) => b.nos - a.nos)

    // 4. Concentration / Herfindahl Index — market dominance by category
    const totalBiz = all.length
    const hhi = categories.reduce((sum, cat) => {
      const share = all.filter(b => b.category_primary === cat).length / totalBiz
      return sum + share * share
    }, 0)

    // 5. Rating distribution percentiles
    const allRatings = all.filter(b => b._rating > 0).map(b => b._rating).sort((a, b) => a - b)
    const p = (arr, pct) => arr[Math.floor(arr.length * pct / 100)] || 0
    const ratingPercentiles = {
      p10: p(allRatings, 10),
      p25: p(allRatings, 25),
      p50: p(allRatings, 50),
      p75: p(allRatings, 75),
      p90: p(allRatings, 90),
      mean: allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0,
      stdDev: (() => {
        if (allRatings.length < 2) return 0
        const mean = allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        const variance = allRatings.reduce((s, r) => s + (r - mean) ** 2, 0) / allRatings.length
        return Math.sqrt(variance)
      })(),
    }

    // 6. Cross-tabulation: top opportunities (high NOS neighborhoods × high CHI categories)
    const topOpportunities = []
    const topHoods = neighborhoodHealth.slice(0, 8)
    const topCats = categoryHealth.filter(c => c.chi >= 40).slice(0, 8)
    topHoods.forEach(hood => {
      topCats.forEach(cat => {
        const cell = saturation.find(s => s.category === cat.category && s.neighborhood === hood.neighborhood)
        if (cell && cell.total > 0 && cell.penetration < 50) {
          topOpportunities.push({
            neighborhood: hood.neighborhood,
            category: cat.category,
            bizCount: cell.total,
            members: cell.members,
            penetration: Math.round(cell.penetration),
            hoodNOS: hood.nos,
            catCHI: cat.chi,
            score: Math.round((hood.nos + cat.chi) / 2),
          })
        }
      })
    })
    topOpportunities.sort((a, b) => b.score - a.score)

    return {
      saturation,
      categoryHealth,
      neighborhoodHealth,
      hhi: Math.round(hhi * 10000) / 10000,
      hhiNormalized: Math.round(hhi * 10000), // 0-10000 scale
      ratingPercentiles,
      topOpportunities: topOpportunities.slice(0, 20),
      marketHealthScore: Math.round(
        categoryHealth.reduce((s, c) => s + c.chi, 0) / (categoryHealth.length || 1)
      ),
    }
  }, [rawBusinesses])

  // ── Temporal Data (delta from snapshot archiver) ────────────────────────────
  const [deltaData, setDeltaData] = useState(null)
  const [deltaHistory, setDeltaHistory] = useState([])

  // ── Enrichment Data (sentiment, centrality, predictions) ───────────────────
  const [sentimentData, setSentimentData] = useState(null)
  const [centralityData, setCentralityData] = useState(null)
  const [predictionData, setPredictionData] = useState(null)

  // Enrichment (sentiment/centrality/predictions) comes from live Neo4j-backed
  // endpoints, so only fetch once businesses have connected (dataSource === 'live').
  // Keying on dataSource means this re-runs after a reconnect — e.g. the DataGate
  // "Retry" — instead of staying null forever if the API was down at first mount.
  useEffect(() => {
    if (dataSource !== 'live') return
    let cancelled = false
    Promise.all([
      fetch('/data/latest_delta.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/delta_history.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/sentiment-themes').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/network-centrality').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/prediction-summary').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([delta, history, sentiment, centrality, predictions]) => {
      if (cancelled) return
      setDeltaData(delta)
      setDeltaHistory(history)
      setSentimentData(sentiment)
      setCentralityData(centrality)
      setPredictionData(predictions)
    })
    return () => { cancelled = true }
  }, [dataSource])

  // Recruit queue — pre-sorted by score
  const recruitQueue = useMemo(() => {
    return rawBusinesses
      .filter(b => b._memberStatus !== 'member')
      .sort((a, b) => (b._recruitScore || 0) - (a._recruitScore || 0))
  }, [rawBusinesses])

  const getBusinessById = (id) => rawBusinesses.find(b => b._id === id)

  const toggleBookmark = (businessId) => {
    setBookmarks(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const isBookmarked = (businessId) => bookmarks.includes(businessId)

  const getPeers = (business) => {
    if (!business) return []
    return rawBusinesses.filter(b =>
      b._id !== business._id && b.category_primary === business.category_primary
    ).sort((a, b) => b._rating - a._rating)
  }

  const getNearby = (business, radiusKm = 0.2) => {
    if (!business || !business._hasGeo) return []
    const lat1 = parseFloat(business.lat)
    const lon1 = parseFloat(business.lon)
    return rawBusinesses.filter(b => {
      if (b._id === business._id || !b._hasGeo) return false
      const lat2 = parseFloat(b.lat)
      const lon2 = parseFloat(b.lon)
      const R = 6371
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return d <= radiusKm
    })
  }

  return (
    <TerminalDataContext.Provider value={{
      businesses, filteredBusinesses: businesses, rawBusinesses, loading, error,
      stats, recruitQueue, marketAnalytics, lastRefresh, deltaData, deltaHistory,
      sentimentData, centralityData, predictionData,
      filters, setFilters,
      getBusinessById, getPeers, getNearby,
      bookmarks, toggleBookmark, isBookmarked,
      dataSource, refreshData: loadData,
    }}>
      {children}
    </TerminalDataContext.Provider>
  )
}

export function useTerminalData() {
  const ctx = useContext(TerminalDataContext)
  if (!ctx) throw new Error('useTerminalData must be used within TerminalDataProvider')
  return ctx
}
