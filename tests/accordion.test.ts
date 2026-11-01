import { describe, expect, it } from "vitest";
import { collapseAll, nextOpenId, normalizeCollapsed, toggleDay } from "@/lib/accordion";

const ALL = ["d1", "d2", "d3", "d4"];

describe("day accordion (collapsed-list form)", () => {
  it("opening a day collapses all the others", () => {
    const start = ["d2", "d3", "d4"]; // d1 open
    expect(toggleDay(ALL, start, "d3")).toEqual(["d1", "d2", "d4"]);
    expect(toggleDay(ALL, ["d1", "d2", "d4"], "d1")).toEqual(["d2", "d3", "d4"]);
  });
  it("tapping the open day closes it and leaves the rest", () => {
    expect(toggleDay(ALL, ["d2", "d3", "d4"], "d1")).toEqual(["d2", "d3", "d4", "d1"]);
    expect(toggleDay(ALL, ALL, "d2")).toEqual(["d1", "d3", "d4"]); // everything closed, then d2 opened
  });
  it("never leaves more than one day open, whatever the starting state", () => {
    for (const start of [[], ["d1"], ["d2", "d3"], ALL]) for (const id of ALL) {
      const next = toggleDay(ALL, normalizeCollapsed(ALL, start), id);
      expect(ALL.filter((x) => !next.includes(x)).length).toBeLessThanOrEqual(1);
    }
  });
  it("ignores unknown ids", () => { expect(toggleDay(ALL, ["d2"], "nope")).toEqual(["d2"]); });
  it("collapse all", () => { expect(collapseAll(ALL)).toEqual(ALL); });
  it("repairs stored state that has several open days (keeps the first) or unknown ids", () => {
    expect(normalizeCollapsed(ALL, [])).toEqual(["d2", "d3", "d4"]);
    expect(normalizeCollapsed(ALL, ["d1", "d4"])).toEqual(["d1", "d3", "d4"]); // d2 and d3 were open: only d2 stays open
    expect(normalizeCollapsed(ALL, ["d1", "d2", "d3", "d4"])).toEqual(ALL);
    expect(normalizeCollapsed(ALL, ["ghost", "d2", "d3", "d4"])).toEqual(["d2", "d3", "d4"]);
  });
});

describe("single-open id helper (wizard draft)", () => {
  it("opening replaces the current open day; closing the open day clears it; closing another keeps it", () => {
    expect(nextOpenId("a", "b", true)).toBe("b");
    expect(nextOpenId("a", "a", false)).toBeNull();
    expect(nextOpenId("a", "b", false)).toBe("a");
    expect(nextOpenId(null, "b", true)).toBe("b");
  });
});
