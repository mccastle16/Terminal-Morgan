import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import {
  Wand2,
  Copy,
  Check,
  FileText,
  Mail,
  MessageSquare,
  Megaphone,
  ChevronDown,
  Sparkles,
  Send,
  ExternalLink,
  RefreshCw,
  Download,
  Linkedin,
  Twitter,
  Facebook,
} from 'lucide-react'
import clsx from 'clsx'

const CONTENT_TYPES = [
  { id: 'email', label: 'Email Outreach', icon: Mail, description: 'Personalized email based on pain points' },
  { id: 'social', label: 'Social Media Post', icon: MessageSquare, description: 'Engaging social content' },
  { id: 'blog', label: 'Blog Article', icon: FileText, description: 'In-depth content piece' },
  { id: 'ad', label: 'Ad Copy', icon: Megaphone, description: 'Compelling advertisement' },
]

const TONE_OPTIONS = ['Professional', 'Friendly', 'Persuasive', 'Educational', 'Urgent']
const LENGTH_OPTIONS = ['Short', 'Medium', 'Long']

export default function ContentStudioPage() {
  const [searchParams] = useSearchParams()
  const { businesses } = useData()

  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [contentType, setContentType] = useState('email')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('Medium')
  const [focusArea, setFocusArea] = useState('pain_points')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Check for business param from URL
  useEffect(() => {
    const businessId = searchParams.get('business')
    if (businessId) {
      const business = businesses.find(b => b.id === businessId || b.business_id === businessId)
      if (business) {
        setSelectedBusiness(business)
      }
    }
  }, [searchParams, businesses])

  const generateContent = async () => {
    if (!selectedBusiness) return

    setIsGenerating(true)
    setGeneratedContent('')

    // Simulate AI generation with typed effect
    await new Promise(resolve => setTimeout(resolve, 500))

    const content = generateContentTemplate(selectedBusiness, contentType, tone, length, focusArea)

    // Type out the content
    let currentContent = ''
    const words = content.split(' ')

    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? ' ' : '') + words[i]
      setGeneratedContent(currentContent)
      await new Promise(resolve => setTimeout(resolve, 30))
    }

    setIsGenerating(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadContent = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedBusiness?.business_name || 'content'}_${contentType}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
          Content Studio
        </h1>
        <p className="text-gray-500 mt-1">
          Generate targeted content based on business insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Business selector */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Select Business</h3>
            <div className="relative">
              <select
                value={selectedBusiness?.id || ''}
                onChange={(e) => {
                  const business = businesses.find(b => b.id === e.target.value)
                  setSelectedBusiness(business || null)
                }}
                className="input-field pr-10 text-sm"
              >
                <option value="">Choose a business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {selectedBusiness && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{selectedBusiness.business_name}</span>
                  <Link
                    to={`/businesses/${selectedBusiness.id}`}
                    className="text-cgcc-gold hover:text-cgcc-navy"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedBusiness.category_primary}</p>
              </div>
            )}
          </div>

          {/* Content type */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Content Type</h3>
            <div className="space-y-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    contentType === type.id
                      ? 'border-cgcc-gold bg-cgcc-gold/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    contentType === type.id ? 'bg-cgcc-gold text-white' : 'bg-gray-100 text-gray-500'
                  )}>
                    <type.icon size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Focus Area</label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="pain_points">Pain Points</option>
                  <option value="delights">Strengths & Delights</option>
                  <option value="risks">Risk Mitigation</option>
                  <option value="actions">Recommended Actions</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={clsx(
                        'px-3 py-1.5 text-sm rounded-full transition-colors',
                        tone === t
                          ? 'bg-cgcc-navy text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Length</label>
                <div className="flex gap-2">
                  {LENGTH_OPTIONS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLength(l)}
                      className={clsx(
                        'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
                        length === l
                          ? 'bg-cgcc-gold text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateContent}
            disabled={!selectedBusiness || isGenerating}
            className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generate Content
              </>
            )}
          </button>
        </div>

        {/* Output panel */}
        <div className="lg:col-span-2">
          <div className="card h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-cgcc-gold" />
                Generated Content
              </h3>

              {generatedContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-cgcc-navy hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadContent}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-cgcc-navy hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gray-50 rounded-lg p-6 overflow-auto">
              {!generatedContent && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">No content generated yet</p>
                  <p className="text-sm text-gray-400">
                    Select a business and click "Generate Content" to get started
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                    {generatedContent}
                    {isGenerating && <span className="animate-pulse">|</span>}
                  </pre>
                </div>
              )}
            </div>

            {/* Share options */}
            {generatedContent && !isGenerating && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-3">Share or export:</p>
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#0077b5] text-white rounded-lg hover:bg-[#006699] transition-colors">
                    <Linkedin size={16} />
                    LinkedIn
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1da1f2] text-white rounded-lg hover:bg-[#1a91da] transition-colors">
                    <Twitter size={16} />
                    Twitter
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white rounded-lg hover:bg-[#166fe5] transition-colors">
                    <Facebook size={16} />
                    Facebook
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    <Mail size={16} />
                    Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Content generation templates
function generateContentTemplate(business, contentType, tone, length, focusArea) {
  const businessName = business.business_name || 'Your Business'
  const category = business.category_primary || 'business'
  const painPoints = business.top_pain_points || 'operational challenges'
  const delights = business.top_delights || 'excellent service'
  const risks = business.pkp_primary_risks || 'market competition'
  const actions = business.pkp_primary_actions || 'strategic improvements'

  const focusContent = {
    pain_points: painPoints,
    delights: delights,
    risks: risks,
    actions: actions,
  }[focusArea]

  const toneAdjectives = {
    Professional: 'strategic',
    Friendly: 'helpful',
    Persuasive: 'compelling',
    Educational: 'informative',
    Urgent: 'critical',
  }[tone]

  const templates = {
    email: `Subject: ${toneAdjectives.charAt(0).toUpperCase() + toneAdjectives.slice(1)} Solutions for ${businessName}

Dear ${business.contact_name || 'Business Owner'},

I hope this message finds you well. I recently came across ${businessName} and was impressed by your work in the ${category} sector.

After reviewing your business profile, I noticed some areas where we might be able to provide ${toneAdjectives} support:

${focusContent}

Based on our analysis, here are some key insights:
- Your current strengths: ${delights}
- Areas for potential improvement: ${painPoints}
- Recommended next steps: ${actions}

I would love to schedule a brief call to discuss how we can help ${businessName} achieve its goals while addressing these ${toneAdjectives} priorities.

Would you be available for a 15-minute conversation this week?

Best regards,
[Your Name]
[Your Title]
[Contact Information]`,

    social: `🎯 Spotlight: ${businessName}

We recently analyzed the ${category} landscape in Coral Gables and discovered some fascinating insights about what makes businesses like ${businessName} successful.

Key findings:
✅ ${delights}

Areas the industry is focusing on:
📊 ${focusContent}

What strategies is your business implementing to stay ahead?

#CoralGables #BusinessInsights #${category.replace(/\s+/g, '')} #CGCC`,

    blog: `# Understanding Success in ${category.charAt(0).toUpperCase() + category.slice(1)}: A Case Study

## Introduction

In today's competitive business landscape, understanding what drives success is more important than ever. ${businessName}, a prominent player in the ${category} sector of Coral Gables, offers valuable insights into industry best practices.

## Key Strengths

Our analysis revealed several factors contributing to their positive reputation:

${delights}

## Industry Challenges

Like many businesses in this sector, ${businessName} faces common challenges:

${painPoints}

## Strategic Recommendations

Based on our comprehensive analysis, we've identified several ${toneAdjectives} actions:

${actions}

## Risk Considerations

Every business should be aware of potential risks:

${risks}

## Conclusion

${businessName} exemplifies the dedication and strategic thinking required to succeed in the ${category} industry. By focusing on their strengths while addressing key challenges, they continue to serve the Coral Gables community effectively.

---
*This analysis is part of our ongoing business intelligence series for CGCC members.*`,

    ad: `🏆 ${businessName} - Excellence in ${category.charAt(0).toUpperCase() + category.slice(1)}

${delights}

Ready to experience the difference?

📞 ${business.phone || 'Contact us today'}
🌐 ${business.website || 'Visit our website'}
📍 ${business.neighborhood_area || 'Coral Gables'}

${tone === 'Urgent' ? '⏰ Limited availability - Act now!' : '✨ Proud member of the Coral Gables Chamber of Commerce'}

#${category.replace(/\s+/g, '')} #CoralGables #LocalBusiness`,
  }

  let content = templates[contentType] || templates.email

  // Adjust length
  if (length === 'Short') {
    const lines = content.split('\n')
    content = lines.slice(0, Math.ceil(lines.length * 0.5)).join('\n')
  } else if (length === 'Long') {
    content += `\n\n---\n\nAdditional Context:\n\nOur comprehensive analysis of ${businessName} includes data from multiple sources, ensuring accurate and actionable insights. The ${category} sector in Coral Gables continues to evolve, and staying informed about market trends is essential for sustained success.\n\nFor more detailed analytics and personalized recommendations, please reach out to our business intelligence team.`
  }

  return content
}
