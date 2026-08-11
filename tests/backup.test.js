import { describe, it, expect } from "vitest";
import { buildBackup, mergeBackup } from "../src/lib/backup.js";

const task = (id, extra = {}) => ({ id, title: "Uppgift " + id, due: null, time: null, priority: 0, repeat: null, listId: null, focusDate: null, done: false, doneAt: null, createdAt: 1, ...extra });
const list = (id, name) => ({ id, name, createdAt: 1 });

describe("buildBackup", () => {
  it("tar med listorna", () => {
    const b = buildBackup([task("t1")], [list("l1", "Jobb")], { startView: "today" });
    expect(b.lists).toEqual([list("l1", "Jobb")]);
    expect(b.tasks).toHaveLength(1);
    expect(b.meta).toEqual({ startView: "today" });
  });

  it("märker filen som supertodo med versionsnummer", () => {
    const b = buildBackup([], [], {});
    expect(b.app).toBe("supertodo");
    expect(b.version).toBeGreaterThanOrEqual(5);
    expect(typeof b.exportedAt).toBe("string");
  });
});

describe("mergeBackup — listor", () => {
  it("läser in listor från en backup", () => {
    const r = mergeBackup({ tasks: [], lists: [list("l1", "Jobb")] }, [], []);
    expect(r.lists).toHaveLength(1);
    expect(r.lists[0].name).toBe("Jobb");
    expect(r.addedLists).toBe(1);
  });

  it("slår ihop listor med samma namn i stället för att skapa dubbletter", () => {
    const r = mergeBackup({ tasks: [], lists: [list("annat-id", "Jobb")] }, [], [list("l1", "Jobb")]);
    expect(r.lists).toHaveLength(1);
    expect(r.lists[0].id).toBe("l1");
    expect(r.addedLists).toBe(0);
  });

  it("jämför listnamn utan hänsyn till versaler", () => {
    const r = mergeBackup({ tasks: [], lists: [list("x", "JOBB")] }, [], [list("l1", "jobb")]);
    expect(r.lists).toHaveLength(1);
  });

  it("pekar om uppgifternas listId när listor slås ihop", () => {
    const r = mergeBackup(
      { tasks: [task("t9", { listId: "annat-id" })], lists: [list("annat-id", "Jobb")] },
      [],
      [list("l1", "Jobb")]
    );
    expect(r.tasks[0].listId).toBe("l1");
  });

  it("ger en inkommande lista ett nytt id om id:t redan är upptaget av en annan lista", () => {
    const r = mergeBackup(
      { tasks: [task("t9", { listId: "l1" })], lists: [list("l1", "Resa")] },
      [],
      [list("l1", "Jobb")]
    );
    expect(r.lists).toHaveLength(2);
    const resa = r.lists.find((l) => l.name === "Resa");
    expect(resa.id).not.toBe("l1");
    expect(r.tasks[0].listId).toBe(resa.id);
  });
});

describe("mergeBackup — uppgifter", () => {
  it("lägger till nya uppgifter och hoppar över dem som redan finns", () => {
    const r = mergeBackup({ tasks: [task("t1"), task("t2")] }, [task("t1")], []);
    expect(r.tasks).toHaveLength(2);
    expect(r.addedTasks).toBe(1);
  });

  it("skriver aldrig över en befintlig uppgift", () => {
    const mine = task("t1", { title: "Min version" });
    const r = mergeBackup({ tasks: [task("t1", { title: "Backupversion" })] }, [mine], []);
    expect(r.tasks[0].title).toBe("Min version");
  });

  it("nollar listId som inte pekar på någon lista", () => {
    const r = mergeBackup({ tasks: [task("t1", { listId: "spöke" })] }, [], []);
    expect(r.tasks[0].listId).toBe(null);
  });

  it("behåller listId som pekar på en lista man redan har", () => {
    const r = mergeBackup({ tasks: [task("t1", { listId: "l1" })] }, [], [list("l1", "Jobb")]);
    expect(r.tasks[0].listId).toBe("l1");
  });

  it("sållar bort skräp utan id eller titel", () => {
    const r = mergeBackup({ tasks: [task("t1"), { id: "t2" }, { title: "utan id" }, null] }, [], []);
    expect(r.tasks).toHaveLength(1);
  });
});

describe("mergeBackup — delsteg", () => {
  const withSteps = task("t1", { steps: [{ id: "s1", title: "Köp virke", done: true }] });

  it("tar med delstegen i backupen", () => {
    expect(buildBackup([withSteps], [], {}).tasks[0].steps).toHaveLength(1);
  });

  it("behåller delstegen och deras bockar genom en import", () => {
    const r = mergeBackup({ tasks: [withSteps] }, [], []);
    expect(r.tasks[0].steps).toEqual([{ id: "s1", title: "Köp virke", done: true }]);
  });
});

describe("mergeBackup — gamla filformat", () => {
  it("läser en backup utan listor (version 4)", () => {
    const r = mergeBackup({ app: "supertodo", version: 4, tasks: [task("t1", { listId: "borta" })] }, [], []);
    expect(r.tasks).toHaveLength(1);
    expect(r.tasks[0].listId).toBe(null);
    expect(r.addedLists).toBe(0);
  });

  it("läser en fil som bara är en array av uppgifter", () => {
    const r = mergeBackup([task("t1")], [], []);
    expect(r.tasks).toHaveLength(1);
    expect(r.addedTasks).toBe(1);
  });

  it("kastar fel på något som inte är en backup", () => {
    expect(() => mergeBackup({ hej: 1 }, [], [])).toThrow();
    expect(() => mergeBackup(null, [], [])).toThrow();
  });
});
