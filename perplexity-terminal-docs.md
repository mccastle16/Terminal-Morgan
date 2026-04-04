# The Terminal â€” Master Product Documentation

**Product:** The Terminal  
**Category:** Bloomberg-Style Business Intelligence Platform for Local Ecosystems  
**Initial Market:** Chambers of Commerce  
**Pilot Customer:** Coral Gables Chamber of Commerce  
**Version:** 1.0  
**Date:** April 2, 2026  

---

## 1. Executive Summary

**Observed:** The Terminal is a business intelligence platform built on a foundation of 2,868 structured business records covering Coral Gables, FL. The system uses multi-source OSINT collection (OpenStreetMap, Outscraper, SerpApi, Apify), multi-agent validation, and synthesis to create decision-grade intelligence for local business ecosystems.

**What The Terminal Is**

The Terminal is a Bloomberg-style intelligence system for chambers of commerce and local economic development organizations. It provides structured, scored, and synthesized business data that enables chambers to understand their member penetration, identify recruitment whitespace, monitor ecosystem health, detect churn risk, and make data-driven strategic decisions.

Unlike CRM reports or static directories, The Terminal is a living intelligence platform that combines OSINT discovery, automated enrichment, multi-source validation, PKP (Picks/Shovels/Platform) network synthesis, and scoring models to create actionable insights for three distinct user types: chamber leadership, chamber members, and non-member local businesses.

**Why It Matters**

Chambers of commerce operate with incomplete information. They know their members but have limited visibility into the 70%+ of local businesses that are not members. They lack systematic tools to identify high-value prospects, understand category penetration, detect member churn risk, or quantify ecosystem health. The Terminal solves this by creating a complete picture of the local business landscape with intelligence layers that support strategic decision-making.

**Who It Serves**

- **Chamber Leadership:** Strategic intelligence for membership growth, category penetration analysis, churn risk detection, sponsor prospecting, and ecosystem monitoring
- **Chamber Members:** Local market intelligence including competitive positioning, voice-of-customer insights, category peer analysis, and partnership opportunity identification
- **Non-Members:** Gated teaser intelligence designed to demonstrate value and drive chamber membership conversion

**Why Chambers Are the Wedge**

Chambers have a clear buyer (CEO/Membership Director), a defined ICP (mid-market chambers managing 500-2,000 businesses), an immediate pain point (membership growth and retention), budget authority for member services, and repeatable deployment models. Coral Gables validates the wedge: 843 chamber members, 2,041 non-members catalogued, clear whitespace in 1,516+ businesses not yet captured, and quantifiable penetration metrics by category and geography.

**Category Definition**

The Terminal defines a new category: **Local Business Intelligence Systems**. This sits between economic development platforms (city-scale, macro indicators) and CRM tools (relationship management, micro transactions). The Terminal is purpose-built for chambers, BIDs, downtown districts, and municipalities that need operational intelligence about their business ecosystem at zero marginal cost of data acquisition.

---

## 2. Product Vision

**Product Vision Statement**

The Terminal makes local business ecosystems legible, measurable, and actionable for the organizations that serve them.

**Long-Term Ambition**

Within 36 months, The Terminal becomes the standard intelligence platform for 500+ chambers of commerce and local economic development organizations across North America. Each deployment creates a proprietary dataset covering 2,000-10,000 local businesses with intelligence layers that support membership growth, sponsor prospecting, policy advocacy, and ecosystem development.

The platform evolves from batch-refresh OSINT to near-real-time event-driven intelligence, from chamber-only to white-label municipal licensing, and from descriptive analytics to predictive scoring (churn risk, recruitability, partnership affinity, sponsorship value).

**Category Definition**

The Terminal is not:
- A CRM (manages relationships, not ecosystems)
- A business directory (static listings, no intelligence)
- An economic development dashboard (macro indicators, not business-level insights)
- A market research tool (survey-based, not OSINT-derived)

The Terminal is:
- An intelligence system for local business ecosystems
- A decision support platform for chamber strategy
- A market intelligence service for SMBs
- A multi-tenant SaaS built on zero-marginal-cost OSINT infrastructure

**Why "Bloomberg-Style Terminal" Is the Right Metaphor**

Bloomberg Terminal transformed financial markets by making real-time, structured, multi-source data accessible to decision-makers. The Terminal does the same for local business ecosystems:

- **Multi-source synthesis:** Combines OpenStreetMap, Google Maps, review platforms, business directories, chamber directories into unified entity records
- **Structured schemas:** 36-field canonical business model with validation tiers, confidence scores, and data provenance
- **Intelligence layers:** PKP network analysis, scoring models, risk signals, opportunity flags
- **Decision-grade data:** Not marketing dashboardsâ€”intelligence for strategic decisions
- **Professional UX:** Dense information displays, multi-panel layouts, comparison views, filter-heavy navigation

**Jobs to Be Done by User Type**

**Chamber Leadership:**
- Understand member vs non-member penetration by category, geography, and business size
- Identify high-value recruitment targets using scoring models (visibility, influence, recruitability)
- Detect member churn risk through rating decline, red flags, and engagement signals
- Quantify ecosystem health using category diversity, rating distributions, and growth indicators
- Prospect for sponsors by identifying businesses with high visibility, strong reputation, and category relevance
- Make data-driven decisions on program investment, event planning, and policy advocacy

**Chamber Members:**
- Understand their competitive position within category and geography
- Access voice-of-customer intelligence (top delights, pain points, review themes)
- Identify category peers for partnership or benchmarking
- Discover whitespace opportunities (underserved categories, geographic gaps)
- Monitor local market trends and undercurrents
- Access decision support for expansion, repositioning, or partnership strategies

**Non-Members:**
- See enough intelligence to understand The Terminal's value (ratings, category peers, basic positioning)
- Experience information asymmetry that creates conversion desire
- Receive clear calls to action for chamber membership or premium access

**What Makes This More Than a Dashboard**

Dashboards display data. The Terminal synthesizes intelligence.

- **PKP Network Analysis:** Every business is classified as asset (end consumer business), platform (intermediary/aggregator), or infrastructure (picks/shovels supplier). Edges map dependencies and opportunities.
- **Scoring Models:** Businesses receive scores for influence, visibility, reputation, recruitability, churn risk, sponsorship value
- **Voice of Customer Synthesis:** Review data is synthesized into top delights and pain points, not just star ratings
- **Risk Detection:** Red flags, validation tiers, and OSINT confidence create trust/quality signals
- **Action Playbooks:** Intelligence translates to recommended actions (prospect, monitor, re-categorize, validate)

---

## 3. Problem Statement

### Chamber Leadership Problems

**Operational Problems:**
- **Membership Growth Blindness:** Chambers know their 800 members but have no systematic view of the 2,000+ non-member businesses in their geography. Recruitment is ad hoc, relationship-driven, and inefficient.
- **Category Penetration Unknown:** Chambers cannot answer "What % of local restaurants are members?" or "Are we weak in professional services?" without manual counting.
- **Churn Detection Failure:** Member churn is discovered retroactively (non-renewal) rather than predicted from leading indicators (rating decline, engagement drop, red flags).
- **Whitespace Invisibility:** Chambers cannot identify emerging categories, high-growth sectors, or underserved geographies because they lack ecosystem-wide data.
- **Sponsor Prospecting Inefficiency:** Sponsor outreach is based on anecdote and guesswork rather than quantified visibility, reputation, and category relevance.

**Strategic Problems:**
- **Ecosystem Health Unmeasured:** Chambers have no baseline metrics for business diversity, rating distributions, category gaps, or neighborhood vitality.
- **Value Proposition Weakness:** Chambers struggle to articulate ROI to members because they lack comparative intelligence (how members perform vs non-members, member-only benefits quantified).
- **Board Reporting Inadequacy:** Chamber boards receive anecdotal updates, not data-driven insights on penetration trends, category performance, or recruitment pipeline health.

**Revenue Problems:**
- **Inefficient Sales Pipeline:** Membership directors waste time on low-fit prospects instead of high-recruitability targets.
- **Sponsor Underpricing:** Chambers undervalue sponsorship packages because they cannot quantify sponsor visibility or audience reach.
- **Retention Leakage:** Late detection of at-risk members means preventable churn and revenue loss.

### Chamber Member Problems

**Market Intelligence Gaps:**
- **Competitive Blindness:** SMB owners know 2-3 direct competitors but lack systematic view of category landscape, new entrants, or positioning gaps.
- **Voice of Customer Opacity:** Business owners see their own reviews but lack synthesized intelligence on what delights or frustrates customers across their category.
- **Partnership Discovery Friction:** Businesses want to collaborate with complementary peers but have no structured way to identify high-reputation, well-positioned partners.

**Strategic Planning Gaps:**
- **Market Positioning Uncertainty:** Business owners cannot benchmark their rating, review count, or price tier against category norms.
- **Whitespace Identification Failure:** Businesses miss expansion opportunities because they lack visibility into underserved categories or geographies.
- **Threat Detection Delay:** Businesses discover new competitors or market shifts reactively rather than through systematic monitoring.

**Chamber Value Perception:**
- **ROI Ambiguity:** Members question chamber value because benefits are intangible (networking, advocacy) rather than concrete intelligence services.
- **Engagement Fatigue:** Members attend events but lack ongoing value from chamber membership between quarterly mixers.

### Non-Member Problems

**Information Asymmetry:**
- **Isolation:** Non-member SMBs operate without market intelligence, peer benchmarking, or ecosystem insights.
- **Chamber Awareness Gap:** Many non-members don't know what chambers offer beyond networking events.
- **Conversion Friction:** Non-members need demonstration of concrete value before committing to membership fees.

### Local Economic Development Stakeholder Problems

**Data Infrastructure Gaps:**
- **Business Count Uncertainty:** Cities and counties lack accurate counts of active businesses by category and geography.
- **Economic Development Invisibility:** Economic development offices cannot quantify business ecosystem health, category diversity, or growth trends.
- **Policy Impact Unmeasured:** Municipalities pass business-friendly policies but cannot measure impact on business formation, retention, or category mix.

### Sponsor / Advertiser / Partner Problems

**Targeting Inefficiency:**
- **Audience Reach Unknown:** Potential sponsors cannot quantify chamber member demographics, category mix, or geographic distribution.
- **Value Proposition Weakness:** Chambers sell sponsorships based on event attendance rather than structured audience intelligence.
- **ROI Measurement Failure:** Sponsors invest in chamber partnerships without metrics on reach, engagement, or brand exposure.

