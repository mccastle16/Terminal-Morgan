import { useState } from 'react'
import { Info } from 'lucide-react'

export default function InfoTooltip({ text, side = 'bottom', align = 'center' }) {
  const [open, setOpen] = useState(false)

  const vertical = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
  const horizontal = align === 'right'
    ? 'right-0'
    : 'left-1/2 -translate-x-1/2'
  const positionClasses = `${vertical} ${horizontal}`

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-label="More information"
        className="text-slate-600 hover:text-slate-300 transition-colors"
      >
        <Info size={12} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 w-56 rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-[11px] leading-relaxed text-slate-300 shadow-xl shadow-black/40 backdrop-blur-sm ${positionClasses}`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
