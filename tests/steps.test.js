import { describe, it, expect } from "vitest";
import { stepProgress, addStep, renameStep, removeStep, toggleStep, resetSteps } from "../src/lib/steps.js";

const steps = () => [
  { id: "s1", title: "Köp virke", done: true },
  { id: "s2", title: "Gjut plintar", done: false },
];

describe("stepProgress", () => {
  it("räknar avklarade av totalt", () => {
    expect(stepProgress({ steps: steps() })).toEqual({ done: 1, total: 2 });
  });

  it("ger noll för en uppgift utan delsteg", () => {
    expect(stepProgress({})).toEqual({ done: 0, total: 0 });
    expect(stepProgress({ steps: [] })).toEqual({ done: 0, total: 0 });
  });
});

describe("addStep", () => {
  it("lägger till sist", () => {
    const r = addStep(steps(), "Såga reglar");
    expect(r).toHaveLength(3);
    expect(r[2].title).toBe("Såga reglar");
    expect(r[2].done).toBe(false);
    expect(r[2].id).toBeTruthy();
  });

  it("fungerar när uppgiften saknar delsteg sedan tidigare", () => {
    expect(addStep(undefined, "Först")).toHaveLength(1);
  });

  it("struntar i tomma titlar", () => {
    expect(addStep(steps(), "   ")).toHaveLength(2);
    expect(addStep(steps(), "")).toHaveLength(2);
  });

  it("trimmar titeln", () => {
    expect(addStep([], "  Såga reglar  ")[0].title).toBe("Såga reglar");
  });

  it("ger varje delsteg ett eget id", () => {
    const r = addStep(addStep([], "a"), "b");
    expect(r[0].id).not.toBe(r[1].id);
  });
});

describe("toggleStep", () => {
  it("vänder done", () => {
    const r = toggleStep(steps(), "s2");
    expect(r[1].done).toBe(true);
    expect(r[0].done).toBe(true);
  });

  it("lämnar okända id i fred", () => {
    expect(toggleStep(steps(), "finns-inte")).toEqual(steps());
  });
});

describe("renameStep", () => {
  it("byter titel", () => {
    expect(renameStep(steps(), "s1", "Köp reglar")[0].title).toBe("Köp reglar");
  });

  it("behåller done", () => {
    expect(renameStep(steps(), "s1", "Nytt")[0].done).toBe(true);
  });

  it("struntar i tom titel", () => {
    expect(renameStep(steps(), "s1", "  ")[0].title).toBe("Köp virke");
  });
});

describe("removeStep", () => {
  it("tar bort rätt delsteg", () => {
    const r = removeStep(steps(), "s1");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("s2");
  });
});

describe("resetSteps", () => {
  it("nollställer alla bockar", () => {
    expect(resetSteps(steps()).every((s) => !s.done)).toBe(true);
  });

  it("behåller titlar och ordning", () => {
    expect(resetSteps(steps()).map((s) => s.title)).toEqual(["Köp virke", "Gjut plintar"]);
  });

  it("klarar en uppgift utan delsteg", () => {
    expect(resetSteps(undefined)).toEqual([]);
  });
});

describe("inget muteras", () => {
  it("lämnar indatan orörd", () => {
    const before = steps();
    const copy = JSON.parse(JSON.stringify(before));
    addStep(before, "ny");
    toggleStep(before, "s1");
    renameStep(before, "s1", "annat");
    removeStep(before, "s1");
    resetSteps(before);
    expect(before).toEqual(copy);
  });
});