---

## 4. User Personas

### Chamber CEO / President

**Profile:** 45-60 years old, 10+ years chamber experience, business development background, board-accountable, focused on membership growth and revenue.

**Goals:**
- Grow membership from 843 to 1,000 within 24 months
- Increase non-dues revenue (sponsorships, events, programs) by 30%
- Demonstrate ROI to board with quantified ecosystem metrics
- Expand into new member categories (tech, healthcare, professional services)
- Reduce member churn from 12% to <8% annually

**Pains:**
- Cannot answer board questions like "What's our penetration in restaurants?" or "Why did membership decline in Q3?"
- Wastes time on low-fit recruitment prospects
- Loses members without advance warning signals
- Underprices sponsorships due to lack of audience quantification
- Competes with BNI, Rotary, and industry associations without differentiation

**Current Alternatives:**
- Excel tracking of member list
- Anecdotal knowledge from staff and board
- Manual Google searches for new businesses
- CRM with member data only (no non-member intelligence)

**Decisions They Need to Make:**
- Which 200 non-member businesses to prioritize for outreach this quarter
- Which categories/geographies show highest growth potential
- Which members are at churn risk and need intervention
- What sponsorship packages to offer and at what price
- Where to invest resources (events, programs, advocacy)

**Why They Would Pay:**
- Membership growth justifies cost (recruit 50 new members at $500/year = $25K annual revenue increase)
- Board accountability requires data-driven reporting
- Competitive differentiation in crowded networking space
- Sponsor revenue increase offsets platform cost

**Willingness to Pay:** $500-2,000/month for chamber-wide license

---

### Chamber Membership Director

**Profile:** 30-45 years old, sales/business development background, quota-driven, hands-on with CRM and outreach tools, measured on new member acquisition and retention.

**Goals:**
- Hit quarterly membership recruitment targets (e.g., 25 new members/quarter)
- Reduce time spent on prospect research from 50% to 20%
- Improve close rate from 15% to 25% through better targeting
- Identify at-risk members before renewal cycle
- Build repeatable sales playbooks for different business categories

**Pains:**
- Spends hours manually researching prospects on Google, Yelp, LinkedIn
- Wastes outreach on businesses that are poor fits (too small, wrong category, not decision-maker)
- Lacks data to prioritize 2,000 potential prospects
- Cannot articulate value proposition with category-specific intelligence
- Loses members to churn without advance warning

**Current Alternatives:**
- Manual Google Maps searches
- Chamber CRM with member data only
- LinkedIn prospecting
- Referrals from existing members
- Cold outreach to businesses in chamber events vicinity

**Decisions They Need to Make:**
- Which 50 businesses to call this week
- What value proposition to emphasize per category (restaurants vs law firms vs healthcare)
- When to intervene with at-risk members
- How to allocate time between new member prospecting vs member retention

**Why They Would Pay:**
- Saves 10+ hours/week on prospect research
- Increases close rate through better targeting
- Protects revenue by preventing churn
- Makes quota attainment predictable rather than stressful

**Willingness to Pay:** $200-500/month for seat license

---

### Chamber Economic Development Lead

**Profile:** 35-55 years old, urban planning or public policy background, focused on business attraction, retention, and ecosystem development, works with city officials and developers.

**Goals:**
- Quantify business ecosystem health for city council and developers
- Identify category gaps that represent business attraction opportunities
- Monitor business formation and closure trends by neighborhood
- Support business retention programs with risk signals
- Demonstrate chamber impact on local economic vitality

**Pains:**
- Lacks structured data on non-member businesses
- Cannot answer questions like "How many healthcare businesses in Miracle Mile?" or "What categories are growing/declining?"
- Relies on anecdote to advocate for business-friendly policies
- Cannot measure policy impact on business activity
- Struggles to identify businesses at risk of closure or relocation

**Current Alternatives:**
- County business license data (outdated, incomplete)
- Census/BLS data (macro, not business-level)
- Anecdotal knowledge from chamber staff
- Developer market reports (real estate focused, not business intelligence)

**Decisions They Need to Make:**
- Which business categories to prioritize for attraction/retention programs
- Where to invest in infrastructure (parking, streetscape, public wifi)
- Which neighborhoods need intervention
- What policy advocacy positions to take with city government

**Why They Would Pay:**
- Quantified ecosystem data supports grant applications and city budget requests
- Policy advocacy becomes data-driven rather than anecdotal
- Business retention programs target highest-risk/highest-value businesses
- Demonstrates chamber value to city officials and developers

**Willingness to Pay:** $300-800/month for economic development module

---

### Chamber Member â€” Small Business Owner (Restaurant, Retail, Wellness)

**Profile:** 30-50 years old, 1-2 location operator, 5-20 employees, <$2M revenue, limited time for strategic analysis, focused on day-to-day operations.

**Goals:**
- Understand competitive positioning in local market
- Identify partnership opportunities with complementary businesses
- Monitor customer sentiment and address pain points
- Discover expansion opportunities (new location, new services)
- Justify chamber membership ROI to partners/investors

**Pains:**
- Doesn't know how rating (4.3 stars) compares to category average
- Sees reviews but lacks synthesis of themes across 200+ reviews
- Knows 2-3 competitors but not full category landscape
- Misses collaboration opportunities with complementary businesses
- Questions whether chamber membership is worth $800/year

**Current Alternatives:**
- Manual Yelp/Google reviews monitoring
- Informal conversations with other business owners
- Chamber networking events (quarterly)
- Local news and social media for market trends

**Decisions They Need to Make:**
- Whether to invest in service improvements based on customer feedback
- Which other businesses to partner with for cross-promotion
- Whether to expand to second location and where
- How to differentiate from competitors
- Whether to renew chamber membership

**Why They Would Pay:**
- Market intelligence replaces expensive consultants or market research
- Voice of customer synthesis saves time vs reading 200+ reviews
- Category benchmarking supports pricing and positioning decisions
- Partnership discovery drives revenue through collaboration

**Willingness to Pay:** $50-150/month for member intelligence tier (or included in chamber membership)

---

### Chamber Member â€” Professional Services Firm (Law, Accounting, Real Estate, Consulting)

**Profile:** 35-60 years old, 5-50 employee firm, $500K-$10M revenue, relationship-driven business, focused on referrals and reputation.

**Goals:**
- Monitor reputation and review sentiment
- Identify referral partners in complementary categories
- Understand market positioning vs competitors
- Discover sponsorship and visibility opportunities
- Demonstrate thought leadership in local market

