import { parseTask, isoDate } from "./parser.js";
import { fmtRepeat } from "./format.js";

/* Skriver in valt datum/tid som text i inmatningsraden, så att det som
   sparas alltid är exakt det man ser — och går att finjustera för hand. */

export function dateToken(iso) {
  const d = new Date(iso + "T00:00:00");
  // Inom innevarande år räcker "12/8"; annars hela datumet för att undvika tvetydighet
  if (d.getFullYear() === new Date().getFullYear()) return d.getDate() + "/" + (d.getMonth() + 1);
  return iso;
}

export function composeText(rawText, due, time) {
  const p = parseTask(rawText || "");
  const bits = [p.title || ""];
  if (p.repeat) bits.push(fmtRepeat(p.repeat));
  if (due) bits.push(dateToken(due));
  if (time) bits.push("kl " + time);
  if (p.list) bits.push("#" + p.list);
  if (p.priority === 2) bits.push("!!");
  else if (p.priority === 1) bits.push("!");
  return bits.filter(Boolean).join(" ").trim();
}

/* Vad väljaren ska visa när den öppnas: det som redan står i texten,
   annars idag utan tid. */
export function initialFromText(rawText) {
  const p = parseTask(rawText || "");
  return { due: p.due || isoDate(new Date()), time: p.time, hadDate: !!p.due };
}
