import { useRef, useState } from "react";

export default function Sidebar({ skills, docs, tier, setTier, onUpload, onPickSkill }) {
  const [role, setRole] = useState("reference");
  const fileRef = useRef(null);
  const real = skills.filter((s) => !s.stub);
  const stubs = skills.filter((s) => s.stub);

  return (
    <aside className="sidebar">
      <div className="panel">
        <h3>Skills library</h3>
        <div className="chips">
          {real.map((s) => (
            <button key={s.id} className="chip" title={s.description} onClick={() => onPickSkill(s.id)}>
              {s.name}
            </button>
          ))}
          {stubs.map((s) => (
            <span key={s.id} className="chip stub" title="Coming soon">
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Documents</h3>
        <div className="role-toggle">
          <label>
            <input type="radio" checked={role === "reference"} onChange={() => setRole("reference")} /> reference
          </label>
          <label>
            <input type="radio" checked={role === "source"} onChange={() => setRole("source")} /> source
          </label>
        </div>
        <div
          className="dropzone"
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0], role);
          }}
        >
          Drop or click to upload ({role})
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          hidden
          onChange={(e) => e.target.files[0] && onUpload(e.target.files[0], role)}
        />
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.doc_id}>
              <span className="docname">{d.name}</span>
              <span className="docmeta">{d.role} · {d.tokens_full} tok</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3>Model</h3>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="quick">Quick (fast, short)</option>
          <option value="balanced">Balanced (short outputs)</option>
          <option value="advanced">Advanced (drafting default)</option>
        </select>
      </div>
    </aside>
  );
}
