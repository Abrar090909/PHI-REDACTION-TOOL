"""
test_redactor.py — Unit tests for the PHI redaction engine.

Run from the backend/ directory:
    pytest tests/ -v
"""

import sys
import os

# Ensure the backend package is importable when run from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from redactor import redact, _merge_spans, _detect_spans, CHUNK_SIZE


# ---------------------------------------------------------------------------
# _merge_spans
# ---------------------------------------------------------------------------

class TestMergeSpans:
    def test_empty(self):
        assert _merge_spans([]) == []

    def test_single(self):
        assert _merge_spans([(0, 5, "NAME")]) == [(0, 5, "NAME")]

    def test_non_overlapping_sorted(self):
        spans = [(0, 4, "NAME"), (10, 15, "DATE")]
        assert _merge_spans(spans) == [(0, 4, "NAME"), (10, 15, "DATE")]

    def test_overlapping_dropped(self):
        spans = [(0, 10, "NAME"), (5, 15, "DATE")]
        merged = _merge_spans(spans)
        # overlap should be merged into one extended span
        assert len(merged) == 1
        assert merged[0][0] == 0
        assert merged[0][1] == 15

    def test_adjacent_kept_separate(self):
        spans = [(0, 5, "NAME"), (5, 10, "DATE")]
        merged = _merge_spans(spans)
        assert len(merged) == 2

    def test_unsorted_input(self):
        spans = [(10, 15, "DATE"), (0, 5, "NAME")]
        merged = _merge_spans(spans)
        assert merged[0][0] == 0
        assert merged[1][0] == 10


# ---------------------------------------------------------------------------
# redact() — basic
# ---------------------------------------------------------------------------

class TestRedactBasic:
    def test_empty_string(self):
        result = redact("")
        assert result["redacted"] == ""
        assert result["entities"] == []

    def test_no_phi(self):
        text = "The patient was stable and alert."
        result = redact(text)
        assert result["original"] == text
        # No PHI → redacted == original (or with 0 entities)
        assert result["entities"] == [] or result["redacted"] == text

    def test_output_keys(self):
        result = redact("hello")
        assert "original" in result
        assert "redacted" in result
        assert "entities" in result

    def test_entity_structure(self):
        result = redact("Call (555) 867-5309 for info.")
        for ent in result["entities"]:
            assert "start" in ent
            assert "end" in ent
            assert "label" in ent
            assert "text" in ent

    def test_offsets_within_bounds(self):
        text = "Patient Jane Doe born on 03/14/1962."
        result = redact(text)
        for ent in result["entities"]:
            assert 0 <= ent["start"] < len(text)
            assert ent["start"] < ent["end"] <= len(text)


# ---------------------------------------------------------------------------
# redact() — regex layer (deterministic, model-independent)
# ---------------------------------------------------------------------------

class TestRegexDetection:
    def test_phone_number(self):
        result = redact("Contact: (555) 867-5309.")
        labels = {e["label"] for e in result["entities"]}
        assert "PHONE" in labels

    def test_phone_dash_format(self):
        result = redact("Call 555-867-5309 today.")
        labels = {e["label"] for e in result["entities"]}
        assert "PHONE" in labels

    def test_ssn(self):
        result = redact("SSN: 123-45-6789")
        labels = {e["label"] for e in result["entities"]}
        assert "ID" in labels

    def test_mrn(self):
        result = redact("MRN: 78234910")
        labels = {e["label"] for e in result["entities"]}
        assert "ID" in labels

    def test_date_slash(self):
        result = redact("DOB: 03/14/1962")
        labels = {e["label"] for e in result["entities"]}
        assert "DATE" in labels

    def test_date_written(self):
        result = redact("Admitted January 5th, 2024.")
        labels = {e["label"] for e in result["entities"]}
        assert "DATE" in labels

    def test_age_90_plus(self):
        # "92yo" is unambiguous — regex catches it, spaCy won't classify it as DATE
        result = redact("She is a 92yo woman admitted for chest pain.")
        labels = {e["label"] for e in result["entities"]}
        assert "AGE" in labels

    def test_age_under_90_not_flagged(self):
        result = redact("She is 45 years old.")
        labels = {e["label"] for e in result["entities"]}
        assert "AGE" not in labels


# ---------------------------------------------------------------------------
# redact() — output correctness
# ---------------------------------------------------------------------------

class TestRedactedOutput:
    def test_phone_replaced(self):
        result = redact("Call (555) 867-5309.")
        assert "[PHONE]" in result["redacted"]
        assert "(555) 867-5309" not in result["redacted"]

    def test_date_replaced(self):
        result = redact("DOB: 03/14/1962")
        assert "[DATE]" in result["redacted"]

    def test_mrn_replaced(self):
        result = redact("MRN: 12345678")
        assert "[ID]" in result["redacted"]

    def test_original_unchanged(self):
        text = "Patient born on 01/01/1980."
        result = redact(text)
        assert result["original"] == text

    def test_redacted_shorter_or_equal_entity_count(self):
        """Redacted text should have fewer raw PHI tokens."""
        text = "Jane Doe, DOB 03/14/1962, MRN: 78234910. Call (555) 867-5309."
        result = redact(text)
        # At minimum the regex entities should be replaced
        assert "[DATE]" in result["redacted"] or "[ID]" in result["redacted"]


# ---------------------------------------------------------------------------
# redact() — chunking
# ---------------------------------------------------------------------------

class TestChunking:
    def test_large_document_processed(self):
        """Documents exceeding CHUNK_SIZE should still be fully processed."""
        # Build a document larger than CHUNK_SIZE with known PHI at the end
        filler = "The patient was stable. " * (CHUNK_SIZE // 24 + 1)
        phi    = " DOB: 03/14/1962. MRN: 12345678."
        text   = filler + phi
        assert len(text) > CHUNK_SIZE
        result = redact(text)
        assert "[DATE]" in result["redacted"] or "[ID]" in result["redacted"]

    def test_chunk_boundary_entity(self):
        """An entity that starts near a chunk boundary should not be lost."""
        # Place a phone number exactly at the CHUNK_SIZE boundary
        filler = "x" * (CHUNK_SIZE - 5)
        text   = filler + "(555) 867-5309"
        result = redact(text)
        assert "[PHONE]" in result["redacted"]

    def test_no_duplicate_entities(self):
        """Overlapping chunk windows must not produce duplicate spans."""
        filler = "a" * (CHUNK_SIZE - 10)
        text   = filler + "MRN: 99887766"
        result = redact(text)
        id_entities = [e for e in result["entities"] if e["label"] == "ID"]
        # Must never be duplicated — 0 or 1 matches, never 2+
        assert len(id_entities) <= 1
