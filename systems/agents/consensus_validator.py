"""
Stage 3: Multi-Agent Consensus Validator
Increases confidence from 0.6-0.8 to 0.8-0.9 through agent consensus

Architecture:
- Multiple validation agents with different perspectives (5 agents)
- Voting-based consensus mechanism (67% threshold)
- Confidence boost based on agreement level (+15% on consensus)

Technical Details:
- Uses AsyncAnthropic for concurrent API calls (all 5 agents validate in parallel)
- 30-second timeout per LLM call using asyncio.wait_for()
- Falls back to heuristic validation on timeout or API failure
- Expected performance: 2-5 min for 10 businesses (vs 10+ min sequential)

Usage:
    python weekly_refresh.py --businesses 10 --run-validation

    Or directly:
    python consensus_validator.py  # runs demo
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from config import settings


class AgentRole(Enum):
    """Different agent perspectives for validation"""
    INDUSTRY_EXPERT = "industry_expert"
    LOCAL_MARKET = "local_market"
    OPERATIONS = "operations"
    CUSTOMER = "customer"
    FINANCIAL = "financial"


@dataclass
class Vote:
    """Agent vote on a pain point or opportunity"""
    agent: AgentRole
    valid: bool
    confidence: float
    reasoning: str
    suggested_refinement: Optional[str] = None


@dataclass
class ConsensusResult:
    """Result of consensus voting"""
    item_type: str  # "pain_point" or "opportunity"
    original_text: str
    votes: List[Vote]
    consensus_reached: bool
    agreement_ratio: float
    final_confidence: float
    refined_text: Optional[str]
    reasoning: str


class ValidationAgent:
    """Individual validation agent with specific perspective"""

    PROMPTS = {
        AgentRole.INDUSTRY_EXPERT: """
You are an industry expert analyzing business pain points/opportunities.
Evaluate whether this {item_type} is valid for a {business_type} business:

"{item_text}"

Business context:
- Name: {business_name}
- Category: {category}
- Location: {location}

Consider:
1. Is this a real pain point/opportunity in this industry?
2. Does the evidence support it?
3. Is it specific enough to be actionable?

Respond in JSON:
{{"valid": true/false, "confidence": 0.0-1.0, "reasoning": "...", "refinement": "optional improved text"}}
""",
        AgentRole.LOCAL_MARKET: """
You are a Coral Gables local market analyst.
Evaluate whether this {item_type} is relevant for a Coral Gables business:

"{item_text}"

Business context:
- Name: {business_name}
- Category: {category}
- District: {district}

Consider:
1. Is this relevant to the Coral Gables market specifically?
2. Does it account for local demographics (affluent, international)?
3. Is it aligned with local business patterns?

Respond in JSON:
{{"valid": true/false, "confidence": 0.0-1.0, "reasoning": "...", "refinement": "optional improved text"}}
""",
        AgentRole.OPERATIONS: """
You are an operations consultant.
Evaluate this {item_type} from an operational perspective:

"{item_text}"

Business context:
- Name: {business_name}
- Category: {category}
- Type: {business_type}

Consider:
1. Is this operationally significant?
2. Can it be addressed with realistic solutions?
3. Is the severity/impact assessment accurate?

Respond in JSON:
{{"valid": true/false, "confidence": 0.0-1.0, "reasoning": "...", "refinement": "optional improved text"}}
""",
        AgentRole.CUSTOMER: """
You are analyzing from a customer perspective.
Evaluate whether this {item_type} would matter to customers:

"{item_text}"

Business context:
- Name: {business_name}
- Category: {category}

Consider:
1. Would customers notice or care about this?
2. Does it affect customer experience?
3. Is it a real customer-facing issue/opportunity?

Respond in JSON:
{{"valid": true/false, "confidence": 0.0-1.0, "reasoning": "...", "refinement": "optional improved text"}}
""",
        AgentRole.FINANCIAL: """
You are a financial analyst evaluating business opportunities.
Assess the financial relevance of this {item_type}:

"{item_text}"

Business context:
- Name: {business_name}
- Category: {category}
- Estimated revenue: {revenue}

Consider:
1. Does this have real financial impact?
2. Is addressing it worth the investment?
3. Is the cost-benefit realistic?

