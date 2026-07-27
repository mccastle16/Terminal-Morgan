"""Unit tests for phase5_confidence.py's four confidence dimensions.

Run from the `data/` directory:  python test_phase5_confidence.py
"""
import unittest

import phase5_confidence as p5


class TestMatchConfidence(unittest.TestCase):
    def test_max_score_is_full_confidence(self):
        score, reasons = p5.match_confidence(p5.MATCH_MAX_SCORE)
        self.assertEqual(score, 1.0)

    def test_zero_score_is_zero_confidence(self):
        score, reasons = p5.match_confidence(0)
        self.assertEqual(score, 0.0)

    def test_deterministic(self):
        self.assertEqual(p5.match_confidence(50), p5.match_confidence(50))


class TestEntityConfidence(unittest.TestCase):
    def test_plain_corp_active(self):
        score, reasons = p5.entity_confidence("sunbiz_corp", {"status": "A", "is_mailbox_or_agent": 0})
        self.assertIn("SUNBIZ_STATUS_ACTIVE", reasons)
        self.assertGreater(score, 0.5)

    def test_mailbox_or_agent_reduces_confidence(self):
        normal, _ = p5.entity_confidence("sunbiz_corp", {"status": "A", "is_mailbox_or_agent": 0})
        mailbox, reasons = p5.entity_confidence("sunbiz_corp", {"status": "A", "is_mailbox_or_agent": 1})
        self.assertLess(mailbox, normal)
        self.assertIn("MAILBOX_OR_AGENT_ADDRESS", reasons)

    def test_inactive_corp_status_reduces_confidence(self):
        active, _ = p5.entity_confidence("sunbiz_corp", {"status": "A", "is_mailbox_or_agent": 0})
        inactive, reasons = p5.entity_confidence("sunbiz_corp", {"status": "I", "is_mailbox_or_agent": 0})
        self.assertLess(inactive, active)
        self.assertIn("SUNBIZ_STATUS_INACTIVE_I", reasons)

    def test_fic_bridge_resolved_boosts_confidence(self):
        resolved, r1 = p5.entity_confidence(
            "sunbiz_fic", {"status": "A", "is_mailbox_or_agent": 0, "bridge_status": "resolved"})
        unresolved, r2 = p5.entity_confidence(
            "sunbiz_fic", {"status": "A", "is_mailbox_or_agent": 0, "bridge_status": "unresolved"})
        self.assertGreater(resolved, unresolved)
        self.assertIn("DBA_BRIDGE_RESOLVED", r1)
        self.assertIn("DBA_BRIDGE_UNRESOLVED", r2)

    def test_score_stays_in_bounds(self):
        score, _ = p5.entity_confidence("sunbiz_fic", {"status": "C", "is_mailbox_or_agent": 1,
                                                          "bridge_status": "unresolved"})
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)


class TestLocationConfidence(unittest.TestCase):
    def test_full_address_match_high_confidence(self):
        score, reasons = p5.location_confidence(
            ["ADDRESS_FULL_MATCH"], {"is_mailbox_or_agent": 0}, {"latitude": 25.7, "longitude": -80.2})
        self.assertGreater(score, 0.8)
        self.assertIn("ADDRESS_FULL_MATCH", reasons)
        self.assertIn("GOOGLE_GEOCODE_PRESENT", reasons)

    def test_no_address_match_low_confidence(self):
        score, reasons = p5.location_confidence(
            ["ADDRESS_NO_MATCH"], {"is_mailbox_or_agent": 0}, {"latitude": None, "longitude": None})
        self.assertLess(score, 0.3)
        self.assertIn("GOOGLE_GEOCODE_MISSING", reasons)

    def test_mailbox_reduces_even_full_address_match(self):
        normal, _ = p5.location_confidence(
            ["ADDRESS_FULL_MATCH"], {"is_mailbox_or_agent": 0}, {"latitude": 25.7, "longitude": -80.2})
        mailbox, reasons = p5.location_confidence(
            ["ADDRESS_FULL_MATCH"], {"is_mailbox_or_agent": 1}, {"latitude": 25.7, "longitude": -80.2})
        self.assertLess(mailbox, normal)
        self.assertIn("MAILBOX_OR_AGENT_ADDRESS", reasons)

    def test_address_tiers_are_monotonic(self):
        full, _ = p5.location_confidence(["ADDRESS_FULL_MATCH"], {"is_mailbox_or_agent": 0}, {})
        partial, _ = p5.location_confidence(
            ["ADDRESS_PARTIAL_MATCH_UNIT_DIFFERS"], {"is_mailbox_or_agent": 0}, {})
        street_only, _ = p5.location_confidence(
            ["STREET_NUMBER_ONLY_MATCH"], {"is_mailbox_or_agent": 0}, {})
        none_, _ = p5.location_confidence(["ADDRESS_NO_MATCH"], {"is_mailbox_or_agent": 0}, {})
        self.assertGreater(full, partial)
        self.assertGreater(partial, street_only)
        self.assertGreater(street_only, none_)


class TestOperationalConfidence(unittest.TestCase):
    def test_operational_and_active_high_confidence(self):
        score, reasons = p5.operational_confidence(
            {"business_status": "OPERATIONAL"}, "sunbiz_corp", {"status": "A"})
        self.assertGreater(score, 0.8)
        self.assertIn("GOOGLE_STATUS_OPERATIONAL", reasons)
        self.assertIn("SUNBIZ_STATUS_ACTIVE", reasons)

    def test_closed_permanently_low_confidence(self):
        score, reasons = p5.operational_confidence(
            {"business_status": "CLOSED_PERMANENTLY"}, "sunbiz_corp", {"status": "I"})
        self.assertLess(score, 0.2)
        self.assertIn("GOOGLE_STATUS_CLOSED_PERMANENTLY", reasons)
        self.assertIn("SUNBIZ_STATUS_INACTIVE_I", reasons)

    def test_conflicting_signals_middling_confidence(self):
        # Google says open, SunBiz says inactive -- a real, useful signal
        # that something is off (stale filing, wrong entity, dissolved but
        # still trading under the name, etc.), not high and not rock-bottom
        score, reasons = p5.operational_confidence(
            {"business_status": "OPERATIONAL"}, "sunbiz_corp", {"status": "I"})
        self.assertTrue(0.2 < score < 0.8)

    def test_score_stays_in_bounds(self):
        score, _ = p5.operational_confidence(
            {"business_status": "CLOSED_PERMANENTLY"}, "sunbiz_fic", {"status": "C"})
        self.assertGreaterEqual(score, 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
