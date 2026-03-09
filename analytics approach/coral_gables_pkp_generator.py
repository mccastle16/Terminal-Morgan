#!/usr/bin/env python3
"""
Coral Gables Business Intelligence - PKP Node Generator
Generates Portable Knowledge Protocol nodes for local businesses

Usage:
    python coral_gables_pkp_generator.py --output coral_gables_businesses.json
"""

import json
from datetime import datetime
from typing import List, Dict

# Base PKP Schema v1.0 Template
PKP_TEMPLATE = {
    "meta": {
        "schema_version": "1.0.0",
        "domain": "local_business",
        "created_at": "",
        "author": "co_underscore",
        "confidence": 0.75,
        "time_horizon": "12m"
    },
    "node": {
        "id": "",
        "name": "",
        "type": "business",
        "layer": "local_economy",
        "thesis": ""
    },
    "context": {
        "picks_shovels": [],
        "edges": [],
        "undercurrents": []
    },
    "signals": {
        "metrics": [],
        "events": []
    },
    "news": [],
    "risks": [],
    "actions": [],
    "valuation": {},
    "sources": [],
    "custom": {}
}

# Coral Gables Business Database (from OSINT)
CORAL_GABLES_BUSINESSES = [
    # RESTAURANTS - GIRALDA PLAZA
    {
        "name": "Luca Osteria",
        "category": "restaurant",
        "subcategory": "italian_fine_dining",
        "address": "116 Giralda Ave, Coral Gables, FL 33134",
        "owner": "Chef Giorgio Rapicavoli",
        "founded": "2017",
        "thesis": "Chopped champion brings authentic Italian with innovation to Giralda Plaza",
        "pain_points": ["reservation-only model limits walk-in revenue", "high competition on Giralda", "seasonal tourism fluctuation"],
        "co_fit": ["menu optimization via customer sentiment analysis", "reservation flow automation", "owner visibility dashboard"],
        "signals": {
            "yelp_rating": 4.5,
            "price_range": "$$$-$$$$",
            "capacity": "60-80 seats indoor + outdoor",
            "foot_traffic": "high"
        },
        "edges": [
            {"to": "Giralda_Plaza", "type": "located_in", "weight": 1.0},
            {"to": "Taste_the_Gables", "type": "participates_in", "weight": 0.6}
        ]
    },
    {
        "name": "Dojo Izakaya",
        "category": "restaurant",
        "subcategory": "japanese_izakaya",
        "address": "148 Giralda Ave, Coral Gables, FL 33134",
        "owner": "Chef Pablo Zitzmann",
        "founded": "2020",
        "thesis": "Modern izakaya with rotating Japanese street food and Miami influences",
        "pain_points": ["inventory complexity with rotating menu", "staff training on specialized dishes", "supplier coordination"],
        "co_fit": ["inventory prediction AI", "menu performance analytics", "automated staff training materials"],
        "signals": {
            "yelp_rating": 4.6,
            "price_range": "$$-$$$",
            "capacity": "40-50 seats",
            "foot_traffic": "high"
        },
        "edges": [
            {"to": "Giralda_Plaza", "type": "located_in", "weight": 1.0},
            {"to": "Zitz_Sum", "type": "sister_restaurant", "weight": 0.9}
        ]
    },
    {
        "name": "Zitz Sum",
        "category": "restaurant",
        "subcategory": "dim_sum_izakaya",
        "address": "394 Giralda Ave, Coral Gables, FL 33134",
        "owner": "Chef Pablo Zitzmann",
        "founded": "2021",
        "thesis": "Japanese-Chinese fusion dim sum with hand-rolled daily dumplings",
        "pain_points": ["daily prep labor intensive", "dumpling consistency", "expanding without diluting quality"],
        "co_fit": ["prep schedule optimization", "recipe standardization system", "quality tracking across shifts"],
        "signals": {
            "yelp_rating": 4.7,
            "price_range": "$$-$$$",
            "capacity": "50-60 seats",
            "foot_traffic": "very_high"
        },
        "edges": [
            {"to": "Giralda_Plaza", "type": "located_in", "weight": 1.0},
            {"to": "Dojo_Izakaya", "type": "sister_restaurant", "weight": 0.9}
        ]
    },
    {
        "name": "Graziano's",
        "category": "restaurant",
        "subcategory": "argentinian_steakhouse",
        "address": "394 Giralda Ave, Coral Gables, FL 33134",
        "owner": "Graziano Family",
        "founded": "1962",
        "thesis": "Legacy Argentinian steakhouse with 60+ years of family hospitality",
        "pain_points": ["modernizing while preserving tradition", "multi-generational customer base expectations", "competition from new steakhouses"],
        "co_fit": ["customer preference tracking across generations", "reservation optimization for long-dining customers", "loyalty program automation"],
        "signals": {
            "yelp_rating": 4.4,
            "price_range": "$$$-$$$$",
            "capacity": "100+ seats",
            "foot_traffic": "high"
        },
        "edges": [
            {"to": "Giralda_Plaza", "type": "located_in", "weight": 1.0},
            {"to": "Legacy_Businesses_CG", "type": "member_of", "weight": 0.8}
        ]
    },
    
    # RESTAURANTS - MIRACLE MILE
    {
        "name": "Francesco",
        "category": "restaurant",
        "subcategory": "peruvian_italian_fusion",
        "address": "278 Miracle Mile, Coral Gables, FL 33134",
        "owner": "Chef Franco",
        "founded": "1984 (Peru), reopened 2024 (Coral Gables)",
        "thesis": "Peruvian seafood tradition meets Italian heritage on Miracle Mile",
        "pain_points": ["brand reestablishment in US market", "customer education on fusion concept", "premium ingredient sourcing"],
        "co_fit": ["customer education content system", "menu explanation automation", "supplier relationship tracking"],
        "signals": {
            "yelp_rating": 4.3,
            "price_range": "$$$",
            "capacity": "60-70 seats",
            "foot_traffic": "medium-high"
        },
        "edges": [
            {"to": "Miracle_Mile", "type": "located_in", "weight": 1.0},
            {"to": "Taste_the_Gables", "type": "participates_in", "weight": 0.6}
        ]
    },
    {
        "name": "Bulla Gastrobar",
        "category": "restaurant",
        "subcategory": "spanish_tapas",
        "address": "Miracle Mile, Coral Gables, FL 33134",
        "owner": "Bulla Restaurant Group",
        "founded": "2012",
        "thesis": "Spanish tapas and social dining experience",
        "pain_points": ["high-volume service coordination", "tapas portion consistency", "peak time kitchen bottlenecks"],
        "co_fit": ["kitchen flow optimization", "order timing AI for tapas courses", "staff coordination system"],
        "signals": {
            "yelp_rating": 4.2,
            "price_range": "$$-$$$",
            "capacity": "150+ seats indoor/outdoor",
            "foot_traffic": "very_high"
        },
        "edges": [
            {"to": "Miracle_Mile", "type": "located_in", "weight": 1.0}
        ]
    },
    {
        "name": "Ruth's Chris Steak House",
        "category": "restaurant",
        "subcategory": "upscale_steakhouse",
        "address": "Coral Gables, FL 33134",
        "owner": "Ruth's Chris (franchise)",
        "founded": "franchise location",
        "thesis": "Premium steakhouse franchise with consistent luxury experience",
        "pain_points": ["franchise standards compliance", "local market differentiation", "high labor costs"],
        "co_fit": ["compliance tracking automation", "inventory management for premium cuts", "customer preference analysis"],
        "signals": {
            "yelp_rating": 4.3,
            "price_range": "$$$$",
            "capacity": "120+ seats",
            "foot_traffic": "high"
        },
        "edges": [
            {"to": "Miracle_Mile", "type": "near", "weight": 0.8},
            {"to": "Corporate_Dining_CG", "type": "serves", "weight": 0.9}
        ]
    },
    {
        "name": "Fleming's Prime Steakhouse",
        "category": "restaurant",
        "subcategory": "upscale_steakhouse",
        "address": "Ponce de Leon Blvd & Andalusia Ave, Coral Gables, FL 33134",
        "owner": "Fleming's Restaurant Group",
        "founded": "franchise location",
        "thesis": "USDA Prime steakhouse with extensive wine program near Miracle Mile",
        "pain_points": ["wine inventory management complexity", "social hour profitability optimization", "private dining coordination"],
        "co_fit": ["wine pairing recommendation system", "social hour analytics", "private event automation"],
        "signals": {
            "yelp_rating": 4.4,
            "price_range": "$$$$",
            "capacity": "150+ seats + private rooms",
            "foot_traffic": "high"
        },
        "edges": [
            {"to": "Miracle_Mile", "type": "near", "weight": 0.9},
            {"to": "Corporate_Dining_CG", "type": "serves", "weight": 0.9}
        ]
    },
    
    # SPAS & SALONS
    {
        "name": "The Plump Room",
        "category": "spa",
        "subcategory": "medical_aesthetics",
        "address": "147 Alhambra Circle Suite 205, Coral Gables, FL 33134",
        "owner": "Medical aesthetics practice",
        "founded": "2020s",
        "thesis": "Science-backed medical aesthetics for elevated clientele",
        "pain_points": ["booking complexity for multiple treatment types", "client consultation time", "follow-up scheduling adherence"],
        "co_fit": ["intelligent booking system with treatment flows", "automated consultation prep", "follow-up reminder automation"],
        "signals": {
            "yelp_rating": 4.8,
            "price_range": "$$$$",
            "services": "injectables, neuromodulators, collagen stimulation, medical-grade facials",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "Alhambra_Circle", "type": "located_on", "weight": 1.0},
            {"to": "Luxury_Services_CG", "type": "member_of", "weight": 0.9}
        ]
    },
    {
        "name": "S Salon & Spa",
        "category": "salon",
        "subcategory": "full_service_hair_spa",
        "address": "4100 Salzedo St, Coral Gables, FL 33146",
        "owner": "JC & Esther (co-owners)",
        "founded": "2015",
        "thesis": "Full-service salon specializing in hair treatments and extensions",
        "pain_points": ["multi-service booking complexity", "product inventory tracking", "client history management across services"],
        "co_fit": ["unified booking system for complex services", "product usage tracking per service", "client preference memory system"],
        "signals": {
            "yelp_rating": 4.3,
            "price_range": "$$-$$$",
            "hours": "Tue-Fri 11am-9pm, Sat 10:30am-8pm, Closed Sun-Mon",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "Salzedo_Corridor", "type": "located_on", "weight": 1.0}
        ]
    },
    {
        "name": "Pecan's Day Spa",
        "category": "spa",
        "subcategory": "day_spa",
        "address": "Coral Gables, FL 33134",
        "owner": "Pecan's ownership",
        "founded": "established location",
        "thesis": "Authentic massages, advanced facials, and specialized body treatments",
        "pain_points": ["therapist scheduling optimization", "specialized treatment room allocation", "client package tracking"],
        "co_fit": ["intelligent therapist-treatment matching", "room utilization optimization", "package progression tracking"],
        "signals": {
            "yelp_rating": 4.6,
            "price_range": "$$$",
            "services": "massage, facials, endermologie, microdermabrasion, teeth whitening",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "Day_Spa_Network_CG", "type": "member_of", "weight": 0.8}
        ]
    },
    {
        "name": "Biltmore Spa",
        "category": "spa",
        "subcategory": "luxury_resort_spa",
        "address": "Biltmore Hotel, Coral Gables, FL 33134",
        "owner": "Biltmore Hotel",
        "founded": "1926 (hotel), spa later",
        "thesis": "Historic luxury hotel spa with resort amenities",
        "pain_points": ["hotel guest vs. local clientele balance", "peak season capacity management", "luxury service consistency"],
        "co_fit": ["guest preference tracking", "capacity planning AI", "personalized service protocol system"],
        "signals": {
            "yelp_rating": 4.5,
            "price_range": "$$$$",
            "services": "full spa menu, pool, tennis, golf",
            "foot_traffic": "high_hotel_guest + local"
        },
        "edges": [
            {"to": "Biltmore_Hotel", "type": "part_of", "weight": 1.0},
            {"to": "Luxury_Services_CG", "type": "member_of", "weight": 1.0}
        ]
    },
    {
        "name": "The Spa at Loews Coral Gables",
        "category": "spa",
        "subcategory": "hotel_spa_fitness",
        "address": "Loews Coral Gables Hotel 8th Floor, Coral Gables, FL 33134",
        "owner": "Loews Hotels",
        "founded": "2020s",
        "thesis": "Restorative body therapies and fitness studio in Plaza Coral Gables",
        "pain_points": ["hotel guest scheduling priority", "fitness studio vs. spa coordination", "downtown parking for locals"],
        "co_fit": ["integrated spa-fitness booking", "guest vs. local optimization", "parking validation automation"],
        "signals": {
            "yelp_rating": 4.4,
            "price_range": "$$$-$$$$",
            "services": "body therapies, facials, hair/nail salon, fitness studio, Peloton",
            "hours": "Spa 10am-6pm daily, Fitness 24hrs for guests",
            "foot_traffic": "hotel_guest_primary"
        },
        "edges": [
            {"to": "Loews_Hotel_CG", "type": "part_of", "weight": 1.0},
            {"to": "Plaza_Coral_Gables", "type": "located_in", "weight": 1.0}
        ]
    },
    {
        "name": "ELEMIS Day Spa",
        "category": "spa",
        "subcategory": "day_spa_retail",
        "address": "Shops at Merrick Park, Coral Gables, FL 33134",
        "owner": "ELEMIS (flagship)",
        "founded": "flagship location",
        "thesis": "Award-winning flagship spa with retail integration at upscale mall",
        "pain_points": ["mall foot traffic dependency", "retail-service balance", "appointment vs. walk-in mix"],
        "co_fit": ["mall traffic correlation analytics", "service-to-retail conversion tracking", "dynamic appointment availability"],
        "signals": {
            "yelp_rating": 4.7,
            "price_range": "$$$-$$$$",
            "location": "Shops at Merrick Park (luxury mall)",
            "foot_traffic": "high_retail_location"
        },
        "edges": [
            {"to": "Shops_Merrick_Park", "type": "located_in", "weight": 1.0},
            {"to": "Retail_Integration_CG", "type": "strategy", "weight": 0.9}
        ]
    },
    {
        "name": "Massage Envy Coral Gables",
        "category": "spa",
        "subcategory": "franchise_massage_wellness",
        "address": "Coral Gables, FL 33134",
        "owner": "Massage Envy (franchisee)",
        "founded": "franchise location",
        "thesis": "Affordable membership-based massage and skincare services",
        "pain_points": ["membership retention and churn", "therapist utilization rate", "franchise standards compliance"],
        "co_fit": ["membership health monitoring", "appointment filling optimization", "compliance tracking automation"],
        "signals": {
            "yelp_rating": 4.0,
            "price_range": "$$",
            "business_model": "membership + packages",
            "foot_traffic": "members + walk-in"
        },
        "edges": [
            {"to": "Franchise_Network", "type": "part_of", "weight": 1.0},
            {"to": "Affordable_Wellness_CG", "type": "segment", "weight": 0.8}
        ]
    },
    {
        "name": "Avant Garde Salon and Spa",
        "category": "salon",
        "subcategory": "full_service_beauty",
        "address": "386 Minorca Avenue, Coral Gables, FL 33134",
        "owner": "Independent ownership",
        "founded": "established",
        "thesis": "High-end professional products for luxury salon and spa services",
        "pain_points": ["product line complexity", "client expectation management", "service consistency across team"],
        "co_fit": ["product recommendation engine", "client history and preference tracking", "service quality monitoring"],
        "signals": {
            "yelp_rating": 4.5,
            "price_range": "$$$",
            "services": "hair, nails, spa treatments",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "Minorca_Corridor", "type": "located_on", "weight": 1.0}
        ]
    },
    
    # PROFESSIONAL SERVICES
    {
        "name": "Barakat Law, P.A.",
        "category": "professional_services",
        "subcategory": "business_litigation",
        "address": "Coral Gables, FL 33134",
        "owner": "Brian Barakat (Chairman, CG Chamber)",
        "founded": "2006",
        "thesis": "Business litigation specialist with former prosecutor expertise",
        "pain_points": ["case management complexity", "client communication during disputes", "document organization"],
        "co_fit": ["case document AI organization", "client update automation", "legal research assistant"],
        "signals": {
            "specialties": "partnership disputes, non-competes, corporate litigation, fraud",
            "chamber_role": "Chairman Coral Gables Chamber",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "CG_Chamber", "type": "chairman_of", "weight": 1.0},
            {"to": "Professional_Services_CG", "type": "member_of", "weight": 0.9}
        ]
    },
    {
        "name": "EWM Realty International",
        "category": "real_estate",
        "subcategory": "luxury_real_estate",
        "address": "Coral Gables, FL 33134",
        "owner": "Berkshire Hathaway HomeServices",
        "founded": "1946 (EWM)",
        "thesis": "Luxury real estate with Coral Gables market expertise",
        "pain_points": ["client relationship management", "listing presentation preparation", "market data analysis for pricing"],
        "co_fit": ["CRM enhancement with AI insights", "automated listing presentation generation", "competitive market analysis AI"],
        "signals": {
            "market_position": "luxury_leader_south_florida",
            "chamber_role": "Patrick O'Connell - Board member, Past Chairman",
            "foot_traffic": "appointment + walk-in showroom"
        },
        "edges": [
            {"to": "CG_Chamber", "type": "board_member", "weight": 0.9},
            {"to": "Luxury_Real_Estate_CG", "type": "segment", "weight": 1.0}
        ]
    },
    {
        "name": "First Citizens Bank - Coral Gables",
        "category": "financial_services",
        "subcategory": "business_banking",
        "address": "Coral Gables, FL 33134",
        "owner": "First Citizens Bank",
        "founded": "branch location",
        "thesis": "Business banking with relationship-focused approach",
        "pain_points": ["deal documentation speed", "client financial education", "small business outreach"],
        "co_fit": ["loan document preparation assistant", "financial literacy content automation", "relationship tracking system"],
        "signals": {
            "focus": "business_banking",
            "chamber_role": "Sara Hernandez - Board member",
            "foot_traffic": "appointment_based"
        },
        "edges": [
            {"to": "CG_Chamber", "type": "board_member", "weight": 0.9},
            {"to": "Financial_Services_CG", "type": "member_of", "weight": 1.0}
        ]
    },
    {
        "name": "Florida Blue - Coral Gables Market",
        "category": "healthcare_services",
        "subcategory": "health_insurance",
        "address": "Coral Gables, FL 33134",
        "owner": "Florida Blue (state's Blue Cross Blue Shield)",
        "founded": "established market presence",
        "thesis": "Market leader in Florida health insurance with community focus",
        "pain_points": ["member communication complexity", "community partnership tracking", "employee engagement at scale"],
        "co_fit": ["member communication personalization", "partnership impact tracking", "internal engagement analytics"],
        "signals": {
            "market_position": "5M+ health members, 18M people in 12 states",
            "chamber_role": "Past Chair (de la Peña Rojas)",
            "foot_traffic": "B2B_focused"
        },
        "edges": [
            {"to": "CG_Chamber", "type": "past_chair", "weight": 0.9},
            {"to": "Healthcare_Network_CG", "type": "anchor", "weight": 1.0}
        ]
    }
]

