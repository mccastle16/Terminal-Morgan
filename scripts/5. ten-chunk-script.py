#!/usr/bin/env python3
"""
Coral Gables OSINT — 10-Chunk Overpass Run (v4.0)
-------------------------------------------------
Rebuilds CGCC base, runs 10 Overpass chunks (with sub-chunks),
optionally merges TripAdvisor/web restaurant OSINT, and writes
all_biz_osint_v4.csv with PKP-style fields.

Requirements:
  pip install requests pandas beautifulsoup4

Inputs:
  - cgcc-member.md           (raw Chamber scrape)

Output:
  - all_biz_osint_v4.csv
"""

import re
import csv
import time
from collections import Counter
from math import radians, cos, sin, asin, sqrt

import pandas as pd
import requests
from bs4 import BeautifulSoup

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
BATCH_ID = "CG-OSINT-20260212-v4.0"

CG_BOUNDS = {
    "lat_min": 25.693,
    "lat_max": 25.770,
    "lon_min": -80.310,
    "lon_max": -80.225,
}

ZIP_C = {
    "33134": (25.7497, -80.2589),
    "33146": (25.7210, -80.2750),
    "33133": (25.7570, -80.2410),
    "33143": (25.7050, -80.2900),
}


# -------------------------------------------------------------------
# UTILS
# -------------------------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    return R * 2 * asin(sqrt(a))


def in_cg(lat, lon):
    if lat is None or lon is None:
        return False
    return (
        CG_BOUNDS["lat_min"] <= lat <= CG_BOUNDS["lat_max"]
        and CG_BOUNDS["lon_min"] <= lon <= CG_BOUNDS["lon_max"]
    )


def get_zip(lat, lon, explicit=""):
    if explicit in ["33134", "33146", "33133", "33143"]:
        return explicit
    if not lat or not lon:
        return "33134"
    return min(ZIP_C, key=lambda z: haversine(lat, lon, *ZIP_C[z]))


def get_hood(lat, lon):
    if not lat or not lon:
        return "Coral Gables"
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


def nk(name):
    k = re.sub(r"[^a-z0-9]", "", str(name).lower().strip())
    for sfx in ["llc", "inc", "llp", "pa", "pllc", "corp"]:
        k = k.replace(sfx, "")
    return k.strip()


def np_norm(p):
    if not p or not isinstance(p, str):
        return ""
    d = re.sub(r"[^\d]", "", p)
    if len(d) == 10:
        return f"({d[:3]}) {d[3:6]}-{d[6:]}"
    if len(d) == 11 and d[0] == "1":
        return f"({d[1:4]}) {d[4:7]}-{d[7:]}"
    return p.strip()


# -------------------------------------------------------------------
# CGCC PARSER
# -------------------------------------------------------------------
CAT_KW = [
    "account",
    "advertis",
    "aesthet",
    "airline",
    "apartment",
    "architect",
    "attorney",
    "auto",
    "baker",
    "bank",
    "barber",
    "beauty",
    "beverage",
    "book",
    "boutique",
    "business",
    "caterer",
    "child",
    "chiropract",
    "church",
    "coach",
    "construct",
    "consul",
    "contractor",
    "convention",
    "cowork",
    "cpa",
    "credit",
    "dance",
    "decorat",
    "dentist",
    "digital",
    "education",
    "electric",
    "elevator",
    "employee",
    "employment",
    "engineer",
    "entertainment",
    "estate",
    "event",
    "executive",
    "fair",
    "financ",
    "fitness",
    "florist",
    "food",
    "foundation",
    "franchise",
    "funeral",
    "furniture",
    "government",
    "green",
    "gym",
    "hair",
    "health",
    "high end",
    "home",
    "hospital",
    "hotel",
    "human",
    "information",
    "insurance",
    "interior",
    "international",
    "invest",
    "janitorial",
    "kitchen",
    "language",
    "leadership",
    "legal",
    "lifetime",
    "lighting",
    "liquor",
    "logistic",
    "management",
    "market",
    "med spa",
    "media",
    "medical",
    "mental",
    "merchant",
    "mortgage",
    "moving",
    "multinational",
    "museum",
    "music",
    "nail",
    "non profit",
    "non-profit",
    "nonprofit",
    "office",
    "online",
    "optical",
    "organization",
    "payroll",
    "permit",
    "pet",
    "pharmac",
    "phone",
    "photo",
    "physical",
    "physician",
    "plumb",
    "point of sale",
    "print",
    "profession",
    "property",
    "public",
    "publisher",
    "radio",
    "real estate",
    "recruit",
    "restaurant",
    "retail",
    "salon",
    "school",
    "security",
    "service",
    "staffing",
    "stationery",
    "supplement",
    "technolog",
    "telephone",
    "theatre",
    "trade",
    "transport",
    "travel",
    "trophies",
    "tutor",
    "utilities",
    "veterinar",
    "video",
    "water",
    "wealth",
    "website",
    "wellness",
    "wine",
    "women",
    "yoga",
    "spa",
    "wax",
    "relation",
    "art",
    "perform",
    "sport",
    "drink",
]


