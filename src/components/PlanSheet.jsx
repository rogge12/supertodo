import { Sun } from "./Icons.jsx";
import { useState } from "react";
import { fmtDate, ageDaysOf, todayIso } from "../lib/format.js";

const MAX_FOCUS = 5;

function Why({ t }) {
  const today = todayIso();
  const bits = [];
  if (t.due && t.due < today) bits.push(<span key="d" className="hot">Försenad · {fmtDate(t.due)}</span>);
  else if (t.due === today) bits.push(<span key="d">Idag{t.time ? " kl " + t.time : ""}</span>);
  else if (t.due) bits.push(<span key="d">{fmtDate(t.due)}</span>);
  if (t.priority === 2) bits.push(<span key="p" className="hot">Viktigt</span>);
  if (!t.due && ageDaysOf(t) >= 14) bits.push(<span key="a">Har legat {ageDaysOf(t)} dagar</span>);
  else if (!t.due) bits.push(<span key="a">Från inkorgen</span>);
  return <div className="why">{bits.map((b, i) => [i > 0 && " · ", b])}</div>;
}

export default function PlanSheet({ candidates, onDone, onSkip, onClose }) {
  const today = todayIso();
  const [sel, setSel] = useState(() => new Set(candidates.filter((x) => x.focusDate === today).map((x) => x.id)));

  const toggle = (id) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_FOCUS) next.add(id);
      return next;
    });
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2><Sun size={19} /> Planera min dag</h2>
        <div className="sub">Välj dagens 3–5 viktigaste. Resten ligger kvar och väntar — det är poängen.</div>
        <div className="plan-list">
          {candidates.map((t) => (
            <div key={t.id} className={"plan-item" + (sel.has(t.id) ? " selected" : "")} onClick={() => toggle(t.id)}>
              <span className="pick" />
              <div>
                <div>{t.title}</div>
                <Why t={t} />
              </div>
            </div>
          ))}
        </div>
        <div className="sheet-foot">
          <span className="counter">{sel.size} av {MAX_FOCUS} valda</span>
          <button className="skip" onClick={onSkip}>Hoppa över</button>
          <button className="go" id="plan-go" disabled={sel.size === 0} onClick={() => onDone(sel)}>Kör!</button>
        </div>
      </div>
    </div>
  );
}
