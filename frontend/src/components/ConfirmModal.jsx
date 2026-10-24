import { useEffect } from "react";

export default function ConfirmModal({ ask, onNo }) {
  useEffect(() => {
    try {
      const u = new SpeechSynthesisUtterance(ask.title + " Say yes or no.");
      window.speechSynthesis.speak(u);
    } catch {}
    const onKey = (e) => {
      if (e.key === "Escape") onNo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask, onNo]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p>{ask.title}</p>
        <div className="modalactions">
          <button className="danger" onClick={ask.onYes}>Yes</button>
          <button onClick={onNo}>No</button>
        </div>
      </div>
    </div>
  );
}
