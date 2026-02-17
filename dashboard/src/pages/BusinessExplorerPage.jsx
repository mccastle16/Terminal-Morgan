import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Phone,
  Globe,
  MapPin,
  ChevronDown,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import clsx from 'clsx'

const PRICE_TIERS = ['$', '$$', '$$$', '$$$$']
const CONFIDENCE_LEVELS = [
  { value: 'high', label: 'High (80%+)' },
  { value: 'moderate', label: 'Moderate (60-80%)' },
  { value: 'low', label: 'Low (<60%)' },
]

export default function BusinessExplorerPage() {
  const { filteredBusinesses, stats, filters, setFilters, toggleBookmark, isBookmarked, loading } = useData()
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('name')

  const sortedBusinesses = useMemo(() => {
    const sorted = [...filteredBusinesses]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''))
        break
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating)
        break
      case 'confidence':
        sorted.sort((a, b) => b.osintConfidence - a.osintConfidence)
        break
      case 'recent':
        sorted.sort((a, b) => new Date(b.last_reviewed_date) - new Date(a.last_reviewed_date))
        break
      default:
        break
    }
    return sorted
  }, [filteredBusinesses, sortBy])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.category) count++
    if (filters.priceRange) count++
    if (filters.confidenceLevel) count++
    if (filters.hasRedFlag !== null) count++
    return count
  }, [filters])

  const clearFilters = () => {
    setFilters({
      search: filters.search,
      category: '',
      riskLevel: '',
      confidenceLevel: '',
      priceRange: '',
      hasRedFlag: null,
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl shimmer"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Business Explorer
          </h1>
          <p className="text-gray-500 mt-1">
            {filteredBusinesses.length} of {stats?.total || 0} businesses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-white shadow-sm text-cgcc-navy' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-white shadow-sm text-cgcc-navy' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List size={18} />
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-cgcc-gold"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="confidence">Sort by Confidence</option>
              <option value="recent">Recently Reviewed</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              showFilters || activeFiltersCount > 0
                ? 'bg-cgcc-navy text-white border-cgcc-navy'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            )}
          >
            <SlidersHorizontal size={18} />
            <span className="text-sm font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-cgcc-gold text-cgcc-charcoal text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-cgcc-coral hover:text-red-700 flex items-center gap-1"
              >
                <X size={14} />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">All Categories</option>
                {stats?.categories?.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price tier filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price Tier</label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">All Prices</option>
                {PRICE_TIERS.map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>

            {/* Confidence filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confidence Level</label>
              <select
                value={filters.confidenceLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, confidenceLevel: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">All Levels</option>
                {CONFIDENCE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Red flag filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Risk Status</label>
              <select
                value={filters.hasRedFlag === null ? '' : filters.hasRedFlag.toString()}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  hasRedFlag: e.target.value === '' ? null : e.target.value === 'true'
                }))}
                className="input-field text-sm"
              >
                <option value="">All Status</option>
                <option value="true">Has Red Flag</option>
                <option value="false">No Red Flag</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Business grid/list */}
      {sortedBusinesses.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No businesses found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 text-cgcc-gold hover:text-cgcc-navy font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBusinesses.map((business) => (
            <BusinessCard key={business.id} business={business} onBookmark={toggleBookmark} isBookmarked={isBookmarked} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBusinesses.map((business) => (
            <BusinessListItem key={business.id} business={business} onBookmark={toggleBookmark} isBookmarked={isBookmarked} />
          ))}
        </div>
      )}
    </div>
  )
}

function BusinessCard({ business, onBookmark, isBookmarked }) {
  const bookmarked = isBookmarked(business.id)

  return (
    <div className="card-interactive group relative">
      {/* Bookmark button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          onBookmark(business.id)
        }}
        className={clsx(
          'absolute top-4 right-4 p-2 rounded-lg transition-all z-10',
          bookmarked
            ? 'bg-cgcc-gold text-white'
            : 'bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-cgcc-gold'
        )}
      >
        {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
      </button>

      <Link to={`/businesses/${business.id}`}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cgcc-navy to-cgcc-navy/80 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">
              {business.business_name?.charAt(0) || 'B'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-cgcc-navy truncate">
              {business.business_name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{business.category_primary}</p>
            {business.neighborhood_area && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {business.neighborhood_area}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star size={16} className="text-cgcc-gold fill-cgcc-gold" />
            <span className="text-sm font-medium">{business.rating?.toFixed(1) || 'N/A'}</span>
          </div>
          {business.price_tier && (
            <span className="text-sm text-gray-500">{business.price_tier}</span>
          )}
          <div className={clsx(
            'ml-auto badge',
            business.osintConfidence >= 0.8 ? 'badge-success' :
            business.osintConfidence >= 0.6 ? 'badge-warning' : 'badge-danger'
          )}>
            {(business.osintConfidence * 100).toFixed(0)}% conf
          </div>
        </div>

        {/* Delights */}
        {business.top_delights && (
          <div className="mb-3">
            <p className="text-xs text-cgcc-sage font-medium mb-1">Delights</p>
            <p className="text-sm text-gray-600 line-clamp-2">{business.top_delights}</p>
          </div>
        )}

        {/* Pain points */}
        {business.top_pain_points && (
          <div className="mb-3">
            <p className="text-xs text-cgcc-coral font-medium mb-1">Pain Points</p>
            <p className="text-sm text-gray-600 line-clamp-2">{business.top_pain_points}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {business.hasRedFlag && (
            <span className="badge-danger flex items-center gap-1">
              <AlertTriangle size={12} />
              Risk Alert
            </span>
          )}
          <span className="text-xs text-cgcc-gold group-hover:text-cgcc-navy font-medium ml-auto flex items-center gap-1">
            View Details <ExternalLink size={12} />
          </span>
        </div>
      </Link>
    </div>
  )
}

function BusinessListItem({ business, onBookmark, isBookmarked }) {
  const bookmarked = isBookmarked(business.id)

  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-cgcc-navy rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-white">
            {business.business_name?.charAt(0) || 'B'}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/businesses/${business.id}`}
              className="font-semibold text-gray-900 hover:text-cgcc-navy truncate"
            >
              {business.business_name}
            </Link>
            {business.hasRedFlag && (
              <span className="badge-danger flex items-center gap-1">
                <AlertTriangle size={10} />
                Risk
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{business.category_primary}</p>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-cgcc-gold fill-cgcc-gold" />
              <span className="font-medium">{business.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <p className="text-xs text-gray-400">Rating</p>
          </div>
          <div className="text-center">
            <span className="font-medium">{(business.osintConfidence * 100).toFixed(0)}%</span>
            <p className="text-xs text-gray-400">Confidence</p>
          </div>
          <div className="text-center">
            <span className="font-medium">{business.price_tier || '-'}</span>
            <p className="text-xs text-gray-400">Price</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBookmark(business.id)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              bookmarked ? 'bg-cgcc-gold text-white' : 'text-gray-400 hover:text-cgcc-gold hover:bg-gray-100'
            )}
          >
            {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
          <Link
            to={`/businesses/${business.id}`}
            className="p-2 text-gray-400 hover:text-cgcc-navy hover:bg-gray-100 rounded-lg"
          >
            <ExternalLink size={18} />
          </Link>
        </div>
      </div>
    </div>
  )
}
