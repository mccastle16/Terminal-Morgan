// ── Live opportunity analysis ───────────────────────────────────────────────
// Ports Phase 1 of scripts/21. opportunity_analyzer.py to compute category gaps
// and neighborhood deserts live from Neo4j business counts, then merges them
// with the curated business concepts + benchmark constants (which are authored
// inputs, not graph data). Returns the exact shape the Opportunities page read
// from public/data/opportunities.json.

import { getDriver } from './neo4j.js'

// ── Coral Gables context constants (from the analyzer) ───────────────────────
const CG_POPULATION = 50_000
const CG_MEDIAN_INCOME = 134_216

// National benchmarks: businesses per 1,000 residents (BLS/Census/SBA).
const NATIONAL_BENCHMARKS = {
  food_beverage: 15.0, retail: 12.0, healthcare: 8.0, professional_services: 6.0,
  personal_services: 5.0, real_estate: 5.0, financial_services: 4.0, construction: 4.0,
  technology: 3.5, education: 3.0, hospitality: 3.0, wellness: 3.0, automotive: 2.5,
  consulting: 2.0, insurance: 2.0, arts_culture: 1.5, marketing: 1.5, transportation: 1.5,
  media_entertainment: 1.0,
}

// Essential categories used to flag neighborhood "deserts".
const ESSENTIAL_CATS = ['food_beverage', 'retail', 'healthcare', 'professional_services', 'wellness']

