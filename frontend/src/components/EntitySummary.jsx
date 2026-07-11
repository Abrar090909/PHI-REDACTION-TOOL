const ENTITY_COLORS = {
  NAME:     'var(--clr-name)',
  DATE:     'var(--clr-date)',
  LOCATION: 'var(--clr-location)',
  ID:       'var(--clr-id)',
  PHONE:    'var(--clr-phone)',
  AGE:      'var(--clr-age)',
  HOSPITAL: 'var(--clr-hospital)',
}

export default function EntitySummary({ entities, ocrWarning }) {
  // Count entities by label
  const counts = entities.reduce((acc, ent) => {
    acc[ent.label] = (acc[ent.label] || 0) + 1
    return acc
  }, {})

  const total = entities.length

  return (
    <div>
      {ocrWarning && (
        <div className="warning-banner" role="alert">
          <span>⚠️</span>
          <span>
            <strong>Low OCR confidence:</strong> The extracted text seems short relative to the image
            size. Some text may have been missed. Review the original vs. redacted panels carefully.
          </span>
        </div>
      )}

      <div className="entity-summary">
        <span className="summary-label">
          {total === 0
            ? 'No PHI detected'
            : `${total} PHI entity${total !== 1 ? 'ies' : 'y'} redacted`}
        </span>

        {total > 0 && (
          <div className="summary-pills">
            {Object.entries(counts).map(([label, count]) => (
              <span
                key={label}
                className="summary-pill"
                style={{ color: ENTITY_COLORS[label] || 'var(--text-secondary)' }}
                data-tooltip={`${count} ${label} instance${count > 1 ? 's' : ''}`}
              >
                <span className="summary-pill-dot" />
                {count} {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
