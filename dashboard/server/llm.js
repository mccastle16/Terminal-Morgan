// ─── Multi-provider LLM adapter ──────────────────────────────────────────────
// One place that knows how to talk to OpenAI (ChatGPT), Google Gemini, and
// Perplexity. Each adapter takes a normalized { systemPrompt, messages, tool }
// and returns { text, chartInstructions, usage }. The /api/chat route stays
// provider-agnostic — it just picks a provider by name.
//
// Notes on capabilities:
//  • OpenAI + Gemini support function calling → they can drive chart generation.
//  • Perplexity's chat API has no function calling, so charts are skipped for it
//    (text-only, but web-search augmented).
//
// Env vars are read lazily (inside functions) because dotenv is configured
// AFTER this module is imported in index.js.

export class ProviderError extends Error {
  constructor(provider, status, detail) {
    super(`${provider} API error (${status})`)
    this.name = 'ProviderError'
    this.provider = provider
    this.status = status
    this.detail = detail
  }
}

const safeParse = (s) => { try { return JSON.parse(s) } catch { return null } }

// ── Provider registry ────────────────────────────────────────────────────────
const REGISTRY = {
  openai: {
    label: 'OpenAI',
    keyVar: 'OPENAI_API_KEY',
    modelVars: ['OPENAI_MODEL', 'AGENT4_MODEL'],
    defaultModel: 'gpt-4o-mini',
    supportsTools: true,
    call: callOpenAI,
  },
  gemini: {
    label: 'Gemini',
    keyVar: 'GEMINI_API_KEY',
    modelVars: ['GEMINI_MODEL'],
    defaultModel: 'gemini-2.5-flash',
    supportsTools: true,
    call: callGemini,
  },
  perplexity: {
    label: 'Perplexity',
    keyVar: 'PERPLEXITY_API_KEY',
    modelVars: ['PERPLEXITY_MODEL'],
    defaultModel: 'sonar',
    supportsTools: false,
    call: callPerplexity,
  },
}

const resolveModel = (entry) => {
  for (const v of entry.modelVars) if (process.env[v]) return process.env[v]
  return entry.defaultModel
}

// Public: which providers exist and whether their key is configured.
export function getProviders() {
  return Object.entries(REGISTRY).map(([id, e]) => ({
    id,
    label: e.label,
    model: resolveModel(e),
    available: !!process.env[e.keyVar],
    supportsTools: e.supportsTools,
  }))
}

// First provider that actually has a key, so /api/chat works with no explicit
// selection. Preference order follows the registry declaration order.
export function defaultProvider() {
  return getProviders().find((p) => p.available)?.id || 'openai'
}

// Public: dispatch a chat completion to the chosen provider.
export async function callLLM({ provider, systemPrompt, messages, tool }) {
  const id = REGISTRY[provider] ? provider : defaultProvider()
  const entry = REGISTRY[id]
  const apiKey = process.env[entry.keyVar]
  if (!apiKey) throw new ProviderError(id, 401, `No API key configured (${entry.keyVar})`)
  const model = resolveModel(entry)
  const result = await entry.call({
    apiKey,
    model,
    systemPrompt,
    messages,
    tool: entry.supportsTools ? tool : null,
  })
  return { ...result, provider: id, model }
}

// ── OpenAI (ChatGPT) ─────────────────────────────────────────────────────────
async function callOpenAI({ apiKey, model, systemPrompt, messages, tool }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      ...(tool ? { tools: [tool], tool_choice: 'auto' } : {}),
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new ProviderError('openai', res.status, await res.text())
  const data = await res.json()
  const choice = data.choices?.[0]
  const chartInstructions = []
  for (const tc of choice?.message?.tool_calls || []) {
    if (tc.function?.name === 'generate_charts') {
      const args = safeParse(tc.function.arguments)
      if (args?.charts?.length) chartInstructions.push(...args.charts)
    }
  }
  return { text: choice?.message?.content || '', chartInstructions, usage: data.usage }
}

// ── Google Gemini ────────────────────────────────────────────────────────────
async function callGemini({ apiKey, model, systemPrompt, messages, tool }) {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  }
  if (tool) {
    body.tools = [{
      functionDeclarations: [{
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      }],
    }]
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ProviderError('gemini', res.status, await res.text())
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  let text = ''
  const chartInstructions = []
  for (const p of parts) {
    if (p.text) text += p.text
    if (p.functionCall?.name === 'generate_charts' && p.functionCall.args?.charts?.length) {
      chartInstructions.push(...p.functionCall.args.charts)
    }
  }
  return { text, chartInstructions, usage: data.usageMetadata }
}

// ── Perplexity (OpenAI-compatible chat, no tools) ────────────────────────────
async function callPerplexity({ apiKey, model, systemPrompt, messages }) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) throw new ProviderError('perplexity', res.status, await res.text())
  const data = await res.json()
  return { text: data.choices?.[0]?.message?.content || '', chartInstructions: [], usage: data.usage }
}
