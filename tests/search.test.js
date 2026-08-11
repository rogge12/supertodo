import { describe, it, expect } from "vitest";
import { searchTasks, taskLocation } from "../src/lib/search.js";

const t = (id, title, extra = {}) => ({
  id, title, due: null, time: null, priority: 0, repeat: null, listId: null,
  focusDate: null, done: false, doneAt: null, createdAt: 1, ...extra,
});
const l = (id, name) => ({ id, name, createdAt: 1 });

const TASKS = [
  t("1", "Bygg vindskyddet", { steps: [{ id: "s1", title: "Köp virke", done: false }, { id: "s2", title: "Gjut plintar", done: false }] }),
  t("2", "Ring tandläkaren"),
  t("3", "Köp mjölk"),
  t("4", "Skicka kontraktet", { done: true, doneAt: 2 }),
];
const LISTS = [l("l1", "Vindskydd"), l("l2", "Jobb")];
const run = (q) => searchTasks(q, TASKS, LISTS);

describe("searchTasks — grunderna", () => {
  it("hittar på titel", () => {
    expect(run("tandläkaren").open.map((h) => h.task.id)).toEqual(["2"]);
  });

  it("ger tomt resultat för tom fråga", () => {
    expect(run("")).toEqual({ lists: [], open: [], done: [] });
    expect(run("   ")).toEqual({ lists: [], open: [], done: [] });
  });

  it("hittar på delsträng mitt i ett ord", () => {
    expect(run("skydd").open.map((h) => h.task.id)).toEqual(["1"]);
  });

  it("ger tomt resultat när inget matchar", () => {
    const r = run("finnsinte");
    expect(r.open).toEqual([]);
    expect(r.done).toEqual([]);
    expect(r.lists).toEqual([]);
  });
});

describe("searchTasks — versaler och svenska bokstäver", () => {
  it("bryr sig inte om versaler", () => {
    expect(run("TANDLÄKAREN").open.map((h) => h.task.id)).toEqual(["2"]);
    expect(run("bYgG").open.map((h) => h.task.id)).toEqual(["1"]);
  });

  it("viker inte ihop å ä ö med a och o — de är egna bokstäver", () => {
    expect(run("kop").open).toEqual([]);       // ska inte hitta "Köp"
    expect(run("tandlakaren").open).toEqual([]); // ska inte hitta "tandläkaren"
    // "köp" finns både som titel (Köp mjölk) och som delsteg (Köp virke) — titeln först
    expect(run("köp").open.map((h) => h.task.id)).toEqual(["3", "1"]);
  });
});

describe("searchTasks — flera termer", () => {
  it("kräver att alla termer matchar", () => {
    expect(run("bygg vindskyddet").open.map((h) => h.task.id)).toEqual(["1"]);
    expect(run("bygg tandläkaren").open).toEqual([]);
  });

  it("bryr sig inte om ordningen mellan termerna", () => {
    expect(run("vindskyddet bygg").open.map((h) => h.task.id)).toEqual(["1"]);
  });

  it("låter termer matcha i olika fält", () => {
    // "bygg" i titeln, "virke" i ett delsteg
    expect(run("bygg virke").open.map((h) => h.task.id)).toEqual(["1"]);
  });

  it("struntar i extra mellanslag", () => {
    expect(run("  bygg   vindskyddet  ").open.map((h) => h.task.id)).toEqual(["1"]);
  });
});

describe("searchTasks — delsteg", () => {
  it("hittar uppgiften via ett delsteg", () => {
    const r = run("plintar");
    expect(r.open.map((h) => h.task.id)).toEqual(["1"]);
  });

  it("pekar ut vilket delsteg som matchade", () => {
    expect(run("plintar").open[0].steps.map((s) => s.title)).toEqual(["Gjut plintar"]);
  });

  it("lämnar steps tomt när träffen satt i titeln", () => {
    expect(run("tandläkaren").open[0].steps).toEqual([]);
  });

  it("klarar uppgifter utan delsteg", () => {
    expect(() => run("ring")).not.toThrow();
  });
});

describe("searchTasks — listor", () => {
  it("hittar listor på namn", () => {
    expect(run("vindskydd").lists.map((x) => x.id)).toEqual(["l1"]);
  });

  it("drar inte in listans uppgifter bara för att listan matchar", () => {
    const tasks = [t("9", "Helt annat", { listId: "l1" })];
    const r = searchTasks("vindskydd", tasks, LISTS);
    expect(r.lists.map((x) => x.id)).toEqual(["l1"]);
    expect(r.open).toEqual([]);
  });
});

describe("searchTasks — avklarade", () => {
  it("håller avklarade skilda från öppna", () => {
    const r = run("kontraktet");
    expect(r.open).toEqual([]);
    expect(r.done.map((h) => h.task.id)).toEqual(["4"]);
  });
});

describe("taskLocation", () => {
  const TODAY = "2026-08-10";

  it("namnger listan när uppgiften ligger i en", () => {
    expect(taskLocation(t("1", "x", { listId: "l1" }), LISTS, TODAY)).toBe("Vindskydd");
  });

  it("säger Inkorg när uppgiften saknar datum", () => {
    expect(taskLocation(t("1", "x"), LISTS, TODAY)).toBe("Inkorg");
  });

  it("säger Idag för dagens och försenade uppgifter", () => {
    expect(taskLocation(t("1", "x", { due: TODAY }), LISTS, TODAY)).toBe("Idag");
    expect(taskLocation(t("1", "x", { due: "2026-08-01" }), LISTS, TODAY)).toBe("Idag");
  });

  it("säger Kommande för framtida uppgifter", () => {
    expect(taskLocation(t("1", "x", { due: "2026-09-01" }), LISTS, TODAY)).toBe("Kommande");
  });

  it("låter listan vinna över datumet", () => {
    expect(taskLocation(t("1", "x", { due: TODAY, listId: "l2" }), LISTS, TODAY)).toBe("Jobb");
  });

  it("faller tillbaka på datumet om listan har hunnit tas bort", () => {
    expect(taskLocation(t("1", "x", { listId: "borta" }), LISTS, TODAY)).toBe("Inkorg");
  });
});

describe("searchTasks — ordning", () => {
  it("sätter träff i titeln före träff i delsteg", () => {
    const tasks = [
      t("a", "Handla", { steps: [{ id: "x", title: "Köp virke", done: false }] }),
      t("b", "Köp verktyg"),
    ];
    expect(searchTasks("köp", tasks, []).open.map((h) => h.task.id)).toEqual(["b", "a"]);
  });
});
