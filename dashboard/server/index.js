import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'

config() // load .env

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

if (!OPENAI_API_KEY) {
  console.error('⚠  OPENAI_API_KEY not set in .env — server will start but LLM calls will fail')
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(dataContext) {
  const s = dataContext?.stats
  const m = dataContext?.marketAnalytics
  const statsBlock = s ? `
MARKET DATA CONTEXT (live numbers from the database):
- Total businesses: ${s.total?.toLocaleString()}
- Members: ${s.members} (${s.total ? ((s.members / s.total) * 100).toFixed(1) : 0}% penetration)
- Non-members: ${s.nonMembers}
- Unknown status: ${s.unknowns}
- Average rating (rated businesses): ${s.avgRating?.toFixed(2) || 'N/A'}
- Red flags: ${s.redFlagCount} (${s.criticalFlags} critical)
- Categories tracked: ${s.categories?.length || 0}
- Neighborhoods: ${s.neighborhoods?.length || 0}
- Data quality: ${s.dataQuality?.highValidationRate?.toFixed(0) || 0}% high-validation
` : ''

  const analyticsBlock = m ? `
DEEP MARKET ANALYTICS:
- Market Health Score: ${m.marketHealthScore}/100
- Herfindahl Index (market concentration): ${m.hhi} (${m.hhiNormalized < 1500 ? 'diversified' : m.hhiNormalized < 2500 ? 'moderately concentrated' : 'highly concentrated'})
- Rating distribution: p25=${m.ratingPercentiles?.p25?.toFixed(1)}, median=${m.ratingPercentiles?.p50?.toFixed(1)}, p75=${m.ratingPercentiles?.p75?.toFixed(1)}, std=${m.ratingPercentiles?.stdDev?.toFixed(2)}
- Top 5 healthiest categories (CHI): ${m.categoryHealth?.slice(0,5).map(c => `${c.category}(${c.chi})`).join(', ')}
- Top 5 expansion neighborhoods (NOS): ${m.neighborhoodHealth?.slice(0,5).map(n => `${n.neighborhood}(NOS:${n.nos})`).join(', ')}
- Top 3 growth opportunities: ${m.topOpportunities?.slice(0,3).map(o => `${o.neighborhood}×${o.category}(${o.nonMembers} non-members)`).join(', ')}
` : ''

  const entityBlock = dataContext?.entitySummary || ''

  return `You are the Coral Gables Chamber of Commerce AI Business Advisor — an expert strategic intelligence analyst embedded inside a Bloomberg-style business terminal.

ROLE & BEHAVIOR:
- You analyze the Coral Gables business ecosystem (${s?.total?.toLocaleString() || '2,800+'} businesses)
- You are data-driven, concise, and actionable — like a senior consultant briefing a board
- Use specific numbers from the data context when answering
- Format responses with clear structure: use headers (##), bullets, bold for emphasis
- Keep responses focused: 150-300 words unless the user asks for deep analysis
- When you don't have specific data to answer, say so — don't fabricate numbers
- Reference the 4 operational modules when relevant:
  * EDUCATION: Explain metrics, concepts, scoring methodologies step-by-step
  * DIAGNOSIS: Identify issues, assess severity, prescribe action plans
  * GUIDANCE: Prioritized recommendations, quick wins, growth strategies
  * ORGANIZATION: Intel summaries, briefings, compiled reports for stakeholders

INTELLIGENCE FRAMEWORK:
- Information Gain: Rare findings (low P) are more valuable than common ones. Prioritize surprising insights.
- Bayesian Updating: Your confidence in assessments should evolve as the conversation provides new evidence.
- Decision Function: D = Base Knowledge + δ × Exploratory Knowledge. Balance confirmed insights with uncertain-but-valuable exploration.
${statsBlock}${analyticsBlock}${entityBlock}
Always tie your advice back to actionable next steps. You serve the chamber's mission: grow membership, support local businesses, and strengthen the Coral Gables economy.`
}

// ── Chart tool definition (function calling) ──────────────────────────────────
// OpenAI decides WHEN a chart helps. It only returns a tiny JSON instruction
// (~50-100 tokens). The real chart data is built client-side from the live CSV.
const CHART_TOOL = {
  type: 'function',
  function: {
    name: 'generate_charts',
    description: 'Generate one or more data visualizations from the Coral Gables business database. Call this whenever a chart, graph, or visual breakdown would enhance your response — including when the user explicitly asks for one, or when showing proportions/comparisons/distributions would be clearer than text alone.',
    parameters: {
      type: 'object',
      properties: {
        charts: {
          type: 'array',
          description: 'Array of chart specifications to build',
          items: {
            type: 'object',
            properties: {
              type:    { type: 'string', enum: ['pie', 'bar', 'box'], description: 'Chart type: pie for proportions, bar for comparisons/rankings, box for distributions' },
              title:   { type: 'string', description: 'Short descriptive chart title' },
              metric:  { type: 'string', enum: ['membership', 'category', 'neighborhood', 'rating', 'data_quality', 'red_flags', 'recruit_score', 'reviews', 'validation', 'category_health', 'saturation', 'opportunity'], description: 'What to measure. category_health = CHI composite index, saturation = competitive density, opportunity = expansion cross-tab' },
              groupBy: { type: 'string', enum: ['membership_status', 'category', 'neighborhood', 'rating_bucket', 'validation_tier', 'recruit_band'], description: 'How to group the data' },
              filter:  {
                type: 'object',
                description: 'Optional filters to narrow the data',
                properties: {
                  category:     { type: 'string', description: 'Filter to a specific category (use snake_case like food_and_beverage)' },
                  neighborhood: { type: 'string', description: 'Filter to a specific neighborhood' },
                  memberStatus: { type: 'string', enum: ['member', 'non-member', 'unknown'] },
                  minRating:    { type: 'number' },
                  maxRating:    { type: 'number' },
                  hasRedFlag:   { type: 'boolean' },
                },
              },
              limit:  { type: 'number', description: 'Max items to show (default 10)' },
              sortBy: { type: 'string', enum: ['count', 'name', 'value'], description: 'Sort order for ranked charts' },
            },
            required: ['type', 'title', 'metric'],
          },
        },
      },
      required: ['charts'],
    },
  },
}

// ── Chat endpoint ─────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }

  const { messages, dataContext } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const systemPrompt = buildSystemPrompt(dataContext)

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === 'advisor' ? 'assistant' : m.role,
      content: m.text || m.content || '',
    })),
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: apiMessages,
        tools: [CHART_TOOL],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error:', response.status, err)
      return res.status(response.status).json({ error: `OpenAI API error: ${response.status}` })
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const usage = data.usage

    // Extract text content
    let text = choice?.message?.content || ''

    // Extract chart instructions from tool calls (if any)
    let chartInstructions = []
    const toolCalls = choice?.message?.tool_calls
    if (toolCalls?.length > 0) {
      for (const tc of toolCalls) {
        if (tc.function?.name === 'generate_charts') {
          try {
            const args = JSON.parse(tc.function.arguments)
            if (args.charts?.length > 0) {
              chartInstructions.push(...args.charts)
            }
          } catch (e) {
            console.error('Failed to parse chart tool call:', e.message)
          }
        }
      }
    }

    return res.json({ text, chartInstructions, usage })
  } catch (err) {
    console.error('Server error:', err.message)
    return res.status(500).json({ error: 'Failed to reach OpenAI API' })
  }
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: OPENAI_MODEL,
    hasKey: !!OPENAI_API_KEY,
  })
})

const PORT = process.env.API_PORT || 3005
app.listen(PORT, () => {
  console.log(`✓ Terminal API server running on http://localhost:${PORT}`)
  console.log(`  Model: ${OPENAI_MODEL}`)
  console.log(`  API Key: ${OPENAI_API_KEY ? '✓ configured' : '✗ MISSING — set OPENAI_API_KEY in .env'}`)
})
