"""Unit tests for normalize.py, calibrated against real examples pulled from
ingest.db (see conversation record) rather than invented data.

Run from the `data/` directory:  python test_normalize.py
"""
import unittest

import normalize as n


class TestNameNormalization(unittest.TestCase):
    def test_basic_uppercase_and_punctuation(self):
        self.assertEqual(n.normalize_name("American Reef Company LLC"), "AMERICAN REEF COMPANY LLC")

    def test_ampersand_becomes_and(self):
        self.assertEqual(n.normalize_name("A & E Garcia PA"), "A AND E GARCIA PA")

    def test_apostrophe_deleted_no_space(self):
        self.assertEqual(n.normalize_name("O'Brien's Pub"), "OBRIENS PUB")

    def test_periods_merge_initials_commas_still_separate(self):
        # periods delete outright ("M.D." -> "MD"); commas become a
        # separator so "GARCIA," and "M.D." don't merge into one token
        self.assertEqual(n.normalize_name("Manuel E. Garcia, M.D., P.A."), "MANUEL E GARCIA MD PA")

    def test_empty_and_none(self):
        self.assertEqual(n.normalize_name(""), "")
        self.assertEqual(n.normalize_name(None), "")

    def test_multiple_spaces_collapsed(self):
        self.assertEqual(n.normalize_name("A    B   C"), "A B C")

    def test_accented_latin_chars_transliterate_to_ascii(self):
        # Google Places carries accents (~1.3% of real rows); SunBiz is pure
        # ASCII and can never have one -- must fold to the base letter, not
        # drop it, so the two sides can still match on the token.
        self.assertEqual(n.normalize_name("Café Cubano"), "CAFE CUBANO")
        self.assertEqual(n.normalize_name("Ponce de León"), "PONCE DE LEON")
        self.assertEqual(n.normalize_name("Piñata Fiesta"), "PINATA FIESTA")

    def test_non_latin_script_drops_to_empty_not_a_crash(self):
        # No ASCII transliteration exists for Cyrillic; SunBiz has nothing
        # to match it to either, so dropping to empty is acceptable -- the
        # important thing is it doesn't raise.
        self.assertEqual(n.normalize_name("Центр"), "")


class TestLegalSuffixStripping(unittest.TestCase):
    def test_llc_stripped(self):
        core, removed = n.strip_legal_suffix("AMERICAN REEF COMPANY LLC")
        self.assertEqual(core, "AMERICAN REEF")
        self.assertEqual(removed, ["LLC", "COMPANY"])

    def test_inc_stripped(self):
        core, removed = n.strip_legal_suffix("CAREGIVERS FOR KIDS CORP")
        self.assertEqual(core, "CAREGIVERS FOR KIDS")
        self.assertEqual(removed, ["CORP"])

    def test_pa_stripped_but_md_credential_kept(self):
        # PA (Professional Association) is a legal-entity suffix and strips;
        # MD (Doctor of Medicine) is a professional credential, not an
        # entity type, and is deliberately not in LEGAL_SUFFIXES
        name_norm = n.normalize_name("Manuel E. Garcia, M.D., P.A.")
        core, removed = n.strip_legal_suffix(name_norm)
        self.assertEqual(core, "MANUEL E GARCIA MD")
        self.assertEqual(removed, ["PA"])

    def test_homeowners_association_not_over_stripped(self):
        name_norm = n.normalize_name("Coconut Grove Villas Homeowners Association,Inc.")
        core, removed = n.strip_legal_suffix(name_norm)
        # INC strips; ASSOCIATION is intentionally not a legal-suffix token
        self.assertEqual(core, "COCONUT GROVE VILLAS HOMEOWNERS ASSOCIATION")
        self.assertEqual(removed, ["INC"])

    def test_no_suffix_present(self):
        core, removed = n.strip_legal_suffix("107 TASTE ASIAN RESTAURANT CORAL GABLES")
        self.assertEqual(core, "107 TASTE ASIAN RESTAURANT CORAL GABLES")
        self.assertEqual(removed, [])

    def test_empty(self):
        self.assertEqual(n.strip_legal_suffix(""), ("", []))


