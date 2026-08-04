"""
Shared constants and utilities for the OSINT pipeline.
Imported by Agents 1, 2, 3, and 4 to avoid duplication.
"""

import re
from math import asin, cos, radians, sin, sqrt
from typing import Optional, Tuple

# ── Canonical schema ─────────────────────────────────────────────
CANONICAL_FIELDS = [
    "business_id",
    "business_name",
    "contact_name",
    "phone",
    "website",
    "address",
    "lat",
    "lon",
    "postcode",
    "neighborhood_area",
    "category_primary",
    "category_secondary",
    "price_tier",
    "rating_primary_value",
    "rating_primary_source",
    "rating_primary_review_count",
    "top_delights",
    "top_pain_points",
    "osint_confidence",
    "validation_tier",
    "red_flag_present",
    "red_flag_severity",
    "red_flag_notes",
    "chamber_member",
    "source_file",
    "batch_id",
    "last_reviewed_date",
    "corroboration_sources",
    "corroboration_count",
    "sunbiz_status",
    "sunbiz_name",
    "sunbiz_filing_number",
]

# ── Geographic constants ─────────────────────────────────────────
CORAL_GABLES_ZIPS = ["33134", "33146", "33133", "33143"]
CG_ZIPS_SET = set(CORAL_GABLES_ZIPS)

CG_BOUNDS = {
    "lat_min": 25.693,
    "lat_max": 25.770,
    "lon_min": -80.310,
    "lon_max": -80.225,
}

ZIP_CENTROIDS = {
    "33134": (25.7497, -80.2589),
    "33146": (25.7210, -80.2750),
    "33133": (25.7570, -80.2410),
    "33143": (25.7050, -80.2900),
}

OSM_BBOX = "25.690,-80.310,25.770,-80.230"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_HEADERS = {"User-Agent": "CoralGablesOSINT/1.0 (business-data-enrichment)"}


# ── Shared utilities ─────────────────────────────────────────────
def normalize_key(name: str) -> str:
    """Lowercase, strip non-alphanumeric, remove common suffixes."""
    if not name:
        return ""
    k = re.sub(r"[^a-z0-9]", "", name.lower().strip())
    for sfx in ("llc", "inc", "llp", "pa", "pllc", "corp", "ltd"):
        k = k.replace(sfx, "")
    return k.strip()


def normalize_phone(phone: str) -> str:
    """Normalize phone to (XXX) XXX-XXXX format. Rejects non-phone values."""
    if not phone or not isinstance(phone, str):
        return ""
    stripped = phone.strip()
    if "." in stripped and not any(c.isdigit() for c in stripped[:5]):
        return ""
    if re.search(r"\d{5}", stripped) and ("FL" in stripped or "Coral" in stripped):
        return ""
    digits = re.sub(r"[^\d]", "", stripped)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == "1":
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return stripped


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two lat/lon points."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def in_coral_gables(lat: Optional[float], lon: Optional[float]) -> bool:
    """Check if coordinates fall within Coral Gables bounds."""
    if lat is None or lon is None:
        return True
    return (
        CG_BOUNDS["lat_min"] <= lat <= CG_BOUNDS["lat_max"]
        and CG_BOUNDS["lon_min"] <= lon <= CG_BOUNDS["lon_max"]
    )


def infer_zip(lat: Optional[float], lon: Optional[float]) -> str:
    """Infer zip code from coordinates using nearest centroid."""
    if lat is None or lon is None:
        return ""
    return min(ZIP_CENTROIDS, key=lambda z: haversine(lat, lon, *ZIP_CENTROIDS[z]))


def infer_neighborhood(lat: Optional[float], lon: Optional[float]) -> str:
    """Infer neighborhood from coordinates."""
    if lat is None or lon is None:
        return ""
    if 25.748 < lat < 25.751 and -80.264 < lon < -80.256:
        return "Miracle Mile"
    if -80.260 < lon < -80.255 and 25.740 < lat < 25.760:
        return "Ponce de Leon Corridor"
    if 25.750 < lat < 25.758 and -80.268 < lon < -80.258:
        return "Alhambra Circle"
    if 25.728 < lat < 25.734 and -80.268 < lon < -80.262:
        return "Merrick Park"
    if 25.714 < lat < 25.726 and -80.285 < lon < -80.270:
        return "University of Miami"
    if -80.245 < lon < -80.235:
        return "Douglas Road Corridor"
    if lat < 25.710:
        return "Sunset / South Gables"
    if 25.730 < lat < 25.740:
        return "Bird Road Corridor"
    return "Coral Gables"


# ══════════════════════════════════════════════════════════════════
#  NAME MATCHING  (shared by Agent 2 dedup and Agent 8 verification)
# ══════════════════════════════════════════════════════════════════

