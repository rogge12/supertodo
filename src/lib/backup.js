/* ============================================================
   Säkerhetskopiering: bygga en backupfil och läsa tillbaka den.

   Export/import är appens enda väg mellan enheter, så listorna
   måste följa med — inte bara uppgifterna. Äldre filer (version 4
   och tidigare) saknar dem, och läses fortfarande.

   Import lägger till, den skriver aldrig över: uppgifter man redan
   har lämnas i fred, och listor med samma namn slås ihop.
   ============================================================ */
import { uid } from "./format.js";

export const BACKUP_VERSION = 5;

export function buildBackup(tasks, lists, meta) {
  return {
    app: "supertodo",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    lists,
    meta,
  };
}

/* Slår ihop en inläst backup med det man redan har.
   Returnerar { tasks, lists, addedTasks, addedLists } — inget muteras. */
export function mergeBackup(data, currentTasks, currentLists) {
  // En riktigt gammal fil är bara en array av uppgifter
  const incomingTasks = Array.isArray(data) ? data : data && data.tasks;
  if (!Array.isArray(incomingTasks)) throw new Error("fel format");
  const incomingLists = (!Array.isArray(data) && Array.isArray(data.lists) && data.lists) || [];

  /* ---------- Listor ---------- */
  const lists = [...currentLists];
  const byName = new Map(lists.map((l) => [l.name.toLowerCase(), l]));
  const usedIds = new Set(lists.map((l) => l.id));
  const remap = new Map(); // listId i filen → listId här
  let addedLists = 0;

  for (const l of incomingLists) {
    if (!l || !l.id || !l.name) continue;
    const twin = byName.get(l.name.toLowerCase());
    if (twin) {
      remap.set(l.id, twin.id); // samma namn = samma lista
      continue;
    }
    // Nytt namn, men id:t kan krocka med en lista som heter något annat
    const id = usedIds.has(l.id) ? uid() : l.id;
    const created = { ...l, id };
    lists.push(created);
    byName.set(created.name.toLowerCase(), created);
    usedIds.add(id);
    remap.set(l.id, id);
    addedLists++;
  }

  /* ---------- Uppgifter ---------- */
  const tasks = [...currentTasks];
  const have = new Set(tasks.map((t) => t.id));
  const knownLists = new Set(lists.map((l) => l.id));
  let addedTasks = 0;

  for (const t of incomingTasks) {
    if (!t || !t.id || !t.title || have.has(t.id)) continue;
    // Peka om till rätt lista här, och släpp listor som inte finns
    const mapped = t.listId ? remap.get(t.listId) ?? t.listId : null;
    const listId = mapped && knownLists.has(mapped) ? mapped : null;
    tasks.push({ ...t, listId });
    have.add(t.id);
    addedTasks++;
  }

  return { tasks, lists, addedTasks, addedLists };
}

/* Kvitto på vad importen gjorde, i klartext */
export function importSummary({ addedTasks, addedLists }) {
  if (!addedTasks && !addedLists) return "Inget nytt att importera — allt fanns redan";
  const bits = [];
  if (addedTasks) bits.push(addedTasks + (addedTasks === 1 ? " uppgift" : " uppgifter"));
  if (addedLists) bits.push(addedLists + (addedLists === 1 ? " lista" : " listor"));
  return bits.join(" och ") + " importerade";
}
