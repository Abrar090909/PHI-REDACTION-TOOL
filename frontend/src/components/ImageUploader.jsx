import { useState, useRef, useCallback } from 'react'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImageUploader({ file, onChange }) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp']
    if (!allowed.includes(f.type)) {
      alert('Please upload a JPEG, PNG, TIFF, or WebP image.')
      return
    }
    onChange(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [onChange])

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  function handleRemove(e) {
    e.stopPropagation()
    onChange(null)
    setPreview(null)
  }

  return (
    <div className="input-section">
      <div
        id="drop-zone"
        className={`drop-zone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
        onClick={() => !file && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Image upload area"
        onKeyDown={(e) => e.key === 'Enter' && !file && inputRef.current.click()}
      >
        {file && preview ? (
          <div className="image-preview-wrap">
            <img src={preview} alt="Preview" className="image-preview" />
            <div className="image-info">
              <div className="image-name" title={file.name}>{file.name}</div>
              <div className="image-size">{formatBytes(file.size)}</div>
            </div>
            <button className="remove-btn" onClick={handleRemove} type="button">
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="drop-icon">🖼️</div>
            <div className="drop-title">Drop your clinical note image here</div>
            <div className="drop-sub">
              or <span onClick={() => inputRef.current.click()}>browse to upload</span>
              <br />
              <span style={{ marginTop: 4, display: 'block' }}>
                JPEG · PNG · TIFF · WebP — photos or scanned documents
              </span>
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/tiff,image/webp"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        id="image-file-input"
      />
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
        💡 Tip: OCR works best on printed/typed notes. Handwritten notes may have lower accuracy.
      </p>
    </div>
  )
}
