"""
Migration script: JSON data to PostgreSQL
Imports existing business data from JSON files into PostgreSQL
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List
import hashlib

from database import (
    get_session, create_tables, Business, BusinessCategory,
    BusinessLocation, PainPoint, Opportunity, CoFitSolution,
    EngagementScore
)


def load_json_database() -> Dict[str, Any]:
    """Load the main JSON database"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(
        script_dir, "..", "data", "coral_gables_bi_database_v2.json"
    )

    with open(data_path, 'r') as f:
        return json.load(f)


def generate_business_id(name: str) -> str:
    """Generate a consistent business ID from name"""
    return hashlib.sha256(
        f"{name}_coral_gables".encode()
    ).hexdigest()[:16]


def migrate_business(session, business_data: Dict[str, Any]) -> Business:
    """Migrate a single business record"""
    business_id = business_data.get('business_id') or generate_business_id(
        business_data.get('name', '')
    )

    # Check if business already exists
    existing = session.query(Business).filter_by(business_id=business_id).first()
    if existing:
        print(f"  Skipping (exists): {business_data.get('name')}")
        return existing

    # Create business record
    business = Business(
        business_id=business_id,
        name=business_data.get('name', ''),
        legal_name=business_data.get('legal_name'),
        business_type=business_data.get('business_type'),
        lifecycle_stage=business_data.get('lifecycle_stage', 'prospecting'),
        data_completeness_score=business_data.get('data_completeness', 0),
        confidence_score=business_data.get('confidence_score', 0),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(business)

    # Add category
    if business_data.get('category'):
        category = BusinessCategory(
            business_id=business_id,
            category=business_data.get('category'),
            subcategory=business_data.get('subcategory'),
            primary_category=True
        )
        session.add(category)

    # Add location
    address_data = business_data.get('address')
    # Handle nested address dict or string
    if isinstance(address_data, dict):
        address_line1 = address_data.get('street', '')
        city = address_data.get('city', 'Coral Gables')
        state = address_data.get('state', 'FL')
        zip_code = address_data.get('zip', address_data.get('zip_code', ''))
    else:
        address_line1 = address_data if isinstance(address_data, str) else None
        city = 'Coral Gables'
        state = 'FL'
        zip_code = None

    location = BusinessLocation(
        business_id=business_id,
        location_type='headquarters',
        address_line1=address_line1,
        city=city,
        state=state,
        zip_code=zip_code,
        country='US',
        latitude=business_data.get('latitude'),
        longitude=business_data.get('longitude'),
        district=business_data.get('district'),
        primary_location=True
    )
    session.add(location)

    # Add pain points
    for pp in business_data.get('pain_points', []):
        pain_point = PainPoint(
            business_id=business_id,
            pain_point=pp.get('pain_point') or pp.get('point', ''),
            pain_category=pp.get('category') or pp.get('pain_category', ''),
            severity=pp.get('severity', 'medium'),
            evidence=pp.get('evidence', []) if isinstance(pp.get('evidence'), list) else [pp.get('evidence', '')],
            confidence=pp.get('confidence', 0.5),
            source=pp.get('source', 'pkp_generator')
        )
        session.add(pain_point)

    # Add opportunities
    for opp in business_data.get('opportunities', []):
        opportunity = Opportunity(
            business_id=business_id,
            opportunity=opp.get('opportunity', ''),
            opportunity_category=opp.get('category') or opp.get('opportunity_category', ''),
            potential_impact=opp.get('potential_impact') or opp.get('impact', 'medium'),
            confidence=opp.get('confidence', 0.5),
            source=opp.get('source', 'pkp_generator')
        )
        session.add(opportunity)

    # Add solutions
    for idx, sol in enumerate(business_data.get('co_fit_solutions', [])):
        solution = CoFitSolution(
            business_id=business_id,
            solution_name=sol.get('solution') or sol.get('name', ''),
            solution_category=sol.get('category') or sol.get('solution_category', ''),
            description=sol.get('description', ''),
            estimated_impact=sol.get('impact') or sol.get('estimated_impact', ''),
            implementation_complexity=sol.get('complexity', 'medium'),
            priority=sol.get('priority', idx + 1)
        )
        session.add(solution)

    # Add engagement score
    engagement_score = business_data.get('engagement_score', 0)
    if engagement_score:
        # Calculate tier from score
        if engagement_score >= 90:
            tier = 1
        elif engagement_score >= 80:
            tier = 2
        elif engagement_score >= 70:
            tier = 3
        else:
            tier = 4

        score = EngagementScore(
            business_id=business_id,
            score=engagement_score,
            priority_tier=business_data.get('priority_tier', tier),
            reasoning=f"Score calculated from PKP data"
        )
        session.add(score)

    return business


def run_migration():
    """Run the full migration"""
    print("=" * 60)
    print("JSON to PostgreSQL Migration")
    print("=" * 60)

    # Load JSON data
    print("\n1. Loading JSON database...")
    data = load_json_database()
    businesses = data.get('businesses', [])
    print(f"   Found {len(businesses)} businesses to migrate")

    # Create tables if needed
    print("\n2. Ensuring database tables exist...")
    try:
        create_tables()
    except Exception as e:
        print(f"   Warning: {e}")

    # Migrate businesses
    print("\n3. Migrating businesses...")
    session = get_session()

    try:
        migrated = 0
        skipped = 0

        for i, business_data in enumerate(businesses, 1):
            name = business_data.get('name', 'Unknown')
            try:
                result = migrate_business(session, business_data)
                if result:
                    migrated += 1
                    print(f"   [{i}/{len(businesses)}] ✓ {name}")
            except Exception as e:
                print(f"   [{i}/{len(businesses)}] ✗ {name}: {e}")
                skipped += 1

        # Commit all changes
        session.commit()
        print(f"\n4. Migration complete!")
        print(f"   Migrated: {migrated}")
        print(f"   Skipped: {skipped}")

    except Exception as e:
        session.rollback()
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        session.close()

    print("\n" + "=" * 60)


def verify_migration():
    """Verify migration was successful"""
    print("\nVerifying migration...")
    session = get_session()

    try:
        business_count = session.query(Business).count()
        pain_point_count = session.query(PainPoint).count()
        opportunity_count = session.query(Opportunity).count()
        solution_count = session.query(CoFitSolution).count()

        print(f"  Businesses: {business_count}")
        print(f"  Pain Points: {pain_point_count}")
        print(f"  Opportunities: {opportunity_count}")
        print(f"  Solutions: {solution_count}")

        # Sample query
        sample = session.query(Business).first()
        if sample:
            print(f"\n  Sample business: {sample.name}")
            print(f"    Categories: {len(sample.categories)}")
            print(f"    Pain points: {len(sample.pain_points)}")

    finally:
        session.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        verify_migration()
    else:
        run_migration()
        verify_migration()
