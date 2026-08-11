import { useEffect, useRef, useState } from "react";
import { parseTask, addDays, isoDate } from "../lib/parser.js";
import { fmtDate, fmtRepeat, ageDaysOf, todayIso } from "../lib/format.js";
import { Chevron, Trash, Calendar, Clock, Repeat, Flag, Steps } from "./Icons.jsx";
import DateTimeSheet from "./DateTimeSheet.jsx";
import { composeText, initialFromText } from "../lib/compose.js";
import StepEditor from "./StepEditor.jsx";
import { HitWhere } from "./SearchView.jsx";
import { stepProgress, addStep } from "../lib/steps.js";

const OPEN_AT = -92;   // hur långt raden vilar när "Ta bort" är framme
const TRIGGER = -46;   // hur långt man måste svepa för att den ska fastna
const MAX = -112;

export default function TaskItem({ task, focus, hideDate, nudge, editing, hitInfo, onToggle, onEdit, onSaveEdit, onCancelEdit, onRemove, onSetDue, onToggleStep }) {
  const inputRef = useRef(null);
  const [val, setVal] = useState("");
  const [offset, setOffsetState] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openSteps, setOpenSteps] = useState(false); // utfällt i listan — vytillstånd, sparas inte
  const [steps, setStepsState] = useState([]);
  // Ett delsteg som skrivits men inte bekräftats sparas när fältet tappar fokus.
  // Trycker man direkt på Spara hinner den uppdateringen inte fram till klick-
  // hanteraren, så positionen speglas i en ref precis som svepets offset.
  const stepsRef = useRef([]);
  const setSteps = (v) => { stepsRef.current = v; setStepsState(v); };
  const pendingStep = useRef(null); // delsteg som skrivits men inte bekräftats med Enter
  const drag = useRef({ x: 0, y: 0, base: 0, axis: null, moved: false });
  // Positionen speglas i en ref: flera touchmove kan hinna före en omritning,
  // och då är state-värdet i touchend-stängningen inaktuellt.
  const offsetRef = useRef(0);
  const setOffset = (v) => { offsetRef.current = v; setOffsetState(v); };

  useEffect(() => {
    if (editing) {
      const v =
        task.title +
        (task.repeat ? " " + fmtRepeat(task.repeat) : task.due ? " " + task.due : "") +
        (task.time ? " " + task.time : "") +
        (task.priority === 2 ? " !!" : task.priority === 1 ? " !" : "");
      setVal(v);
      setSteps(task.steps || []);
      pendingStep.current = null;
      setOffset(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(v.length, v.length);
      }, 0);
    }
  }, [editing]); // eslint-disable-line

  const saveEdit = () => {
    const p = parseTask(val);
    // Ett halvskrivet delsteg ska inte gå förlorat för att man tryckte Spara
    const steps = addStep(stepsRef.current, pendingStep.current);
    if (p.title) onSaveEdit(task.id, p, steps);
    else onCancelEdit();
  };

  /* ---------- Svep ---------- */
  const onTouchStart = (e) => {
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, base: offsetRef.current, axis: null, moved: false };
  };
  const onTouchMove = (e) => {
    const d = drag.current;
    const t = e.touches[0];
    const dx = t.clientX - d.x;
    const dy = t.clientY - d.y;
    if (d.axis === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") setSwiping(true);
    }
    if (d.axis !== "x") return;
    d.moved = true;
    const next = Math.max(MAX, Math.min(0, d.base + dx));
    setOffset(next);
  };
  const onTouchEnd = () => {
    const d = drag.current;
    setSwiping(false);
    if (d.axis === "x") setOffset(offsetRef.current < TRIGGER ? OPEN_AT : 0);
    d.axis = null;
  };

  const onRowClick = () => {
    if (drag.current.moved) { drag.current.moved = false; return; } // det var ett svep
    if (offsetRef.current !== 0) { setOffset(0); return; }          // stäng först
    onEdit(task.id);
  };

  /* ---------- Redigeringsläge ---------- */
  if (editing) {
    const p = val.trim() ? parseTask(val.trim()) : null;
    const shows = p && (p.due || p.time || p.priority || p.repeat);
    return (
      <li className="task editing">
        <div className="task-slide">
          <input
            ref={inputRef}
            className="edit-input"
            enterKeyHint="done"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              else if (e.key === "Escape") onCancelEdit();
            }}
          />
          {shows && (
            <div className="edit-preview">
              {p.repeat && <span className="chip"><Repeat /> {fmtRepeat(p.repeat)}</span>}
              {p.due && <span className="chip"><Calendar /> {fmtDate(p.due)}</span>}
              {p.time && <span className="chip"><Clock /> {p.time}</span>}
              {p.priority === 2 && <span className="chip prio2"><Flag /> Viktigt</span>}
              {p.priority === 1 && <span className="chip prio1"><Flag /> Prioriterad</span>}
            </div>
          )}
          <StepEditor steps={steps} onChange={setSteps} pendingRef={pendingStep} />
          <div className="edit-actions">
            <button type="button" className="edit-delete" onClick={() => onRemove(task.id)}>Ta bort</button>
            <button type="button" className="edit-cal" title="Välj datum och tid" aria-label="Välj datum och tid"
                    onClick={() => setPickerOpen(true)}><Calendar size={18} /></button>
            <button type="button" className="edit-cancel" onClick={onCancelEdit}>Avbryt</button>
            <button type="button" className="edit-save" onClick={saveEdit}>Spara</button>
          </div>
          <div className="edit-hint">Enter sparar · Esc avbryter</div>
        </div>
        {pickerOpen && (() => {
          const init = initialFromText(val);
          return (
            <DateTimeSheet
              initialDue={init.hadDate ? init.due : null}
              initialTime={init.time}
              onApply={(due, time) => { setVal(composeText(val, due, time)); setPickerOpen(false); }}
              onClose={() => setPickerOpen(false)}
            />
          );
        })()}
      </li>
    );
  }

  /* ---------- Vanlig rad ---------- */
  const overdue = !task.done && task.due && task.due < todayIso();
  const days = ageDaysOf(task);
  // Ett "idag" på varje rad i Idag-vyn säger inget — visa datumet bara när det tillför något
  const showDate = task.due && !hideDate && (overdue || task.due !== todayIso());
  const prog = stepProgress(task);
  const hasMeta = showDate || task.time || task.repeat || prog.total > 0 || (task.priority === 2 && !task.done);

  return (
    <li className={"task" + (task.done ? " done" : "") + (focus ? " focus" : "") + (swiping ? " swiping" : "") + (openSteps && prog.total > 0 ? " steps-open" : "")}>
      <div className="task-open" aria-hidden={offset === 0}>
        <button type="button" tabIndex={offset === 0 ? -1 : 0} onClick={() => onRemove(task.id)}>
          <Trash />
          Ta bort
        </button>
      </div>
      <div
        className="task-slide"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onRowClick}
      >
        <button
          className={"check" + (task.priority ? " prio" + task.priority : "")}
          title={task.done ? "Markera som ej klar" : "Klar!"}
          onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        />
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          {hasMeta && (
            <div className="task-meta">
              {showDate && (
                overdue
                  ? <span className="late"><Calendar /> Försenad · {fmtDate(task.due)}</span>
                  : <span><Calendar /> {fmtDate(task.due)}</span>
              )}
              {task.time && <span><Clock /> {task.time}</span>}
              {task.repeat && <span><Repeat /> {fmtRepeat(task.repeat)}</span>}
              {prog.total > 0 && (
                <button
                  type="button"
                  className={"step-count" + (openSteps ? " open" : "")}
                  aria-expanded={openSteps}
                  onClick={(e) => { e.stopPropagation(); setOpenSteps((o) => !o); }}
                >
                  <Steps /> {prog.done} av {prog.total}
                </button>
              )}
              {task.priority === 2 && !task.done && <span className="imp"><Flag /> Viktigt</span>}
            </div>
          )}
          {hitInfo && <HitWhere {...hitInfo(task)} />}
          {openSteps && prog.total > 0 && (
            <ul className="steps-list" onClick={(e) => e.stopPropagation()}>
              {(task.steps || []).map((s) => (
                <li key={s.id} className={s.done ? "done" : ""}>
                  <button
                    type="button"
                    className={"step-check" + (s.done ? " on" : "")}
                    aria-label={s.done ? "Markera som ej klar" : "Klar"}
                    onClick={() => onToggleStep(task.id, s.id)}
                  />
                  <span>{s.title}</span>
                </li>
              ))}
            </ul>
          )}
          {nudge && !task.done && (
            <div className="nudge" onClick={(e) => e.stopPropagation()}>
              <span className="q">
                Har legat {days >= 21 ? Math.floor(days / 7) + " veckor" : days + " dagar"} — göra, boka in eller släppa?
              </span>
              <button onClick={() => onSetDue(task.id, todayIso())}>Idag</button>
              <button onClick={() => onSetDue(task.id, isoDate(addDays(new Date(), 1)))}>Imorgon</button>
              <button onClick={() => onRemove(task.id)}>Släpp</button>
            </div>
          )}
        </div>
        <span className="task-chev"><Chevron /></span>
      </div>
    </li>
  );
}
