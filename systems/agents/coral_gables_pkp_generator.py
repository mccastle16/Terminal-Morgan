"""
Coral Gables Business PKP Generator
Version: 1.0
Purpose: Generate Precise Knowledge Protocols for local Coral Gables businesses
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

class CoralGablesPKPGenerator:
    """
    Generate PKP (Precise Knowledge Protocols) for Coral Gables businesses.
    
    The PKP framework extracts:
    - Pain points (customer problems)
    - Knowledge gaps (what business doesn't know)
    - Power structures (decision-making dynamics)
    - Signals (measurable indicators)
    - Actions (what to do next)
    """
    
    def __init__(self):
        self.schema_version = "1.0.0"
        self.domain = "coral_gables_business"
        
    def generate_pkp(
        self,
        business_name: str,
        business_type: str,
        location: str,
        description: str,
        customer_base: Optional[str] = None,
        observations: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a PKP for a Coral Gables business.
        
        Args:
            business_name: Name of the business
            business_type: Type (restaurant, spa, retail, service, etc.)
            location: Address or area in Coral Gables
            description: Business description/what they do
            customer_base: Who their customers are
            observations: List of observed behaviors, patterns, or data
            
        Returns:
            Complete PKP dictionary
        """
        
        pkp = {
            "meta": {
                "schema_version": self.schema_version,
                "domain": self.domain,
                "created": datetime.now().isoformat(),
                "author": "co_underscore",
                "confidence": 0.0,  # To be calculated
                "time_horizon": "12m"
            },
            "node": {
                "id": self._generate_node_id(business_name),
                "name": business_name,
                "type": business_type,
                "layer": "local_business",
                "thesis": self._generate_thesis(business_name, business_type, description),
                "location": location
            },
            "context": {
                "market": {
                    "city": "Coral Gables",
                    "county": "Miami-Dade",
                    "state": "FL",
                    "segment": business_type,
                    "competitive_density": "unknown"  # To be assessed
                },
                "customer_profile": customer_base or "unknown",
                "observations": observations or []
            },
            "pain_points": self._extract_pain_points(business_type, observations),
            "knowledge_gaps": self._identify_knowledge_gaps(business_type),
            "signals": self._define_signals(business_type),
            "risks": self._assess_risks(business_type),
            "actions": self._recommend_actions(business_type),
            "sources": [
                "Direct observation",
                "Public records",
                "Website analysis",
                "Local knowledge"
            ],
            "runtime": {
                "last_run": None,
                "stage": "initial_assessment",
                "validation_needed": True
            }
        }
        
        # Calculate confidence score
        pkp["meta"]["confidence"] = self._calculate_confidence(pkp)
        
        return pkp
    
    def _generate_node_id(self, business_name: str) -> str:
        """Generate unique node ID from business name."""
        # Clean name and create ID
        clean_name = business_name.replace(" ", "_").replace("&", "and").upper()
        return f"CG_{clean_name[:20]}"
    
    def _generate_thesis(self, name: str, biz_type: str, description: str) -> str:
        """Generate business thesis statement."""
        return f"{name} operates in {biz_type} sector. {description}"
    
    def _extract_pain_points(self, business_type: str, observations: Optional[List[str]]) -> List[Dict]:
        """
        Extract pain points based on business type and observations.
        
        THIS IS THE CRITICAL SECTION - Pain points may not be accurate without deeper analysis.
        """
        
        # Generic pain point templates by business type
        generic_pain_points = {
            "restaurant": [
                {
                    "point": "Customer acquisition cost",
                    "severity": "medium",
                    "evidence": "assumption",
                    "confidence": 0.4,
                    "note": "Generic - needs validation"
                },
                {
                    "point": "Staff retention and training",
                    "severity": "medium", 
                    "evidence": "industry standard",
                    "confidence": 0.5,
                    "note": "Common in restaurant industry"
                },
                {
                    "point": "Online visibility and reputation management",
                    "severity": "unknown",
                    "evidence": "hypothesis",
                    "confidence": 0.3,
                    "note": "Requires website/social audit"
                }
            ],
            "spa": [
                {
                    "point": "Appointment scheduling inefficiency",
                    "severity": "unknown",
                    "evidence": "assumption",
                    "confidence": 0.3,
                    "note": "Generic - needs validation"
                },
                {
                    "point": "Client retention and rebooking rate",
                    "severity": "medium",
                    "evidence": "industry standard",
                    "confidence": 0.5,
                    "note": "Common spa challenge"
                },
                {
                    "point": "Service upsell conversion",
                    "severity": "unknown",
                    "evidence": "hypothesis",
                    "confidence": 0.3,
                    "note": "Requires revenue analysis"
                }
            ],
            "retail": [
                {
                    "point": "Foot traffic predictability",
                    "severity": "unknown",
                    "evidence": "assumption",
                    "confidence": 0.3,
                    "note": "Generic - needs validation"
                },
                {
                    "point": "Inventory management",
                    "severity": "medium",
                    "evidence": "industry standard",
                    "confidence": 0.5,
                    "note": "Common retail challenge"
                },
                {
                    "point": "Online-to-offline integration",
                    "severity": "unknown",
                    "evidence": "hypothesis",
                    "confidence": 0.3,
                    "note": "Requires digital presence audit"
                }
            ],
            "service": [
                {
                    "point": "Lead generation quality",
                    "severity": "unknown",
                    "evidence": "assumption",
                    "confidence": 0.3,
                    "note": "Generic - needs validation"
                },
                {
                    "point": "Project scoping and pricing accuracy",
                    "severity": "medium",
                    "evidence": "industry standard",
                    "confidence": 0.4,
                    "note": "Common service business issue"
                },
                {
                    "point": "Customer communication and expectation management",
                    "severity": "unknown",
                    "evidence": "hypothesis",
                    "confidence": 0.3,
                    "note": "Requires customer feedback analysis"
                }
            ]
        }
        
        # Get pain points for this business type or use generic
        pain_points = generic_pain_points.get(business_type, [
            {
                "point": "Business model unclear - needs deeper analysis",
                "severity": "unknown",
                "evidence": "no_data",
                "confidence": 0.1,
                "note": "Unrecognized business type"
            }
        ])
        
        # If we have observations, try to refine pain points
        if observations:
            pain_points.append({
                "point": "Pain points inferred from observations",
                "severity": "unknown",
                "evidence": "observational",
                "confidence": 0.5,
                "note": f"Based on {len(observations)} observations - needs LLM analysis",
                "raw_observations": observations
            })
        
        return pain_points
    
    def _identify_knowledge_gaps(self, business_type: str) -> List[Dict]:
        """Identify what we don't know about this business."""
        return [
            {
                "gap": "Financial performance",
                "impact": "high",
                "obtainable": False,
                "note": "Private company - no public financials"
            },
            {
                "gap": "Customer satisfaction scores",
                "impact": "high",
                "obtainable": True,
                "method": "Review mining (Google, Yelp) + sentiment analysis"
            },
            {
                "gap": "Competitive positioning",
                "impact": "medium",
                "obtainable": True,
                "method": "Comparative analysis of similar CG businesses"
            },
            {
                "gap": "Owner/operator priorities",
                "impact": "high",
                "obtainable": True,
                "method": "Direct conversation or interview"
            },
            {
                "gap": "Technology stack and digital maturity",
                "impact": "medium",
                "obtainable": True,
                "method": "Website audit, tool detection, social presence analysis"
            }
        ]
    
    def _define_signals(self, business_type: str) -> Dict:
        """Define measurable signals to track."""
        return {
            "observable": [
                "google_rating",
                "review_count",
                "review_velocity_30d",
                "website_exists",
                "social_media_presence",
                "hours_of_operation",
                "parking_availability"
            ],
            "obtainable": [
                "estimated_foot_traffic",
                "competitive_density_radius_1mi",
                "avg_check_size_estimate",
                "years_in_business"
            ],
            "formulas": {
                "health_score": "0.4*google_rating + 0.3*review_velocity + 0.3*digital_presence",
                "digital_maturity": "website_quality_score + social_engagement_score",
                "competitive_pressure": "competitors_within_1mi / market_size_factor"
            }
        }
    
    def _assess_risks(self, business_type: str) -> List[Dict]:
        """Assess business risks."""
        return [
            {
                "risk": "Generic pain points may not reflect actual problems",
                "likelihood": "high",
                "impact": "high",
                "mitigation": "Requires direct business owner interview or deeper data collection"
            },
            {
                "risk": "Coral Gables market dynamics misunderstood",
                "likelihood": "medium",
                "impact": "medium",
                "mitigation": "Need local market research and competitive analysis"
            },
            {
                "risk": "Observation bias from limited data sources",
                "likelihood": "high",
                "impact": "medium",
                "mitigation": "Triangulate with multiple data sources + LLM validation"
            }
        ]
    
    def _recommend_actions(self, business_type: str) -> List[Dict]:
        """Recommend next actions."""
        return [
            {
                "action": "Validate pain points with another LLM",
                "priority": "critical",
                "effort": "low",
                "method": "Feed PKP to Claude/GPT for validation and refinement"
            },
            {
                "action": "Scrape and analyze online reviews",
                "priority": "high",
                "effort": "medium",
                "method": "Google/Yelp API + sentiment analysis"
            },
            {
                "action": "Conduct competitive analysis",
                "priority": "medium",
                "effort": "medium",
                "method": "Map similar businesses in CG + compare signals"
            },
            {
                "action": "Reach out for direct interview",
                "priority": "high",
                "effort": "high",
                "method": "Email/call business owner with value proposition"
            }
        ]
    
    def _calculate_confidence(self, pkp: Dict) -> float:
        """
        Calculate overall confidence score for the PKP.
        
        Low confidence = mostly assumptions
        High confidence = validated data points
        """
        # Start with base confidence
        confidence = 0.3
        
        # Adjust based on what we have
        if pkp["context"]["observations"]:
            confidence += 0.2
        
        # Pain points are mostly generic, so keep confidence low
        pain_point_confidence = [
            pp.get("confidence", 0.3) 
            for pp in pkp["pain_points"]
        ]
        avg_pain_confidence = sum(pain_point_confidence) / len(pain_point_confidence)
        
        confidence = (confidence + avg_pain_confidence) / 2
        
        return round(confidence, 2)
    
    def batch_generate(self, businesses: List[Dict]) -> List[Dict]:
        """Generate PKPs for multiple businesses."""
        pkps = []
        for biz in businesses:
            pkp = self.generate_pkp(
                business_name=biz.get("name", "Unknown"),
                business_type=biz.get("type", "unknown"),
                location=biz.get("location", "Coral Gables, FL"),
                description=biz.get("description", ""),
                customer_base=biz.get("customers"),
                observations=biz.get("observations")
            )
            pkps.append(pkp)
        return pkps


# Example usage and test
if __name__ == "__main__":
    generator = CoralGablesPKPGenerator()
    
    # Test with a sample Coral Gables business
    sample_business = {
        "name": "Books & Books",
        "type": "retail",
        "location": "265 Aragon Ave, Coral Gables, FL 33134",
        "description": "Independent bookstore with cafe, hosts author events and community gatherings",
        "customers": "Coral Gables residents, UM students, book lovers, tourists",
        "observations": [
            "Heavy foot traffic on weekends",
            "Popular for working/studying with coffee",
            "Strong Instagram presence",
            "Hosts frequent author events",
            "Limited parking nearby"
        ]
    }
    
    pkp = generator.generate_pkp(
        business_name=sample_business["name"],
        business_type=sample_business["type"],
        location=sample_business["location"],
        description=sample_business["description"],
        customer_base=sample_business["customers"],
        observations=sample_business["observations"]
    )
    
    # Output formatted PKP
    print(json.dumps(pkp, indent=2))
    
    print("\n" + "="*80)
    print("CONFIDENCE ANALYSIS")
    print("="*80)
    print(f"Overall Confidence: {pkp['meta']['confidence']}")
    print("\nPain Points Confidence:")
    for pp in pkp["pain_points"]:
        print(f"  - {pp['point']}: {pp.get('confidence', 'N/A')} ({pp.get('note', 'N/A')})")
    
    print("\n" + "="*80)
    print("⚠️  CRITICAL ISSUE IDENTIFIED")
    print("="*80)
    print("Pain points are GENERIC and based on assumptions.")
    print("They need validation from:")
    print("  1. Another LLM (Claude/GPT) for reasoning")
    print("  2. Direct business owner interview")
    print("  3. Customer review sentiment analysis")
    print("  4. Competitive data")
