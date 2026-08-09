import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { nextOccurrence, isoDate, pad2 } from "./lib/parser.js";
import { DAY_NAMES, MONTH_NAMES, todayIso, fmtDateLong, sortByScore, ageDaysOf, uid } from "./lib/format.js";
import Capture from "./components/Capture.jsx";
import TaskItem from "./components/TaskItem.jsx";
import PlanSheet from "./components/PlanSheet.jsx";
import SettingsSheet from "./components/SettingsSheet.jsx";

const STORE_KEY = "supertodo.tasks.v1";
const META_KEY = "supertodo.meta.v1";

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export default function App() {
  const [tasks, setTasks] = useState(() => loadJson(STORE_KEY, []));
  const [meta, setMeta] = useState(() => loadJson(META_KEY, {}));
  const [view, setView] = useState("today");
  const [editingId, setEditingId] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null); // { msg, undoable }
  const lastDeleted = useRef(null);
  const toastTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(META_KEY, JSON.stringify(meta)); }, [meta]);

  const today = todayIso();

  const flashToast = useCallback((msg, undoable = false) => {
    setToast({ msg, undoable });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), undoable ? 5000 : 4000);
  }, []);

  /* ---------- Uppgiftsoperationer ---------- */
  const addTask = (p) => {
    setTasks((ts) => [...ts, { id: uid(), title: p.title, due: p.due, time: p.time, priority: p.priority, repeat: p.repeat, focusDate: null, done: false, doneAt: null, createdAt: Date.now() }]);
    if (p.due && p.due <= today) setView("today");
    else if (p.due) setView("upcoming");
    else setView("inbox");
  };

  const toggleTask = (t) => {
    setTasks((ts) => {
      if (!t.done && t.repeat) {
        const copy = { ...t, id: uid(), done: true, doneAt: Date.now(), repeat: null, repeatOf: t.id, focusDate: null };
        return ts.map((x) => (x.id === t.id ? { ...x, due: nextOccurrence(x.due || today, x.repeat, today), focusDate: null } : x)).concat(copy);
      }
      if (t.done && t.repeatOf) {
        const orig = ts.find((x) => x.id === t.repeatOf);
        if (orig && orig.repeat) {
          return ts.filter((x) => x.id !== t.id).map((x) => (x.id === t.repeatOf ? { ...x, due: t.due } : x));
        }
        return ts.map((x) => (x.id === t.id ? { ...x, done: false, doneAt: null } : x));
      }
      return ts.map((x) => (x.id === t.id ? { ...x, done: !x.done, doneAt: x.done ? null : Date.now() } : x));
    });
  };

  const removeTask = (id) => {
    setTasks((ts) => {
      const victim = ts.find((x) => x.id === id);
      if (victim) {
        lastDeleted.current = victim;
        flashToast("Borttagen: " + (victim.title.length > 26 ? victim.title.slice(0, 26) + "…" : victim.title), true);
      }
      return ts.filter((x) => x.id !== id);
    });
    setEditingId(null);
  };

  const undoDelete = () => {
    if (lastDeleted.current) {
      const t = lastDeleted.current;
      lastDeleted.current = null;
      setTasks((ts) => [...ts, t]);
    }
    setToast(null);
  };

  const saveEdit = (id, p) => {
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, title: p.title, due: p.due, time: p.time, priority: p.priority, repeat: p.repeat } : x)));
    setEditingId(null);
  };

  const setDue = (id, due) => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, due } : x)));

  const importTasks = (list) => {
    setTasks((ts) => {
      const have = new Set(ts.map((x) => x.id));
      const fresh = list.filter((t) => t && t.id && t.title && !have.has(t.id));
      flashToast(fresh.length ? fresh.length + " uppgifter importerade" : "Inget nytt att importera — allt fanns redan");
      return [...ts, ...fresh];
    });
    setSettingsOpen(false);
  };

  /* ---------- Härledda listor ---------- */
  const open = useMemo(() => tasks.filter((x) => !x.done), [tasks]);
  const todayAll = useMemo(() => open.filter((x) => x.due && x.due <= today), [open, today]);
  const focusTasks = useMemo(() => todayAll.filter((x) => x.focusDate === today).sort(sortByScore), [todayAll, today]);
  const otherToday = useMemo(() => todayAll.filter((x) => x.focusDate !== today).sort(sortByScore), [todayAll, today]);
  const inboxTasks = useMemo(() => open.filter((x) => !x.due).sort(sortByScore), [open]);
  const upcoming = useMemo(
    () => open.filter((x) => x.due && x.due > today).sort((a, b) => (a.due !== b.due ? (a.due < b.due ? -1 : 1) : sortByScore(a, b))),
    [open, today]
  );
  const doneToday = useMemo(
    () => tasks.filter((x) => x.done && x.doneAt && isoDate(new Date(x.doneAt)) === today).sort((a, b) => b.doneAt - a.doneAt),
    [tasks, today]
  );

  const planCandidates = useMemo(() => {
    const week = isoDate(new Date(Date.now() + 7 * 86400000));
    return tasks.filter((x) => !x.done && ((x.due && x.due <= today) || !x.due || (x.priority === 2 && x.due <= week))).sort(sortByScore);
  }, [tasks, today]);

  /* ---------- Planera min dag ---------- */
  const finishPlan = (sel) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (sel.has(t.id)) return { ...t, focusDate: today, due: !t.due || t.due > today ? today : t.due };
        if (t.focusDate === today) return { ...t, focusDate: null };
        return t;
      })
    );
    setMeta((m) => ({ ...m, lastPlanned: today }));
    setPlanOpen(false);
    setView("today");
  };
  const skipPlan = () => {
    setMeta((m) => ({ ...m, lastPlanned: today }));
    setPlanOpen(false);
  };

  // Auto-öppna morgonflödet en gång per dag
  useEffect(() => {
    if (meta.lastPlanned !== today && planCandidates.length > 0) {
      const id = setTimeout(() => setPlanOpen(true), 400);
      return () => clearTimeout(id);
    }
  }, []); // eslint-disable-line

  /* ---------- Påminnelser ---------- */
  useEffect(() => {
    const fire = (t) => {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) =>
              reg.showNotification(t.title, { body: "Kl " + t.time + (t.priority === 2 ? " · Viktigt" : ""), icon: "/icon-192.png", badge: "/icon-192.png", tag: "supertodo-" + t.id })
            );
          } else {
            new Notification(t.title, { body: "Kl " + t.time + (t.priority === 2 ? " · Viktigt" : ""), icon: "/icon-192.png", tag: "supertodo-" + t.id });
          }
        } catch { /* ignorera */ }
      }
      flashToast("⏰ " + t.title + " — kl " + t.time);
    };
    const check = () => {
      const now = new Date();
      const t = todayIso();
      const hhmm = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      setTasks((ts) => {
        let changed = false;
        const next = ts.map((task) => {
          if (task.done || !task.due || !task.time) return task;
          if (task.due > t || (task.due === t && task.time > hhmm)) return task;
          const stamp = task.due + " " + task.time;
          if (task.notified === stamp) return task;
          changed = true;
          const lateMin = (now - new Date(task.due + "T" + task.time + ":00")) / 60000;
          if (lateMin >= 0 && lateMin < 60) fire(task);
          return { ...task, notified: stamp };
        });
        return changed ? next : ts;
      });
    };
    check();
    const iv = setInterval(check, 30000);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [flashToast]);

  /* ---------- Kortkommandon ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const inInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
      if (e.key === "Escape") { setPlanOpen(false); setSettingsOpen(false); setEditingId(null); return; }
      if (inInput) return;
      if (e.key === "n" || e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
      else if (e.key === "1") setView("today");
      else if (e.key === "2") setView("inbox");
      else if (e.key === "3") setView("upcoming");
      else if (e.key === "p") setPlanOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- Render ---------- */
  const now = new Date();
  const itemProps = {
    onToggle: toggleTask,
    onEdit: setEditingId,
    onSaveEdit: saveEdit,
    onCancelEdit: () => setEditingId(null),
    onRemove: removeTask,
    onSetDue: setDue,
  };
  const renderItems = (items, extra = {}) => (
    <ul className="tasks">
      {items.map((t) => (
        <TaskItem key={t.id} task={t} editing={editingId === t.id} {...extra} {...itemProps} />
      ))}
    </ul>
  );

  const freshInbox = inboxTasks.filter((x) => ageDaysOf(x) < 14);
  const oldInbox = inboxTasks.filter((x) => ageDaysOf(x) >= 14);

  const upcomingGroups = [];
  for (const t of upcoming) {
    const last = upcomingGroups[upcomingGroups.length - 1];
    if (last && last.date === t.due) last.items.push(t);
    else upcomingGroups.push({ date: t.due, items: [t] });
  }

  return (
    <div className="app">
      <header>
        <h1 id="view-title">{view === "today" ? "Idag" : view === "inbox" ? "Inkorg" : "Kommande"}</h1>
        <div className="hright">
          <span className="date">{DAY_NAMES[now.getDay()] + " " + now.getDate() + " " + MONTH_NAMES[now.getMonth()]}</span>
          <button className="gear" id="gear" title="Inställningar" onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </header>

      <Capture onAdd={addTask} inputRef={inputRef} />

      <nav className="tabs">
        {[
          ["today", "Idag", todayAll.length],
          ["inbox", "Inkorg", inboxTasks.length],
          ["upcoming", "Kommande", upcoming.length],
        ].map(([v, label, n]) => (
          <button key={v} className={"tab" + (view === v ? " active" : "")} data-view={v} onClick={() => { setEditingId(null); setView(v); }}>
            {label}
            {n > 0 && <span className="count">{n}</span>}
          </button>
        ))}
      </nav>

      <main id="list">
        {view === "today" && (
          <>
            {meta.lastPlanned !== today && planCandidates.length > 0 && (
              <div className="plan-card">
                <div className="txt"><b>Planera min dag</b>Välj dagens 3–5 viktigaste — tar 30 sekunder.</div>
                <button id="open-plan" onClick={() => setPlanOpen(true)}>Planera</button>
              </div>
            )}
            {meta.lastPlanned === today && planCandidates.length > 0 && (
              <div className="replan">
                <button onClick={() => setPlanOpen(true)}>☀️ Planera om dagen</button>
              </div>
            )}
            {todayAll.length === 0 && doneToday.length === 0 && (
              <div className="empty"><span className="big">☀️</span>Inget planerat idag.<br />Skriv något där uppe för att komma igång.</div>
            )}
            {todayAll.length === 0 && doneToday.length > 0 && (
              <div className="empty"><span className="big">🎉</span>Allt klart för idag — snyggt jobbat!</div>
            )}
            {focusTasks.length > 0 ? (
              <>
                <div className="group-label focus">Dagens fokus</div>
                {renderItems(focusTasks, { focus: true })}
                {otherToday.length > 0 && (
                  <>
                    <div className="group-label">Mer idag</div>
                    {renderItems(otherToday)}
                  </>
                )}
              </>
            ) : (
              todayAll.length > 0 && renderItems(otherToday)
            )}
            {doneToday.length > 0 && (
              <details className="done-section">
                <summary>Avklarat ({doneToday.length})</summary>
                {renderItems(doneToday)}
              </details>
            )}
          </>
        )}

        {view === "inbox" &&
          (inboxTasks.length === 0 ? (
            <div className="empty"><span className="big">📥</span>Inkorgen är tom.<br />Allt du skriver utan datum hamnar här.</div>
          ) : (
            <>
              {freshInbox.length > 0 && renderItems(freshInbox)}
              {oldInbox.length > 0 && (
                <>
                  <div className="group-label">Har legat ett tag</div>
                  {renderItems(oldInbox, { nudge: true })}
                </>
              )}
            </>
          ))}

        {view === "upcoming" &&
          (upcoming.length === 0 ? (
            <div className="empty"><span className="big">🗓️</span>Inget inplanerat framöver.</div>
          ) : (
            upcomingGroups.map((g) => (
              <div key={g.date}>
                <div className="group-label">{fmtDateLong(g.date)}</div>
                {renderItems(g.items, { hideDate: true })}
              </div>
            ))
          ))}
      </main>

      <div className="hint">
        Kortkommandon: <b>n</b> ny uppgift · <b>1</b> <b>2</b> <b>3</b> byt vy · <b>p</b> planera dagen
      </div>

      {planOpen && planCandidates.length > 0 && (
        <PlanSheet candidates={planCandidates} onDone={finishPlan} onSkip={skipPlan} onClose={() => setPlanOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsSheet tasks={tasks} meta={meta} onImport={importTasks} onClose={() => setSettingsOpen(false)} onToast={flashToast} />
      )}

      {toast && (
        <div id="toast" className="show">
          <span id="toast-msg">{toast.msg}</span>
          {toast.undoable && <button id="toast-undo" onClick={undoDelete}>Ångra</button>}
        </div>
      )}
    </div>
  );
}
