"""
PKP Validator - Stage 2: LLM-powered pain point refinement
Version: 2.0
Purpose: Analyze OSINT observations to generate specific, evidence-backed pain points

Pipeline Position:
    Stage 1: OSINT Agents → raw observations
    Stage 2: PKP Validator → refined pain points (THIS FILE)
    Stage 3: Consensus Validator → confidence boost

This is the "brain" that turns raw observations into actionable insights.
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

from config import settings


class PKPValidator:
    """
    Refines pain points using LLM analysis of OSINT observations.

    Takes generic/assumed pain points + raw observations from OSINT agents
    and generates specific, evidence-backed pain points.
    """

    REFINEMENT_PROMPT = """You are a business analyst specializing in local businesses in Coral Gables, Florida.

You have been given data about a business from multiple OSINT sources:
1. Current pain points (may be generic or assumed)
2. Real observations from Google, Yelp, website analysis, social media
3. Business context (category, ratings, reviews)

Your job: Analyze the observations to infer ACTUAL, SPECIFIC pain points.

RULES:
- Be specific, not generic (e.g., "45-min weekend wait times" not "long waits")
- Ground pain points in the observations provided
- Assign confidence scores (0-1) based on strength of evidence
- Identify severity (low/medium/high/critical)
- Note which observations support each pain point
- Generate 3-5 high-quality pain points, not a long list of weak ones
- If observations don't support a pain point, don't include it

OUTPUT FORMAT (JSON only, no markdown):
{{
  "refined_pain_points": [
    {{
      "pain_point": "Specific pain point description",
      "category": "operations|marketing|technology|customer_experience|financial",
      "severity": "low|medium|high|critical",
      "confidence": 0.0-1.0,
      "evidence_type": "observed|inferred|assumed",
      "reasoning": "Why this is a pain point based on observations",
      "supporting_evidence": ["observation 1", "observation 2"],
      "solution_hints": ["Potential solution 1", "Potential solution 2"]
    }}
  ],
  "opportunities": [
    {{
      "opportunity": "Specific opportunity description",
      "category": "growth|efficiency|differentiation|digital",
      "potential_impact": "low|medium|high",
      "confidence": 0.0-1.0,
      "reasoning": "Why this is an opportunity"
    }}
  ],
  "data_quality_notes": "Assessment of observation quality and gaps"
}}

Now analyze this business:

BUSINESS: {business_name}
CATEGORY: {category}
LOCATION: Coral Gables, FL

CURRENT PAIN POINTS:
{current_pain_points}

OSINT OBSERVATIONS:
{observations}

