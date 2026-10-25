import { useState } from "react";
import Icon from "../icons.jsx";

// "DraftMate Documents": pick which uploaded documents the next request may use.
export default function DocsDrawer({ docs, onApply, onClose, onUploadNew }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set(docs.filter((d) => d.selected).map((d) => d.doc_id)));
  const shown = docs.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  function flip(id) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-label="DraftMate Documents">
        <div className="drawerhead">
          <Icon name="folder" />
          <h2>DraftMate Documents</h2>
          <button className="iconbtn ghost" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <label className="search">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" />
        </label>
        {docs.length === 0 ? (
          <div className="empty-state">
            <p>No documents uploaded in this session yet.</p>
            <button className="softbtn" onClick={onUploadNew}><Icon name="upload" size={15} />Upload a document</button>
          </div>
        ) : (
          <ul className="filelist">
            {shown.map((d) => (
              <li key={d.doc_id}>
                <label>
                  <input type="checkbox" checked={picked.has(d.doc_id)} onChange={() => flip(d.doc_id)} />
                  <span className={"fileicon " + (/\.pdf$/i.test(d.name) ? "pdf" : "doc")}><Icon name="file" size={15} /></span>
                  <span className="filename">{d.name}</span>
                  <span className="rolechip">{d.role}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="drawerfoot">
          <button onClick={onClose}>Cancel</button>
          <button className="primarybtn" onClick={() => onApply(picked)} disabled={docs.length === 0}>
            Use Selected ({picked.size})
          </button>
        </div>
      </aside>
    </div>
  );
}
