import Icon from "../icons.jsx";
import { scorePrompt } from "../promptScore.js";

export default function PromptMeter({ text, skill, docs, onImprove, improving, compact }) {
  const { score, tip } = scorePrompt(text, { skill, docs });
  const level = score >= 70 ? "good" : score >= 40 ? "fair" : "weak";
  return (
    <section className={"card promptmeter" + (compact ? " compact" : "")}>
      {!compact && (
        <div className="cardhead">
          <div>
            <h2>Prompt Enhancement &amp; Prompt Meter</h2>
            <p className="muted">Suggestions to improve your prompt and a live prompt quality score.</p>
          </div>
        </div>
      )}
      <div className="pm-row">
        <div className="tip"><Icon name="bulb" size={16} /><span>Tip: {tip}</span></div>
        <div className="strength" aria-label={`Prompt strength ${score}%`}>
          <div className="strength-label">Prompt Strength: <b>{score}%</b></div>
          <div className="bar"><div className={"fill " + level} style={{ width: score + "%" }} /></div>
        </div>
        <button className="outlinebtn" onClick={onImprove} disabled={improving || !text.trim()}>
          <Icon name="sparkle" size={15} />{improving ? "Improving…" : "Improve Prompt"}
        </button>
      </div>
    </section>
  );
}
