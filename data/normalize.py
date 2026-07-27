"""Phase 2 normalization: pure functions for business names and addresses.

Used against both Google Places (`places`) and SunBiz (`sunbiz_corp`,
`sunbiz_fic`) records so the two sources land in a comparable shape for
Phase 3 (candidate generation / blocking) and Phase 4 (deterministic
matching). Every function here is pure (no I/O, no DB) -- phase2_normalize.py
is the driver that reads ingest.db, calls these, and writes the results back.
"""
import re
import unicodedata

_NON_ALNUM_RE = re.compile(r"[^A-Z0-9 ]+")
_WS_RE = re.compile(r"\s+")
_LEADING_NUMBER_RE = re.compile(r"^\s*(\d+)")

# ---------------------------------------------------------------------------
# Business name normalization
# ---------------------------------------------------------------------------

# Legal-entity-type tokens stripped off the end of a normalized name to get
# the "core" comparable name. Order doesn't matter -- stripping loops until
# no trailing token matches, capped at a few iterations. Deliberately
# excludes ambiguous real-word suffixes like ASSOCIATION/PARTNERSHIP that are
# often part of the meaningful name (e.g. "HOMEOWNERS ASSOCIATION").
LEGAL_SUFFIXES = {
    "LLC", "LLLP", "LLP", "LP", "LC", "LTD", "LIMITED",
    "INC", "INCORPORATED", "CORP", "CORPORATION",
    "PLLC", "PA", "PL", "CO", "COMPANY",
}
MAX_SUFFIX_STRIP = 3

# Generic business words filtered out of "significant tokens" -- these carry
# little blocking value because they're shared across thousands of unrelated
# businesses (Phase 3 blocks on tokens that actually distinguish one
# business from another).
SIGNIFICANT_TOKEN_STOPWORDS = {
    "THE", "OF", "AND", "A", "AN", "BY", "AT", "DE", "LA",
    "GROUP", "HOLDINGS", "ENTERPRISES", "ENTERPRISE", "SERVICES", "SERVICE",
    "MANAGEMENT", "MANAGEMENT,", "INTERNATIONAL", "USA", "AMERICA",
    "INVESTMENT", "INVESTMENTS", "PROPERTIES", "PROPERTY", "PARTNERS",
    "SOLUTIONS", "CONSULTING", "VENTURES", "CAPITAL", "GLOBAL", "WORLDWIDE",
    # Geographic filler -- this pipeline is scoped to a single small area
    # (Coral Gables / Miami), so neighborhood and city names appear in an
    # enormous share of unrelated business names (measured: MIAMI in 665 of
    # 8,395 Google places, GABLES in 300, CORAL in 272 -- see conversation
    # record) and add no disambiguating power for blocking there.
    "MIAMI", "CORAL", "GABLES", "GROVE", "COCONUT", "PINECREST", "DADELAND",
    "BAY", "BISCAYNE", "BEACH", "FLORIDA", "FL", "SOUTH", "NORTH", "EAST",
    "WEST", "PARK", "PONCE", "LEON", "DIXIE",
    # Generic business-category words -- equally common across totally
    # unrelated businesses (measured: SALON in 149, DENTAL in 146, LAW in
    # 257, INSURANCE in 251, MEDICAL in 192, SPA in 189, etc.) so a shared
    # hit on one of these alone says "same industry", not "same business".
    "CENTER", "LAW", "INSURANCE", "REAL", "ESTATE", "MEDICAL", "ATM", "SPA",
    "REALTY", "BANK", "SALON", "DENTAL", "BEAUTY", "SCHOOL", "HAIR", "CARE",
    "STUDIO", "PHARMACY", "HEALTH", "NAILS", "AUTO", "SHOP", "BAR", "CHURCH",
    "MD", "DR",
}
MIN_TOKEN_LEN = 2


def _strip_accents(s):
    """Transliterate accented Latin characters to their ASCII base letter
    (CAFÉ -> CAFE, PONCE DE LEÓN -> PONCE DE LEON) via NFKD decomposition +
    dropping combining marks. Matters because Google Places names carry
    accents (~1.3% of the real dataset -- Spanish names are common in Coral
    Gables) while SunBiz's fixed-width extract is pure ASCII (see
    layouts.json) and can never represent one. Without this, the general
    non-alphanumeric strip below would delete "É" outright (CAFE -> CAF,
    losing a real letter) instead of folding it to the ASCII equivalent
    SunBiz could actually match against.
    """
    decomposed = unicodedata.normalize("NFKD", s)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def normalize_text(raw):
    """Base cleanup shared by names and street lines: accent-fold, uppercase,
    '&' -> AND, apostrophes and periods deleted outright (not replaced with a
    space) so abbreviations merge the way they're meant to -- "M.D." -> "MD",
    "P.A." -> "PA" -- while commas and everything else non-alphanumeric
    become a space, since a comma is a real separator between name
    components even with no space after it ("ASSOCIATION,INC." must stay two
    tokens, not merge into "ASSOCIATIONINC"). Characters with no ASCII
    transliteration (e.g. Cyrillic) are dropped -- SunBiz's records are pure
    ASCII so there's nothing on the other side to match them to anyway.
    """
    if not raw:
        return ""
    s = _strip_accents(raw)
    s = s.upper()
    s = s.replace("&", " AND ")
    s = s.replace("'", "").replace("’", "").replace(".", "")
    s = _NON_ALNUM_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def normalize_name(raw_name):
    """Full normalized name -- uppercase, punctuation-clean, whitespace-tight.
    Suffixes are NOT removed here; see strip_legal_suffix for the core name.
    """
    return normalize_text(raw_name)


