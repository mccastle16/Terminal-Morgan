"""Regression tests for parser.py's optimized (fast/slow-path) implementation.

Run from the `data/` directory:  python test_parser.py

Covers:
  - known ficdata "casualty" records (valid multibyte UTF-8 that the
    original pre-fix parser false-quarantined as length_mismatch)
  - genuinely corrupted ficdata records (invalid byte sequences that must
    still surface as U+FFFD, not crash or get silently dropped)
  - malformed/truncated cordata records (must still quarantine correctly)
  - _had_decode_replacement accounting (only set when a field actually
    needed a replacement, not just because a record took the slow path)
  - exact field-for-field equality between this optimized implementation and
    the previous (correct but slow) per-field-decode implementation, across
    a real sample of both cordata and ficdata records
"""
import importlib.util
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parser as optimized  # the live, optimized implementation

FICDATA_PATH = os.path.join("ficdata", "FICFILE.TXT")
CORDATA_PATH = os.path.join("cordata", "cordata0.txt")

# Known from manual investigation of FICFILE.TXT (see conversation record):
# valid multibyte UTF-8 (curly quote / NBSP) that the original whole-line
# decode-then-char-slice parser false-flagged as length_mismatch.
KNOWN_MULTIBYTE_CASUALTY_LINES = {19, 290, 367, 385, 416}

# Genuinely invalid byte sequences for UTF-8 -- a mix of raw single
# Windows-1252 bytes and apparent mojibake, not a consistent alternate
# encoding. These must still decode via errors='replace'.
# All fall inside fic_name (a modeled/extracted field) except 25622, whose
# bad byte sits at position 531 -- inside the unmodeled officer/agent gap
# between owner1_name_format (ends 456) and owner1_charter_number (starts
# 548) -- so it never touches a field we actually extract.
KNOWN_GENUINE_CORRUPTION_IN_FIC_NAME = {94707, 96924, 119924, 129581, 137420, 157692, 181809}
KNOWN_GENUINE_CORRUPTION_OUTSIDE_MODELED_FIELDS = {25622}
KNOWN_GENUINE_CORRUPTION_LINES = KNOWN_GENUINE_CORRUPTION_IN_FIC_NAME | KNOWN_GENUINE_CORRUPTION_OUTSIDE_MODELED_FIELDS


def _load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


SCRATCH_BENCH_DIR = os.environ.get(
    "PARSER_BENCH_DIR",
    r"C:\Users\mccas\AppData\Local\Temp\claude\c--Users-mccas-OneDrive-Documents-GitHub-Terminal"
    r"\5f7c509f-a871-4c03-914a-7c6c6b491a02\scratchpad\parser_bench",
)
current = _load_module("parser_current", os.path.join(SCRATCH_BENCH_DIR, "parser_current.py"))


def _lines_by_number(path, wanted, encoding="utf-8"):
    """Read specific 1-based line numbers out of a raw fixed-width file."""
    out = {}
    wanted = set(wanted)
    for raw, ln in optimized._iter_raw_lines(path, encoding):
        if ln in wanted:
            out[ln] = raw
            wanted.discard(ln)
        if not wanted:
            break
    return out


class TestKnownMultibyteCasualties(unittest.TestCase):
    """Valid UTF-8 multibyte content must parse OK, with the real character
    preserved -- these must NOT be flagged as needing a replacement.
    """

    @classmethod
    def setUpClass(cls):
        cls.layouts = optimized.load_layouts(force_reload=True)
        cls.lines = _lines_by_number(FICDATA_PATH, KNOWN_MULTIBYTE_CASUALTY_LINES)

    def test_all_target_lines_found(self):
        self.assertEqual(set(self.lines.keys()), KNOWN_MULTIBYTE_CASUALTY_LINES)

    def test_each_casualty_parses_ok_with_no_replacement(self):
        for ln, raw in self.lines.items():
            with self.subTest(line=ln):
                rec = optimized.parse_line(raw, "ficdata", source_file="FICFILE.TXT",
                                            line_number=ln, layouts=self.layouts)
                self.assertTrue(rec["_ok"], f"line {ln} should parse OK")
                self.assertFalse(rec["_had_decode_replacement"],
                                  f"line {ln} has valid (not corrupted) multibyte content")
                self.assertNotIn("�", rec["fic_name"])

    def test_specific_apostrophe_recovered(self):
        # line 19: "DEAN'S LUXURY & RENT A CAR" with a curly apostrophe (U+2019)
        rec = optimized.parse_line(self.lines[19], "ficdata", source_file="FICFILE.TXT",
                                    line_number=19, layouts=self.layouts)
        self.assertIn("’", rec["fic_name"])
        self.assertEqual(rec["doc_number"], "G23000076163")


