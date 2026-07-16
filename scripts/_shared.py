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
    for sfx in sorted(("llc", "inc", "llp", "pa", "pllc", "corp", "ltd"), key=len, reverse=True):
        if k.endswith(sfx):
            k = k[: -len(sfx)]
            break
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