// Curated business concepts: [name, category, neighborhood, rationale, demand].
const CURATED_OPPORTUNITIES = [
  ['Tech Coworking / Innovation Hub', 'technology', 'Miracle Mile', 'CG has 44 tech firms vs 175 benchmark. High-income professionals need shared workspace. Miracle Mile foot traffic ideal.', 'high'],
  ['Managed IT Services Provider', 'technology', 'Ponce de Leon Corridor', '2,730 businesses but minimal local IT support. The Ponce office district is ripe for B2B tech services.', 'high'],
  ['App Development Studio', 'technology', 'Douglas Road Corridor', 'Affluent market, UM talent pipeline, but no local dev shops. Adjacent to Brickell tech corridor.', 'medium'],
  ['Cybersecurity Consulting Firm', 'technology', 'Alhambra Circle', "Banking/financial cluster on Alhambra needs specialized security. CG's 52 banks + 61 financial firms are the target market.", 'high'],
  ['Smart Home / IoT Integrator', 'technology', 'Bird Road Corridor', 'High-income residential + real estate market but zero smart home specialists in CG.', 'medium'],
  ['Specialty Coffee Roastery', 'food_beverage', 'Miracle Mile', "CG's café scene is growing but lacks a locally-roasted brand. Foot traffic + UM students = steady demand.", 'high'],
  ['Farm-to-Table Meal Prep / Ghost Kitchen', 'food_beverage', 'Bird Road Corridor', 'Health-conscious demographic ($134K median income) but limited healthy prepared food options.', 'medium'],
  ['Latin Fusion Bakery', 'food_beverage', 'Sunset / South Gables', "CG's Latin heritage + growing foodie scene. South Gables underserved with only 39 F&B businesses.", 'high'],
  ['Craft Cocktail Bar / Speakeasy', 'food_beverage', 'Giralda Plaza', "Giralda is CG's experiential dining district but has only 2 F&B businesses in database.", 'high'],
  ['Organic Grocery / Market', 'food_beverage', 'University of Miami Area', '96 businesses near UM but only 14 F&B — students and faculty need grocery/market options.', 'medium'],
  ['Boutique Pet Supply Store', 'retail', 'Miracle Mile', 'High-income area with many pet owners but zero pet retail in the database. National trend: pet spending up 12% YoY.', 'high'],
  ['Sustainable / Eco Fashion Boutique', 'retail', 'Merrick Park', "Merrick Park is CG's luxury retail zone but only 5 businesses listed. Sustainable luxury trending.", 'medium'],
  ['Home Décor / Interior Design Retail', 'retail', 'Coral Gables', '$134K median income + active real estate market but limited home retail. Natural complement to 71 RE firms.', 'medium'],
  ['Cycling / Outdoor Sports Shop', 'retail', 'Bird Road Corridor', 'Active outdoor community, popular cycling routes, but no dedicated bike/outdoor shop in CG.', 'medium'],
  ["Children's Boutique / Toy Store", 'retail', 'Sunset / South Gables', 'Family-oriented neighborhood (184 businesses, 31 education) but no children\'s retail.', 'medium'],
  ['Business Formation / Startup Accelerator', 'professional_services', 'Ponce de Leon Corridor', 'CG has 129 legal + 112 accounting firms but no formal startup support. UM generates talent.', 'high'],
  ['Immigration Law Boutique', 'professional_services', 'Coral Gables', "CG's international population + proximity to Latin America. Niche underserved despite 129 legal firms.", 'medium'],
  ['HR / Payroll Outsourcing Firm', 'professional_services', 'Alhambra Circle', '2,730 businesses but very few HR support firms. SMB market is massive.', 'high'],
  ['Executive Coaching & Leadership Dev', 'professional_services', 'Miracle Mile', '474 infrastructure + 674 platform businesses need professional development. Premium market.', 'medium'],
  ['Premium Pet Grooming & Daycare', 'personal_services', 'Bird Road Corridor', 'Zero pet services in database. Affluent neighborhoods, work-from-office returning — pet daycare demand surging.', 'high'],
  ['Concierge / Errand Service', 'personal_services', 'Coral Gables', "High-income dual-earner households. TaskRabbit-style local concierge model perfect for CG's demo.", 'medium'],
  ['Senior Home Care Agency', 'personal_services', 'Sunset / South Gables', 'Aging population in South Gables. Healthcare strong (284) but personal care services almost absent.', 'high'],
  ['Mobile Auto Detailing', 'personal_services', 'Douglas Road Corridor', '55 auto dealers + 14 automotive but zero detailing services. High-end vehicle owners = premium demand.', 'medium'],
  ['Pilates / Barre Studio', 'wellness', 'Miracle Mile', 'CG has 97 wellness businesses but concentrated in general area. Miracle Mile walkability is key.', 'medium'],
  ['Mental Health & Therapy Practice', 'wellness', 'Ponce de Leon Corridor', "Post-pandemic mental health demand. CG's affluent demo can afford premium therapy. Office corridor ideal.", 'high'],
  ['Holistic Wellness Center (Acupuncture/TCM)', 'wellness', 'University of Miami Area', 'UM medical campus synergy. Integrative medicine growing 15% annually. Only 6 wellness near UM.', 'medium'],
  ['Boutique Event Space / Venue', 'hospitality', 'Giralda Plaza', "CG's dining/nightlife hub but only 2 businesses listed. Event venues complement F&B cluster.", 'high'],
  ['Eco-Tourism / City Tour Operator', 'hospitality', 'Miracle Mile', "CG's Mediterranean architecture, Biltmore Hotel, Venetian Pool = tour potential. Zero tour operators listed.", 'medium'],
  ['Property Management Company', 'real_estate', 'Coral Gables', '71 RE firms but mostly sales. Rental market growing — Coral Gables has 40% renters. Property mgmt demand high.', 'high'],
  ['Commercial Real Estate Advisory', 'real_estate', 'Ponce de Leon Corridor', 'CG attracting MNCs (150+). Specialized commercial RE advisory would fill a niche in the office district.', 'medium'],
  ['Green Building / LEED Contractor', 'construction', 'Coral Gables', "CG's sustainability initiatives + affluent homeowners = demand for green construction. Only 76 construction firms.", 'medium'],
  ['Pool / Outdoor Living Specialist', 'construction', 'Sunset / South Gables', 'FL climate + high-income homes. Pool construction/renovation is a perennial demand.', 'medium'],
  ['EV Charging Network / Station', 'transportation', 'Miracle Mile', 'Only 5 transportation businesses total. EV adoption growing, CG income demo buys EVs at 2x national rate.', 'high'],
  ['Executive Car Service / Chauffeur', 'transportation', 'Coral Gables', 'MIA airport proximity, Brickell/downtown commuters, 150+ MNCs. Zero car services in database.', 'high'],
  ['Art Gallery / Exhibition Space', 'arts_culture', 'Giralda Plaza', 'CG has rich arts heritage (Lowe Art Museum, Art Cinema). Giralda experiential district needs gallery presence.', 'medium'],
  ['Music / Performing Arts Academy', 'arts_culture', 'Bird Road Corridor', 'Education strong (202) but arts education thin. Family-dense corridors = youth arts demand.', 'medium'],
  ['Podcast / Content Studio', 'media_entertainment', 'Douglas Road Corridor', 'Only 6 media businesses in all of CG. Creator economy booming. Affordable rents on Douglas make this viable.', 'medium'],
  ['Local News / Community Digital Media', 'media_entertainment', 'Coral Gables', '50K residents with no dedicated local digital media outlet. Community journalism fills civic need.', 'high'],
  ['Wealth Management / Family Office', 'financial_services', 'Alhambra Circle', "CG's banking corridor (52 banks) but limited wealth mgmt. $134K median income = sophisticated financial needs.", 'high'],
  ['Cryptocurrency / Digital Asset Advisory', 'financial_services', 'Coral Gables', "Miami is a crypto hub. CG's finance cluster + tech-savvy high-income demographic = natural fit.", 'medium'],
  ['Sustainability / ESG Consulting', 'consulting', 'Coral Gables', "CG's green city initiatives + corporate ESG mandates. Only 29 consulting firms total.", 'medium'],
  ['International Trade Consulting', 'consulting', 'Ponce de Leon Corridor', 'CG is Latin America gateway. 150+ MNCs but minimal trade consulting. LATAM corridor opportunity.', 'high'],
]

