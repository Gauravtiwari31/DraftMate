import { useEffect, useRef, useState } from "react";
import { get, post, postForm, postExport, health } from "./api.js";
import Icon from "./icons.jsx";
import { useSpeech } from "./speech.js";
import NavSidebar from "./components/NavSidebar.jsx";
import ModelPicker from "./components/ModelPicker.jsx";
import Composer from "./components/Composer.jsx";
import SkillsRow from "./components/SkillsRow.jsx";
import PromptMeter from "./components/PromptMeter.jsx";
import CommandBar from "./components/CommandBar.jsx";
import DraftPane from "./components/DraftPane.jsx";
import VerifyPanel from "./components/VerifyPanel.jsx";
import TokenMeter from "./components/TokenMeter.jsx";
import DocsDrawer from "./components/DocsDrawer.jsx";
import DocumentsView from "./components/DocumentsView.jsx";
import SkillsLibrary from "./components/SkillsLibrary.jsx";
import CitationCheck from "./components/CitationCheck.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import Toasts from "./components/Toasts.jsx";

const WAKE_TIMEOUT_MS = 90000; // free-tier hosts can take ~30-60s to cold start

export default function App() {
  const [waking, setWaking] = useState(true);
  const [wakeTry, setWakeTry] = useState(0);
  const [online, setOnline] = useState(false);
  const [view, setView] = useState("drafter");
  const [skills, setSkills] = useState([]);
  const [models, setModels] = useState([]);
  const [tier, setTier] = useState("auto");
  const [docsList, setDocsList] = useState([]); // {doc_id, name, role, tokens_full, style, selected}
  const [uploadRole, setUploadRole] = useState("reference");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [draft, setDraft] = useState("");
  const [prevDraft, setPrevDraft] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null); // {draft} awaiting Accept/Reject
  const [tokens, setTokens] = useState(null); // {full, sent}
  const [verifications, setVerifications] = useState(null);
  const [busy, setBusy] = useState(false);
  const [improving, setImproving] = useState(false);
  const [confirmAsk, setConfirmAsk] = useState(null); // {title, onYes, voice}
  const [toasts, setToasts] = useState([]);
  const [statusLine, setStatusLine] = useState("");
  const historyRef = useRef([]);
  const fileRef = useRef(null);

  const toast = (text, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  };

  // poll /health until the backend answers (or give up after WAKE_TIMEOUT_MS)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deadline = Date.now() + WAKE_TIMEOUT_MS;
      while (!cancelled) {
        try {
          const r = await health();
          if (r.status === 200 && r.data && r.data.ok) break;
        } catch {}
        if (Date.now() > deadline) {
          if (!cancelled) setWaking(false);
          return;
        }
        await new Promise((ok) => setTimeout(ok, 3000));
      }
      if (cancelled) return;
      setOnline(true);
      setWaking(false);
      try {
        const [sk, md] = await Promise.all([get("/skills"), get("/models")]);
        if (!cancelled) { setSkills(sk); setModels(md); }
      } catch (e) {
        if (!cancelled) toast("Could not load skills/models: " + e.message, "error");
      }
    })();
    return () => { cancelled = true; };
  }, [wakeTry]);

  function retryWake() {
    setWaking(true);
    setWakeTry((n) => n + 1);
  }

  const pushHistory = (d) => {
    if (d) historyRef.current.push(d);
  };

  // every draft change invalidates the last verification run
  function updateDraft(next) {
    setDraft(next);
    setVerifications(null);
  }

  // Generating replaces the current draft, so ask first when there is one.
  function send(message, skill, opts = {}) {
    if (!message.trim()) return;
    if (draft) {
      setConfirmAsk({
        title: "Replace the current draft with a new one?",
        voice: opts.voice,
        onYes: () => { setConfirmAsk(null); generate(message, skill, opts); },
      });
      return;
    }
    return generate(message, skill, opts);
  }

  async function generate(message, skill, { fromInput } = {}) {
    setBusy(true);
    setView("drafter");
    setMessages((m) => [...m, { role: "user", text: message }]);
    try {
      const docIds = docsList.filter((d) => d.selected).map((d) => d.doc_id);
      const res = await post("/chat", {
        message,
        tier,
        doc_ids: docIds,
        skill: skill || undefined,
      });
      setPrevDraft(null);
      setPendingEdit(null);
      pushHistory(draft);
      updateDraft(res.draft);
      setTokens({ full: res.tokens_full, sent: res.tokens_sent });
      if (fromInput) setChatText("");
      setMessages((m) => [...m, { role: "assistant", text: res.skill ? `[${res.skill}] draft generated.` : "Draft generated." }]);
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy — try again shortly.", "error");
      else toast("Chat failed: " + e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function pickSkill(id) {
    // put the tag at the front of the chat box, replacing any existing leading tag
    setChatText((t) => `@${id} ` + t.replace(/^@[\w-]+\s*/, ""));
    setView("drafter");
  }

  async function improvePrompt() {
    setImproving(true);
    try {
      const res = await post("/improve", { message: chatText });
      setChatText(res.message);
      toast("Prompt improved — fill in any [placeholders] before sending.", "ok");
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Try again shortly.", "error");
      else toast("Improve failed: " + e.message, "error");
    } finally {
      setImproving(false);
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
    updateDraft(pendingEdit);
    setPendingEdit(null);
  }

  function rejectEdit() {
    setPendingEdit(null);
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (prev === undefined) { toast("Nothing to undo.", "info"); return; }
    setPrevDraft(draft);
    updateDraft(prev);
  }

  async function verifyText(text) {
    setBusy(true);
    try {
      return await post("/verify", { text });
    } catch (e) {
      if (e.message === "busy") toast("All providers busy. Retried once and still busy.", "error");
      else toast("Verify failed: " + e.message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!draft) { toast("Nothing to verify yet.", "error"); return; }
    const res = await verifyText(draft);
    if (res) setVerifications(res);
  }

  async function exportDocx() {
    if (!draft) { toast("Nothing to export yet.", "error"); return; }
    try {
      const blob = await postExport({ draft, format: "docx" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "draftmate_draft.docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      setDocsList((d) => [...d, { doc_id: res.doc_id, name: file.name, role, tokens_full: res.tokens_full, style: res.style, selected: true }]);
      toast(`Uploaded ${file.name}: ${res.tokens_full} tokens (${role}).`, "ok");
    } catch (e) {
      toast("Upload failed: " + e.message, "error");
    }
  }

  const toggleDoc = (id) => setDocsList((d) => d.map((x) => (x.doc_id === id ? { ...x, selected: !x.selected } : x)));
  const removeDoc = (id) => setDocsList((d) => d.filter((x) => x.doc_id !== id));
  function applyDocs(picked) {
    setDocsList((d) => d.map((x) => ({ ...x, selected: picked.has(x.doc_id) })));
    setDrawerOpen(false);
  }

  // Voice / typed command handling
  async function runCommand(transcript, source = "typed") {
    const voice = source === "voice";
    try {
      const res = await post("/voice", { transcript, draft });
      setStatusLine(`Parsed action: ${res.action}${res.needs_confirm ? " (needs confirmation)" : ""}`);
      switch (res.action) {
        case "dictate":
          pushHistory(draft);
          updateDraft((d) => (d ? d + "\n\n" + res.text : res.text));
          break;
        case "edit":
          await applyEdit(res.text || transcript);
          break;
        case "use_skill":
          if (res.skill) { await send(transcript, res.skill, { voice }); }
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
            voice,
            onYes: () => { pushHistory(draft); updateDraft(res.text || ""); setConfirmAsk(null); },
          });
          break;
        case "delete":
          setConfirmAsk({
            title: "Delete the draft?",
            voice,
            onYes: () => { pushHistory(draft); updateDraft(""); setConfirmAsk(null); },
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

  // voice agent: final transcripts become commands (ConfirmModal handles yes/no while it is open)
  const agent = useSpeech((said) => { if (!confirmAsk) runCommand(said, "voice"); });

  const selectedCount = docsList.filter((d) => d.selected).length;
  const tagged = (chatText.match(/@[\w-]+/g) || []).map((t) => t.slice(1)).find((id) => skills.some((s) => s.id === id && !s.stub));
  const workspace = !!draft || pendingEdit !== null || messages.length > 0;

  const composer = (
    <Composer
      text={chatText}
      setText={setChatText}
      skills={skills}
      busy={busy}
      onSend={(text, skill) => send(text, skill, { fromInput: true })}
      onAddFromDevice={() => fileRef.current.click()}
      onOpenDocs={() => setDrawerOpen(true)}
      selectedDocs={selectedCount}
      uploadRole={uploadRole}
      setUploadRole={setUploadRole}
      onOpenLibrary={() => setView("library")}
    />
  );
  const meter = (
    <PromptMeter text={chatText} skill={tagged} docs={selectedCount} onImprove={improvePrompt}
      improving={improving} compact={workspace} />
  );
  const commandBar = <CommandBar agent={agent} onCommand={runCommand} statusLine={statusLine} disabled={!online} />;

  return (
    <div className="app">
      <NavSidebar view={view} setView={setView} waking={waking} online={online} onRetry={retryWake} docCount={docsList.length} />
      <div className="main">
        <header className="topbar">
          <ModelPicker models={models} tier={tier} setTier={setTier} />
          <button className={"iconbtn round" + (agent.listening ? " rec" : "")} onClick={agent.toggle} disabled={!online}
            title="Voice agent: speak a command" aria-pressed={agent.listening}>
            <Icon name="mic" />
          </button>
        </header>

        {view === "drafter" && !workspace && (
          <div className="hero">
            <h1>Hello, How can I help you today?</h1>
            <p className="subtitle">Draft. Review. Research. Analyse. All in one workspace.</p>
            {composer}
            {commandBar}
            <SkillsRow skills={skills} onPick={pickSkill} onViewAll={() => setView("library")} />
            {meter}
          </div>
        )}

        {view === "drafter" && workspace && (
          <div className="workspace">
            <div className="workmain">
              {messages.length > 0 && (
                <div className="messages">
                  {messages.map((m, i) => (
                    <div key={i} className={"msg " + m.role}>{m.text}</div>
                  ))}
                </div>
              )}
              <DraftPane draft={draft} pending={pendingEdit} prev={prevDraft} onAccept={acceptEdit} onReject={rejectEdit} />
              {commandBar}
              {composer}
              {meter}
            </div>
            <aside className="review">
              <TokenMeter tokens={tokens} />
              <VerifyPanel items={verifications} onVerify={verify} onExport={exportDocx} busy={busy} />
            </aside>
          </div>
        )}

        {view === "documents" && <DocumentsView docs={docsList} onUpload={handleUpload} onToggle={toggleDoc} onRemove={removeDoc} />}
        {view === "library" && <SkillsLibrary skills={skills} onPick={pickSkill} />}
        {view === "citations" && <CitationCheck draft={draft} onVerifyText={verifyText} busy={busy} />}
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden
        onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0], uploadRole); e.target.value = ""; }} />
      {drawerOpen && (
        <DocsDrawer docs={docsList} onApply={applyDocs} onClose={() => setDrawerOpen(false)}
          onUploadNew={() => fileRef.current.click()} />
      )}
      {confirmAsk && <ConfirmModal ask={confirmAsk} onNo={() => setConfirmAsk(null)} />}
      <Toasts toasts={toasts} />
    </div>
  );
}
