# ── Stage 1: build deps ────────────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build tools needed for some spaCy native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download spaCy model into site-packages so it carries over
RUN python -m spacy download en_core_web_sm


# ── Stage 2: runtime ───────────────────────────────────────────────────────
FROM python:3.10-slim

# HuggingFace Spaces runs as user 1000 — create it early
RUN useradd -m -u 1000 appuser

# Tesseract OCR (for the /redact-image endpoint)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages + spaCy model from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages \
                    /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY . .

# HuggingFace Spaces exposes port 7860
ENV PORT=7860

# Drop to non-root user (HF Spaces requirement)
USER appuser

EXPOSE 7860

# 2 workers — HF CPU Spaces has 2 vCPUs on free tier
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "2"]
