"""
PKP Validator - Uses LLM reasoning to refine pain points
Version: 1.0
Purpose: Take generic PKPs and use Claude/GPT to infer better pain points from observations
"""

import json
from typing import Dict, List


class PKPValidator:
    """
    Validates and refines PKP pain points using LLM reasoning.
    
    Takes a PKP with generic pain points and uses the observations + context
    to infer more accurate, specific pain points.
    """
    
    def __init__(self):
        self.validation_prompts = {
            "pain_point_analysis": self._build_pain_point_prompt(),
            "knowledge_gap_priority": self._build_knowledge_gap_prompt(),
            "action_refinement": self._build_action_prompt()
        }
    
    def _build_pain_point_prompt(self) -> str:
        """Build prompt for pain point analysis."""
        return """You are a business analyst specializing in local businesses in Coral Gables, Florida.

You have been given a Precise Knowledge Protocol (PKP) for a business that contains:
1. Generic pain points (low confidence, assumed)
2. Real observations from the business
3. Business context (type, location, customer base)

Your job: Analyze the observations and context to infer ACTUAL pain points this business likely faces.

RULES:
- Be specific, not generic
- Ground pain points in the observations provided
- Assign confidence scores (0-1) based on strength of evidence
- Identify severity (low/medium/high/critical)
- Note which observations support each pain point
- If observations don't support a pain point, mark confidence as low

OUTPUT FORMAT (JSON):
{{
  "refined_pain_points": [
    {{
      "point": "Specific pain point description",
      "severity": "low|medium|high|critical",
      "evidence": "observational|inferred|assumed",
      "confidence": 0.0-1.0,
      "reasoning": "Why you think this is a pain point",
      "supporting_observations": ["observation 1", "observation 2"],
      "mitigation_ideas": ["Idea 1", "Idea 2"]
    }}
  ],
  "confidence_increase": "How much more confident are we now vs generic",
  "validation_notes": "Overall assessment and caveats"
}}

Now analyze this business:

{{business_context}}

Original Generic Pain Points:
{{generic_pain_points}}

Observations:
{{observations}}

Provide your refined pain point analysis."""
    
    def _build_knowledge_gap_prompt(self) -> str:
        """Build prompt for prioritizing knowledge gaps."""
        return """Given the refined pain points and current knowledge gaps,
        prioritize which gaps would give us the most value to close.
        
        Focus on: 
        1. Which gaps would validate/invalidate our pain point hypotheses
        2. Which gaps are easiest to close
        3. Which gaps have highest ROI for the business
        
        Return prioritized list with reasoning."""
    
    def _build_action_prompt(self) -> str:
        """Build prompt for refining actions."""
        return """Given the refined pain points, suggest specific, actionable next steps.
        
        Each action should:
        1. Address a specific pain point
        2. Have clear success criteria
        3. Be feasible for a small local business
        4. Have estimated effort and impact
        
        Return prioritized action list."""
    
    def validate_pkp(self, pkp: Dict) -> Dict:
        """
        Validate and refine a PKP.
        
        Args:
            pkp: Original PKP dictionary
            
        Returns:
            Refined PKP with improved pain points
        """
        
        # Extract relevant info
        business_context = {
            "name": pkp["node"]["name"],
            "type": pkp["node"]["type"],
            "location": pkp["node"]["location"],
            "thesis": pkp["node"]["thesis"],
            "customer_profile": pkp["context"]["customer_profile"],
            "market": pkp["context"]["market"]
        }
        
        generic_pain_points = pkp["pain_points"]
        observations = pkp["context"]["observations"]
        
        # Build the prompt
        prompt = self.validation_prompts["pain_point_analysis"].format(
            business_context=json.dumps(business_context, indent=2),
            generic_pain_points=json.dumps(generic_pain_points, indent=2),
            observations=json.dumps(observations, indent=2)
        )
        
        # Return the prompt for LLM execution
        return {
            "original_pkp": pkp,
            "validation_prompt": prompt,
            "next_step": "Feed this prompt to Claude/GPT to get refined pain points"
        }
    
    def apply_refinements(self, original_pkp: Dict, llm_response: Dict) -> Dict:
        """
        Apply LLM refinements to the original PKP.
        
        Args:
            original_pkp: Original PKP
            llm_response: Response from LLM with refined pain points
            
        Returns:
            Updated PKP
        """
        refined_pkp = original_pkp.copy()
        
        # Replace pain points with refined version
        refined_pkp["pain_points"] = llm_response["refined_pain_points"]
        
        # Update confidence score
        refined_pain_points = llm_response["refined_pain_points"]
        avg_confidence = (
            sum(pp["confidence"] for pp in refined_pain_points) / len(refined_pain_points)
            if refined_pain_points else 0.0
        )
        
        refined_pkp["meta"]["confidence"] = round(avg_confidence, 2)
        
        # Add validation metadata
        refined_pkp["validation"] = {
            "validated_at": "timestamp",
            "validator": "llm_assisted",
            "confidence_increase": llm_response.get("confidence_increase"),
            "notes": llm_response.get("validation_notes")
        }
        
        return refined_pkp
    
    def generate_summary_report(self, original_pkp: Dict, refined_pkp: Dict) -> str:
        """
        Generate a summary report comparing original vs refined PKP.
        
        Args:
            original_pkp: Original PKP
            refined_pkp: Refined PKP
            
        Returns:
            Markdown report
        """
        report = f"""# PKP Validation Report
## {refined_pkp['node']['name']}

### Confidence Improvement
- **Original Confidence**: {original_pkp['meta']['confidence']}
- **Refined Confidence**: {refined_pkp['meta']['confidence']}
- **Improvement**: {refined_pkp['meta']['confidence'] - original_pkp['meta']['confidence']:.2f}

---

## Original Pain Points (Generic)
"""
        
        for i, pp in enumerate(original_pkp['pain_points'], 1):
            report += f"""
### {i}. {pp['point']}
- **Severity**: {pp.get('severity', 'unknown')}
- **Confidence**: {pp.get('confidence', 0.0)}
- **Note**: {pp.get('note', 'N/A')}
"""
        
        report += "\n---\n\n## Refined Pain Points (LLM-Validated)\n"
        
        for i, pp in enumerate(refined_pkp.get('pain_points', []), 1):
            report += f"""
### {i}. {pp['point']}
- **Severity**: {pp.get('severity', 'unknown')}
- **Confidence**: {pp.get('confidence', 0.0)}
- **Evidence**: {pp.get('evidence', 'N/A')}
- **Reasoning**: {pp.get('reasoning', 'N/A')}
- **Supporting Observations**: {', '.join(pp.get('supporting_observations', []))}
- **Mitigation Ideas**: 
"""
            for idea in pp.get('mitigation_ideas', []):
                report += f"  - {idea}\n"
        
        report += f"""
---

## Validation Notes
{refined_pkp.get('validation', {}).get('notes', 'No validation notes provided.')}

---

## Recommended Next Actions
"""
        
        for i, action in enumerate(refined_pkp.get('actions', []), 1):
            report += f"""
{i}. **{action.get('action', 'Unknown action')}**
   - Priority: {action.get('priority', 'unknown')}
   - Effort: {action.get('effort', 'unknown')}
   - Method: {action.get('method', 'N/A')}
"""
        
        return report


