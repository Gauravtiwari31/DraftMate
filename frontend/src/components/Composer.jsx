import { useState } from "react";
import Icon from "../icons.jsx";
import { useSpeech } from "../speech.js";

// Main prompt box. text/setText live in App so skills and Improve Prompt can change it.
export default function Composer({ text, setText, skills, busy, onSend, onAddFromDevice, onOpenDocs,
  selectedDocs, uploadRole, setUploadRole, onOpenLibrary }) {
  const [suggestIdx, setSuggestIdx] = useState(0);
  const dictation = useSpeech((said) => setText((t) => (t ? t.replace(/\s*$/, " ") : "") + said));

  const real = skills.filter((s) => !s.stub);
  const at = /(?:^|\s)@([\w-]*)$/.exec(text);
  const matches = at ? real.filter((s) => s.id.startsWith(at[1].toLowerCase())) : [];
  // the first @tag in the text that names a real skill
  const skill = (text.match(/@[\w-]+/g) || []).map((t) => t.slice(1)).find((id) => real.some((s) => s.id === id)) || null;

  function submit() {
    if (!text.trim() || busy) return;
    onSend(text, skill || undefined);
  }

  function complete(id) {
    setText(text.replace(/@([\w-]*)$/, "@" + id + " "));
  }

  function handleKey(e) {
    if (matches.length) {
      if (e.key === "ArrowDown") { setSuggestIdx((i) => (i + 1) % matches.length); e.preventDefault(); return; }
      if (e.key === "ArrowUp") { setSuggestIdx((i) => (i - 1 + matches.length) % matches.length); e.preventDefault(); return; }
      if (e.key === "Tab") { complete(matches[suggestIdx % matches.length].id); e.preventDefault(); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer card">
      {matches.length > 0 && (
        <ul className="autocomplete">
          {matches.map((s, i) => (
            <li key={s.id} className={i === suggestIdx ? "active" : ""}
              onMouseDown={(e) => { e.preventDefault(); complete(s.id); }}>
              <b>@{s.id}</b> <span>{s.name}</span>
            </li>
          ))}
        </ul>
      )}
      <textarea
        value={text}
        rows={3}
        placeholder="Ask anything or type @ to use a specific legal skill…"
        onChange={(e) => { setText(e.target.value); setSuggestIdx(0); }}
        onKeyDown={handleKey}
        aria-label="Prompt"
      />
      {(skill || dictation.listening || dictation.transcript) && (
        <div className="composer-status">
          {skill && <span className="skilltag">skill: @{skill}</span>}
          {dictation.listening && <span className="live">Dictating… {dictation.transcript}</span>}
          {!dictation.listening && dictation.transcript.startsWith("mic error") && <span>{dictation.transcript}</span>}
        </div>
      )}
      <div className="composer-bar">
        <button className="iconbtn ghost" title="Attach a document" onClick={onAddFromDevice}><Icon name="clip" /></button>
        <button className="softbtn" onClick={onAddFromDevice}><Icon name="upload" size={15} />Add from Device</button>
        <button className="softbtn" onClick={onOpenDocs}>
          <Icon name="file" size={15} />Add from DraftMate Documents
          {selectedDocs > 0 && <span className="count">{selectedDocs}</span>}
        </button>
        <select className="rolesel" value={uploadRole} onChange={(e) => setUploadRole(e.target.value)}
          title="How the next upload is used" aria-label="Upload as">
          <option value="reference">as style reference</option>
          <option value="source">as source material</option>
        </select>
        <span className="spacer" />
        <button className="iconbtn" title="Skills library" onClick={onOpenLibrary}><Icon name="book" /></button>
        <button className={"iconbtn" + (dictation.listening ? " rec" : "")} title="Dictate into the prompt"
          onClick={dictation.toggle} aria-pressed={dictation.listening}><Icon name="mic" /></button>
        <button className="sendbtn" onClick={submit} disabled={busy || !text.trim()} title="Send" aria-label="Send">
          {busy ? <span className="spinner" /> : <Icon name="send" />}
        </button>
      </div>
    </div>
  );
}