def is_contact(s):
    return bool(
        re.match(r"^(Mr\.|Ms\.|Mrs\.|Dr\.|Rev\.|Hon\.|Amb\.)", s.strip())
    )


def is_phone(s):
    return bool(re.search(r"\(\d{3}\)", s.strip()))


def is_web(s):
    s = s.strip().lower()
    return bool(
        re.match(r"^[a-z0-9][\w\-]*\.", s)
        and not re.search(r"\s", s)
        and len(s) > 4
    )


def cgcc_cat(raw):
    if not isinstance(raw, str):
        return "other", ""
    c = raw.lower()
    rules = [
        ("accounting", "accounting"),
        ("cpa", "accounting"),
        ("attorney", "legal"),
        ("law", "legal"),
        ("bank", "banking"),
        ("financ", "financial_services"),
        ("wealth", "financial_services"),
        ("insurance", "insurance"),
        ("real estate", "real_estate"),
        ("hotel", "hospitality"),
        ("resort", "hospitality"),
        ("travel", "hospitality"),
        ("restaurant", "food_beverage"),
        ("food", "food_beverage"),
        ("caterer", "food_beverage"),
        ("baker", "food_beverage"),
        ("beverage", "food_beverage"),
        ("wine", "food_beverage"),
        ("retail", "retail"),
        ("boutique", "retail"),
        ("jewelry", "retail"),
        ("beauty", "personal_services"),
        ("salon", "personal_services"),
        ("hair", "personal_services"),
        ("spa", "wellness"),
        ("fitness", "wellness"),
        ("gym", "wellness"),
        ("yoga", "wellness"),
        ("wellness", "wellness"),
        ("health", "healthcare"),
        ("medical", "healthcare"),
        ("physician", "healthcare"),
        ("dentist", "healthcare"),
        ("pharmacy", "healthcare"),
        ("architect", "professional_services"),
        ("engineer", "professional_services"),
        ("marketing", "marketing"),
        ("advertis", "marketing"),
        ("public relation", "marketing"),
        ("consult", "consulting"),
        ("coach", "consulting"),
        ("construct", "construction"),
        ("contractor", "construction"),
        ("education", "education"),
        ("tutor", "education"),
        ("non profit", "nonprofit"),
        ("non-profit", "nonprofit"),
        ("nonprofit", "nonprofit"),
        ("foundation", "nonprofit"),
        ("church", "nonprofit"),
        ("technology", "technology"),
        ("auto", "auto_dealer"),
        ("entertainment", "arts_culture"),
        ("theatre", "arts_culture"),
        ("museum", "arts_culture"),
        ("art", "arts_culture"),
        ("media", "media"),
        ("government", "government"),
        ("transport", "transportation"),
        ("logistic", "logistics"),
        ("pet", "personal_services"),
    ]
    for kw, mapped in rules:
        if kw in c:
            return mapped, raw.strip()
    return "other", raw.strip()


def load_cgcc(path="cgcc-member.md"):
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    lines = raw.split("\n")
    blocks, cur = [], []
    for l in lines:
        if l.strip() == "":
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(l.strip())
    if cur:
        blocks.append(cur)

    members = []
    current_cat = ""
    for block in blocks:
        if not block or block[0].startswith("<img"):
            continue
        ci = None
        for i, l in enumerate(block):
            if is_contact(l):
                ci = i
                break
        if ci is None:
            current_cat = block[0]
            continue
        if ci == 1:
            biz = block[0]
        elif ci == 2:
            if any(kw in block[0].lower() for kw in CAT_KW) or "/" in block[0]:
                current_cat = block[0]
                biz = block[1]
            else:
                biz = block[0]
        else:
            biz = block[0]
        phone, web = "", ""
        for l in block[ci + 1 :]:
            if is_phone(l) and not phone:
                phone = l
            elif is_web(l) and not web:
                web = l
        members.append(
            {
                "name": biz,
                "contact": block[ci],
                "phone": phone,
                "web": web,
                "cat": current_cat,
            }
        )

    seen = {}
    for m in members:
        k = nk(m["name"])
        if k not in seen:
            seen[k] = m

    return seen