# Noise words stripped before name comparison to prevent false matches
# e.g. "Coral Gables X" matching "Coral Gables Y".
NOISE_WORDS = {
    "coral", "gables", "miami", "fl", "florida", "south", "north",
    "the", "of", "and", "at", "in", "by", "for", "a", "an",
    "inc", "llc", "corp", "ltd", "pa", "pllc", "llp",
    "restaurant", "bar", "grill", "cafe", "salon", "spa", "hotel",
    "shop", "store", "center", "centre",
}


def strip_noise(name: str) -> str:
    """Remove noise words / punctuation from a business name for comparison."""
    words = re.sub(r"[^a-z0-9\s]", "", str(name).lower()).split()
    significant = [w for w in words if w not in NOISE_WORDS and len(w) > 1]
    return " ".join(significant)


def name_similarity(name_a: str, name_b: str) -> int:
    """
    Fuzzy similarity (0-100) between two business names after noise-word
    stripping. Returns 0 if either name is empty after stripping.
    """
    from fuzzywuzzy import fuzz

    clean_a = strip_noise(name_a)
    clean_b = strip_noise(name_b)
    if not clean_a or not clean_b:
        return 0
    return fuzz.token_sort_ratio(clean_a, clean_b)


def names_match(name_a: str, name_b: str, threshold: int) -> bool:
    """
    True if two names refer to the same business: they must share at least one
    significant (noise-stripped) token AND exceed the fuzzy threshold. The
    shared-token requirement prevents high fuzzy scores between unrelated short
    names.
    """
    clean_a = strip_noise(name_a)
    clean_b = strip_noise(name_b)
    if not clean_a or not clean_b:
        return False
    if not (set(clean_a.split()) & set(clean_b.split())):
        return False
    return name_similarity(name_a, name_b) >= threshold


