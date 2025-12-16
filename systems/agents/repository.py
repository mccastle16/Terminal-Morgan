"""
Data Repository Layer
Abstracts data access with support for both JSON and PostgreSQL backends
"""

import os
import json
from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod
from collections import Counter

from config import settings


class BusinessRepository(ABC):
    """Abstract base class for business data access"""

    @abstractmethod
    def get_all_businesses(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[int] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        lifecycle_stage: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_business(self, business_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def search_businesses(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_market_analytics(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_category_insights(self, category: str) -> Optional[Dict[str, Any]]:
        pass


class JSONRepository(BusinessRepository):
    """JSON file-based repository"""

    def __init__(self):
        self.data = self._load_database()
        self.businesses = self.data.get('businesses', [])

    def _load_database(self) -> Dict[str, Any]:
        """Load business data from JSON file"""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(
            script_dir, "..", "data", "coral_gables_bi_database_v2.json"
        )

        try:
            with open(data_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            fallback_path = os.path.join(
                script_dir, "..", "data", "coral_gables_top_100_businesses_pkp.json"
            )
            with open(fallback_path, 'r') as f:
                return json.load(f)

    def _get_tier(self, score: float) -> int:
        """Calculate tier from engagement score"""
        if score >= 90:
            return 1
        elif score >= 80:
            return 2
        elif score >= 70:
            return 3
        return 4

    def _to_summary(self, b: Dict[str, Any]) -> Dict[str, Any]:
        """Convert business to summary format"""
        score = b.get('engagement_score', 0)
        return {
            "business_id": b.get('business_id', b.get('name', '')),
            "name": b.get('name', ''),
            "category": b.get('category'),
            "subcategory": b.get('subcategory'),
            "district": b.get('district'),
            "engagement_score": score,
            "priority_tier": b.get('priority_tier', self._get_tier(score)),
            "data_completeness": b.get('data_completeness', 0),
            "confidence_score": b.get('confidence_score', 0),
            "pain_point_count": len(b.get('pain_points', [])),
            "opportunity_count": len(b.get('opportunities', [])),
            "solution_count": len(b.get('co_fit_solutions', []))
        }

    def get_all_businesses(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[int] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        lifecycle_stage: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        results = self.businesses.copy()

        if category:
            results = [b for b in results if b.get('category', '').lower() == category.lower()]
        if district:
            results = [b for b in results if b.get('district', '').lower() == district.lower()]
        if tier:
            results = [b for b in results if b.get('priority_tier', self._get_tier(b.get('engagement_score', 0))) == tier]
        if min_score is not None:
            results = [b for b in results if b.get('engagement_score', 0) >= min_score]
        if max_score is not None:
            results = [b for b in results if b.get('engagement_score', 0) <= max_score]
        if lifecycle_stage:
            results = [b for b in results if b.get('lifecycle_stage', '').lower() == lifecycle_stage.lower()]

        results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)
        results = results[offset:offset + limit]

        return [self._to_summary(b) for b in results]

    def get_business(self, business_id: str) -> Optional[Dict[str, Any]]:
        for b in self.businesses:
            if b.get('business_id') == business_id:
                return b
            if b.get('name', '').lower() == business_id.lower():
                return b
        return None

    def search_businesses(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        q_lower = query.lower()
        results = []

        for b in self.businesses:
            if q_lower in b.get('name', '').lower():
                results.append(b)
                continue
            if q_lower in b.get('category', '').lower():
                results.append(b)
                continue
            if q_lower in b.get('subcategory', '').lower():
                results.append(b)
                continue
            specialties = b.get('specialties', [])
            if any(q_lower in s.lower() for s in specialties if isinstance(s, str)):
                results.append(b)
                continue

        results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)
        return [self._to_summary(b) for b in results[:limit]]

    def get_market_analytics(self) -> Dict[str, Any]:
        by_category = Counter(b.get('category', 'unknown') for b in self.businesses)
        by_tier = Counter(
            str(b.get('priority_tier', self._get_tier(b.get('engagement_score', 0))))
            for b in self.businesses
        )
        by_district = Counter(b.get('district', 'unknown') for b in self.businesses if b.get('district'))

        scores = [b.get('engagement_score', 0) for b in self.businesses if b.get('engagement_score')]
        completeness = [b.get('data_completeness', 0) for b in self.businesses if b.get('data_completeness')]

        return {
            "total_businesses": len(self.businesses),
            "by_category": dict(by_category),
            "by_tier": dict(by_tier),
            "by_district": dict(by_district),
            "avg_engagement_score": sum(scores) / len(scores) if scores else 0,
            "avg_data_completeness": sum(completeness) / len(completeness) if completeness else 0
        }

    def get_category_insights(self, category: str) -> Optional[Dict[str, Any]]:
        businesses = [b for b in self.businesses if b.get('category', '').lower() == category.lower()]
        if not businesses:
            return None

        tier_dist = Counter(
            str(b.get('priority_tier', self._get_tier(b.get('engagement_score', 0))))
            for b in businesses
        )

        all_pain_points = []
        for b in businesses:
            for pp in b.get('pain_points', []):
                all_pain_points.append(pp.get('pain_point', pp.get('point', '')))

        all_opportunities = []
        for b in businesses:
            for opp in b.get('opportunities', []):
                all_opportunities.append(opp.get('opportunity', ''))

        scores = [b.get('engagement_score', 0) for b in businesses if b.get('engagement_score')]
        completeness = [b.get('data_completeness', 0) for b in businesses if b.get('data_completeness')]

        return {
            "category": category,
            "business_count": len(businesses),
            "avg_engagement_score": sum(scores) / len(scores) if scores else 0,
            "avg_data_completeness": sum(completeness) / len(completeness) if completeness else 0,
            "tier_distribution": dict(tier_dist),
            "top_pain_points": [{"pain_point": pp, "count": c} for pp, c in Counter(all_pain_points).most_common(5)],
            "top_opportunities": [{"opportunity": o, "count": c} for o, c in Counter(all_opportunities).most_common(5)]
        }


class PostgreSQLRepository(BusinessRepository):
    """PostgreSQL database repository"""

    def __init__(self):
        from database import get_session, Business, BusinessCategory, BusinessLocation, PainPoint, Opportunity, CoFitSolution, EngagementScore
        self.get_session = get_session
        self.Business = Business
        self.BusinessCategory = BusinessCategory
        self.PainPoint = PainPoint
        self.Opportunity = Opportunity
        self.CoFitSolution = CoFitSolution
        self.EngagementScore = EngagementScore

    def _to_dict(self, business) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dict"""
        # Get primary category
        primary_cat = next((c for c in business.categories if c.primary_category), None)

        # Get primary location
        primary_loc = next((l for l in business.locations if l.primary_location), None)

        # Get latest engagement score
        latest_score = business.engagement_scores[0] if business.engagement_scores else None

        return {
            "business_id": business.business_id,
            "name": business.name,
            "category": primary_cat.category if primary_cat else None,
            "subcategory": primary_cat.subcategory if primary_cat else None,
            "district": primary_loc.district if primary_loc else None,
            "address": primary_loc.address_line1 if primary_loc else None,
            "engagement_score": float(latest_score.score) if latest_score else 0,
            "priority_tier": latest_score.priority_tier if latest_score else 4,
            "data_completeness": float(business.data_completeness_score or 0),
            "confidence_score": float(business.confidence_score or 0),
            "lifecycle_stage": business.lifecycle_stage,
            "pain_points": [
                {
                    "pain_point": pp.pain_point,
                    "category": pp.pain_category,
                    "severity": pp.severity,
                    "confidence": float(pp.confidence or 0)
                }
                for pp in business.pain_points
            ],
            "opportunities": [
                {
                    "opportunity": opp.opportunity,
                    "category": opp.opportunity_category,
                    "impact": opp.potential_impact,
                    "confidence": float(opp.confidence or 0)
                }
                for opp in business.opportunities
            ],
            "co_fit_solutions": [
                {
                    "solution": sol.solution_name,
                    "category": sol.solution_category,
                    "description": sol.description,
                    "priority": sol.priority
                }
                for sol in business.solutions
            ]
        }

    def _to_summary(self, business) -> Dict[str, Any]:
        """Convert to summary format"""
        data = self._to_dict(business)
        return {
            "business_id": data["business_id"],
            "name": data["name"],
            "category": data["category"],
            "subcategory": data["subcategory"],
            "district": data["district"],
            "engagement_score": data["engagement_score"],
            "priority_tier": data["priority_tier"],
            "data_completeness": data["data_completeness"],
            "confidence_score": data["confidence_score"],
            "pain_point_count": len(data["pain_points"]),
            "opportunity_count": len(data["opportunities"]),
            "solution_count": len(data["co_fit_solutions"])
        }

    def get_all_businesses(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[int] = None,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        lifecycle_stage: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            query = session.query(self.Business)

            if lifecycle_stage:
                query = query.filter(self.Business.lifecycle_stage == lifecycle_stage)

            businesses = query.all()

            # Filter in Python (for complex joins)
            results = []
            for b in businesses:
                data = self._to_summary(b)

                if category and data.get('category', '').lower() != category.lower():
                    continue
                if district and data.get('district', '').lower() != district.lower():
                    continue
                if tier and data.get('priority_tier') != tier:
                    continue
                if min_score is not None and data.get('engagement_score', 0) < min_score:
                    continue
                if max_score is not None and data.get('engagement_score', 0) > max_score:
                    continue

                results.append(data)

            # Sort and paginate
            results.sort(key=lambda x: x.get('engagement_score', 0), reverse=True)
            return results[offset:offset + limit]

        finally:
            session.close()

    def get_business(self, business_id: str) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        try:
            business = session.query(self.Business).filter_by(business_id=business_id).first()
            if not business:
                # Try by name
                business = session.query(self.Business).filter(
                    self.Business.name.ilike(business_id)
                ).first()

            if business:
                return self._to_dict(business)
            return None
        finally:
            session.close()

    def search_businesses(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            businesses = session.query(self.Business).filter(
                self.Business.name.ilike(f"%{query}%")
            ).limit(limit).all()

            return [self._to_summary(b) for b in businesses]
        finally:
            session.close()

    def get_market_analytics(self) -> Dict[str, Any]:
        session = self.get_session()
        try:
            businesses = session.query(self.Business).all()
            summaries = [self._to_summary(b) for b in businesses]

            by_category = Counter(s.get('category', 'unknown') for s in summaries)
            by_tier = Counter(str(s.get('priority_tier', 4)) for s in summaries)
            by_district = Counter(s.get('district', 'unknown') for s in summaries if s.get('district'))

            scores = [s.get('engagement_score', 0) for s in summaries if s.get('engagement_score')]
            completeness = [s.get('data_completeness', 0) for s in summaries if s.get('data_completeness')]

            return {
                "total_businesses": len(summaries),
                "by_category": dict(by_category),
                "by_tier": dict(by_tier),
                "by_district": dict(by_district),
                "avg_engagement_score": sum(scores) / len(scores) if scores else 0,
                "avg_data_completeness": sum(completeness) / len(completeness) if completeness else 0
            }
        finally:
            session.close()

    def get_category_insights(self, category: str) -> Optional[Dict[str, Any]]:
        # Delegate to get_all_businesses with category filter
        businesses = self.get_all_businesses(category=category, limit=1000)
        if not businesses:
            return None

        tier_dist = Counter(str(b.get('priority_tier', 4)) for b in businesses)
        scores = [b.get('engagement_score', 0) for b in businesses if b.get('engagement_score')]
        completeness = [b.get('data_completeness', 0) for b in businesses if b.get('data_completeness')]

        return {
            "category": category,
            "business_count": len(businesses),
            "avg_engagement_score": sum(scores) / len(scores) if scores else 0,
            "avg_data_completeness": sum(completeness) / len(completeness) if completeness else 0,
            "tier_distribution": dict(tier_dist),
            "top_pain_points": [],
            "top_opportunities": []
        }


def get_repository() -> BusinessRepository:
    """Get the appropriate repository based on configuration"""
    # Try PostgreSQL first if configured
    try:
        from database import test_connection
        if test_connection():
            print("Using PostgreSQL repository")
            return PostgreSQLRepository()
    except Exception as e:
        print(f"PostgreSQL not available: {e}")

    # Fall back to JSON
    print("Using JSON repository")
    return JSONRepository()


# Singleton repository instance
_repository = None


def get_repo() -> BusinessRepository:
    """Get singleton repository instance"""
    global _repository
    if _repository is None:
        _repository = get_repository()
    return _repository
