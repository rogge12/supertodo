import { useEffect, useRef, useState } from "react";
import { parseTask } from "../lib/parser.js";
import { fmtDate, fmtRepeat, ageDaysOf, todayIso } from "../lib/format.js";
import { addDays, isoDate } from "../lib/parser.js";

export default function TaskItem({ task, focus, hideDate, nudge, editing, onToggle, onEdit, onSaveEdit, onCancelEdit, onRemove, onSetDue }) {
  const inputRef = useRef(null);
  const [val, setVal] = useState("");

  useEffect(() => {
    if (editing) {
      const v =
        task.title +
        (task.repeat ? " " + fmtRepeat(task.repeat) : task.due ? " " + task.due : "") +
        (task.time ? " " + task.time : "") +
        (task.priority === 2 ? " !!" : task.priority === 1 ? " !" : "");
      setVal(v);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(v.length, v.length);
      }, 0);
    }
  }, [editing]); // eslint-disable-line

  const saveEdit = () => {
    const p = parseTask(val);
    if (p.title) onSaveEdit(task.id, p);
    else onCancelEdit();
  };

  if (editing) {
    const preview = val.trim() ? parseTask(val.trim()) : null;
    return (
      <li className="task editing">
        <div className="task-body">
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
          {preview && (preview.due || preview.time || preview.priority || preview.repeat) && (
            <div className="edit-preview">
              {preview.repeat && <span className="chip">🔁 {fmtRepeat(preview.repeat)}</span>}
              {preview.due && <span className="chip">📅 {fmtDate(preview.due)}</span>}
              {preview.time && <span className="chip">⏰ {preview.time}</span>}
              {preview.priority === 2 && <span className="chip prio2">Viktigt</span>}
              {preview.priority === 1 && <span className="chip prio1">Prioriterad</span>}
            </div>
          )}
          {/* Synliga knappar så att man kan ta sig ur utan tangentbord */}
          <div className="edit-actions">
            <button type="button" className="edit-cancel" onClick={onCancelEdit}>Avbryt</button>
            <button type="button" className="edit-save" onClick={saveEdit}>Spara</button>
          </div>
          <div className="edit-hint">Enter för att spara · Esc för att avbryta</div>
        </div>
      </li>
    );
  }

  const overdue = !task.done && task.due && task.due < todayIso();
  const days = ageDaysOf(task);

  return (
    <li className={"task" + (task.done ? " done" : "") + (focus ? " focus" : "")}>
      <button
        className={"check" + (task.priority ? " prio" + task.priority : "")}
        title={task.done ? "Markera som ej klar" : "Klar!"}
        onClick={() => onToggle(task)}
      />
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {(task.due && !hideDate) || task.time || task.repeat || (task.priority === 2 && !task.done) ? (
          <div className="task-meta">
            {task.due && !hideDate && (
              overdue ? <span className="late">Försenad · {fmtDate(task.due)}</span> : <span>{fmtDate(task.due)}</span>
            )}
            {task.time && <span>kl {task.time}</span>}
            {task.repeat && <span>🔁 {fmtRepeat(task.repeat)}</span>}
            {task.priority === 2 && !task.done && <span style={{ color: "var(--danger)", fontWeight: 600 }}>Viktigt</span>}
          </div>
        ) : null}
        {nudge && !task.done && (
          <div className="nudge">
            <span className="q">
              Har legat {days >= 21 ? Math.floor(days / 7) + " veckor" : days + " dagar"} — göra, boka in eller släppa?
            </span>
            <button onClick={() => onSetDue(task.id, todayIso())}>Idag</button>
            <button onClick={() => onSetDue(task.id, isoDate(addDays(new Date(), 1)))}>Imorgon</button>
            <button onClick={() => onRemove(task.id)}>Släpp</button>
          </div>
        )}
      </div>
      <div className="task-actions">
        <button title="Redigera" onClick={() => onEdit(task.id)}>✎</button>
        <button title="Ta bort" onClick={() => onRemove(task.id)}>✕</button>
      </div>
    </li>
  );
}
