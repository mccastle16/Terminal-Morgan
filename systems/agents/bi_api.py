"""
Business Intelligence API & Analytics Layer
FastAPI application for serving business intelligence data

Supports both PostgreSQL (production) and JSON (fallback) data sources.
Set DATABASE_URL environment variable to use PostgreSQL.
"""

import os
import json
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from collections import Counter

# Import repository layer for data access
from db_repository import get_repository, BusinessRepository

# ============================================================================
# DATA LAYER - Uses Repository Pattern
# ============================================================================

# Initialize repository (auto-detects PostgreSQL vs JSON)
repository = get_repository()

# Legacy compatibility - these functions provide backwards compatibility
def get_businesses_list() -> List[Dict[str, Any]]:
    """Get list of all businesses"""
    return repository.get_all_businesses()

def get_businesses_dict() -> Dict[str, Dict[str, Any]]:
    """Get businesses as dict keyed by business_id"""
    businesses = repository.get_all_businesses()
    return {
        b.get('business_id', b.get('name', '')): b
        for b in businesses
    }


# ============================================================================
# PYDANTIC MODELS (API CONTRACTS)
# ============================================================================

class PriorityTier(str, Enum):
    TIER_1 = "tier_1"  # 90-95 score
    TIER_2 = "tier_2"  # 80-89 score
    TIER_3 = "tier_3"  # 70-79 score
    TIER_4 = "tier_4"  # 65-69 score

class LifecycleStage(str, Enum):
    PROSPECTING = "prospecting"
    CONTACTED = "contacted"
    ENGAGED = "engaged"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CUSTOMER = "customer"
    CHURNED = "churned"

class BusinessSummary(BaseModel):
    business_id: str
    name: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    district: Optional[str] = None
    engagement_score: Optional[float] = None
    priority_tier: Optional[int] = None
    data_completeness: Optional[float] = None
    confidence_score: Optional[float] = None
    pain_point_count: int = 0
    opportunity_count: int = 0
    solution_count: int = 0

class MarketAnalytics(BaseModel):
    total_businesses: int
    by_category: Dict[str, int]
    by_tier: Dict[str, int]
    by_district: Dict[str, int]
    avg_engagement_score: float
    avg_data_completeness: float

class CategoryInsights(BaseModel):
    category: str
    business_count: int
    avg_engagement_score: float
    avg_data_completeness: float
    tier_distribution: Dict[str, int]
    top_pain_points: List[Dict[str, Any]]
    top_opportunities: List[Dict[str, Any]]

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Coral Gables Business Intelligence API",
    description="Comprehensive OSINT-powered business intelligence platform",
    version="3.0.0"
)

# CORS middleware - configure allowed origins from environment
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_tier_from_score(score: float) -> int:
    """Convert engagement score to tier"""
    if score >= 90:
        return 1
    elif score >= 80:
        return 2
    elif score >= 70:
        return 3
    else:
        return 4

def calculate_digital_maturity(b: Dict) -> int:
    """Calculate digital maturity score (0-100) based on online presence"""
    score = 0
    if b.get('website'): score += 25
    social = b.get('social_media', {})
    if social.get('instagram'): score += 20
    if social.get('facebook'): score += 15
    emails = b.get('email', [])
    if emails and len(emails) > 0: score += 15
    ratings = b.get('ratings', {})
    if ratings.get('google'): score += 15
    if ratings.get('yelp'): score += 10
    return min(score, 100)

def business_to_summary(b: Dict) -> Dict:
    """Convert business dict to summary format"""
    return {
        "business_id": b.get('business_id', b.get('name', '')),
        "name": b.get('name', ''),
        "category": b.get('category'),
        "subcategory": b.get('subcategory'),
        "district": b.get('district'),
        "engagement_score": b.get('engagement_score'),
        "priority_tier": b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0))),
        "data_completeness": b.get('data_completeness', 0),
        "confidence_score": b.get('confidence_score', 0),
        "pain_point_count": len(b.get('pain_points', [])),
        "opportunity_count": len(b.get('opportunities', [])),
        "solution_count": len(b.get('co_fit_solutions', [])),
        # Fields for digital maturity calculation
        "website": b.get('website'),
        "social_media": b.get('social_media', {}),
        "email": b.get('email', []),
        "ratings": b.get('ratings', {}),
        "digital_maturity": calculate_digital_maturity(b)
    }

# ============================================================================
# BUSINESS ENDPOINTS
# ============================================================================