# Global context nodes (ecosystem)
ECOSYSTEM_NODES = [
    {
        "id": "CG_Chamber",
        "name": "Coral Gables Chamber of Commerce",
        "type": "business_organization",
        "thesis": "1,600+ member chamber, #1 in South Florida, driving economic development since 1925",
        "signals": {
            "members": "1600+",
            "ranking": "1 in South Florida",
            "founded": "1925",
            "president": "Mark Trowbridge"
        }
    },
    {
        "id": "Giralda_Plaza",
        "name": "Giralda Plaza",
        "type": "commercial_district",
        "thesis": "Pedestrian walkway dining destination opened 2017, high-density restaurant corridor",
        "signals": {
            "opened": "2017",
            "format": "pedestrian walkway",
            "density": "very_high restaurant concentration"
        }
    },
    {
        "id": "Miracle_Mile",
        "name": "Miracle Mile",
        "type": "commercial_district",
        "thesis": "Historic 4-block shopping and dining corridor on Coral Way, established 1950s",
        "signals": {
            "established": "1950s",
            "length": "4 blocks (LeJeune to Douglas)",
            "mix": "retail + dining + services"
        }
    },
    {
        "id": "Taste_the_Gables",
        "name": "Taste the Gables",
        "type": "event_program",
        "thesis": "Month-long July culinary event showcasing 70+ restaurants with prix-fixe menus",
        "signals": {
            "timing": "July annually",
            "participants": "70+ restaurants",
            "format": "prix-fixe menus + promotions"
        }
    }
]