# Example usage
if __name__ == "__main__":
    # Load the PKP we just generated
    import subprocess
    import json
    
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    result = subprocess.run(
        ["python", "coral_gables_pkp_generator.py"],
        capture_output=True,
        text=True,
        cwd=script_dir
    )
    
    # Parse the JSON output (everything before the analysis section)
    output_lines = result.stdout.split("\n")
    json_output = []
    for line in output_lines:
        if line.startswith("==="):
            break
        json_output.append(line)
    
    pkp_json = "\n".join(json_output)
    pkp = json.loads(pkp_json)
    
    # Create validator
    validator = PKPValidator()
    
    # Generate validation prompt
    validation_package = validator.validate_pkp(pkp)
    
    print("="*80)
    print("PKP VALIDATION PACKAGE")
    print("="*80)
    print("\nThis prompt should be sent to Claude/GPT for validation:\n")
    print(validation_package["validation_prompt"])
    
    print("\n\n" + "="*80)
    print("EXAMPLE: What LLM Response Should Look Like")
    print("="*80)
    
    # Example refined pain points (what we want from LLM)
    example_llm_response = {
        "refined_pain_points": [
            {
                "point": "Weekend capacity management and staff scheduling",
                "severity": "medium",
                "evidence": "observational",
                "confidence": 0.75,
                "reasoning": "Heavy weekend foot traffic suggests potential for understaffing or overcrowding issues. Independent bookstores often struggle with variable demand.",
                "supporting_observations": [
                    "Heavy foot traffic on weekends"
                ],
                "mitigation_ideas": [
                    "Implement appointment/reservation system for study spaces",
                    "Dynamic staff scheduling based on historical foot traffic",
                    "Pre-weekend marketing to spread traffic throughout the week"
                ]
            },
            {
                "point": "Parking friction reducing conversion and repeat visits",
                "severity": "medium",
                "evidence": "observational",
                "confidence": 0.70,
                "reasoning": "Limited parking is explicitly observed. In Coral Gables, parking is critical for retail. This likely causes lost sales and customer frustration.",
                "supporting_observations": [
                    "Limited parking nearby"
                ],
                "mitigation_ideas": [
                    "Partner with nearby parking garages for validation",
                    "Promote alternative transportation (bike racks, Coral Gables Trolley)",
                    "Highlight delivery/online ordering to reduce need for in-person visits"
                ]
            },
            {
                "point": "Monetization of 'third space' usage",
                "severity": "low",
                "evidence": "inferred",
                "confidence": 0.65,
                "reasoning": "Popular for working/studying suggests people stay long but may not purchase. Balancing community space with revenue is a known indie bookstore challenge.",
                "supporting_observations": [
                    "Popular for working/studying with coffee"
                ],
                "mitigation_ideas": [
                    "Minimum purchase for seating during peak hours",
                    "Time limits on tables during busy periods",
                    "Membership model for regular workspace users",
                    "Higher-margin cafe items and upselling"
                ]
            },
            {
                "point": "Event ROI and audience monetization",
                "severity": "low",
                "evidence": "inferred",
                "confidence": 0.60,
                "reasoning": "Frequent author events require time/resources. Need to ensure these drive book sales, not just foot traffic. Events could be loss leaders or profit centers.",
                "supporting_observations": [
                    "Hosts frequent author events"
                ],
                "mitigation_ideas": [
                    "Track event attendee purchase rates",
                    "Pre-sales and bundles for event tickets + books",
                    "Email capture at events for future marketing",
                    "Partner with sponsors to offset event costs"
                ]
            },
            {
                "point": "Instagram engagement not translating to sales",
                "severity": "low",
                "evidence": "inferred",
                "confidence": 0.50,
                "reasoning": "Strong Instagram presence is good for brand, but unclear if it drives revenue. Many retail businesses have this disconnect.",
                "supporting_observations": [
                    "Strong Instagram presence"
                ],
                "mitigation_ideas": [
                    "Add 'link in bio' with shoppable catalog",
                    "Instagram Stories with purchase links",
                    "Track promo codes specific to Instagram",
                    "User-generated content campaigns"
                ]
            }
        ],
        "confidence_increase": "Confidence increased from 0.38 average to 0.64 average - a 68% improvement. We moved from generic retail assumptions to specific, observation-backed hypotheses.",
        "validation_notes": "The refined pain points are much more specific and actionable. However, all are still hypotheses that need validation through: (1) business owner interview, (2) review sentiment analysis, (3) competitive benchmarking. The parking issue has highest confidence because it's directly observed. Event ROI and Instagram conversion are lower confidence because they're inferred from presence, not performance data."
    }
    
    print(json.dumps(example_llm_response, indent=2))
    
    print("\n\n" + "="*80)
    print("APPLYING REFINEMENTS")
    print("="*80)
    
    refined_pkp = validator.apply_refinements(pkp, example_llm_response)
    
    print("\nRefined PKP Confidence:", refined_pkp["meta"]["confidence"])
    print("\nRefined Pain Points:")
    for pp in refined_pkp["pain_points"]:
        print(f"  - {pp['point']} (confidence: {pp['confidence']})")
    
    print("\n\n" + "="*80)
    print("GENERATING SUMMARY REPORT")
    print("="*80)
    
    report = validator.generate_summary_report(pkp, refined_pkp)
    print(report)
    
    # Save refined PKP
    output_path = os.path.join(script_dir, "..", "data", "books_and_books_pkp_refined.json")
    with open(output_path, "w") as f:
        json.dump(refined_pkp, f, indent=2)

    print(f"\n\n✅ Refined PKP saved to: {output_path}")
