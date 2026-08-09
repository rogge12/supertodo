import { describe, it, expect } from "vitest";
import { parseTask, nextOccurrence, taskScore } from "../src/lib/parser.js";

// Fixerad "nu": söndag 9 aug 2026, kl 12:00
const NOW = new Date(2026, 7, 9, 12, 0, 0);
const p = (text) => {
  const r = parseTask(text, new Date(NOW));
  return { title: r.title, due: r.due, time: r.time, priority: r.priority, repeat: r.repeat };
};

describe("parseTask — svenska fraser", () => {
  const cases = [
    ["ring Anna fre 10", { title: "Ring Anna", due: "2026-08-14", time: "10:00", priority: 0, repeat: null }],
    ["ring Anna fre 10 !viktigt", { title: "Ring Anna", due: "2026-08-14", time: "10:00", priority: 2, repeat: null }],
    ["handla mjölk imorgon", { title: "Handla mjölk", due: "2026-08-10", time: null, priority: 0, repeat: null }],
    ["handla mjölk imorgon 14:00", { title: "Handla mjölk", due: "2026-08-10", time: "14:00", priority: 0, repeat: null }],
    ["boka tandläkare", { title: "Boka tandläkare", due: null, time: null, priority: 0, repeat: null }],
    ["möte med teamet på tisdag kl 9", { title: "Möte med teamet", due: "2026-08-11", time: "09:00", priority: 0, repeat: null }],
    ["lämna in rapporten nästa vecka !!", { title: "Lämna in rapporten", due: "2026-08-10", time: null, priority: 2, repeat: null }],
    ["betala hyran 25/8", { title: "Betala hyran", due: "2026-08-25", time: null, priority: 0, repeat: null }],
    ["Sofias födelsedag 3 december", { title: "Sofias födelsedag", due: "2026-12-03", time: null, priority: 0, repeat: null }],
    ["träna idag 18.30", { title: "Träna", due: "2026-08-09", time: "18:30", priority: 0, repeat: null }],
    ["ring försäkringsbolaget kl 10", { title: "Ring försäkringsbolaget", due: "2026-08-10", time: "10:00", priority: 0, repeat: null }],
    ["städa köket !", { title: "Städa köket", due: null, time: null, priority: 1, repeat: null }],
    ["fixa cykeln i övermorgon", { title: "Fixa cykeln", due: "2026-08-11", time: null, priority: 0, repeat: null }],
    ["planera resan 2026-09-01", { title: "Planera resan", due: "2026-09-01", time: null, priority: 0, repeat: null }],
    ["månadsrapport den 1 sep", { title: "Månadsrapport", due: "2026-09-01", time: null, priority: 0, repeat: null }],
    ["ring mamma sön", { title: "Ring mamma", due: "2026-08-16", time: null, priority: 0, repeat: null }],
    ["vattna blommorna varje söndag", { title: "Vattna blommorna", due: "2026-08-09", time: null, priority: 0, repeat: { unit: "week", interval: 1, dow: 0 } }],
    ["ta medicin varje dag", { title: "Ta medicin", due: "2026-08-09", time: null, priority: 0, repeat: { unit: "day", interval: 1 } }],
    ["veckomöte varannan fredag 10", { title: "Veckomöte", due: "2026-08-14", time: "10:00", priority: 0, repeat: { unit: "week", interval: 2, dow: 5 } }],
    ["betala hyran 25/8 varje månad", { title: "Betala hyran", due: "2026-08-25", time: null, priority: 0, repeat: { unit: "month", interval: 1, day: 25 } }],
    ["gå igenom inkorgen varje vecka", { title: "Gå igenom inkorgen", due: "2026-08-09", time: null, priority: 0, repeat: { unit: "week", interval: 1, dow: 0 } }],
    ["sophämtning varje måndag kl 7 !viktigt", { title: "Sophämtning", due: "2026-08-10", time: "07:00", priority: 2, repeat: { unit: "week", interval: 1, dow: 1 } }],
  ];
  for (const [input, expected] of cases) {
    it(`"${input}"`, () => {
      expect(p(input)).toEqual(expected);
    });
  }
});

describe("nextOccurrence", () => {
  it("varje söndag från idag", () => {
    expect(nextOccurrence("2026-08-09", { unit: "week", interval: 1, dow: 0 }, "2026-08-09")).toBe("2026-08-16");
  });
  it("varje månad dag 31 (aug→sep klipps till 30)", () => {
    expect(nextOccurrence("2026-08-31", { unit: "month", interval: 1, day: 31 }, "2026-08-31")).toBe("2026-09-30");
  });
  it("försenad veckouppgift hoppar till nästa giltiga", () => {
    expect(nextOccurrence("2026-07-10", { unit: "week", interval: 1, dow: 5 }, "2026-08-09")).toBe("2026-08-14");
  });
  it("varannan dag", () => {
    expect(nextOccurrence("2026-08-09", { unit: "day", interval: 2 }, "2026-08-09")).toBe("2026-08-11");
  });
  it("varje månad dag 25", () => {
    expect(nextOccurrence("2026-08-25", { unit: "month", interval: 1, day: 25 }, "2026-08-25")).toBe("2026-09-25");
  });
});

describe("taskScore — rimlig ordning", () => {
  const today = "2026-08-09", nowMs = NOW.getTime();
  const s = (t) => taskScore(t, today, nowMs);
  it("försenad+viktig > idag", () => {
    expect(s({ priority: 2, due: "2026-08-01", createdAt: nowMs })).toBeGreaterThan(s({ priority: 0, due: "2026-08-09", createdAt: nowMs }));
  });
  it("idag > gammal inkorg", () => {
    expect(s({ priority: 0, due: "2026-08-09", createdAt: nowMs })).toBeGreaterThan(s({ priority: 0, due: null, createdAt: nowMs - 20 * 86400000 }));
  });
  it("gammal inkorg > nästa vecka", () => {
    expect(s({ priority: 0, due: null, createdAt: nowMs - 20 * 86400000 })).toBeGreaterThan(s({ priority: 0, due: "2026-08-14", createdAt: nowMs }));
  });
});