# Undercurrents (market forces)
UNDERCURRENTS = [
    {
        "name": "miami_tech_migration",
        "direction": "bullish",
        "rationale": "Tech workers and entrepreneurs relocating to Miami, increasing demand for premium services"
    },
    {
        "name": "post_covid_dining_recovery",
        "direction": "bullish",
        "rationale": "Dining sector recovering with outdoor seating preference and experiential focus"
    },
    {
        "name": "wellness_premium_expansion",
        "direction": "bullish",
        "rationale": "Affluent clientele willing to pay premium for medical aesthetics and luxury wellness"
    },
    {
        "name": "labor_shortage_hospitality",
        "direction": "bearish",
        "rationale": "Ongoing challenges in hiring and retaining skilled service staff"
    },
    {
        "name": "commercial_rent_pressure",
        "direction": "bearish",
        "rationale": "Coral Gables premium location driving up lease costs"
    },
    {
        "name": "tourist_seasonality",
        "direction": "neutral",
        "rationale": "Winter season strength offsets summer slowdown, but volatility remains"
    },
    {
        "name": "franchise_standardization",
        "direction": "bearish",
        "rationale": "Independent businesses face competition from well-funded franchise operations"
    },
    {
        "name": "digital_booking_expectation",
        "direction": "bullish",
        "rationale": "Customers expect seamless online booking, creating opportunity for digital-first operators"
    }
]

