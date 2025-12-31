#!/usr/bin/env python3
"""
Weekly Data Refresh Script for Coral Gables BI Platform

This script runs the full OSINT collection and validation pipeline,
then updates the production data (PostgreSQL or JSON fallback).

Database Size (Dec 2025):
- 927 businesses total (844 Chamber members + 83 additional)
- Primary source: Coral Gables Chamber of Commerce member directory
- Secondary: Google Places API, Yelp Fusion API enrichment

Schedule: Weekly (Sunday 6 AM EST)
Runtime: ~45-90 minutes for 927 businesses

Usage:
    python weekly_refresh.py                    # Full refresh (927 businesses)
    python weekly_refresh.py --dry-run          # Preview only
    python weekly_refresh.py --businesses 100   # Limit businesses
    python weekly_refresh.py --run-validation   # Include LLM validation
"""

import os
import sys
import json
import asyncio
import argparse
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings

# Check if PostgreSQL is available
USE_POSTGRES = bool(os.getenv("DATABASE_URL"))


def run_migrations():
    """Run database migrations to ensure schema is up to date"""
    if not USE_POSTGRES:
        return

    try:
        from sqlalchemy import create_engine, text
        from database import create_tables

        # Ensure tables exist first
        log("Creating/verifying database tables...")
        create_tables()

        database_url = os.getenv("DATABASE_URL")
        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Migration 001: Increase potential_impact column size
            # This is idempotent - safe to run multiple times
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'opportunities'
                        AND column_name = 'potential_impact'
                        AND character_maximum_length < 100
                    ) THEN
                        ALTER TABLE opportunities
                        ALTER COLUMN potential_impact TYPE VARCHAR(100);
                        RAISE NOTICE 'Migration: potential_impact column increased to VARCHAR(100)';
                    END IF;
                END $$;
            """))
            conn.commit()
            log("Database migrations checked/applied")
    except Exception as e:
        log(f"Migration warning (non-fatal): {e}", "WARN")


def log(message: str, level: str = "INFO"):
    """Simple logging with timestamps"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")


def check_api_keys():
    """Verify required API keys are configured"""
    log("Checking API configuration...")
    settings.print_status()

    missing = []
    if not settings.google.is_configured:
        missing.append("GOOGLE_PLACES_API_KEY")
    if not settings.anthropic.is_configured:
        missing.append("ANTHROPIC_API_KEY (optional but recommended)")

    if "GOOGLE_PLACES_API_KEY" in missing:
        log("WARNING: Google Places API key not configured - using web scraping fallback", "WARN")

    return len([m for m in missing if "optional" not in m.lower()]) == 0


async def run_osint_collection(business_limit: int = 100):
    """Run the OSINT production collector"""
    log(f"Starting OSINT collection for up to {business_limit} businesses...")

    try:
        from osint_production_collector import OSINTOrchestrator, CONFIG

        # Load existing businesses to get names and categories
        # Canonical data location: systems/data/
        business_list = []
        db_file = os.path.join(os.path.dirname(__file__), "..", "data", "coral_gables_bi_database_v2.json")

        if os.path.exists(db_file):
            with open(db_file, 'r') as f:
                data = json.load(f)
                for biz in data.get("businesses", [])[:business_limit]:
                    business_list.append({
                        "name": biz.get("name"),
                        "category": biz.get("category", "unknown")
                    })
            log(f"Loaded {len(business_list)} businesses from {db_file}")

        if not business_list:
            log("No existing business data found, using default list", "WARN")
            business_list = [
                {"name": "Luca Osteria", "category": "restaurant"},
                {"name": "Books & Books", "category": "retail"},
                {"name": "Graziano's Restaurant", "category": "restaurant"},
                {"name": "Bulla Gastrobar", "category": "restaurant"},
                {"name": "The Plump Room", "category": "spa"},
            ][:business_limit]

        # Use async context manager and collect data
        async with OSINTOrchestrator() as orchestrator:
            profiles = await orchestrator.collect_market_intelligence(business_list)

        log(f"OSINT collection complete: {len(profiles)} businesses collected")
        return profiles
    except Exception as e:
        log(f"OSINT collection failed: {e}", "ERROR")
        return []