# -------------------------------------------------------------------
# OSM CATEGORY MAPPER
# -------------------------------------------------------------------
def osm_cat(tags):
    if "amenity" in tags:
        a = tags["amenity"]
        fb = [
            "restaurant",
            "fast_food",
            "cafe",
            "bar",
            "pub",
            "ice_cream",
            "bakery",
            "food_court",
        ]
        if a in fb:
            return "food_beverage", a
        if a == "bank":
            return "banking", "bank"
        if a in ["doctors", "dentist", "pharmacy", "veterinary", "clinic", "hospital"]:
            return "healthcare", a
        if a in ["school", "university", "college", "kindergarten", "language_school"]:
            return "education", a
        if a in ["place_of_worship", "community_centre"]:
            return "nonprofit", a
        if a in ["theatre", "cinema", "arts_centre", "nightclub", "music_venue"]:
            return "arts_culture", a
        if a in ["car_rental", "car_wash"]:
            return "auto_dealer", a
        if a == "bureau_de_change":
            return "financial_services", a
        return "other", a

    if "shop" in tags:
        s = tags["shop"]
        food = [
            "supermarket",
            "convenience",
            "deli",
            "butcher",
            "greengrocer",
            "alcohol",
            "wine",
            "beverages",
            "pastry",
            "confectionery",
            "coffee",
            "tea",
            "chocolate",
        ]
        if s in food:
            return "food_beverage", f"retail/{s}"
        if s in ["clothes", "shoes", "bag", "leather", "fabric", "tailor"]:
            return "retail", "fashion"
        if s in ["jewelry", "watches"]:
            return "retail", "jewelry"
        if s in ["beauty", "hairdresser", "cosmetics", "perfumery", "tattoo"]:
            return "personal_services", s
        if s == "optician":
            return "healthcare", "optical"
        if s in ["electronics", "computer", "mobile_phone"]:
            return "retail", "electronics"
        if s in ["furniture", "interior_decoration"]:
            return "retail", "home"
        if s in ["car", "car_repair", "car_parts"]:
            return "auto_dealer", s
        return "retail", s

    if "office" in tags:
        o = tags["office"]
        m = {
            "lawyer": "legal",
            "notary": "legal",
            "insurance": "insurance",
            "financial": "financial_services",
            "accountant": "accounting",
            "estate_agent": "real_estate",
            "it": "technology",
            "architect": "professional_services",
            "consulting": "consulting",
            "ngo": "nonprofit",
            "association": "nonprofit",
            "company": "professional_services",
        }
        return m.get(o, "professional_services"), o

    if "healthcare" in tags:
        return "healthcare", tags["healthcare"]
    if "tourism" in tags:
        return "hospitality", tags["tourism"]
    if "leisure" in tags:
        return "wellness", tags["leisure"]
    if "craft" in tags:
        return "construction", tags["craft"]
    return "other", ""


