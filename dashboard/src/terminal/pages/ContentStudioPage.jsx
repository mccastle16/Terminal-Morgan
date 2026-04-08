import { useState, useEffect, useRef } from 'react'
import { useTerminalData } from '../context/TerminalDataContext'
import {
  FileText, Mail, MessageSquare, Newspaper, Megaphone,
  Copy, Download, Check, Search, Sparkles,
} from 'lucide-react'

const CONTENT_TYPES = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'social', label: 'Social Post', icon: MessageSquare },
  { id: 'blog', label: 'Blog Outline', icon: Newspaper },
  { id: 'ad', label: 'Ad Copy', icon: Megaphone },
]

const TONES = ['professional', 'friendly', 'persuasive', 'urgent']

function generateContent(business, type, tone) {
  const name = business?.business_name || 'Your Business'
  const cat = business?.category_primary?.replace(/_/g, ' ') || 'your industry'
  const rating = business?._rating?.toFixed(1) || '4.0'
  const neighborhood = business?.neighborhood_area || 'Coral Gables'
  const delights = business?.top_delights?.split(';')[0] || 'quality service'

  const templates = {
    email: {
      professional: `Subject: Partner with ${name} — ${cat} leader in ${neighborhood}\n\nDear [Contact],\n\nI'm reaching out from ${name}, a ${rating}-star ${cat} business proudly serving the ${neighborhood} community.\n\nOur clients consistently highlight our ${delights}, and we believe there's a strong opportunity for collaboration.\n\nKey highlights:\n• ${rating}/5.0 average rating across review platforms\n• Established presence in ${neighborhood}\n• Known for: ${delights}\n\nI'd welcome the chance to discuss how we can create value together.\n\nBest regards,\n[Your Name]\n${name}`,
      friendly: `Hey there! 👋\n\nJust wanted to introduce myself — I'm with ${name}, your neighborhood ${cat} spot in ${neighborhood}.\n\nWe've been getting great feedback (${rating} stars!) especially for our ${delights}. Would love to connect and see if there's a way we can work together!\n\nLet me know if you're up for a quick chat.\n\nCheers,\n[Your Name]`,
      persuasive: `Subject: ${name} — Why ${neighborhood}'s top businesses choose us\n\nHere's the thing about working with a ${rating}-star ${cat} business: results speak louder than words.\n\n${name} has built its reputation on ${delights}. Our clients don't just come back — they bring others.\n\nThe opportunity:\n• Tap into our loyal ${neighborhood} customer base\n• Align your brand with a proven local leader\n• Benefit from our ${delights}\n\nLet's talk about what this could look like for you.\n\n[Your Name]\n${name}`,
      urgent: `Subject: Time-sensitive — ${name} partnership opportunity\n\n[Contact],\n\nWe have a limited window to bring on new partners for Q2, and given your position in ${neighborhood}, ${name} could be the right fit.\n\nQuick facts:\n• ${rating}★ rated ${cat} business\n• Strong in: ${delights}\n• Active in ${neighborhood}\n\nCan we connect this week?\n\n[Your Name]`,
    },
    social: {
      professional: `🏢 At ${name}, we're proud to be part of the ${neighborhood} business community.\n\nWith a ${rating}-star reputation in ${cat}, our team is committed to delivering ${delights} every single day.\n\n#${neighborhood.replace(/\s/g, '')} #LocalBusiness #${cat.replace(/\s/g, '')}`,
      friendly: `Love what we do at ${name}! 💛\n\nServing ${neighborhood} with ${delights} — and our ${rating}★ rating shows it!\n\nCome visit us and see what everyone's talking about 🙌\n\n#ShopLocal #${neighborhood.replace(/\s/g, '')}`,
      persuasive: `Looking for a ${rating}-star ${cat} experience in ${neighborhood}?\n\n${name} delivers ${delights} that keep our clients coming back.\n\nDon't take our word for it — check our reviews. ⭐\n\n#${neighborhood.replace(/\s/g, '')} #TopRated`,
      urgent: `🔥 This week only at ${name}!\n\n${neighborhood}'s ${rating}★ ${cat} destination has something special lined up.\n\nKnown for ${delights} — don't miss out!\n\n#LimitedTime #${neighborhood.replace(/\s/g, '')}`,
    },
    blog: {
      professional: `# How ${name} Became ${neighborhood}'s Go-To ${cat} Business\n\n## Introduction\nIn the competitive landscape of ${neighborhood}, standing out takes more than luck. ${name} has earned a ${rating}-star reputation through consistent excellence.\n\n## What Sets Us Apart\n- **Core Strength**: ${delights}\n- **Community Trust**: Active member of the ${neighborhood} business ecosystem\n- **Verified Quality**: ${rating}/5.0 across major review platforms\n\n## Looking Ahead\n[Add forward-looking strategy, expansion plans, or community initiatives]\n\n## Call to Action\nReady to experience the difference? Visit ${name} today.`,
      friendly: `# Meet ${name} — Your Neighborhood ${cat} Friend! 👋\n\nHey ${neighborhood}! Let's talk about what makes ${name} special.\n\nSpoiler: it's the ${delights}. (And our ${rating} stars don't hurt either! ⭐)\n\n## Why Our Customers Love Us\nIt's simple — we treat every person who walks through our door like family.\n\n## Come See For Yourself\nSwing by and say hi!`,
      persuasive: `# ${rating} Stars and Counting: The ${name} Story\n\n## The Challenge\nEvery ${cat} business in ${neighborhood} claims to be the best. ${name} lets the numbers do the talking.\n\n## The Proof\n- ${rating}/5.0 average rating\n- Known for: ${delights}\n- Trusted by the ${neighborhood} community\n\n## The Bottom Line\nWhen quality matters, ${name} delivers.`,
      urgent: `# Why NOW Is the Time to Partner with ${name}\n\n## The Window\n${neighborhood}'s ${cat} market is evolving fast. ${name}'s ${rating}-star track record positions us — and our partners — for what's next.\n\n## Act Now\n- Limited partnership slots for Q2\n- Proven: ${delights}\n- ${neighborhood}'s trust, verified\n\n## Next Steps\nReach out today before spots fill up.`,
    },
    ad: {
      professional: `${name} | ${rating}★ ${cat} in ${neighborhood}\n\nTrusted for ${delights}. Verified reviews. Real results.\n\nLearn more →`,
      friendly: `Love great ${cat}? ${name} has you covered! ${rating}⭐ in ${neighborhood}.\n\nTry us out →`,
      persuasive: `${rating} stars. ${neighborhood}'s top ${cat} choice.\n\n${name}: ${delights} that speaks for itself.\n\nSee why →`,
      urgent: `⚡ ${name} — Limited availability!\n${rating}★ ${cat} · ${neighborhood}\n${delights}\n\nBook now →`,
    },
  }

  return templates[type]?.[tone] || templates[type]?.professional || 'Select a business and content type to generate.'
}

