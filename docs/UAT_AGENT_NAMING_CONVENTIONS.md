# UAT Report: Agent Naming Conventions & Consistency Analysis

**Date:** December 2025
**Version:** 1.0
**Status:** UAT Complete - Issues Identified

---

## Executive Summary

This UAT report analyzes the Coral Gables BI Platform codebase for naming convention consistency across all agents, modules, and components. Several inconsistencies have been identified that should be addressed for maintainability and developer experience.

---

## 1. Agent Naming Convention Analysis

### 1.1 Current Agent Inventory

| File | Class Name | Suffix Pattern | Status |
|------|------------|----------------|--------|
| `osint_production_collector.py` | `GoogleMapsAgent` | Agent | OK |
| `osint_production_collector.py` | `YelpAgent` | Agent | OK |
| `osint_production_collector.py` | `WebsiteAnalyzer` | Analyzer | **INCONSISTENT** |
| `osint_production_collector.py` | `SocialMediaAnalyzer` | Analyzer | **INCONSISTENT** |
| `osint_production_collector.py` | `ChamberAgent` | Agent | OK |
| `osint_production_collector.py` | `FinancialEstimator` | Estimator | **INCONSISTENT** |
| `osint_production_collector.py` | `PainPointExtractor` | Extractor | **INCONSISTENT** |
| `osint_production_collector.py` | `CoFitAnalyzer` | Analyzer | **INCONSISTENT** |
| `osint_production_collector.py` | `OSINTOrchestrator` | Orchestrator | OK |
| `osint_orchestrator.py` | `WebScraperAgent` | Agent | OK |
| `osint_orchestrator.py` | `PublicRecordsAgent` | Agent | OK |
| `osint_orchestrator.py` | `SocialIntelligenceAgent` | Agent | OK |
| `osint_orchestrator.py` | `FinancialIntelligenceAgent` | Agent | OK |
| `osint_orchestrator.py` | `CompetitiveIntelligenceAgent` | Agent | OK |
| `osint_orchestrator.py` | `LLMEnrichmentAgent` | Agent | OK |
| `osint_orchestrator.py` | `DataValidatorAgent` | Agent | OK |
| `osint_orchestrator.py` | `BIAggregatorAgent` | Agent | OK |
| `consensus_validator.py` | `ValidationAgent` | Agent | OK |
| `consensus_validator.py` | `ConsensusValidator` | Validator | OK |
| `google_places_collector.py` | `GooglePlacesCollector` | Collector | **INCONSISTENT** |
| `yelp_collector.py` | `YelpCollector` | Collector | **INCONSISTENT** |
| `pkp_validator.py` | `PKPValidator` | Validator | OK |

### 1.2 Inconsistency Summary

**5 Different Suffix Patterns Found:**
1. `Agent` (12 classes) - Primary pattern
2. `Analyzer` (3 classes)
3. `Collector` (2 classes)
4. `Extractor` (1 class)
5. `Estimator` (1 class)

**Recommendation:** Standardize on `Agent` suffix for all OSINT collection components.

---

## 2. Duplicate Class Definitions

### 2.1 Critical: Duplicate OSINTOrchestrator

| Location | Implementation |
|----------|----------------|
| `osint_orchestrator.py:619` | Full agent architecture (8 agents), uses separate agent classes |
| `osint_production_collector.py:970` | Production implementation with async context manager |

**Issue:** Two different `OSINTOrchestrator` classes exist with different implementations.

**Impact:** High - Developers may import the wrong one.

**Recommendation:** Deprecate `osint_orchestrator.py` version or rename one.

### 2.2 Critical: Duplicate BusinessProfile

| Location | Fields |
|----------|--------|
| `osint_orchestrator.py:71` | 47 fields, complex dataclass |
| `osint_production_collector.py:63` | 25 fields, simpler dataclass |

**Issue:** Two `BusinessProfile` dataclasses with different schemas.

**Impact:** High - Data model confusion.

**Recommendation:** Use a single canonical `BusinessProfile` in a `models.py` file.

### 2.3 Duplicate Repository Pattern

| File | Class | Purpose |
|------|-------|---------|
| `repository.py` | `BusinessRepository` (ABC) | Abstract base class |
| `repository.py` | `JSONRepository` | JSON file backend |
| `repository.py` | `PostgreSQLRepository` | PostgreSQL backend |
| `db_repository.py` | `BusinessRepository` | Combined JSON/PostgreSQL |

**Issue:** Two different repository implementations with overlapping functionality.

**Impact:** Medium - Code duplication and confusion about which to use.

**Recommendation:** Consolidate into single `repository.py` with clear factory pattern.

---

## 3. File Naming Conventions

### 3.1 Python Files

| File | Pattern | Status |
|------|---------|--------|
| `bi_api.py` | snake_case | OK |
| `config.py` | snake_case | OK |
| `database.py` | snake_case | OK |
| `db_repository.py` | snake_case | OK |
| `repository.py` | snake_case | OK |
| `consensus_validator.py` | snake_case | OK |
| `osint_orchestrator.py` | snake_case | OK |
| `osint_production_collector.py` | snake_case | OK |
| `google_places_collector.py` | snake_case | OK |
| `yelp_collector.py` | snake_case | OK |
| `pkp_validator.py` | snake_case | OK |
| `coral_gables_pkp_generator.py` | snake_case | OK |
| `generate_comprehensive_bi_database.py` | snake_case | OK |
| `generate_top_100_pkp.py` | snake_case | OK |
| `weekly_refresh.py` | snake_case | OK |
| `validate_all_data.py` | snake_case | OK |
| `migrate_json_to_db.py` | snake_case | OK |