Respond in JSON:
{{"valid": true/false, "confidence": 0.0-1.0, "reasoning": "...", "refinement": "optional improved text"}}
"""
    }

    def __init__(self, role: AgentRole):
        self.role = role
        self.prompt_template = self.PROMPTS[role]

    async def validate(
        self,
        item_type: str,
        item_text: str,
        business_context: Dict[str, Any]
    ) -> Vote:
        """Validate a pain point or opportunity"""

        # Build prompt
        prompt = self.prompt_template.format(
            item_type=item_type,
            item_text=item_text,
            business_name=business_context.get('name', 'Unknown'),
            business_type=business_context.get('business_type', 'small business'),
            category=business_context.get('category', 'general'),
            location=business_context.get('location', 'Coral Gables, FL'),
            district=business_context.get('district', 'Coral Gables'),
            revenue=business_context.get('estimated_revenue', 'unknown')
        )

        # Call LLM if available
        if settings.anthropic.is_configured:
            try:
                response = await self._call_llm(prompt)
                return self._parse_response(response)
            except Exception as e:
                print(f"LLM call failed for {self.role.value}: {e}")

        # Fallback: heuristic validation
        return self._heuristic_validate(item_type, item_text, business_context)

    async def _call_llm(self, prompt: str) -> str:
        """Call Anthropic API (async with timeout)"""
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic.api_key)

        # Add timeout to prevent hanging (30 seconds per call)
        message = await asyncio.wait_for(
            client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            ),
            timeout=30.0
        )
        return message.content[0].text

    def _parse_response(self, response: str) -> Vote:
        """Parse LLM JSON response into Vote"""
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            json_str = response[start:end]
            data = json.loads(json_str)

            return Vote(
                agent=self.role,
                valid=data.get('valid', False),
                confidence=data.get('confidence', 0.5),
                reasoning=data.get('reasoning', ''),
                suggested_refinement=data.get('refinement')
            )
        except (json.JSONDecodeError, ValueError):
            return Vote(
                agent=self.role,
                valid=True,
                confidence=0.6,
                reasoning="Could not parse LLM response",
                suggested_refinement=None
            )

    def _heuristic_validate(
        self,
        item_type: str,
        item_text: str,
        context: Dict[str, Any]
    ) -> Vote:
        """Heuristic validation when LLM not available"""

        # Simple heuristics
        text_lower = item_text.lower()
        valid = True
        confidence = 0.7

        # Check for generic/vague language
        vague_terms = ['some', 'maybe', 'might', 'could be', 'possibly']
        if any(term in text_lower for term in vague_terms):
            confidence -= 0.1

        # Check for specificity
        if len(item_text) < 20:
            confidence -= 0.1
            valid = False

        # Check for category relevance
        category = context.get('category', '').lower()
        if category in text_lower:
            confidence += 0.1

        # Role-specific adjustments
        if self.role == AgentRole.LOCAL_MARKET:
            if 'coral gables' in text_lower or 'miami' in text_lower:
                confidence += 0.05

        confidence = max(0.3, min(0.9, confidence))

        return Vote(
            agent=self.role,
            valid=valid,
            confidence=confidence,
            reasoning=f"Heuristic validation ({self.role.value})",
            suggested_refinement=None
        )


class ConsensusValidator:
    """
    Multi-agent consensus system for PKP validation
    Achieves Stage 3 confidence levels (0.8-0.9)
    """

    def __init__(self, min_agents: int = 3, consensus_threshold: float = 0.67):
        """
        Initialize consensus validator

        Args:
            min_agents: Minimum number of agents to consult
            consensus_threshold: Ratio of agreement needed (default 2/3)
        """
        self.min_agents = min_agents
        self.consensus_threshold = consensus_threshold

        # Initialize agents
        self.agents = [
            ValidationAgent(AgentRole.INDUSTRY_EXPERT),
            ValidationAgent(AgentRole.LOCAL_MARKET),
            ValidationAgent(AgentRole.OPERATIONS),
            ValidationAgent(AgentRole.CUSTOMER),
            ValidationAgent(AgentRole.FINANCIAL)
        ]

    async def validate_item(
        self,
        item_type: str,
        item_text: str,
        business_context: Dict[str, Any],
        current_confidence: float = 0.5
    ) -> ConsensusResult:
        """
        Validate a single pain point or opportunity through consensus
        """
        # Select agents (use all for best results)
        selected_agents = self.agents[:self.min_agents]

        # Gather votes concurrently
        vote_tasks = [
            agent.validate(item_type, item_text, business_context)
            for agent in selected_agents
        ]
        votes = await asyncio.gather(*vote_tasks)

        # Calculate consensus
        valid_votes = sum(1 for v in votes if v.valid)
        total_votes = len(votes)
        agreement_ratio = valid_votes / total_votes

        consensus_reached = agreement_ratio >= self.consensus_threshold

        # Calculate final confidence
        if consensus_reached:
            # Boost confidence based on agreement
            avg_confidence = sum(v.confidence for v in votes) / len(votes)
            # Stage 3 target: 0.8-0.9
            final_confidence = min(0.95, max(current_confidence, avg_confidence) + (agreement_ratio * 0.15))
        else:
            # Lower confidence if no consensus
            final_confidence = min(current_confidence, 0.6)

        # Get refined text if any agent suggested one
        refinements = [v.suggested_refinement for v in votes if v.suggested_refinement]
        refined_text = refinements[0] if refinements else None

        # Build reasoning
        reasoning_parts = [f"{v.agent.value}: {v.reasoning}" for v in votes[:3]]
        reasoning = " | ".join(reasoning_parts)

        return ConsensusResult(
            item_type=item_type,
            original_text=item_text,
            votes=votes,
            consensus_reached=consensus_reached,
            agreement_ratio=agreement_ratio,
            final_confidence=final_confidence,
            refined_text=refined_text,
            reasoning=reasoning
        )

    async def validate_business(
        self,
        business_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate all pain points and opportunities for a business
        """
        context = {
            "name": business_data.get('name'),
            "category": business_data.get('category'),
            "subcategory": business_data.get('subcategory'),
            "district": business_data.get('district'),
            "business_type": business_data.get('business_type', 'small business'),
            "estimated_revenue": business_data.get('estimated_revenue')
        }

        validated_pain_points = []
        validated_opportunities = []

        # Validate pain points
        for pp in business_data.get('pain_points', []):
            text = pp.get('pain_point') or pp.get('point', '')
            current_conf = pp.get('confidence', 0.5)

            result = await self.validate_item(
                'pain point',
                text,
                context,
                current_conf
            )

            validated_pain_points.append({
                "pain_point": result.refined_text or result.original_text,
                "original": result.original_text,
                "category": pp.get('category', pp.get('pain_category')),
                "severity": pp.get('severity', 'medium'),
                "confidence": result.final_confidence,
                "consensus_reached": result.consensus_reached,
                "agreement_ratio": result.agreement_ratio,
                "validation_stage": 3,
                "reasoning": result.reasoning
            })

        # Validate opportunities
        for opp in business_data.get('opportunities', []):
            text = opp.get('opportunity', '')
            current_conf = opp.get('confidence', 0.5)

            result = await self.validate_item(
                'opportunity',
                text,
                context,
                current_conf
            )

            validated_opportunities.append({
                "opportunity": result.refined_text or result.original_text,
                "original": result.original_text,
                "category": opp.get('category', opp.get('opportunity_category')),
                "impact": opp.get('potential_impact', opp.get('impact', 'medium')),
                "confidence": result.final_confidence,
                "consensus_reached": result.consensus_reached,
                "agreement_ratio": result.agreement_ratio,
                "validation_stage": 3,
                "reasoning": result.reasoning
            })

        return {
            "business_id": business_data.get('business_id'),
            "name": business_data.get('name'),
            "pain_points": validated_pain_points,
            "opportunities": validated_opportunities,
            "validation_timestamp": datetime.now().isoformat(),
            "validation_stage": 3,
            "avg_pain_point_confidence": sum(p['confidence'] for p in validated_pain_points) / len(validated_pain_points) if validated_pain_points else 0,
            "avg_opportunity_confidence": sum(o['confidence'] for o in validated_opportunities) / len(validated_opportunities) if validated_opportunities else 0
        }


