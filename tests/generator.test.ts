import { describe, expect, it } from "vitest";
import { ItineraryDaySchema } from "@/domain/schemas";
import { selectTheme } from "@/themes/registry";
import { makeTrip } from "./helpers";

describe("DemoItineraryGenerator", () => {
  it("produces varied, validated days without repeating sights", async () => {
    const t = await makeTrip();
    t.days.forEach((d) => expect(() => ItineraryDaySchema.parse(d)).not.toThrow());
    const nonFood = t.days.flatMap((d) => d.activities.filter((a) => a.category !== "food").map((a) => a.placeId));
    expect(new Set(nonFood).size).toBe(nonFood.length);
    const firstTitles = t.days.map((d) => d.activities[0]?.title);
    expect(new Set(firstTitles).size).toBeGreaterThan(1);
    t.days.forEach((d) => { const times = d.activities.map((a) => a.startTime!); expect([...times].sort()).toEqual(times); });
  });
  it("labels everything as demo and never claims verified prices", async () => {
    const t = await makeTrip();
    const acts = t.days.flatMap((d) => d.activities);
    expect(acts.every((a) => a.meta.status === "demo")).toBe(true);
    expect(acts.every((a) => !a.cost || a.cost.confidence === "illustrative")).toBe(true);
  });
  it("respects interests and pace", async () => {
    const night = await makeTrip({ preferences: { interests: ["nightlife"], pace: "packed" } });
    expect(night.days.flatMap((d) => d.activities).some((a) => a.category === "nightlife")).toBe(true);
    const relaxed = await makeTrip({ preferences: { pace: "relaxed" } });
    const count = (t: typeof night) => t.days.reduce((n, d) => n + d.activities.length, 0);
    expect(count(night)).toBeGreaterThan(count(relaxed));
  });
  it("works for other destinations, with a generic template and no fake coordinates or prices", async () => {
    const t = await makeTrip({ destination: "Ljubljana", nativeCurrency: "EUR" });
    expect(t.destination.catalogKey).toBeUndefined();
    const acts = t.days.flatMap((d) => d.activities);
    expect(acts.length).toBeGreaterThan(4);
    expect(acts.every((a) => !a.location && !a.cost)).toBe(true);
    const tokyo = await makeTrip({ destination: "tokyo" });
    expect(tokyo.destination.localCurrency).toBe("JPY");
  });
  it("is deterministic per seed", async () => {
    const a = await makeTrip(), b = await makeTrip();
    expect(a.days.map((d) => d.activities.map((x) => x.title))).toEqual(b.days.map((d) => d.activities.map((x) => x.title)));
  });
  it("selects destination themes from structured metadata", async () => {
    expect(selectTheme((await makeTrip()).destination).key).toBe("greece");
    expect(selectTheme((await makeTrip({ destination: "Athens, Georgia" })).destination).key).toBe("neutral");
    expect(selectTheme((await makeTrip({ destination: "Istanbul" })).destination).key).toBe("istanbul");
  });
});
