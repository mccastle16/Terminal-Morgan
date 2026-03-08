import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    riskLevel: '',
    confidenceLevel: '',
    priceRange: '',
    hasRedFlag: null,
  })
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem('cgcc_bookmarks')
    return saved ? JSON.parse(saved) : []
  })
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('cgcc_notes')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    localStorage.setItem('cgcc_bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  useEffect(() => {
    localStorage.setItem('cgcc_notes', JSON.stringify(notes))
  }, [notes])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load from the data directory or use embedded data
      const response = await fetch('/data/union_all_businesses.csv')

      if (!response.ok) {
        // If file not found, use the embedded sample data
        console.log('Loading embedded sample data...')
        setBusinesses(getSampleData())
        setLoading(false)
        return
      }

      const csvText = await response.text()
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      })

      if (result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors)
      }

      const processedData = result.data.map((row, index) => ({
        ...row,
        id: row.business_id || `biz_${index}`,
        rating: parseFloat(row.rating_primary_value) || 0,
        reviewCount: parseInt(row.rating_primary_review_count) || 0,
        osintConfidence: parseFloat(row.osint_confidence) || 0,
        validationConfidence: parseFloat(row.validation_confidence) || 0,
        hasRedFlag: row.red_flag_present?.toUpperCase() === 'Y',
        isChamberMember: row.chamber_member?.toUpperCase() === 'Y',
        corroborationCount: parseInt(row.corroboration_count) || 0,
        corroborationSources: row.corroboration_sources || '',
        sunbizStatus: row.sunbiz_status || '',
        sunbizName: row.sunbiz_name || '',
      }))

      setBusinesses(processedData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err.message)
      // Fallback to sample data
      setBusinesses(getSampleData())
    } finally {
      setLoading(false)
    }
  }

  // Computed statistics
  const stats = useMemo(() => {
    if (businesses.length === 0) return null

    const categories = [...new Set(businesses.map(b => b.category_primary).filter(Boolean))]
    const avgRating = businesses.reduce((acc, b) => acc + b.rating, 0) / businesses.length
    const avgConfidence = businesses.reduce((acc, b) => acc + b.osintConfidence, 0) / businesses.length
    const redFlagCount = businesses.filter(b => b.hasRedFlag).length
    const criticalCount = businesses.filter(b => b.red_flag_severity === 'Critical').length
    const operationalCount = businesses.filter(b => b.red_flag_severity === 'Operational').length
    const corroboratedCount = businesses.filter(b => b.corroborationCount >= 2).length

    const categoryBreakdown = categories.map(cat => ({
      name: cat,
      count: businesses.filter(b => b.category_primary === cat).length,
      avgRating: businesses.filter(b => b.category_primary === cat)
        .reduce((acc, b, _, arr) => acc + b.rating / arr.length, 0),
    }))

    const ratingDistribution = [
      { range: '4.5+', count: businesses.filter(b => b.rating >= 4.5).length },
      { range: '4.0-4.4', count: businesses.filter(b => b.rating >= 4.0 && b.rating < 4.5).length },
      { range: '3.5-3.9', count: businesses.filter(b => b.rating >= 3.5 && b.rating < 4.0).length },
      { range: '3.0-3.4', count: businesses.filter(b => b.rating >= 3.0 && b.rating < 3.5).length },
      { range: '<3.0', count: businesses.filter(b => b.rating < 3.0 && b.rating > 0).length },
    ]

    const confidenceLevels = {
      high: businesses.filter(b => b.osintConfidence >= 0.8).length,
      moderate: businesses.filter(b => b.osintConfidence >= 0.6 && b.osintConfidence < 0.8).length,
      low: businesses.filter(b => b.osintConfidence < 0.6).length,
    }

    return {
      total: businesses.length,
      categories,
      categoryBreakdown,
      avgRating: avgRating.toFixed(2),
      avgConfidence: (avgConfidence * 100).toFixed(0),
      redFlagCount,
      criticalCount,
      operationalCount,
      corroboratedCount,
      ratingDistribution,
      confidenceLevels,
      chamberMembers: businesses.filter(b => b.isChamberMember).length,
    }
  }, [businesses])

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          business.business_name?.toLowerCase().includes(searchLower) ||
          business.contact_name?.toLowerCase().includes(searchLower) ||
          business.category_primary?.toLowerCase().includes(searchLower) ||
          business.category_secondary?.toLowerCase().includes(searchLower) ||
          business.top_delights?.toLowerCase().includes(searchLower) ||
          business.top_pain_points?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      if (filters.category && business.category_primary !== filters.category) {
        return false
      }

      if (filters.priceRange && business.price_tier !== filters.priceRange) {
        return false
      }

      if (filters.hasRedFlag !== null && business.hasRedFlag !== filters.hasRedFlag) {
        return false
      }

      if (filters.confidenceLevel) {
        const conf = business.osintConfidence
        if (filters.confidenceLevel === 'high' && conf < 0.8) return false
        if (filters.confidenceLevel === 'moderate' && (conf < 0.6 || conf >= 0.8)) return false
        if (filters.confidenceLevel === 'low' && conf >= 0.6) return false
      }

      return true
    })
  }, [businesses, filters])

  // Bookmark management
  const toggleBookmark = (businessId) => {
    setBookmarks(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const isBookmarked = (businessId) => bookmarks.includes(businessId)

  // Notes management
  const addNote = (businessId, note) => {
    setNotes(prev => ({
      ...prev,
      [businessId]: [...(prev[businessId] || []), {
        id: Date.now(),
        text: note,
        createdAt: new Date().toISOString(),
      }]
    }))
  }

  const deleteNote = (businessId, noteId) => {
    setNotes(prev => ({
      ...prev,
      [businessId]: (prev[businessId] || []).filter(n => n.id !== noteId)
    }))
  }

  const getBusinessNotes = (businessId) => notes[businessId] || []

  // Export functionality
  const exportData = (format = 'csv') => {
    const dataToExport = filteredBusinesses.map(b => ({
      business_name: b.business_name,
      category: b.category_primary,
      rating: b.rating,
      confidence: b.osintConfidence,
      top_delights: b.top_delights,
      top_pain_points: b.top_pain_points,
      primary_risks: b.pkp_primary_risks,
      recommended_actions: b.pkp_primary_actions,
    }))

    if (format === 'csv') {
      const csv = Papa.unparse(dataToExport)
      downloadFile(csv, 'cgcc_export.csv', 'text/csv')
    } else if (format === 'json') {
      const json = JSON.stringify(dataToExport, null, 2)
      downloadFile(json, 'cgcc_export.json', 'application/json')
    }
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const value = {
    businesses,
    filteredBusinesses,
    loading,
    error,
    stats,
    filters,
    setFilters,
    bookmarks,
    toggleBookmark,
    isBookmarked,
    notes,
    addNote,
    deleteNote,
    getBusinessNotes,
    exportData,
    refreshData: loadData,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

// Sample data fallback
function getSampleData() {
  return [
    {
      id: 'biltmore_hotel',
      business_id: 'biltmore_hotel',
      business_name: 'The Biltmore Hotel',
      contact_name: 'Mr. Matthias Kammerer',
      phone: '855-421-4192',
      website: 'biltmorehotel.com',
      neighborhood_area: 'Coral Gables',
      category_primary: 'hospitality',
      category_secondary: 'luxury hotel & spa',
      price_tier: '$$$$',
      rating_primary_value: '4.5',
      rating_primary_source: 'Google/Tripadvisor',
      rating: 4.5,
      reviewCount: 2500,
      osint_confidence: '0.9',
      osintConfidence: 0.9,
      validation_tier: 'High',
      validationConfidence: 0.9,
      top_delights: 'Historic grandeur; world-class golf and spa; iconic architecture',
      top_pain_points: 'Premium pricing; older room fixtures in some wings',
      red_flag_present: 'N',
      hasRedFlag: false,
      red_flag_severity: 'none',
      pkp_primary_risks: 'Luxury market sensitivity; maintenance of historic property',
      pkp_primary_actions: 'Continuous renovation; maintain service excellence',
      chamber_member: 'Y',
      isChamberMember: true,
      source_file: 'wellness-spas.csv',
    },
    // More sample data would be added here
  ]
}
