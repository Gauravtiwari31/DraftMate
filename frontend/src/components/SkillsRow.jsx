import Icon from "../icons.jsx";
import { SKILL_LOOK } from "../skillLook.js";

const FEATURED = ["contract_review", "redlining", "legal_research", "agreement_drafting",
  "case_analysis", "legal_notice", "summarise", "due_diligence"];

export default function SkillsRow({ skills, onPick, onViewAll }) {
  const byId = Object.fromEntries(skills.map((s) => [s.id, s]));
  const featured = FEATURED.map((id) => byId[id]).filter((s) => s && !s.stub);
  return (
    <section className="card skillsrow">
      <div className="cardhead">
        <div>
          <h2>Legal Skills <span className="muted">(click or type @ to activate)</span></h2>
          <p className="muted">Choose a skill to get started or type @skill in the chat box.</p>
        </div>
        <button className="linkbtn" onClick={onViewAll}>View All Skills →</button>
      </div>
      <div className="skillchips">
        {featured.map((s) => {
          const [icon, color] = SKILL_LOOK[s.id] || ["file", "blue"];
          return (
            <button key={s.id} className="skillchip" title={s.description} onClick={() => onPick(s.id)}>
              <span className={"skillicon " + color}><Icon name={icon} size={16} /></span>
              {s.name}
            </button>
          );
        })}
        <button className="skillchip" onClick={onViewAll}>
          <span className="skillicon grey"><Icon name="more" size={16} /></span>More
        </button>
      </div>
    </section>
  );
}