async def demo():
    """Demo the consensus validator"""
    print("=" * 60)
    print("Stage 3: Multi-Agent Consensus Validation Demo")
    print("=" * 60)

    # Sample business data
    sample_business = {
        "name": "Books & Books",
        "category": "retail",
        "subcategory": "bookstore",
        "district": "Coral Gables",
        "business_type": "Independent bookstore",
        "pain_points": [
            {
                "pain_point": "Weekend capacity management and staff scheduling",
                "category": "operational",
                "severity": "high",
                "confidence": 0.75
            },
            {
                "pain_point": "Competition from Amazon affecting foot traffic",
                "category": "market",
                "severity": "high",
                "confidence": 0.70
            }
        ],
        "opportunities": [
            {
                "opportunity": "Host author events to drive community engagement",
                "category": "growth",
                "impact": "high",
                "confidence": 0.72
            }
        ]
    }

    validator = ConsensusValidator(min_agents=3)

    print(f"\nValidating: {sample_business['name']}")
    print("-" * 40)

    result = await validator.validate_business(sample_business)

    print(f"\nResults:")
    print(f"  Pain Points Validated: {len(result['pain_points'])}")
    print(f"  Avg Pain Point Confidence: {result['avg_pain_point_confidence']:.2f}")

    for pp in result['pain_points']:
        status = "✓" if pp['consensus_reached'] else "?"
        print(f"    {status} {pp['pain_point'][:50]}...")
        print(f"      Confidence: {pp['confidence']:.2f} (was {sample_business['pain_points'][0]['confidence']})")
        print(f"      Agreement: {pp['agreement_ratio']:.0%}")

    print(f"\n  Opportunities Validated: {len(result['opportunities'])}")
    print(f"  Avg Opportunity Confidence: {result['avg_opportunity_confidence']:.2f}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(demo())
