import { useState, useEffect, useRef } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  Bookmark, ChevronDown, Plus, Trash2, Save, Check,
} from 'lucide-react'

const STORAGE_KEY = 'terminal_saved_filters'

function loadSavedFilters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}

export default function SavedFilters({ className = '' }) {
  const { filters, setFilters } = useTerminalData()
  const [saved, setSaved] = useState(loadSavedFilters)
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasActiveFilters = Object.values(filters).some(v => v && v !== '')
  const persist = (list) => { setSaved(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

  const handleSave = () => {
    if (!name.trim()) return
    const entry = { id: Date.now(), name: name.trim(), filters: { ...filters }, createdAt: new Date().toISOString() }
    persist([entry, ...saved])
    setName(''); setNaming(false)
  }

  const handleLoad = (entry) => { setFilters(entry.filters); setOpen(false) }

  const handleDelete = (id) => {
    persist(saved.filter(s => s.id !== id))
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-400 hover:text-slate-300 hover:border-slate-700 transition-all"
      >
        <Bookmark size={12} />
        Saved Filters
        {saved.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] text-amber-400 font-bold">{saved.length}</span>
        )}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Save current */}
          {hasActiveFilters && (
            <div className="p-3 border-b border-slate-800/60">
              {naming ? (
                <div className="flex items-center gap-2">
                  <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Filter set name..."
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-300 placeholder:text-slate-600 outline-none focus:border-amber-500/50" />
                  <button onClick={handleSave}
                    className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setNaming(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                  <Plus size={12} /> Save current filters
                </button>
              )}
            </div>
          )}

          {/* Saved list */}
          <div className="max-h-64 overflow-y-auto">
            {saved.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-600">No saved filters yet</p>
            ) : (
              saved.map(entry => {
                const active = Object.entries(entry.filters).filter(([,v]) => v && v !== '')
                return (
                  <div key={entry.id}
                    className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-800/50 transition-colors group border-b border-slate-800/30 last:border-0">
                    <button onClick={() => handleLoad(entry)} className="flex-1 text-left min-w-0">
                      <p className="text-xs text-slate-300 font-medium truncate">{entry.name}</p>
                      <p className="text-[10px] text-slate-600 truncate">
                        {active.map(([k]) => k).join(', ') || 'No active filters'}
                      </p>
                    </button>
                    <button onClick={() => handleDelete(entry.id)}
                      className="p-1 rounded text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
