import { useState } from "react";
import Icon from "../icons.jsx";

// Voice agent / typed command line: edits, delete, undo, verify, export, invoke skills.
export default function CommandBar({ agent, onCommand, statusLine, disabled }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="commandbar">
      <button className={"iconbtn" + (agent.listening ? " rec" : "")} onClick={agent.toggle} disabled={disabled}
        title="Voice agent (en-IN)" aria-pressed={agent.listening}>
        <Icon name="mic" />
      </button>
      <input
        value={typed}
        placeholder={agent.listening ? "Listening…" : "Voice or typed command — e.g. make clause 3 shorter and more formal"}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && typed.trim()) { onCommand(typed.trim(), "typed"); setTyped(""); }
        }}
        disabled={disabled}
        aria-label="Command"
      />
      {(agent.transcript || statusLine) && (
        <div className="statusline">{agent.transcript}{statusLine ? ` — ${statusLine}` : ""}</div>
      )}
    </div>
  );
}
