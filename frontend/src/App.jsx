import { useEffect, useRef, useState } from "react";
import { get, post, postForm, postExport, health } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import ChatInput from "./components/ChatInput.jsx";
import DraftPane from "./components/DraftPane.jsx";
import VerifyPanel from "./components/VerifyPanel.jsx";
import TokenMeter from "./components/TokenMeter.jsx";
import VoiceControls from "./components/VoiceControls.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import Toasts from "./components/Toasts.jsx";

export default function App() {
  const [waking, setWaking] = useState(true);
  const [online, setOnline] = useState(false);
  const [skills, setSkills] = useState([]);
  const [tier, setTier] = useState("advanced");
  const [docsList, setDocsList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [prevDraft, setPrevDraft] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null); // {draft} awaiting Accept/Reject
  const [tokens, setTokens] = useState(null); // {full, sent}
  const [verifications, setVerifications] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmAsk, setConfirmAsk] = useState(null); // {title, onYes}
  const [toasts, setToasts] = useState([]);
  const historyRef = useRef([]);

  const toast = (text, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await health();
        if (r.status === 200 && r.data && r.data.ok) {
          if (!cancelled) { setOnline(true); setWaking(false); }
          const sk = await get("/skills");
          if (!cancelled) setSkills(sk);
        } else {
          if (!cancelled) setWaking(false);
        }
      } catch {
        if (!cancelled) setWaking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pushHistory = (d) => {
    if (d) historyRef.current.push(d);
  };

  async function send(message, skill) {
    if (!message.trim()) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: message }]);
    try {
      const docIds = docsList.map((d) => d.doc_id);
      const res = await post("/chat", {
        message,
        tier,
        doc_ids: docIds,
        skill: skill || undefined,
      });
      setPrevDraft(null);
      setPendingEdit(null);
      pushHistory(draft);
      setDraft(res.draft);
      setTokens({ full: res.tokens_full, sent: res.tokens_sent });
      setMessages((m) => [...m, { role: "assistant", text: skill ? `[${skill}] draft generated.` : "Draft generated." }]);
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy — try again shortly.", "error");
      else toast("Chat failed: " + e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function applyEdit(instruction) {
    if (!draft) { toast("No draft to edit yet.", "error"); return; }
    setBusy(true);
    try {
      const res = await post("/edit", { instruction, draft });
      setPendingEdit(res.draft);
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy.", "error");
      else toast("Edit failed: " + e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function acceptEdit() {
    pushHistory(draft);
    setPrevDraft(draft);
    setDraft(pendingEdit);
    setPendingEdit(null);
  }

  function rejectEdit() {
    setPendingEdit(null);
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (prev === undefined) { toast("Nothing to undo.", "info"); return; }
    setPrevDraft(draft);
    setDraft(prev);
  }

  async function verify() {
    if (!draft) { toast("Nothing to verify yet.", "error"); return; }
    setBusy(true);
    try {
      const res = await post("/verify", { text: draft });
      setVerifications(res);
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy.", "error");
      else toast("Verify failed: " + e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function exportDocx() {
    if (!draft) { toast("Nothing to export yet.", "error"); return; }
    try {
      const blob = await postExport({ draft, format: "docx" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vidhi_draft.docx";
      a.click();
      URL.revokeObjectURL(url);
      toast("DOCX exported.", "ok");
    } catch (e) {
      toast("Export failed: " + e.message, "error");
    }
  }

  async function handleUpload(file, role) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("role", role);
    try {
      const res = await postForm("/upload", fd);
      setDocsList((d) => [...d, { doc_id: res.doc_id, name: file.name, role, tokens_full: res.tokens_full, style: res.style }]);
      toast(`Uploaded ${file.name}: ${res.tokens_full} tokens (${role}).`, "ok");
    } catch (e) {
      toast("Upload failed: " + e.message, "error");
    }
  }

  // Voice / typed command handling
  async function runCommand(transcript) {
    try {
      const res = await post("/voice", { transcript, draft });
      setStatusLine(`Parsed action: ${res.action}${res.needs_confirm ? " (needs confirmation)" : ""}`);
      switch (res.action) {
        case "dictate":
          pushHistory(draft);
          setDraft((d) => (d ? d + "\n\n" + res.text : res.text));
          break;
        case "edit":
          await applyEdit(res.text || transcript);
          break;
        case "use_skill":
          if (res.skill) { await send(transcript, res.skill); }
          break;
        case "verify":
          await verify();
          break;
        case "export":
          await exportDocx();
          break;
        case "overwrite":
          setConfirmAsk({
            title: "Overwrite the whole draft?",
            onYes: () => { pushHistory(draft); setDraft(res.text || ""); setConfirmAsk(null); },
          });
          break;
        case "delete":
          setConfirmAsk({
            title: "Delete the draft?",
            onYes: () => { pushHistory(draft); setDraft(""); setVerifications(null); setConfirmAsk(null); },
          });
          break;
        case "undo":
          undo();
          break;
        default:
          toast(res.message || "Command not understood.", "info");
      }
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy.", "error");
      else toast("Command failed: " + e.message, "error");
    }
  }

  const [statusLine, setStatusLine] = useState("");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Vidhi</div>
        <div className="tagline">DraftMate Legal Drafting Studio</div>
        {waking && <div className="waking">Waking server…</div>}
        {!waking && !online && <div className="waking err">Server offline — start the backend, then reload.</div>}
        {!waking && online && <div className="online-dot" title="API connected" />}
      </header>
      <div className="layout">
        <Sidebar
          skills={skills}
          docs={docsList}
          tier={tier}
          setTier={setTier}
          onUpload={handleUpload}
          onPickSkill={(s) => setMessages((m) => [...m, { role: "user", text: `@${s} ` }])}
        />
        <main className="center">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={"msg " + m.role}>{m.text}</div>
            ))}
            {messages.length === 0 && (
              <div className="hint">
                Upload a reference document, then pick a skill or type <code>@legal_notice</code> with your facts.
              </div>
            )}
          </div>
          <DraftPane
            draft={draft}
            pending={pendingEdit}
            prev={prevDraft}
            onAccept={acceptEdit}
            onReject={rejectEdit}
          />
          <VoiceControls
            onCommand={runCommand}
            statusLine={statusLine}
            disabled={!online}
            confirmOpen={!!confirmAsk}
          />
          <ChatInput onSend={send} busy={busy} />
        </main>
        <aside className="right">
          <TokenMeter tokens={tokens} />
          <VerifyPanel items={verifications} onVerify={verify} onExport={exportDocx} busy={busy} />
        </aside>
      </div>
      {confirmAsk && <ConfirmModal ask={confirmAsk} onNo={() => setConfirmAsk(null)} />}
      <Toasts toasts={toasts} />
    </div>
  );
}