@app.get("/api/v2/businesses", response_model=List[BusinessSummary])
async def list_businesses(
    category: Optional[str] = None,
    district: Optional[str] = None,
    tier: Optional[int] = Query(None, ge=1, le=4),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    max_score: Optional[float] = Query(None, ge=0, le=100),
    lifecycle_stage: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """List businesses with filtering and pagination"""
    results = get_businesses_list().copy()

    # Apply filters
    if category:
        results = [b for b in results if b.get('category', '').lower() == category.lower()]

    if district:
        results = [b for b in results if b.get('district', '').lower() == district.lower()]

    if tier:
        results = [b for b in results if b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0))) == tier]

    if min_score is not None:
        results = [b for b in results if b.get('engagement_score', 0) >= min_score]

    if max_score is not None:
        results = [b for b in results if b.get('engagement_score', 0) <= max_score]

    if lifecycle_stage:
        results = [b for b in results if b.get('lifecycle_stage', '').lower() == lifecycle_stage.lower()]

    # Sort by engagement score descending
    results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)

    # Apply pagination
    results = results[offset:offset + limit]

    return [business_to_summary(b) for b in results]

@app.get("/api/v2/businesses/{business_id}")
async def get_business(business_id: str):
    """Get detailed information for a single business"""
    # Use repository to find business
    business = repository.get_business_by_id(business_id)

    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    return business

@app.get("/api/v2/businesses/{business_id}/intelligence")
async def get_business_intelligence(business_id: str):
    """Get comprehensive intelligence report for a business"""
    business = await get_business(business_id)

    return {
        "business_id": business.get('business_id', business.get('name')),
        "name": business.get('name'),
        "engagement_score": business.get('engagement_score'),
        "priority_tier": business.get('priority_tier'),
        "pain_points": business.get('pain_points', []),
        "opportunities": business.get('opportunities', []),
        "co_fit_solutions": business.get('co_fit_solutions', []),
        "technology_gaps": business.get('technology_gaps', []),
        "sentiment": business.get('sentiment', {}),
        "ratings": business.get('ratings', {}),
        "estimated_revenue": business.get('estimated_revenue'),
        "estimated_employees": business.get('estimated_employees')
    }

# ============================================================================
# SEARCH ENDPOINTS
# ============================================================================

@app.get("/api/v2/search/businesses")
async def search_businesses(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100)
):
    """Full-text search across business names, categories, specialties"""
    q_lower = q.lower()
    results = []

    for b in get_businesses_list():
        # Search in name
        if q_lower in b.get('name', '').lower():
            results.append(b)
            continue
        # Search in category
        if q_lower in b.get('category', '').lower():
            results.append(b)
            continue
        # Search in subcategory
        if q_lower in b.get('subcategory', '').lower():
            results.append(b)
            continue
        # Search in specialties
        specialties = b.get('specialties', [])
        if any(q_lower in s.lower() for s in specialties if isinstance(s, str)):
            results.append(b)
            continue
        # Search in services
        services = b.get('services', [])
        if any(q_lower in s.lower() for s in services if isinstance(s, str)):
            results.append(b)
            continue

    # Sort by engagement score
    results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)

    return [business_to_summary(b) for b in results[:limit]]

@app.get("/api/v2/search/pain-points")
async def search_pain_points(
    q: str = Query(..., min_length=2),
    category: Optional[str] = None,
    severity: Optional[str] = None
):
    """Search pain points across all businesses"""
    q_lower = q.lower()
    results = []

    for b in get_businesses_list():
        if category and b.get('category', '').lower() != category.lower():
            continue

        for pp in b.get('pain_points', []):
            pp_text = pp.get('pain_point', pp.get('point', ''))
            if q_lower in pp_text.lower():
                if severity and pp.get('severity', '').lower() != severity.lower():
                    continue
                results.append({
                    "business_id": b.get('business_id', b.get('name')),
                    "business_name": b.get('name'),
                    "pain_point": pp_text,
                    "category": pp.get('category', pp.get('pain_category', '')),
                    "severity": pp.get('severity', 'unknown'),
                    "confidence": pp.get('confidence', 0)
                })

    return results

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/api/v2/analytics/market", response_model=MarketAnalytics)
async def get_market_analytics():
    """Get overall market analytics"""
    businesses = get_businesses_list()

    # Count by category
    by_category = Counter(b.get('category', 'unknown') for b in businesses)

    # Count by tier
    by_tier = Counter(
        str(b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0))))
        for b in businesses
    )

    # Count by district
    by_district = Counter(b.get('district', 'unknown') for b in businesses if b.get('district'))

    # Calculate averages
    scores = [b.get('engagement_score', 0) for b in businesses if b.get('engagement_score')]
    completeness = [b.get('data_completeness', 0) for b in businesses if b.get('data_completeness')]

    return MarketAnalytics(
        total_businesses=len(businesses),
        by_category=dict(by_category),
        by_tier=dict(by_tier),
        by_district=dict(by_district),
        avg_engagement_score=sum(scores) / len(scores) if scores else 0,
        avg_data_completeness=sum(completeness) / len(completeness) if completeness else 0
    )

