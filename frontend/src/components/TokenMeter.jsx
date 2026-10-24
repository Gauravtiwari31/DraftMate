export default function TokenMeter({ tokens }) {
  if (!tokens) {
    return (
      <div className="panel">
        <h3>Token meter</h3>
        <p className="muted">Upload a document and generate a draft to see savings.</p>
      </div>
    );
  }
  const saved = tokens.full > 0 ? Math.max(0, Math.round((1 - tokens.sent / tokens.full) * 100)) : 0;
  return (
    <div className="panel">
      <h3>Token meter</h3>
      <p>
        Full {tokens.full.toLocaleString()} → sent {tokens.sent.toLocaleString()},{" "}
        <b>{saved}% saved</b>
      </p>
    </div>
  );
}
