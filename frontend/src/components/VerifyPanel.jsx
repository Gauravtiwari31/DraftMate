import Icon from "../icons.jsx";

const COLORS = {
  "Verified": "green",
  "Partially Verified": "amber",
  "Unverified": "red",
  "Could not check": "grey",
};

export function VerifyList({ items }) {
  if (items === null) return <p className="muted">No verification run yet.</p>;
  if (items.length === 0) return <p className="muted">No citations found.</p>;
  return (
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
  );
}

export default function VerifyPanel({ items, onVerify, onExport, busy }) {
  return (
    <section className="card">
      <h2>Verification</h2>
      <p className="muted">Checks citations against Indian Kanoon, India Code and sci.gov.in.</p>
      <button className="primarybtn wide" onClick={onVerify} disabled={busy}><Icon name="shield" size={15} />Verify citations</button>
      <VerifyList items={items} />
      <button className="softbtn wide" onClick={onExport}><Icon name="download" size={15} />Export DOCX</button>
    </section>
  );
}
