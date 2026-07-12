"""Unit tests for the pure, stateless helpers in scripts/_shared.py.

These don't touch the network or filesystem, so they're the cheapest,
highest-value tests in the pipeline: _shared.py is imported by five of
the agent scripts, so a bug here breaks all of them at once.
"""
from _shared import in_coral_gables, infer_zip, normalize_key, normalize_phone


def test_normalize_key_strips_case_punctuation_and_llc_suffix():
    assert normalize_key("Java House Cafe, LLC") == "javahousecafe"


def test_normalize_key_treats_equivalent_names_as_the_same_key():
    assert normalize_key("Java House Cafe") == normalize_key("JAVA HOUSE CAFE!!")


def test_normalize_key_empty_input_returns_empty_string():
    assert normalize_key("") == ""
    assert normalize_key(None) == ""


def test_normalize_phone_formats_10_digit_number():
    assert normalize_phone("305-555-1234") == "(305) 555-1234"


def test_normalize_phone_formats_11_digit_number_with_country_code():
    assert normalize_phone("+1 305 555 1234") == "(305) 555-1234"


def test_normalize_phone_rejects_zip_plus_state_text():
    # Guards against address fragments like "33134 FL" being mistaken for a phone
    assert normalize_phone("33134 FL") == ""


def test_normalize_phone_empty_input_returns_empty_string():
    assert normalize_phone("") == ""
    assert normalize_phone(None) == ""


def test_infer_zip_returns_nearest_centroid():
    # Exactly on the 33134 centroid defined in _shared.ZIP_CENTROIDS
    assert infer_zip(25.7497, -80.2589) == "33134"


def test_infer_zip_missing_coords_returns_empty_string():
    assert infer_zip(None, None) == ""


def test_in_coral_gables_true_inside_bounds():
    assert in_coral_gables(25.75, -80.26) is True


def test_in_coral_gables_false_outside_bounds():
    # Downtown Miami — well outside the Coral Gables bounding box
    assert in_coral_gables(25.7617, -80.1918) is False
