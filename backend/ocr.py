"""
ocr.py — Image-to-text extraction using pytesseract (Tesseract OCR).
Also provides a simple quality heuristic to warn about low-confidence output.
"""

import io
import pytesseract
from PIL import Image


def extract_text(image_bytes: bytes) -> dict:
    """
    Extract text from an image file (JPEG, PNG, TIFF, etc.).

    Returns:
        {
          "text": str,          # raw OCR output
          "ocr_warning": bool   # True if output looks suspiciously short
        }
    """
    image = Image.open(io.BytesIO(image_bytes))

    # Convert to RGB if necessary (handles RGBA PNGs, grayscale, etc.)
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    raw_text = pytesseract.image_to_string(image, lang="eng")

    # Simple confidence heuristic:
    # If fewer than 50 non-whitespace characters were extracted
    # from an image with >100k pixels, OCR quality is suspect.
    pixel_count = image.width * image.height
    char_count = len(raw_text.strip().replace(" ", ""))
    ocr_warning = pixel_count > 100_000 and char_count < 50

    return {
        "text": raw_text.strip(),
        "ocr_warning": ocr_warning,
    }
