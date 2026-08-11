import { useEffect, useMemo, useRef, useState } from "react";
import { searchTasks, taskLocation } from "../lib/search.js";
import { todayIso } from "../lib/format.js";
import { Search, ListIcon, Steps } from "./Icons.jsx";

/* Sökvyn: ett fält och träffarna under.

   Fältet ersätter Capture här — man är inte inne för att lägga till
   något. Varje träff säger var uppgiften ligger, för det är halva
   svaret på frågan man ställde. */
export default function SearchView({ tasks, lists, renderItems, onOpenList }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const today = todayIso();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const res = useMemo(() => searchTasks(q, tasks, lists), [q, tasks, lists]);
  const hits = res.open.length + res.done.length + res.lists.length;

  return (
    <>
      <div className="capture search-field">
        <Search size={18} />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder="Sök i uppgifter, delsteg och listor"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button className="search-clear" aria-label="Rensa" onClick={() => { setQ(""); inputRef.current?.focus(); }}>×</button>}
      </div>

      {!q.trim() && (
        <div className="empty">
          <span className="big"><Search size={30} /></span>
          Sök i allt du har.<br />Titlar, delsteg och listnamn.
        </div>
      )}

      {q.trim() && hits === 0 && (
        <div className="empty">
          <span className="big"><Search size={30} /></span>
          Inget matchar ”{q.trim()}”.
        </div>
      )}

      {res.lists.length > 0 && (
        <>
          <div className="group-label">Listor</div>
          <ul className="tasks">
            {res.lists.map((l) => (
              <li key={l.id} className="task">
                <button className="nav-row" onClick={() => onOpenList(l.id)}>
                  <span className="nav-icon"><ListIcon size={18} /></span>
                  <span className="nav-label">{l.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {res.open.length > 0 && (
        <>
          {res.lists.length > 0 && <div className="group-label">Uppgifter</div>}
          {renderItems(res.open.map((h) => h.task), {
            hitInfo: (task) => {
              const h = res.open.find((x) => x.task.id === task.id);
              return { where: taskLocation(task, lists, today), steps: h ? h.steps : [] };
            },
          })}
        </>
      )}

      {res.done.length > 0 && (
        <details className="done-section">
          <summary>Avklarat ({res.done.length})</summary>
          {renderItems(res.done.map((h) => h.task), {
            hitInfo: (task) => {
              const h = res.done.find((x) => x.task.id === task.id);
              return { where: taskLocation(task, lists, today), steps: h ? h.steps : [] };
            },
          })}
        </details>
      )}
    </>
  );
}

/* Raden som visar var träffen kom ifrån — används av TaskItem */
export function HitWhere({ where, steps }) {
  return (
    <div className="hit-where">
      <span className="hit-loc">{where}</span>
      {steps.map((s) => (
        <span key={s.id} className="hit-step"><Steps /> {s.title}</span>
      ))}
    </div>
  );
}
