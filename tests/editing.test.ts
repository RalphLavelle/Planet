import { describe, expect, it } from "vitest";
import * as edit from "@/services/editing";
import { DemoItineraryGenerator } from "@/services/itinerary/DemoItineraryGenerator";
import { makeTrip, athensInput } from "./helpers";
import { TripInputSchema } from "@/domain/schemas";

describe("itinerary editing", () => {
  it("reorders, moves, adds, removes and edits", async () => {
    let t = await makeTrip();
    const [d1, d2] = t.days;
    const [a, b] = d2.activities;
    t = edit.reorderActivity(t, d2.id, b.id, -1);
    expect(t.days[1].activities.slice(0, 2).map((x) => x.id)).toEqual([b.id, a.id]);
    expect(edit.reorderActivity(t, d2.id, b.id, -1)).toBe(t); // no-op at boundary
    t = edit.moveActivity(t, d2.id, a.id, d1.id);
    expect(t.days[0].activities.at(-1)!.id).toBe(a.id);
    expect(t.days[0].activities.at(-1)!.origin).toBe("edited");
    expect(t.days[1].activities.find((x) => x.id === a.id)).toBeUndefined();
    t = edit.addActivity(t, d1.id, { title: "Ferry", startTime: "17:00" });
    const added = t.days[0].activities.at(-1)!;
    expect(added).toMatchObject({ title: "Ferry", origin: "manual", category: "custom" });
    t = edit.updateActivity(t, d1.id, added.id, { notes: "Gate E7", durationMinutes: 30 });
    expect(t.days[0].activities.at(-1)).toMatchObject({ notes: "Gate E7", durationMinutes: 30, origin: "manual" });
    t = edit.removeActivity(t, d1.id, added.id);
    expect(t.days[0].activities.find((x) => x.id === added.id)).toBeUndefined();
    expect(() => edit.updateActivity(t, d1.id, a.id, { title: "" })).toThrow();
  });
  it("regeneration preserves user edits and manual activities", async () => {
    let t = await makeTrip();
    const d = t.days[1];
    t = edit.updateActivity(t, d.id, d.activities[0].id, { title: "My edited plan" });
    t = edit.addActivity(t, d.id, { title: "Dinner with Maria", startTime: "20:00" });
    const regen = await new DemoItineraryGenerator().generate(TripInputSchema.parse(athensInput), { seed: 7 });
    const merged = edit.mergeRegenerated(t, regen.days);
    const titles = merged.days[1].activities.map((a) => a.title);
    expect(titles).toContain("My edited plan");
    expect(titles).toContain("Dinner with Maria");
    expect(merged.days[1].id).toBe(d.id);
  });
});
