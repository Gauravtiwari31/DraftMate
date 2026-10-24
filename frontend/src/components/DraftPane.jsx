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
      <div className="draft">{draft || <span className="empty">No draft yet.</span>}</div>
    </section>
  );
}
