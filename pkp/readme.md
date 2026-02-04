Got you. Here are the full results (the content of the exec brief + the machine-ready PKP) pasted directly.

⸻

Imperial Dade — PKP Executive Brief (As of 2026-02-04)

Executive Summary (4 bullets)
	•	What it is: Imperial Dade is a scaled North American distributor of foodservice packaging, JanSan (janitorial + sanitation), and industrial packaging products and solutions.
	•	Why it matters: The moat is scale + local service density, amplified by a repeatable acquisition (roll-up) playbook and “programmatic” selling (ex: sustainability / compliance).
	•	Catalyst to watch: The announced all-equity merger with BradyPLUS (Aug 11, 2025) could expand footprint and customer access, but introduces real integration + execution risk.
	•	Key diligence needs: Leverage/EBITDA, customer concentration, integration roadmap, and operational KPIs (fill-rate, OTIF, retention, working capital turns).

⸻

1) Snapshot (What an exec should know)

Scale / footprint (publicly stated, varies by source):
	•	125+ facilities
	•	7,500+ employees
	•	120,000+ customers served
	•	100,000+ SKUs / products
	•	~10.2M sq ft warehouse space
	•	Revenue context: Bain Capital previously disclosed growth from ~$2B (2019) to ~$5B (by 2022) in the context of the Advent stake announcement.

Local anchor (Miami-Dade):
	•	Miami facility listed in Hialeah, FL, serving South Florida + Keys.

⸻

2) RS1-6 Wireframe — Value Chain View

RS1 — Value chain map (where Imperial Dade sits)

Layer	Role	What matters
Raw materials & manufacturing	Pulp/paper, resin/plastics, chemicals, equipment OEMs	Commodity swings + supply reliability
Brand manufacturers	Packaging brands, cleaning solutions, liners, PPE, dispensers	Supplier terms / exclusivity / pricing
Distribution platform (Imperial Dade)	Procurement scale, inventory, routing, programs	OTIF, fill-rate, turns, route density
Customer operations	Restaurants, healthcare, hospitality, FM, municipalities	Renewal cycles, vertical mix, retention
End consumer experience	Hygiene, safety, sustainability, packaging performance	NPS, compliance incidents, ESG adoption

RS2 — Picks & shovels (enablers / “infrastructure”)
	•	Logistics: UPS, XPO, regional freight carriers (route density economics)
	•	Waste & recycling: Republic Services, Waste Management (closed-loop sustainability positioning)
	•	Sustainability cert ecosystems: Green Seal / EPA Safer Choice alignment (credibility)
	•	Commodity inputs: pulp/paper indices, resin pricing, diesel/freight rates (margin pressure)

RS3 — Undercurrents (invisible forces)
	•	PE-backed consolidation & M&A (tailwind): scale drives procurement and service density, but increases integration burden.
	•	Sustainability mandates (tailwind): customers want greener packaging/cleaning programs; consultative selling becomes sticky.
	•	E-commerce / commodity disruption (headwind): Uline/Amazon Business push price transparency; differentiation shifts to service + programs.

RS4 — Headlines / key events (what matters)
	•	2025-08-11: Imperial Dade + BradyPLUS announce plan to merge (all-equity; terms undisclosed).
	•	2022-05-02: Bain Capital announces Advent will acquire a significant stake; notes revenue grew from ~$2B (2019) to ~$5B by that time.
	•	Greensafe / ESG positioning: Imperial Dade promotes the Greensafe Program and publishes an ESG overview with governance references.

RS5 — Monitorable dashboard (real-time template)

Entities to watch: Imperial Dade, BradyPLUS, Uline, Bain Capital, Advent International

Key metrics + data sources (practical, automatable):
	1.	M&A / integration signals
	•	Source: company PR + trade press
	•	Automation: RSS/Google Alerts/trade outlets feed
	2.	Facility footprint changes
	•	Source: imperialdade.com locations pages
	•	Automation: web scrape + diff changes weekly
	3.	ESG / sustainability updates
	•	Source: ESG PDF + Greensafe page
	•	Automation: monitor file changes + summarize diffs
	4.	Commodity & freight proxies
	•	Source: public indices (pulp, resin, diesel)
	•	Automation: API feeds (FRED/industry data where available)

Alert rules (exec-friendly):
	•	If headline contains merge AND (terminated OR delay OR regulatory) → escalate to exec
	•	If facility closure/opening in Florida → flag service impact
	•	If ESG PDF updated → diff + summarize changes

RS6 — Gaps + risks (what we still don’t know)

