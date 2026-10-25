import { useState } from "react";
import Icon from "../icons.jsx";
import { SKILL_LOOK } from "../skillLook.js";

const CATEGORIES = [
  ["Drafting & Writing", "draft", "blue"],
  ["Document Review & Analysis", "review", "pink"],
  ["Legal Research", "search", "green"],
  ["Case & Judgment Tools", "gavel", "orange"],
  ["Compliance & Advisory", "shield", "purple"],
];

export default function SkillsLibrary({ skills, onPick }) {
  const [query, setQuery] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);
  const q = query.toLowerCase();
  const match = (s) => (!onlyReady || !s.stub) && (s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  const ready = skills.filter((s) => !s.stub).length;

  return (
    <div className="page">
      <header className="pagehead row">
        <div>
          <h1>Complete Legal Skills Library</h1>
          <p className="muted">{ready} skills ready, {skills.length - ready} coming soon. Click a skill to start a draft with it.</p>
        </div>
        <div className="libtools">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills…" />
          </label>
          <div className="role-toggle">
            <button className={!onlyReady ? "seg active" : "seg"} onClick={() => setOnlyReady(false)}>All Skills</button>
            <button className={onlyReady ? "seg active" : "seg"} onClick={() => setOnlyReady(true)}>Available now</button>
          </div>
        </div>
      </header>
      <div className="libgrid">
        {CATEGORIES.map(([cat, icon, color]) => {
          // ready skills first, then coming-soon, each alphabetical
          const list = skills.filter((s) => s.category === cat && match(s))
            .sort((a, b) => Number(a.stub) - Number(b.stub) || a.name.localeCompare(b.name));
          if (!list.length) return null;
          return (
            <section key={cat} className={"card libcol tint-" + color}>
              <h2><span className={"skillicon " + color}><Icon name={icon} size={15} /></span>{cat}</h2>
              <ul>
                {list.map((s) => (
                  <li key={s.id}>
                    {s.stub ? (
                      <span className="libitem stub" title="Coming soon">
                        <Icon name="file" size={14} />{s.name}<span className="soon">soon</span>
                      </span>
                    ) : (
                      <button className="libitem" title={s.description} onClick={() => onPick(s.id)}>
                        <Icon name={(SKILL_LOOK[s.id] || ["file"])[0]} size={14} />{s.name}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
