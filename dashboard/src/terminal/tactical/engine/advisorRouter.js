// ─── Advisor Routing Module ──────────────────────────────────────────────────
// Routes user queries to 4 specialized modules:
//
//   EDUCATION    → Step-by-step metric breakdowns, concept explanations
//   DIAGNOSIS    → Issue identification, severity analysis, action plans
//   GUIDANCE     → Prioritized actionable recommendations, experiments, charts
//   ORGANIZATION → Intel summaries, briefings, compiled reports

export const MODULES = {
  education: {
    id: 'education',
    label: 'Education',
    description: 'Concepts & metrics explained step-by-step',
    icon: 'BookOpen',
    color: 'cyan',
    intents: ['explain'],
  },
  diagnosis: {
    id: 'diagnosis',
    label: 'Diagnosis',
    description: 'Issue identification & severity tracking',
    icon: 'Stethoscope',
    color: 'red',
    intents: ['diagnose', 'track'],
  },
  guidance: {
    id: 'guidance',
    label: 'Guidance',
    description: 'Recommendations, comparisons & experiments',
    icon: 'Target',
    color: 'amber',
    intents: ['recommend', 'compare', 'experiment', 'chart'],
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    description: 'Intel summaries & compiled reports',
    icon: 'FileText',
    color: 'emerald',
    intents: ['summarize'],
  },
}

/**
 * Route an intent to the appropriate module.
 * Falls back to guidance for general/unmatched intents.
 */
export function routeToModule(intent) {
  for (const mod of Object.values(MODULES)) {
    if (mod.intents.includes(intent)) return mod
  }
  return MODULES.guidance
}