@app.get("/api/v2/analytics/categories/{category}", response_model=CategoryInsights)
async def get_category_insights(category: str):
    """Get detailed insights for a specific category"""
    businesses = [b for b in get_businesses_list() if b.get('category', '').lower() == category.lower()]

    if not businesses:
        raise HTTPException(status_code=404, detail="Category not found")

    # Tier distribution
    tier_dist = Counter(
        str(b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0))))
        for b in businesses
    )

    # Aggregate pain points
    all_pain_points = []
    for b in businesses:
        for pp in b.get('pain_points', []):
            all_pain_points.append(pp.get('pain_point', pp.get('point', '')))
    top_pain_points = [{"pain_point": pp, "count": c} for pp, c in Counter(all_pain_points).most_common(5)]

    # Aggregate opportunities
    all_opportunities = []
    for b in businesses:
        for opp in b.get('opportunities', []):
            all_opportunities.append(opp.get('opportunity', ''))
    top_opportunities = [{"opportunity": o, "count": c} for o, c in Counter(all_opportunities).most_common(5)]

    scores = [b.get('engagement_score', 0) for b in businesses if b.get('engagement_score')]
    completeness = [b.get('data_completeness', 0) for b in businesses if b.get('data_completeness')]

    return CategoryInsights(
        category=category,
        business_count=len(businesses),
        avg_engagement_score=sum(scores) / len(scores) if scores else 0,
        avg_data_completeness=sum(completeness) / len(completeness) if completeness else 0,
        tier_distribution=dict(tier_dist),
        top_pain_points=top_pain_points,
        top_opportunities=top_opportunities
    )

@app.get("/api/v2/analytics/geographic")
async def get_geographic_analysis():
    """Get geographic distribution and clustering analysis"""
    districts = {}

    for b in get_businesses_list():
        district = b.get('district', 'unknown')
        if district not in districts:
            districts[district] = {
                "district": district,
                "business_count": 0,
                "categories": [],
                "avg_engagement_score": 0,
                "scores": []
            }
        districts[district]["business_count"] += 1
        districts[district]["categories"].append(b.get('category', 'unknown'))
        if b.get('engagement_score'):
            districts[district]["scores"].append(b.get('engagement_score'))

    # Calculate averages and category breakdown
    result = []
    for d in districts.values():
        d["avg_engagement_score"] = sum(d["scores"]) / len(d["scores"]) if d["scores"] else 0
        d["category_breakdown"] = dict(Counter(d["categories"]))
        del d["scores"]
        del d["categories"]
        result.append(d)

    return {"districts": result}

# ============================================================================
# OPPORTUNITY ENDPOINTS
# ============================================================================

@app.get("/api/v2/opportunities/prioritized")
async def get_prioritized_opportunities(
    tier: Optional[int] = Query(None, ge=1, le=4),
    limit: int = Query(50, ge=1, le=200)
):
    """Get prioritized opportunities across all businesses"""
    results = []

    for b in get_businesses_list():
        b_tier = b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0)))
        if tier and b_tier != tier:
            continue

        for opp in b.get('opportunities', []):
            results.append({
                "business_id": b.get('business_id', b.get('name')),
                "business_name": b.get('name'),
                "business_tier": b_tier,
                "engagement_score": b.get('engagement_score', 0),
                "opportunity": opp.get('opportunity', ''),
                "category": opp.get('category', opp.get('opportunity_category', '')),
                "impact": opp.get('potential_impact', opp.get('impact', '')),
                "confidence": opp.get('confidence', 0)
            })

    # Sort by business engagement score
    results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)

    return results[:limit]

@app.get("/api/v2/engagement/recommendations")
async def get_engagement_recommendations(
    limit: int = Query(10, ge=1, le=50)
):
    """Get AI-recommended businesses to engage with next"""
    # Simple heuristic: high engagement score + high pain point count
    scored = []
    for b in get_businesses_list():
        score = b.get('engagement_score', 0)
        pain_count = len(b.get('pain_points', []))
        solution_count = len(b.get('co_fit_solutions', []))

        # Recommendation score: engagement + pain points + solutions
        rec_score = score + (pain_count * 2) + (solution_count * 3)

        scored.append({
            "business_id": b.get('business_id', b.get('name')),
            "name": b.get('name'),
            "category": b.get('category'),
            "engagement_score": score,
            "priority_tier": b.get('priority_tier', get_tier_from_score(score)),
            "pain_point_count": pain_count,
            "solution_count": solution_count,
            "recommendation_score": rec_score,
            "reason": f"High engagement ({score}) with {pain_count} pain points and {solution_count} solutions"
        })

    scored.sort(key=lambda x: x['recommendation_score'], reverse=True)
    return scored[:limit]

