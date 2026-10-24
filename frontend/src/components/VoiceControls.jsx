import { useEffect, useRef, useState } from "react";

export default function VoiceControls({ onCommand, statusLine, disabled, confirmOpen }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (const r of e.results) t += r[0].transcript;
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        const finalText = t.trim();
        // modal open: listen only for yes/no
        if (confirmOpen) return; // ConfirmModal handles its own yes/no via buttons
        if (finalText) onCommand(finalText);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setTranscript("mic error: " + e.error);
    };
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [confirmOpen, onCommand]);

  function toggleMic() {
    const rec = recRef.current;
    if (!rec) {
      setTranscript("Speech recognition not supported in this browser — use the typed command box.");
      speak("Speech recognition is not supported. Please use the typed command box.");
      return;
    }
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setTranscript("");
      try { rec.start(); setListening(true); } catch {}
    }
  }

  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  return (
    <div className="voice">
      <button className={"micbtn " + (listening ? "on" : "")} onClick={toggleMic} disabled={disabled} title="Voice command (en-IN)">
        🎤 {listening ? "Listening…" : "Speak"}
      </button>
      <input
        className="typedcmd"
        value={typed}
        placeholder="Typed command (always available): e.g. make clause 3 shorter and more formal"
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && typed.trim()) { onCommand(typed.trim()); setTyped(""); }
        }}
        disabled={disabled}
      />
      {(transcript || statusLine) && (
        <div className="statusline">{transcript} {statusLine ? `— ${statusLine}` : ""}</div>
      )}
    </div>
  );
}
