/* ============================================================
   Delsteg: en uppgift som egentligen är flera.

   Delstegen bor i en array direkt på uppgiften — de nås alltid via
   sin uppgift och efterfrågas aldrig på tvären. Därför följer de
   också med i export och import utan att backup.js behöver veta
   att de finns.

   En nivå, medvetet. Delsteg med egna delsteg är projekthantering.

   Uppgifter som skapades innan delstegen fanns saknar fältet, så
   undefined behandlas som tomt överallt. Inget muteras.
   ============================================================ */
import { uid } from "./format.js";

const list = (steps) => steps || [];

export function stepProgress(task) {
  const steps = list(task && task.steps);
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}

export function addStep(steps, title) {
  const t = (title || "").trim();
  if (!t) return list(steps);
  return [...list(steps), { id: uid(), title: t, done: false }];
}

export function renameStep(steps, id, title) {
  const t = (title || "").trim();
  if (!t) return list(steps);
  return list(steps).map((s) => (s.id === id ? { ...s, title: t } : s));
}

export function removeStep(steps, id) {
  return list(steps).filter((s) => s.id !== id);
}

export function toggleStep(steps, id) {
  return list(steps).map((s) => (s.id === id ? { ...s, done: !s.done } : s));
}

/* Inför nästa varv av en återkommande uppgift */
export function resetSteps(steps) {
  return list(steps).map((s) => (s.done ? { ...s, done: false } : s));
}