def strip_legal_suffix(name_norm):
    """Strip trailing legal-entity-type tokens (LLC, INC, ...) from an
    already-normalized name. Returns (core_name, [suffixes_removed_in_order]).
    """
    if not name_norm:
        return "", []
    tokens = name_norm.split(" ")
    removed = []
    for _ in range(MAX_SUFFIX_STRIP):
        if tokens and tokens[-1] in LEGAL_SUFFIXES:
            removed.append(tokens.pop())
        else:
            break
    return " ".join(tokens), removed


def significant_tokens(core_name, min_len=MIN_TOKEN_LEN):
    """Tokens from a core name useful for Phase 3 blocking -- generic
    business words and very short tokens filtered out.
    """
    if not core_name:
        return []
    return [
        t for t in core_name.split(" ")
        if len(t) >= min_len and t not in SIGNIFICANT_TOKEN_STOPWORDS
    ]


# ---------------------------------------------------------------------------
# Address normalization
# ---------------------------------------------------------------------------

STREET_SUFFIX_ABBREV = {
    "STREET": "ST", "AVENUE": "AVE", "BOULEVARD": "BLVD", "DRIVE": "DR",
    "ROAD": "RD", "LANE": "LN", "COURT": "CT", "CIRCLE": "CIR",
    "PLACE": "PL", "TERRACE": "TER", "PARKWAY": "PKWY", "HIGHWAY": "HWY",
    "TRAIL": "TRL", "SQUARE": "SQ", "PLAZA": "PLZ", "POINT": "PT",
    "ALLEY": "ALY", "EXPRESSWAY": "EXPY", "CAUSEWAY": "CSWY",
}
DIRECTIONAL_ABBREV = {
    "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
    "NORTHEAST": "NE", "NORTHWEST": "NW", "SOUTHEAST": "SE", "SOUTHWEST": "SW",
}
STREET_TOKEN_ABBREV = {**STREET_SUFFIX_ABBREV, **DIRECTIONAL_ABBREV}

CARE_OF_PREFIXES = ("C O ", "CO ")  # after normalize_text, "C/O" -> "C O"

MAILBOX_KEYWORDS = (
    "UPS STORE", "POSTAL ANNEX", "MAIL BOXES ETC", "MAILBOXES ETC",
    "IPOSTAL", "PACKAGE STORE", "PRIVATE MAILBOX", "PMB",
)

UNIT_KEYWORDS = {"SUITE", "STE", "UNIT", "APT", "BLDG", "BUILDING", "FLOOR"}


def _split_unit(rest_norm):
    """Split a normalized street remainder at the first unit/suite keyword,
    e.g. "BIRD AVENUE SUITE 302" -> ("BIRD AVENUE", "SUITE 302"). Keeps
    suite/unit noise out of street_norm so Phase 3 blocking on street name
    isn't defeated by it.
    """
    tokens = rest_norm.split(" ")
    for i, t in enumerate(tokens):
        if t in UNIT_KEYWORDS:
            return " ".join(tokens[:i]).strip(), " ".join(tokens[i:]).strip()
    return rest_norm, ""


def _strip_unit_keyword(unit_text):
    """Reduce "SUITE 302" / "STE 302" to just the identifying token "302".
    Required so the two sides of a match can agree at all: SunBiz addresses
    spell the keyword out (SUITE/STE/UNIT/...) while Google's
    formatted_address commonly uses a bare "#302" with no keyword at all
    (see extract_unit_from_text) -- comparing "SUITE 302" to "302" would
    never match, but comparing "302" to "302" will.
    """
    if not unit_text:
        return ""
    tokens = unit_text.split(" ")
    if tokens and tokens[0] in UNIT_KEYWORDS:
        tokens = tokens[1:]
    return " ".join(tokens).strip()


def _abbreviate_street_tokens(street_norm):
    if not street_norm:
        return street_norm
    return " ".join(STREET_TOKEN_ABBREV.get(t, t) for t in street_norm.split(" "))


