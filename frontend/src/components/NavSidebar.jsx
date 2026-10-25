import Icon from "../icons.jsx";

const NAV = [
  ["drafter", "Drafter", "draft"],
  ["documents", "Documents", "folder"],
  ["library", "Skills Library", "grid"],
  ["citations", "Citation Check", "shield"],
];

export default function NavSidebar({ view, setView, waking, online, onRetry, docCount }) {
  return (
    <nav className="nav">
      <div className="logo">
        <Icon name="feather" size={30} className="logo-mark" />
        <div>
          <div className="logo-name">DraftMate</div>
          <div className="logo-tag">Your AI Assistant in Law</div>
        </div>
      </div>
      <ul className="navlist">
        {NAV.map(([id, label, icon]) => (
          <li key={id}>
            <button className={"navitem" + (view === id ? " active" : "")} onClick={() => setView(id)}>
              <Icon name={icon} />
              <span>{label}</span>
              {id === "documents" && docCount > 0 && <span className="navcount">{docCount}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="navfoot">
        {waking && <div className="conn waking"><span className="dot" />Waking server…</div>}
        {!waking && online && <div className="conn ok"><span className="dot" />Connected</div>}
        {!waking && !online && (
          <div className="conn err">
            <span className="dot" />Server offline
            <button className="linkbtn" onClick={onRetry}>Retry</button>
          </div>
        )}
        <p className="navnote">AI-assisted drafts. Human review required.</p>
      </div>
    </nav>
  );
}
