import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Bookmark,
  BookmarkX,
  Star,
  ExternalLink,
  Trash2,
  Download,
  AlertTriangle,
  MapPin,
} from 'lucide-react'
import clsx from 'clsx'

export default function BookmarksPage() {
  const { businesses, bookmarks, toggleBookmark, exportData, loading } = useData()

  const bookmarkedBusinesses = useMemo(() => {
    return businesses.filter(b => bookmarks.includes(b.id))
  }, [businesses, bookmarks])

  const exportBookmarks = () => {
    const dataToExport = bookmarkedBusinesses.map(b => ({
      business_name: b.business_name,
      contact_name: b.contact_name,
      phone: b.phone,
      website: b.website,
      category: b.category_primary,
      rating: b.rating,
      confidence: b.osintConfidence,
      top_delights: b.top_delights,
      top_pain_points: b.top_pain_points,
      primary_risks: b.pkp_primary_risks,
      recommended_actions: b.pkp_primary_actions,
    }))

    const csv = [
      Object.keys(dataToExport[0] || {}).join(','),
      ...dataToExport.map(row =>
        Object.values(row).map(v =>
          typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookmarked_businesses.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl shimmer"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Bookmarked Businesses
          </h1>
          <p className="text-gray-500 mt-1">
            {bookmarkedBusinesses.length} businesses saved
          </p>
        </div>

        {bookmarkedBusinesses.length > 0 && (
          <button
            onClick={exportBookmarks}
            className="btn-secondary flex items-center gap-2 w-fit"
          >
            <Download size={18} />
            Export Bookmarks
          </button>
        )}
      </div>

      {/* Empty state */}
      {bookmarkedBusinesses.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No bookmarks yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start exploring businesses and bookmark the ones you want to keep track of for quick access later.
          </p>
          <Link to="/businesses" className="btn-primary">
            Explore Businesses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarkedBusinesses.map((business) => (
            <BookmarkCard
              key={business.id}
              business={business}
              onRemove={() => toggleBookmark(business.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookmarkCard({ business, onRemove }) {
  return (
    <div className="card hover:shadow-card-hover transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 bg-gradient-to-br from-cgcc-navy to-cgcc-navy/80 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">
            {business.business_name?.charAt(0) || 'B'}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                to={`/businesses/${business.id}`}
                className="text-lg font-semibold text-gray-900 hover:text-cgcc-navy"
              >
                {business.business_name}
              </Link>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="text-sm text-gray-500">{business.category_primary}</span>
                {business.neighborhood_area && (
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <MapPin size={12} />
                    {business.neighborhood_area}
                  </span>
                )}
              </div>
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-cgcc-gold/10 rounded-full">
                <Star size={14} className="text-cgcc-gold fill-cgcc-gold" />
                <span className="text-sm font-medium text-cgcc-gold">{business.rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <span className={clsx(
                'badge',
                business.osintConfidence >= 0.8 ? 'badge-success' :
                business.osintConfidence >= 0.6 ? 'badge-warning' : 'badge-danger'
              )}>
                {(business.osintConfidence * 100).toFixed(0)}%
              </span>
              {business.hasRedFlag && (
                <span className="badge-danger flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Risk
                </span>
              )}
            </div>
          </div>

          {/* Insights preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {business.top_delights && (
              <div className="p-3 bg-cgcc-sage/5 rounded-lg border border-cgcc-sage/20">
                <p className="text-xs font-medium text-cgcc-sage mb-1">Top Delights</p>
                <p className="text-sm text-gray-600 line-clamp-2">{business.top_delights}</p>
              </div>
            )}
            {business.top_pain_points && (
              <div className="p-3 bg-cgcc-coral/5 rounded-lg border border-cgcc-coral/20">
                <p className="text-xs font-medium text-cgcc-coral mb-1">Pain Points</p>
                <p className="text-sm text-gray-600 line-clamp-2">{business.top_pain_points}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex lg:flex-col items-center gap-2 lg:ml-4">
          <Link
            to={`/businesses/${business.id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cgcc-navy hover:bg-cgcc-navy/10 rounded-lg transition-colors"
          >
            View Details
            <ExternalLink size={14} />
          </Link>
          <Link
            to={`/content-studio?business=${business.id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cgcc-gold hover:bg-cgcc-gold/10 rounded-lg transition-colors"
          >
            Create Content
          </Link>
          <button
            onClick={onRemove}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <BookmarkX size={14} />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
