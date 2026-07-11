# MedRedact — Automated PHI De-identification for Clinical Notes

> **HIPAA Safe Harbor compliant** · NER + regex redaction · Text & image input · Vercel-style UI

![MedRedact](https://img.shields.io/badge/HIPAA-Safe%20Harbor-4dabf7?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.10+-69db7c?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-38d9a9?style=flat-square)
![React](https://img.shields.io/badge/React-Vite-ffa94d?style=flat-square)

---

## What it does

MedRedact takes raw unstructured clinical notes — either pasted text or a scanned/photographed image — and automatically detects and redacts **Protected Health Information (PHI)**:

| Entity | Example | Tag |
|--------|---------|-----|
| Names | `Jane Doe` | `[NAME]` |
| Dates | `January 5, 2024` | `[DATE]` |
| Locations | `Springfield` | `[LOCATION]` |
| Hospital names | `General Hospital` | `[HOSPITAL]` |
| MRNs / SSNs | `MRN: 78234910` | `[ID]` |
| Phone numbers | `(555) 867-5309` | `[PHONE]` |
| Ages ≥ 90 | `91-year-old` | `[AGE]` |

---

## Architecture

```
Browser → React (Vite) → FastAPI → spaCy NER + Regex → Response
                                 ↳ Tesseract OCR (image input only)
```

- **NER**: spaCy `en_core_web_lg` — handles free-text names, locations, organisations, dates
- **Regex fallback**: catches structured PHI (SSN, MRN, phone, formatted dates) that NER may miss
- **OCR**: `pytesseract` wraps Tesseract for image → text extraction; includes a quality confidence heuristic

---

## Prerequisites

### Tesseract OCR (required for image input)

| Platform | Command |
|----------|---------|
| Windows | Download installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) |
| macOS | `brew install tesseract` |
| Ubuntu/Debian | `sudo apt install tesseract-ocr` |

After installing, verify: `tesseract --version`

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_lg

# Start the API server
uvicorn main:app --reload
# → Running at http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → Running at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## API Reference

### `POST /redact`

Redact PHI from plain text.

**Request:**
```json
{ "text": "Patient Jane Doe, DOB 03/14/1962, MRN: 78234910..." }
```

**Response:**
```json
{
  "original": "Patient Jane Doe, DOB 03/14/1962...",
  "redacted": "Patient [NAME], DOB [DATE]...",
  "entities": [
    { "start": 8, "end": 16, "label": "NAME", "text": "Jane Doe" },
    { "start": 22, "end": 32, "label": "DATE", "text": "03/14/1962" }
  ],
  "ocr_warning": false
}
```

### `POST /redact-image`

Upload an image (JPEG/PNG/TIFF/WebP). OCR extracts text, then redaction runs on that text.

**Request:** `multipart/form-data` with field `file`

**Response:** Same schema as `/redact`, with `ocr_warning: true` if OCR output looks low-quality.

---

## Design Decisions

### Why NER + Regex (not just regex)?
Regex reliably catches **structured** PHI (phone numbers, SSNs, dates in `MM/DD/YYYY`). But free-text names and location references in clinical language require a model that understands context — that's where spaCy NER comes in. The two layers are complementary, not redundant.

### Why recall > precision?
In de-identification, **missing a real name is a compliance risk**; over-redacting a common word is just an inconvenience. The system is tuned to over-redact rather than under-redact.

### Why OCR as a separate stage?
OCR errors and NER errors are independent failure modes. An OCR misread can't be fixed by any NER model. By keeping them separate, you can report OCR word error rate and NER F1 independently — and explain to reviewers exactly where failures originate.

---

## Folder Structure

```
PHI-deidentifier/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── redactor.py      # spaCy NER + regex engine
│   ├── ocr.py           # pytesseract OCR wrapper
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css    # Vercel-inspired design system
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── ModeToggle.jsx
│   │       ├── NoteInput.jsx
│   │       ├── ImageUploader.jsx
│   │       ├── RedactedView.jsx
│   │       ├── EntityLegend.jsx
│   │       └── EntitySummary.jsx
│   └── vite.config.js
└── README.md
```

---

## Known Limitations

- **Handwritten notes**: OCR accuracy drops significantly on genuine handwriting. Printed/typed scans work well.
- **Ambiguous entities**: Surnames that are also common English words may be missed by general-purpose NER. A clinical NER model (`obi/deid_roberta_i2b2`) would improve accuracy.
- **Batch processing**: Not supported in MVP — one note at a time. Mentioned as future work.

---

## Future Work

- Fine-tune on i2b2 2014 de-identification dataset for higher F1
- Swap `en_core_web_lg` for `obi/deid_roberta_i2b2` for clinical-domain NER
- Add EasyOCR as an alternative OCR backend for better handwriting support
- Batch processing mode
- Evaluation notebook (precision/recall/F1 per entity type)
