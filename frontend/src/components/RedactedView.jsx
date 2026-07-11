/**
 * RedactedView — side-by-side panel showing:
 *   Left:  original text with colored entity highlights
 *   Right: fully redacted text with colored placeholder tags
 */

const TAG_RE = /(\[(?:NAME|DATE|LOCATION|ID|PHONE|AGE|HOSPITAL)\])/g

/**
 * Render the original text with inline colored highlight spans for each entity.
 * Entities are character-offset based, so we walk the text and insert marks.
 */
function renderHighlighted(text, entities) {
  if (!entities || entities.length === 0) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
  }

  // Sort by start offset
  const sorted = [...entities].sort((a, b) => a.start - b.start)
  const nodes = []
  let cursor = 0

  for (const ent of sorted) {
    if (ent.start > cursor) {
      nodes.push(
        <span key={`t-${cursor}`} style={{ whiteSpace: 'pre-wrap' }}>
          {text.slice(cursor, ent.start)}
        </span>
      )
    }
    nodes.push(
      <mark
        key={`e-${ent.start}`}
        className={`phi-highlight phi-${ent.label}`}
        data-tooltip={ent.label}
        title={ent.label}
      >
        {text.slice(ent.start, ent.end)}
      </mark>
    )
    cursor = ent.end
  }

  if (cursor < text.length) {
    nodes.push(
      <span key={`t-${cursor}-end`} style={{ whiteSpace: 'pre-wrap' }}>
        {text.slice(cursor)}
      </span>
    )
  }

  return nodes
}

/**
 * Render the redacted text, converting [TAG] placeholders into colored chips.
 */
function renderRedacted(redactedText) {
  const parts = redactedText.split(TAG_RE)
  return parts.map((part, i) => {
    const match = part.match(/^\[(\w+)\]$/)
    if (match) {
      const label = match[1]
      return (
        <span key={i} className={`redact-tag redact-${label}`}>
          {part}
        </span>
      )
    }
    return (
      <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
        {part}
      </span>
    )
  })
}

function DownloadButton({ text }) {
  function handleDownload() {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redacted_note.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      id="download-btn"
      className="download-btn"
      onClick={handleDownload}
      type="button"
      title="Download redacted note as .txt"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
      </svg>
      Download .txt
    </button>
  )
}

export default function RedactedView({ original, redacted, entities }) {
  return (
    <div className="results-grid">
      {/* Left: Original with highlights */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              <path d="M4.5 6.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7zm0 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4z"/>
            </svg>
            Original
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {entities.length} entities highlighted
          </span>
        </div>
        <div className="panel-text">
          {renderHighlighted(original, entities)}
        </div>
      </div>

      {/* Right: Redacted output */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--clr-name)' }}>
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            Redacted
          </span>
          <DownloadButton text={redacted} />
        </div>
        <div className="panel-text">
          {renderRedacted(redacted)}
        </div>
      </div>
    </div>
  )
}