class TestSignificantTokens(unittest.TestCase):
    def test_filters_stopwords_and_short_tokens(self):
        core, _ = n.strip_legal_suffix(n.normalize_name("D & J Koris Inc."))
        self.assertEqual(core, "D AND J KORIS")
        self.assertEqual(n.significant_tokens(core), ["KORIS"])

    def test_single_char_tokens_filtered_numeric_or_not(self):
        # a lone digit ("7") is filtered by the same min-length rule as a
        # lone letter -- neither disambiguates much alone for blocking
        core, _ = n.strip_legal_suffix(n.normalize_name("7-Eleven"))
        self.assertEqual(n.significant_tokens(core), ["ELEVEN"])

    def test_multi_digit_numeric_token_kept(self):
        # CORAL/GABLES are deliberately in the geo-noise stopword list (see
        # normalize.py) since this pipeline is scoped to a single small area
        core, _ = n.strip_legal_suffix(n.normalize_name("305 Plastic Surgery Coral Gables"))
        self.assertEqual(n.significant_tokens(core), ["305", "PLASTIC", "SURGERY"])

    def test_geo_filler_words_excluded(self):
        core, _ = n.strip_legal_suffix(n.normalize_name("Miami Coral Gables Biscayne Bay Dental Salon"))
        self.assertEqual(n.significant_tokens(core), [])

    def test_generic_words_filtered(self):
        core, _ = n.strip_legal_suffix(n.normalize_name("Sunshine Property Management Group LLC"))
        toks = n.significant_tokens(core)
        self.assertIn("SUNSHINE", toks)
        self.assertNotIn("MANAGEMENT", toks)
        self.assertNotIn("GROUP", toks)

    def test_empty(self):
        self.assertEqual(n.significant_tokens(""), [])


class TestStreetNumber(unittest.TestCase):
    def test_plain(self):
        self.assertEqual(n.normalize_street_number("226 Almeria Ave"), "226")

    def test_range_takes_first(self):
        self.assertEqual(n.normalize_street_number("123-125 Main St"), "123")

    def test_letter_suffix(self):
        self.assertEqual(n.normalize_street_number("123A Main St"), "123")

    def test_no_number(self):
        self.assertEqual(n.normalize_street_number("C/O Antonio Goitia"), "")

    def test_empty(self):
        self.assertEqual(n.normalize_street_number(""), "")


class TestStreetAddress(unittest.TestCase):
    def test_simple_address(self):
        r = n.normalize_street_address("226 Almeria Ave", "")
        self.assertEqual(r["street_number"], "226")
        self.assertEqual(r["street_norm"], "ALMERIA AVE")
        self.assertEqual(r["used_line"], "addr1")
        self.assertFalse(r["is_care_of"])

    def test_directional_and_suffix_abbreviated(self):
        r = n.normalize_street_address("7300 NORTH KENDALL DRIVE", "SUITE 201")
        self.assertEqual(r["street_number"], "7300")
        self.assertEqual(r["street_norm"], "N KENDALL DR")
        self.assertEqual(r["unit"], "201")

    def test_suite_embedded_in_addr1_is_split_out(self):
        r = n.normalize_street_address("1550 MADRUGA AVE STE 336", "")
        self.assertEqual(r["street_norm"], "MADRUGA AVE")
        self.assertEqual(r["unit"], "336")

    def test_care_of_falls_back_to_addr2(self):
        r = n.normalize_street_address("C/O ANTONIO F. GOITIA", "1542 PALERMO AVE.")
        self.assertEqual(r["street_number"], "1542")
        self.assertEqual(r["street_norm"], "PALERMO AVE")
        self.assertEqual(r["used_line"], "addr2")
        self.assertTrue(r["is_care_of"])

    def test_care_of_via_law_offices_addr1_addr2_is_street(self):
        r = n.normalize_street_address("c/o LAW OFFICES OF ALAN DUBOW", "2809 BIRD AVENUE, SUITE 302")
        self.assertEqual(r["street_number"], "2809")
        self.assertEqual(r["street_norm"], "BIRD AVE")
        self.assertEqual(r["unit"], "302")
        self.assertEqual(r["used_line"], "addr2")

    def test_no_digit_anywhere(self):
        r = n.normalize_street_address("C/O SOME PERSON", "")
        self.assertEqual(r["street_number"], "")
        self.assertEqual(r["used_line"], "addr1")
        self.assertTrue(r["is_care_of"])

    def test_both_blank(self):
        r = n.normalize_street_address("", "")
        self.assertEqual(r["used_line"], "none")
        self.assertEqual(r["street_number"], "")


