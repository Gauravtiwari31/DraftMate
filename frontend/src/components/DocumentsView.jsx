import { useRef, useState } from "react";
import Icon from "../icons.jsx";

export default function DocumentsView({ docs, onUpload, onToggle, onRemove }) {
  const [role, setRole] = useState("reference");
  const fileRef = useRef(null);
  return (
    <div className="page">
      <header className="pagehead">
        <h1>Documents</h1>
        <p className="muted">Upload reference documents (DraftMate learns their drafting style) or source material
          (facts the draft can draw on). Ticked documents are used as context for new requests.</p>
      </header>
      <section className="card">
        <div className="role-toggle" role="radiogroup" aria-label="Upload as">
          <button className={role === "reference" ? "seg active" : "seg"} onClick={() => setRole("reference")}>Style reference</button>
          <button className={role === "source" ? "seg active" : "seg"} onClick={() => setRole("source")}>Source material</button>
        </div>
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current.click()}
          onKeyDown={(e) => { if (e.key === "Enter") fileRef.current.click(); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0], role);
          }}
        >
          <Icon name="upload" size={22} />
          <div><b>Drop a file or click to upload</b></div>
          <div className="muted">PDF, DOCX, TXT or MD · max 5 MB · uploaded as {role === "reference" ? "style reference" : "source material"}</div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden
          onChange={(e) => { if (e.target.files[0]) onUpload(e.target.files[0], role); e.target.value = ""; }} />
      </section>
      <section className="card">
        <h2>This session</h2>
        {docs.length === 0 && <p className="muted">No documents yet.</p>}
        {docs.length > 0 && (
          <table className="doctable">
            <thead><tr><th>Use</th><th>Name</th><th>Role</th><th>Tokens</th><th>Style learned</th><th /></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.doc_id}>
                  <td><input type="checkbox" checked={d.selected} onChange={() => onToggle(d.doc_id)} aria-label={`Use ${d.name}`} /></td>
                  <td className="filename">{d.name}</td>
                  <td><span className="rolechip">{d.role}</span></td>
                  <td>{d.tokens_full.toLocaleString()}</td>
                  <td className="muted">{d.style ? d.style.tone : d.role === "reference" ? "not detected" : "—"}</td>
                  <td><button className="linkbtn" onClick={() => onRemove(d.doc_id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
