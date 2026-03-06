import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  ArrowLeft,
  Star,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Bookmark,
  BookmarkCheck,
  Send,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Calendar,
  User,
  Layers,
} from 'lucide-react'
import clsx from 'clsx'

export default function BusinessDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { businesses, toggleBookmark, isBookmarked, addNote, deleteNote, getBusinessNotes } = useData()
  const [newNote, setNewNote] = useState('')
  const [copiedField, setCopiedField] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const business = useMemo(() => {
    return businesses.find(b => b.id === id || b.business_id === id)
  }, [businesses, id])

  const notes = useMemo(() => {
    return getBusinessNotes(id)
  }, [getBusinessNotes, id])

  const bookmarked = isBookmarked(id)

  const handleAddNote = (e) => {
    e.preventDefault()
    if (newNote.trim()) {
      addNote(id, newNote.trim())
      setNewNote('')
    }
  }

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (!business) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Business not found</h2>
        <p className="text-gray-500 mb-4">The business you're looking for doesn't exist.</p>
        <Link to="/businesses" className="btn-primary">
          Back to Explorer
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'insights', label: 'Insights & Analysis', icon: Lightbulb },
    { id: 'risks', label: 'Risks & Actions', icon: Shield },
    { id: 'notes', label: `Notes (${notes.length})`, icon: FileText },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-cgcc-navy transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header card */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Business avatar */}
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-cgcc-navy to-cgcc-navy/80 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl lg:text-4xl font-bold text-white">
              {business.business_name?.charAt(0) || 'B'}
            </span>
          </div>

          {/* Business info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
                  {business.business_name}
                </h1>
                <p className="text-lg text-gray-500 mt-1">
                  {business.category_primary}
                  {business.category_secondary && ` - ${business.category_secondary}`}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(id)}
                className={clsx(
                  'p-3 rounded-xl transition-all',
                  bookmarked
                    ? 'bg-cgcc-gold text-white'
                    : 'bg-gray-100 text-gray-400 hover:text-cgcc-gold hover:bg-cgcc-gold/10'
                )}
              >
                {bookmarked ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
              </button>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {business.contact_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User size={16} />
                  <span>{business.contact_name}</span>
                </div>
              )}
              {business.phone && (
                <button
                  onClick={() => copyToClipboard(business.phone, 'phone')}
                  className="flex items-center gap-2 text-gray-600 hover:text-cgcc-navy transition-colors"
                >
                  <Phone size={16} />
                  <span>{business.phone}</span>
                  {copiedField === 'phone' ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="opacity-50" />}
                </button>
              )}
              {business.website && (
                <a
                  href={`https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cgcc-gold hover:text-cgcc-navy transition-colors"
                >
                  <Globe size={16} />
                  <span>{business.website}</span>
                  <ExternalLink size={14} />
                </a>
              )}
              {business.neighborhood_area && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} />
                  <span>{business.neighborhood_area}</span>
                </div>
              )}
            </div>

            {/* Stats badges */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cgcc-gold/10 rounded-full">
                <Star size={16} className="text-cgcc-gold fill-cgcc-gold" />
                <span className="font-semibold text-cgcc-gold">{business.rating?.toFixed(1) || 'N/A'}</span>
                {business.rating_primary_source && (
                  <span className="text-xs text-gray-500">({business.rating_primary_source})</span>
                )}
              </div>

              {business.price_tier && (
                <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                  {business.price_tier}
                </span>
              )}

              <span className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium',
                business.osintConfidence >= 0.8 ? 'bg-green-100 text-green-700' :
                business.osintConfidence >= 0.6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              )}>
                {(business.osintConfidence * 100).toFixed(0)}% OSINT Confidence
              </span>

              {business.hasRedFlag && (
                <span className="badge-danger flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Red Flag Present
                </span>
              )}

              {business.isChamberMember && (
                <span className="badge-info flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  Chamber Member
                </span>
              )}

              {business.corroborationCount >= 2 && (
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5">
                  <Layers size={14} />
                  Verified by {business.corroborationCount} sources
                </span>
              )}

              {business.sunbizStatus && (
                <span className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5',
                  business.sunbizStatus === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                  business.sunbizStatus === 'Inactive' ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'
                )}>
                  <Shield size={14} />
                  Sunbiz: {business.sunbizStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-cgcc-gold text-cgcc-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delights */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-cgcc-sage/10 rounded-lg flex items-center justify-center">
                  <CheckCircle size={18} className="text-cgcc-sage" />
                </div>
                <h3 className="font-semibold text-gray-900">Top Delights</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {business.top_delights || 'No delights data available'}
              </p>
            </div>

            {/* Pain Points */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-cgcc-coral/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-cgcc-coral" />
                </div>
                <h3 className="font-semibold text-gray-900">Pain Points</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {business.top_pain_points || 'No pain points data available'}
              </p>
            </div>

            {/* Validation info */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-cgcc-navy/10 rounded-lg flex items-center justify-center">
                  <Target size={18} className="text-cgcc-navy" />
                </div>
                <h3 className="font-semibold text-gray-900">Validation Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Validation Tier</span>
                  <span className="font-medium text-gray-900">{business.validation_tier || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Validation Confidence</span>
                  <span className="font-medium text-gray-900">{((business.validationConfidence || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Last Reviewed</span>
                  <span className="font-medium text-gray-900">{business.last_reviewed_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Batch ID</span>
                  <span className="font-medium text-gray-900">{business.batch_id || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Red Flag Notes */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield size={18} className="text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Red Flag Assessment</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span className={clsx(
                    'badge',
                    business.hasRedFlag ? 'badge-danger' : 'badge-success'
                  )}>
                    {business.hasRedFlag ? 'Present' : 'None'}
                  </span>
                </div>
                {business.red_flag_severity && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Severity</span>
                    <span className={clsx(
                      'font-medium',
                      business.red_flag_severity === 'Critical' ? 'text-red-600' : 'text-orange-600'
                    )}>{business.red_flag_severity}</span>
                  </div>
                )}
                {business.red_flag_category && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Category</span>
                    <span className="font-medium text-gray-900">{business.red_flag_category}</span>
                  </div>
                )}
                {business.red_flag_notes && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{business.red_flag_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Corroboration & Sunbiz */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Layers size={18} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Source Verification</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Sources Confirmed</span>
                  <span className={clsx(
                    'font-semibold',
                    business.corroborationCount >= 3 ? 'text-green-600' :
                    business.corroborationCount >= 2 ? 'text-purple-600' : 'text-gray-500'
                  )}>
                    {business.corroborationCount || 1}
                  </span>
                </div>
                {business.corroborationSources && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Source Families</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {business.corroborationSources.split(';').map((src, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                          {src.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {business.sunbizStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">FL Sunbiz Status</span>
                    <span className={clsx(
                      'font-medium',
                      business.sunbizStatus === 'Active' ? 'text-green-600' :
                      business.sunbizStatus === 'Inactive' ? 'text-gray-500' : 'text-orange-600'
                    )}>{business.sunbizStatus}</span>
                  </div>
                )}
                {business.sunbizName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Registered Name</span>
                    <span className="font-medium text-gray-900 text-sm">{business.sunbizName}</span>
                  </div>
                )}
                {!business.corroborationSources && !business.sunbizStatus && (
                  <p className="text-sm text-gray-400">Single-source record — not yet corroborated</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* PKP Analysis */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">PKP Network Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Node Type</p>
                  <p className="text-gray-900 font-medium">{business.pkp_node_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Edges Summary</p>
                  <p className="text-gray-600">{business.pkp_edges_summary || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Picks & Shovels */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={18} className="text-cgcc-gold" />
                  <h3 className="font-semibold text-gray-900">Picks & Shovels</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {business.pkp_picks_shovels_summary || 'No data available'}
                </p>
              </div>

              {/* Undercurrents */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-cgcc-navy" />
                  <h3 className="font-semibold text-gray-900">Undercurrents</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {business.pkp_undercurrents_summary || 'No data available'}
                </p>
              </div>
            </div>

            {/* Key Signals */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-cgcc-sage" />
                <h3 className="font-semibold text-gray-900">Key Signals to Monitor</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {business.pkp_key_signals || 'No key signals identified'}
              </p>
            </div>

            {/* Notes field from CSV */}
            {business.notes && (
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Analyst Notes</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{business.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-6">
            {/* Primary Risks */}
            <div className="card border-l-4 border-cgcc-coral">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-cgcc-coral" />
                <h3 className="font-semibold text-gray-900">Primary Risks</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {business.pkp_primary_risks || 'No primary risks identified'}
              </p>
            </div>

            {/* Primary Actions */}
            <div className="card border-l-4 border-cgcc-sage">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-cgcc-sage" />
                <h3 className="font-semibold text-gray-900">Recommended Actions</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {business.pkp_primary_actions || 'No actions recommended'}
              </p>
            </div>

            {/* Content generation CTA */}
            <div className="card bg-gradient-to-r from-cgcc-navy to-cgcc-navy/90 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Generate Content</h3>
                  <p className="text-white/70">
                    Use these insights to create targeted content for this business
                  </p>
                </div>
                <Link
                  to={`/content-studio?business=${id}`}
                  className="btn-gold flex items-center gap-2 flex-shrink-0"
                >
                  <Zap size={18} />
                  Create Content
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Add note form */}
            <form onSubmit={handleAddNote} className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Add Note</h3>
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your notes about this business..."
                  className="input-field flex-1 min-h-[100px] resize-none"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="btn-primary self-end flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  Add
                </button>
              </div>
            </form>

            {/* Notes list */}
            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No notes yet. Add your first note above.</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-gray-600 whitespace-pre-wrap">{note.text}</p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(note.createdAt).toLocaleDateString()} at{' '}
                          {new Date(note.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(id, note.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
