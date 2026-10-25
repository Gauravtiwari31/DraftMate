import { useState } from "react";
import Icon from "../icons.jsx";
import { VerifyList } from "./VerifyPanel.jsx";

// Verify citations in any pasted text, independent of the current draft.
export default function CitationCheck({ draft, onVerifyText, busy }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState(null);

  async function run() {
    const res = await onVerifyText(text);
    if (res) setItems(res);
  }

  return (
    <div className="page">
      <header className="pagehead">
        <h1>Citation Check</h1>
        <p className="muted">Paste a passage with case law or statute references. Each citation is searched on
          allow-listed legal sources and marked Verified, Partially Verified or Unverified — DraftMate flags what it
          cannot confirm instead of inventing authority.</p>
      </header>
      <section className="card">
        <textarea className="bigtext" rows={8} value={text} onChange={(e) => { setText(e.target.value); }}
          placeholder="e.g. As held in Kesavananda Bharati v. State of Kerala, (1973) 4 SCC 225…" aria-label="Text to verify" />
        <div className="rowbtns">
          <button className="softbtn" onClick={() => setText(draft)} disabled={!draft}>Use current draft</button>
          <button className="primarybtn" onClick={run} disabled={busy || !text.trim()}>
            <Icon name="shield" size={15} />{busy ? "Checking…" : "Verify citations"}
          </button>
        </div>
      </section>
      <section className="card">
        <h2>Results</h2>
        <VerifyList items={items} />
      </section>
    </div>
  );
}