# Picks & Shovels (enablers)
PICKS_SHOVELS = [
    {
        "id": "OpenTable",
        "name": "OpenTable",
        "role": "reservation_platform",
        "edge_type": "enables",
        "weight": 0.8
    },
    {
        "id": "Resy",
        "name": "Resy",
        "role": "reservation_platform",
        "edge_type": "enables",
        "weight": 0.7
    },
    {
        "id": "Toast_POS",
        "name": "Toast POS",
        "role": "restaurant_pos",
        "edge_type": "enables",
        "weight": 0.9
    },
    {
        "id": "Square",
        "name": "Square",
        "role": "payment_pos",
        "edge_type": "enables",
        "weight": 0.8
    },
    {
        "id": "Yelp",
        "name": "Yelp",
        "role": "discovery_reviews",
        "edge_type": "drives_traffic",
        "weight": 0.7
    },
    {
        "id": "Google_Business",
        "name": "Google Business Profile",
        "role": "discovery_seo",
        "edge_type": "drives_traffic",
        "weight": 0.9
    },
    {
        "id": "Instagram",
        "name": "Instagram",
        "role": "social_marketing",
        "edge_type": "drives_awareness",
        "weight": 0.8
    },
    {
        "id": "Mindbody",
        "name": "Mindbody",
        "role": "spa_salon_booking",
        "edge_type": "enables",
        "weight": 0.8
    },
    {
        "id": "Boulevard",
        "name": "Boulevard",
        "role": "salon_management",
        "edge_type": "enables",
        "weight": 0.7
    },
    {
        "id": "Zenoti",
        "name": "Zenoti",
        "role": "spa_management",
        "edge_type": "enables",
        "weight": 0.7
    }
]

