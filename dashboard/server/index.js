import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { getBusinesses, getGraph, getGraphStats, verifyConnectivity } from './neo4j.js'
import { getAnalyticsQueries } from './analytics.js'
import { getOpportunities } from './opportunities.js'
import { getNetworkCentrality } from './centrality.js'
import { getSentimentThemes } from './sentiment.js'
import { getPredictionSummary } from './predictions.js'
import { callLLM, getProviders, defaultProvider } from './llm.js'
import {
  findUserByEmail, verifyPassword, signToken, sanitizeUser,
  getApprovedBusiness, authMiddleware, requireAdmin,
  createUser, listUsers, createClaim, listClaims, approveClaim,
} from './auth.js'

// Load the repo-root .env (where the OPENAI/GEMINI/PERPLEXITY/NEO4J keys live),
// then the server-local .env for overrides like API_PORT. dotenv does not
// clobber already-set vars, so root values win. Resolved from this file's path
// so it works regardless of the process cwd.
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })
config({ path: resolve(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Renders a "who am I talking to" block from the authenticated user + their
// approved business (if any). Derived server-side from the JWT — never trust the
// client for this. Empty for admins/staff who represent no single business.
function buildUserContext(user, business) {
  if (!user) return ''
  let block = `\nUSER CONTEXT (who you are advising):\n- Role: ${user.role}\n- Name: ${user.name || 'N/A'}`
  if (business) {
    const rating = business.rating ? `${Number(business.rating).toFixed(1)}★` : 'unrated'
    const member = business.chamber_member === true || business.chamber_member === 'Y' ? 'member' : 'non-member'
    block += `
- This user represents their own business: "${business.name}"
  * Category: ${business.category_primary || 'N/A'} | Neighborhood: ${business.neighborhood || 'N/A'}
  * Rating: ${rating} (${business.review_count || 0} reviews) | Membership: ${member}
  * Red flags: ${business.red_flag_present === true || business.red_flag_present === 'Y' ? `YES (${business.red_flag_severity || 'unspecified'})` : 'none'}
When the user says "my business", "us", or "we", they mean this business. Tailor advice to it directly.`
  } else {
    block += `\n- Not linked to a specific business — answer at the market/chamber level.`
  }
  return block + '\n'
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(dataContext, userContext = '') {
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
- Price tier coverage: ${m.priceCoverage || 100}% | Distribution: ${m.priceTierDist?.map(t => `${t.tier}:${t.count}`).join(', ') || 'N/A'}
` : ''

  const p = dataContext?.predictions
  const predictionBlock = p ? `
PREDICTIVE INTELLIGENCE:
- Average membership probability: ${p.avg_membership_probability}%
- Growth trajectory: ${p.avg_growth_trajectory > 0 ? '+' : ''}${p.avg_growth_trajectory} avg
- Churn risk: ${p.churn_risk_high} high / ${p.churn_risk_medium} medium (of ${p.members_count} members)
- High-potential recruits: ${p.high_potential_recruits}
- Top growth categories: ${p.category_predictions?.slice(0,3).map(c => `${c.category}(GT:${c.avg_growth_trajectory > 0 ? '+' : ''}${c.avg_growth_trajectory})`).join(', ')}
- Declining categories: ${p.category_predictions?.slice(-2).map(c => `${c.category}(GT:${c.avg_growth_trajectory})`).join(', ')}
` : ''

  const sent = dataContext?.sentiment
  const sentimentBlock = sent ? `
SENTIMENT INTELLIGENCE:
- Market sentiment: ${sent.positive_pct || 0}% positive, ${sent.negative_pct || 0}% negative
- Top delight themes: ${Object.keys(sent.delight_themes || {}).slice(0,3).join(', ') || 'N/A'}
- Top pain themes: ${Object.keys(sent.pain_themes || {}).slice(0,3).join(', ') || 'N/A'}
` : ''

  const net = dataContext?.network
  const networkBlock = net ? `
NETWORK INTELLIGENCE:
- Communities: ${net.num_communities} detected clusters
- Top influencer: ${net.top_influencers?.[0]?.name || 'N/A'} (score: ${net.top_influencers?.[0]?.influence_score || 0})
- Key bridge node: ${net.bridge_nodes?.[0]?.name || 'N/A'} (betweenness: ${net.bridge_nodes?.[0]?.betweenness || 0})
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
${statsBlock}${analyticsBlock}${predictionBlock}${sentimentBlock}${networkBlock}${entityBlock}${userContext}
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
              metric:  { type: 'string', enum: ['membership', 'category', 'neighborhood', 'rating', 'data_quality', 'red_flags', 'recruit_score', 'reviews', 'validation', 'category_health', 'saturation', 'opportunity', 'sentiment', 'predictions', 'network_influence', 'price_tier'], description: 'What to measure. category_health = CHI composite index, saturation = competitive density, opportunity = expansion cross-tab, sentiment = composite sentiment scores, predictions = membership probability / growth trajectory, network_influence = PageRank / centrality, price_tier = pricing distribution' },
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
// Provider-agnostic: picks OpenAI / Gemini / Perplexity via req.body.provider
// (falls back to the first provider with a configured key). All the API-specific
// wiring lives in llm.js.
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { messages, dataContext, provider } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  // Personalize the advisor from the authenticated identity (never the client):
  // pull the user's approved business, if any, and fold it into the prompt.
  let userContext = ''
  try {
    const business = await getApprovedBusiness(req.user.email)
    userContext = buildUserContext(req.user, business)
  } catch (e) {
    console.error('user-context build failed:', e.message)
  }

  const chosen = provider || defaultProvider()
  const systemPrompt = buildSystemPrompt(dataContext, userContext)
  const chatMessages = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text || m.content || '',
  }))

  try {
    const { text, chartInstructions, usage, model } = await callLLM({
      provider: chosen,
      systemPrompt,
      messages: chatMessages,
      tool: CHART_TOOL,
    })
    return res.json({ text, chartInstructions, usage, provider: chosen, model })
  } catch (err) {
    const status = err.status || 500
    console.error(`LLM error [${chosen}]:`, status, err.detail || err.message)
    return res.status(status).json({ error: err.message, provider: chosen })
  }
})

