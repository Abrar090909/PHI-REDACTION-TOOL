const ENTITY_CONFIG = [
  { label: 'NAME',     color: 'var(--clr-name)',     bg: 'var(--bg-name)' },
  { label: 'DATE',     color: 'var(--clr-date)',     bg: 'var(--bg-date)' },
  { label: 'LOCATION', color: 'var(--clr-location)', bg: 'var(--bg-location)' },
  { label: 'ID',       color: 'var(--clr-id)',       bg: 'var(--bg-id)' },
  { label: 'PHONE',    color: 'var(--clr-phone)',    bg: 'var(--bg-phone)' },
  { label: 'AGE',      color: 'var(--clr-age)',      bg: 'var(--bg-age)' },
  { label: 'HOSPITAL', color: 'var(--clr-hospital)', bg: 'var(--bg-hospital)' },
]

export default function EntityLegend() {
  return (
    <div className="legend">
      <span className="legend-label">Entity Types</span>
      <div className="legend-items">
        {ENTITY_CONFIG.map(({ label, color, bg }) => (
          <span
            key={label}
            className="legend-item"
            style={{ color, background: bg }}
          >
            <span className="legend-swatch" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