def generate_pkp_node(business: Dict) -> Dict:
    """Generate a complete PKP node for a business"""
    pkp = PKP_TEMPLATE.copy()
    
    # Meta
    pkp["meta"]["created_at"] = datetime.now().isoformat()
    pkp["meta"]["domain"] = "local_business"
    
    # Node
    pkp["node"]["id"] = business["name"].replace(" ", "_").replace("&", "and").upper()
    pkp["node"]["name"] = business["name"]
    pkp["node"]["type"] = business["category"]
    pkp["node"]["layer"] = "local_economy"
    pkp["node"]["thesis"] = business["thesis"]
    
    # Context
    # Add relevant picks & shovels based on category
    if business["category"] == "restaurant":
        pkp["context"]["picks_shovels"] = [
            {"id": "Toast_POS", "name": "Toast POS", "role": "restaurant_pos", "edge_type": "enables", "weight": 0.9},
            {"id": "OpenTable", "name": "OpenTable", "role": "reservation_platform", "edge_type": "enables", "weight": 0.8},
            {"id": "Yelp", "name": "Yelp", "role": "discovery_reviews", "edge_type": "drives_traffic", "weight": 0.7},
            {"id": "Instagram", "name": "Instagram", "role": "social_marketing", "edge_type": "drives_awareness", "weight": 0.8}
        ]
    elif business["category"] in ["spa", "salon"]:
        pkp["context"]["picks_shovels"] = [
            {"id": "Mindbody", "name": "Mindbody", "role": "spa_salon_booking", "edge_type": "enables", "weight": 0.8},
            {"id": "Square", "name": "Square", "role": "payment_pos", "edge_type": "enables", "weight": 0.8},
            {"id": "Google_Business", "name": "Google Business Profile", "role": "discovery_seo", "edge_type": "drives_traffic", "weight": 0.9},
            {"id": "Instagram", "name": "Instagram", "role": "social_marketing", "edge_type": "drives_awareness", "weight": 0.8}
        ]
    
    # Add edges from business data
    if "edges" in business:
        pkp["context"]["edges"] = business["edges"]
    
    # Add relevant undercurrents
    pkp["context"]["undercurrents"] = []
    if business["category"] == "restaurant":
        pkp["context"]["undercurrents"].extend([
            {"name": "post_covid_dining_recovery", "direction": "bullish", "rationale": "Dining sector recovering with outdoor seating preference"},
            {"name": "labor_shortage_hospitality", "direction": "bearish", "rationale": "Ongoing staff challenges"},
            {"name": "tourist_seasonality", "direction": "neutral", "rationale": "Seasonal revenue fluctuation"}
        ])
    elif business["category"] in ["spa", "salon"]:
        pkp["context"]["undercurrents"].extend([
            {"name": "wellness_premium_expansion", "direction": "bullish", "rationale": "Premium wellness demand increasing"},
            {"name": "digital_booking_expectation", "direction": "bullish", "rationale": "Customers expect seamless online booking"},
            {"name": "labor_shortage_hospitality", "direction": "bearish", "rationale": "Skilled therapist shortage"}
        ])
    
    # Signals
    if "signals" in business:
        for key, value in business["signals"].items():
            pkp["signals"]["metrics"].append({
                "name": key,
                "unit": "various",
                "current": value
            })
    
    # Risks
    if "pain_points" in business:
        for pain in business["pain_points"]:
            pkp["risks"].append({
                "name": pain,
                "likelihood": "med",
                "severity": "med"
            })
    
    # Actions (Co_ engagement opportunities)
    if "co_fit" in business:
        for fit in business["co_fit"]:
            pkp["actions"].append({
                "type": "engagement_opportunity",
                "what": fit,
                "rule": "discovery_call",
                "notify": "co_underscore_pipeline"
            })
    
    # Sources
    pkp["sources"] = [
        {"name": "Coral Gables Chamber Directory", "url": "https://coralgableschamber.org/member-directory/"},
        {"name": "Yelp Coral Gables", "url": "https://www.yelp.com/coral-gables-fl"},
        {"name": "OpenTable Coral Gables", "url": "https://www.opentable.com/coral-gables"},
        {"name": "OSINT analysis", "url": "internal"}
    ]
    
    # Custom (Co_ specific)
    pkp["custom"] = {
        "co_engagement_score": calculate_engagement_score(business),
        "category": business["category"],
        "subcategory": business["subcategory"],
        "address": business.get("address", ""),
        "owner": business.get("owner", ""),
        "founded": business.get("founded", ""),
        "pain_points": business.get("pain_points", []),
        "co_fit": business.get("co_fit", []),
        "priority": "high" if calculate_engagement_score(business) > 75 else "medium"
    }
    
    return pkp

