"""
test_api.py — Integration tests for the FastAPI endpoints.

Run from the backend/ directory:
    pytest tests/ -v
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "version" in data


# ---------------------------------------------------------------------------
# POST /redact — text endpoint
# ---------------------------------------------------------------------------

class TestRedactText:
    def test_basic_redaction(self):
        payload = {"text": "Patient Jane Doe, DOB 03/14/1962, MRN: 78234910."}
        r = client.post("/redact", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "original" in data
        assert "redacted" in data
        assert "entities" in data
        assert isinstance(data["entities"], list)

    def test_entities_have_required_fields(self):
        payload = {"text": "Call (555) 867-5309 for appointment."}
        r = client.post("/redact", json=payload)
        assert r.status_code == 200
        for ent in r.json()["entities"]:
            assert "start" in ent
            assert "end" in ent
            assert "label" in ent
            assert "text" in ent

    def test_phi_replaced_in_redacted(self):
        payload = {"text": "DOB: 03/14/1962"}
        r = client.post("/redact", json=payload)
        assert r.status_code == 200
        assert "[DATE]" in r.json()["redacted"]

    def test_empty_text_returns_400(self):
        r = client.post("/redact", json={"text": "   "})
        assert r.status_code == 400

    def test_missing_text_field_returns_422(self):
        r = client.post("/redact", json={})
        assert r.status_code == 422

    def test_oversized_text_returns_422(self):
        big = "A" * 600_000
        r = client.post("/redact", json={"text": big})
        assert r.status_code == 422

    def test_no_phi_text(self):
        payload = {"text": "The weather today is sunny and warm."}
        r = client.post("/redact", json=payload)
        assert r.status_code == 200
        assert r.json()["original"] == payload["text"]

    def test_ocr_warning_false_for_text_endpoint(self):
        r = client.post("/redact", json={"text": "MRN: 12345678"})
        assert r.status_code == 200
        assert r.json()["ocr_warning"] is False

    def test_multiple_entity_types(self):
        text = "Jane Doe, DOB 03/14/1962, MRN: 78234910, call (555) 867-5309."
        r = client.post("/redact", json={"text": text})
        assert r.status_code == 200
        labels = {e["label"] for e in r.json()["entities"]}
        # Regex layer guarantees at minimum DATE, ID, PHONE
        assert labels & {"DATE", "ID", "PHONE"}


# ---------------------------------------------------------------------------
# POST /redact-image — image endpoint (content-type / size validation only;
# real OCR is not tested in CI since Tesseract may not be installed)
# ---------------------------------------------------------------------------

class TestRedactImage:
    def test_wrong_content_type_returns_415(self):
        r = client.post(
            "/redact-image",
            files={"file": ("note.txt", b"hello world", "text/plain")},
        )
        assert r.status_code == 415

    def test_oversized_image_returns_413(self):
        big_bytes = b"\xff\xd8\xff" + b"0" * (21 * 1024 * 1024)
        r = client.post(
            "/redact-image",
            files={"file": ("note.jpg", big_bytes, "image/jpeg")},
        )
        assert r.status_code == 413

    def test_missing_file_returns_422(self):
        r = client.post("/redact-image")
        assert r.status_code == 422
