// ─── OpenAI API Client ───────────────────────────────────────────────────────
// Calls the Express proxy at /api/chat. Falls back gracefully if server is down.

/**
 * Build a lightweight data context blob for the system prompt.
 * Keeps token count low by sending only aggregates, not raw rows.
 */
export function buildDataContext(stats, entities, rawBusinesses, marketAnalytics) {
  const ctx = { stats: null, entitySummary: '', marketAnalytics: null }

  if (stats) {
    ctx.stats = {
      total: stats.total,
      members: stats.members,
      nonMembers: stats.nonMembers,
      unknowns: stats.unknowns,
      avgRating: stats.avgRating,
      redFlagCount: stats.redFlagCount,
      criticalFlags: stats.criticalFlags,
      categories: stats.categories,
      neighborhoods: stats.neighborhoods,
      dataQuality: stats.dataQuality,
      membershipKnownRate: stats.membershipKnownRate,
    }
  }

  // Summarize mentioned entities so the LLM has specific context
  if (entities?.businesses?.length > 0) {
    const lines = entities.businesses.slice(0, 3).map(b => {
      const parts = [
        b.business_name,
        b.category_primary?.replace(/_/g, ' '),
        b.neighborhood_area,
        b._rating > 0 ? `${b._rating.toFixed(1)}★ (${b._reviewCount} reviews)` : 'no rating',
        `member: ${b._memberStatus}`,
        b._hasWebsite ? 'has website' : 'no website',
        b._hasRedFlag ? `RED FLAGS: ${[b.red_flag_1, b.red_flag_2, b.red_flag_3].filter(Boolean).join(', ')}` : 'no flags',
        `validation tier ${b._validationTier}`,
        b._memberStatus !== 'member' ? `recruit score: ${b._recruitScore || 'N/A'}` : null,
      ].filter(Boolean)
      return `- ${parts.join(' | ')}`
    })
    ctx.entitySummary = `\nBUSINESSES MENTIONED IN THIS MESSAGE:\n${lines.join('\n')}\n`
  }

  if (entities?.categories?.length > 0) {
    const catLines = entities.categories.slice(0, 5).map(cat => {
      const data = stats?.categoryPenetration?.find(c => c.category === cat)
      return data
        ? `- ${cat.replace(/_/g, ' ')}: ${data.total} businesses, ${data.members} members (${data.penetration.toFixed(0)}% penetration), ${data.unknowns} unknown`
        : `- ${cat.replace(/_/g, ' ')}`
    })
    ctx.entitySummary += `\nCATEGORIES MENTIONED:\n${catLines.join('\n')}\n`
  }

  if (entities?.neighborhoods?.length > 0) {
    const hoodLines = entities.neighborhoods.slice(0, 5).map(hood => {
      const data = stats?.neighborhoodPenetration?.find(h => h.neighborhood === hood)
      return data
        ? `- ${hood}: ${data.total} businesses, ${data.members} members (${data.penetration.toFixed(0)}% penetration)`
        : `- ${hood}`
    })
    ctx.entitySummary += `\nNEIGHBORHOODS MENTIONED:\n${hoodLines.join('\n')}\n`
  }

  // Pass deep analytics to enrich LLM's system prompt
  if (marketAnalytics) {
    ctx.marketAnalytics = {
      marketHealthScore: marketAnalytics.marketHealthScore,
      hhi: marketAnalytics.hhi,
      hhiNormalized: marketAnalytics.hhiNormalized,
      ratingPercentiles: marketAnalytics.ratingPercentiles,
      categoryHealth: marketAnalytics.categoryHealth?.slice(0, 10),
      neighborhoodHealth: marketAnalytics.neighborhoodHealth?.slice(0, 10),
      topOpportunities: marketAnalytics.topOpportunities?.slice(0, 5),
    }
  }

  return ctx
}

/**
 * Call the OpenAI proxy server.
 * Returns { text, chartInstructions, usage } on success, or { error } on failure.
 * chartInstructions is an array of lightweight chart specs from function calling —
 * the LLM decides WHAT to chart, the client builds real data.
 */
export async function callOpenAI(messages, dataContext) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, dataContext }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error || `Server error ${res.status}` }
    }

    const data = await res.json()
    return {
      text: data.text || '',
      chartInstructions: data.chartInstructions || [],
      usage: data.usage,
    }
  } catch (err) {
    return { error: 'Cannot reach AI server — is it running? (cd server && npm start)' }
  }
}

/**
 * Check if the API server is available.
 */
export async function checkAPIHealth() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return { available: false }
    const data = await res.json()
    return { available: data.hasKey, model: data.model }
  } catch {
    return { available: false }
  }
}