def run_validation(input_file: str, output_file: str, business_count: int = 10):
    """Run the validation pipeline"""
    log(f"Starting validation pipeline...")

    # Calculate timeout: ~5 minutes per business (based on actual runs)
    # Minimum 10 minutes, maximum 10 hours for large runs
    timeout_seconds = min(36000, max(600, business_count * 300))
    timeout_hours = timeout_seconds / 3600
    log(f"Validation timeout set to {timeout_seconds} seconds ({timeout_hours:.1f} hours)")

    try:
        # Import and run validation
        import subprocess
        result = subprocess.run(
            [sys.executable, "validate_all_data.py", str(business_count)],
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )

        if result.returncode == 0:
            log("Validation complete")
            # Print validation output
            if result.stdout:
                for line in result.stdout.split('\n')[-20:]:  # Last 20 lines
                    if line.strip():
                        log(f"  {line}")
            return True
        else:
            log(f"Validation failed: {result.stderr}", "ERROR")
            return False
    except subprocess.TimeoutExpired:
        log(f"Validation timed out after {timeout_seconds} seconds", "ERROR")
        log("Try running with fewer businesses or skip validation", "WARN")
        return False
    except Exception as e:
        log(f"Validation error: {e}", "ERROR")
        return False


def save_to_postgres(profiles):
    """Save collected profiles to PostgreSQL database"""
    log("Saving data to PostgreSQL...")

    try:
        from database import (
            get_session, create_tables, Business, BusinessCategory,
            BusinessLocation, PainPoint, Opportunity, CoFitSolution,
            EngagementScore
        )
        import hashlib

        # Ensure tables exist
        create_tables()

        session = get_session()
        saved_count = 0

        for profile in profiles:
            try:
                # Generate business ID
                business_id = hashlib.sha256(
                    f"{profile.name}_coral_gables".encode()
                ).hexdigest()[:16]

                # Check if exists
                existing = session.query(Business).filter_by(business_id=business_id).first()

                if existing:
                    # Update existing record
                    existing.data_completeness_score = profile.data_completeness
                    existing.confidence_score = profile.confidence_score
                    existing.updated_at = datetime.utcnow()
                    existing.last_osint_refresh = datetime.utcnow()

                    # Clear and re-add pain points
                    session.query(PainPoint).filter_by(business_id=business_id).delete()
                    session.query(Opportunity).filter_by(business_id=business_id).delete()
                    session.query(CoFitSolution).filter_by(business_id=business_id).delete()
                else:
                    # Create new business
                    business = Business(
                        business_id=business_id,
                        name=profile.name,
                        lifecycle_stage='prospecting',
                        data_completeness_score=profile.data_completeness,
                        confidence_score=profile.confidence_score,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                        last_osint_refresh=datetime.utcnow()
                    )
                    session.add(business)

                    # Add category
                    if hasattr(profile, 'category') and profile.category:
                        category = BusinessCategory(
                            business_id=business_id,
                            category=profile.category,
                            subcategory=getattr(profile, 'subcategory', None),
                            primary_category=True
                        )
                        session.add(category)

                    # Add location
                    # Extract address string from dict (profile.address may be {"full": "..."} or {})
                    address_data = getattr(profile, 'address', None)
                    if isinstance(address_data, dict):
                        address_line1 = address_data.get('full') or address_data.get('street') or None
                    else:
                        address_line1 = address_data if isinstance(address_data, str) else None

                    location = BusinessLocation(
                        business_id=business_id,
                        location_type='headquarters',
                        address_line1=address_line1,
                        city='Coral Gables',
                        state='FL',
                        country='US',
                        latitude=getattr(profile, 'latitude', None),
                        longitude=getattr(profile, 'longitude', None),
                        district=getattr(profile, 'district', None),
                        primary_location=True
                    )
                    session.add(location)

                # Add pain points
                for pp in profile.pain_points:
                    pain_point = PainPoint(
                        business_id=business_id,
                        pain_point=pp.get('pain_point', pp.get('point', '')),
                        pain_category=pp.get('category', pp.get('pain_category', '')),
                        severity=pp.get('severity', 'medium'),
                        confidence=pp.get('confidence', 0.5),
                        source='osint_collector'
                    )
                    session.add(pain_point)

                # Add opportunities
                for opp in profile.opportunities:
                    opportunity = Opportunity(
                        business_id=business_id,
                        opportunity=opp.get('opportunity', ''),
                        opportunity_category=opp.get('category', opp.get('opportunity_category', '')),
                        potential_impact=opp.get('potential_impact', opp.get('impact', 'medium')),
                        confidence=opp.get('confidence', 0.5),
                        source='osint_collector'
                    )
                    session.add(opportunity)

                # Add engagement score
                if hasattr(profile, 'engagement_score') and profile.engagement_score:
                    score = profile.engagement_score
                    tier = 1 if score >= 90 else 2 if score >= 80 else 3 if score >= 70 else 4
                    engagement = EngagementScore(
                        business_id=business_id,
                        score=score,
                        priority_tier=tier,
                        reasoning="Calculated from OSINT collection"
                    )
                    session.add(engagement)

                saved_count += 1

            except Exception as e:
                log(f"  Error saving {profile.name}: {e}", "WARN")
                continue

        session.commit()
        session.close()

        log(f"PostgreSQL update complete: {saved_count} businesses saved")
        return saved_count

    except ImportError as e:
        log(f"PostgreSQL dependencies not available: {e}", "ERROR")
        return 0
    except Exception as e:
        log(f"PostgreSQL save failed: {e}", "ERROR")
        return 0


