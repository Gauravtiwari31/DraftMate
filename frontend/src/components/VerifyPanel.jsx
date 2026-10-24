const COLORS = {
  "Verified": "green",
  "Partially Verified": "amber",
  "Unverified": "red",
  "Could not check": "grey",
};

export default function VerifyPanel({ items, onVerify, onExport, busy }) {
  return (
    <div className="panel">
      <h3>Verification</h3>
      <button className="verifybtn" onClick={onVerify} disabled={busy}>Verify citations</button>
      {items === null && <p className="muted">No verification run yet.</p>}
      {items && items.length === 0 && <p className="muted">No citations found in the draft.</p>}
      {items && items.length > 0 && (
        <ul className="verifylist">
          {items.map((c, i) => (
            <li key={i} className={"vitem " + (COLORS[c.status] || "grey")}>
              <div className="citation">{c.citation}</div>
              <span className="badge">{c.status}</span>
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer">source</a>
              ) : (
                <span className="nolink">no source</span>
              )}
              <div className="reason">{c.reason}</div>
            </li>
          ))}
        </ul>
      )}
      <button className="exportbtn" onClick={onExport}>Export DOCX</button>
    </div>
  );
}
