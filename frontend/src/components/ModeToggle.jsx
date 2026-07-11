const TextIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2h12v2H2V2zm0 4h8v2H2V6zm0 4h10v2H2v-2z" />
  </svg>
)

const ImageIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3zm2-1a1 1 0 0 0-1 1v6.5l2.5-2.5a.5.5 0 0 1 .637-.062L8 9l2.862-2.862a.5.5 0 0 1 .676-.013L14 8.5V3a1 1 0 0 0-1-1H3zm10 10V9.914l-2.5-2.343L8.137 9.95a.5.5 0 0 1-.637.062L5 8l-3 3V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
  </svg>
)

export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle">
      <div className="mode-toggle-inner">
        <button
          id="mode-text"
          className={`mode-btn${mode === 'text' ? ' active' : ''}`}
          onClick={() => onChange('text')}
        >
          <TextIcon />
          Text
        </button>
        <button
          id="mode-image"
          className={`mode-btn${mode === 'image' ? ' active' : ''}`}
          onClick={() => onChange('image')}
        >
          <ImageIcon />
          Image / Scan
        </button>
      </div>
    </div>
  )
}