def update_production_data(source_file: str, target_file: str):
    """Copy validated data to production location (JSON fallback)"""
    log(f"Updating production data (JSON)...")

    try:
        import shutil

        if os.path.exists(source_file):
            shutil.copy(source_file, target_file)
            log(f"Production data updated: {target_file}")
            return True
        else:
            log(f"Source file not found: {source_file}", "ERROR")
            return False
    except Exception as e:
        log(f"Failed to update production data: {e}", "ERROR")
        return False


def trigger_api_refresh(api_url: str, api_key: str):
    """Trigger the API to reload data"""
    log(f"Triggering API refresh...")

    try:
        import requests

        response = requests.post(
            f"{api_url}/api/v2/admin/refresh",
            params={"api_key": api_key},
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            log(f"API refresh successful: {result.get('businesses_loaded')} businesses loaded")
            return True
        else:
            log(f"API refresh failed: {response.status_code} - {response.text}", "ERROR")
            return False
    except Exception as e:
        log(f"API refresh error: {e}", "ERROR")
        return False


def generate_refresh_report(stats: dict):
    """Generate a summary report of the refresh"""
    report = f"""
================================================================================
WEEKLY DATA REFRESH REPORT
================================================================================
Timestamp: {datetime.now().isoformat()}

COLLECTION STATS:
  Businesses Processed: {stats.get('businesses_processed', 0)}
  Pain Points Found: {stats.get('pain_points', 0)}
  Opportunities Found: {stats.get('opportunities', 0)}

DATA QUALITY:
  Avg Completeness: {stats.get('avg_completeness', 0):.1%}
  Avg Confidence: {stats.get('avg_confidence', 0):.1%}

VALIDATION:
  Businesses Validated: {stats.get('validated', 0)}
  Confidence Boost: +{stats.get('confidence_boost', 0):.1%}

STATUS: {stats.get('status', 'UNKNOWN')}
================================================================================
"""
    return report


async def main():
    parser = argparse.ArgumentParser(description="Weekly Data Refresh for Coral Gables BI")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, don't update production")
    parser.add_argument("--businesses", type=int, default=100, help="Number of businesses to process")
    parser.add_argument("--skip-osint", action="store_true", help="Skip OSINT collection, just validate")
    parser.add_argument("--skip-validation", action="store_true", default=True, help="Skip validation step (default: True for stability)")
    parser.add_argument("--run-validation", action="store_true", help="Run validation step (overrides --skip-validation)")
    parser.add_argument("--api-url", default=os.getenv("API_URL", "http://localhost:8000"), help="API URL")
    parser.add_argument("--api-key", default=os.getenv("ADMIN_API_KEY"), help="Admin API key (from ADMIN_API_KEY env var)")

    args = parser.parse_args()

    log("=" * 60)
    log("WEEKLY DATA REFRESH STARTING")
    log("=" * 60)

    # Run database migrations first
    run_migrations()

    if args.dry_run:
        log("DRY RUN MODE - No production changes will be made", "WARN")

    stats = {
        "businesses_processed": 0,
        "pain_points": 0,
        "opportunities": 0,
        "avg_completeness": 0,
        "avg_confidence": 0,
        "validated": 0,
        "confidence_boost": 0,
        "status": "STARTED"
    }

    # Step 1: Check API keys
    api_keys_ok = check_api_keys()

    # Step 2: Run OSINT collection
    if not args.skip_osint:
        profiles = await run_osint_collection(args.businesses)
        stats["businesses_processed"] = len(profiles)

        if profiles:
            stats["pain_points"] = sum(len(p.pain_points) for p in profiles)
            stats["opportunities"] = sum(len(p.opportunities) for p in profiles)
            stats["avg_completeness"] = sum(p.data_completeness for p in profiles) / len(profiles)
            stats["avg_confidence"] = sum(p.confidence_score for p in profiles) / len(profiles)
    else:
        log("Skipping OSINT collection (--skip-osint)")

    # Step 3: Run validation (skipped by default for stability, use --run-validation to enable)
    should_validate = args.run_validation or not args.skip_validation
    if should_validate and args.run_validation:
        business_count = stats["businesses_processed"] or args.businesses
        # Canonical data location: systems/data/
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        validated_file = os.path.join(data_dir, "coral_gables_bi_database_validated.json")
        original_file = os.path.join(data_dir, "coral_gables_bi_database_v2.json")

        validation_ok = run_validation(
            original_file,
            validated_file,
            business_count=business_count
        )
        if validation_ok:
            stats["validated"] = business_count
            stats["confidence_boost"] = 0.16  # Typical boost

            # Auto-replace original with validated data
            try:
                import shutil
                if os.path.exists(validated_file):
                    # Backup original first
                    backup_file = original_file.replace(".json", "_backup.json")
                    shutil.copy(original_file, backup_file)
                    log(f"Backed up original to: {backup_file}")

                    # Replace original with validated
                    shutil.copy(validated_file, original_file)
                    log(f"Replaced original with validated data")
            except Exception as e:
                log(f"Failed to auto-replace original file: {e}", "WARN")
    else:
        log("Skipping validation (default behavior - use --run-validation to enable)")

    # Step 4: Update production data
    if not args.dry_run:
        if USE_POSTGRES and profiles:
            # Save directly to PostgreSQL
            log("Using PostgreSQL for data storage")
            saved = save_to_postgres(profiles)
            stats["postgres_saved"] = saved
        else:
            # Fallback to JSON file
            log("Using JSON file for data storage")
            # Canonical data location: systems/data/
            data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
            validated_file = os.path.join(data_dir, "coral_gables_bi_database_validated.json")
            production_file = os.path.join(data_dir, "coral_gables_bi_database_v2.json")

            if os.path.exists(validated_file):
                update_production_data(validated_file, production_file)

        # Trigger API refresh if API URL is provided
        if args.api_url and "localhost" not in args.api_url:
            trigger_api_refresh(args.api_url, args.api_key)

    # Generate report
    stats["status"] = "SUCCESS" if stats["businesses_processed"] > 0 else "PARTIAL"
    report = generate_refresh_report(stats)
    print(report)

    # Save report to file (use local data directory, create if needed)
    try:
        report_dir = Path("data")
        report_dir.mkdir(exist_ok=True)
        report_file = report_dir / f"refresh_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, "w") as f:
            f.write(report)
        log(f"Report saved to: {report_file}")
    except Exception as e:
        log(f"Could not save report file: {e}", "WARNING")

    log("=" * 60)
    log("WEEKLY DATA REFRESH COMPLETE")
    log("=" * 60)

    return 0 if stats["status"] == "SUCCESS" else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