class TestCityState(unittest.TestCase):
    def test_city(self):
        self.assertEqual(n.normalize_city("Coral Gables,"), "CORAL GABLES")

    def test_state(self):
        self.assertEqual(n.normalize_state("fl"), "FL")

    def test_state_empty(self):
        self.assertEqual(n.normalize_state(""), "")


class TestExtractUnitFromText(unittest.TestCase):
    def test_google_formatted_address_with_suite(self):
        self.assertEqual(
            n.extract_unit_from_text("8585 Sunset Dr Ste 106, Miami, FL 33143, USA"), "106")

    def test_no_unit_present(self):
        self.assertEqual(n.extract_unit_from_text("357 Alcazar Ave, Coral Gables, FL 33134, USA"), "")

    def test_unit_keyword_word_suite(self):
        self.assertEqual(
            n.extract_unit_from_text("2151 SW 42nd Ave Suite 200, Miami, FL 33134, USA"), "200")

    def test_bare_hash_no_keyword(self):
        # Google's formatted_address very often has no "Suite"/"Ste" word at
        # all, just "#350" -- this must still be caught (see conversation
        # record: missing this caused a false address-match false positive)
        self.assertEqual(
            n.extract_unit_from_text("4601 Ponce de Leon Blvd #350, Coral Gables, FL 33146, USA"), "350")

    def test_bare_hash_matches_spelled_out_keyword_on_other_side(self):
        # "#106" (Google) and "Ste 106" / "SUITE 106" (SunBiz) must
        # normalize to the same value or a real address match is missed
        self.assertEqual(n.extract_unit_from_text("8585 Sunset Dr #106, Miami, FL 33143, USA"), "106")

    def test_empty(self):
        self.assertEqual(n.extract_unit_from_text(""), "")
        self.assertEqual(n.extract_unit_from_text(None), "")


class TestUnitCrossSourceConsistency(unittest.TestCase):
    """The whole point of reducing units to a bare identifier: SunBiz's
    keyword-spelled-out unit and Google's bare-hash unit for the same real
    suite must produce an equal string, or Phase 3 address-blocking silently
    fails to link them.
    """

    def test_suite_and_hash_agree(self):
        sunbiz = n.normalize_street_address("8585 Sunset Dr Ste 106", "")
        google = n.extract_unit_from_text("8585 Sunset Dr #106, Miami, FL 33143, USA")
        self.assertEqual(sunbiz["unit"], google)


class TestMailboxDetection(unittest.TestCase):
    def test_ups_store_detected(self):
        self.assertTrue(n.looks_like_mailbox_address("THE UPS STORE", ""))

    def test_pmb_detected(self):
        self.assertTrue(n.looks_like_mailbox_address("MAIN ST", "PMB 204"))

    def test_ordinary_address_not_flagged(self):
        self.assertFalse(n.looks_like_mailbox_address("ALMERIA AVE", "SUITE 302"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