const NEIGHBORING_CHAMBERS = {
  greater_miami: { name: 'Greater Miami Chamber of Commerce', url: 'https://www.miamichamber.com/', relevance: "Miami's primary chamber — overlapping service areas with CG businesses" },
  coconut_grove: { name: 'Coconut Grove Business Improvement District', url: 'https://coconutgrove.com/', relevance: 'Adjacent neighborhood, shared demographics, walkable connection to CG' },
  south_miami: { name: 'South Miami Chamber of Commerce', url: 'https://southmiamichamber.org/', relevance: 'Southern neighbor, shared Bird Road corridor' },
  key_biscayne: { name: 'Key Biscayne Chamber of Commerce', url: 'https://keybiscaynechamber.org/', relevance: 'Affluent island community, similar demographics' },
  doral: { name: 'Doral Chamber of Commerce', url: 'https://doralchamber.org/', relevance: 'Growing business hub, many CG workers commute to/from Doral' },
}

// Deterministic opportunity id — mirrors the analyzer's md5(raw)[:8] scheme.
async function opportunityId(name, category) {
  const raw = `opp_${category}_${name}`.toLowerCase()
  const { createHash } = await import('node:crypto')
  const h = createHash('md5').update(raw).digest('hex').slice(0, 8)
  return `opp_${category}_${h}`
}

const round = (v, d) => { const f = 10 ** d; return Math.round(v * f) / f }

// Live counts: businesses per category_primary and per (neighborhood × category).
async function loadCounts(session) {
  const catRes = await session.run(`
    MATCH (b:Business)
    RETURN b.category_primary AS category, count(*) AS cnt
  `)
  const catCounts = {}
  for (const r of catRes.records) {
    const c = r.get('category')
    if (c) catCounts[c] = r.get('cnt')
  }

  const hoodRes = await session.run(`
    MATCH (b:Business)
    RETURN coalesce(b.neighborhood, '') AS hood, b.category_primary AS category, count(*) AS cnt
  `)
  const hoodTotals = {}          // hood → total businesses
  const hoodCatCounts = {}       // hood → { category → count }
  for (const r of hoodRes.records) {
    const hood = r.get('hood')
    if (!hood) continue
    const cat = r.get('category')
    const cnt = r.get('cnt')
    hoodTotals[hood] = (hoodTotals[hood] || 0) + cnt
    if (!hoodCatCounts[hood]) hoodCatCounts[hood] = {}
    if (cat) hoodCatCounts[hood][cat] = (hoodCatCounts[hood][cat] || 0) + cnt
  }

  return { catCounts, hoodTotals, hoodCatCounts }
}

export async function getOpportunities() {
  const session = getDriver().session()
  try {
    const { catCounts, hoodTotals, hoodCatCounts } = await loadCounts(session)

    // ── Category gap analysis (vs national benchmarks) ───────────────────────
    const gaps = Object.entries(NATIONAL_BENCHMARKS)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, benchmark]) => {
        const actual = catCounts[cat] || 0
        const actualPer1k = actual / CG_POPULATION * 1000
        const gapPer1k = benchmark - actualPer1k
        const gapBusinesses = Math.trunc(gapPer1k * CG_POPULATION / 1000)
        const gapPct = benchmark ? (gapPer1k / benchmark * 100) : 0
        return {
          category: cat,
          current_count: actual,
          benchmark_per_1k: benchmark,
          actual_per_1k: round(actualPer1k, 2),
          gap_per_1k: round(gapPer1k, 2),
          gap_businesses: Math.max(0, gapBusinesses),
          gap_pct: round(gapPct, 1),
        }
      })
    gaps.sort((a, b) => b.gap_businesses - a.gap_businesses)
    const totalGap = gaps.reduce((s, g) => s + (g.gap_businesses > 0 ? g.gap_businesses : 0), 0)

    // ── Neighborhood deserts ─────────────────────────────────────────────────
    const deserts = []
    for (const [hood, total] of Object.entries(hoodTotals)) {
      if (total < 5) continue
      const missing = ESSENTIAL_CATS
        .map(cat => ({ category: cat, count: hoodCatCounts[hood]?.[cat] || 0 }))
        .filter(m => m.count < 3)
      if (missing.length) deserts.push({ neighborhood: hood, total, missing })
    }

    // ── Curated opportunities enriched with live gap figures ─────────────────
    const created = new Date().toISOString().slice(0, 10)
    const opportunities = await Promise.all(CURATED_OPPORTUNITIES.map(async ([name, cat, hood, rationale, demand]) => {
      const gap = gaps.find(g => g.category === cat) || {}
      return {
        opportunity_id: await opportunityId(name, cat),
        business_concept: name,
        category: cat,
        target_neighborhood: hood,
        rationale,
        estimated_demand: demand,
        category_gap_pct: gap.gap_pct ?? 0,
        category_deficit: gap.gap_businesses ?? 0,
        status: 'identified',
        created_date: created,
      }
    }))

    return {
      generated: new Date().toISOString(),
      market_summary: {
        population: CG_POPULATION,
        median_income: CG_MEDIAN_INCOME,
        total_businesses: gaps.reduce((s, g) => s + g.current_count, 0),
        total_gap: totalGap,
        gap_categories: gaps.filter(g => g.gap_businesses > 0).length,
      },
      category_gaps: gaps,
      neighborhood_deserts: deserts,
      opportunities,
      neighboring_chambers: NEIGHBORING_CHAMBERS,
    }
  } finally {
    await session.close()
  }
}
