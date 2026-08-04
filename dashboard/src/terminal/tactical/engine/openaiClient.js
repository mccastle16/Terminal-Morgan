// ─── OpenAI API Client ───────────────────────────────────────────────────────
// Calls the Express proxy at /api/chat. Falls back gracefully if server is down.
// /api/chat requires an authenticated session, so requests go through apiFetch
// (injects the Bearer token). The server personalizes the advisor from that
// identity — the user's own business context is added server-side, not here.

import { apiFetch } from '../../lib/api'

/**
 * Build a lightweight data context blob for the system prompt.
 * Keeps token count low by sending only aggregates, not raw rows.
 */
export function buildDataContext(stats, entities, rawBusinesses, marketAnalytics, sentimentData, centralityData, predictionData) {
  const ctx = { stats: null, entitySummary: '', marketAnalytics: null, sentiment: null, network: null, predictions: null }

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
      priceTierDist: marketAnalytics.priceTierDist,
      priceCoverage: marketAnalytics.priceCoverage,
    }
  }

  // Sentiment summary (keep token count low)
  if (sentimentData) {
    const dist = sentimentData.sentiment_distribution || {}
    const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1
    ctx.sentiment = {
      positive_pct: Math.round(((dist.very_positive || 0) + (dist.positive || 0)) / total * 100),
      negative_pct: Math.round((dist.negative || 0) / total * 100),
      delight_themes: sentimentData.delight_themes || {},
      pain_themes: sentimentData.pain_themes || {},
    }
  }

  // Network centrality summary
  if (centralityData) {
    ctx.network = {
      num_communities: centralityData.community_sizes?.length || 0,
      top_influencers: centralityData.top_influencers?.slice(0, 3),
      bridge_nodes: centralityData.bridge_nodes?.slice(0, 3),
    }
  }

  // Prediction summary
  if (predictionData) {
    ctx.predictions = {
      avg_membership_probability: predictionData.avg_membership_probability,
      avg_growth_trajectory: predictionData.avg_growth_trajectory,
      churn_risk_high: predictionData.churn_risk_high,
      churn_risk_medium: predictionData.churn_risk_medium,
      members_count: predictionData.members_count,
      high_potential_recruits: predictionData.high_potential_recruits,
      category_predictions: predictionData.category_predictions?.slice(0, 5),
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
export async function callOpenAI(messages, dataContext, provider) {
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, dataContext, provider }),
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
    return {
      available: data.hasKey,
      model: data.model,
      provider: data.provider,
      // Only providers with a configured key are selectable in the UI.
      providers: (data.providers || []).filter(p => p.available),
    }
  } catch {
    return { available: false }
  }
}
