import { X } from 'lucide-react'
import { useTerminalData } from '../context/TerminalDataContext'

export default function FilterBar() {
  const { filters, setFilters, stats } = useTerminalData()
  if (!stats) return null

  const activeCount = Object.entries(filters).filter(([k, v]) => v !== '' && v !== null).length

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const clear = () => setFilters({
    search: '', category: '', neighborhood: '', memberStatus: '',
    validationTier: '', riskLevel: '', minRating: '', hasWebsite: null,
  })

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select value={filters.category} onChange={e => update('category', e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500/50 focus:outline-none">
        <option value="">All categories</option>
        {stats.categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
      </select>

      <select value={filters.neighborhood} onChange={e => update('neighborhood', e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500/50 focus:outline-none">
        <option value="">All neighborhoods</option>
        {stats.neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <select value={filters.memberStatus} onChange={e => update('memberStatus', e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500/50 focus:outline-none">
        <option value="">All membership</option>
        <option value="member">Members</option>
        <option value="non-member">Non-members</option>
        <option value="unknown">Unknown</option>
      </select>

      <select value={filters.validationTier} onChange={e => update('validationTier', e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500/50 focus:outline-none">
        <option value="">All validation</option>
        <option value="3">High</option>
        <option value="2">Moderate</option>
        <option value="1">Low</option>
      </select>

      <select value={filters.riskLevel} onChange={e => update('riskLevel', e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500/50 focus:outline-none">
        <option value="">All risk</option>
        <option value="flagged">Flagged</option>
        <option value="clean">Clean</option>
      </select>

      {activeCount > 0 && (
        <button onClick={clear}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
          <X size={12} /> Clear {activeCount}
        </button>
      )}
    </div>
  )
}
