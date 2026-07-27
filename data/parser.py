"""Fixed-width parser for Florida SunBiz cordata / ficdata extracts.

Layout is driven entirely by ./config/layouts.json (official Division of
Corporations field positions). Nothing here is hardcoded per-field; add or
adjust fields by editing the config, not this file.
"""
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
LAYOUTS_PATH = os.path.join(_HERE, "config", "layouts.json")

_layouts_cache = None


def load_layouts(path=LAYOUTS_PATH, force_reload=False):
    global _layouts_cache
    if _layouts_cache is None or force_reload:
        with open(path, "r", encoding="utf-8") as f:
            _layouts_cache = json.load(f)
    return _layouts_cache


def parse_line(raw_bytes, file_type, source_file=None, line_number=None, layouts=None, encoding=None):
    """Parse one raw fixed-width line (CRLF/newline already stripped) into a dict.

    Takes the line as raw BYTES, not a decoded string. `record_length` and each
    field's start/end in layouts.json are byte offsets (that's what a
    fixed-width mainframe-style extract actually guarantees), so length is
    always checked in bytes, never in decoded characters.

    Field extraction takes one of two paths:

    FAST PATH (the common case): decode the whole record once, strictly. If
    that succeeds AND the decoded character count equals the byte count, then
    every byte in this record mapped to exactly one character -- true for
    cordata (confirmed pure 7-bit ASCII across the full corpus: a strict
    whole-shard decode raises nowhere), and true for the large majority of
    ficdata records too, since most contain no multibyte character at all
    even though the file is declared utf-8. When that holds, byte offset N
    equals character offset N for every field, so slicing the ALREADY-DECODED
    string at the layout's byte positions is mathematically identical to
    decoding each field separately -- ASCII bytes decode independently of
    context, so a substring of an all-ASCII decode equals decoding that same
    byte range on its own. This turns ~19 decode() calls into 1.

    SLOW PATH (fallback, rare): the whole-record decode failed, or came back
    shorter than record_length -- meaning some byte range genuinely needs
    multibyte decoding (e.g. a name with a curly quote or NBSP) or contains a
    byte sequence invalid in the declared encoding (observed in ficdata as a
    small number of corrupted records: stray Windows-1252 bytes, mojibake --
    not a consistent alternate encoding, so there's no single-decode fix for
    these). Only here do we slice raw bytes per field and decode each slice
    independently with errors='replace', so an invalid field degrades to a
    U+FFFD placeholder instead of failing the whole record.
    `_had_decode_replacement` flags records that took this path and actually
    needed a replacement, so it stays visible without being dropped or
    quarantined.

    Both paths produce byte-for-byte identical field values whenever the fast
    path is valid to take (that's the point) -- the fast path is a speed
    optimization, not a behavior change.

    Always returns a dict, never raises on a bad line. On length mismatch the
    dict carries `_ok: False` and a structured `_error` instead of field data.
    """
    layouts = layouts or load_layouts()
    spec = layouts[file_type]
    expected_len = spec["record_length"]
    enc = encoding or spec.get("encoding", "ascii")

    record = {
        "_source_file": source_file,
        "_line_number": line_number,
        "_file_type": file_type,
    }

    actual_len = len(raw_bytes)
    if actual_len != expected_len:
        record["_raw"] = raw_bytes.decode(enc, errors="replace")
        record["_ok"] = False
        record["_error"] = {
            "kind": "length_mismatch",
            "expected_length": expected_len,
            "actual_length": actual_len,
        }
        return record

    record["_ok"] = True

    try:
        decoded = raw_bytes.decode(enc)
        fast_path = len(decoded) == expected_len
    except UnicodeDecodeError:
        decoded = None
        fast_path = False

    if fast_path:
        record["_raw"] = decoded
        record["_had_decode_replacement"] = False
        for field in spec["fields"]:
            record[field["name"]] = decoded[field["start"] - 1:field["end"]].strip()
        return record

    record["_raw"] = raw_bytes.decode(enc, errors="replace")
    had_replacement = False
    for field in spec["fields"]:
        raw = raw_bytes[field["start"] - 1:field["end"]]
        value = raw.decode(enc, errors="replace").strip()
        if "�" in value:
            had_replacement = True
        record[field["name"]] = value
    record["_had_decode_replacement"] = had_replacement
    return record


def _iter_raw_lines(path, encoding):
    """Stream (raw_bytes_line, line_number) pairs split on CRLF, reading in
    binary mode with buffered chunks. Splitting on b'\\r\\n' at the byte level
    is safe even for UTF-8 text: 0x0D/0x0A never occur as lead or continuation
    bytes of a multibyte UTF-8 sequence, so this works regardless of where in
    the file we start reading.
    """
    with open(path, "rb") as f:
        buf = b""
        line_number = 0
        while True:
            chunk = f.read(1 << 20)
            if not chunk:
                break
            buf += chunk
            while True:
                idx = buf.find(b"\r\n")
                if idx == -1:
                    break
                raw = buf[:idx]
                buf = buf[idx + 2:]
                line_number += 1
                yield raw, line_number
        if buf:
            line_number += 1
            yield buf, line_number


def iter_records(path, file_type, layouts=None, encoding=None, start_after_byte=0):
    """Stream-parse a raw SunBiz file, yielding one parsed record dict per line.

    Raw bytes go straight to parse_line, which checks length and slices
    fields in bytes and decodes per-field (see its docstring) -- there is no
    whole-line decode here, so there is no separate decode-error path at this
    level; a field with invalid bytes for its encoding surfaces as a U+FFFD
    placeholder (see `_had_decode_replacement`) rather than failing the read.
    `start_after_byte`, if given, seeks there first and discards the (likely
    partial) line straddling the seek point before resuming -- lets callers
    sample from an arbitrary offset in a huge file without reading from 0.
    """
    layouts = layouts or load_layouts()
    fname = os.path.basename(path)

    if start_after_byte <= 0:
        gen = _iter_raw_lines(path, encoding)
    else:
        gen = _iter_raw_lines_from(path, start_after_byte)

    for raw_bytes, line_number in gen:
        yield parse_line(raw_bytes, file_type, source_file=fname, line_number=line_number,
                          layouts=layouts, encoding=encoding)


def _iter_raw_lines_from(path, start_byte):
    """Like _iter_raw_lines but seeks to start_byte first and discards the
    partial line it lands in the middle of. Line numbers are relative to this
    resync point (1-based from the first *complete* line found), not the true
    file line number -- callers that need exact numbers should read from 0.
    """
    with open(path, "rb") as f:
        f.seek(start_byte)
        buf = f.read(1 << 20)
        idx = buf.find(b"\r\n")
        while idx == -1 and buf:
            more = f.read(1 << 20)
            if not more:
                buf = b""
                break
            buf += more
            idx = buf.find(b"\r\n")
        if not buf:
            return
        buf = buf[idx + 2:]
        line_number = 0
        while True:
            while True:
                idx = buf.find(b"\r\n")
                if idx == -1:
                    break
                raw = buf[:idx]
                buf = buf[idx + 2:]
                line_number += 1
                yield raw, line_number
            chunk = f.read(1 << 20)
            if not chunk:
                if buf:
                    line_number += 1
                    yield buf, line_number
                break
            buf += chunk
