import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { nextOccurrence, isoDate, pad2 } from "./lib/parser.js";
import { DAY_NAMES, MONTH_NAMES, todayIso, fmtDateLong, sortByScore, ageDaysOf, uid } from "./lib/format.js";
import { mergeBackup, importSummary } from "./lib/backup.js";
import { resetSteps, toggleStep as toggleStepIn } from "./lib/steps.js";
import Capture from "./components/Capture.jsx";
import TaskItem from "./components/TaskItem.jsx";
import PlanSheet from "./components/PlanSheet.jsx";
import SettingsSheet from "./components/SettingsSheet.jsx";
import HomeView from "./components/HomeView.jsx";
import ListSheet from "./components/ListSheet.jsx";
import SearchView from "./components/SearchView.jsx";
import { Gear, Sun, Inbox, CalendarBig, PartyCheck, ArrowLeft, Dots, ListIcon, Search } from "./components/Icons.jsx";

const STORE_KEY = "supertodo.tasks.v1";
const META_KEY = "supertodo.meta.v1";
const LISTS_KEY = "supertodo.lists.v1";

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export default function App() {
  const [tasks, setTasks] = useState(() => loadJson(STORE_KEY, []));
  const [meta, setMeta] = useState(() => loadJson(META_KEY, {}));
  const [lists, setLists] = useState(() => loadJson(LISTS_KEY, []));
  // route: {kind:"home"} | {kind:"today"|"inbox"|"upcoming"} | {kind:"list", id}
  const [route, setRoute] = useState(() => {
    const m = loadJson(META_KEY, {});
    return m.startView === "today" ? { kind: "today" } : { kind: "home" };
  });
  const [listSheet, setListSheet] = useState(null); // null | {mode:"new"} | {mode:"edit", id}
  const [editingId, setEditingId] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null); // { msg, undoable }
  const lastDeleted = useRef(null);
  const toastTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(META_KEY, JSON.stringify(meta)); }, [meta]);
  useEffect(() => { localStorage.setItem(LISTS_KEY, JSON.stringify(lists)); }, [lists]);

  const today = todayIso();

  const flashToast = useCallback((msg, undoable = false) => {
    setToast({ msg, undoable });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), undoable ? 5000 : 4000);
  }, []);

  /* ---------- Uppgiftsoperationer ---------- */
  // #namn i texten vinner; annars hamnar uppgiften i listan man står i
  const resolveList = (name) => {
    if (!name) return route.kind === "list" ? route.id : null;
    const found = lists.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (found) return found.id;
    const created = { id: uid(), name, createdAt: Date.now() };
    setLists((ls) => [...ls, created]);
    return created.id;
  };

  const addTask = (p) => {
    const listId = resolveList(p.list);
    setTasks((ts) => [...ts, { id: uid(), title: p.title, due: p.due, time: p.time, priority: p.priority, repeat: p.repeat, listId, focusDate: null, done: false, doneAt: null, createdAt: Date.now() }]);
    if (route.kind === "list") return; // stanna kvar i listan
    if (route.kind === "home") {
      // På startsidan stannar vi kvar — räknarna uppdateras, och en rad berättar var det hamnade
      const l = listId ? lists.find((x) => x.id === listId) : null;
      flashToast("Lagt till i " + (l ? l.name : p.due && p.due <= today ? "Idag" : p.due ? "Kommande" : "Inkorgen"));
      return;
    }
    if (p.due && p.due <= today) setRoute({ kind: "today" });
    else if (p.due) setRoute({ kind: "upcoming" });
    else setRoute({ kind: "inbox" });
  };

  const toggleTask = (t) => {
    setTasks((ts) => {
      if (!t.done && t.repeat) {
        // Kopian minns vad som faktiskt gjordes den här gången; originalet
        // rullar fram med färska delsteg inför nästa varv
        const copy = { ...t, id: uid(), done: true, doneAt: Date.now(), repeat: null, repeatOf: t.id, focusDate: null };
        return ts.map((x) => (x.id === t.id ? { ...x, due: nextOccurrence(x.due || today, x.repeat, today), focusDate: null, steps: resetSteps(x.steps) } : x)).concat(copy);
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

  // Titel och delsteg sparas i ett svep — Avbryt slänger båda
  const saveEdit = (id, p, steps) => {
    const listId = p.list ? resolveList(p.list) : undefined;
    setTasks((ts) => ts.map((x) => (x.id === id
      ? { ...x, title: p.title, due: p.due, time: p.time, priority: p.priority, repeat: p.repeat, steps, ...(listId !== undefined ? { listId } : {}) }
      : x)));
    setEditingId(null);
  };

  // Direktoperation: att bocka av ett delsteg i listan sparar med en gång
  const toggleStep = (taskId, stepId) =>
    setTasks((ts) => ts.map((x) => (x.id === taskId ? { ...x, steps: toggleStepIn(x.steps, stepId) } : x)));

  /* ---------- Listor ---------- */
  const saveList = (name) => {
    if (listSheet?.mode === "new") {
      const created = { id: uid(), name, createdAt: Date.now() };
      setLists((ls) => [...ls, created]);
      setRoute({ kind: "list", id: created.id });
    } else if (listSheet?.mode === "edit") {
      setLists((ls) => ls.map((l) => (l.id === listSheet.id ? { ...l, name } : l)));
    }
    setListSheet(null);
  };

  const deleteList = (id) => {
    const moved = tasks.filter((t) => t.listId === id).length;
    setTasks((ts) => ts.map((t) => (t.listId === id ? { ...t, listId: null } : t)));
    setLists((ls) => ls.filter((l) => l.id !== id));
    setListSheet(null);
    setRoute({ kind: "home" });
    flashToast(moved ? "Listan borttagen — " + moved + " uppgifter flyttade till Inkorgen" : "Listan borttagen");
  };

  const setDue = (id, due) => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, due } : x)));

  // Kastar vidare på trasig fil — SettingsSheet fångar och säger till
  const importData = (data) => {
    const r = mergeBackup(data, tasks, lists);
    setTasks(r.tasks);
    setLists(r.lists);
    flashToast(importSummary(r));
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
    setRoute({ kind: "today" });
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
      if (e.key === "Escape") {
        setPlanOpen(false); setSettingsOpen(false); setEditingId(null);
        // funktionell form: effekten har inga beroenden och skulle annars läsa en gammal route
        setRoute((r) => (r.kind === "search" ? { kind: "home" } : r));
        return;
      }
      if (inInput) return;
      if (e.key === "n" || e.key === "/") { e.preventDefault(); inputRef.current?.focus(); }
      else if (e.key === "0" || e.key === "h") setRoute({ kind: "home" });
      else if (e.key === "1") setRoute({ kind: "today" });
      else if (e.key === "2") setRoute({ kind: "inbox" });
      else if (e.key === "3") setRoute({ kind: "upcoming" });
      else if (e.key === "p") setPlanOpen(true);
      else if (e.key === "f") { e.preventDefault(); setEditingId(null); setRoute({ kind: "search" }); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- Listvyn ---------- */
  const currentList = route.kind === "list" ? lists.find((l) => l.id === route.id) : null;
  const listTasks = useMemo(
    () => (currentList ? open.filter((x) => x.listId === currentList.id) : []),
    [open, currentList]
  );
  const listGroups = useMemo(() => {
    const withDate = listTasks.filter((x) => x.due).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : sortByScore(a, b)));
    const without = listTasks.filter((x) => !x.due).sort(sortByScore);
    const groups = [];
    for (const t of withDate) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.due) last.items.push(t);
      else groups.push({ date: t.due, items: [t] });
    }
    return { groups, without };
  }, [listTasks]);
  const listDone = useMemo(
    () => (currentList ? tasks.filter((x) => x.done && x.listId === currentList.id).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)) : []),
    [tasks, currentList]
  );
  const listCounts = useMemo(() => {
    const c = {};
    for (const t of open) if (t.listId) c[t.listId] = (c[t.listId] || 0) + 1;
    return c;
  }, [open]);

  /* ---------- Render ---------- */
  const now = new Date();
  const view = route.kind;
  const title = view === "home" ? "Super-todo"
    : view === "today" ? "Idag"
    : view === "inbox" ? "Inkorg"
    : view === "upcoming" ? "Kommande"
    : view === "search" ? "Sök"
    : currentList ? currentList.name : "Lista";
  const itemProps = {
    onToggle: toggleTask,
    onEdit: setEditingId,
    onSaveEdit: saveEdit,
    onCancelEdit: () => setEditingId(null),
    onRemove: removeTask,
    onSetDue: setDue,
    onToggleStep: toggleStep,
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
        <div className="hleft">
          {view !== "home" && (
            <button className="gear back" id="back" aria-label="Tillbaka" onClick={() => { setEditingId(null); setRoute({ kind: "home" }); }}>
              <ArrowLeft />
            </button>
          )}
          <h1 id="view-title">{title}</h1>
        </div>
        <div className="hright">
          {view === "list"
            ? <button className="gear" id="list-menu" aria-label="Listinställningar" onClick={() => setListSheet({ mode: "edit", id: route.id })}><Dots /></button>
            : view !== "search" && <span className="date">{DAY_NAMES[now.getDay()] + " " + now.getDate() + " " + MONTH_NAMES[now.getMonth()]}</span>}
          {view !== "search" && (
            <button className="gear" id="search-btn" title="Sök" aria-label="Sök" onClick={() => { setEditingId(null); setRoute({ kind: "search" }); }}><Search /></button>
          )}
          <button className="gear" id="gear" title="Inställningar" onClick={() => setSettingsOpen(true)}><Gear /></button>
        </div>
      </header>

      {/* Sökvyn har ett eget fält — man är inte inne för att lägga till något */}
      {view !== "search" && <Capture onAdd={addTask} inputRef={inputRef} />}

      {(view === "today" || view === "inbox" || view === "upcoming") && (
      <nav className="tabs">
        {[
          ["today", "Idag", todayAll.length],
          ["inbox", "Inkorg", inboxTasks.length],
          ["upcoming", "Kommande", upcoming.length],
        ].map(([v, label, n]) => (
          <button key={v} className={"tab" + (view === v ? " active" : "")} data-view={v} onClick={() => { setEditingId(null); setRoute({ kind: v }); }}>
            {label}
            {n > 0 && <span className="count">{n}</span>}
          </button>
        ))}
      </nav>
      )}

      <main id="list">
        {view === "home" && (
          <HomeView
            counts={{ today: todayAll.length, inbox: inboxTasks.length, upcoming: upcoming.length }}
            lists={lists}
            listCounts={listCounts}
            onOpen={(r) => { setEditingId(null); setRoute(r); }}
            onNewList={() => setListSheet({ mode: "new" })}
          />
        )}

        {view === "search" && (
          <SearchView
            tasks={tasks}
            lists={lists}
            renderItems={renderItems}
            onOpenList={(id) => { setEditingId(null); setRoute({ kind: "list", id }); }}
          />
        )}

        {view === "list" && currentList && (
          listTasks.length === 0 && listDone.length === 0 ? (
            <div className="empty"><span className="big"><ListIcon size={30} /></span>Listan är tom.<br />Skriv något där uppe så hamnar det här.</div>
          ) : (
            <>
              {listGroups.without.length > 0 && renderItems(listGroups.without)}
              {listGroups.groups.map((g) => (
                <div key={g.date}>
                  <div className="group-label">{fmtDateLong(g.date)}</div>
                  {renderItems(g.items, { hideDate: true })}
                </div>
              ))}
              {listDone.length > 0 && (
                <details className="done-section">
                  <summary>Avklarat ({listDone.length})</summary>
                  {renderItems(listDone)}
                </details>
              )}
            </>
          )
        )}

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
                <button onClick={() => setPlanOpen(true)}><Sun /> Planera om dagen</button>
              </div>
            )}
            {todayAll.length === 0 && doneToday.length === 0 && (
              <div className="empty"><span className="big"><Sun size={30} /></span>Inget planerat idag.<br />Skriv något där uppe för att komma igång.</div>
            )}
            {todayAll.length === 0 && doneToday.length > 0 && (
              <div className="empty"><span className="big"><PartyCheck /></span>Allt klart för idag — snyggt jobbat!</div>
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
            <div className="empty"><span className="big"><Inbox /></span>Inkorgen är tom.<br />Allt du skriver utan datum hamnar här.</div>
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
            <div className="empty"><span className="big"><CalendarBig /></span>Inget inplanerat framöver.</div>
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
        Kortkommandon: <b>n</b> ny uppgift · <b>f</b> sök · <b>1</b> <b>2</b> <b>3</b> byt vy · <b>p</b> planera dagen
      </div>

      {planOpen && planCandidates.length > 0 && (
        <PlanSheet candidates={planCandidates} onDone={finishPlan} onSkip={skipPlan} onClose={() => setPlanOpen(false)} />
      )}
      {listSheet && (() => {
        const l = listSheet.mode === "edit" ? lists.find((x) => x.id === listSheet.id) : null;
        return (
          <ListSheet
            initialName={l ? l.name : ""}
            taskCount={l ? tasks.filter((t) => t.listId === l.id).length : 0}
            onSave={saveList}
            onDelete={l ? () => deleteList(l.id) : undefined}
            onClose={() => setListSheet(null)}
          />
        );
      })()}

      {settingsOpen && (
        <SettingsSheet tasks={tasks} lists={lists} meta={meta} setMeta={setMeta} onImport={importData} onClose={() => setSettingsOpen(false)} onToast={flashToast} />
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
