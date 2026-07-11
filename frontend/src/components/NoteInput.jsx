import { useRef } from 'react'

const SAMPLE_NOTE = `Patient: Jane Doe
DOB: 03/14/1962
MRN: 78234910
Admitted: January 5th, 2024

Jane presented to General Hospital on 01/05/2024 with acute chest pain. She was referred by Dr. Michael Chen from the Springfield Medical Center. Contact: (555) 867-5309.

Assessment: Patient is a 62-year-old female with a history of hypertension. Discharged to her home at 47 Elm Street, Springfield.`

export default function NoteInput({ value, onChange }) {
  const fileRef = useRef(null)

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  function loadSample() {
    onChange(SAMPLE_NOTE)
  }

  return (
    <div className="input-section">
      <div className="textarea-wrapper">
        <textarea
          id="note-input"
          className="note-textarea"
          placeholder="Paste a clinical note here — patient names, dates, MRNs, phone numbers, and locations will be automatically detected and redacted…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
        />
      </div>
      <div className="textarea-footer">
        <span className="char-count">{value.length.toLocaleString()} characters</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="upload-txt-btn" onClick={loadSample} type="button">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4.5h1.5v4h-1.5v-4zm0 5.5h1.5v1.5h-1.5V11z"/>
            </svg>
            Try sample note
          </button>
          <button
            className="upload-txt-btn"
            onClick={() => fileRef.current.click()}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
            </svg>
            Upload .txt
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  )
}
