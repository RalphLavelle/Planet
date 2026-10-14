import { describe, expect, it } from "vitest";
import { createSnapshot, encodeSnapshot, parseSnapshot } from "@/services/sharing";
import { makeTrip } from "./helpers";

describe("portable snapshots", () => {
  it("round-trips via link encoding and JSON, stripping accommodation by default", async () => {
    const t = await makeTrip({ preferences: { notes: "secret" } });
    const snap = createSnapshot(t);
    expect(snap.trip.accommodation).toBe("");
    expect(snap.trip.preferences.notes).toBe("");
    for (const text of [encodeSnapshot(snap), JSON.stringify(snap)]) {
      const r = parseSnapshot(text);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.snapshot.trip.days).toEqual(t.days);
    }
    expect(createSnapshot(t, { includeAccommodation: true }).trip.accommodation).toBe("Koukaki");
  });
  it("rejects malformed or tampered snapshots", async () => {
    expect(parseSnapshot("garbage!!").ok).toBe(false);
    expect(parseSnapshot(JSON.stringify({ kind: "planet-snapshot", version: 1, createdAt: new Date().toISOString(), trip: { id: "x" } })).ok).toBe(false);
    const t = await makeTrip();
    const evil = createSnapshot(t) as unknown as { trip: { days: { activities: { title: string }[] }[] } };
    evil.trip.days[0].activities[0].title = "x".repeat(500);
    expect(parseSnapshot(JSON.stringify(evil)).ok).toBe(false);
    expect(parseSnapshot("a".repeat(300_000)).ok).toBe(false);
  });
});
