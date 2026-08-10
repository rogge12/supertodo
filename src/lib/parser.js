/* ============================================================
   Svensk språktolkning: text → { title, due, time, priority, repeat }
   due = "YYYY-MM-DD" | null, time = "HH:MM" | null, priority = 0|1|2
   repeat = null | { unit: "day"|"week"|"month", interval: 1|2, dow?, day? }
   ============================================================ */
export const WEEKDAYS = [
  { names: ["måndagar", "måndag", "månd", "mån"], dow: 1 },
  { names: ["tisdagar", "tisdag", "tisd", "tis"], dow: 2 },
  { names: ["onsdagar", "onsdag", "onsd", "ons"], dow: 3 },
  { names: ["torsdagar", "torsdag", "torsd", "tors", "tor"], dow: 4 },
  { names: ["fredagar", "fredag", "fred", "fre"], dow: 5 },
  { names: ["lördagar", "lördag", "lörd", "lör"], dow: 6 },
  { names: ["söndagar", "söndag", "sönd", "sön"], dow: 0 },
];
const ALL_WD_NAMES = WEEKDAYS.flatMap((w) => w.names).join("|");
const MONTHS = {
  jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, mars: 2, apr: 3, april: 3,
  maj: 4, jun: 5, juni: 5, jul: 6, juli: 6, aug: 7, augusti: 7,
  sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};
// \b funkar inte med å/ä/ö — egna gränser:
const B1 = "(^|[\\s,.;])"; // vänster gräns (grupp)
const B2 = "(?=$|[\\s,.;!?])"; // höger gräns (lookahead)

export function pad2(n) { return String(n).padStart(2, "0"); }
export function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function nextDow(from, dow) { // nästa förekomst av veckodag (idag räknas om det är samma dag)
  const diff = (dow - from.getDay() + 7) % 7;
  return addDays(from, diff === 0 ? 0 : diff);
}
function dowOf(iso) { return new Date(iso + "T00:00:00").getDay(); }

function findWeekday(name) {
  name = name.toLowerCase();
  for (const wd of WEEKDAYS) if (wd.names.includes(name)) return wd.dow;
  return null;
}

// Bar timme direkt efter matchad datumtext: "fre 10", "imorgon 16", "varje fredag 10".
// Kräver att siffran avslutar strängen — annars skulle "imorgon 3 kilo potatis"
// tolka 3 som klockslag.
function grabBareHour(s, matchIndex, matchLen) {
  const rest = s.slice(matchIndex + matchLen);
  const hm = rest.match(/^\s(\d{1,2})\s*$/);
  if (hm && +hm[1] <= 23) {
    return { time: pad2(+hm[1]) + ":00", s: s.slice(0, matchIndex + matchLen) + rest.replace(hm[0], " ") };
  }
  return null;
}

