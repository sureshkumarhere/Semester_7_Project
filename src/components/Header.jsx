export default function Header({ activeRoute, onNavigate }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <h2>MNNIT</h2>
        <span>ALLAHABAD</span>
      </div>
      <div className="header-nav">
        <button
          className={`nav-tab ${activeRoute === 'portal' ? 'active' : ''}`}
          onClick={() => onNavigate('portal')}
        >
          User Portal
        </button>
        <button
          className={`nav-tab ${activeRoute === 'admin' ? 'active' : ''}`}
          onClick={() => onNavigate('admin')}
        >
          Admin Portal (RAG)
        </button>
      </div>
      <div className="header-right">
        <h3>Network Complaint Portal</h3>
        <p>Computer Center</p>
      </div>
    </header>
  );
}