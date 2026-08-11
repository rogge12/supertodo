/* ============================================================
   Sökning över allt: uppgifter, deras delsteg, och listnamn.

   Frågan delas på mellanslag och alla termer måste matcha — det är
   skillnaden mellan sökning och filtrering. "vindskydd virke" ska
   hitta uppgiften som nämner båda, inte allt som nämner endera.

   Jämförelsen sker på gemener, men å, ä och ö viks inte ihop med
   a och o. De är egna bokstäver i svenskan, och en vikning skulle
   låta "hår" träffa "har".

   Ett listnamn ger träff på listan själv, inte på allt som råkar
   ligga i den — söker man "vindskydd" vill man ha listan.
   ============================================================ */
import { sortByScore } from "./format.js";

const fold = (s) => (s || "").toLowerCase();

export function tokenize(query) {
  return fold(query).split(/\s+/).filter(Boolean);
}

const hasAll = (terms, haystack) => terms.every((t) => haystack.includes(t));

export function searchTasks(query, tasks, lists) {
  const terms = tokenize(query);
  if (!terms.length) return { lists: [], open: [], done: [] };

  const matchedLists = (lists || []).filter((l) => hasAll(terms, fold(l.name)));

  const open = [], done = [];
  for (const task of tasks || []) {
    const steps = task.steps || [];
    const title = fold(task.title);
    const haystack = [title, ...steps.map((s) => fold(s.title))].join(" ");
    if (!hasAll(terms, haystack)) continue;

    // Delstegen som själva bär en term får peka ut sig i träffen
    const hitSteps = steps.filter((s) => terms.some((t) => fold(s.title).includes(t)));
    const inTitle = hasAll(terms, title);
    (task.done ? done : open).push({ task, steps: inTitle ? [] : hitSteps, inTitle });
  }

  // Träff i titeln väger tyngre än träff i ett delsteg; i övrigt appens vanliga ordning
  const rank = (a, b) => (a.inTitle !== b.inTitle ? (a.inTitle ? -1 : 1) : sortByScore(a.task, b.task));
  open.sort(rank);
  done.sort((a, b) => (b.task.doneAt || 0) - (a.task.doneAt || 0));

  return { lists: matchedLists, open, done };
}

/* Var ligger uppgiften? Halva svaret på frågan man ställde. */
export function taskLocation(task, lists, todayIsoStr) {
  const l = task.listId && (lists || []).find((x) => x.id === task.listId);
  if (l) return l.name;
  if (!task.due) return "Inkorg";
  return task.due <= todayIsoStr ? "Idag" : "Kommande";
}
