"""
Database Repository Layer for Coral Gables BI Platform
Provides abstraction for reading business data from PostgreSQL or JSON
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

# Try to import database models - they may not be available if psycopg2 isn't installed
try:
    from database import (
        get_session, Business, BusinessCategory, BusinessLocation,
        PainPoint, Opportunity, CoFitSolution, EngagementScore
    )
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


class BusinessRepository:
    """
    Repository for accessing business data.
    Automatically uses PostgreSQL if DATABASE_URL is set, otherwise falls back to JSON.
    """

    def __init__(self):
        self.use_db = self._should_use_database()
        self.last_refresh = None
        self._cache = None
        self._cache_time = None

    def _should_use_database(self) -> bool:
        """Check if we should use PostgreSQL"""
        db_url = os.getenv("DATABASE_URL")
        if not db_url or not DB_AVAILABLE:
            return False
        # Verify connection works
        try:
            session = get_session()
            session.execute("SELECT 1")
            session.close()
            print("✓ PostgreSQL connection verified - using database")
            return True
        except Exception as e:
            print(f"✗ PostgreSQL connection failed: {e} - falling back to JSON")
            return False

    def _load_from_json(self) -> List[Dict[str, Any]]:
        """Load business data from JSON file"""
        script_dir = os.path.dirname(os.path.abspath(__file__))

        data_locations = [
            os.path.join(script_dir, "data", "coral_gables_bi_database_v2.json"),
            os.path.join(script_dir, "..", "data", "coral_gables_bi_database_v2.json"),
        ]

        for data_path in data_locations:
            try:
                with open(data_path, 'r') as f:
                    data = json.load(f)
                    print(f"Loaded database from: {data_path}")
                    return data.get('businesses', [])
            except FileNotFoundError:
                continue

        print("Warning: No JSON database found")
        return []

    def _load_from_database(self) -> List[Dict[str, Any]]:
        """Load business data from PostgreSQL"""
        session = get_session()
        businesses = []

        try:
            db_businesses = session.query(Business).all()

            for b in db_businesses:
                # Get latest engagement score
                latest_score = None
                if b.engagement_scores:
                    latest_score = max(b.engagement_scores, key=lambda x: x.calculated_at or datetime.min)

                # Get primary category
                primary_cat = next((c for c in b.categories if c.primary_category), None)
                category = primary_cat.category if primary_cat else None
                subcategory = primary_cat.subcategory if primary_cat else None

                # Get primary location
                primary_loc = next((l for l in b.locations if l.primary_location), None)
                district = primary_loc.district if primary_loc else None
                address = primary_loc.address_line1 if primary_loc else None
                latitude = float(primary_loc.latitude) if primary_loc and primary_loc.latitude else None
                longitude = float(primary_loc.longitude) if primary_loc and primary_loc.longitude else None

                business_dict = {
                    "business_id": b.business_id,
                    "name": b.name,
                    "legal_name": b.legal_name,
                    "category": category,
                    "subcategory": subcategory,
                    "district": district,
                    "address": address,
                    "latitude": latitude,
                    "longitude": longitude,
                    "lifecycle_stage": b.lifecycle_stage,
                    "data_completeness": float(b.data_completeness_score) if b.data_completeness_score else 0,
                    "confidence_score": float(b.confidence_score) if b.confidence_score else 0,
                    "engagement_score": float(latest_score.score) if latest_score else 0,
                    "priority_tier": latest_score.priority_tier if latest_score else 4,
                    "pain_points": [
                        {
                            "pain_point": pp.pain_point,
                            "category": pp.pain_category,
                            "severity": pp.severity,
                            "confidence": float(pp.confidence) if pp.confidence else 0,
                            "evidence": pp.evidence or []
                        }
                        for pp in b.pain_points
                    ],
                    "opportunities": [
                        {
                            "opportunity": opp.opportunity,
                            "category": opp.opportunity_category,
                            "potential_impact": opp.potential_impact,
                            "confidence": float(opp.confidence) if opp.confidence else 0
                        }
                        for opp in b.opportunities
                    ],
                    "co_fit_solutions": [
                        {
                            "solution": sol.solution_name,
                            "category": sol.solution_category,
                            "description": sol.description,
                            "impact": sol.estimated_impact,
                            "complexity": sol.implementation_complexity,
                            "priority": sol.priority
                        }
                        for sol in b.solutions
                    ],
                    "updated_at": b.updated_at.isoformat() if b.updated_at else None,
                    "last_osint_refresh": b.last_osint_refresh.isoformat() if b.last_osint_refresh else None
                }
                businesses.append(business_dict)

        finally:
            session.close()

        print(f"Loaded {len(businesses)} businesses from PostgreSQL")
        return businesses

    def get_all_businesses(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Get all businesses, with caching"""
        if self._cache is not None and not force_refresh:
            return self._cache

        if self.use_db:
            self._cache = self._load_from_database()
        else:
            self._cache = self._load_from_json()

        self._cache_time = datetime.now()
        self.last_refresh = self._cache_time.isoformat()
        return self._cache

    def refresh(self) -> int:
        """Force refresh data and return count"""
        businesses = self.get_all_businesses(force_refresh=True)
        return len(businesses)

    def get_business_by_id(self, business_id: str) -> Optional[Dict[str, Any]]:
        """Get a single business by ID"""
        businesses = self.get_all_businesses()

        # Try exact match
        for b in businesses:
            if b.get('business_id') == business_id:
                return b

        # Try name match
        for b in businesses:
            if b.get('name', '').lower() == business_id.lower():
                return b

        return None

    def get_data_source(self) -> str:
        """Return current data source"""
        return "PostgreSQL" if self.use_db else "JSON"

    def get_stats(self) -> Dict[str, Any]:
        """Get repository statistics"""
        businesses = self.get_all_businesses()
        return {
            "total_businesses": len(businesses),
            "data_source": self.get_data_source(),
            "last_refresh": self.last_refresh,
            "total_pain_points": sum(len(b.get('pain_points', [])) for b in businesses),
            "total_opportunities": sum(len(b.get('opportunities', [])) for b in businesses),
            "total_solutions": sum(len(b.get('co_fit_solutions', [])) for b in businesses)
        }


# Singleton instance
_repository = None

def get_repository() -> BusinessRepository:
    """Get the singleton repository instance"""
    global _repository
    if _repository is None:
        _repository = BusinessRepository()
    return _repository
