import { isoDate, addDays, taskScore } from "./parser.js";

export const DAY_NAMES = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
export const MONTH_NAMES = ["jan", "feb", "mars", "april", "maj", "juni", "juli", "aug", "sep", "okt", "nov", "dec"];

export function todayIso() { return isoDate(new Date()); }

export function fmtDate(iso) {
  const t = todayIso();
  if (iso === t) return "idag";
  if (iso === isoDate(addDays(new Date(), 1))) return "imorgon";
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - new Date(t + "T00:00:00")) / 86400000);
  if (diff > 1 && diff < 7) return DAY_NAMES[d.getDay()];
  return d.getDate() + " " + MONTH_NAMES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : "");
}

export function fmtDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  const t = todayIso();
  if (iso === t) return "Idag";
  if (iso === isoDate(addDays(new Date(), 1))) return "Imorgon";
  const name = DAY_NAMES[d.getDay()];
  return name.charAt(0).toUpperCase() + name.slice(1) + " " + d.getDate() + " " + MONTH_NAMES[d.getMonth()];
}

export function fmtRepeat(r) {
  if (!r) return "";
  if (r.unit === "day") return r.interval === 2 ? "varannan dag" : "varje dag";
  if (r.unit === "week") {
    if (r.dow == null) return r.interval === 2 ? "varannan vecka" : "varje vecka";
    return (r.interval === 2 ? "varannan " : "varje ") + DAY_NAMES[r.dow];
  }
  return "varje månad";
}

export function ageDaysOf(t) { return Math.floor((Date.now() - (t.createdAt || Date.now())) / 86400000); }

export function sortByScore(a, b) {
  const t = todayIso(), n = Date.now();
  const d = taskScore(b, t, n) - taskScore(a, t, n);
  if (d) return d;
  if ((a.time || "99") !== (b.time || "99")) return (a.time || "99") < (b.time || "99") ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
