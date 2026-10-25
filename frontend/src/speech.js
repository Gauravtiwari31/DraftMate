import { useEffect, useRef, useState } from "react";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const speechSupported = !!SR;

// One Web Speech recogniser (en-IN). onFinal gets the final transcript; the latest callback is
// read through a ref so parent re-renders never tear the recogniser down mid-listen.
export function useSpeech(onFinal) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);
  const cb = useRef(onFinal);
  useEffect(() => {
    cb.current = onFinal;
  });

  useEffect(() => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (const r of e.results) t += r[0].transcript;
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal && t.trim()) cb.current(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setTranscript("mic error: " + e.error);
    };
    recRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, []);

  function toggle() {
    const rec = recRef.current;
    if (!rec) {
      setTranscript("Speech recognition is not supported in this browser — use Chrome or Edge, or type instead.");
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

  return { listening, transcript, toggle };
}
