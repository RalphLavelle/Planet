import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as edit from "@/services/editing";
import { ItemEditor, positionCount } from "@/components/ItemEditor";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

const ids = (t: Awaited<ReturnType<typeof makeTrip>>, i: number) => t.days[i].activities.map((a) => a.id);

describe("item editing: placeActivity / applyItemEdit", () => {
  it("reorders within a day to an exact position (clamped)", async () => {
    const t = await makeTrip();
    const d = t.days[0], last = d.activities[d.activities.length - 1];
    const first = edit.placeActivity(t, last.id, d.id, 0);
    expect(ids(first, 0)[0]).toBe(last.id);
    expect(ids(first, 0)).toHaveLength(d.activities.length);
    expect(ids(edit.placeActivity(t, d.activities[0].id, d.id, 999), 0).at(-1)).toBe(d.activities[0].id);
    expect(edit.placeActivity(t, d.activities[0].id, d.id, 0)).toBe(t); // no-op returns same object
  });
  it("moves to another day at a position and marks the item edited", async () => {
    const t = await makeTrip();
    const a = t.days[0].activities[0];
    const n2 = t.days[1].activities.length;
    const moved = edit.placeActivity(t, a.id, t.days[1].id, 1);
    expect(moved.days[0].activities.find((x) => x.id === a.id)).toBeUndefined();
    expect(ids(moved, 1)[1]).toBe(a.id);
    expect(moved.days[1].activities).toHaveLength(n2 + 1);
    expect(moved.days[1].activities[1].origin).toBe("edited");
    expect(() => edit.placeActivity(t, "nope", t.days[0].id, 0)).toThrow();
    expect(() => edit.placeActivity(t, a.id, "nope", 0)).toThrow();
  });
  it("applyItemEdit saves fields and placement in one step; delete still works", async () => {
    const t = await makeTrip();
    const a = t.days[0].activities[0];
    const next = edit.applyItemEdit(t, t.days[0].id, a.id, { title: "Renamed", notes: "bring cash", startTime: "10:30", durationMinutes: 45 }, { dayId: t.days[2].id, position: 0 });
    const got = next.days[2].activities[0];
    expect(got).toMatchObject({ id: a.id, title: "Renamed", notes: "bring cash", startTime: "10:30", durationMinutes: 45 });
    expect(edit.applyItemEdit(t, t.days[0].id, a.id, { title: "Only title" }).days[0].activities[0].title).toBe("Only title");
    expect(edit.removeActivity(next, t.days[2].id, a.id).days[2].activities.find((x) => x.id === a.id)).toBeUndefined();
  });
  it("edits persist through the browser repository (refresh)", async () => {
    const store = new MemoryStore();
    const repo = new BrowserStorageTripRepository(() => store);
    const t = await makeTrip();
    await repo.save(t);
    const a = t.days[0].activities[0];
    await repo.save(edit.applyItemEdit(t, t.days[0].id, a.id, { title: "Persisted" }, { dayId: t.days[1].id, position: 0 }));
    const again = await new BrowserStorageTripRepository(() => store).get(t.id);
    expect(again?.days[1].activities[0]).toMatchObject({ id: a.id, title: "Persisted" });
  });
});

describe("ItemEditor", () => {
  it("is prefilled, has day/position pickers, save/cancel and a delete button", async () => {
    const t = await makeTrip();
    const a = t.days[0].activities[0];
    const html = renderToStaticMarkup(h(ItemEditor, { trip: t, dayId: t.days[0].id, activity: a, onSave: () => {}, onDelete: () => {}, onCancel: () => {} }));
    expect(html).toContain(`value="${a.title.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("Day 1");
    expect(html).toContain(`1 of ${t.days[0].activities.length}`);
    for (const label of ["Title", "Start time", "Duration (min)", "Day", "Order in day", "Your notes", "Save", "Cancel", "Delete"]) expect(html).toContain(label);
    expect(html).toMatch(/<form[^>]*aria-label="Edit /);
  });
  it("offers one more position when moving into another day", async () => {
    const t = await makeTrip();
    expect(positionCount(t, t.days[0].id, t.days[0].id)).toBe(t.days[0].activities.length);
    expect(positionCount(t, t.days[0].id, t.days[1].id)).toBe(t.days[1].activities.length + 1);
  });
});