export function parseTask(text, now) {
  now = now || new Date();
  let s = " " + text.trim() + " ";
  let due = null, time = null, priority = 0, repeat = null;

  // --- Prioritet ---
  if (/!!\s|!viktigt/i.test(s)) { priority = 2; s = s.replace(/\s*(!viktigt|!!)/gi, " "); }
  else if (/\s!(?=[\s,.]|$)/.test(s)) { priority = 1; s = s.replace(/\s!(?=[\s,.]|$)/, " "); }

  // --- Tid: "kl 10", "kl. 10.30", "10:00", "14.30" ---
  let m = s.match(new RegExp(B1 + "kl\\.?\\s?(\\d{1,2})(?:[:.](\\d{2}))?" + B2, "i"));
  if (m) {
    const h = +m[2], mi = m[3] ? +m[3] : 0;
    if (h <= 23 && mi <= 59) { time = pad2(h) + ":" + pad2(mi); s = s.replace(m[0], m[1]); }
  }
  if (!time) {
    m = s.match(new RegExp(B1 + "(\\d{1,2})[:.](\\d{2})" + B2));
    if (m && +m[2] <= 23 && +m[3] <= 59 && !(+m[2] === 0 && m[2].length === 1)) {
      time = pad2(+m[2]) + ":" + pad2(+m[3]);
      s = s.replace(m[0], m[1]);
    }
  }

  // --- Återkommande ---
  // "varje fredag" / "varannan fredag" / "varje fredag 10"
  m = s.match(new RegExp(B1 + "var(je|annan)\\s(" + ALL_WD_NAMES + ")" + B2, "i"));
  if (m) {
    const interval = m[2].toLowerCase() === "annan" ? 2 : 1;
    const dow = findWeekday(m[3]);
    repeat = { unit: "week", interval, dow };
    const bh = grabBareHour(s, m.index, m[0].length);
    if (!time && bh) { time = bh.time; s = bh.s; }
    s = s.replace(m[0], m[1]);
    due = isoDate(nextDow(now, dow));
  }
  // "varje dag" / "varannan dag"
  if (!repeat) {
    m = s.match(new RegExp(B1 + "var(je|annan)\\sdag" + B2, "i"));
    if (m) { repeat = { unit: "day", interval: m[2].toLowerCase() === "annan" ? 2 : 1 }; s = s.replace(m[0], m[1]); }
  }
  // "varje vecka" / "varannan vecka"
  if (!repeat) {
    m = s.match(new RegExp(B1 + "var(je|annan)\\svecka" + B2, "i"));
    if (m) { repeat = { unit: "week", interval: m[2].toLowerCase() === "annan" ? 2 : 1, dow: null }; s = s.replace(m[0], m[1]); }
  }
  // "varje månad"
  if (!repeat) {
    m = s.match(new RegExp(B1 + "varje\\smånad" + B2, "i"));
    if (m) { repeat = { unit: "month", interval: 1, day: null }; s = s.replace(m[0], m[1]); }
  }

  // --- Datum: relativa ord ---
  const rel = [
    { re: "i\\s?övermorgon", days: 2 },
    { re: "imorgon|i\\s?morgon|imorn", days: 1 },
    { re: "idag|i\\s?dag", days: 0 },
  ];
  for (const r of rel) {
    m = s.match(new RegExp(B1 + "(" + r.re + ")" + B2, "i"));
    if (m) {
      due = isoDate(addDays(now, r.days));
      const bh = grabBareHour(s, m.index, m[0].length);
      if (!time && bh) { time = bh.time; s = bh.s; }
      s = s.replace(m[0], m[1]);
      break;
    }
  }

  // "nästa vecka" → nästa måndag
  if (!due) {
    m = s.match(new RegExp(B1 + "nästa\\s?vecka" + B2, "i"));
    if (m) {
      const nm = nextDow(addDays(now, 1), 1);
      due = isoDate(nm);
      const bh = grabBareHour(s, m.index, m[0].length);
      if (!time && bh) { time = bh.time; s = bh.s; }
      s = s.replace(m[0], m[1]);
    }
  }

  // Veckodagar ("fre", "på fredag", "nästa fredag")
  if (!due) {
    for (const wd of WEEKDAYS) {
      const re = new RegExp(B1 + "(?:(på|nästa)\\s)?(" + wd.names.join("|") + ")" + B2, "i");
      m = s.match(re);
      if (m) {
        let d = nextDow(now, wd.dow);
        if (isoDate(d) === isoDate(now) && !/^på$/i.test(m[2] || "")) d = addDays(d, 7); // "fre" på en fredag → nästa fredag
        due = isoDate(d);
        const bh = grabBareHour(s, m.index, m[0].length);
        if (!time && bh) { time = bh.time; s = bh.s; }
        s = s.replace(m[0], m[1]);
        break;
      }
    }
  }

  // ISO-datum 2026-08-14
  if (!due) {
    m = s.match(new RegExp(B1 + "(\\d{4})-(\\d{2})-(\\d{2})" + B2));
    if (m) {
      due = m[2] + "-" + m[3] + "-" + m[4];
      const bh = grabBareHour(s, m.index, m[0].length);
      if (!time && bh) { time = bh.time; s = bh.s; }
      s = s.replace(m[0], m[1]);
    }
  }
  // "14/8"
  if (!due) {
    m = s.match(new RegExp(B1 + "(\\d{1,2})/(\\d{1,2})" + B2));
    if (m && +m[2] >= 1 && +m[2] <= 31 && +m[3] >= 1 && +m[3] <= 12) {
      let d = new Date(now.getFullYear(), +m[3] - 1, +m[2]);
      if (d < now && isoDate(d) !== isoDate(now)) d.setFullYear(d.getFullYear() + 1);
      due = isoDate(d);
      const bh = grabBareHour(s, m.index, m[0].length);
      if (!time && bh) { time = bh.time; s = bh.s; }
      s = s.replace(m[0], m[1]);
    }
  }
  // "14 aug", "3 december", "den 14 augusti"
  if (!due) {
    m = s.match(new RegExp(B1 + "(?:den\\s)?(\\d{1,2})\\s?(" + Object.keys(MONTHS).join("|") + ")" + B2, "i"));
    if (m && +m[2] >= 1 && +m[2] <= 31) {
      let d = new Date(now.getFullYear(), MONTHS[m[3].toLowerCase()], +m[2]);
      if (d < now && isoDate(d) !== isoDate(now)) d.setFullYear(d.getFullYear() + 1);
      due = isoDate(d);
      const bh = grabBareHour(s, m.index, m[0].length);
      if (!time && bh) { time = bh.time; s = bh.s; }
      s = s.replace(m[0], m[1]);
    }
  }

  // Tid utan datum → idag (eller imorgon om tiden redan passerat)
  if (time && !due) {
    const [h, mi] = time.split(":").map(Number);
    const t = new Date(now); t.setHours(h, mi, 0, 0);
    due = isoDate(t > now ? now : addDays(now, 1));
  }

  // Komplettera återkommande med startdatum
  if (repeat) {
    if (repeat.unit === "week") {
      if (repeat.dow == null) repeat.dow = due ? dowOf(due) : now.getDay();
      if (!due) due = isoDate(nextDow(now, repeat.dow));
    } else if (repeat.unit === "month") {
      repeat.day = due ? +due.slice(8, 10) : now.getDate();
      if (!due) due = isoDate(now);
    } else if (!due) {
      due = isoDate(now);
    }
  }

  // --- Titel: städa upp ---
  let title = s.replace(/\s+/g, " ").trim().replace(/[,;]\s*$/, "").trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, due, time, priority, repeat };
}

