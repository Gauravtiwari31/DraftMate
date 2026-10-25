import { useEffect, useRef, useState } from "react";
import Icon from "../icons.jsx";

const AUTO = { tier: "auto", label: "Auto", provider: "", description: "Each skill picks the best model" };

export default function ModelPicker({ models, tier, setTier }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = [AUTO, ...models];
  const current = options.find((m) => m.tier === tier) || AUTO;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="modelpicker" ref={ref}>
      <button className="pill" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <Icon name="sparkle" size={15} className="accent" />
        <span>{current.label}</span>
        {current.tier !== "auto" && <span className="tierchip">{current.tier}</span>}
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <ul className="menu" role="listbox">
          {options.map((m) => (
            <li key={m.tier}>
              <button className={"menuitem" + (m.tier === tier ? " active" : "")} role="option" aria-selected={m.tier === tier}
                onClick={() => { setTier(m.tier); setOpen(false); }}>
                <span className="menutitle">
                  {m.label}
                  {m.tier !== "auto" && <span className="tierchip">{m.tier}</span>}
                </span>
                <span className="menusub">{m.description}{m.provider ? ` · ${m.provider}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
