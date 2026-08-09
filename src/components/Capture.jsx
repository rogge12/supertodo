import { useState } from "react";
import { parseTask } from "../lib/parser.js";
import { fmtDate, fmtRepeat } from "../lib/format.js";

export default function Capture({ onAdd, inputRef }) {
  const [val, setVal] = useState("");
  const p = val.trim() ? parseTask(val.trim()) : null;

  const submit = () => {
    if (!val.trim()) return;
    const parsed = parseTask(val.trim());
    if (!parsed.title) return;
    onAdd(parsed);
    setVal("");
  };

  return (
    <>
      <div className="capture">
        <input
          ref={inputRef}
          id="capture-input"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          placeholder='Skriv t.ex. "ring Anna fre 10 !viktigt"'
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <button className="add-btn" title="Lägg till" disabled={!val.trim()} onClick={submit}>+</button>
      </div>
      <div className="preview">
        {p && p.repeat && <span className="chip">🔁 {fmtRepeat(p.repeat)}</span>}
        {p && p.due && <span className="chip">📅 {fmtDate(p.due)}</span>}
        {p && p.time && <span className="chip">⏰ {p.time}</span>}
        {p && p.priority === 2 && <span className="chip prio2">Viktigt</span>}
        {p && p.priority === 1 && <span className="chip prio1">Prioriterad</span>}
        {p && (p.due || p.time || p.priority || p.repeat) ? <span className="chip">→ {p.title || "…"}</span> : null}
      </div>
    </>
  );
}
