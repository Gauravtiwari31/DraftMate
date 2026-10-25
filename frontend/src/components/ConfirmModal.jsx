import { useEffect, useRef } from "react";

const YES = /\b(yes|yeah|yep|confirm|sure|ok(ay)?|haan|ha)\b/i;
const NO = /\b(no|nope|cancel|stop|don't|nahi|na)\b/i;

export default function ConfirmModal({ ask, onNo }) {
  // keep the latest callbacks without re-running the effect (which would re-speak the prompt)
  const handlers = useRef({ onNo, onYes: ask.onYes });
  useEffect(() => {
    handlers.current = { onNo, onYes: ask.onYes };
  });

  useEffect(() => {
    let rec = null;
    let done = false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // when the action came from voice, listen for a spoken yes/no once the prompt finishes
    const listen = () => {
      if (done || !ask.voice || !SR) return;
      rec = new SR();
      rec.lang = "en-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const said = e.results[e.results.length - 1][0].transcript;
        if (NO.test(said)) handlers.current.onNo();
        else if (YES.test(said)) handlers.current.onYes();
      };
      try { rec.start(); } catch {}
    };
    try {
      const u = new SpeechSynthesisUtterance(ask.title + (ask.voice ? " Say yes or no." : ""));
      u.onend = listen;
      u.onerror = listen;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      listen();
    }
    const onKey = (e) => {
      if (e.key === "Escape") handlers.current.onNo();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      done = true;
      window.removeEventListener("keydown", onKey);
      try { window.speechSynthesis.cancel(); } catch {}
      try { if (rec) rec.abort(); } catch {}
    };
  }, [ask]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p>{ask.title}</p>
        {ask.voice && <p className="muted">Say “yes” or “no”, or use the buttons.</p>}
        <div className="modalactions">
          <button className="danger" onClick={ask.onYes}>Yes</button>
          <button onClick={onNo}>No</button>
        </div>
      </div>
    </div>
  );
}
