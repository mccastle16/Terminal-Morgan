import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { useTerminalAuth } from './TerminalAuthContext'
import { computeRecruitabilityScore, getRecruitabilityBand, getRecruitReasons } from '../config/scoring'

const TerminalDataContext = createContext(null)

export function TerminalDataProvider({ children }) {
  const { tenant } = useTerminalAuth()
  const [rawBusinesses, setRawBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '', category: '', neighborhood: '', memberStatus: '',
    validationTier: '', riskLevel: '', minRating: '', hasWebsite: null,
  })

  useEffect(() => { loadData() }, [tenant])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(tenant.dataSource)
      if (!response.ok) throw new Error('Data source unavailable')

      const csvText = await response.text()
      const result = Papa.parse(csvText, {
        header: true, skipEmptyLines: true,
        transformHeader: h => h.trim(),
      })

      const processed = result.data.map((row, i) => {
        const memberRaw = (row.chamber_member || '').trim().toUpperCase()
        const memberStatus = memberRaw === 'Y' ? 'member' : memberRaw === 'N' ? 'non-member' : 'unknown'

        const biz = {
          ...row,
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

        return biz
      })

      setRawBusinesses(processed)
    } catch (err) {
      setError(err.message)
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

    return {
      total: all.length,
      members: members.length,
      nonMembers: nonMembers.length,
      unknowns: unknowns.length,
      membershipKnownRate: ((members.length + nonMembers.length) / all.length * 100),
      categories, neighborhoods,
      categoryPenetration, neighborhoodPenetration,
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
      lastRefresh: tenant.lastRefresh,
    }
  }, [rawBusinesses, tenant])

  // Recruit queue — pre-sorted by score
  const recruitQueue = useMemo(() => {
    return rawBusinesses
      .filter(b => b._memberStatus !== 'member')
      .sort((a, b) => (b._recruitScore || 0) - (a._recruitScore || 0))
  }, [rawBusinesses])

  const getBusinessById = (id) => rawBusinesses.find(b => b._id === id)

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
      stats, recruitQueue,
      filters, setFilters,
      getBusinessById, getPeers, getNearby,
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
