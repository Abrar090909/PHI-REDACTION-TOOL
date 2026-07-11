import { useState } from 'react'
import Header from './components/Header'
import ModeToggle from './components/ModeToggle'
import NoteInput from './components/NoteInput'
import ImageUploader from './components/ImageUploader'
import RedactedView from './components/RedactedView'
import EntitySummary from './components/EntitySummary'
import EntityLegend from './components/EntityLegend'

// In production VITE_API_URL is set to the Render backend URL.
// In dev it is empty so Vite's proxy forwards to localhost:8000.
const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [mode, setMode] = useState('text')
  const [inputText, setInputText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleModeChange(newMode) {
    setMode(newMode)
    setResult(null)
    setError(null)
  }

  async function handleRedact() {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      let response

      if (mode === 'text') {
        if (!inputText.trim()) {
          setError('Please enter some text before redacting.')
          setLoading(false)
          return
        }
        response = await fetch(`${API_BASE}/redact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText }),
        })
      } else {
        if (!imageFile) {
          setError('Please upload an image before redacting.')
          setLoading(false)
          return
        }
        const formData = new FormData()
        formData.append('file', imageFile)
        response = await fetch(`${API_BASE}/redact-image`, {
          method: 'POST',
          body: formData,
        })
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `Server error (${response.status})`)
      }

      const data = await response.json()
      setResult(data)

      setTimeout(() => {
        document.getElementById('results-anchor')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(
          'Cannot connect to the backend. Make sure the FastAPI server is running.\n' +
          'Run: cd backend && .\\venv\\Scripts\\uvicorn.exe main:app --reload'
        )
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const canRedact = mode === 'text' ? inputText.trim().length > 0 : imageFile !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      <main className="main-content">
        <div className="page-wrapper">

          {/* Hero */}
          <div className="hero">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              HIPAA Safe Harbor Compliant
            </div>
            <h1>
              De-identify Clinical Notes <br />
              <span className="hero-gradient">Instantly & Accurately</span>
            </h1>
            <p className="hero-sub">
              Paste a clinical note or upload a scanned image. MedRedact uses NER + regex rules
              to detect and redact names, dates, locations, IDs, and phone numbers.
            </p>
          </div>

          {/* Entity Legend */}
          <EntityLegend />

          {/* Mode Toggle */}
          <ModeToggle mode={mode} onChange={handleModeChange} />

          {/* Input Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">
                {mode === 'text' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
                      <path d="M0 0h1v15h15v1H0V0zm14.854 5.146a.5.5 0 0 0-.707 0L7 12.293 4.854 10.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l7.5-7.5a.5.5 0 0 0 0-.708z"/>
                    </svg>
                    Clinical Note Text
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
                      <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                      <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
                    </svg>
                    Image / Scan Upload
                  </>
                )}
              </span>
            </div>
            <div className="card-body">
              {mode === 'text' ? (
                <NoteInput value={inputText} onChange={setInputText} />
              ) : (
                <ImageUploader file={imageFile} onChange={setImageFile} />
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <button
              id="redact-btn"
              className="redact-btn"
              onClick={handleRedact}
              disabled={loading || !canRedact}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Redacting…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                  </svg>
                  Redact PHI
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="error-banner" role="alert">
              <span>⚠️</span>
              <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="results-section" id="results-anchor">
              <EntitySummary
                entities={result.entities}
                ocrWarning={result.ocr_warning}
              />
              <RedactedView
                original={result.original}
                redacted={result.redacted}
                entities={result.entities}
              />
            </div>
          )}

        </div>
      </main>

      <footer className="footer">
        <p className="footer-text">
          MedRedact · spaCy NER + regex ·{' '}
          <a
            className="footer-link"
            href="https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html"
            target="_blank"
            rel="noreferrer"
          >
            HIPAA Safe Harbor
          </a>{' '}
          · No data is stored or transmitted externally
        </p>
      </footer>
    </div>
  )
}
