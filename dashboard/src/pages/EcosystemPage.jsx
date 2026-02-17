import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Users,
  Building2,
  Star,
  Award,
  ArrowRight,
  Search,
  Filter,
  Briefcase,
  Scale,
  Landmark,
  Car,
  Utensils,
  GraduationCap,
  Heart,
  Dumbbell,
  ShoppingBag,
  Home,
  Sparkles,
} from 'lucide-react'

// Category icons mapping
const categoryIcons = {
  professional_services: Briefcase,
  attorney: Scale,
  financial_services: Landmark,
  banking: Landmark,
  auto_dealer: Car,
  restaurant: Utensils,
  education: GraduationCap,
  wellness: Heart,
  fitness: Dumbbell,
  retail: ShoppingBag,
  real_estate: Home,
  nonprofit: Heart,
}

export default function EcosystemPage() {
  const { businesses, stats, toggleBookmark, isBookmarked } = useData()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Get selected business
  const selectedBusinessId = localStorage.getItem('cgcc_my_business')
  const myBusiness = businesses.find(b => b.id === selectedBusinessId)

  // Service categories that could help businesses
  const serviceCategories = useMemo(() => {
    const categories = [
      { id: 'professional_services', name: 'Professional Services', description: 'Consultants, accountants, marketing' },
      { id: 'attorney', name: 'Legal Services', description: 'Attorneys and legal advisors' },
      { id: 'financial_services', name: 'Financial Services', description: 'Banking, insurance, investment' },
      { id: 'real_estate', name: 'Real Estate', description: 'Commercial and office space' },
    ]

    return categories.map(cat => ({
      ...cat,
      count: businesses.filter(b => b.category_primary === cat.id).length,
      topRated: businesses
        .filter(b => b.category_primary === cat.id && b.isChamberMember)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3),
    })).filter(cat => cat.count > 0)
  }, [businesses])

  // Recommended partners based on my business
  const recommendedPartners = useMemo(() => {
    if (!myBusiness) return []

    // Get businesses that could be complementary
    const complementary = businesses.filter(b => {
      // Not the same business
      if (b.id === myBusiness.id) return false
      // Chamber members preferred
      if (!b.isChamberMember) return false
      // Different category (potential partner, not competitor)
      if (b.category_primary === myBusiness.category_primary) return false
      // Good rating
      if (b.rating < 4.0) return false
      return true
    })

    return complementary
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
  }, [businesses, myBusiness])

  // Filter businesses
  const filteredBusinesses = useMemo(() => {
    let filtered = businesses.filter(b => b.isChamberMember) // Only show chamber members in ecosystem

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.business_name?.toLowerCase().includes(query) ||
        b.category_primary?.toLowerCase().includes(query) ||
        b.top_delights?.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(b => b.category_primary === selectedCategory)
    }

    return filtered.sort((a, b) => b.rating - a.rating)
  }, [businesses, searchQuery, selectedCategory])

  // Render stars
  const renderStars = (rating, size = 12) => {
    const fullStars = Math.floor(rating)
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < fullStars ? 'text-cgcc-gold fill-cgcc-gold' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-cgcc-navy">Your Ecosystem</h1>
        <p className="text-gray-600">
          Connect with Chamber members who can help your business grow
        </p>
      </div>

      {/* Recommended Partners */}
      {myBusiness && recommendedPartners.length > 0 && (
        <div className="bg-gradient-to-br from-cgcc-gold/10 to-cgcc-gold/5 rounded-2xl p-6 border border-cgcc-gold/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cgcc-gold/20 rounded-xl flex items-center justify-center">
                <Sparkles size={20} className="text-cgcc-gold" />
              </div>
              <div>
                <h2 className="font-semibold text-cgcc-navy">Recommended for You</h2>
                <p className="text-sm text-gray-600">Chamber partners that complement your business</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedPartners.map((business) => {
              const Icon = categoryIcons[business.category_primary] || Building2
              return (
                <div
                  key={business.id}
                  className="bg-white rounded-xl p-4 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-cgcc-gold/30"
                  onClick={() => navigate(`/discover/browse?business=${business.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-cgcc-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-cgcc-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-cgcc-navy text-sm truncate">{business.business_name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{business.category_primary?.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(business.rating)}
                        <span className="text-xs text-gray-600">{business.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div>
        <h2 className="font-semibold text-cgcc-navy mb-4 flex items-center gap-2">
          <Briefcase size={18} />
          Services for Your Business
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceCategories.map((cat) => {
            const Icon = categoryIcons[cat.id] || Building2
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cgcc-navy/10 rounded-lg flex items-center justify-center">
                        <Icon size={20} className="text-cgcc-navy" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-cgcc-navy">{cat.name}</h3>
                        <p className="text-xs text-gray-500">{cat.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{cat.count} members</span>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-2">Top Rated Chamber Members</p>
                  {cat.topRated.length > 0 ? (
                    <div className="space-y-2">
                      {cat.topRated.map((business, i) => (
                        <div
                          key={business.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/discover/browse?business=${business.id}`)}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-cgcc-gold/20 text-cgcc-gold' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cgcc-navy truncate">{business.business_name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-cgcc-gold fill-cgcc-gold" />
                            <span className="text-sm text-gray-600">{business.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No members in this category</p>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id)
                      setSearchQuery('')
                    }}
                    className="w-full mt-3 text-sm text-cgcc-gold hover:underline flex items-center justify-center gap-1"
                  >
                    View all <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Browse All Chamber Members */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="font-semibold text-cgcc-navy flex items-center gap-2">
            <Users size={18} />
            All Chamber Members ({filteredBusinesses.length})
          </h2>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
              />
            </div>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-cgcc-gold focus:ring-2 focus:ring-cgcc-gold/20"
            >
              <option value="">All Categories</option>
              {stats?.categories.map(cat => (
                <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBusinesses.slice(0, 12).map((business) => {
            const Icon = categoryIcons[business.category_primary] || Building2
            return (
              <div
                key={business.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-cgcc-gold/30 transition-all cursor-pointer"
                onClick={() => navigate(`/discover/browse?business=${business.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-cgcc-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-cgcc-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-cgcc-navy truncate">{business.business_name}</h3>
                    <p className="text-xs text-gray-500 capitalize mb-2">
                      {business.category_primary?.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2">
                      {renderStars(business.rating)}
                      <span className="text-sm text-gray-600">{business.rating.toFixed(1)}</span>
                    </div>
                    {business.top_delights && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                        {business.top_delights.split(';')[0]}
                      </p>
                    )}
                  </div>
                  <Award size={16} className="text-cgcc-gold flex-shrink-0" />
                </div>
              </div>
            )
          })}
        </div>

        {filteredBusinesses.length > 12 && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/discover/browse?chamber=true')}
              className="px-6 py-3 bg-cgcc-navy text-white font-medium rounded-xl hover:bg-cgcc-navy/90 transition-colors"
            >
              View All {filteredBusinesses.length} Members
            </button>
          </div>
        )}

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No members found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
