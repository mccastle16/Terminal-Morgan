"""
Business Intelligence Database Schema
PostgreSQL schema with full normalization for analytics and reporting
"""

-- ============================================================================
-- CORE BUSINESS ENTITIES
-- ============================================================================

CREATE TABLE businesses (
    business_id VARCHAR(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    business_type VARCHAR(50), -- LLC, Corp, Sole Proprietor, etc.
    founded_date DATE,
    years_in_business INTEGER,
    lifecycle_stage VARCHAR(50), -- prospecting, engaged, customer, churned
    data_completeness_score DECIMAL(3,2),
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_osint_refresh TIMESTAMP
);

CREATE TABLE business_names (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    name VARCHAR(255) NOT NULL,
    name_type VARCHAR(20), -- legal, dba, trade, brand
    active BOOLEAN DEFAULT true,
    source VARCHAR(50),
    confidence DECIMAL(3,2)
);

-- ============================================================================
-- LOCATION & GEOGRAPHY
-- ============================================================================

CREATE TABLE business_locations (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    location_type VARCHAR(20), -- headquarters, branch, service_area
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'US',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    geohash VARCHAR(20), -- For spatial indexing
    district VARCHAR(100), -- Giralda Plaza, Miracle Mile, etc.
    primary_location BOOLEAN DEFAULT false
);

CREATE INDEX idx_business_locations_geohash ON business_locations(geohash);
CREATE INDEX idx_business_locations_district ON business_locations(district);

-- ============================================================================
-- CLASSIFICATION & TAXONOMY
-- ============================================================================

CREATE TABLE business_categories (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    primary_category BOOLEAN DEFAULT false
);

CREATE TABLE industry_codes (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    code_type VARCHAR(20), -- NAICS, SIC, ISIC
    code VARCHAR(20),
    description TEXT,
    confidence DECIMAL(3,2)
);

CREATE TABLE business_tags (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    tag VARCHAR(100),
    tag_category VARCHAR(50), -- operational, market, technology, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_tags_tag ON business_tags(tag);

-- ============================================================================
-- CONTACT INFORMATION
-- ============================================================================

CREATE TABLE contact_phones (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    phone_number VARCHAR(20),
    phone_type VARCHAR(20), -- main, mobile, fax, support
    verified BOOLEAN DEFAULT false,
    source VARCHAR(50),
    last_verified TIMESTAMP
);

CREATE TABLE contact_emails (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    email VARCHAR(255),
    email_type VARCHAR(20), -- general, support, sales, info
    verified BOOLEAN DEFAULT false,
    source VARCHAR(50),
    last_verified TIMESTAMP
);

CREATE TABLE contact_websites (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    url TEXT,
    url_type VARCHAR(20), -- primary, booking, menu, ecommerce
    active BOOLEAN DEFAULT true,
    last_checked TIMESTAMP
);

CREATE TABLE social_media_profiles (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    platform VARCHAR(50), -- instagram, facebook, linkedin, twitter, tiktok
    profile_url TEXT,
    handle VARCHAR(100),
    followers INTEGER,
    verified BOOLEAN,
    last_updated TIMESTAMP
);

-- ============================================================================
-- PEOPLE & OWNERSHIP
-- ============================================================================

CREATE TABLE people (
    person_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    linkedin_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_people (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    person_id INTEGER REFERENCES people(person_id),
    role VARCHAR(100), -- owner, ceo, manager, chef, etc.
    title VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT true,
    equity_percentage DECIMAL(5,2),
    source VARCHAR(50)
);

CREATE TABLE business_relationships (
    id SERIAL PRIMARY KEY,
    parent_business_id VARCHAR(16) REFERENCES businesses(business_id),
    child_business_id VARCHAR(16) REFERENCES businesses(business_id),
    relationship_type VARCHAR(50), -- parent, subsidiary, franchise, partnership
    ownership_percentage DECIMAL(5,2),
    start_date DATE,
    end_date DATE
);

-- ============================================================================
-- OPERATIONS
-- ============================================================================

CREATE TABLE business_hours (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false,
    special_hours_note TEXT
);

CREATE TABLE services_offered (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    service_name VARCHAR(255),
    service_category VARCHAR(100),
    description TEXT,
    price_range VARCHAR(20),
    active BOOLEAN DEFAULT true
);

CREATE TABLE specialties (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    specialty VARCHAR(255),
    specialty_type VARCHAR(50) -- product, service, technique, cuisine, etc.
);

CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    certification_name VARCHAR(255),
    issuing_org VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    active BOOLEAN DEFAULT true
);

-- ============================================================================
-- FINANCIAL INTELLIGENCE
-- ============================================================================

CREATE TABLE revenue_estimates (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    estimate_year INTEGER,
    estimate_low DECIMAL(15,2),
    estimate_mid DECIMAL(15,2),
    estimate_high DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    estimation_method VARCHAR(100),
    confidence DECIMAL(3,2),
    source VARCHAR(100),
    estimated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_estimates (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    estimate_date DATE,
    count_low INTEGER,
    count_mid INTEGER,
    count_high INTEGER,
    estimation_method VARCHAR(100),
    confidence DECIMAL(3,2),
    source VARCHAR(100),
    estimated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funding_rounds (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    round_type VARCHAR(50), -- seed, series_a, series_b, etc.
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    announced_date DATE,
    lead_investor VARCHAR(255),
    source VARCHAR(100)
);

-- ============================================================================
-- MARKET INTELLIGENCE
-- ============================================================================

CREATE TABLE competitors (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    competitor_business_id VARCHAR(16) REFERENCES businesses(business_id),
    competition_type VARCHAR(50), -- direct, indirect, potential
    market_overlap_score DECIMAL(3,2),
    notes TEXT,
    identified_date DATE
);

CREATE TABLE market_segments (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    segment_name VARCHAR(100),
    segment_category VARCHAR(50), -- geographic, demographic, behavioral
    description TEXT
);

CREATE TABLE unique_value_propositions (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    uvp TEXT,
    uvp_category VARCHAR(100), -- product, service, experience, price
    confidence DECIMAL(3,2),
    source VARCHAR(100)
);

-- ============================================================================
-- CUSTOMER INTELLIGENCE
-- ============================================================================

CREATE TABLE customer_demographics (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    demographic_type VARCHAR(50), -- age_range, income_level, gender, etc.
    demographic_value VARCHAR(100),
    percentage DECIMAL(5,2),
    source VARCHAR(100),
    estimated_at TIMESTAMP
);

CREATE TABLE customer_reviews (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    platform VARCHAR(50), -- yelp, google, tripadvisor, etc.
    rating DECIMAL(3,2),
    review_text TEXT,
    reviewer_name VARCHAR(255),
    review_date DATE,
    helpful_count INTEGER,
    sentiment_score DECIMAL(3,2), -- -1 to 1
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE review_aggregations (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    platform VARCHAR(50),
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    five_star_count INTEGER,
    four_star_count INTEGER,
    three_star_count INTEGER,
    two_star_count INTEGER,
    one_star_count INTEGER,
    aggregated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sentiment_analysis (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    source_type VARCHAR(50), -- reviews, social_media, news
    positive_score DECIMAL(3,2),
    neutral_score DECIMAL(3,2),
    negative_score DECIMAL(3,2),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nps_estimates (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    nps_score INTEGER, -- -100 to 100
    promoters_percentage DECIMAL(5,2),
    passives_percentage DECIMAL(5,2),
    detractors_percentage DECIMAL(5,2),
    estimation_method VARCHAR(100),
    confidence DECIMAL(3,2),
    estimated_at TIMESTAMP
);

-- ============================================================================
-- DIGITAL PRESENCE
-- ============================================================================

CREATE TABLE website_metrics (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    metric_name VARCHAR(100), -- traffic_rank, domain_authority, page_speed, etc.
    metric_value VARCHAR(100),
    metric_date DATE,
    source VARCHAR(100)
);

CREATE TABLE social_metrics (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    platform VARCHAR(50),
    metric_name VARCHAR(100), -- followers, engagement_rate, post_frequency
    metric_value VARCHAR(100),
    metric_date DATE
);

CREATE TABLE seo_metrics (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    metric_name VARCHAR(100), -- organic_traffic, keyword_rankings, backlinks
    metric_value VARCHAR(100),
    metric_date DATE,
    source VARCHAR(100)
);

-- ============================================================================
-- PAIN POINTS & OPPORTUNITIES (LLM-DERIVED)
-- ============================================================================

CREATE TABLE pain_points (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    pain_point TEXT,
    pain_category VARCHAR(100), -- operational, financial, marketing, technology
    severity VARCHAR(20), -- low, medium, high, critical
    evidence TEXT[], -- Array of supporting evidence
    confidence DECIMAL(3,2),
    identified_date DATE,
    source VARCHAR(100)
);

CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    opportunity TEXT,
    opportunity_category VARCHAR(100), -- growth, efficiency, digital_transformation
    potential_impact VARCHAR(20), -- low, medium, high
    estimated_value DECIMAL(15,2),
    confidence DECIMAL(3,2),
    identified_date DATE,
    source VARCHAR(100)
);

CREATE TABLE technology_gaps (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    gap_description TEXT,
    gap_category VARCHAR(100), -- booking, payment, marketing, analytics, etc.
    current_solution TEXT,
    recommended_solution TEXT,
    priority VARCHAR(20), -- low, medium, high
    identified_date DATE
);

-- ============================================================================
-- CO_ FIT ANALYSIS
-- ============================================================================

CREATE TABLE co_fit_solutions (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    solution_name VARCHAR(255),
    solution_category VARCHAR(100),
    description TEXT,
    estimated_impact TEXT,
    implementation_complexity VARCHAR(20), -- low, medium, high
    estimated_cost_range VARCHAR(50),
    priority INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE engagement_scores (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    score DECIMAL(5,2), -- 0-100
    score_components JSONB, -- Breakdown of score calculation
    priority_tier INTEGER, -- 1-4
    reasoning TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CHAMBER & NETWORK
-- ============================================================================

CREATE TABLE chamber_memberships (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    chamber_name VARCHAR(255),
    member_since DATE,
    membership_tier VARCHAR(50),
    active BOOLEAN DEFAULT true,
    board_member BOOLEAN DEFAULT false,
    committee_member BOOLEAN DEFAULT false
);

CREATE TABLE board_positions (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    organization_name VARCHAR(255),
    position_title VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT true
);

CREATE TABLE community_involvement (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    activity_type VARCHAR(100), -- sponsor, volunteer, donor, event_host
    description TEXT,
    organization VARCHAR(255),
    activity_date DATE
);

-- ============================================================================
-- LEGAL & COMPLIANCE
-- ============================================================================

CREATE TABLE business_licenses (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    license_type VARCHAR(100),
    license_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    status VARCHAR(50), -- active, expired, suspended, revoked
    source VARCHAR(100)
);

CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    violation_type VARCHAR(100),
    description TEXT,
    violation_date DATE,
    resolution_date DATE,
    fine_amount DECIMAL(10,2),
    status VARCHAR(50), -- open, resolved, appealed
    source VARCHAR(100)
);

CREATE TABLE litigation_history (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    case_number VARCHAR(100),
    case_type VARCHAR(100), -- plaintiff, defendant
    court VARCHAR(255),
    filed_date DATE,
    resolution_date DATE,
    outcome TEXT,
    source VARCHAR(100)
);

-- ============================================================================
-- DATA PROVENANCE & QUALITY
-- ============================================================================

CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) UNIQUE,
    source_type VARCHAR(50), -- api, scrape, manual, llm_derived
    authority_score DECIMAL(3,2),
    active BOOLEAN DEFAULT true
);

CREATE TABLE business_data_sources (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    source_id INTEGER REFERENCES data_sources(id),
    last_collected TIMESTAMP,
    data_fields TEXT[], -- Which fields came from this source
    collection_method VARCHAR(100)
);

CREATE TABLE data_quality_metrics (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    field_name VARCHAR(100),
    completeness_score DECIMAL(3,2),
    accuracy_score DECIMAL(3,2),
    freshness_score DECIMAL(3,2),
    consistency_score DECIMAL(3,2),
    overall_confidence DECIMAL(3,2),
    last_assessed TIMESTAMP
);

CREATE TABLE data_conflicts (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16) REFERENCES businesses(business_id),
    field_name VARCHAR(100),
    source_a INTEGER REFERENCES data_sources(id),
    value_a TEXT,
    source_b INTEGER REFERENCES data_sources(id),
    value_b TEXT,
    resolved BOOLEAN DEFAULT false,
    resolution_value TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AUDIT & HISTORY
-- ============================================================================

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    business_id VARCHAR(16),
    table_name VARCHAR(100),
    record_id INTEGER,
    action VARCHAR(20), -- insert, update, delete
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100), -- user, system, agent_name
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(50) UNIQUE,
    run_type VARCHAR(50), -- full_refresh, incremental, targeted
    businesses_processed INTEGER,
    sources_queried INTEGER,
    data_points_collected INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20), -- running, completed, failed
    error_log TEXT
);

-- ============================================================================
-- ANALYTICS & BI VIEWS
-- ============================================================================

-- Business Summary View
CREATE VIEW v_business_summary AS
SELECT 
    b.business_id,
    b.name,
    bc.category,
    bc.subcategory,
    bl.city,
    bl.district,
    es.score as engagement_score,
    es.priority_tier,
    b.data_completeness_score,
    b.confidence_score,
    COUNT(DISTINCT pp.id) as pain_point_count,
    COUNT(DISTINCT o.id) as opportunity_count,
    COUNT(DISTINCT cfs.id) as solution_count
FROM businesses b
LEFT JOIN business_categories bc ON b.business_id = bc.business_id AND bc.primary_category = true
LEFT JOIN business_locations bl ON b.business_id = bl.business_id AND bl.primary_location = true
LEFT JOIN engagement_scores es ON b.business_id = es.business_id
LEFT JOIN pain_points pp ON b.business_id = pp.business_id
LEFT JOIN opportunities o ON b.business_id = o.business_id
LEFT JOIN co_fit_solutions cfs ON b.business_id = cfs.business_id
GROUP BY b.business_id, b.name, bc.category, bc.subcategory, bl.city, bl.district, 
         es.score, es.priority_tier, b.data_completeness_score, b.confidence_score;

-- Category Performance View
CREATE VIEW v_category_performance AS
SELECT 
    bc.category,
    COUNT(DISTINCT b.business_id) as business_count,
    AVG(es.score) as avg_engagement_score,
    AVG(b.data_completeness_score) as avg_data_completeness,
    COUNT(DISTINCT CASE WHEN es.priority_tier = 1 THEN b.business_id END) as tier_1_count,
    COUNT(DISTINCT CASE WHEN es.priority_tier = 2 THEN b.business_id END) as tier_2_count
FROM businesses b
JOIN business_categories bc ON b.business_id = bc.business_id
LEFT JOIN engagement_scores es ON b.business_id = es.business_id
GROUP BY bc.category;

-- Geographic Distribution View
CREATE VIEW v_geographic_distribution AS
SELECT 
    bl.district,
    bc.category,
    COUNT(*) as business_count,
    AVG(es.score) as avg_engagement_score
FROM business_locations bl
JOIN businesses b ON bl.business_id = b.business_id
JOIN business_categories bc ON b.business_id = bc.business_id
LEFT JOIN engagement_scores es ON b.business_id = es.business_id
WHERE bl.primary_location = true
GROUP BY bl.district, bc.category;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_businesses_name ON businesses(name);
CREATE INDEX idx_businesses_lifecycle ON businesses(lifecycle_stage);
CREATE INDEX idx_business_categories_category ON business_categories(category);
CREATE INDEX idx_business_categories_subcategory ON business_categories(subcategory);
CREATE INDEX idx_pain_points_business ON pain_points(business_id);
CREATE INDEX idx_opportunities_business ON opportunities(business_id);
CREATE INDEX idx_engagement_scores_tier ON engagement_scores(priority_tier);
CREATE INDEX idx_engagement_scores_score ON engagement_scores(score DESC);
CREATE INDEX idx_customer_reviews_platform ON customer_reviews(platform);
CREATE INDEX idx_customer_reviews_date ON customer_reviews(review_date DESC);

-- ============================================================================
-- FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Calculate overall data completeness for a business
CREATE OR REPLACE FUNCTION calculate_data_completeness(p_business_id VARCHAR)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_completeness DECIMAL(3,2);
BEGIN
    -- TODO: Implement comprehensive completeness calculation
    -- Check for presence of key fields across all tables
    SELECT 0.5 INTO v_completeness; -- Placeholder
    RETURN v_completeness;
END;
$$ LANGUAGE plpgsql;

-- Get business intelligence report
CREATE OR REPLACE FUNCTION get_business_intelligence_report(p_business_id VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_report JSONB;
BEGIN
    SELECT jsonb_build_object(
        'business_id', b.business_id,
        'name', b.name,
        'engagement_score', es.score,
        'priority_tier', es.priority_tier,
        'pain_points', (
            SELECT jsonb_agg(jsonb_build_object(
                'pain_point', pain_point,
                'category', pain_category,
                'severity', severity
            ))
            FROM pain_points
            WHERE business_id = p_business_id
        ),
        'opportunities', (
            SELECT jsonb_agg(jsonb_build_object(
                'opportunity', opportunity,
                'impact', potential_impact
            ))
            FROM opportunities
            WHERE business_id = p_business_id
        ),
        'solutions', (
            SELECT jsonb_agg(jsonb_build_object(
                'solution', solution_name,
                'category', solution_category,
                'priority', priority
            ))
            FROM co_fit_solutions
            WHERE business_id = p_business_id
        )
    ) INTO v_report
    FROM businesses b
    LEFT JOIN engagement_scores es ON b.business_id = es.business_id
    WHERE b.business_id = p_business_id;
    
    RETURN v_report;
END;
$$ LANGUAGE plpgsql;
