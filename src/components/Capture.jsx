import { useState } from "react";
import { parseTask } from "../lib/parser.js";
import { fmtDate, fmtRepeat } from "../lib/format.js";
import HelpSheet from "./HelpSheet.jsx";
import DateTimeSheet from "./DateTimeSheet.jsx";
import { composeText, initialFromText } from "../lib/compose.js";
import { Plus, Calendar, Clock, Repeat, Flag, Bulb } from "./Icons.jsx";

export default function Capture({ onAdd, inputRef }) {
  const [val, setVal] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const p = val.trim() ? parseTask(val.trim()) : null;
  const parsedSomething = p && (p.due || p.time || p.priority || p.repeat);

  const submit = () => {
    if (!val.trim()) return;
    const parsed = parseTask(val.trim());
    if (!parsed.title) return;
    onAdd(parsed);
    setVal("");
  };

  const pickExample = (text) => {
    setVal(text);
    setHelpOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
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
        <button className="cal-btn" title="Välj datum och tid" aria-label="Välj datum och tid"
                onClick={() => setPickerOpen(true)}><Calendar size={19} /></button>
        <button className="add-btn" title="Lägg till" disabled={!val.trim()} onClick={submit}><Plus /></button>
      </div>
      <div className="preview">
        {p && p.repeat && <span className="chip"><Repeat /> {fmtRepeat(p.repeat)}</span>}
        {p && p.due && <span className="chip"><Calendar /> {fmtDate(p.due)}</span>}
        {p && p.time && <span className="chip"><Clock /> {p.time}</span>}
        {p && p.priority === 2 && <span className="chip prio2"><Flag /> Viktigt</span>}
        {p && p.priority === 1 && <span className="chip prio1"><Flag /> Prioriterad</span>}
        {parsedSomething ? <span className="chip">→ {p.title || "…"}</span> : null}
        {/* Utan datum/tid: påminn om att det går, och visa vägen till hjälpen */}
        {!parsedSomething && (
          <button className="chip chip-help" id="help-btn" onClick={() => setHelpOpen(true)}>
            <Bulb /> Så sätter du datum &amp; tid
          </button>
        )}
      </div>
      {helpOpen && <HelpSheet onPick={pickExample} onClose={() => setHelpOpen(false)} />}
      {pickerOpen && (() => {
        const init = initialFromText(val);
        return (
          <DateTimeSheet
            initialDue={init.hadDate ? init.due : null}
            initialTime={init.time}
            onApply={(due, time) => {
              setVal(composeText(val, due, time));
              setPickerOpen(false);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            onClose={() => setPickerOpen(false)}
          />
        );
      })()}
    </>
  );
}