/* Nästa förekomst av en återkommande uppgift, alltid efter "idag" */
export function nextOccurrence(dueIso, repeat, todayIsoStr) {
  let d = new Date(dueIso + "T00:00:00");
  const today = new Date(todayIsoStr + "T00:00:00");
  const iv = repeat.interval || 1;
  const step = (x) => {
    if (repeat.unit === "day") return addDays(x, iv);
    if (repeat.unit === "week") return addDays(x, 7 * iv);
    // månad: behåll dagen i månaden, klipp vid månadens slut (31 → 30/28)
    const y = new Date(x.getFullYear(), x.getMonth() + iv, 1);
    const day = Math.min(repeat.day || x.getDate(), new Date(y.getFullYear(), y.getMonth() + 1, 0).getDate());
    y.setDate(day);
    return y;
  };
  do { d = step(d); } while (d <= today);
  return isoDate(d);
}

/* Poäng för smart prioritering: högre = viktigare just nu */
export function taskScore(t, todayIsoStr, nowMs) {
  let s = t.priority * 100;
  if (t.due) {
    if (t.due < todayIsoStr) {
      const late = Math.round((new Date(todayIsoStr + "T00:00:00") - new Date(t.due + "T00:00:00")) / 86400000);
      s += 60 + Math.min(30, late * 5);
    } else if (t.due === todayIsoStr) {
      s += 50;
      if (t.time) s += 5;
    } else {
      const ahead = Math.round((new Date(t.due + "T00:00:00") - new Date(todayIsoStr + "T00:00:00")) / 86400000);
      if (ahead <= 7) s += Math.max(0, 20 - 2 * ahead);
    }
  }
  const ageDays = Math.floor((nowMs - (t.createdAt || nowMs)) / 86400000);
  s += Math.min(20, ageDays);
  return s;
}
