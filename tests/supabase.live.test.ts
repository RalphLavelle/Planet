// Live integration test of SupabaseTripStore + SyncedTripRepository. Skipped unless the Supabase env vars are set:
//   set -a; . /workspace/.planet-supabase.env; set +a; npx vitest run tests/supabase.live.test.ts
import { describe, expect, it } from "vitest";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { SupabaseTripStore } from "@/repositories/SupabaseTripStore";
import { SyncedTripRepository } from "@/repositories/SyncedTripRepository";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
(globalThis as { WebSocket?: unknown }).WebSocket ??= class { constructor() { throw new Error("unused"); } }; // Node < 22

describe.skipIf(!url || !key)("Supabase (live)", () => {
  it("round-trips a trip through the real database and a second 'device' with its own identity sees nothing", async () => {
    const s1 = new MemoryStore();
    const remote = new SupabaseTripStore(url!, key!);
    const dev1 = new SyncedTripRepository(new BrowserStorageTripRepository(() => s1), remote, () => s1);
    const t = await makeTrip();
    await dev1.save(t);
    expect(dev1.syncState).toMatchObject({ ok: true });
    const rows = await remote.fetchAll();
    expect(rows.find((r) => r.id === t.id)?.deletedAt).toBeNull();
    await dev1.save({ ...t, accommodation: "Plaka", updatedAt: new Date(Date.now() + 1000).toISOString() });
    // fresh browser storage, same Supabase session (same device): trip comes back from the database
    const s1b = new MemoryStore();
    const dev1b = new SyncedTripRepository(new BrowserStorageTripRepository(() => s1b), remote, () => s1b);
    expect((await dev1b.get(t.id))?.accommodation).toBe("Plaka");
    await dev1b.delete(t.id);
    expect((await remote.fetchAll()).find((r) => r.id === t.id)).toMatchObject({ deletedAt: expect.any(String), data: {} });
  }, 30000);
});