Missing info (needs diligence or internal access):
	•	Current leverage, EBITDA, covenants, liquidity runway
	•	Customer concentration by vertical/region + churn/retention
	•	Post-merger integration plan: ERP/WMS/TMS systems roadmap
	•	ESG claims measurement: baselines, auditability, scope boundaries

Risk register (executive view)
	•	Merger integration & service disruption (Likelihood: Medium | Severity: High)
	•	Working capital & leverage pressure (Medium | Medium)
	•	Competitive pressure from ultra-scale & e-comm (Medium | Medium)
	•	Supplier concentration / contract term shifts (Medium | Medium)
	•	ESG reputational risk if claims not substantiated (Low | Medium)

⸻

3) 30-60-90 Monitoring Plan (what to instrument)

30 days
	•	Merger status tracker (closing timeline + any regulatory updates)
	•	Facility footprint diffs
	•	Major contract wins/losses (if surfaced)
	•	Output: weekly 1-page exec brief

60 days
	•	Integration signals (leadership changes, systems changes)
	•	Service KPIs: fill-rate, OTIF, complaint volume
	•	Pricing cadence notes (inflation vs deflation stance)
	•	Output: monthly ops review + risks

90 days
	•	Sustainability adoption signals
	•	Supplier concentration changes
	•	Vertical mix shifts (foodservice vs JanSan vs industrial)
	•	Output: quarterly board-style update

⸻

Machine-Ready PKP JSON (paste)

