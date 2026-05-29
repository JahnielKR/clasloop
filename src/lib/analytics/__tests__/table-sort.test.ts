/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import { sortRows, nextSortDir } from "../table-sort";

describe("sortRows", () => {
  const rows = [
    { name: "Beto", score: 40 },
    { name: "Ana", score: 90 },
    { name: "Cleo", score: null },
    { name: "Dux", score: 70 },
  ];

  it("sorts ascending by a numeric accessor", () => {
    const out = sortRows(rows, (r) => r.score, "asc");
    expect(out.map((r) => r.name)).toEqual(["Beto", "Dux", "Ana", "Cleo"]);
  });
  it("sorts descending by a numeric accessor", () => {
    const out = sortRows(rows, (r) => r.score, "desc");
    expect(out.map((r) => r.name)).toEqual(["Ana", "Dux", "Beto", "Cleo"]);
  });
  it("puts null/undefined accessor values last regardless of direction", () => {
    expect(sortRows(rows, (r) => r.score, "asc").at(-1)!.name).toBe("Cleo");
    expect(sortRows(rows, (r) => r.score, "desc").at(-1)!.name).toBe("Cleo");
  });
  it("sorts strings case-insensitively", () => {
    const out = sortRows(rows, (r) => r.name, "asc");
    expect(out.map((r) => r.name)).toEqual(["Ana", "Beto", "Cleo", "Dux"]);
  });
  it("does not mutate the input array", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.score, "asc");
    expect(rows).toEqual(copy);
  });
  it("returns the array unchanged when dir is null (no sort)", () => {
    const out = sortRows(rows, (r) => r.score, null);
    expect(out.map((r) => r.name)).toEqual(["Beto", "Ana", "Cleo", "Dux"]);
  });
});

describe("nextSortDir", () => {
  it("cycles asc → desc → null when clicking the same key", () => {
    expect(nextSortDir(null, "asc")).toBe("desc");
    expect(nextSortDir("desc", "desc")).toBe(null);
    expect(nextSortDir(null, null)).toBe("asc");
  });
  it("resets to asc when switching to a different key", () => {
    expect(nextSortDir(null, null)).toBe("asc");
  });
});