@app.get("/api/v2/engagement/pipeline")
async def get_engagement_pipeline():
    """Get sales/engagement pipeline view"""
    pipeline = {
        "prospecting": [],
        "contacted": [],
        "engaged": [],
        "qualified": [],
        "proposal": [],
        "negotiation": [],
        "customer": []
    }

    for b in get_businesses_list():
        stage = b.get('lifecycle_stage', 'prospecting').lower()
        if stage in pipeline:
            pipeline[stage].append(business_to_summary(b))

    # Add counts
    return {
        stage: {"count": len(businesses), "businesses": businesses}
        for stage, businesses in pipeline.items()
    }

# ============================================================================
# DATA QUALITY ENDPOINTS
# ============================================================================

@app.get("/api/v2/data-quality/overview")
async def get_data_quality_overview():
    """Get overall data quality metrics"""
    businesses = get_businesses_list()
    completeness = [b.get('data_completeness', 0) for b in businesses]
    confidence = [b.get('confidence_score', 0) for b in businesses]

    complete_threshold = 0.7
    complete_count = sum(1 for c in completeness if c >= complete_threshold)

    return {
        "overall_completeness": sum(completeness) / len(completeness) if completeness else 0,
        "overall_confidence": sum(confidence) / len(confidence) if confidence else 0,
        "businesses_complete": complete_count,
        "businesses_incomplete": len(businesses) - complete_count,
        "total_businesses": len(businesses),
        "sources_active": len(set(
            src for b in businesses
            for src in b.get('data_sources', [])
        )),
        "last_refresh": repository.last_refresh
    }

# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@app.get("/api/v2/export/json")
async def export_json(
    category: Optional[str] = None,
    tier: Optional[int] = Query(None, ge=1, le=4)
):
    """Export business data to JSON"""
    results = get_businesses_list().copy()

    if category:
        results = [b for b in results if b.get('category', '').lower() == category.lower()]

    if tier:
        results = [b for b in results if b.get('priority_tier', get_tier_from_score(b.get('engagement_score', 0))) == tier]

    return {
        "exported_at": datetime.now().isoformat(),
        "count": len(results),
        "businesses": results
    }

# ============================================================================
# HEALTH & ADMIN
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "businesses_loaded": len(get_businesses_list()),
        "data_source": repository.get_data_source()
    }

@app.get("/api/v2/admin/stats")
async def get_system_stats():
    """Get system statistics"""
    stats = repository.get_stats()
    businesses = get_businesses_list()
    return {
        "total_businesses": stats["total_businesses"],
        "total_pain_points": stats["total_pain_points"],
        "total_opportunities": stats["total_opportunities"],
        "total_solutions": stats["total_solutions"],
        "categories": list(set(b.get('category', 'unknown') for b in businesses)),
        "api_version": "3.0.0",
        "data_source": stats["data_source"],
        "last_refresh": stats["last_refresh"]
    }

@app.post("/api/v2/admin/refresh")
async def refresh_data(
    api_key: str = Query(..., description="Admin API key for authentication")
):
    """
    Refresh data from source (PostgreSQL or JSON file).
    Requires admin API key for security.

    This endpoint reloads all business data without requiring a server restart.
    Use this after running OSINT collectors to see updated data.
    """
    # API key check - ADMIN_API_KEY must be set in environment for security
    expected_key = os.getenv("ADMIN_API_KEY")

    if not expected_key:
        raise HTTPException(status_code=503, detail="Admin API not configured - set ADMIN_API_KEY environment variable")

    if api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    try:
        count = repository.refresh()

        return {
            "status": "success",
            "message": f"Data refreshed successfully",
            "businesses_loaded": count,
            "data_source": repository.get_data_source(),
            "refreshed_at": repository.last_refresh
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")

@app.get("/api/v2/admin/refresh-status")
async def get_refresh_status():
    """Get the current data refresh status"""
    return {
        "last_refresh": repository.last_refresh,
        "businesses_loaded": len(get_businesses_list()),
        "data_source": repository.get_data_source()
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
