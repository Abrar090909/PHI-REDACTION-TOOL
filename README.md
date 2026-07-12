# MedRedact — Clinical PHI De-identification

> Automatically detect and redact Protected Health Information (PHI) from clinical notes and scanned documents. HIPAA Safe Harbor compliant.

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Tests](https://img.shields.io/badge/tests-40%20passed-brightgreen)

---

## Features

- **NER + Regex hybrid** — spaCy NER detects free-text names and locations; regex handles structured PHI (SSN, MRN, phone, dates)
- **Image OCR** — Tesseract-powered pipeline for scanned documents
- **Large document chunking** — 10 000-char sliding windows for notes of any size
- **Rate limiting** — 30 req/min text, 10 req/min image, per IP
- **HIPAA Safe Harbor** — redacts all 18 PHI identifier categories

---

## Architecture

```
PHI-deidentifier/
├── backend/
│   ├── main.py           # FastAPI app, rate limiting, size caps
│   ├── redactor.py       # NER + regex engine, chunked processing
│   ├── ocr.py            # Tesseract OCR wrapper
│   ├── tests/            # 40 unit + integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── vercel.json       # SPA routing for Vercel
├── railway.toml          # Railway deployment config
└── render.yaml           # Render deployment config (manual service)
```

---

## Local Development

### Backend

**Requirements:** Python 3.10+, [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed on your OS

```powershell
cd backend

# Create venv with Python 3.10
py -3.10 -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Download spaCy model (large — ~588 MB, best accuracy)
python -m spacy download en_core_web_lg

# Start server
uvicorn main:app --reload
```

Server runs at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173** (proxies `/redact` to the backend automatically)

### Run Tests

```bash
cd backend
.\venv\Scripts\pytest tests/ -v
```

---

## Deployment

### Backend → Railway (Free Tier)

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select this repository
4. Set **Root Directory** to `backend`
5. Railway auto-detects `railway.toml` and sets the start command
6. Add environment variable: `PORT` (Railway injects this automatically)
7. Copy your Railway public URL (e.g. `https://medredact-api.up.railway.app`)

> **Note:** Railway gives $5 free credit per month — enough for ~500 hours of runtime.

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **New Project → Import** → select this repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   VITE_API_URL = https://your-railway-app.up.railway.app
   ```
5. Click **Deploy**

Vercel auto-reads `frontend/vercel.json` for SPA routing.

---

## API Reference

### `GET /health`
Readiness probe.
```json
{ "status": "ok", "version": "1.1.0" }
```

### `POST /redact`
Redact PHI from plain text.
```json
// Request
{ "text": "Patient Jane Doe, DOB 03/14/1962, MRN: 78234910." }

// Response
{
  "original": "...",
  "redacted": "Patient [NAME], DOB [DATE], MRN: [ID].",
  "entities": [
    { "start": 8, "end": 16, "label": "NAME", "text": "Jane Doe" },
    ...
  ],
  "ocr_warning": false
}
```

**Rate limit:** 30 requests/min per IP  
**Size limit:** 500 KB

### `POST /redact-image`
Upload a JPEG/PNG/TIFF/WebP image. OCR extracts text, then PHI is redacted.

**Rate limit:** 10 requests/min per IP  
**Size limit:** 20 MB

---

## Entity Types

| Tag | Detected by | Example |
|-----|------------|---------|
| `[NAME]` | spaCy NER | Jane Doe |
| `[DATE]` | spaCy + regex | 03/14/1962 |
| `[LOCATION]` | spaCy NER | Springfield |
| `[HOSPITAL]` | spaCy NER | Springfield General |
| `[ID]` | regex | MRN: 78234910, SSN: 123-45-6789 |
| `[PHONE]` | regex | (555) 867-5309 |
| `[AGE]` | regex | 92yo |

---

## License

MIT