**Result:** All Python files follow `snake_case` convention. **PASS**

### 3.2 Documentation Files

| File | Pattern | Status |
|------|---------|--------|
| `README.md` | UPPERCASE | OK |
| `SOP_DATA_REFRESH.md` | SCREAMING_SNAKE_CASE | OK |
| `UAT_TESTING.md` | SCREAMING_SNAKE_CASE | OK |
| `doploylogs.md` | lowercase (TYPO!) | **FAIL** |
| `buildlogs.md` | lowercase | OK |

**Issues Found:**
1. `doploylogs.md` has typo - should be `deploy_logs.md` or `DEPLOY_LOGS.md`
2. Inconsistent casing between documentation files

---

## 4. Function & Method Naming

### 4.1 Async Function Naming

| Pattern | Example | Status |
|---------|---------|--------|
| `async def collect()` | `GoogleMapsAgent.search()` | OK |
| `async def _private()` | `YelpAgent._search_via_api()` | OK |
| `def sync_method()` | `FinancialEstimator.estimate_revenue()` | OK |

**Result:** Consistent use of async/await patterns. **PASS**

### 4.2 Private Method Naming

All private methods use `_underscore_prefix` convention. **PASS**

---

## 5. Data Model Field Naming

### 5.1 Pain Points Schema Inconsistency

| Location | Field Name | Alternative Name |
|----------|------------|------------------|
| `osint_production_collector.py` | `pain_point` | - |
| `consensus_validator.py` | `pain_point` | `point` |
| `pkp_validator.py` | `point` | - |
| `bi_api.py` | `pain_point` | `point` |

**Issue:** Mixed use of `pain_point` vs `point` field names.

**Recommendation:** Standardize on `pain_point` field name everywhere.

### 5.2 Category Field Naming

| Location | Field Name | Alternative Name |
|----------|------------|------------------|
| `database.py` | `pain_category` | - |
| `osint_production_collector.py` | `category` | - |
| `bi_api.py` | `category` | `pain_category` |

**Issue:** Mixed use of `category` vs `pain_category`.

**Recommendation:** Use `category` in JSON, `pain_category` in database for clarity.

### 5.3 Opportunity Schema Inconsistency

| Location | Field Name | Alternative Name |
|----------|------------|------------------|
| `database.py` | `opportunity_category` | - |
| `osint_production_collector.py` | `category` | - |
| `bi_api.py` | `category` | `opportunity_category` |

**Recommendation:** Standardize to match Pain Points pattern.

---

## 6. Configuration Naming

### 6.1 Environment Variables

| Variable | Used In | Status |
|----------|---------|--------|
| `GOOGLE_PLACES_API_KEY` | config.py | OK |
| `YELP_API_KEY` | config.py | OK |
| `ANTHROPIC_API_KEY` | config.py | OK |
| `DATABASE_URL` | config.py | OK |
| `ADMIN_API_KEY` | bi_api.py | OK |
| `CORS_ORIGINS` | bi_api.py | OK |
| `APP_ENV` | config.py | OK |
| `API_HOST` | config.py | OK |
| `API_PORT` | config.py | OK |
| `API_URL` | weekly_refresh.py | OK |

**Result:** All environment variables follow `SCREAMING_SNAKE_CASE`. **PASS**

---

## 7. Test Recommendations

### 7.1 Agent Import Tests

```python
# Test all agents can be imported from consistent location
def test_agent_imports():
    from osint_production_collector import (
        GoogleMapsAgent,
        YelpAgent,
        WebsiteAnalyzer,  # Should be WebsiteAgent
        ChamberAgent,
        FinancialEstimator,  # Should be FinancialAgent
        PainPointExtractor,  # Should be PainPointAgent
        CoFitAnalyzer,  # Should be CoFitAgent
        OSINTOrchestrator
    )
    assert all([
        GoogleMapsAgent,
        YelpAgent,
        ChamberAgent,
        OSINTOrchestrator
    ])
```

### 7.2 Schema Consistency Tests

```python
def test_pain_point_schema():
    """Verify pain point field names are consistent"""
    required_fields = ['pain_point', 'category', 'severity', 'confidence']
    # Test across all data sources
```

---

## 8. Acceptance Criteria Checklist

| Criteria | Status | Notes |
|----------|--------|-------|
| Python files use snake_case | PASS | All 17 files compliant |
| Agent classes use consistent suffix | **FAIL** | 5 different patterns |
| No duplicate class definitions | **FAIL** | 2 critical duplicates |
| Documentation files consistent | **FAIL** | Typo in doploylogs.md |
| Environment variables SCREAMING_SNAKE | PASS | All compliant |
| Data model fields consistent | **FAIL** | pain_point vs point |
| Private methods use underscore | PASS | All compliant |
| Async functions properly named | PASS | All compliant |

---

## 9. Remediation Priority

### P1 - Critical (Fix Immediately)
1. Resolve duplicate `OSINTOrchestrator` classes
2. Resolve duplicate `BusinessProfile` dataclasses
3. Fix `doploylogs.md` typo

### P2 - High (Fix This Sprint)
1. Standardize agent class suffixes to `Agent`
2. Consolidate repository pattern into single file
3. Standardize `pain_point` vs `point` field naming

### P3 - Medium (Fix Next Sprint)
1. Add type hints to all functions
2. Create central `models.py` for shared data classes
3. Document canonical import paths

---

## 10. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Tech Lead | | | |

---

*Report Generated: December 2025*
