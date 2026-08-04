import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTerminalData } from '../context/TerminalDataContext'
import { useTerminalAuth } from '../context/TerminalAuthContext'
import {
  Users, Building2, Star, Award, ArrowRight, Search,
  Briefcase, Scale, Landmark, Car, Utensils, GraduationCap,
  Heart, Dumbbell, ShoppingBag, Home, Sparkles,
} from 'lucide-react'

const categoryIcons = {
  professional_services: Briefcase, attorney: Scale, financial_services: Landmark,
  banking: Landmark, auto_dealer: Car, restaurant: Utensils, food_beverage: Utensils,
  education: GraduationCap, wellness: Heart, fitness: Dumbbell, retail: ShoppingBag,
  real_estate: Home, nonprofit: Heart,
}

export default function EcosystemPage() {
  const { rawBusinesses, stats } = useTerminalData()
  const { user } = useTerminalAuth()
  const navigate = useNavigate()
  const [serviceSearch, setServiceSearch] = useState('')

  const selectedBusinessId = user?.businessId || localStorage.getItem('terminal_my_business')
  const myBusiness = rawBusinesses.find(b => b._id === selectedBusinessId)

  const serviceCategories = useMemo(() => {
    const catCounts = {}
    rawBusinesses.forEach(b => {
      const cat = b.category_primary
      if (!cat) return
      if (!catCounts[cat]) catCounts[cat] = { total: 0, members: [] }
      catCounts[cat].total++
      if (b.isChamberMember) catCounts[cat].members.push(b)
    })

    let cats = Object.entries(catCounts)
      .filter(([, v]) => v.members.length > 0)
      .sort((a, b) => b[1].members.length - a[1].members.length)

    if (serviceSearch) {
      const q = serviceSearch.toLowerCase()
      cats = cats.filter(([id]) => id.replace(/_/g, ' ').toLowerCase().includes(q))
    }

    return cats.slice(0, 12).map(([id, v]) => ({
      id,
      name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      memberCount: v.members.length,
      totalCount: v.total,
      topRated: v.members
        .sort((a, b) => b._rating - a._rating)
        .slice(0, 3),
    }))
  }, [rawBusinesses, serviceSearch])

  const recommendedPartners = useMemo(() => {
    if (!myBusiness) return []
    return rawBusinesses.filter(b =>
      b._id !== myBusiness._id && b.isChamberMember &&
      b.category_primary !== myBusiness.category_primary && b._rating >= 4.0
    ).sort((a, b) => b._rating - a._rating).slice(0, 6)
  }, [rawBusinesses, myBusiness])

  const totalMembers = rawBusinesses.filter(b => b.isChamberMember).length

  const renderStars = (rating, size = 12) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={size}
          className={i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-3 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Users size={16} className="text-amber-400" />
            </div>
            Chamber Ecosystem
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalMembers} chamber members across {serviceCategories.length}+ categories — find partners, discover services
          </p>
        </div>
        <button onClick={() => navigate('/browse')}
          className="text-xs text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1">
          Full Directory <ArrowRight size={12} />
        </button>
      </div>

      {/* Recommended Partners (only if user has claimed a business) */}
      {myBusiness && recommendedPartners.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg p-5 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Recommended for {myBusiness.business_name}</h2>
              <p className="text-[11px] text-slate-400">High-rated chamber partners in complementary categories</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendedPartners.map((business) => {
              const Icon = categoryIcons[business.category_primary] || Building2
              return (
                <div key={business._id} onClick={() => navigate(`/explorer/${business._id}`)}
                  className="bg-slate-900/60 rounded-lg p-3 hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-200 text-xs truncate">{business.business_name}</h3>
                      <p className="text-[10px] text-slate-500 capitalize">{business.category_primary?.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(business._rating, 10)}
                        <span className="text-[10px] text-slate-400">{business._rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Service finder search */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700/60 flex items-center justify-center">
            <Briefcase size={12} className="text-slate-400" />
          </div>
          Find a Service
        </h2>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search categories..." value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20" />
        </div>
      </div>

      {/* Services by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceCategories.map((cat) => {
          const Icon = categoryIcons[cat.id] || Building2
          return (
            <div key={cat.id} className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
              <div className="p-4 border-b border-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                      <Icon size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white">{cat.name}</h3>
                      <p className="text-[10px] text-slate-500">{cat.memberCount} members · {cat.totalCount} total</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-1.5">
                {cat.topRated.length > 0 ? (
                  cat.topRated.map((business, i) => (
                    <div key={business._id} onClick={() => navigate(`/explorer/${business._id}`)}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                        i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800/60 text-slate-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{business.business_name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] text-slate-400">{business._rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-600 px-2 py-1">No rated members yet</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {serviceCategories.length === 0 && (
        <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
          <Search size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No categories match "{serviceSearch}"</p>
        </div>
      )}
    </div>
  )
}