// ── Authentication ──────────────────────────────────────────────────────────
// Login is public; it returns a JWT the client sends on every other /api call.
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  try {
    const user = await findUserByEmail(email)
    if (!user || user.status === 'disabled' || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const business = await getApprovedBusiness(user.email)
    const token = signToken(user)
    res.json({ token, user: { ...sanitizeUser(user), businessId: business?.business_id || null } })
  } catch (err) {
    console.error('/api/login error:', err.message)
    res.status(503).json({ error: 'Login unavailable (database down?)' })
  }
})

// Rehydrate the session from a token (client bootstrap on page load).
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email)
    if (!user) return res.status(401).json({ error: 'User no longer exists' })
    const business = await getApprovedBusiness(user.email)
    res.json({ user: { ...sanitizeUser(user), businessId: business?.business_id || null } })
  } catch (err) {
    res.status(503).json({ error: 'Session check unavailable', detail: err.message })
  }
})

// ── Admin: user + business-claim management ──────────────────────────────────
// Only admins create users or approve claims. Members/other roles cannot claim
// their own business — an admin does it on their behalf.
app.get('/api/users', authMiddleware, requireAdmin, async (req, res) => {
  try { res.json({ users: await listUsers() }) }
  catch (err) { res.status(503).json({ error: 'Neo4j unavailable', detail: err.message }) }
})

