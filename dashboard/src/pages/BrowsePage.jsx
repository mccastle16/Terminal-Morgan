import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Star,
  Building2,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
  ChevronRight,
  Award,
  Shield,
  AlertTriangle,
  Heart,
  Phone,
  Globe,
  MapPin,
  X,
  ExternalLink,
  Sparkles,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react'

export default function BrowsePage() {
  const { businesses, stats, filters, setFilters, toggleBookmark, isBookmarked } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('rating')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState(null)

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category')
    const business = searchParams.get('business')

    if (category) {
      setFilters(prev => ({ ...prev, category }))
    }

    if (business) {
      const found = businesses.find(b => b.id === business)
      if (found) setSelectedBusiness(found)
    }
  }, [searchParams, businesses])

  // Local filter state
  const [localFilters, setLocalFilters] = useState({
    category: filters.category || '',
    priceRange: filters.priceRange || '',
    minRating: '',
    confidenceLevel: '',
    chamberOnly: false,
    noRedFlags: false,
  })

  // Apply filters
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          business.business_name?.toLowerCase().includes(searchLower) ||
          business.category_primary?.toLowerCase().includes(searchLower) ||
          business.top_delights?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Category
      if (localFilters.category && business.category_primary !== localFilters.category) {
        return false
      }

      // Price
      if (localFilters.priceRange && business.price_tier !== localFilters.priceRange) {
        return false
      }

      // Min rating
      if (localFilters.minRating && business.rating < parseFloat(localFilters.minRating)) {
        return false
      }

      // Confidence
      if (localFilters.confidenceLevel) {
        const conf = business.osintConfidence
        if (localFilters.confidenceLevel === 'high' && conf < 0.8) return false
        if (localFilters.confidenceLevel === 'moderate' && (conf < 0.6 || conf >= 0.8)) return false
        if (localFilters.confidenceLevel === 'low' && conf >= 0.6) return false
      }

      // Chamber only
      if (localFilters.chamberOnly && !business.isChamberMember) {
        return false
      }

      // No red flags
      if (localFilters.noRedFlags && business.hasRedFlag) {
        return false
      }

      return true
    })
  }, [businesses, filters.search, localFilters])

  // Sort
  const sortedBusinesses = useMemo(() => {
    const sorted = [...filteredBusinesses]
    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating)
      case 'name':
        return sorted.sort((a, b) => a.business_name?.localeCompare(b.business_name))
      case 'confidence':
        return sorted.sort((a, b) => b.osintConfidence - a.osintConfidence)
      default:
        return sorted
    }
  }, [filteredBusinesses, sortBy])

  // Render stars
  const renderStars = (rating, size = 14) => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < fullStars ? 'text-cgcc-gold fill-cgcc-gold' :
                      (i === fullStars && hasHalf) ? 'text-cgcc-gold fill-cgcc-gold/50' :
                      'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setLocalFilters({
      category: '',
      priceRange: '',
      minRating: '',
      confidenceLevel: '',
      chamberOnly: false,
      noRedFlags: false,
    })
    setFilters(prev => ({ ...prev, search: '', category: '' }))
    setSearchParams({})
  }

  const hasActiveFilters = localFilters.category || localFilters.priceRange ||
    localFilters.minRating || localFilters.confidenceLevel ||
    localFilters.chamberOnly || localFilters.noRedFlags || filters.search

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-cgcc-navy">Browse Businesses</h1>
            <p className="text-gray-600">
              {sortedBusinesses.length} of {businesses.length} businesses
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
            >
              <option value="rating">Highest Rated</option>
              <option value="name">Name (A-Z)</option>
              <option value="confidence">Most Verified</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={18} />
              </button>
            </div>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2 bg-white border border-gray-200 rounded-lg"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cgcc-navy/10 text-cgcc-navy text-xs rounded-full">
                Search: "{filters.search}"
                <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                  <X size={12} />
                </button>
              </span>
            )}
            {localFilters.category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cgcc-gold/10 text-cgcc-gold text-xs rounded-full">
                {localFilters.category.replace(/_/g, ' ')}
                <button onClick={() => setLocalFilters(prev => ({ ...prev, category: '' }))}>
                  <X size={12} />
                </button>
              </span>
            )}
            {localFilters.chamberOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cgcc-sage/10 text-cgcc-sage text-xs rounded-full">
                Chamber Members
                <button onClick={() => setLocalFilters(prev => ({ ...prev, chamberOnly: false }))}>
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-cgcc-coral hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Grid/List view */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedBusinesses.map((business) => (
              <div
                key={business.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-cgcc-gold/30 transition-all cursor-pointer"
                onClick={() => setSelectedBusiness(business)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cgcc-navy/5 rounded-lg flex items-center justify-center">
                      <Building2 size={20} className="text-cgcc-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-cgcc-navy">{business.business_name}</h3>
                      <p className="text-xs text-gray-500 capitalize">
                        {business.category_primary?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBookmark(business.id)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      isBookmarked(business.id)
                        ? 'text-cgcc-coral bg-cgcc-coral/10'
                        : 'text-gray-400 hover:text-cgcc-coral hover:bg-cgcc-coral/5'
                    }`}
                  >
                    <Heart size={18} className={isBookmarked(business.id) ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {renderStars(business.rating)}
                  <span className="font-semibold text-cgcc-navy">{business.rating.toFixed(1)}</span>
                  {business.price_tier && (
                    <span className="text-gray-500">{business.price_tier}</span>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {business.isChamberMember && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cgcc-gold/10 text-cgcc-gold text-xs font-medium rounded-full">
                      <Award size={10} /> Chamber
                    </span>
                  )}
                  {business.osintConfidence >= 0.8 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                      <Shield size={10} /> Verified
                    </span>
                  )}
                  {business.hasRedFlag && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      business.red_flag_severity === 'Critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-cgcc-coral/10 text-cgcc-coral'
                    }`}>
                      <AlertTriangle size={10} /> {business.red_flag_severity || 'Alert'}
                    </span>
                  )}
                  {business.corroborationCount >= 2 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      <Layers size={10} /> {business.corroborationCount} sources
                    </span>
                  )}
                </div>

                {/* Preview */}
                {business.top_delights && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    <Sparkles size={12} className="inline text-cgcc-gold mr-1" />
                    {business.top_delights.split(';')[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedBusinesses.map((business) => (
              <div
                key={business.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-cgcc-gold/30 transition-all cursor-pointer flex items-center gap-4"
                onClick={() => setSelectedBusiness(business)}
              >
                <div className="w-10 h-10 bg-cgcc-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-cgcc-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-cgcc-navy truncate">{business.business_name}</h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {business.category_primary?.replace(/_/g, ' ')} • {business.neighborhood_area || 'Coral Gables'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(business.rating, 12)}
                  <span className="font-semibold text-cgcc-navy">{business.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {business.isChamberMember && <Award size={16} className="text-cgcc-gold" />}
                  {business.osintConfidence >= 0.8 && <Shield size={16} className="text-cgcc-sage" />}
                  {business.hasRedFlag && <AlertTriangle size={16} className={business.red_flag_severity === 'Critical' ? 'text-red-600' : 'text-cgcc-coral'} />}
                  {business.corroborationCount >= 2 && <Layers size={16} className="text-purple-600" />}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBookmark(business.id)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked(business.id)
                      ? 'text-cgcc-coral'
                      : 'text-gray-400 hover:text-cgcc-coral'
                  }`}
                >
                  <Heart size={16} className={isBookmarked(business.id) ? 'fill-current' : ''} />
                </button>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            ))}
          </div>
        )}

        {sortedBusinesses.length === 0 && (
          <div className="text-center py-12">
            <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No businesses found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-cgcc-gold text-white rounded-lg hover:bg-cgcc-gold/90 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Sidebar filters (desktop) */}
      <aside className={`w-72 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-cgcc-navy">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-cgcc-coral hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={localFilters.category}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
              >
                <option value="">All Categories</option>
                {stats?.categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <select
                value={localFilters.priceRange}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
              >
                <option value="">Any Price</option>
                <option value="$">$ - Budget</option>
                <option value="$$">$$ - Moderate</option>
                <option value="$$$">$$$ - Upscale</option>
                <option value="$$$$">$$$$ - Premium</option>
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rating</label>
              <select
                value={localFilters.minRating}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, minRating: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3.0">3.0+ Stars</option>
              </select>
            </div>

            {/* Quick filters */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.chamberOnly}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, chamberOnly: e.target.checked }))}
                  className="w-4 h-4 text-cgcc-gold rounded focus:ring-cgcc-gold/20"
                />
                <span className="text-sm text-gray-700">Chamber Members Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.noRedFlags}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, noRedFlags: e.target.checked }))}
                  className="w-4 h-4 text-cgcc-gold rounded focus:ring-cgcc-gold/20"
                />
                <span className="text-sm text-gray-700">No Risk Alerts</span>
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Business Detail Modal */}
      {selectedBusiness && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedBusiness(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="font-semibold text-cgcc-navy">Business Details</h2>
              <button
                onClick={() => setSelectedBusiness(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-cgcc-navy/10 rounded-xl flex items-center justify-center">
                    <Building2 size={28} className="text-cgcc-navy" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-display font-bold text-cgcc-navy">
                      {selectedBusiness.business_name}
                    </h1>
                    <p className="text-gray-500 capitalize">
                      {selectedBusiness.category_primary?.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {renderStars(selectedBusiness.rating, 16)}
                      <span className="font-semibold text-cgcc-navy">{selectedBusiness.rating.toFixed(1)}</span>
                      {selectedBusiness.price_tier && (
                        <span className="text-gray-500 ml-2">{selectedBusiness.price_tier}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {selectedBusiness.isChamberMember && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cgcc-gold/10 text-cgcc-gold text-sm font-medium rounded-full">
                      <Award size={14} /> Chamber Member
                    </span>
                  )}
                  {selectedBusiness.osintConfidence >= 0.8 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-cgcc-sage/10 text-cgcc-sage text-sm font-medium rounded-full">
                      <Shield size={14} /> Verified Data
                    </span>
                  )}
                  {selectedBusiness.hasRedFlag && (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${
                      selectedBusiness.red_flag_severity === 'Critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-cgcc-coral/10 text-cgcc-coral'
                    }`}>
                      <AlertTriangle size={14} /> {selectedBusiness.red_flag_severity || 'Risk Alert'}
                    </span>
                  )}
                  {selectedBusiness.corroborationCount >= 2 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      <Layers size={14} /> Verified by {selectedBusiness.corroborationCount} sources
                    </span>
                  )}
                </div>
              </div>

              {/* Source Verification */}
              {(selectedBusiness.corroborationCount >= 2 || selectedBusiness.sunbizStatus) && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-semibold text-cgcc-navy mb-3 flex items-center gap-2">
                    <Layers size={18} className="text-purple-600" />
                    Source Verification
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Confirmed by</span>
                      <span className="font-medium text-purple-700">{selectedBusiness.corroborationCount} source{selectedBusiness.corroborationCount > 1 ? 's' : ''}</span>
                    </div>
                    {selectedBusiness.corroborationSources && (
                      <div className="flex flex-wrap gap-1">
                        {selectedBusiness.corroborationSources.split(';').map((src, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            {src.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedBusiness.sunbizStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">FL Sunbiz</span>
                        <span className={`font-medium ${
                          selectedBusiness.sunbizStatus === 'Active' ? 'text-green-600' : 'text-gray-500'
                        }`}>{selectedBusiness.sunbizStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                {selectedBusiness.phone && (
                  <a
                    href={`tel:${selectedBusiness.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Phone size={18} className="text-cgcc-navy" />
                    <span className="text-gray-700">{selectedBusiness.phone}</span>
                  </a>
                )}
                {selectedBusiness.website && (
                  <a
                    href={`https://${selectedBusiness.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Globe size={18} className="text-cgcc-navy" />
                    <span className="text-gray-700 flex-1">{selectedBusiness.website}</span>
                    <ExternalLink size={14} className="text-gray-400" />
                  </a>
                )}
                {selectedBusiness.address && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin size={18} className="text-cgcc-navy mt-0.5" />
                    <span className="text-gray-700">{selectedBusiness.address}</span>
                  </div>
                )}
              </div>

              {/* Strengths */}
              {selectedBusiness.top_delights && (
                <div>
                  <h3 className="font-semibold text-cgcc-navy mb-3 flex items-center gap-2">
                    <CheckCircle size={18} className="text-cgcc-sage" />
                    What People Love
                  </h3>
                  <div className="space-y-2">
                    {selectedBusiness.top_delights.split(';').map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-cgcc-sage/5 rounded-lg">
                        <Sparkles size={14} className="text-cgcc-sage mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{item.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pain Points */}
              {selectedBusiness.top_pain_points && (
                <div>
                  <h3 className="font-semibold text-cgcc-navy mb-3 flex items-center gap-2">
                    <XCircle size={18} className="text-cgcc-coral" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-2">
                    {selectedBusiness.top_pain_points.split(';').map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-cgcc-coral/5 rounded-lg">
                        <AlertTriangle size={14} className="text-cgcc-coral mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{item.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => toggleBookmark(selectedBusiness.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                    isBookmarked(selectedBusiness.id)
                      ? 'bg-cgcc-coral/10 text-cgcc-coral'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Heart size={18} className={isBookmarked(selectedBusiness.id) ? 'fill-current' : ''} />
                  {isBookmarked(selectedBusiness.id) ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    navigate(`/my-business?claim=${selectedBusiness.id}`)
                    setSelectedBusiness(null)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cgcc-gold text-white rounded-xl font-medium hover:bg-cgcc-gold/90 transition-colors"
                >
                  This is my business
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
