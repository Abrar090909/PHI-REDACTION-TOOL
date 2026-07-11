"""
redactor.py — PHI entity detection using spaCy NER + regex fallback rules.

Supports chunked processing for large documents to keep memory usage bounded.
Returns entity spans with character offsets and a fully redacted string.
"""

from __future__ import annotations

import re
import logging
from typing import List, Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SPACY_LABEL_MAP: Dict[str, str] = {
    "PERSON":  "NAME",
    "GPE":     "LOCATION",
    "LOC":     "LOCATION",
    "ORG":     "HOSPITAL",
    "DATE":    "DATE",
    "TIME":    "DATE",
    "FAC":     "LOCATION",
}

PHI_TAGS: Dict[str, str] = {
    "NAME":     "[NAME]",
    "DATE":     "[DATE]",
    "LOCATION": "[LOCATION]",
    "HOSPITAL": "[HOSPITAL]",
    "ID":       "[ID]",
    "PHONE":    "[PHONE]",
    "AGE":      "[AGE]",
}

# Large-document chunking: 10 000-char windows with 200-char overlap so
# entities that straddle a boundary are still caught.
CHUNK_SIZE    = 10_000
CHUNK_OVERLAP = 200

# ---------------------------------------------------------------------------
# Regex patterns (compiled once at import time)
# ---------------------------------------------------------------------------

_RAW_PATTERNS: List[Tuple[str, str]] = [
    # SSN: 123-45-6789
    (r"\b\d{3}[-\s]\d{2}[-\s]\d{4}\b",                                    "ID"),
    # MRN / medical record numbers
    (r"\bMRN[:\s#]*\d{4,10}\b",                                            "ID"),
    (r"\b(?:MR|PT|PAT)[.\-]?\d{5,10}\b",                                  "ID"),
    # Phone numbers
    (r"\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b",            "PHONE"),
    # Ages >= 90 (HIPAA Safe Harbor)
    (r"\b(9\d|1[01]\d|120)\s*[-\s]?(?:year[s]?[-\s]?(?:old|of age)|y/?o)\b",       "AGE"),
    # Dates: MM/DD/YYYY or MM-DD-YYYY
    (
        r"\b(?:0?[1-9]|1[0-2])[/\-](?:0?[1-9]|[12]\d|3[01])[/\-](?:19|20)\d{2}\b",
        "DATE",
    ),
    # Dates: Month DD, YYYY
    (
        r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
        r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b",
        "DATE",
    ),
]

COMPILED_PATTERNS = [
    (re.compile(pat, re.IGNORECASE), label)
    for pat, label in _RAW_PATTERNS
]

# ---------------------------------------------------------------------------
# spaCy model — loaded once at module level, falls back gracefully
# ---------------------------------------------------------------------------

def _load_nlp() -> Optional[Any]:
    for model_name in ("en_core_web_lg", "en_core_web_sm"):
        try:
            import spacy  # noqa: PLC0415
            model = spacy.load(model_name)
            logger.info("Loaded spaCy model: %s", model_name)
            return model
        except OSError:
            continue
    logger.warning("No spaCy model found — NER disabled, regex-only mode active")
    return None


nlp = _load_nlp()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _merge_spans(
    spans: List[Tuple[int, int, str]],
) -> List[Tuple[int, int, str]]:
    """Sort by start offset and drop/merge any overlapping spans."""
    if not spans:
        return []
    sorted_spans = sorted(spans, key=lambda s: s[0])
    merged: List[Tuple[int, int, str]] = [sorted_spans[0]]
    for start, end, label in sorted_spans[1:]:
        prev_start, prev_end, prev_label = merged[-1]
        if start >= prev_end:
            merged.append((start, end, label))
        elif end > prev_end:
            # Extend previous span to cover the overlap
            merged[-1] = (prev_start, end, prev_label)
    return merged


def _detect_spans(text: str) -> List[Tuple[int, int, str]]:
    """Run NER + regex on a single text fragment."""
    spans: List[Tuple[int, int, str]] = []

    if nlp is not None:
        doc = nlp(text)
        for ent in doc.ents:
            phi_label = SPACY_LABEL_MAP.get(ent.label_)
            if phi_label:
                spans.append((ent.start_char, ent.end_char, phi_label))

    for pattern, label in COMPILED_PATTERNS:
        for m in pattern.finditer(text):
            spans.append((m.start(), m.end(), label))

    return spans


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def redact(text: str) -> Dict[str, Any]:
    """
    Detect and redact PHI in *text*.

    For documents longer than CHUNK_SIZE characters the text is processed in
    overlapping windows so spaCy never sees a document that exceeds its
    internal token limits. Character offsets are corrected back to the
    original document coordinate space before merging.

    Returns
    -------
    {
        "original": str,
        "redacted": str,
        "entities": [{"start", "end", "label", "text"}, ...]
    }
    """
    if not text:
        return {"original": text, "redacted": text, "entities": []}

    all_spans: List[Tuple[int, int, str]] = []

    if len(text) <= CHUNK_SIZE:
        all_spans = _detect_spans(text)
    else:
        seen: set = set()
        offset = 0
        while offset < len(text):
            chunk = text[offset: offset + CHUNK_SIZE]
            for start, end, label in _detect_spans(chunk):
                abs_start = offset + start
                abs_end   = offset + end
                key = (abs_start, abs_end)
                if key not in seen:
                    seen.add(key)
                    all_spans.append((abs_start, abs_end, label))
            if offset + CHUNK_SIZE >= len(text):
                break
            offset += CHUNK_SIZE - CHUNK_OVERLAP

    clean_spans = _merge_spans(all_spans)

    entities = [
        {"start": s, "end": e, "label": lbl, "text": text[s:e]}
        for s, e, lbl in clean_spans
    ]

    chars = list(text)
    for s, e, lbl in reversed(clean_spans):
        chars[s:e] = list(PHI_TAGS.get(lbl, f"[{lbl}]"))

    return {
        "original": text,
        "redacted":  "".join(chars),
        "entities":  entities,
    }
