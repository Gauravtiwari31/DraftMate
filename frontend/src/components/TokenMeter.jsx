export default function TokenMeter({ tokens }) {
  if (!tokens) {
    return (
      <section className="card">
        <h2>Token meter</h2>
        <p className="muted">Upload a document and generate a draft to see savings.</p>
      </section>
    );
  }
  // small documents go in whole, plus instructions, so "sent" can exceed "full"
  if (tokens.sent >= tokens.full) {
    return (
      <section className="card">
        <h2>Token meter</h2>
        <p className="tokenline"><b>Nothing trimmed</b>: input sent whole ({tokens.full.toLocaleString()} tokens)</p>
        <p className="muted">Small inputs need no trimming. Savings show on longer documents.</p>
      </section>
    );
  }
  const saved = Math.round((1 - tokens.sent / tokens.full) * 100);
  return (
    <section className="card">
      <h2>Token meter</h2>
      <p className="tokenline">
        Full {tokens.full.toLocaleString()} → sent {tokens.sent.toLocaleString()},{" "}
        <b>{saved}% saved</b>
      </p>
      <div className="bar"><div className="fill good" style={{ width: saved + "%" }} /></div>
    </section>
  );
}
