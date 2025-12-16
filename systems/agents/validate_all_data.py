#!/usr/bin/env python3
"""
Full Data Validation Pipeline
Runs LLM-based validation on all businesses to generate personalized confidence levels

Usage:
    python validate_all_data.py

Requires:
    ANTHROPIC_API_KEY in .env file
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from consensus_validator import ConsensusValidator, AgentRole


class FullDataValidator:
    """Validates all business data using multi-agent LLM consensus"""

    def __init__(self, data_path: str):
        self.data_path = Path(data_path)
        self.validator = ConsensusValidator(min_agents=5, consensus_threshold=0.6)
        self.stats = {
            "businesses_processed": 0,
            "pain_points_validated": 0,
            "opportunities_validated": 0,
            "confidence_improvements": [],
            "errors": []
        }

    def load_data(self) -> Dict:
        """Load the JSON database"""
        with open(self.data_path, 'r') as f:
            return json.load(f)

    def save_data(self, data: Dict, output_path: str):
        """Save validated data to file"""
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\n  Saved to: {output_path}")

    async def validate_business(self, business: Dict, index: int, total: int) -> Dict:
        """Validate a single business through the consensus system"""
        name = business.get('name', 'Unknown')
        print(f"\n[{index + 1}/{total}] Validating: {name}")
        print(f"  Category: {business.get('category')}")
        print(f"  Pain Points: {len(business.get('pain_points', []))}")
        print(f"  Opportunities: {len(business.get('opportunities', []))}")

        # Build context
        context = {
            "name": name,
            "category": business.get('category'),
            "subcategory": business.get('subcategory'),
            "district": business.get('district'),
            "business_type": f"{business.get('subcategory', '')} {business.get('category', '')}".strip(),
            "estimated_revenue": business.get('estimated_revenue', {}).get('range', 'unknown')
        }

        validated_pain_points = []
        validated_opportunities = []

        # Validate pain points
        original_pp_conf = []
        for pp in business.get('pain_points', []):
            text = pp.get('pain_point', pp.get('point', ''))
            if not text:
                continue

            original_conf = pp.get('confidence', 0.5)
            original_pp_conf.append(original_conf)

            try:
                result = await self.validator.validate_item(
                    'pain point',
                    text,
                    context,
                    original_conf
                )

                validated_pain_points.append({
                    "pain_point": result.refined_text or result.original_text,
                    "category": pp.get('category', 'general'),
                    "severity": pp.get('severity', 'medium'),
                    "confidence": round(result.final_confidence, 3),
                    "original_confidence": original_conf,
                    "consensus_reached": result.consensus_reached,
                    "agreement_ratio": round(result.agreement_ratio, 2),
                    "validation_stage": 3,
                    "evidence": [f"multi_agent_consensus_{result.agreement_ratio:.0%}"],
                    "validated_at": datetime.now().isoformat()
                })

                self.stats["pain_points_validated"] += 1

            except Exception as e:
                self.stats["errors"].append(f"{name} pain point: {str(e)}")
                validated_pain_points.append(pp)  # Keep original on error

        # Validate opportunities
        original_opp_conf = []
        for opp in business.get('opportunities', []):
            text = opp.get('opportunity', '')
            if not text:
                continue

            original_conf = opp.get('confidence', 0.5)
            original_opp_conf.append(original_conf)

            try:
                result = await self.validator.validate_item(
                    'opportunity',
                    text,
                    context,
                    original_conf
                )

                validated_opportunities.append({
                    "opportunity": result.refined_text or result.original_text,
                    "category": opp.get('category', 'growth'),
                    "potential_impact": opp.get('potential_impact', opp.get('impact', 'medium')),
                    "confidence": round(result.final_confidence, 3),
                    "original_confidence": original_conf,
                    "consensus_reached": result.consensus_reached,
                    "agreement_ratio": round(result.agreement_ratio, 2),
                    "validation_stage": 3,
                    "validated_at": datetime.now().isoformat()
                })

                self.stats["opportunities_validated"] += 1

            except Exception as e:
                self.stats["errors"].append(f"{name} opportunity: {str(e)}")
                validated_opportunities.append(opp)

        # Calculate confidence improvement
        if validated_pain_points:
            new_avg = sum(p['confidence'] for p in validated_pain_points) / len(validated_pain_points)
            old_avg = sum(original_pp_conf) / len(original_pp_conf) if original_pp_conf else 0.5
            improvement = new_avg - old_avg
            self.stats["confidence_improvements"].append({
                "business": name,
                "old_avg": old_avg,
                "new_avg": new_avg,
                "improvement": improvement
            })
            print(f"  Confidence: {old_avg:.2f} -> {new_avg:.2f} ({'+' if improvement >= 0 else ''}{improvement:.2f})")

        # Update business with validated data
        validated_business = business.copy()
        validated_business['pain_points'] = validated_pain_points
        validated_business['opportunities'] = validated_opportunities
        validated_business['validation_timestamp'] = datetime.now().isoformat()
        validated_business['validation_stage'] = 3

        # Recalculate engagement score based on new confidence
        if validated_pain_points:
            avg_pp_conf = sum(p['confidence'] for p in validated_pain_points) / len(validated_pain_points)
            # Boost engagement score slightly if high confidence
            if avg_pp_conf > 0.8:
                validated_business['engagement_score'] = min(100, business.get('engagement_score', 70) + 5)

        self.stats["businesses_processed"] += 1
        return validated_business

    async def run_full_validation(self, limit: int = None) -> Dict:
        """Run validation on all businesses"""
        print("=" * 60)
        print("FULL DATA VALIDATION PIPELINE")
        print("=" * 60)
        print(f"\nStarted: {datetime.now().isoformat()}")

        # Check API configuration
        print("\nAPI Configuration:")
        settings.print_status()

        if not settings.anthropic.is_configured:
            print("\n" + "!" * 60)
            print("WARNING: ANTHROPIC_API_KEY not configured!")
            print("Running in HEURISTIC-ONLY mode (less accurate)")
            print("Add your API key to .env for full LLM validation")
            print("!" * 60)
            print("\nContinuing with heuristic validation...")

        # Load data
        print(f"\nLoading data from: {self.data_path}")
        data = self.load_data()

        businesses = data.get('businesses', [])
        total = len(businesses)
        print(f"Found {total} businesses to validate")

        if limit:
            businesses = businesses[:limit]
            print(f"Limiting to first {limit} businesses")

        # Validate all businesses
        validated_businesses = []
        for i, business in enumerate(businesses):
            validated = await self.validate_business(business, i, len(businesses))
            validated_businesses.append(validated)

            # Save progress every 10 businesses
            if (i + 1) % 10 == 0:
                print(f"\n  Progress: {i + 1}/{len(businesses)} businesses validated")

        # Update data with validated businesses
        data['businesses'] = validated_businesses
        data['meta']['validation_timestamp'] = datetime.now().isoformat()
        data['meta']['validation_stage'] = 3
        data['meta']['methodology'] = 'multi_agent_llm_consensus_validation'

        return data

    def print_summary(self):
        """Print validation summary"""
        print("\n" + "=" * 60)
        print("VALIDATION SUMMARY")
        print("=" * 60)

        print(f"\nBusinesses Processed: {self.stats['businesses_processed']}")
        print(f"Pain Points Validated: {self.stats['pain_points_validated']}")
        print(f"Opportunities Validated: {self.stats['opportunities_validated']}")

        if self.stats['confidence_improvements']:
            improvements = [c['improvement'] for c in self.stats['confidence_improvements']]
            avg_improvement = sum(improvements) / len(improvements)
            print(f"\nAverage Confidence Improvement: {avg_improvement:+.3f}")

            # Show top improvements
            sorted_improvements = sorted(
                self.stats['confidence_improvements'],
                key=lambda x: x['improvement'],
                reverse=True
            )
            print("\nTop 5 Confidence Improvements:")
            for item in sorted_improvements[:5]:
                print(f"  {item['business']}: {item['old_avg']:.2f} -> {item['new_avg']:.2f} ({item['improvement']:+.2f})")

            # Show varied confidence distribution
            all_new_confs = [c['new_avg'] for c in self.stats['confidence_improvements']]
            print(f"\nConfidence Distribution:")
            print(f"  Min: {min(all_new_confs):.2f}")
            print(f"  Max: {max(all_new_confs):.2f}")
            print(f"  Avg: {sum(all_new_confs)/len(all_new_confs):.2f}")

        if self.stats['errors']:
            print(f"\nErrors: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:
                print(f"  - {error}")


async def main():
    """Main entry point"""
    # Paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / "data"
    input_file = data_dir / "coral_gables_bi_database_v2.json"
    output_file = data_dir / "coral_gables_bi_database_validated.json"

    # Check if input exists
    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        return

    # Create validator
    validator = FullDataValidator(str(input_file))

    # Check for command line args
    limit = None
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
            print(f"Limiting validation to {limit} businesses")
        except ValueError:
            pass

    # Run validation
    validated_data = await validator.run_full_validation(limit=limit)

    if validated_data:
        # Save results
        validator.save_data(validated_data, str(output_file))

        # Print summary
        validator.print_summary()

        print("\n" + "=" * 60)
        print("VALIDATION COMPLETE")
        print("=" * 60)
        print(f"\nValidated data saved to: {output_file}")
        print("\nNext steps:")
        print("  1. Review the validated data")
        print("  2. Replace the original with: mv coral_gables_bi_database_validated.json coral_gables_bi_database_v2.json")
        print("  3. Run the API: uvicorn bi_api:app --reload")
    else:
        print("\nValidation failed - check API configuration")


if __name__ == "__main__":
    asyncio.run(main())