{
  "meta": {
    "schema_name": "pkp_schema_v2",
    "schema_version": "2.1.0",
    "domain": "industrial_distribution",
    "created_at": "2026-02-04T12:00:00-05:00",
    "author": "Synapse (PKP)",
    "confidence": 0.78,
    "sources_note": "Public web sources + PKP schema v2.1 template."
  },
  "node": {
    "id": "IMPD",
    "name": "Imperial Dade",
    "type": "company",
    "layer": "distribution_platform",
    "thesis": "Imperial Dade is a scaled North American distributor of foodservice packaging, JanSan supplies, and industrial packaging. The core edge is national scale with local service, amplified by an acquisition playbook and expanding sustainability programs. Near-term strategic catalyst: the announced all-equity merger with BradyPLUS (Aug 2025) could materially expand footprint and customer access, but raises integration, execution, and leverage/ownership-complexity risks.",
    "time_horizon": "12-24m"
  },
  "context": {
    "picks_shovels": [
      {
        "id": "RSG",
        "name": "Republic Services",
        "role": "waste/recycling partner ecosystem",
        "edge_type": "enables",
        "weight": 0.2
      },
      {
        "id": "WMT",
        "name": "Walmart (logistics benchmarks)",
        "role": "supply chain benchmarks",
        "edge_type": "benchmarks",
        "weight": 0.1
      },
      {
        "id": "UPS",
        "name": "UPS",
        "role": "parcel logistics",
        "edge_type": "enables",
        "weight": 0.15
      },
      {
        "id": "XPO",
        "name": "XPO Logistics",
        "role": "freight/logistics",
        "edge_type": "enables",
        "weight": 0.15
      },
      {
        "id": "CPRT",
        "name": "Copart (alt benchmark)",
        "role": "fleet/ops analytics benchmark",
        "edge_type": "benchmarks",
        "weight": 0.05
      }
    ],
    "edges": [
      {
        "from": "IMPD",
        "to": "Bain Capital Private Equity",
        "type": "owned_by",
        "weight": 0.6
      },
      {
        "from": "IMPD",
        "to": "Advent International",
        "type": "minority_investor",
        "weight": 0.3
      },
      {
        "from": "IMPD",
        "to": "BradyPLUS",
        "type": "announced_merger_with",
        "weight": 0.7
      },
      {
        "from": "IMPD",
        "to": "Foodservice + JanSan + Industrial customers",
        "type": "sells_to",
        "weight": 0.9
      }
    ],
    "undercurrents": [
      {
        "name": "distribution_consolidation_MA",
        "direction": "bullish",
        "rationale": "Sector continues to consolidate; scale improves procurement and service density."
      },
      {
        "name": "sustainability_procurement_shift",
        "direction": "bullish",
        "rationale": "Customers increasing demand for sustainable packaging and greener cleaning programs."
      },
      {
        "name": "integration_execution_risk",
        "direction": "bearish",
        "rationale": "Large combinations can disrupt service levels and working capital in the near term."
      },
      {
        "name": "input_cost_volatility",
        "direction": "mixed",
        "rationale": "Resin/pulp/freight swings can pressure margins unless pricing cadence stays tight."
      }
    ]
  },
  "signals": {
    "metrics": [
      {
        "name": "locations_facilities",
        "unit": "count",
        "current": 125,
        "thresholds": {
          "bull": ">=130",
          "bear": "<110"
        }
      },
      {
        "name": "employees",
        "unit": "count",
        "current": 7500,
        "thresholds": {
          "bull": ">=7500",
          "bear": "<6000"
        }
      },
      {
        "name": "customers_served",
        "unit": "count",
        "current": 120000,
        "thresholds": {
          "bull": ">=120000",
          "bear": "<90000"
        }
      },
      {
        "name": "product_catalog_skus",
        "unit": "count",
        "current": 100000,
        "thresholds": {
          "bull": ">=100000",
          "bear": "<75000"
        }
      },
      {
        "name": "revenue_estimate",
        "unit": "$B",
        "current": 5.0,
        "thresholds": {
          "bull": ">=5",
          "bear": "<3.5"
        }
      },
      {
        "name": "warehouse_space",
        "unit": "M sq ft",
        "current": 10.2,
        "thresholds": {
          "bull": ">=10",
          "bear": "<8"
        }
      }
    ],
    "events": [
      {
        "date": "2019-05-01",
        "type": "Bain Capital acquisition (from Audax)",
        "impact": "+",
        "source": "Bain Capital announcement"
      },
      {
        "date": "2022-05-02",
        "type": "Advent International minority stake announced",
        "impact": "+",
        "source": "Bain Capital / Advent announcement"
      },
      {
        "date": "2025-08-11",
        "type": "Announced all-equity merger with BradyPLUS",
        "impact": "+",
        "source": "Imperial Dade news release"
      }
    ]
  },
  "news": [
    {
      "date": "2025-08-11",
      "headline": "BradyPLUS and Imperial Dade announce plan to merge (terms undisclosed).",
      "sentiment": "+",
      "source": "imperialdade.com news release"
    },
    {
      "date": "2022-05-02",
      "headline": "Bain Capital announces Advent to acquire a significant stake; notes revenue grew from ~$2B (2019) to ~$5B.",
      "sentiment": "+",
      "source": "baincapital.com"
    },
    {
      "date": "2024-03-21",
      "headline": "Greensafe Program content emphasizes sustainability consulting/product sourcing/fulfillment/training.",
      "sentiment": "+",
      "source": "imperialdade.com"
    }
  ],
  "risks": [
    {
      "name": "post-merger_integration_and_service_disruption",
      "likelihood": "med",
      "severity": "high"
    },
    {
      "name": "working_capital_and_leverage_pressure",
      "likelihood": "med",
      "severity": "med"
    },
    {
      "name": "competitive_pressure_from_ultra-scale_and_e-commerce",
      "likelihood": "med",
      "severity": "med"
    },
    {
      "name": "supplier_concentration_or_contract_terms_shift",
      "likelihood": "med",
      "severity": "med"
    },
    {
      "name": "ESG_reputational_risk_if_claims_not_substantiated",
      "likelihood": "low",
      "severity": "med"
    }
  ],
  "actions": [
    {
      "type": "monitor",
      "what": "BradyPLUS merger closing timeline + regulatory/financing updates",
      "rule": "weekly_news_scan AND flag any 'terminated', 'delayed', 'approved' language",
      "notify": "email:exec-brief@co_"
    },
    {
      "type": "monitor",
      "what": "Acquisition cadence and integration performance",
      "rule": "quarterly_update: count acquisitions + any service KPI deterioration",
      "notify": "slack:#imperialdade"
    },
    {
      "type": "monitor",
      "what": "Sustainability program adoption (Greensafe) + product mix shift",
      "rule": "quarterly: track % revenue from sustainable/eco lines if disclosed or proxied",
      "notify": "slack:#esg"
    },
    {
      "type": "alert",
      "what": "Material litigation/regulatory action",
      "rule": "news_contains('lawsuit' OR 'FTC' OR 'EPA' OR 'recall')",
      "notify": "email:exec-alerts@co_"
    }
  ],
  "valuation": {
    "method": "private_company_comp_benchmarks",
    "inputs": {
      "notes": "Private; triangulate using distributor comps (EBITDA multiple range) and transaction comps; requires access to confidential financials."
    },
    "range": {
      "bear": null,
      "base": null,
      "bull": null
    }
  },
  "sources": [
    {
      "name": "Imperial Dade About Us (products, footprint)",
      "url": "https://www.imperialdade.com/about-us"
    },
    {
      "name": "Imperial Dade Miami facility (local footprint)",
      "url": "https://www.imperialdade.com/locations/miami-facility"
    },
    {
      "name": "Imperial Dade Greensafe program (sustainability)",
      "url": "https://www.imperialdade.com/programs/greensafe"
    },
    {
      "name": "Imperial Dade ESG overview (pdf)",
      "url": "https://s3.amazonaws.com/imperialdade.com/apps/cms/media-lib/documents/esg-overview.pdf"
    },
    {
      "name": "Merger announcement: BradyPLUS + Imperial Dade (Aug 11, 2025)",
      "url": "https://www.imperialdade.com/news/bradyplus-and-imperial-dade-to-unite-advancing-a-shared-vision-of-customer-centric-growth"
    },
    {
      "name": "Bain Capital: Advent stake + revenue growth disclosure (May 2, 2022)",
      "url": "https://www.baincapital.com/news/advent-international-acquire-significant-stake-imperial-dade-leading-north-american"
    }
  ],
  "custom": {
    "RS1_value_chain": [
      {
        "layer": "Raw materials & manufacturing",
        "role": "Paper/pulp, resin/plastics, chemicals, equipment OEMs"
      },
      {
        "layer": "Brand manufacturers",
        "role": "Foodservice packaging, dispensers, cleaners, liners, PPE"
      },
      {
        "layer": "Distribution platform (Imperial Dade)",
        "role": "Procurement scale, inventory positioning, route density, consultative programs"
      },
      {
        "layer": "Customer ops",
        "role": "Restaurants, healthcare, hospitality, facilities management, municipalities"
      },
      {
        "layer": "End consumer experience",
        "role": "Hygiene, safety, sustainability, packaging performance"
      }
    ],
    "RS2_picks_and_shovels": [
      {
        "category": "Logistics",
        "examples": [
          "UPS",
          "XPO Logistics",
          "3PL regional carriers"
        ]
      },
      {
        "category": "Waste & recycling",
        "examples": [
          "Republic Services",
          "Waste Management"
        ]
      },
      {
        "category": "Sustainability certifications",
        "examples": [
          "Green Seal, EPA Safer Choice (program alignment)"
        ]
      },
      {
        "category": "Commodity inputs",
        "examples": [
          "pulp/paper indices, resin pricing, diesel/freight rates"
        ]
      }
    ],
    "RS3_undercurrents": [
      {
        "force": "PE-backed roll-up + consolidation",
        "direction": "tailwind",
        "note": "Scale improves procurement and route economics; integration risk is the tradeoff."
      },
      {
        "force": "Sustainability procurement mandates",
        "direction": "tailwind",
        "note": "Greensafe program positions consultative selling around ESG goals."
      },
      {
        "force": "E-commerce disruption",
        "direction": "headwind",
        "note": "Uline/Amazon Business pressure on commodity SKUs; differentiation must come from service + programs."
      }
    ],
    "RS4_headlines": [
      {
        "date": "2025-08-11",
        "text": "Imperial Dade and BradyPLUS announce plan to merge (all-equity; terms not disclosed)."
      },
      {
        "date": "2022-05-02",
        "text": "Bain Capital notes revenue growth from ~$2B (2019) to ~$5B alongside Advent minority stake."
      }
    ],
    "RS5_dashboard": {
      "entities_watch": [
        "Imperial Dade",
        "BradyPLUS",
        "Uline",
        "Bain Capital",
        "Advent International"
      ],
      "key_metrics": [
        {
          "name": "M&A events / integration signals",
          "source": "company news + trade press",
          "endpoint": "RSS/Google Alerts/MDM feed"
        },
        {
          "name": "Facility footprint changes",
          "source": "imperialdade.com/locations",
          "endpoint": "web scrape"
        },
        {
          "name": "ESG / sustainability updates",
          "source": "imperialdade.com + ESG pdf",
          "endpoint": "web scrape"
        },
        {
          "name": "Commodity & freight proxies",
          "source": "public indices",
          "endpoint": "FRED/industry data feeds"
        }
      ],
      "alert_rules": [
        {
          "rule": "if headline contains 'merge' AND ('terminated' OR 'delay' OR 'regulatory') then escalate to exec"
        },
        {
          "rule": "if major facility closure/opening in FL then flag local service impact"
        },
        {
          "rule": "if ESG pdf updated then diff and summarize changes"
        }
      ]
    },
    "RS6_gaps_and_risks": [
      {
        "gap": "Current leverage, EBITDA, and covenant headroom (needs confidentials)."
      },
      {
        "gap": "Customer concentration by vertical/region and churn KPIs (needs CRM/BI access)."
      },
      {
        "gap": "Post-merger integration plan, synergies, systems roadmap (ERP/WMS/TMS)."
      },
      {
        "gap": "Sustainability claims measurement (scope, baselines, and auditability)."
      }
    ]
  }
}


⸻

If you tell me who the exec audience is (PE partner, operator CEO, procurement leader, or potential acquirer), I’ll rewrite the top section into a tighter one-page “so-what” memo in that voice.
