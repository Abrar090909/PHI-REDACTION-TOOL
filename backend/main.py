"""
main.py — FastAPI application for MedRedact PHI de-identification.

Endpoints
---------
GET  /health          — health check / readiness probe
POST /redact          — redact a plain-text clinical note
POST /redact-image    — OCR an image then redact the extracted text
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, field_validator

from redactor import redact
from ocr import extract_text

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MedRedact API starting up — version %s", app.version)
    yield
    logger.info("MedRedact API shutting down.")


app = FastAPI(
    title="MedRedact API",
    description="Automated PHI de-identification for clinical notes.",
    version="1.1.0",
    lifespan=lifespan,
)

# Compress responses larger than 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Rate limiting (in-process, no Redis required)
# Per-IP sliding window stored in memory — sufficient for single-instance deploy.
# ---------------------------------------------------------------------------
import time
from collections import defaultdict

_request_log: dict = defaultdict(list)
_RATE_LIMITS = {
    "/redact":       (30, 60),   # 30 req per 60 s
    "/redact-image": (10, 60),   # 10 req per 60 s
}


def _check_rate_limit(ip: str, path: str) -> None:
    if path not in _RATE_LIMITS:
        return
    limit, window = _RATE_LIMITS[path]
    now = time.monotonic()
    key = (ip, path)
    timestamps = [t for t in _request_log[key] if now - t < window]
    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {limit} requests per {window}s. Try again later.",
        )
    timestamps.append(now)
    _request_log[key] = timestamps


# ---------------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------------
MAX_TEXT_BYTES  = 500_000          # 500 KB text cap
MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB image cap


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RedactRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def check_size(cls, v: str) -> str:
        if len(v.encode()) > MAX_TEXT_BYTES:
            raise ValueError(
                f"Input text exceeds the {MAX_TEXT_BYTES // 1000} KB limit. "
                "Split your document into smaller chunks."
            )
        return v


class EntityItem(BaseModel):
    start: int
    end:   int
    label: str
    text:  str


class RedactResponse(BaseModel):
    original:    str
    redacted:    str
    entities:    list[EntityItem]
    ocr_warning: bool = False


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["ops"])
def health():
    """Readiness probe — used by Render and uptime monitors."""
    return {"status": "ok", "version": app.version}


@app.post("/redact", response_model=RedactResponse, tags=["redaction"])
def redact_text(request: Request, body: RedactRequest):
    """Redact PHI from a plain-text clinical note."""
    _check_rate_limit(request.client.host if request.client else "test", "/redact")
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text body is empty.")
    result = redact(body.text)
    return RedactResponse(**result)


@app.post("/redact-image", response_model=RedactResponse, tags=["redaction"])
async def redact_image(request: Request, file: UploadFile = File(...)):
    """
    Accept an image (JPEG / PNG / TIFF / WebP), run OCR to extract text,
    then redact PHI from the extracted text.
    """
    _check_rate_limit(
        request.client.host if request.client else "test", "/redact-image"
    )
    allowed = {"image/jpeg", "image/png", "image/tiff", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Accepted: JPEG, PNG, TIFF, WebP."
            ),
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 20 MB limit.")

    ocr_result = extract_text(image_bytes)
    extracted  = ocr_result["text"]

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail=(
                "OCR extracted no text from the image. "
                "Check image quality or try a clearer scan."
            ),
        )

    result = redact(extracted)
    return RedactResponse(**result, ocr_warning=ocr_result["ocr_warning"])
