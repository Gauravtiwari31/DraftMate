import { useState } from "react";

export default function ChatInput({ onSend, busy, skills = [] }) {
  const [text, setText] = useState("");
  const [skill, setSkill] = useState(null);
  const [suggestIdx, setSuggestIdx] = useState(0);

  const at = /(?:^|\s)@([\w-]*)$/.exec(text);

  function submit() {
    if (!text.trim() || busy) return;
    onSend(text, skill || undefined);
    setText("");
    setSkill(null);
  }

  function handleKey(e) {
    if (at) {
      const matches = skills.filter((s) => !s.stub && s.id.startsWith(at[1].toLowerCase()));
      if (e.key === "ArrowDown") { setSuggestIdx((i) => (i + 1) % matches.length); e.preventDefault(); return; }
      if (e.key === "ArrowUp") { setSuggestIdx((i) => (i - 1 + matches.length) % matches.length); e.preventDefault(); return; }
      if (e.key === "Tab" && matches.length) {
        setText(text.replace(/@([\w-]*)$/, "@" + matches[suggestIdx].id + " "));
        setSkill(matches[suggestIdx].id);
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(v) {
    setText(v);
    const m = /(?:^|\s)@([\w-]*)$/.exec(v);
    setSkill(m && m[1] ? m[1] : null);
    setSuggestIdx(0);
  }

  const matches = at ? skills.filter((s) => !s.stub && s.id.startsWith(at[1].toLowerCase())) : [];

  return (
    <div className="chatinput">
      {matches.length > 0 && (
        <ul className="autocomplete">
          {matches.map((s, i) => (
            <li key={s.id} className={i === suggestIdx ? "active" : ""} onMouseDown={(e) => { e.preventDefault(); setText(text.replace(/@([\w-]*)$/, "@" + s.id + " ")); setSkill(s.id); }}>
              <b>@{s.id}</b> <span>{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="inputrow">
        <textarea
          value={text}
          rows={2}
          placeholder="Type @skill + your facts…"
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKey}
        />
        <button onClick={submit} disabled={busy || !text.trim()}>
          {busy ? "Working…" : "Generate"}
        </button>
      </div>
      {skill && <div className="skilltag">skill: {skill}</div>}
    </div>
  );
}