app.post('/api/users', authMiddleware, requireAdmin, async (req, res) => {
  const { email, password, name, title, role } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password required' })
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
  try { res.status(201).json({ user: await createUser({ email, password, name, title, role }) }) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/claims', authMiddleware, requireAdmin, async (req, res) => {
  try { res.json({ claims: await listClaims(req.query.status || null) }) }
  catch (err) { res.status(503).json({ error: 'Neo4j unavailable', detail: err.message }) }
})

app.post('/api/claims', authMiddleware, requireAdmin, async (req, res) => {
  const { email, businessId } = req.body || {}
  if (!email || !businessId) return res.status(400).json({ error: 'email and businessId required' })
  try { res.status(201).json({ claim: await createClaim({ email, businessId }) }) }
  catch (err) { res.status(400).json({ error: err.message }) }
})

app.post('/api/claims/approve', authMiddleware, requireAdmin, async (req, res) => {
  const { email, businessId } = req.body || {}
  if (!email || !businessId) return res.status(400).json({ error: 'email and businessId required' })
  try { res.json({ claim: await approveClaim({ email, businessId, approvedBy: req.user.email }) }) }
  catch (err) { res.status(400).json({ error: err.message }) }
})

// ── Live Neo4j data endpoints ───────────────────────────────────────────────
// Serve the same shapes the dashboard used to read from static exports. All
// require a valid session — the graph is not public. 503 when Neo4j is down.

app.get('/api/live-status', authMiddleware, async (req, res) => {
  try {
    await verifyConnectivity()
    res.json({ live: true, uri: process.env.NEO4J_URI || 'bolt://localhost:7687' })
  } catch (err) {
    res.json({ live: false, error: err.message })
  }
})

app.get('/api/businesses', authMiddleware, async (req, res) => {
  try {
    const businesses = await getBusinesses()
    res.json({ businesses, source: 'neo4j', count: businesses.length })
  } catch (err) {
    console.error('Neo4j /api/businesses error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/graph', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 0
    res.json(await getGraph(limit))
  } catch (err) {
    console.error('Neo4j /api/graph error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/graph-stats', authMiddleware, async (req, res) => {
  try {
    res.json(await getGraphStats())
  } catch (err) {
    console.error('Neo4j /api/graph-stats error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/analytics-queries', authMiddleware, async (req, res) => {
  try {
    res.json(await getAnalyticsQueries())
  } catch (err) {
    console.error('Neo4j /api/analytics-queries error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/opportunities', authMiddleware, async (req, res) => {
  try {
    res.json(await getOpportunities())
  } catch (err) {
    console.error('Neo4j /api/opportunities error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/network-centrality', authMiddleware, async (req, res) => {
  try {
    res.json(await getNetworkCentrality())
  } catch (err) {
    console.error('Neo4j /api/network-centrality error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/sentiment-themes', authMiddleware, async (req, res) => {
  try {
    res.json(await getSentimentThemes())
  } catch (err) {
    console.error('Neo4j /api/sentiment-themes error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

app.get('/api/prediction-summary', authMiddleware, async (req, res) => {
  try {
    res.json(await getPredictionSummary())
  } catch (err) {
    console.error('Neo4j /api/prediction-summary error:', err.message)
    res.status(503).json({ error: 'Neo4j unavailable', detail: err.message })
  }
})

// ── LLM providers ─────────────────────────────────────────────────────────────
app.get('/api/providers', (req, res) => {
  res.json({ providers: getProviders(), default: defaultProvider() })
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const providers = getProviders()
  const active = providers.find(p => p.id === defaultProvider())
  res.json({
    status: 'ok',
    provider: active?.id || null,
    model: active?.model || null,
    hasKey: providers.some(p => p.available),
    providers,
  })
})

const PORT = process.env.API_PORT || 3005
app.listen(PORT, () => {
  console.log(`✓ Terminal API server running on http://localhost:${PORT}`)
  const providers = getProviders()
  const configured = providers.filter(p => p.available)
  console.log(`  LLM providers: ${configured.length ? configured.map(p => `${p.label} (${p.model})`).join(', ') : '✗ NONE — set OPENAI_API_KEY / GEMINI_API_KEY / PERPLEXITY_API_KEY'}`)
  if (configured.length) console.log(`  Default: ${defaultProvider()}`)
})