export default function ContentStudioPage() {
  const { rawBusinesses } = useTerminalData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBizId, setSelectedBizId] = useState(() => localStorage.getItem('terminal_my_business') || '')
  const [contentType, setContentType] = useState('email')
  const [tone, setTone] = useState('professional')
  const [output, setOutput] = useState('')
  const [typing, setTyping] = useState(false)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  const selectedBiz = rawBusinesses.find(b => b._id === selectedBizId)

  const filteredBiz = searchQuery
    ? rawBusinesses.filter(b => b.business_name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : []

  const handleGenerate = () => {
    if (!selectedBiz) return
    const full = generateContent(selectedBiz, contentType, tone)
    setOutput('')
    setTyping(true)
    let i = 0
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      i += 3
      if (i >= full.length) {
        setOutput(full)
        setTyping(false)
        clearInterval(timerRef.current)
      } else {
        setOutput(full.slice(0, i))
      }
    }, 10)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contentType}_${selectedBiz?.business_name?.replace(/\s/g, '_') || 'content'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Content Studio</h1>
        <p className="text-slate-400">Generate marketing content for any business</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Business Search */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Business</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Search business..."
                value={selectedBiz ? selectedBiz.business_name : searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedBizId('') }}
                onFocus={() => { if (selectedBiz) { setSearchQuery(selectedBiz.business_name); setSelectedBizId('') } }}
                className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
            </div>
            {filteredBiz.length > 0 && !selectedBizId && (
              <div className="mt-1 bg-slate-800 border border-slate-700/50 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredBiz.map(b => (
                  <button key={b._id} onClick={() => { setSelectedBizId(b._id); setSearchQuery('') }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
                    <span className="block truncate">{b.business_name}</span>
                    <span className="text-[10px] text-slate-600 capitalize">{b.category_primary?.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Type */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Content Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPES.map(ct => {
                const Icon = ct.icon
                return (
                  <button key={ct.id} onClick={() => setContentType(ct.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                      contentType === ct.id
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600'
                    }`}>
                    <Icon size={14} /> {ct.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-all ${
                    tone === t
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={!selectedBiz || typing}
            className="w-full py-2.5 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Sparkles size={16} /> Generate Content
          </button>
        </div>

        {/* Output */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-300">
                  {selectedBiz ? `${contentType} — ${selectedBiz.business_name}` : 'Output'}
                </span>
                {typing && <span className="text-xs text-amber-400 animate-pulse">Generating...</span>}
              </div>
              {output && !typing && (
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors">
                    {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors">
                    <Download size={12} /> Save
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 min-h-[300px]">
              {output ? (
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">{output}
                  {typing && <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse" />}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                  Select a business and click Generate
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