def calculate_engagement_score(business: Dict) -> int:
    """Calculate Co_ engagement fit score (0-100)"""
    score = 50  # baseline
    
    # Category weights
    high_fit_categories = ["restaurant", "spa", "salon", "clinic"]
    if business["category"] in high_fit_categories:
        score += 20
    
    # Pain points indicate opportunity
    if "pain_points" in business:
        score += min(len(business["pain_points"]) * 5, 20)
    
    # Co_ fit solutions
    if "co_fit" in business:
        score += min(len(business["co_fit"]) * 3, 15)
    
    # Local ownership (vs franchise) = higher fit
    if "owner" in business and "franchise" not in business.get("owner", "").lower():
        score += 10
    
    return min(score, 100)

def generate_all_pkp_nodes() -> List[Dict]:
    """Generate PKP nodes for all businesses"""
    nodes = []
    for business in CORAL_GABLES_BUSINESSES:
        node = generate_pkp_node(business)
        nodes.append(node)
    return nodes

def export_to_json(nodes: List[Dict], filename: str = "coral_gables_businesses_pkp.json"):
    """Export PKP nodes to JSON file"""
    output = {
        "meta": {
            "generated_at": datetime.now().isoformat(),
            "generator": "co_underscore_osint_v1",
            "total_nodes": len(nodes),
            "domain": "coral_gables_local_business",
            "schema_version": "1.0.0"
        },
        "ecosystem": ECOSYSTEM_NODES,
        "undercurrents": UNDERCURRENTS,
        "picks_shovels": PICKS_SHOVELS,
        "businesses": nodes
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    return filename

if __name__ == "__main__":
    # Generate all PKP nodes
    print("🔍 Generating PKP nodes for Coral Gables businesses...")
    nodes = generate_all_pkp_nodes()
    
    print(f"✅ Generated {len(nodes)} business PKP nodes")
    
    # Export to JSON
    filename = export_to_json(nodes)
    print(f"📦 Exported to: {filename}")
    
    # Summary stats
    categories = {}
    high_priority = 0
    for node in nodes:
        cat = node["custom"]["category"]
        categories[cat] = categories.get(cat, 0) + 1
        if node["custom"]["priority"] == "high":
            high_priority += 1
    
    print("\n📊 Summary:")
    print(f"   Total businesses: {len(nodes)}")
    print(f"   High priority targets: {high_priority}")
    print(f"   Categories:")
    for cat, count in categories.items():
        print(f"      {cat}: {count}")
    
    print("\n🎯 Top engagement opportunities:")
    sorted_nodes = sorted(nodes, key=lambda x: x["custom"]["co_engagement_score"], reverse=True)
    for node in sorted_nodes[:10]:
        print(f"   {node['node']['name']} - Score: {node['custom']['co_engagement_score']}")
