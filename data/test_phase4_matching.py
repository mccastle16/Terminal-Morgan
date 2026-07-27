"""Unit tests for phase4_matching.py's scoring function.

Run from the `data/` directory:  python test_phase4_matching.py
"""
import unittest

import phase4_matching as m

PLACE = dict(name_core="GROVE BANK", name_tokens="GROVE",
             street_number_norm="2701", street_norm="S BAYSHORE DR", unit_norm="", zip5="33133")


def sunbiz(**overrides):
    base = dict(name_core="GROVE BANK", name_tokens="GROVE",
                street_number_norm="2701", street_norm="S BAYSHORE DR", unit_norm="",
                zip5="33133", is_mailbox_or_agent=0)
    base.update(overrides)
    return base


class TestScoreCandidate(unittest.TestCase):
    def test_perfect_match_is_likely_match(self):
        total, cls, reasons, comp = m.score_candidate(PLACE, sunbiz())
        self.assertEqual(cls, "LIKELY_MATCH")
        self.assertIn("NAME_SIM_HIGH", reasons)
        self.assertIn("ADDRESS_FULL_MATCH", reasons)
        self.assertIn("ZIP_MATCH", reasons)
        self.assertIn("PHONE_NOT_AVAILABLE", reasons)
        self.assertIn("WEBSITE_NOT_AVAILABLE", reasons)

    def test_deterministic_same_inputs_same_output(self):
        r1 = m.score_candidate(PLACE, sunbiz())
        r2 = m.score_candidate(PLACE, sunbiz())
        self.assertEqual(r1, r2)

    def test_unrelated_name_and_address_is_no_match(self):
        place = dict(PLACE, name_core="XYZ NAILS SALON", name_tokens="NAILS SALON",
                     street_number_norm="999", street_norm="ELSEWHERE AVE")
        total, cls, reasons, comp = m.score_candidate(place, sunbiz())
        self.assertEqual(cls, "NO_MATCH")
        self.assertLess(comp["name_sim_ratio"], 0.6)
        self.assertIn("ADDRESS_NO_MATCH", reasons)

    def test_address_only_match_at_mailbox_agent_is_weak(self):
        # same real-world scenario found in Phase 3: address matches but
        # name is unrelated, and the SunBiz record is a flagged
        # registered-agent address -- should score much lower than a
        # non-mailbox address match with the same name mismatch
        place = dict(PLACE, name_core="MARIANNA PEREZ REALTOR", name_tokens="MARIANNA PEREZ REALTOR")
        normal_addr = m.score_candidate(place, sunbiz(is_mailbox_or_agent=0))
        mailbox_addr = m.score_candidate(place, sunbiz(is_mailbox_or_agent=1))
        self.assertLess(mailbox_addr[0], normal_addr[0])
        self.assertIn("MAILBOX_OR_AGENT_ADDRESS", mailbox_addr[2])
        self.assertEqual(mailbox_addr[1], "NO_MATCH")

    def test_unit_mismatch_is_partial_not_full_address_match(self):
        place = dict(PLACE, unit_norm="106")
        total, cls, reasons, comp = m.score_candidate(place, sunbiz(unit_norm="205"))
        self.assertIn("ADDRESS_PARTIAL_MATCH_UNIT_DIFFERS", reasons)
        self.assertNotIn("ADDRESS_FULL_MATCH", reasons)

    def test_token_overlap_only_no_address_scores_lower_than_full_match(self):
        place = dict(PLACE, street_number_norm="1", street_norm="OTHER ST")
        total, cls, reasons, comp = m.score_candidate(place, sunbiz())
        full_total, _, _, _ = m.score_candidate(PLACE, sunbiz())
        self.assertLess(total, full_total)
        self.assertIn("ADDRESS_NO_MATCH", reasons)

    def test_empty_names_do_not_crash(self):
        place = dict(PLACE, name_core="", name_tokens="")
        total, cls, reasons, comp = m.score_candidate(place, sunbiz(name_core="", name_tokens=""))
        self.assertIn("NAME_SIM_NONE", reasons)
        self.assertEqual(comp["name_sim_ratio"], 0.0)

    def test_zip_mismatch_recorded(self):
        place = dict(PLACE, zip5="99999")
        total, cls, reasons, comp = m.score_candidate(place, sunbiz())
        self.assertIn("ZIP_MISMATCH", reasons)
        self.assertEqual(comp["zip_points"], 0.0)

    def test_classification_thresholds_are_monotonic(self):
        # a strictly worse candidate (name similarity degraded) should never
        # classify as strictly better
        good = dict(PLACE, name_core="GROVE BANK")
        worse = dict(PLACE, name_core="COMPLETELY DIFFERENT BUSINESS NAME HERE")
        order = {"NO_MATCH": 0, "AMBIGUOUS": 1, "LIKELY_MATCH": 2}
        _, good_cls, _, _ = m.score_candidate(good, sunbiz())
        _, worse_cls, _, _ = m.score_candidate(worse, sunbiz())
        self.assertGreaterEqual(order[good_cls], order[worse_cls])


if __name__ == "__main__":
    unittest.main(verbosity=2)