# ══════════════════════════════════════════════════════════════════
#  CATEGORY CLASSIFICATION  (single source of truth)
# ══════════════════════════════════════════════════════════════════
# Ordered list of (category, keywords). Matching is WORD-BOUNDARY based, so
# "car" no longer matches "care"/"cardiology" and "tax" no longer matches
# "taxi". A trailing "*" marks a stem that may be followed by more letters
# ("construct*" matches "construction"/"constructor"). Multi-word keywords are
# weighted by their word count, so specific phrases ("art gallery") outweigh
# stray single tokens ("art").
#
# Order matters only for tie-breaks: earlier categories win an equal score, so
# generic buckets (retail) are placed last.
CATEGORY_KEYWORDS = [
    ("food_beverage", [
        "restaurant", "cafe", "coffee", "bakery", "bar", "pub", "pizza",
        "sushi", "grill", "diner", "caterer", "catering", "juice", "ice cream",
        "sandwich", "burger", "taco", "brewery", "winery", "bistro", "eatery",
        "food", "beverage", "pastry", "deli", "donut", "gelato", "chocolat*",
        "smoothie", "tea house", "ramen", "poke", "acai", "dining", "trattoria",
        "steakhouse", "seafood", "fast food", "fast_food", "food court",
        "food_court", "food truck", "wine", "wine bar", "supermarket",
        "convenience",
    ]),
    ("healthcare", [
        "doctor", "dentist", "dental", "medical", "clinic", "hospital",
        "physician", "surgeon", "optometr*", "optician", "dermatolog*",
        "pediatr*", "chiropr*", "orthoped*", "orthodont*", "psychiat*",
        "pharma*", "pharmacy", "nursing", "nurse", "urgent care", "health care",
        "healthcare", "mental health", "therap*", "counselor", "audiolog*",
        "podiatr*", "oncolog*", "cardiolog*", "neurolog*", "radiology",
        "patholog*", "veterinar*", "physical therapy", "ophthalmolog*",
    ]),
    ("legal", [
        "attorney", "lawyer", "law firm", "law office", "legal", "law",
        "notary", "paralegal", "mediation", "arbitration", "litigation", "esq",
    ]),
    ("accounting", [
        "accounting", "accountant", "accountants", "audit", "auditor", "cpa",
        "tax", "tax preparation", "tax service", "bookkeeping",
    ]),
    ("financial_services", [
        "financial advisor", "financial planner", "wealth management",
        "wealth", "investment", "payroll", "financial services",
        "asset management", "hedge fund", "private equity", "venture capital",
    ]),
    ("banking", [
        "bank", "banking", "credit union", "savings",
    ]),
    ("insurance", [
        "insurance", "insurance agency", "insurance agent", "underwriting",
        "allstate", "state farm", "geico", "allianz",
    ]),
    ("real_estate", [
        "real estate", "realty", "realtor", "property", "properties",
        "mortgage", "title company", "title agency", "apprais*", "brokerage",
    ]),
    ("education", [
        "school", "university", "college", "academy", "tutoring", "tutor",
        "learning", "preschool", "daycare", "montessori", "training center",
        "education", "child care", "childcare", "kindergarten",
        "language school",
    ]),
    ("hospitality", [
        "hotel", "motel", "resort", "inn", "lodge", "suites",
        "bed and breakfast", "airbnb", "vacation rental", "travel agent",
        "travel agency", "tour", "tours", "event venue", "banquet",
        "conference center", "hostel", "guest house", "guest_house", "travel",
    ]),
    ("construction", [
        "construct*", "contractor", "builder", "plumb*", "electric*", "hvac",
        "roofing", "paving", "excavat*", "demolition", "renovation", "remodel*",
        "general contractor", "handyman", "landscap*", "painting",
    ]),
    ("wellness", [
        "spa", "day spa", "massage", "yoga", "pilates", "fitness", "gym",
        "crossfit", "wellness", "meditation", "acupuncture", "holistic",
        "martial art", "swimming", "sports centre", "sports center",
    ]),
    ("marketing", [
        "marketing", "advertis*", "branding", "pr agency", "public relations",
        "social media", "seo", "digital marketing", "graphic design",
        "web design", "creative agency", "media",
    ]),
    ("technology", [
        "software", "tech", "technology", "it service", "it services",
        "it support", "computer", "cyber*", "data", "cloud", "app development",
        "web development", "artificial intelligence", "saas", "telecom",
        "information technology", "it_service",
    ]),
    ("consulting", [
        "consult*", "advisory", "coach", "coaching", "mentor*", "strateg*",
        "management consulting", "business development",
    ]),
    ("nonprofit", [
        "nonprofit", "non profit", "non-profit", "foundation", "charity",
        "association", "society", "red cross", "cancer society",
        "heart association", "alzheimer*", "legion", "rotary", "kiwanis",
        "lions club", "united way", "habitat for humanity", "ymca", "ywca",
        "food bank", "place of worship", "place_of_worship", "church",
        "community center", "community_centre", "community centre", "temple",
        "synagogue", "mosque", "ministry",
    ]),
    ("arts_culture", [
        "art gallery", "museum", "theater", "theatre", "performing arts",
        "music", "dance", "dance studio", "gallery", "cultural", "jazz",
        "orchestra", "opera", "film", "cinema", "art studio",
        "recording studio", "arts", "fine art", "nightclub", "night club",
    ]),
    ("personal_services", [
        # Personal care (kept here, not wellness, to match existing taxonomy)
        "salon", "hair salon", "beauty salon", "barber", "barber shop",
        "hairdresser", "nail", "nail salon", "hair", "beauty", "cosmetics",
        "aesthetic*", "skincare", "skin care", "wax",
        # Errand / household services
        "dry clean*", "laundry", "tailor", "moving", "storage",
        "cleaning service", "maid", "pest control", "locksmith", "photographer",
        "photography", "videograph*", "print*", "sign", "signs", "courier",
        "delivery", "shipping", "postal", "self storage",
    ]),
    ("professional_services", [
        "staffing", "recruiting", "human resources", "translation",
        "interpret*", "security", "guard", "private investigat*", "detective",
        "architect*", "engineer*", "engineering",
    ]),
    ("auto_dealer", [
        "auto", "automobile", "automotive", "car", "car dealer",
        "car dealership", "vehicle", "motor", "motors", "tire", "tires",
        "auto repair", "body shop", "car wash", "car_wash", "car_repair",
        "car_parts", "parking", "mechanic", "dealership",
    ]),
    ("retail", [
        "store", "shop", "boutique", "clothing", "apparel", "fashion", "jewel*",
        "jeweler", "furniture", "home decor", "gift", "gift shop", "florist",
        "flower", "shoe", "shoes", "optical", "eyewear", "sporting", "toy",
        "bookstore", "hardware", "supply", "grocery", "market", "wine shop",
        "liquor", "smoke", "pet", "pet store", "department store",
        "department_store", "mall",
    ]),
]

_CATEGORY_PATTERNS = None  # lazily compiled list of (category, [(regex, weight)])


def _build_category_patterns():
    compiled = []
    for category, keywords in CATEGORY_KEYWORDS:
        entries = []
        for kw in keywords:
            kw_l = kw.lower().strip()
            if not kw_l:
                continue
            weight = len(kw_l.replace("*", "").split()) or 1
            if kw_l.endswith("*"):
                pat = re.compile(r"\b" + re.escape(kw_l[:-1]) + r"\w*")
            else:
                pat = re.compile(r"\b" + re.escape(kw_l) + r"\b")
            entries.append((pat, weight))
        compiled.append((category, entries))
    return compiled


def classify_category(text: str) -> Optional[str]:
    """
    Classify free text (a raw scraper category, business name, or both) into one
    of the canonical categories. Returns the best-scoring category, or None if
    nothing matched. Word-boundary matching avoids mid-word false positives.
    """
    global _CATEGORY_PATTERNS
    if not text:
        return None
    if _CATEGORY_PATTERNS is None:
        _CATEGORY_PATTERNS = _build_category_patterns()

    t = str(text).lower()
    best_cat = None
    best_score = 0
    for category, entries in _CATEGORY_PATTERNS:
        score = 0
        for pat, weight in entries:
            if pat.search(t):
                score += weight
        if score > best_score:
            best_score = score
            best_cat = category
    return best_cat if best_score > 0 else None
