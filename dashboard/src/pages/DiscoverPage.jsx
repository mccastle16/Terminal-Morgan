import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Star,
  Award,
  Building2,
  MapPin,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Shield,
  Heart,
  TrendingUp,
  Phone,
  Globe,
  ExternalLink,
} from 'lucide-react'

export default function DiscoverPage() {
  const { businesses, stats, toggleBookmark, isBookmarked } = useData()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')

  // Best of lists
  const bestOf = useMemo(() => {
    const categories = stats?.categories || []

    // Overall top rated
    const topRated = [...businesses]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)

    // Most trusted (high confidence + high rating)
    const mostTrusted = [...businesses]
      .filter(b => b.osintConfidence >= 0.8 && b.rating >= 4.0 && !b.hasRedFlag)
      .sort((a, b) => (b.rating * b.osintConfidence) - (a.rating * a.osintConfidence))
      .slice(0, 10)

    // Chamber favorites (members with best ratings)
    const chamberFavorites = [...businesses]
      .filter(b => b.isChamberMember)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)

    // Rising stars (good rating + newer/moderate confidence - room to grow)
    const risingStars = [...businesses]
      .filter(b => b.rating >= 3.5 && b.osintConfidence >= 0.5 && b.osintConfidence < 0.8)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)

    // By category
    const topByCategory = categories.map(cat => {
      const catBusinesses = businesses.filter(b => b.category_primary === cat)
      const top = [...catBusinesses].sort((a, b) => b.rating - a.rating).slice(0, 3)
      return {
        category: cat,
        displayName: cat.replace(/_/g, ' '),
        businesses: top,
        count: catBusinesses.length,
      }
    }).filter(c => c.businesses.length > 0)

    return { topRated, mostTrusted, chamberFavorites, risingStars, topByCategory }
  }, [businesses, stats])

  // Render star rating
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

  // Business card component
  const BusinessCard = ({ business, showCategory = true, highlight = false }) => (
    <div
      className={`group p-4 rounded-xl border transition-all cursor-pointer ${
        highlight
          ? 'bg-gradient-to-br from-cgcc-gold/5 to-cgcc-gold/10 border-cgcc-gold/30 hover:shadow-lg'
          : 'bg-white border-gray-200 hover:border-cgcc-gold/50 hover:shadow-md'
      }`}
      onClick={() => navigate(`/discover/browse?business=${business.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          highlight ? 'bg-cgcc-gold/20' : 'bg-cgcc-navy/5'
        }`}>
          <Building2 size={20} className={highlight ? 'text-cgcc-gold' : 'text-cgcc-navy'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-cgcc-navy truncate group-hover:text-cgcc-gold transition-colors">
                {business.business_name}
              </h4>
              {showCategory && (
                <p className="text-xs text-gray-500 capitalize mt-0.5">
                  {business.category_primary?.replace(/_/g, ' ')}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleBookmark(business.id)
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked(business.id)
                  ? 'text-cgcc-coral bg-cgcc-coral/10'
                  : 'text-gray-400 hover:text-cgcc-coral hover:bg-cgcc-coral/5'
              }`}
            >
              <Heart size={16} className={isBookmarked(business.id) ? 'fill-current' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              {renderStars(business.rating)}
              <span className="text-sm font-medium text-cgcc-navy ml-1">{business.rating.toFixed(1)}</span>
            </div>
            {business.price_tier && (
              <span className="text-sm text-gray-500">{business.price_tier}</span>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {business.isChamberMember && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cgcc-gold/10 text-cgcc-gold text-xs font-medium rounded-full">
                <Award size={10} /> Chamber Member
              </span>
            )}
            {business.osintConfidence >= 0.8 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cgcc-sage/10 text-cgcc-sage text-xs font-medium rounded-full">
                <Shield size={10} /> Verified
              </span>
            )}
          </div>

          {/* Preview of delights */}
          {business.top_delights && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              <Sparkles size={10} className="inline text-cgcc-gold mr-1" />
              {business.top_delights.split(';')[0]}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  // Featured List Section
  const FeaturedSection = ({ title, subtitle, icon: Icon, iconColor, businesses, showViewAll = true }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${iconColor}/10`}>
            <Icon size={20} className={`text-${iconColor}`} />
          </div>
          <div>
            <h2 className="font-display font-bold text-cgcc-navy text-lg">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        {showViewAll && (
          <button
            onClick={() => navigate('/discover/browse')}
            className="text-sm text-cgcc-gold hover:underline flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {businesses.slice(0, 5).map((business, i) => (
          <BusinessCard key={business.id} business={business} highlight={i === 0} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-cgcc-navy via-cgcc-navy to-cgcc-navy/90 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cgcc-gold rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cgcc-sage rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <h1 className="text-3xl font-display font-bold mb-2">
            Best of Coral Gables
          </h1>
          <p className="text-white/70 max-w-2xl">
            Discover top-rated, trusted businesses curated by the Coral Gables Chamber of Commerce.
            Every business is verified and rated by the community.
          </p>
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cgcc-gold/20 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-cgcc-gold" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.total}</p>
                <p className="text-xs text-white/50">Businesses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cgcc-sage/20 rounded-lg flex items-center justify-center">
                <Star size={16} className="text-cgcc-sage" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.avgRating}</p>
                <p className="text-xs text-white/50">Avg Rating</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cgcc-coral/20 rounded-lg flex items-center justify-center">
                <Award size={16} className="text-cgcc-coral" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats?.chamberMembers}</p>
                <p className="text-xs text-white/50">Chamber Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Rated */}
      <FeaturedSection
        title="Top Rated"
        subtitle="Highest rated businesses in Coral Gables"
        icon={Star}
        iconColor="cgcc-gold"
        businesses={bestOf.topRated}
      />

      {/* Most Trusted */}
      <FeaturedSection
        title="Most Trusted"
        subtitle="High confidence data + excellent ratings"
        icon={Shield}
        iconColor="cgcc-sage"
        businesses={bestOf.mostTrusted}
      />

      {/* Chamber Favorites */}
      <FeaturedSection
        title="Chamber Favorites"
        subtitle="Top-rated Chamber of Commerce members"
        icon={Award}
        iconColor="cgcc-coral"
        businesses={bestOf.chamberFavorites}
      />

      {/* Rising Stars */}
      <FeaturedSection
        title="Rising Stars"
        subtitle="Up-and-coming businesses to watch"
        icon={TrendingUp}
        iconColor="cgcc-navy"
        businesses={bestOf.risingStars}
      />

      {/* Browse by Category */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-cgcc-navy text-xl">Browse by Category</h2>
          <button
            onClick={() => navigate('/discover/browse')}
            className="text-sm text-cgcc-gold hover:underline flex items-center gap-1"
          >
            See all categories <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bestOf.topByCategory.slice(0, 6).map((cat) => (
            <div
              key={cat.category}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Category Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-cgcc-navy capitalize">{cat.displayName}</h3>
                  <p className="text-sm text-gray-500">{cat.count} businesses</p>
                </div>
                <button
                  onClick={() => navigate(`/discover/browse?category=${cat.category}`)}
                  className="text-xs text-cgcc-gold hover:underline"
                >
                  View all
                </button>
              </div>

              {/* Top 3 in category */}
              <div className="divide-y divide-gray-100">
                {cat.businesses.map((business, i) => (
                  <div
                    key={business.id}
                    className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/discover/browse?business=${business.id}`)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      i === 0 ? 'bg-cgcc-gold/20 text-cgcc-gold' :
                      i === 1 ? 'bg-gray-200 text-gray-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-cgcc-navy truncate">{business.business_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {renderStars(business.rating, 10)}
                        <span className="text-xs text-gray-500 ml-1">{business.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    {business.isChamberMember && (
                      <Award size={14} className="text-cgcc-gold flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-cgcc-gold/10 via-cgcc-gold/5 to-transparent rounded-2xl p-6 border border-cgcc-gold/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-cgcc-navy text-lg">Own a business in Coral Gables?</h3>
            <p className="text-gray-600 mt-1">
              Claim your listing and join the Chamber to get featured on our platform.
            </p>
          </div>
          <button
            onClick={() => navigate('/my-business')}
            className="px-6 py-3 bg-cgcc-gold text-white font-semibold rounded-xl hover:bg-cgcc-gold/90 transition-colors whitespace-nowrap"
          >
            Claim Your Business
          </button>
        </div>
      </div>
    </div>
  )
}