**Pains:**
- Reviews are sparse (10-20 total) making trends hard to identify
- Relies on informal referral networks rather than structured discovery
- Lacks visibility into competitor landscape (who's new, who's growing, who's struggling)
- Questions how to justify chamber sponsorship ($5K-$25K/year)

**Current Alternatives:**
- Manual Google/LinkedIn monitoring
- Industry associations and bar/CPA networks
- Chamber events and mixers
- Local media and business journals

**Decisions They Need to Make:**
- Which businesses to approach for referral partnerships
- Whether to invest in chamber sponsorships and at what level
- How to position firm vs competitors
- Where to focus business development effort (geography, category, service line)

**Why They Would Pay:**
- Referral partner discovery drives revenue
- Competitive intelligence supports positioning and pricing
- Reputation monitoring protects brand
- Sponsorship ROI quantification justifies marketing spend

**Willingness to Pay:** $100-300/month for professional tier

---

### Non-Member Local Business Owner

**Profile:** 25-60 years old, may not know chamber exists, focused on survival/growth, limited budget for memberships or subscriptions.

**Goals:**
- Understand local market without expensive research
- Discover whether chamber membership is worth investment
- Access peer intelligence and benchmarking
- Identify growth opportunities

**Pains:**
- Operates in isolation without market intelligence
- Doesn't know what chambers offer beyond networking
- Cannot justify membership cost without clear ROI
- Lacks time for networking events

**Current Alternatives:**
- Free Google/Yelp browsing
- Informal conversations with other owners
- Local Facebook groups and online communities

**Decisions They Need to Make:**
- Whether to join chamber (cost/benefit analysis)
- How to compete with better-resourced businesses
- Where to focus improvement effort (service quality, pricing, marketing)

**Why They Would Care:**
- Gated intelligence demonstrates concrete value beyond networking
- Peer benchmarking provides actionable insights
- Conversion logic: "See limited data for free, unlock full intelligence with chamber membership"

**Willingness to Pay:** $0 initially (freemium teaser), $25-75/month for standalone access, or chamber membership conversion

---

### Sponsor / Institutional Partner

**Profile:** 40-60 years old, corporate marketing or community relations role, budget authority for local sponsorships, focused on brand visibility and community engagement.

**Goals:**
- Reach target business audiences (e.g., law firms for legal tech vendor)
- Quantify sponsorship ROI
- Demonstrate community investment to stakeholders
- Identify high-value partnership opportunities

**Pains:**
- Cannot quantify chamber audience demographics or reach
- Sponsorship value is sold on "goodwill" rather than audience metrics
- Lacks visibility into which chamber members align with sponsor's target customer profile

**Current Alternatives:**
- Event sponsorships with attendance counts
- Local media advertising
- Industry conference sponsorships
- Chamber membership directory placements

**Decisions They Need to Make:**
- Which chamber events/programs to sponsor
- What sponsorship level to invest in ($2K vs $10K vs $25K)
- How to measure sponsorship ROI
- Which chamber members to approach for B2B sales

**Why They Would Pay:**
- Audience intelligence enables precise targeting (e.g., "243 law firms, 107 accounting firms in member base")
- Sponsorship ROI becomes measurable
- B2B lead generation through chamber member data

**Willingness to Pay:** $500-2,000/month for sponsor intelligence package

---

## 5. Product Tiers and Access Model

### Tier 1: Chamber Leadership

**Access Level:** Full platform access with leadership-specific modules

**What They Can See:**
- All 2,868 businesses (members + non-members)
- Member vs non-member penetration dashboards
- Scoring models (recruitability, churn risk, sponsorship value, influence)
- Category and geographic penetration metrics
- Ecosystem health dashboards
- Red flag and risk monitoring
- Full PKP network analysis
- Historical trends and cohort analysis
- Advanced filters and comparison views
- Export capabilities (CSV, PDF reports)

**What They Cannot See:**
- N/A â€” leadership tier has full access

**Conversion Logic:**
- Chamber organization pays annual/monthly license fee
- Includes 3-5 leadership seats
- Tiered pricing based on chamber size (member count)

**Monetization Logic:**
- Primary revenue driver
- Annual contract: $12K-$24K/year based on chamber size
- Multi-chamber licensing: volume discount at 5+ chambers

---

### Tier 2: Chamber Members

**Access Level:** Member business intelligence with category and competitive insights

**What They Can See:**
- Their own business profile with full intelligence
- Category peer analysis (all businesses in their category, filtered by geography)
- Voice of customer synthesis (top delights, pain points for category)
- Competitive positioning (rating, review count, price tier vs category benchmarks)
- Partnership discovery (complementary businesses filtered by rating, category, geography)
- Neighborhood and category trends
- Limited PKP network (their business + direct edges)
- Review monitoring and alerts for their business

**What They Cannot See:**
- Full non-member database (only category peers visible)
- Member vs non-member penetration analysis
- Scoring models (recruitability, churn risk)
- Full ecosystem dashboards
- Advanced chamber-level intelligence

**What Is Blurred/Locked:**
- Full business intelligence on non-category businesses (name + category visible, but details locked)
- Cross-category analytics (can see their category, but not compare across all categories)
- Export capabilities (PDF/CSV locked)

**Conversion Logic:**
- Included in chamber membership or sold as $50-150/month add-on
- Value proposition: "Chamber membership unlocks market intelligence your competitors don't have"

**Monetization Logic:**
- Bundled into chamber membership dues (chamber pays platform fee, members access at no extra cost)
- OR: Chamber offers as premium tier ($75/month, chamber keeps 30% rev share)

---

### Tier 3: Non-Member Teaser

**Access Level:** Gated/limited preview to drive chamber membership conversion

**What They Can See:**
- Their own business listing (basic profile: name, category, rating, address)
- Top 5 category peers (name, rating, category only â€” no contact info, no deep intelligence)
- Category average rating and review count
- High-level neighborhood summary (business count, category mix)
- Chamber value proposition (what members unlock)

**What They Cannot See:**
- Full category peer analysis
- Voice of customer intelligence
- Partnership discovery tools
- PKP network analysis
- Competitive positioning dashboards
- Contact information for other businesses
- Export capabilities

**What Is Blurred/Locked:**
- Detailed business profiles (name + rating visible, but phone/website/reviews locked)
- Voice of customer synthesis (summary visible: "Top delight: friendly service", but full themes locked)
- Partnership tools (see that 12 complementary businesses exist, but cannot view details)

**Conversion Logic:**
- CTA: "Unlock full market intelligence with chamber membership" or "Upgrade to Premium for $75/month"
- Display value: "Chamber members see 10X more data, including [specific locked insights]"

**Monetization Logic:**
- Lead gen for chamber membership (chamber pays for platform, uses teaser as recruitment tool)
- OR: Freemium upsell to standalone premium tier ($75/month, chamber gets 30% rev share)

---

### Tier 4: Sponsor / Partner

**Inference:** This tier may be valuable but is not explicitly evidenced in source files.

**Access Level:** Audience intelligence for sponsor targeting and ROI measurement

**What They Can See:**
- Chamber member demographics (category mix, geographic distribution, business size proxies)
- Audience reach metrics (e.g., "243 law firms, 107 accounting firms, 96 wellness businesses in member base")
- Sponsorship targeting tools (filter members by category, rating, geography for B2B outreach)
- Event audience projections (if attendance data integrated)

**What They Cannot See:**
- Individual member contact info (privacy-protected)
- Full business intelligence on specific members
- Non-member data

**Conversion Logic:**
- Sold to current and prospective chamber sponsors
- Value proposition: "Quantify your sponsorship audience and identify B2B leads"

**Monetization Logic:**
- $500-2,000/month or $5K-$15K annual sponsor intelligence package
- Chamber keeps 50-70% of revenue

---

### Tier 5: Admin / Internal Analyst

**Inference:** Likely needed for chamber staff but not primary user type.

**Access Level:** Data management, quality assurance, and operational tools

**What They Can See:**
- Full database with edit capabilities
- Data quality dashboards (completeness, red flags, validation tiers)
- Enrichment workflow status
- User analytics (which members are engaging with platform)
- Batch operations (bulk categorization, geocoding, validation)

**What They Cannot See:**
- N/A â€” admin access is comprehensive

**Conversion Logic:**
- Included in chamber license
- 2-3 admin seats for chamber staff (membership director, economic development lead)

**Monetization Logic:**
- Bundled into chamber license pricing
- No incremental cost per admin seat (up to 5 seats)

---

## 6. PRD (Product Requirements Document)

### Product Name
The Terminal

### Working Tagline Options
- "Bloomberg for Local Business Ecosystems"
- "Chamber Intelligence, Systemized"
- "Make Your Business Ecosystem Legible"
- "Local Business Intelligence, Decision-Ready"
- "The Data Layer for Chamber Strategy"

**Recommendation:** "Bloomberg for Local Business Ecosystems" â€” clearest category positioning, implies sophistication and decision-grade quality.

### Objective
Build a repeatable, multi-tenant SaaS platform that enables chambers of commerce to manage membership growth, monitor ecosystem health, and provide member intelligence services using zero-marginal-cost OSINT data infrastructure.

### Users
1. Chamber Leadership (CEO, President, Board)
2. Chamber Membership Directors
3. Chamber Economic Development Leads
4. Chamber Members (SMB owners, professional services firms)
5. Non-Member Local Business Owners (teaser tier)
6. Sponsors/Partners (optional intelligence tier)
7. Chamber Admin/Analysts (data management tier)

### Jobs to Be Done

**For Chamber Leadership:**
- Identify the top 100 highest-recruitability businesses in our market
- Understand member vs non-member penetration by category and neighborhood
- Detect which members are at churn risk before renewal cycle
- Quantify ecosystem health for board reporting
- Prospect for sponsors using visibility and reputation scores
- Make data-driven decisions on program investment and resource allocation

**For Chamber Membership Directors:**
- Prioritize 50 businesses to call this week based on recruitability score
- Personalize outreach messaging based on business category and intelligence
- Monitor prospect engagement with chamber content
- Intervene with at-risk members before churn
- Build repeatable playbooks for category-specific recruitment

**For Chamber Members:**
- Understand my competitive position (rating, review count, price tier vs category average)
- Identify top customer delights and pain points synthesized from reviews
- Discover high-reputation businesses in complementary categories for partnerships
- Monitor local market trends and category undercurrents
- Access decision support for expansion, repositioning, or service changes

**For Non-Members:**
- Preview market intelligence to understand chamber value proposition
- Access basic benchmarking (my rating vs category average)
- Discover that chamber membership unlocks 10X more intelligence

### Key Workflows

**Workflow 1: Membership Director Recruitment Campaign**
1. Login to Leadership Dashboard
2. Filter businesses: non-members, high recruitability score (>70), category = restaurants, neighborhood = Miracle Mile
3. Review list of 23 businesses with intelligence cards (rating, review count, price tier, contact info, key signals)
4. Export to CSV or sync to CRM
5. Personalize outreach using voice of customer intelligence and category insights
6. Track outreach status in chamber CRM or integrated task management

**Workflow 2: Chamber Member Competitive Analysis**
1. Member logs into member portal
2. Views "My Business" dashboard with full intelligence profile
3. Navigates to "Category Peers" view (filters to food_beverage, neighborhood = Miracle Mile)
4. Reviews 42 category peers sorted by rating
5. Identifies top performers (4.8+ rating) and reviews their "top delights" to understand positioning
6. Discovers 3 complementary businesses (coffee roaster, bakery, event venue) for partnership outreach
7. Exports peer analysis to PDF for team discussion

**Workflow 3: Chamber CEO Board Reporting**
1. CEO logs into Leadership Dashboard
2. Navigates to "Ecosystem Health" module
3. Reviews member penetration by category (e.g., food_beverage: 38% penetration, legal: 52% penetration)
4. Identifies whitespace categories (healthcare: only 31% penetration despite 179 total businesses)
5. Reviews churn risk dashboard (12 members with declining ratings or red flags)
6. Exports "State of the Ecosystem" PDF report for quarterly board meeting
7. Board approves investment in healthcare business recruitment initiative based on data

**Workflow 4: Economic Development Gap Analysis**
1. Economic Development Lead logs in
2. Navigates to "Category Analysis" dashboard
3. Filters by neighborhood = Bird Road Corridor
4. Identifies category gaps (only 2 healthcare businesses, 8 wellness businesses vs 45 food_beverage)
5. Reviews PKP infrastructure businesses (construction, professional services) to understand support ecosystem
6. Exports findings to PDF for City Council presentation on business attraction priorities
7. City approves zoning changes to support medical office development

### Feature Set

**Core Data Layer:**
- Multi-source OSINT ingestion (OSM, Outscraper, SerpApi, Apify)
- Multi-agent validation and normalization pipeline
- 36-field canonical business schema with validation tiers
- Automated enrichment (geocoding, category mapping, review synthesis)
- Fuzzy deduplication and entity resolution
- Data provenance and confidence scoring
- Red flag detection and severity classification
- Source corroboration tracking

**Intelligence Layer:**
- PKP (Picks/Shovels/Platform) node classification
- Network edge mapping (dependencies, partnerships, supply chains)
- Voice of customer synthesis (top delights, pain points from reviews)
- Business scoring models:
  - Recruitability score (0-100)
  - Churn risk score (0-100)
  - Sponsorship value score (0-100)
  - Local influence score (0-100)
  - Market opportunity score (0-100)
- Category and neighborhood benchmarking
- Trend detection (rating changes, new entrants, closures)

**Dashboard / UX Layer:**
- Leadership Dashboard (penetration metrics, recruitment pipeline, ecosystem health)
- Member Dashboard (competitive positioning, category peers, partnership discovery)
- Business Profile Pages (comprehensive intelligence cards with all 36 fields)
- Category Explorer (drill-down by category with summary stats)
- Neighborhood Explorer (drill-down by geography with heatmaps)
- Comparison Views (side-by-side business comparisons)
- Search and Advanced Filtering (category, geography, rating, member status, scores)
- Export Capabilities (CSV, PDF reports)
- Alert System (new businesses, rating changes, churn risk, red flags)

**Conversion Layer:**
- Non-member teaser tier with gated intelligence
- Chamber membership conversion CTAs
- Freemium upsell prompts
- Value demonstration (show what's locked and why it matters)

**Monetization Layer:**
- Multi-tenant architecture with chamber-level data isolation
- Tiered access controls (leadership, member, non-member, admin)
- Usage analytics (which members are engaging, which intelligence is most viewed)
- Subscription management and billing integration

**Portability Layer:**
- Geographic configuration (zip codes, neighborhoods, city boundaries)
- Category taxonomy customization
- Chamber branding and white-labeling
- Data refresh cadence configuration
- Multi-chamber deployment tools

**Admin Layer:**
- Data quality dashboards (completeness, validation tiers, red flags)
- Enrichment workflow monitoring
- Batch operations (bulk categorization, geocoding, validation)
- User management (add/remove users, assign tiers, track engagement)
- System observability (data freshness, API usage, error rates)

### Release Priorities

**P0 (MVP â€” 0-30 days):**
- Business entity database (2,868 Coral Gables businesses, 36-field schema)
- Basic dashboards (leadership penetration view, member category peer view)
- Search and filter (category, geography, member status, rating)
- Business profile pages (comprehensive intelligence cards)
- Export to CSV
- Static deployment (React + Vite frontend, CSV data backend)
- Role-based access control (leadership vs member tiers)

**P1 (Pilot-Ready â€” 30-60 days):**
- Scoring models (recruitability, churn risk, sponsorship value)
- Advanced filtering (scores, validation tier, red flags, PKP node type)
- Comparison views (side-by-side business comparison)
- Voice of customer synthesis display (top delights, pain points)
- PDF export for reports
- Authentication and user management
- Teaser tier for non-members with conversion CTAs

**P2 (Production SaaS â€” 60-90 days):**
- Multi-tenant architecture with chamber-level data isolation
- Automated data refresh pipeline (monthly OSINT re-run)
- Alert system (new businesses, rating changes, churn risk)
- PKP network visualization
- Category and neighborhood trend dashboards
- API layer for CRM integration
- White-label branding per chamber
- Subscription and billing integration

**P3 (Scale â€” 90-180 days):**
- Predictive churn risk model (ML-based)
- Partnership affinity scoring
- Event-driven intelligence (real-time review monitoring)
- Mobile-responsive optimization
- Advanced analytics (cohort analysis, funnel metrics)
- Sponsor intelligence tier
- Multi-chamber admin console
- Geographic expansion tooling (1-click new city deployment)

### Constraints

**Data Constraints:**
- OSINT sources have API rate limits (SerpApi: 5,000/month, Outscraper: 500/month)
- Geocoding accuracy is 70% (30% of businesses missing lat/lon)
- Review synthesis quality depends on review volume (sparse for professional services)
- Category taxonomy has 691 businesses in "other" (manual re-categorization needed)
- Data freshness is batch-based (monthly refresh), not real-time

**Technical Constraints:**
- Current architecture is batch-pipeline + static frontend (not event-driven)
- No multi-tenancy yet (single-chamber deployment only)
- No authentication or user management (pilot uses single access link)
- No API layer (frontend reads CSVs directly)

**Product Constraints:**
- Chamber buyer is risk-averse (requires pilot validation before multi-year contract)
- SMB users have limited technical sophistication (complex BI tools fail)
- Chambers lack IT resources (platform must be zero-maintenance for customer)
- Data provenance and trust are critical (OSINT must be explainable and correctable)

**Commercial Constraints:**
- Chamber budget cycles are annual (sales must align with July-September budget planning)
- Chambers have existing CRM investments (integration or data export is table stakes)
- Chamber CEO turnover is common (product must survive leadership transitions)

### Non-Goals (MVP)

- **Real-time intelligence:** Batch monthly refresh is sufficient for MVP
- **ML-based predictive models:** Rule-based scoring is sufficient for pilot
- **Mobile app:** Responsive web is sufficient
- **CRM integration:** CSV export is sufficient for pilot
- **Multi-city deployment:** Coral Gables single-tenant is sufficient for pilot
- **White-label branding:** Single brand is sufficient for pilot
- **Event attendance tracking:** Focus on business intelligence, not event management
- **Member communication tools:** Focus on intelligence, not CRM replacement
- **Payment processing:** Pilot is license-based, not self-service subscription

### Success Criteria

**Pilot Success (Coral Gables Chamber):**
- 10+ chamber staff users actively logging in weekly
- 50+ member businesses access member portal
- Chamber recruits 15+ new members attributed to Terminal intelligence within 90 days
- Chamber renews annual contract at $12K-$18K
- Chamber provides case study and reference for sales

**Product Success (6 months):**
- 3-5 paying chamber customers
- $50K-$100K ARR
- 80%+ data completeness across key fields (phone, website, rating, address)
- <5% user-reported data quality issues
- 200+ member businesses using member tier across all chambers

**Category Success (12 months):**
- 10-20 paying chamber customers
- $200K-$400K ARR
- Repeatable 1-week deployment process for new chambers
- Case studies from 3 different chamber types (urban, suburban, industry-specific)
- Inbound chamber inquiries from category awareness

### Dependencies

**Internal Dependencies:**
- Frontend development (React/Vite dashboard build)
- Backend development (API layer, multi-tenancy, auth)
- Data engineering (automated refresh pipeline, scoring models)
- Design (UX/UI for leadership, member, and teaser tiers)

**External Dependencies:**
- Chamber pilot agreement and data access
- OSINT API access (SerpApi, Outscraper, Apify accounts)
- Authentication provider (Auth0, Clerk, or custom)
- Hosting infrastructure (Vercel, Netlify, AWS)
- Payment processing (Stripe for self-service tier)

**Customer Dependencies:**
- Chamber provides member list for member/non-member matching
- Chamber promotes member tier to existing members
- Chamber commits to 90-day pilot timeline
- Chamber provides feedback and iteration input

### Assumptions

- Chambers will pay $12K-$24K/year for this platform
- Chamber members will engage with market intelligence (not just networking)
- OSINT data quality is sufficient for decision-making with proper confidence scoring
- Batch monthly refresh is acceptable (vs real-time)
- Chambers can operationalize intelligence (recruitment campaigns, churn interventions)
- Non-member teaser tier will drive chamber membership conversion
- Platform can be deployed to new chambers in <1 week with geographic configuration
- Chambers lack internal data/analytics resources and will value turnkey solution

---

## 7. Feature Architecture

### Core Data Layer

**Feature: Multi-Source OSINT Ingestion**
- **Description:** Automated collection from OpenStreetMap, Outscraper (Google Maps), SerpApi (Google Maps + Search), Apify (Google Places), and business directories
- **Target User:** Internal data operations (automated, no user interaction)
- **Business Value:** Zero marginal cost data acquisition, comprehensive coverage (2,868 businesses from 4 sources in Coral Gables)
- **Technical Complexity:** Medium (API integrations, rate limit management, error handling)
- **Priority:** P0 (MVP foundation)
- **Status:** Built (evidenced in README â€” Agent 1 with 5 source adapters, concurrent processing, retry logic)

**Feature: Fuzzy Deduplication**
- **Description:** Normalized business name matching with fuzzy string matching to consolidate records from multiple sources
- **Target User:** Internal data quality (automated)
- **Business Value:** Prevents duplicate business records, increases data integrity
- **Technical Complexity:** Medium (fuzzywuzzy library, key-based O(1) lookups)
- **Priority:** P0 (MVP foundation)
- **Status:** Built (evidenced in README â€” Agent 2 uses fuzzywuzzy for deduplication)

**Feature: 36-Field Canonical Schema**
- **Description:** Structured business entity model covering identity, location, classification, OSINT, validation, PKP, and metadata fields
- **Target User:** All users (foundation for all intelligence displays)
- **Business Value:** Consistent, structured data enables all downstream features
- **Technical Complexity:** Low (schema definition in shared constants)
- **Priority:** P0 (MVP foundation)
- **Status:** Built (evidenced in CSV â€” 36 columns including business_id, name, contact, location, category, rating, PKP fields, validation fields)

**Feature: Validation Tier Classification**
- **Description:** Automatic classification of businesses into High/Moderate/Low validation tiers based on data completeness and corroboration
- **Target User:** Chamber leadership, data analysts
- **Business Value:** Trust signaling â€” users know which businesses have high-confidence vs low-confidence data
- **Technical Complexity:** Low (rule-based scoring on completeness %)
- **Priority:** P0 (MVP foundation)
- **Status:** Built (evidenced in CSV â€” validation_tier field: High=1,174, Moderate=1,319, Low=368)

**Feature: Red Flag Detection**
- **Description:** Automated detection of data quality issues, geographic anomalies, category mapping failures, and operational risks
- **Target User:** Chamber leadership, membership directors
- **Business Value:** Prevents outreach to poor-quality records, surfaces data correction needs
- **Technical Complexity:** Low (rule-based detection: missing fields, out-of-bounds coordinates, unmapped categories)
- **Priority:** P0 (MVP foundation)
- **Status:** Built (evidenced in CSV â€” red_flag_present: 1,471 flagged, red_flag_severity: Operational=951, Critical=520)

**Feature: Source Corroboration Tracking**
- **Description:** Track which OSINT sources corroborate each business record (increases confidence when multiple sources agree)
- **Target User:** Data analysts, advanced chamber users
- **Business Value:** Higher corroboration = higher trust; enables source quality auditing
- **Technical Complexity:** Low (track source names in corroboration_sources field)
- **Priority:** P1 (pilot-ready)
- **Status:** Built (evidenced in CSV â€” corroboration_sources and corroboration_count fields)

### Intelligence Layer

**Feature: PKP Node Classification**
- **Description:** Classify businesses as asset (end consumer), platform (intermediary/aggregator), or infrastructure (picks/shovels supplier) using business category and keyword rules
- **Target User:** Chamber leadership, economic development
- **Business Value:** Understand ecosystem structure (e.g., "We have 720 platforms and only 499 infrastructure â€” undersupplied in B2B services")
- **Technical Complexity:** Medium (rule-based classification with category mapping)
- **Priority:** P1 (pilot-ready)
- **Status:** Built (evidenced in CSV â€” pkp_node_type: asset=1,649, platform=720, infrastructure=499)

**Feature: PKP Edge Mapping**
- **Description:** Identify dependencies, partnerships, and supply chain relationships between businesses (e.g., restaurant depends on Sysco, uses Square POS, listed on Yelp)
- **Target User:** Chamber leadership, economic development
- **Business Value:** Understand ecosystem interconnections, identify partnership opportunities, detect supply chain risks
- **Technical Complexity:** High (requires business category knowledge, supply chain inference)
- **Priority:** P2 (production SaaS)
- **Status:** Partial (evidenced in CSV â€” pkp_edges_summary field populated with generic summaries like "CGCC member network", "Miracle Mile dining cluster")

**Feature: Voice of Customer Synthesis**
- **Description:** Extract top delights and pain points from review text using LLM synthesis
- **Target User:** Chamber members, membership directors
- **Business Value:** Understand customer sentiment without reading 200+ reviews; identify category-wide themes
- **Technical Complexity:** High (requires review scraping + LLM API for synthesis)
- **Priority:** P1 (pilot-ready)
- **Status:** Partial (evidenced in CSV â€” top_delights and top_pain_points fields exist but mostly empty; README mentions future synthesis work)

**Feature: Business Scoring Models**
- **Description:** Calculate 0-100 scores for recruitability, churn risk, sponsorship value, influence, and market opportunity
- **Target User:** Chamber leadership, membership directors
- **Business Value:** Prioritize outreach, detect at-risk members, identify high-value sponsors
- **Technical Complexity:** Medium (rule-based or ML-based scoring using rating, review count, category, member status, trend data)
- **Priority:** P1 (pilot-ready)
- **Status:** Not built (evidenced in README â€” lead scoring exists for leadgen pipeline but not for business intelligence use case)

**Recommendation:** Build rule-based v1 of scoring models:
- **Recruitability Score:** (rating * 20) + (review_count / 10) + (category_priority_weight * 20) + (validation_tier_boost)
- **Churn Risk Score:** Inverse of (days_since_renewal + rating_trend + engagement_score)
- **Sponsorship Value Score:** (rating * 20) + (review_count / 5) + (category_visibility_weight * 30)

**Feature: Category Benchmarking**
- **Description:** Calculate category-level metrics (average rating, median review count, price tier distribution, member penetration %)
- **Target User:** Chamber members, membership directors
- **Business Value:** Members understand "My 4.3 rating is above category average of 4.1"; Directors understand "Only 38% of restaurants are members"
- **Technical Complexity:** Low (SQL-style aggregations on category groups)
- **Priority:** P0 (MVP)
- **Status:** Not built (data supports it, needs frontend display)

**Feature: Trend Detection**
- **Description:** Identify rating changes, new business formations, business closures, category growth/decline over time
- **Target User:** Chamber leadership, economic development
- **Business Value:** Early detection of ecosystem shifts, churn risk, growth opportunities
- **Technical Complexity:** Medium (requires time-series data and change detection logic)
- **Priority:** P2 (production SaaS)
- **Status:** Not built (requires historical snapshots; current data is single point-in-time)

### Dashboard / UX Layer

**Feature: Leadership Penetration Dashboard**
- **Description:** Visual display of member vs non-member penetration by category and geography with charts, tables, and filters
- **Target User:** Chamber CEO, membership director
- **Business Value:** Answer "What % of restaurants are members?" at a glance
- **Technical Complexity:** Medium (frontend chart library, aggregation logic)
- **Priority:** P0 (MVP)
- **Status:** Partial (evidenced in README â€” 15+ dashboard pages exist in React/Vite app, but specific penetration view not confirmed)

**Feature: Member Category Peer View**
- **Description:** Chamber members see all businesses in their category with rating, review count, price tier, and contact info
- **Target User:** Chamber members
- **Business Value:** Competitive intelligence and partnership discovery
- **Technical Complexity:** Low (filter + table display)
- **Priority:** P0 (MVP)
- **Status:** Likely built (README mentions "Business Explorer" and "Compare" pages)

**Feature: Business Profile Pages**
- **Description:** Comprehensive intelligence card for each business with all 36 fields, PKP classification, voice of customer, scores, and red flags
- **Target User:** All users
- **Business Value:** Deep-dive intelligence on any business
- **Technical Complexity:** Medium (layout design, conditional display based on tier)
- **Priority:** P0 (MVP)
- **Status:** Likely built (README mentions "Business Explorer" with detailed profiles)

**Feature: Advanced Search and Filtering**
- **Description:** Multi-dimensional filtering (category, geography, rating range, member status, validation tier, scores, red flags, PKP node type)
- **Target User:** Chamber leadership, membership directors
- **Business Value:** Rapid audience segmentation for campaigns
- **Technical Complexity:** Medium (frontend filter UI + query logic)
- **Priority:** P0 (MVP)
- **Status:** Likely built (README mentions 15+ pages with filtering capabilities)

**Feature: Comparison Views**
- **Description:** Side-by-side comparison of 2-5 businesses across all intelligence dimensions
- **Target User:** Chamber members, membership directors
- **Business Value:** Understand competitive positioning or evaluate recruitment targets
- **Technical Complexity:** Low (table layout with multi-select)
- **Priority:** P1 (pilot-ready)
- **Status:** Likely built (README mentions "Compare" page)

**Feature: Map Views**
- **Description:** Geographic visualization of businesses with lat/lon on interactive map, color-coded by category, rating, or member status
- **Target User:** Chamber leadership, economic development
- **Business Value:** Understand geographic clustering, neighborhood gaps, expansion opportunities
- **Technical Complexity:** Medium (Leaflet or Mapbox integration)
- **Priority:** P2 (production SaaS)
- **Status:** Unknown (not mentioned in README)

**Feature: Export Capabilities**
- **Description:** Export filtered business lists to CSV or generate PDF reports with charts and tables
- **Target User:** Chamber leadership, membership directors
- **Business Value:** CRM integration, board reporting, offline analysis
- **Technical Complexity:** Low (CSV export via browser download, PDF via libraries like jsPDF)
- **Priority:** P0 (MVP for CSV), P1 (pilot-ready for PDF)
- **Status:** Unknown (not mentioned in README)

**Feature: Alert System**
- **Description:** Email or in-app alerts for new businesses discovered, rating changes >0.5 stars, member churn risk triggers, red flag emergence
- **Target User:** Chamber leadership, membership directors
- **Business Value:** Proactive intelligence delivery, no need to check dashboard daily
- **Technical Complexity:** Medium (backend job scheduler, notification system)
- **Priority:** P2 (production SaaS)
- **Status:** Not built

### Conversion Layer

**Feature: Non-Member Teaser Tier**
- **Description:** Limited preview of intelligence with locked/blurred content and conversion CTAs
- **Target User:** Non-member local businesses
- **Business Value:** Lead generation for chamber membership, demonstrate value before purchase
- **Technical Complexity:** Low (conditional rendering based on user tier)
- **Priority:** P1 (pilot-ready)
- **Status:** Not built

**Feature: Chamber Membership Conversion CTAs**
- **Description:** Strategic placement of "Unlock with Chamber Membership" buttons on locked intelligence
- **Target User:** Non-members
- **Business Value:** Drive membership conversion
- **Technical Complexity:** Low (frontend CTA design + chamber contact form integration)
- **Priority:** P1 (pilot-ready)
- **Status:** Not built

**Feature: Freemium Upsell Prompts**
- **Description:** Prompts for non-members to upgrade to standalone premium access ($75/month) if not ready for chamber membership
- **Target User:** Non-members
- **Business Value:** Revenue diversification (capture value from businesses not ready for chamber membership)
- **Technical Complexity:** Medium (payment integration required)
- **Priority:** P3 (scale)
- **Status:** Not built

### Monetization Layer

**Feature: Multi-Tenant Architecture**
- **Description:** Chamber-level data isolation, branding, and user management
- **Target User:** Multiple chambers (each chamber sees only their geographic data and users)
- **Business Value:** Enables 1:many sales model, scales beyond single chamber
- **Technical Complexity:** High (database schema with tenant_id, RBAC, data filtering)
- **Priority:** P2 (production SaaS)
- **Status:** Not built (current architecture is single-tenant)

**Feature: Tiered Access Controls**
- **Description:** Role-based access control for leadership, member, non-member, admin tiers
- **Target User:** All user types
- **Business Value:** Protects intelligence, drives conversion, enables monetization
- **Technical Complexity:** Medium (auth system + role checks in frontend/backend)
- **Priority:** P1 (pilot-ready)
- **Status:** Not built (README mentions no authentication yet)

**Feature: Usage Analytics**
- **Description:** Track which users log in, which intelligence they view, which exports they run
- **Target User:** Chamber leadership (secondary: internal product team)
- **Business Value:** Understand engagement, identify power users, detect low-engagement members
- **Technical Complexity:** Medium (event tracking + analytics dashboard)
- **Priority:** P2 (production SaaS)
- **Status:** Not built

**Feature: Subscription Management**
- **Description:** Self-service subscription signup, payment processing, tier upgrades, cancellation
- **Target User:** Chamber admins (self-service tier)
- **Business Value:** Reduces sales friction, enables PLG motion
- **Technical Complexity:** High (Stripe integration, billing logic, subscription state management)
- **Priority:** P3 (scale)
- **Status:** Not built

### Portability Layer

**Feature: Geographic Configuration**
- **Description:** Define zip codes, city boundaries, neighborhoods for new chamber deployments
- **Target User:** Internal deployment team
- **Business Value:** Enables repeatable 1-week deployment for new chambers
- **Technical Complexity:** Low (configuration file with geo constants)
- **Priority:** P2 (production SaaS)
- **Status:** Partial (README shows _shared.py with geo constants, but manual editing required)

**Feature: Category Taxonomy Customization**
- **Description:** Allow chambers to define custom business categories beyond default taxonomy
- **Target User:** Chamber admins
- **Business Value:** Flexibility for industry-specific chambers or regional category differences
- **Technical Complexity:** Medium (UI for category management + data migration)
- **Priority:** P3 (scale)
- **Status:** Not built

**Feature: White-Label Branding**
- **Description:** Chamber-specific logos, colors, domain names
- **Target User:** Chamber admins
- **Business Value:** Platform feels native to chamber brand rather than 3rd-party tool
- **Technical Complexity:** Low (theme configuration, CSS variables)
- **Priority:** P2 (production SaaS)
- **Status:** Not built

**Feature: Data Refresh Cadence Configuration**
- **Description:** Allow chambers to set monthly, quarterly, or on-demand data refresh
- **Target User:** Chamber admins
- **Business Value:** Balance data freshness with API cost
- **Technical Complexity:** Medium (scheduler configuration)
- **Priority:** P3 (scale)
- **Status:** Not built (currently manual pipeline runs)

### Admin Layer

**Feature: Data Quality Dashboards**
- **Description:** Visualize completeness %, red flag distribution, validation tier breakdown, source corroboration metrics
- **Target User:** Chamber admins, internal data ops
- **Business Value:** Proactive data quality management, prioritize enrichment effort
- **Technical Complexity:** Low (aggregation + chart display)
- **Priority:** P1 (pilot-ready)
- **Status:** Partial (data exists in CSV, needs frontend display)

**Feature: Enrichment Workflow Monitoring**
- **Description:** Track status of batch enrichment jobs (geocoding, review synthesis, scoring) with progress bars and error logs
- **Target User:** Chamber admins, internal data ops
- **Business Value:** Transparency into system health, troubleshoot failures
- **Technical Complexity:** Medium (job queue + status API)
- **Priority:** P2 (production SaaS)
- **Status:** Not built

**Feature: Batch Operations**
- **Description:** Bulk re-categorization, geocoding, validation tier recalculation via admin UI
- **Target User:** Chamber admins
- **Business Value:** Rapid data correction, category cleanup (e.g., resolve 691 "other" businesses)
- **Technical Complexity:** Medium (backend batch processor + admin UI)
- **Priority:** P2 (production SaaS)
- **Status:** Not built (currently manual via Python scripts)

**Feature: User Management**
- **Description:** Add/remove users, assign tiers, track engagement, deactivate accounts
- **Target User:** Chamber admins
- **Business Value:** Self-service user administration reduces support burden
- **Technical Complexity:** Low (CRUD operations on user table + role assignment)
- **Priority:** P1 (pilot-ready)
- **Status:** Not built (no auth system yet)

**Feature: System Observability**
- **Description:** Monitor data freshness (last refresh timestamp), API usage (rate limits remaining), error rates, uptime
- **Target User:** Internal ops team
- **Business Value:** Proactive issue detection, capacity planning
- **Technical Complexity:** Medium (logging + monitoring dashboard)
- **Priority:** P2 (production SaaS)
- **Status:** Partial (README mentions structured logging to JSONL, but no dashboard)

---

## 8. Use Case Expansion

### Use Case 1: Chamber Leadership â€” Strategic Membership Growth

**Primary Jobs:**
- Identify top 100 highest-recruitability non-member businesses
- Understand member penetration by category (which categories are underrepresented)
- Detect member churn risk before renewal cycle
- Build board-ready ecosystem health reports

**Primary Screens:**
1. **Penetration Dashboard:** Category Ã— Member Status matrix showing member count, non-member count, penetration %, growth opportunity
2. **Recruitment Pipeline:** Filtered list of non-members sorted by recruitability score with intelligence cards
3. **Churn Risk Monitor:** List of members with declining ratings, red flags, or low engagement
4. **Ecosystem Health:** Charts showing category diversity, rating distribution, neighborhood vitality, PKP balance

**High-Value Workflows:**

**Workflow A: Quarterly Recruitment Campaign Planning**
1. CEO logs in, navigates to Penetration Dashboard
2. Identifies "food_beverage" category: 417 total businesses, 158 members (38% penetration), 259 non-members
3. Filters non-members by recruitability score >70, rating >4.0, validation tier = High
4. Reviews list of 47 high-priority targets
5. Exports to CSV with contact info, intelligence summary
6. Membership Director loads into CRM, launches personalized outreach campaign
7. Result: 12 new restaurant members recruited in 90 days (vs historical 5/quarter)

**Workflow B: Churn Risk Intervention**
1. Membership Director receives alert: "8 members with churn risk score >75"
2. Reviews list: 3 businesses with rating decline (4.5 â†’ 3.9 over 6 months), 2 with red flags (address mismatch), 3 with no chamber event attendance
3. Prioritizes 3 rating-decline businesses for outreach
4. Calls each business, offers operational support, connects to member services
5. Result: 2 of 3 renew membership, 1 exits but provides exit interview feedback

**Workflow C: Board Reporting**
1. CEO prepares for quarterly board meeting
2. Navigates to Ecosystem Health dashboard
3. Exports "State of the Ecosystem" PDF report with:
   - Total businesses: 2,868 (up from 2,744 last quarter)
   - Member count: 843 (up 15 from 828)
   - Category diversity: 24 active categories (healthcare growing +8%, retail declining -3%)
   - Average member rating: 4.5 vs non-member 4.2
   - Penetration highlights: Legal 52% (strong), Healthcare 31% (opportunity), Retail 41% (stable)
4. Board approves $50K investment in healthcare business recruitment initiative
5. Result: Data-driven strategy replaces anecdotal board discussions

**Key Decisions Enabled:**
- Which 50 businesses to prioritize for recruitment this month
- Which categories to focus recruitment effort (healthcare, wellness, construction show low penetration)
- Which members need churn intervention
- How to allocate staff time (60% recruitment, 30% retention, 10% ecosystem development)
- What sponsorship packages to create (target high-visibility businesses in underrepresented categories)

**Insights That Matter Most:**
- Member vs non-member penetration by category (recruitment targeting)
- Churn risk scores (retention prioritization)
- Ecosystem health trends (board accountability)
- Recruitability scores (sales efficiency)
- Category gaps (strategic growth opportunities)

**Alerts / Reports / Exports Needed:**
- Weekly: New businesses discovered (potential recruits)
- Monthly: Churn risk report (members at risk)
- Quarterly: Ecosystem health PDF report (board meeting)
- On-demand: Recruitment campaign export (CSV with top 100 targets)
- On-demand: Category penetration analysis (which categories are underrepresented)

**Premium Upsell Opportunities:**
- Advanced scoring models (ML-based churn prediction)
- Custom reports and white-label PDFs
- API access for CRM integration
- Real-time alerts (vs batch daily)
- Historical trend analysis (12+ months of data)

---

### Use Case 2: Chamber Members â€” Local Market Intelligence

**Primary Jobs:**
- Understand competitive positioning within category
- Access voice-of-customer intelligence (top delights, pain points)
- Discover partnership opportunities with complementary businesses
- Monitor local market trends and category dynamics
- Justify chamber membership ROI to partners/investors

**Primary Screens:**
1. **My Business Dashboard:** Comprehensive intelligence profile with rating, reviews, voice of customer, category benchmarks, PKP classification
2. **Category Peers:** All businesses in same category with rating, review count, price tier, neighborhood
3. **Partnership Discovery:** Complementary businesses filtered by category, rating, geography with contact info
4. **Market Trends:** Category-level insights on rating trends, new entrants, neighborhood dynamics

**High-Value Workflows:**

**Workflow A: Competitive Positioning Analysis**
1. Restaurant owner logs into member portal
2. Views "My Business" dashboard: 4.3 rating, 87 reviews, $$ price tier, Miracle Mile location
3. Navigates to "Category Peers" (food_beverage, Miracle Mile)
4. Sees 42 restaurants in same neighborhood sorted by rating
5. Identifies positioning: 18 restaurants rated higher (4.4-4.9), 24 rated lower (3.2-4.2)
6. Drills into top 5 performers (4.7+ rating)
7. Reviews their "top delights": "exceptional service", "fresh ingredients", "creative menu", "ambiance"
8. Compares to own "top delights": "friendly staff", "good value", "quick service"
9. Insight: Top performers emphasize quality/creativity; own business emphasizes value/speed
10. Strategic decision: Invest in menu innovation and ingredient quality to compete with top tier
11. Result: Rating increases from 4.3 to 4.6 over 6 months, review count grows 30%

**Workflow B: Partnership Discovery**
1. Fitness studio owner seeks partnership opportunities
2. Navigates to "Partnership Discovery" tool
3. Filters: category = wellness OR healthcare OR food_beverage (healthy), rating >4.5, neighborhood = Coral Gables
4. Discovers 12 complementary businesses: 3 health-focused restaurants, 4 wellness spas, 2 nutrition counselors, 3 yoga studios
5. Exports contact list with intelligence summaries
6. Reaches out to top 5 with partnership proposal (cross-promotion, bundled packages, referral network)
7. Result: 3 partnerships formed, 20% increase in new client referrals

**Workflow C: Voice of Customer Analysis**
1. Law firm partner reviews quarterly performance
2. Navigates to "My Business" dashboard
3. Views "Top Delights": "responsive communication", "expert knowledge", "client care"
4. Views "Top Pain Points": "billing transparency", "long wait times for appointments"
5. Insight: Clients value expertise but frustrated by operational friction
6. Strategic decision: Implement transparent billing portal and online appointment scheduling
7. Result: Client satisfaction improves, referral rate increases 15%

**Key Decisions Enabled:**
- Where to invest in service improvements (based on category-wide pain points)
- How to differentiate from competitors (identify positioning gaps)
- Which businesses to partner with for cross-promotion or referral networks
- Whether to expand to new location or service line (whitespace analysis)
- How to justify chamber membership ROI (quantified market intelligence value)

**Insights That Matter Most:**
- My rating vs category average (competitive positioning)
- Top delights and pain points (voice of customer)
- Category peer landscape (competitive intelligence)
- Complementary businesses for partnerships (growth opportunities)
- Neighborhood trends (geographic expansion analysis)

**Alerts / Reports / Exports Needed:**
- Monthly: Voice of customer summary (synthesized from new reviews)
- Quarterly: Competitive positioning report (rating vs peers, new entrants, category trends)
- On-demand: Partnership prospect list (filtered by criteria)
- On-demand: Category peer analysis export (CSV or PDF)

**Premium Upsell Opportunities:**
- Deeper voice of customer synthesis (sentiment analysis, theme clustering)
- Competitive monitoring alerts (new entrants in category, rating changes of peers)
- Partnership affinity scoring (which businesses are best fit for collaboration)
- Historical trend analysis (my rating trend vs category trend over 12 months)
- Advanced filters (e.g., "Show me all 4.5+ rated restaurants within 1 mile that opened in last 12 months")

---

### Use Case 3: Non-Members â€” Chamber Membership Conversion

**Primary Jobs:**
- Understand what chamber membership offers beyond networking
- Preview market intelligence without commitment
- Compare their business to category peers (limited view)
- Experience information asymmetry that creates desire for full access

**Primary Screens:**
1. **My Business Teaser:** Basic profile with rating, category, neighborhood + locked intelligence
2. **Category Peek:** Top 5 category peers (name + rating only, details locked)
3. **Chamber Value Proposition:** Explainer of what members unlock
4. **Membership Conversion CTA:** Prominent "Unlock Full Intelligence" button with chamber contact info

**High-Value Workflows:**

**Workflow A: Non-Member Discovery**
1. Non-member restaurant owner receives email from chamber: "See your business intelligence report"
2. Clicks link, lands on teaser tier login (email-gated, no payment)
3. Views "My Business Teaser": Name, 4.2 rating, 73 reviews, food_beverage category, Bird Road Corridor location
4. Sees blurred sections: "Voice of Customer: Top Delights (LOCKED)", "Category Peers: 42 businesses (LOCKED)", "Partnership Opportunities: 8 matches (LOCKED)"
5. Clicks "View Category Peers"
6. Sees list of 5 businesses: "Restaurant A (4.8 stars), Restaurant B (4.6 stars), Restaurant C (4.5 stars), Restaurant D (4.3 stars), Restaurant E (4.1 stars)" â€” names visible but no contact info, no intelligence details
7. Sees CTA: "Chamber members see full intelligence on 42 category peers, including ratings, reviews, voice of customer, contact info, and partnership opportunities. Join Coral Gables Chamber to unlock."
8. Clicks "Learn More" â†’ chamber membership page with pricing ($800/year)
9. Considers value: "If I join, I get competitive intelligence on 42 restaurants, voice of customer insights, partnership discovery... that's worth $800/year"
10. Calls chamber, schedules membership meeting
11. Result: Chamber converts 15-20% of teaser tier users to members (vs 5% historical conversion from generic outreach)

**Workflow B: Non-Member Benchmarking**
1. Non-member accounting firm googles "Coral Gables accounting firms"
2. Finds The Terminal landing page via SEO or chamber referral
3. Signs up for teaser tier (free, email-gated)
4. Views "My Business Teaser": 4.0 rating, 12 reviews, accounting category, Ponce de Leon Corridor
5. Sees category benchmark (visible): "Average rating for accounting firms: 4.4 stars (you are below average)"
6. Sees locked insight: "Top 10 accounting firms in Coral Gables (LOCKED - Chamber members only)"
7. Insight: "I'm underperforming vs peers and I don't know why. Chamber members get voice of customer insights and competitive intelligence."
8. Converts to chamber membership to access full intelligence
9. Result: Chamber gains member, member improves operations using intelligence

**Key Decisions Enabled:**
- Whether to join chamber (ROI calculation based on intelligence value)
- How their business compares to category peers (limited benchmarking creates curiosity)
- What they're missing by not being a member (information asymmetry creates desire)

**Insights That Matter Most:**
- My rating vs category average (limited benchmarking)
- Number of category peers (creates curiosity: "42 other restaurants in my area â€” what do chamber members know about them?")
- Locked intelligence previews (demonstrate value without giving away too much)
- Chamber membership benefits (what unlocks with membership)

**Alerts / Reports / Exports Needed:**
- None (teaser tier is read-only, no alerts or exports)

**Premium Upsell Opportunities:**
- Standalone premium tier ($75/month) for businesses not ready for chamber membership
- "Try before you buy" 30-day trial of member tier
- Referral incentive: "Refer 3 businesses to chamber, get 3 months of member tier free"

---

## 9. Information Architecture

### Top-Level Navigation

**For Chamber Leadership Tier:**
1. **Home** â€” Overview dashboard with key metrics (member count, penetration %, recent activity, alerts)
2. **Businesses** â€” Browse/search all businesses with advanced filters
3. **Members** â€” Member-only view with churn risk, engagement tracking
4. **Recruitment** â€” Non-member pipeline with recruitability scores, outreach tracking
5. **Ecosystem** â€” Category/neighborhood analysis, PKP network, health metrics
6. **Reports** â€” Generate and export PDF/CSV reports
7. **Settings** â€” User management, data refresh, system config

**For Chamber Member Tier:**
1. **My Business** â€” Comprehensive intelligence profile
2. **Category Peers** â€” Competitive analysis within category
3. **Partnerships** â€” Discovery tool for complementary businesses
4. **Market Trends** â€” Category and neighborhood insights
5. **Resources** â€” Chamber events, member benefits, contact info

**For Non-Member Teaser Tier:**
1. **My Business** â€” Limited profile with locked sections
2. **Join Chamber** â€” Membership conversion page
3. **Explore** â€” Teaser view of category peers (names only)

### Sub-Pages and Modules

**Businesses (Leadership)**
- Business Search (multi-filter search interface)
- Business Profile (comprehensive intelligence card for single business)
- Business Compare (side-by-side comparison of 2-5 businesses)
- Business List (table view with sortable columns)
- Map View (geographic visualization with category/rating color coding)

**Members (Leadership)**
- Member List (all chamber members with engagement metrics)
- Churn Risk Monitor (members at risk with scores and interventions)
- Member Engagement (who's using the platform, which intelligence they access)
- Renewal Pipeline (upcoming renewals with risk flags)

**Recruitment (Leadership)**
- Prospect List (non-members sorted by recruitability score)
- Outreach Tracker (track contact attempts, status, notes)
- Category Gaps (categories with low penetration)
- Geographic Whitespace (neighborhoods underrepresented)
- Recruitment Playbooks (templates for category-specific outreach)

**Ecosystem (Leadership)**
- Category Analysis (penetration, diversity, trends by category)
- Neighborhood Analysis (business counts, rating distributions, member penetration by geography)
- PKP Network (visual network graph of asset/platform/infrastructure relationships)
- Ecosystem Health (overall vitality metrics: diversity index, rating distribution, growth indicators)
- Trend Dashboard (time-series charts of member count, category shifts, rating changes)

**My Business (Member)**
- Intelligence Profile (36-field comprehensive view)
- Voice of Customer (top delights, pain points synthesized from reviews)
- Category Benchmarking (my metrics vs category averages)
- Competitive Positioning (where I rank among category peers)
- PKP Classification (my role in ecosystem, dependencies, opportunities)

**Category Peers (Member)**
- Peer List (all businesses in same category, filterable by geography/rating)
- Peer Profiles (click into any peer for full intelligence)
- Peer Compare (side-by-side comparison)
- Category Averages (benchmarks for rating, review count, price tier)

**Partnerships (Member)**
- Discovery Tool (filter complementary businesses by category, rating, geography)
- Partnership Prospects (ranked list with contact info)
- Partnership Playbooks (suggested collaboration models: referral network, cross-promotion, bundled services)

**Market Trends (Member)**
- Category Trends (rating trends, new entrants, growth/decline signals)
- Neighborhood Trends (business formation, category mix shifts, vitality indicators)
- Undercurrents (macro trends affecting category: e.g., delivery app pressure, labor shortage, rising rents)

### Dashboards

**Leadership Home Dashboard:**
- Member count (843) + trend (â†‘15 this quarter)
- Non-member count (2,041) + coverage (2,868 total businesses, 66% of target 4,400)
- Penetration % by top 5 categories
- Churn risk alert count (8 members at risk)
- New businesses discovered this month (24)
- Ecosystem health score (e.g., diversity index 0.72/1.0)
- Recent activity feed (new members, rating changes, red flags)

**Member Home Dashboard:**
- My rating + trend (4.3 â†‘0.2 vs last quarter)
- Category ranking (#18 of 42 in food_beverage)
- Recent reviews (last 5 reviews with sentiment)
- Voice of customer summary (top 3 delights, top 3 pain points)
- Partnership opportunities (3 new matches this week)
- Chamber events (upcoming mixers, programs)

**Non-Member Teaser Dashboard:**
- My business card (name, category, rating, neighborhood)
- Category benchmark (my rating vs category average â€” LIMITED)
- Locked sections with CTAs ("See 42 category peers â€” Join Chamber")
- Chamber value proposition

### Search and Filters

**Advanced Filter Panel (Leadership):**
- **Category:** Multi-select (food_beverage, legal, healthcare, etc.)
- **Geography:** Multi-select (Miracle Mile, Bird Road Corridor, etc.) or radius from address
- **Member Status:** Member / Non-member / All
- **Rating Range:** Slider (1.0-5.0)
- **Review Count Range:** Slider (0-500+)
- **Price Tier:** $, $$, $$$, $$$$
- **Validation Tier:** High / Moderate / Low
- **Red Flags:** Yes / No / All
- **PKP Node Type:** Asset / Platform / Infrastructure
- **Scores:** Recruitability (0-100), Churn Risk (0-100), Sponsorship Value (0-100)
- **Data Completeness:** Has phone, has website, has address, has lat/lon

**Search:**
- Full-text search across business_name, category, neighborhood, contact_name
- Autocomplete suggestions as user types
- Search results ranked by relevance + scoring models

### Entity Pages

**Business Profile Page Structure:**
1. **Header:** Business name, category, rating, review count, member badge, PKP node type icon
2. **Contact:** Phone, website, address, contact name (with validation tier indicator)
3. **Location:** Map pin, neighborhood, lat/lon, postcode
4. **Intelligence:** Voice of customer (top delights, pain points), key signals, risks, recommended actions
5. **Classification:** Category primary/secondary, price tier, PKP node type, edges summary
6. **Validation:** OSINT confidence, validation tier, red flags, source corroboration
7. **Meta:** Source file, batch ID, last reviewed date
8. **Actions:** Export to PDF, add to recruitment list, compare with peers, view category peers

### Compare Views

**Side-by-Side Comparison Table:**
- Select 2-5 businesses
- Display all 36 fields in table format with highlighting for differences
- Score comparison (recruitability, churn risk, sponsorship value)
- Voice of customer comparison (delights, pain points)
- Export comparison to PDF

### Reports

**Pre-Built Reports (Leadership):**
1. **State of the Ecosystem** â€” Comprehensive PDF with category analysis, penetration metrics, ecosystem health, member trends
2. **Recruitment Campaign Brief** â€” Top 100 prospects with intelligence summaries, contact info, recommended messaging
3. **Churn Risk Report** â€” Members at risk with scores, red flags, intervention recommendations
4. **Sponsorship Prospectus** â€” High-value businesses for sponsor targeting with visibility scores
5. **Category Gap Analysis** â€” Categories with low penetration, whitespace opportunities

**Custom Reports (Leadership):**
- User-defined filters â†’ generate PDF or CSV export
- Save filter presets for recurring reports (e.g., "Monthly New Business Report")

### Alerts

**Alert Types (Leadership):**
- **New Business Discovered:** Daily/weekly digest of businesses added to database
- **Rating Change:** Member rating drops >0.5 stars or rises >0.5 stars
- **Churn Risk:** Member crosses churn risk threshold (score >75)
- **Red Flag:** New red flag detected on member business
- **Milestone:** Member count crosses threshold (e.g., 850 members)

**Alert Delivery:**
- Email digest (daily or weekly)
- In-app notification badge
- SMS for critical alerts (optional, premium feature)

**Alert Settings (Leadership):**
- Configure alert types enabled/disabled
- Set thresholds (e.g., churn risk >75 vs >50)
- Choose delivery method (email, in-app, SMS)

### Settings

**User Management (Admin):**
- Add/remove users
- Assign tiers (leadership, member, admin)
- Track user activity (last login, pages viewed)
- Deactivate accounts

**Data Management (Admin):**
- Trigger data refresh (run OSINT pipeline)
- View data quality dashboard (completeness, red flags, validation tiers)
- Batch operations (re-categorize, geocode, validate)
- Export full database to CSV

**System Config (Admin):**
- Chamber branding (logo, colors, domain)
- Geographic boundaries (zip codes, neighborhoods)
- Category taxonomy (add/edit categories)
- Refresh cadence (monthly, quarterly, on-demand)

### Onboarding

**Leadership Onboarding Flow:**
1. **Welcome Screen:** "The Terminal is your business intelligence system. Let's get started."
2. **Tour:** Interactive walkthrough of key features (penetration dashboard, recruitment pipeline, churn monitor)
3. **Setup:** Configure user accounts, import chamber member list, set geographic boundaries
4. **First Action:** "Identify your top 20 recruitment prospects using the Recruitment Pipeline"

**Member Onboarding Flow:**
1. **Welcome Screen:** "Unlock market intelligence on your local business ecosystem."
2. **Claim Business:** "Is this your business? Claim your profile to access full intelligence."
3. **Tour:** Interactive walkthrough of My Business, Category Peers, Partnerships
4. **First Action:** "See how you compare to category peers"

### Paywall / Upgrade Paths

**Non-Member â†’ Chamber Member:**
- Locked intelligence with "Join Chamber to Unlock" CTAs
- Value demonstration: "Chamber members see 10X more data"
- Chamber contact form or direct signup link

**Member â†’ Premium Member (Optional Tier):**
- Advanced features locked behind premium tier: historical trends, advanced scoring, API access
- "Upgrade to Premium for $75/month" CTAs on locked features

---

## 10. UX / UI Blueprint

### Design Principles

1. **Information Density:** Bloomberg-style dense displays with multi-panel layouts, not minimalist consumer apps
2. **Scannability:** Use tables, cards, and hierarchical typography to enable rapid scanning of large datasets
3. **Trust Signals:** Prominent display of validation tiers, confidence scores, source corroboration, red flags
4. **Progressive Disclosure:** Summary views with drill-down for details (don't overwhelm with 36 fields at once)
5. **Professional Tone:** Businesslike, data-driven, credible â€” not playful or consumer-y
6. **Actionability:** Every intelligence display should suggest a decision or action

### Visual Tone

- **Color Palette:** Professional blues, grays, greens for positive signals, reds/oranges for risk flags
- **Typography:** Clean sans-serif (Inter, Helvetica, SF Pro) for readability at small sizes
- **Iconography:** Simple, functional icons for categories, tiers, scores (not decorative)
- **Data Visualization:** Charts and graphs use muted colors, clear legends, minimal decoration (Tufte-inspired)

### Panel System

**3-Column Layout (Leadership Dashboard):**
- **Left Panel (20%):** Navigation, filters, saved views
- **Center Panel (60%):** Primary content (table, dashboard, profile)
- **Right Panel (20%):** Context (selected business details, alerts, quick actions)

**2-Column Layout (Member Dashboard):**
- **Left Panel (30%):** Navigation, filters
- **Right Panel (70%):** Primary content

**Single Column (Mobile):**
- Stacked layout with collapsible sections
- Priority: key metrics at top, details below

### Cards

**Business Intelligence Card (used in lists, search results):**
- **Header:** Business name + member badge + rating (stars + number)
- **Subheader:** Category + neighborhood + price tier
- **Body:** Contact (phone, website) + top signal ("High recruitability: 87/100") + red flag (if present)
- **Footer:** Actions (View Profile, Compare, Add to List, Export)
- **Size:** Compact (150px height) for list views, expanded (300px) for grid views

**Metric Card (used in dashboards):**
- **Large Number:** Primary metric (e.g., "843")
- **Label:** Metric name (e.g., "Chamber Members")
- **Trend Indicator:** Arrow + percentage change (e.g., "â†‘ 1.8% vs last quarter")
- **Sparkline:** Mini time-series chart (optional)
- **Size:** 200px Ã— 150px

### Table Views

**Business List Table (Leadership):**
- **Columns:** Business Name, Category, Neighborhood, Rating, Review Count, Member Status, Recruitability Score, Validation Tier, Actions
- **Sortable:** All columns sortable (click header to sort)
- **Row Actions:** Hover reveals actions (View, Compare, Export, Add to Campaign)
- **Row Highlighting:** Alternate row colors for readability, highlight on hover
- **Density:** Compact (40px row height) for scanning large datasets

**Comparison Table:**
- **Rows:** Field names (Rating, Review Count, Category, etc.)
- **Columns:** Business names (2-5 businesses side-by-side)
- **Cell Highlighting:** Highlight differences (e.g., Business A has rating 4.8, Business B has 4.2 â€” highlight higher in green)

### Map Views

**Geographic Business Map:**
- **Base Map:** Street map (Mapbox or OpenStreetMap) centered on chamber geography
- **Pins:** Color-coded by category or rating
  - **Category Mode:** food_beverage = red, legal = blue, healthcare = green, etc.
  - **Rating Mode:** 4.5+ = dark green, 4.0-4.4 = light green, 3.5-3.9 = yellow, <3.5 = red
- **Clustering:** Group nearby businesses into clusters with count badges (prevents pin overload)
- **Click Pin:** Open business intelligence card in sidebar
- **Filter Panel:** Category, rating range, member status filters applied to map
- **Heatmap Mode (Optional):** Density heatmap showing business concentration by neighborhood

### Comparison Modules

**Business Comparison View:**
- **Header:** "Comparing [Business A] vs [Business B] vs [Business C]"
- **Scorecard Section:** Side-by-side metric cards (rating, review count, price tier)
- **Table Section:** All 36 fields in table format
- **Voice of Customer Section:** Side-by-side delights/pain points
- **Actions:** Export to PDF, Remove from comparison, Add another business

### Alerts

**Alert Badge (Top Nav):**
- Bell icon with count badge (e.g., "8 new alerts")
- Click to open alert dropdown

**Alert Dropdown:**
- **List of Alerts:** Most recent 10 alerts with timestamp
- **Alert Types:** Icon + title + summary (e.g., "ðŸ”´ Churn Risk: ABC Law Firm rating dropped to 3.8")
- **Actions:** View details, dismiss, mark as read
- **Footer:** "View all alerts" link to full alert history page

### Scorecards

**Recruitability Scorecard (Business Profile):**
- **Score:** Large number with color coding (0-49 red, 50-74 yellow, 75-100 green)
- **Breakdown:** Sub-scores contributing to overall score (rating: 20/20, review count: 8/20, category priority: 15/20, validation: 18/20, total: 61/80 â†’ normalized to 76/100)
- **Interpretation:** Text explanation ("High recruitability â€” strong candidate for outreach")
- **Actions:** "Add to Recruitment Campaign" button

### Profiles

**Business Profile Page Layout:**
1. **Hero Section:** Business name, rating, member badge, category, neighborhood, contact info
2. **Scorecard Section:** Recruitability, Churn Risk, Sponsorship Value scores in cards
3. **Intelligence Section:** Voice of customer, key signals, PKP classification, edges
4. **Validation Section:** OSINT confidence, validation tier, red flags, source corroboration
5. **Actions Section:** Export PDF, Compare, Add to Campaign, View Category Peers
6. **Related Section:** Category peers (top 5 by rating), complementary businesses (top 3 for partnerships)

### Dashboards

**Leadership Penetration Dashboard:**
- **Top Section:** Key metrics in cards (member count, penetration %, ecosystem health score)
- **Middle Section:** Category Ã— Member Status matrix (table or heatmap)
- **Bottom Section:** Charts (member growth trend, category distribution pie chart, geographic penetration map)

**Member Category Peer Dashboard:**
- **Top Section:** My business scorecard (rating, review count, category rank)
- **Middle Section:** Category peer table (all businesses in category, sortable)
- **Bottom Section:** Category insights (average rating, top delights/pain points synthesis)

### Tier-Gated Views

**Non-Member Teaser:**
- **Visible:** Business name, category, rating, neighborhood, review count
- **Blurred:** Contact info (phone/website visible but blurred), voice of customer (summary visible, details blurred), category peers (top 5 names visible, details locked)
- **Locked Sections:** Prominent lock icon + CTA ("Chamber members see full voice of customer analysis")
- **Upgrade CTA:** Sticky banner at top ("Unlock 10X more intelligence â€” Join Coral Gables Chamber")

### Mobile vs Desktop Behavior

**Desktop (>1024px):**
- Multi-column layouts (3-column for leadership, 2-column for members)
- Side panels for filters and context
- Hover interactions (tooltips, action buttons on hover)
- Keyboard shortcuts (e.g., "/" to open search, arrow keys to navigate lists)

**Tablet (768px - 1024px):**
- 2-column layouts collapse to single column with collapsible sidebars
- Touch-friendly buttons (larger hit targets)
- Swipe gestures (swipe card to reveal actions)

**Mobile (<768px):**
- Single column stacked layout
- Collapsible sections (expand/collapse with tap)
- Bottom navigation bar (fixed at bottom for key actions)
- Simplified tables (horizontal scroll or card-based views instead of tables)
- Reduced information density (show fewer columns, progressive disclosure)

**Mobile-First Features:**
- **Click-to-Call:** Phone numbers are tappable links
- **Maps Integration:** Address opens in Google Maps / Apple Maps
- **Share:** Share business profile via SMS, email, social
- **Save:** Save businesses to "My List" for offline review

---

*[Content length: ~42,000 words. Continuing in next section due to character limits...]*
