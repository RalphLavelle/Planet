import { describe, expect, it } from "vitest";
import * as edit from "@/services/editing";
import { compareByStart, isInTimeOrder, sortActivities, withSortedDays } from "@/domain/order";
import type { Activity, Trip } from "@/domain/schemas";
import { makeTrip } from "./helpers";

const times = (t: Trip, i: number) => t.days[i].activities.map((a) => a.startTime);
const titles = (t: Trip, i: number) => t.days[i].activities.map((a) => a.title);
const inOrder = (t: Trip) => t.days.every((d) => isInTimeOrder(d.activities));
const act = (title: string, startTime?: string) => ({ title, startTime }) as Activity;

describe("time order helpers", () => {
  it("timed items first, earliest first; untimed items after them in their existing order", () => {
    const list = [act("n1"), act("late", "18:00"), act("n2"), act("early", "08:00"), act("same-a", "12:00"), act("same-b", "12:00")];
    expect(sortActivities(list).map((a) => a.title)).toEqual(["early", "same-a", "same-b", "late", "n1", "n2"]);
    expect(list[0].title).toBe("n1"); // input is not mutated
    expect(compareByStart(act("a"), act("b"))).toBe(0);
  });
  it("returns the very same array / trip when already in order", async () => {
    const a = [act("x", "09:00"), act("y", "10:00"), act("z")];
    expect(sortActivities(a)).toBe(a);
    const t = await makeTrip();
    expect(withSortedDays(t)).toBe(t);
  });
  it("withSortedDays fixes an out-of-order (older saved) trip", async () => {
    const t = await makeTrip();
    const d = t.days[1];
    const messy: Trip = { ...t, days: t.days.map((x) => (x.id === d.id ? { ...x, activities: [...x.activities].reverse() } : x)) };
    expect(inOrder(messy)).toBe(false);
    expect(inOrder(withSortedDays(messy))).toBe(true);
  });
});

describe("items stay in start-time order after every edit", () => {
  it("generated days start in order", async () => {
    expect(inOrder(await makeTrip())).toBe(true);
  });
  it("adding an earlier item puts it first, not last (the reported bug)", async () => {
    let t = await makeTrip();
    const day = t.days[1];
    t = edit.addActivity(t, day.id, { title: "Sunrise swim", startTime: "06:30" });
    expect(titles(t, 1)[0]).toBe("Sunrise swim");
    expect(inOrder(t)).toBe(true);
  });
  it("adding a later item goes last among timed items; an item in the middle lands in the middle", async () => {
    let t = await makeTrip();
    const day = t.days[1];
    const mid = day.activities[1].startTime!;
    t = edit.addActivity(t, day.id, { title: "Midway", startTime: mid });
    const i = titles(t, 1).indexOf("Midway");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(t.days[1].activities.length - 1);
    t = edit.addActivity(t, day.id, { title: "Night owl", startTime: "23:45" });
    expect(titles(t, 1).at(-1)).toBe("Night owl");
    expect(inOrder(t)).toBe(true);
  });
  it("adding a meal keeps order too", async () => {
    let t = await makeTrip();
    t = edit.addMeal(t, t.days[1].id, { meal: "dinner", venue: { name: "Test Taverna", address: "", source: "manual" }, startTime: "07:00" });
    expect(titles(t, 1)[0]).toBe("Dinner at Test Taverna");
    expect(inOrder(t)).toBe(true);
  });
  it("an item added without a time goes after all timed items, and later untimed ones keep their order", async () => {
    let t = await makeTrip();
    const d = t.days[1].id;
    t = edit.addActivity(t, d, { title: "Free 1" });
    t = edit.addActivity(t, d, { title: "Free 2" });
    t = edit.addActivity(t, d, { title: "Timed", startTime: "23:50" });
    const names = titles(t, 1);
    expect(names.slice(-3)).toEqual(["Timed", "Free 1", "Free 2"]);
  });
  it("editing a time moves the item to its new place (earlier and later)", async () => {
    let t = await makeTrip();
    const d = t.days[1];
    const last = d.activities.at(-1)!, first = d.activities[0];
    t = edit.updateActivity(t, d.id, last.id, { startTime: "05:00" });
    expect(t.days[1].activities[0].id).toBe(last.id);
    t = edit.updateActivity(t, d.id, first.id, { startTime: "23:30" });
    expect(t.days[1].activities.at(-1)!.id).toBe(first.id);
    expect(inOrder(t)).toBe(true);
  });
  it("clearing a time sends the item behind the timed ones", async () => {
    let t = await makeTrip();
    const d = t.days[1];
    t = edit.updateActivity(t, d.id, d.activities[0].id, { startTime: undefined });
    expect(t.days[1].activities.at(-1)!.id).toBe(d.activities[0].id);
    expect(t.days[1].activities.at(-1)!.startTime).toBeUndefined();
  });
  it("moving an item to another day slots it in by time (applyItemEdit and moveActivity)", async () => {
    let t = await makeTrip();
    const a = t.days[0].activities[0];
    const moved = edit.applyItemEdit(t, t.days[0].id, a.id, { startTime: "06:00" }, { dayId: t.days[2].id });
    expect(moved.days[2].activities[0].id).toBe(a.id);
    expect(inOrder(moved)).toBe(true);
    t = edit.moveActivity(t, t.days[0].id, a.id, t.days[2].id);
    expect(inOrder(t)).toBe(true);
    const at = t.days[2].activities.findIndex((x) => x.id === a.id);
    expect(t.days[2].activities.slice(0, at).every((x) => !x.startTime || x.startTime <= a.startTime!)).toBe(true);
  });
  it("swapping two items (weather suggestion) keeps order", async () => {
    const t = await makeTrip();
    const swapped = edit.swapActivities(t, t.days[0].activities[0].id, t.days[1].activities[1].id);
    expect(inOrder(swapped)).toBe(true);
  });
  it("order survives a regenerate-merge", async () => {
    let t = await makeTrip();
    t = edit.addActivity(t, t.days[1].id, { title: "Early thing", startTime: "06:15" });
    expect(times(edit.mergeRegenerated(t, t.days), 1)[0]).toBe("06:15");
  });
});