Provide your refined analysis as JSON only."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Anthropic client if available"""
        if settings.anthropic.is_configured:
            try:
                from anthropic import AsyncAnthropic
                self.client = AsyncAnthropic(api_key=settings.anthropic.api_key)
            except ImportError:
                print("Warning: anthropic package not installed")
                self.client = None
        else:
            print("Warning: Anthropic API not configured - PKP validation will use heuristics")

    def _extract_observations(self, raw_data: Dict[str, Any]) -> str:
        """Extract observations from OSINT raw_data into readable format"""
        observations = []

        # Google Maps data
        if "google_maps" in raw_data:
            gm = raw_data["google_maps"]
            if gm.get("rating"):
                observations.append(f"Google rating: {gm['rating']}/5 ({gm.get('review_count', 0)} reviews)")
            if gm.get("reviews"):
                for review in gm["reviews"][:3]:  # Top 3 reviews
                    observations.append(f"Google review: \"{review.get('text', '')[:200]}...\"")
            if gm.get("hours"):
                observations.append(f"Business hours: {gm['hours']}")

        # Yelp data
        if "yelp" in raw_data:
            yelp = raw_data["yelp"]
            if yelp.get("rating"):
                observations.append(f"Yelp rating: {yelp['rating']}/5 ({yelp.get('review_count', 0)} reviews)")
            if yelp.get("reviews"):
                for review in yelp["reviews"][:3]:
                    observations.append(f"Yelp review: \"{review.get('text', '')[:200]}...\"")
            if yelp.get("price"):
                observations.append(f"Price range: {yelp['price']}")

        # Website analysis
        if "website" in raw_data:
            web = raw_data["website"]
            if web.get("has_booking"):
                observations.append("Has online booking system")
            else:
                observations.append("No online booking detected")
            if web.get("technologies"):
                observations.append(f"Website technologies: {', '.join(web['technologies'][:5])}")
            if web.get("social_links"):
                observations.append(f"Social presence: {', '.join(web['social_links'].keys())}")

        # Social media
        if "social_media" in raw_data:
            social = raw_data["social_media"]
            if social.get("instagram"):
                ig = social["instagram"]
                observations.append(f"Instagram: {ig.get('followers', 0)} followers, {ig.get('posts', 0)} posts")
            if social.get("facebook"):
                fb = social["facebook"]
                observations.append(f"Facebook: {fb.get('likes', 0)} likes")

        # Chamber membership
        if "chamber" in raw_data:
            chamber = raw_data["chamber"]
            if chamber.get("is_member"):
                observations.append("Chamber of Commerce member")
            if chamber.get("board_member"):
                observations.append("Chamber board member")

        # Financial estimates
        if "financial" in raw_data:
            fin = raw_data["financial"]
            if fin.get("estimated_revenue"):
                observations.append(f"Estimated revenue: {fin['estimated_revenue']}")
            if fin.get("employee_count"):
                observations.append(f"Estimated employees: {fin['employee_count']}")

        return "\n".join(f"- {obs}" for obs in observations) if observations else "No observations available"

    def _format_pain_points(self, pain_points: List[Dict]) -> str:
        """Format current pain points for the prompt"""
        if not pain_points:
            return "None identified yet"

        lines = []
        for pp in pain_points:
            text = pp.get("pain_point") or pp.get("point") or str(pp)
            confidence = pp.get("confidence", 0.5)
            lines.append(f"- {text} (confidence: {confidence})")

        return "\n".join(lines)

    async def refine_business(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Refine pain points for a single business using LLM analysis.

        Args:
            business_data: Dict with name, category, pain_points, raw_data, etc.

        Returns:
            Dict with refined_pain_points, opportunities, and metadata
        """
        name = business_data.get("name", "Unknown")
        category = business_data.get("category", "unknown")
        current_pain_points = business_data.get("pain_points", [])
        raw_data = business_data.get("raw_data", {})

        # Extract observations from raw OSINT data
        observations = self._extract_observations(raw_data)

        # Build prompt
        prompt = self.REFINEMENT_PROMPT.format(
            business_name=name,
            category=category,
            current_pain_points=self._format_pain_points(current_pain_points),
            observations=observations
        )

        # If no LLM available, use heuristic refinement
        if not self.client:
            return self._heuristic_refinement(business_data)

        try:
            # Call Claude
            response = await asyncio.wait_for(
                self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                ),
                timeout=30.0
            )

            # Parse response
            response_text = response.content[0].text

            # Extract JSON from response
            try:
                # Try to parse as pure JSON
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                import re
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(1))
                else:
                    # Fallback to heuristic
                    return self._heuristic_refinement(business_data)

            # Add metadata
            result["business_name"] = name
            result["refined_at"] = datetime.utcnow().isoformat()
            result["refinement_method"] = "llm"

            return result

        except asyncio.TimeoutError:
            print(f"  Timeout refining {name}, using heuristic")
            return self._heuristic_refinement(business_data)
        except Exception as e:
            print(f"  Error refining {name}: {e}, using heuristic")
            return self._heuristic_refinement(business_data)

    def _heuristic_refinement(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback heuristic refinement when LLM is unavailable.
        Applies basic logic to improve pain point confidence.
        """
        name = business_data.get("name", "Unknown")
        category = business_data.get("category", "unknown")
        current_pain_points = business_data.get("pain_points", [])
        raw_data = business_data.get("raw_data", {})

        refined = []

        # Check for common patterns in observations
        has_booking = raw_data.get("website", {}).get("has_booking", False)
        google_rating = raw_data.get("google_maps", {}).get("rating", 0)
        yelp_rating = raw_data.get("yelp", {}).get("rating", 0)
        has_instagram = bool(raw_data.get("social_media", {}).get("instagram"))

        # Add observation-backed pain points
        if not has_booking and category in ["restaurant", "spa", "salon", "medical"]:
            refined.append({
                "pain_point": "No online booking system detected",
                "category": "technology",
                "severity": "medium",
                "confidence": 0.8,
                "evidence_type": "observed",
                "reasoning": "Website analysis shows no booking integration",
                "supporting_evidence": ["No booking system detected on website"],
                "solution_hints": ["Implement OpenTable/Resy", "Add Calendly integration"]
            })

        if google_rating and google_rating < 4.0:
            refined.append({
                "pain_point": f"Below-average Google rating ({google_rating}/5)",
                "category": "customer_experience",
                "severity": "high",
                "confidence": 0.9,
                "evidence_type": "observed",
                "reasoning": "Google rating below 4.0 indicates customer satisfaction issues",
                "supporting_evidence": [f"Google rating: {google_rating}"],
                "solution_hints": ["Review response strategy", "Customer feedback program"]
            })

        if not has_instagram and category in ["restaurant", "retail", "spa"]:
            refined.append({
                "pain_point": "Limited social media presence",
                "category": "marketing",
                "severity": "low",
                "confidence": 0.7,
                "evidence_type": "observed",
                "reasoning": "No Instagram presence detected for customer-facing business",
                "supporting_evidence": ["No Instagram account found"],
                "solution_hints": ["Create Instagram business account", "Content strategy"]
            })

        # Include original pain points with slight confidence boost if they have evidence
        for pp in current_pain_points:
            text = pp.get("pain_point") or pp.get("point", "")
            confidence = min(pp.get("confidence", 0.5) + 0.1, 0.85)  # Slight boost, cap at 0.85
            refined.append({
                "pain_point": text,
                "category": pp.get("category", "operations"),
                "severity": pp.get("severity", "medium"),
                "confidence": confidence,
                "evidence_type": "assumed",
                "reasoning": "Carried forward from initial analysis",
                "supporting_evidence": [],
                "solution_hints": []
            })

        return {
            "business_name": name,
            "refined_pain_points": refined[:5],  # Top 5
            "opportunities": [],
            "data_quality_notes": "Heuristic refinement - LLM unavailable",
            "refined_at": datetime.utcnow().isoformat(),
            "refinement_method": "heuristic"
        }

    async def refine_batch(
        self,
        businesses: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Refine pain points for multiple businesses concurrently.

        Args:
            businesses: List of business data dicts
            max_concurrent: Max concurrent LLM calls

        Returns:
            List of refinement results
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def refine_with_limit(business):
            async with semaphore:
                return await self.refine_business(business)

        tasks = [refine_with_limit(b) for b in businesses]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle any exceptions
        processed = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"  Error processing business {i}: {result}")
                processed.append(self._heuristic_refinement(businesses[i]))
            else:
                processed.append(result)

        return processed


async def run_pkp_refinement(businesses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Main entry point for PKP refinement stage.

    Args:
        businesses: List of business dicts from OSINT collection

    Returns:
        List of businesses with refined pain points
    """
    print(f"\n{'='*60}")
    print("STAGE 2: PKP REFINEMENT")
    print(f"{'='*60}")
    print(f"Refining pain points for {len(businesses)} businesses...")

    validator = PKPValidator()
    results = await validator.refine_batch(businesses)

    # Merge refinements back into business data
    for business, refinement in zip(businesses, results):
        if refinement.get("refined_pain_points"):
            business["pain_points"] = refinement["refined_pain_points"]
        if refinement.get("opportunities"):
            business["opportunities"] = refinement["opportunities"]
        business["pkp_refined"] = True
        business["pkp_refined_at"] = refinement.get("refined_at")
        business["pkp_method"] = refinement.get("refinement_method")

    # Stats
    llm_count = sum(1 for r in results if r.get("refinement_method") == "llm")
    heuristic_count = len(results) - llm_count

    print(f"\n✓ PKP refinement complete:")
    print(f"  - LLM refined: {llm_count}")
    print(f"  - Heuristic: {heuristic_count}")

    return businesses


# Demo/test
if __name__ == "__main__":
    # Test with sample business
    test_business = {
        "name": "Test Restaurant",
        "category": "restaurant",
        "pain_points": [
            {"pain_point": "Long wait times", "confidence": 0.5}
        ],
        "raw_data": {
            "google_maps": {
                "rating": 4.2,
                "review_count": 150,
                "reviews": [
                    {"text": "Great food but waited 30 minutes for a table on Saturday"}
                ]
            },
            "yelp": {
                "rating": 4.0,
                "price": "$$"
            },
            "website": {
                "has_booking": False
            }
        }
    }

    async def test():
        validator = PKPValidator()
        result = await validator.refine_business(test_business)
        print(json.dumps(result, indent=2))

    asyncio.run(test())
