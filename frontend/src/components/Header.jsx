export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <a className="logo" href="/">
          <div className="logo-icon">🔬</div>
          <span className="logo-text">MedRedact</span>
        </a>
        <span className="header-badge">HIPAA Safe Harbor</span>
      </div>
    </header>
  )
}
