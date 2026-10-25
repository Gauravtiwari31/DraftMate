import { diffWords } from "diff";

function DiffView({ before, after }) {
  const parts = diffWords(before || "", after || "");
  return (
    <div className="draft diffview">
      {parts.map((p, i) => (
        <span key={i} className={p.added ? "add" : p.removed ? "del" : ""}>
          {p.value}
        </span>
      ))}
    </div>
  );
}

// **bold** and *italic* spans; built from React elements, never raw HTML
function inline(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? <strong key={i}>{part}</strong>
      : part.split(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g).map((p, j) => (j % 2 ? <em key={`${i}-${j}`}>{p}</em> : p)));
}

// Minimal Markdown view for drafts: headings, rules, bold; everything else stays as written.
function DraftView({ text }) {
  return (
    <div className="draft rendered">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        const h = /^(#{1,4})\s+(.*)$/.exec(t);
        if (h) {
          const Tag = `h${Math.min(h[1].length + 2, 6)}`;
          return <Tag key={i}>{inline(h[2].replace(/\*\*/g, ""))}</Tag>;
        }
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return <hr key={i} />;
        if (!t) return <div key={i} className="gap" />;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}

export default function DraftPane({ draft, pending, prev, onAccept, onReject }) {
  if (pending !== null && pending !== undefined) {
    return (
      <section className="draftwrap">
        <div className="panetitle">Proposed edit</div>
        <DiffView before={draft} after={pending} />
        <div className="diffactions">
          <button className="accept" onClick={onAccept}>Accept</button>
          <button className="reject" onClick={onReject}>Reject</button>
        </div>
      </section>
    );
  }
  if (prev && draft && prev !== draft) {
    return (
      <section className="draftwrap">
        <div className="panetitle">Draft (last change shown as diff)</div>
        <DiffView before={prev} after={draft} />
      </section>
    );
  }
  return (
    <section className="draftwrap">
      <div className="panetitle">Draft</div>
      {draft ? <DraftView text={draft} /> : <div className="draft"><span className="empty">No draft yet.</span></div>}
    </section>
  );
}
