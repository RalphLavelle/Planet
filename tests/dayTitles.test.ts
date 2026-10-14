import { describe, expect, it } from "vitest";
import * as edit from "@/services/editing";
import { displayDayTitle } from "@/domain/dayTitles";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { UiPrefs } from "@/services/uiPrefs";
import { makeTrip } from "./helpers";

describe("day titles", () => {
  it("recomputes auto titles when the leading activity moves away (Blue Mosque bug)", async () => {
    let t = await makeTrip({ destination: "Istanbul", arrivalDate: "2026-10-20", departureDate: "2026-10-23", preferences: { interests: ["architecture"] } });
    const di = t.days.findIndex((d, i) => i > 0 && d.titleMode === "auto" && d.title.includes(":"));
    const day = t.days[di];
    const lead = day.activities.find((a) => a.category !== "food")!;
    expect(day.title).toContain(lead.title.split(/[&,(]/)[0].trim());
    const target = t.days[(di + 1) % t.days.length];
    t = edit.moveActivity(t, day.id, lead.id, target.id);
    expect(t.days[di].title).not.toContain(lead.title.split(/[&,(]/)[0].trim());
    expect(t.days[di].title).toMatch(new RegExp(`^Day ${di + 1}: `));
  });
  it("recomputes on remove and add; empty days get a free-day title", async () => {
    let t = await makeTrip();
    const d = t.days[1];
    for (const a of d.activities) t = edit.removeActivity(t, d.id, a.id);
    expect(t.days[1].title).toBe("Day 2: A free day");
    t = edit.addActivity(t, d.id, { title: "Ferry to Aegina" });
    expect(t.days[1].title).toBe("Day 2: Ferry to Aegina");
  });
  it("keeps user titles through edits and regeneration, and can reset to auto", async () => {
    let t = await makeTrip();
    const d = t.days[2];
    t = edit.renameDay(t, d.id, "  Museums & meze  ");
    expect(t.days[2]).toMatchObject({ title: "Museums & meze", titleMode: "user" });
    t = edit.removeActivity(t, d.id, t.days[2].activities[0].id);
    expect(t.days[2].title).toBe("Museums & meze");
    const merged = edit.mergeRegenerated(t, (await makeTrip()).days);
    expect(merged.days[2].title).toBe("Museums & meze");
    t = edit.resetDayTitle(t, d.id);
    expect(t.days[2].titleMode).toBe("auto");
    expect(t.days[2].title).toMatch(/^Day 3: /);
  });
  it("display title fixes stale stored auto titles from older trips", async () => {
    const t = await makeTrip();
    const stale = { ...t, days: t.days.map((d, i) => (i === 1 ? { ...d, title: "Day 2: Blue Mosque" } : d)) };
    expect(displayDayTitle(stale, 1)).not.toBe("Day 2: Blue Mosque");
  });
  it("migrates trips saved before titleMode existed", async () => {
    const store = new MemoryStore(); const repo = new BrowserStorageTripRepository(() => store);
    const t = await makeTrip();
    const old = { ...t, days: t.days.map(({ titleMode: _m, ...d }) => d) };
    store.setItem("planet:trip:" + t.id, JSON.stringify(old));
    expect((await repo.get(t.id))!.days[0].titleMode).toBe("auto");
  });
});

describe("collapsed-day UI prefs", () => {
  it("remembers collapsed days per trip and tolerates corrupt data", async () => {
    const store = new MemoryStore(); const p = new UiPrefs(() => store);
    expect(await p.getCollapsedDays("t1")).toEqual([]);
    await p.setCollapsedDays("t1", ["d1", "d2"]);
    expect(await p.getCollapsedDays("t1")).toEqual(["d1", "d2"]);
    expect(await p.getCollapsedDays("t2")).toEqual([]);
    store.setItem("planet:ui:collapsed:t3", "{bad");
    expect(await p.getCollapsedDays("t3")).toEqual([]);
  });
});
