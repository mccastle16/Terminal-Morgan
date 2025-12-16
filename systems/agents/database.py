"""
Database connection and models for Coral Gables BI Platform
Uses SQLAlchemy 2.0 with async support
"""

import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean,
    DateTime, Text, ForeignKey, JSON, DECIMAL, ARRAY
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import (
    declarative_base, relationship, sessionmaker, Session
)
from sqlalchemy.pool import NullPool

from config import settings

# Create base class for models
Base = declarative_base()


# =============================================================================
# DATABASE CONNECTION
# =============================================================================

def get_sync_engine():
    """Get synchronous database engine"""
    url = settings.database.url
    return create_engine(url, pool_pre_ping=True)


def get_async_engine():
    """Get async database engine"""
    # Convert postgresql:// to postgresql+asyncpg://
    url = settings.database.url.replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    return create_async_engine(url, poolclass=NullPool)


def get_session() -> Session:
    """Get a synchronous database session"""
    engine = get_sync_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


async def get_async_session() -> AsyncSession:
    """Get an async database session"""
    engine = get_async_engine()
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    return async_session()


# =============================================================================
# SQLALCHEMY MODELS
# =============================================================================

class Business(Base):
    """Core business entity"""
    __tablename__ = "businesses"

    business_id = Column(String(16), primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255))
    business_type = Column(String(50))
    founded_date = Column(DateTime)
    years_in_business = Column(Integer)
    lifecycle_stage = Column(String(50), default="prospecting", index=True)
    data_completeness_score = Column(DECIMAL(3, 2))
    confidence_score = Column(DECIMAL(3, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_osint_refresh = Column(DateTime)

    # Relationships
    categories = relationship("BusinessCategory", back_populates="business")
    locations = relationship("BusinessLocation", back_populates="business")
    pain_points = relationship("PainPoint", back_populates="business")
    opportunities = relationship("Opportunity", back_populates="business")
    solutions = relationship("CoFitSolution", back_populates="business")
    engagement_scores = relationship("EngagementScore", back_populates="business")


class BusinessCategory(Base):
    """Business category classification"""
    __tablename__ = "business_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"))
    category = Column(String(100), index=True)
    subcategory = Column(String(100))
    primary_category = Column(Boolean, default=False)

    business = relationship("Business", back_populates="categories")


class BusinessLocation(Base):
    """Business location details"""
    __tablename__ = "business_locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"))
    location_type = Column(String(20))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(2))
    zip_code = Column(String(10))
    country = Column(String(2), default="US")
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    district = Column(String(100), index=True)
    primary_location = Column(Boolean, default=False)

    business = relationship("Business", back_populates="locations")


class PainPoint(Base):
    """Business pain points (LLM-derived)"""
    __tablename__ = "pain_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"), index=True)
    pain_point = Column(Text)
    pain_category = Column(String(100))
    severity = Column(String(20))
    evidence = Column(ARRAY(Text))
    confidence = Column(DECIMAL(3, 2))
    identified_date = Column(DateTime, default=datetime.utcnow)
    source = Column(String(100))

    business = relationship("Business", back_populates="pain_points")


class Opportunity(Base):
    """Business opportunities (LLM-derived)"""
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"), index=True)
    opportunity = Column(Text)
    opportunity_category = Column(String(100))
    potential_impact = Column(String(20))
    estimated_value = Column(DECIMAL(15, 2))
    confidence = Column(DECIMAL(3, 2))
    identified_date = Column(DateTime, default=datetime.utcnow)
    source = Column(String(100))

    business = relationship("Business", back_populates="opportunities")


class CoFitSolution(Base):
    """Co_ fit solutions for business"""
    __tablename__ = "co_fit_solutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"), index=True)
    solution_name = Column(String(255))
    solution_category = Column(String(100))
    description = Column(Text)
    estimated_impact = Column(Text)
    implementation_complexity = Column(String(20))
    estimated_cost_range = Column(String(50))
    priority = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="solutions")


class EngagementScore(Base):
    """Business engagement scoring"""
    __tablename__ = "engagement_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"), index=True)
    score = Column(DECIMAL(5, 2), index=True)
    score_components = Column(JSON)
    priority_tier = Column(Integer, index=True)
    reasoning = Column(Text)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="engagement_scores")


class CustomerReview(Base):
    """Customer reviews from various platforms"""
    __tablename__ = "customer_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(String(16), ForeignKey("businesses.business_id"), index=True)
    platform = Column(String(50), index=True)
    rating = Column(DECIMAL(3, 2))
    review_text = Column(Text)
    reviewer_name = Column(String(255))
    review_date = Column(DateTime, index=True)
    helpful_count = Column(Integer)
    sentiment_score = Column(DECIMAL(3, 2))
    collected_at = Column(DateTime, default=datetime.utcnow)


class DataSource(Base):
    """Data source registry"""
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_name = Column(String(100), unique=True)
    source_type = Column(String(50))
    authority_score = Column(DECIMAL(3, 2))
    active = Column(Boolean, default=True)


class CollectionRun(Base):
    """OSINT collection run tracking"""
    __tablename__ = "collection_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), unique=True)
    run_type = Column(String(50))
    businesses_processed = Column(Integer)
    sources_queried = Column(Integer)
    data_points_collected = Column(Integer)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    status = Column(String(20))
    error_log = Column(Text)


# =============================================================================
# DATABASE UTILITIES
# =============================================================================

def create_tables():
    """Create all tables"""
    engine = get_sync_engine()
    Base.metadata.create_all(engine)
    print("✓ Tables created successfully")


def drop_tables():
    """Drop all tables (use with caution!)"""
    engine = get_sync_engine()
    Base.metadata.drop_all(engine)
    print("✓ Tables dropped")


def test_connection():
    """Test database connection"""
    try:
        engine = get_sync_engine()
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            print("✓ Database connection successful")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "create":
            create_tables()
        elif command == "drop":
            drop_tables()
        elif command == "test":
            test_connection()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python database.py [create|drop|test]")
    else:
        test_connection()