def normalize_street_name(raw):
    """Normalize an already-separated street name (no house number mixed in,
    e.g. Google Places' `street` field) -- clean text + abbreviations, no
    care-of/unit-splitting logic needed since the source already separated
    that out.
    """
    return _abbreviate_street_tokens(normalize_text(raw))


def normalize_street_number(raw):
    """Leading numeric run of a street-number-ish string. Handles ranges
    ("123-125" -> "123", already digits-only by the time normalize_text
    would have turned the hyphen into a space, so this runs on raw input)
    and unit-letter suffixes ("123A" -> "123") by taking only the leading
    digits.
    """
    if not raw:
        return ""
    m = _LEADING_NUMBER_RE.match(raw.strip())
    return m.group(1) if m else ""


def _looks_like_care_of(text_norm):
    return any(text_norm.startswith(p) for p in CARE_OF_PREFIXES)


def normalize_street_address(addr1, addr2=None):
    """Normalize a freeform street address line into a comparable shape.

    SunBiz's princ_addr1/addr1 sometimes holds a "C/O <person>" line with the
    real street in addr2 instead (see e.g. TOLE FINANCIAL CONSULTANTS in
    cordata: addr1='C/O ANTONIO F. GOITIA', addr2='1542 PALERMO AVE.'). When
    addr1 doesn't start with a digit and addr2 does, addr2 is treated as the
    real street line -- `used_line` and `is_care_of` record that decision so
    later phases can see it rather than silently picking one.

    When addr1 IS the street line, addr2 is usually suite/unit info (e.g.
    "SUITE 2108") and is folded into `unit` rather than discarded.

    Returns dict: street_number, street_norm (abbreviated), unit, used_line
    ('addr1'/'addr2'/'none'), is_care_of (bool).
    """
    a1 = (addr1 or "").strip()
    a2 = (addr2 or "").strip()
    is_care_of = _looks_like_care_of(normalize_text(a1))

    if (not a1[:1].isdigit()) and a2[:1].isdigit():
        chosen, used_line, aux = a2, "addr2", ""
    else:
        chosen, used_line, aux = a1, "addr1", a2

    if not chosen:
        return {"street_number": "", "street_norm": "", "unit": normalize_text(aux),
                "used_line": "none", "is_care_of": is_care_of}

    number = normalize_street_number(chosen)
    rest = chosen.strip()
    if number and rest.startswith(number):
        rest = rest[len(number):].strip()
    rest_norm = normalize_text(rest)
    street_part, unit_part = _split_unit(rest_norm)
    street_norm = _abbreviate_street_tokens(street_part)

    aux_norm = normalize_text(aux) if aux else ""
    unit = " ".join(x for x in (_strip_unit_keyword(unit_part), _strip_unit_keyword(aux_norm)) if x).strip()

    return {
        "street_number": number,
        "street_norm": street_norm,
        "unit": unit,
        "used_line": used_line,
        "is_care_of": is_care_of,
    }


def normalize_city(raw):
    return normalize_text(raw)


def normalize_state(raw):
    s = normalize_text(raw)
    return s[:2] if s else ""


_UNIT_ID_RE = re.compile(
    r"(?:(?:SUITE|STE|UNIT|APT|BLDG|BUILDING|FLOOR)\.?\s*[:#]?\s*|#\s*)([A-Z0-9\-]+)",
    re.IGNORECASE,
)


def extract_unit_from_text(raw):
    """Pull just the identifying suite/unit token out of a freeform address
    string that has no separate structured unit field -- Google Places'
    `formatted_address` is the motivating case. Matches either a spelled-out
    keyword ("Ste 106" -> "106") or a bare hash ("#205" -> "205", the
    common Google format with no keyword at all -- e.g. "...Blvd #350,
    Miami..."). Returns just the identifier, not the keyword, so it can be
    compared against SunBiz's unit_norm (see _strip_unit_keyword) on equal
    terms: "SUITE 106" and "STE 106" and "#106" must all normalize to the
    same "106" or a real match gets missed. Returns "" if nothing found --
    most addresses don't have a unit, and that's a meaningful value (means
    "ground-level/standalone"), not a parse failure.
    """
    if not raw:
        return ""
    m = _UNIT_ID_RE.search(raw)
    if not m:
        return ""
    return m.group(1).upper()


def looks_like_mailbox_address(street_norm, addr2_norm=""):
    """Keyword-based mailbox/commercial-mail-receiving-agency detector.
    Independent of (and OR'd with, by the caller) the shared-address-volume
    heuristic computed in phase2_normalize.py.
    """
    combined = f"{street_norm} {addr2_norm}".strip()
    return any(kw in combined for kw in MAILBOX_KEYWORDS)