# -------------------------------------------------------------------
# 10-CHUNK OVERPASS RUN
# -------------------------------------------------------------------
def run_overpass_10chunks():
    BBOX = "25.690,-80.310,25.770,-80.230"

    chunks = {
        "Chunk 1 — Restaurants": f"""
[out:json][timeout:90];
(node["name"]["amenity"="restaurant"]({BBOX});
 way["name"]["amenity"="restaurant"]({BBOX}););
out center;""",
        "Chunk 2 — Fast Food + Cafes + Bars": f"""
[out:json][timeout:90];
(node["name"]["amenity"~"fast_food|cafe|bar|pub|ice_cream|bakery|food_court"]({BBOX});
 way["name"]["amenity"~"fast_food|cafe|bar|pub|bakery"]({BBOX}););
out center;""",
        "Chunk 3 — Food Retail": f"""
[out:json][timeout:90];
(node["name"]["shop"~"convenience|supermarket|deli|butcher|greengrocer|alcohol|wine|beverages|pastry|confectionery|coffee|tea|chocolate"]({BBOX});
 way["name"]["shop"~"supermarket|convenience"]({BBOX}););
out center;""",
        "Chunk 4 — Offices (Legal/Finance/Prof)": f"""
[out:json][timeout:90];
(node["name"]["office"]({BBOX});
 way["name"]["office"]({BBOX});
 node["name"]["amenity"="bank"]({BBOX});
 way["name"]["amenity"="bank"]({BBOX}););
out center;""",
        "Chunk 5 — Healthcare": f"""
[out:json][timeout:90];
(node["name"]["amenity"~"doctors|dentist|pharmacy|veterinary|clinic|hospital"]({BBOX});
 node["name"]["healthcare"]({BBOX});
 way["name"]["healthcare"]({BBOX});
 way["name"]["amenity"~"doctors|dentist|pharmacy|hospital|clinic"]({BBOX}););
out center;""",
        "Chunk 6 — Education + Religious + Community": f"""
[out:json][timeout:90];
(node["name"]["amenity"~"school|university|college|kindergarten|language_school|place_of_worship|community_centre"]({BBOX});
 way["name"]["amenity"~"school|university|college|place_of_worship|community_centre"]({BBOX}););
out center;""",
        "Chunk 7 — Hotels + Leisure + Auto": f"""
[out:json][timeout:90];
(node["name"]["tourism"~"hotel|motel|hostel|guest_house"]({BBOX});
 node["name"]["leisure"~"fitness_centre|sports_centre|swimming_pool|dance"]({BBOX});
 node["name"]["amenity"~"car_rental|car_wash"]({BBOX});
 node["name"]["shop"~"car|car_repair|car_parts"]({BBOX});
 way["name"]["tourism"~"hotel|motel"]({BBOX});
 way["name"]["leisure"~"fitness_centre|sports_centre"]({BBOX}););
out center;""",
        "Chunk 8 — Fashion + Jewelry + Beauty": f"""
[out:json][timeout:90];
(node["name"]["shop"~"clothes|shoes|jewelry|watches|bag|leather|beauty|hairdresser|cosmetics|perfumery|tattoo|optician"]({BBOX});
 way["name"]["shop"~"clothes|shoes|jewelry|department_store|mall"]({BBOX}););
out center;""",
        "Chunk 9 — Home + Electronics + Misc Retail": f"""
[out:json][timeout:90];
(node["name"]["shop"~"electronics|computer|mobile_phone|furniture|interior_decoration|florist|gift|art|books|stationery|pet|hardware|houseware|dry_cleaning|photo|copyshop|travel_agency|variety_store|garden_centre"]({BBOX});
 way["name"]["shop"~"furniture|electronics"]({BBOX}););
out center;""",
        "Chunk 10 — Entertainment + Craft + Nightlife": f"""
[out:json][timeout:90];
(node["name"]["amenity"~"arts_centre|theatre|cinema|nightclub|music_venue|bureau_de_change"]({BBOX});
 node["name"]["craft"]({BBOX});
 way["name"]["amenity"~"theatre|cinema"]({BBOX}););
out center;""",
    }

    all_elements = []
    seen_ids = set()
    chunk_stats = {}

    # Initial 10 chunks
    for chunk_name, query in chunks.items():
        print(f"  {chunk_name}...", end=" ")
        try:
            resp = requests.post(
                OVERPASS_URL, data={"data": query}, timeout=100
            )
            if resp.status_code == 200:
                data = resp.json()
                els = data.get("elements", [])
                new = 0
                for el in els:
                    if el.get("tags", {}).get("name") and el["id"] not in seen_ids:
                        seen_ids.add(el["id"])
                        all_elements.append(el)
                        new += 1
                print(f"→ {new} unique")
                chunk_stats[chunk_name] = new
            else:
                print(f"→ Error {resp.status_code}")
                chunk_stats[chunk_name] = 0
            time.sleep(2)
        except Exception as e:
            print(f"→ {e}")
            chunk_stats[chunk_name] = 0

    # Sub-chunks for the heavy ones
    time.sleep(3)
    BBOX = "25.690,-80.310,25.770,-80.230"
    retry_chunks = {
        "Chunk 2a — Fast Food": f"""
[out:json][timeout:60];
(node["name"]["amenity"="fast_food"]({BBOX});
 way["name"]["amenity"="fast_food"]({BBOX}););
out center;""",
        "Chunk 2b — Cafes": f"""
[out:json][timeout:60];
(node["name"]["amenity"="cafe"]({BBOX});
 way["name"]["amenity"="cafe"]({BBOX}););
out center;""",
        "Chunk 2c — Bars + Pubs + Ice Cream + Bakery": f"""
[out:json][timeout:60];
(node["name"]["amenity"~"bar|pub|ice_cream|bakery|food_court"]({BBOX});
 way["name"]["amenity"~"bar|pub|bakery"]({BBOX}););
out center;""",
        "Chunk 7a — Hotels": f"""
[out:json][timeout:60];
(node["name"]["tourism"~"hotel|motel|hostel|guest_house"]({BBOX});
 way["name"]["tourism"~"hotel|motel"]({BBOX}););
out center;""",
        "Chunk 7b — Fitness + Auto": f"""
[out:json][timeout:60];
(node["name"]["leisure"~"fitness_centre|sports_centre|swimming_pool|dance"]({BBOX});
 node["name"]["amenity"~"car_rental|car_wash"]({BBOX});
 node["name"]["shop"~"car|car_repair|car_parts"]({BBOX});
 way["name"]["leisure"~"fitness_centre|sports_centre"]({BBOX}););
out center;""",
        "Chunk 8a — Clothes + Shoes + Jewelry": f"""
[out:json][timeout:60];
(node