class TestGenuineCorruption(unittest.TestCase):
    """Invalid byte sequences must still parse (record length is intact) but
    must be flagged via _had_decode_replacement, with U+FFFD in the affected
    field -- never a crash, never a silent full-record loss.
    """

    @classmethod
    def setUpClass(cls):
        cls.layouts = optimized.load_layouts(force_reload=True)
        cls.lines = _lines_by_number(FICDATA_PATH, KNOWN_GENUINE_CORRUPTION_LINES)

    def test_all_target_lines_found(self):
        self.assertEqual(set(self.lines.keys()), KNOWN_GENUINE_CORRUPTION_LINES)

    def test_corrupt_byte_in_modeled_field_is_flagged(self):
        for ln in KNOWN_GENUINE_CORRUPTION_IN_FIC_NAME:
            raw = self.lines[ln]
            with self.subTest(line=ln):
                rec = optimized.parse_line(raw, "ficdata", source_file="FICFILE.TXT",
                                            line_number=ln, layouts=self.layouts)
                self.assertEqual(len(raw), self.layouts["ficdata"]["record_length"],
                                  "these lines are byte-length-intact, not truncated")
                self.assertTrue(rec["_ok"], f"line {ln} should still parse (length is intact)")
                self.assertTrue(rec["_had_decode_replacement"],
                                 f"line {ln} has a genuinely invalid byte inside fic_name and must be flagged")
                self.assertIn("�", rec["fic_name"])

    def test_corrupt_byte_outside_modeled_fields_is_not_flagged(self):
        # 25622's bad byte sits in the unmodeled officer/agent gap (position
        # 531, between owner1_name_format and owner1_charter_number) -- we
        # never slice that range, so it correctly never surfaces as a
        # replacement in any field we extract. _raw (the full decoded line,
        # built with errors='replace' for display) does still show it.
        ln = 25622
        raw = self.lines[ln]
        rec = optimized.parse_line(raw, "ficdata", source_file="FICFILE.TXT",
                                    line_number=ln, layouts=self.layouts)
        self.assertTrue(rec["_ok"])
        self.assertFalse(rec["_had_decode_replacement"],
                          "the bad byte is outside every field we extract")
        self.assertIn("�", rec["_raw"], "the full-line display string still shows it")


class TestMalformedCordataRecords(unittest.TestCase):
    """Truncated / padded / invalid-byte records must still be caught."""

    @classmethod
    def setUpClass(cls):
        cls.layouts = optimized.load_layouts(force_reload=True)
        spec = cls.layouts["cordata"]
        cls.reclen = spec["record_length"]

        def build_line(values):
            buf = [" "] * cls.reclen
            for f in spec["fields"]:
                v = values.get(f["name"], "")
                s, e = f["start"] - 1, f["end"]
                v = v.ljust(e - s)[:e - s]
                buf[s:e] = list(v)
            return "".join(buf)

        cls.valid_values = {
            "doc_number": "X99999999TE", "name": "ZZTEST VALID RECORD LLC", "status": "A",
            "filing_type": "FLAL", "princ_zip": "33134", "princ_state": "FL",
        }
        cls.valid_line = build_line(cls.valid_values)

    def test_valid_line_parses_ok(self):
        rec = optimized.parse_line(self.valid_line.encode("ascii"), "cordata", layouts=self.layouts)
        self.assertTrue(rec["_ok"])
        self.assertEqual(rec["princ_zip"], "33134")
        self.assertFalse(rec["_had_decode_replacement"])

    def test_truncated_line_quarantined(self):
        truncated = self.valid_line[:-5].encode("ascii")
        rec = optimized.parse_line(truncated, "cordata", layouts=self.layouts)
        self.assertFalse(rec["_ok"])
        self.assertEqual(rec["_error"]["kind"], "length_mismatch")
        self.assertEqual(rec["_error"]["actual_length"], self.reclen - 5)

    def test_padded_line_quarantined(self):
        padded = (self.valid_line + "XXXXX").encode("ascii")
        rec = optimized.parse_line(padded, "cordata", layouts=self.layouts)
        self.assertFalse(rec["_ok"])
        self.assertEqual(rec["_error"]["kind"], "length_mismatch")
        self.assertEqual(rec["_error"]["actual_length"], self.reclen + 5)

    def test_invalid_byte_kept_with_replacement_not_quarantined(self):
        raw = bytearray(self.valid_line.encode("ascii"))
        raw[50] = 0xFF
        rec = optimized.parse_line(bytes(raw), "cordata", layouts=self.layouts)
        self.assertTrue(rec["_ok"], "record length is intact, so it should not be quarantined")
        self.assertTrue(rec["_had_decode_replacement"])
        self.assertIn("�", rec["name"])


class TestEqualityAgainstCurrentImplementation(unittest.TestCase):
    """The optimized implementation must produce byte-for-byte identical
    field values to the previous (slower, always-per-field-decode)
    implementation, across a real sample of both files.
    """

    def _compare_sample(self, path, file_type, sample_size):
        # Load layouts.json once from the real project path (via `optimized`,
        # which lives in data/) and hand the SAME dict to both
        # implementations -- `current` is a scratch-dir copy whose own
        # default LAYOUTS_PATH doesn't resolve there.
        layouts = optimized.load_layouts(force_reload=True)
        mismatches = []
        n = 0
        for raw, ln in optimized._iter_raw_lines(path, layouts[file_type]["encoding"]):
            n += 1
            rec_opt = optimized.parse_line(raw, file_type, source_file=os.path.basename(path),
                                            line_number=ln, layouts=layouts)
            rec_cur = current.parse_line(raw, file_type, source_file=os.path.basename(path),
                                          line_number=ln, layouts=layouts)
            keys = set(rec_opt) | set(rec_cur)
            for k in keys:
                if rec_opt.get(k) != rec_cur.get(k):
                    mismatches.append((ln, k, rec_opt.get(k), rec_cur.get(k)))
            if n >= sample_size:
                break
        return n, mismatches

    def test_ficdata_sample_matches(self):
        n, mismatches = self._compare_sample(FICDATA_PATH, "ficdata", sample_size=50000)
        self.assertGreaterEqual(n, 50000)
        self.assertEqual(mismatches, [], f"{len(mismatches)} field mismatches found, e.g. {mismatches[:5]}")

    def test_cordata_sample_matches(self):
        n, mismatches = self._compare_sample(CORDATA_PATH, "cordata", sample_size=50000)
        self.assertGreaterEqual(n, 50000)
        self.assertEqual(mismatches, [], f"{len(mismatches)} field mismatches found, e.g. {mismatches[:5]}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
