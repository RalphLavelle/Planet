import { describe, expect, it } from "vitest";
import type { Trip } from "@/domain/schemas";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { SyncedTripRepository, type RemoteTripRow, type RemoteTripStore } from "@/repositories/SyncedTripRepository";
import { toDbRow } from "@/repositories/SupabaseTripStore";
import { MemoryStore } from "@/repositories/TripRepository";
import { makeTrip } from "./helpers";

/** In-memory stand-in for the database, including failure injection. */
class FakeRemote implements RemoteTripStore {
  rows = new Map<string, RemoteTripRow>();
  down = false;
  private chk() { if (this.down) throw new Error("offline"); }
  async fetchAll() { this.chk(); return [...this.rows.values()]; }
  async upsert(t: Trip) { this.chk(); this.rows.set(t.id, { id: t.id, data: structuredClone(t), updatedAt: t.updatedAt, deletedAt: null }); }
  async softDelete(id: string, at: string) { this.chk(); const r = this.rows.get(id); this.rows.set(id, { id, data: {}, updatedAt: r?.updatedAt ?? at, deletedAt: at }); }
}
function device(remote: FakeRemote) {
  const store = new MemoryStore();
  const local = new BrowserStorageTripRepository(() => store);
  return { store, local, repo: new SyncedTripRepository(local, remote, () => store) };
}
const later = (t: Trip, ms: number, patch: Partial<Trip> = {}): Trip => ({ ...t, ...patch, updatedAt: new Date(Date.parse(t.updatedAt) + ms).toISOString() });

describe("SyncedTripRepository", () => {
  it("save writes through to local and remote", async () => {
    const remote = new FakeRemote(); const a = device(remote); const t = await makeTrip();
    await a.repo.save(t);
    expect(await a.local.get(t.id)).toEqual(t);
    expect(remote.rows.get(t.id)?.deletedAt).toBeNull();
    expect(a.repo.syncState?.ok).toBe(true);
  });

  it("a second device sees trips saved on the first, and edits flow both ways (last write wins)", async () => {
    const remote = new FakeRemote(); const a = device(remote); const b = device(remote);
    const t = await makeTrip(); await a.repo.save(t);
    expect((await b.repo.list()).map((x) => x.id)).toEqual([t.id]);
    await b.repo.save(later(t, 1000, { accommodation: "Plaka" }));
    expect((await a.repo.get(t.id))!.accommodation).toBe("Koukaki"); // a still has its local copy until it syncs
    await a.repo.list();
    expect((await a.repo.get(t.id))!.accommodation).toBe("Plaka");
    await a.repo.save(later(t, 2000, { accommodation: "Monastiraki" })); // older edits never overwrite newer ones
    remote.down = true; await b.repo.save(later(t, 500, { accommodation: "stale" })); remote.down = false; // offline edit, older than what the server has
    await b.repo.list();
    expect((await b.repo.get(t.id))!.accommodation).toBe("Monastiraki");
  });

  it("uploads trips that existed only in localStorage before Supabase was configured", async () => {
    const remote = new FakeRemote(); const a = device(remote); const t = await makeTrip();
    await a.local.save(t);
    expect(remote.rows.size).toBe(0);
    await a.repo.list();
    expect(remote.rows.get(t.id)).toBeTruthy();
  });

  it("keeps working offline and pushes offline edits on the next sync", async () => {
    const remote = new FakeRemote(); const a = device(remote); const t = await makeTrip();
    await a.repo.save(t);
    remote.down = true;
    const edited = later(t, 1000, { accommodation: "Offline edit" });
    await a.repo.save(edited);
    expect(a.repo.syncState?.ok).toBe(false);
    expect((await a.repo.list())[0].id).toBe(t.id); // list still works from local
    remote.down = false;
    await a.repo.list();
    expect((remote.rows.get(t.id)!.data as Trip).accommodation).toBe("Offline edit");
  });

  it("deletes propagate via tombstones, including deletes made offline", async () => {
    const remote = new FakeRemote(); const a = device(remote); const b = device(remote);
    const t1 = await makeTrip(); const t2 = await makeTrip({ destination: "Rome" });
    await a.repo.save(t1); await a.repo.save(t2); await b.repo.list();
    await a.repo.delete(t1.id);
    expect(remote.rows.get(t1.id)?.deletedAt).toBeTruthy();
    expect((remote.rows.get(t1.id)!.data as object)).toEqual({}); // content dropped
    expect((await b.repo.list()).map((x) => x.id)).toEqual([t2.id]);
    remote.down = true; await b.repo.delete(t2.id); remote.down = false;
    expect(remote.rows.get(t2.id)?.deletedAt).toBeNull();
    expect(await b.repo.list()).toHaveLength(0); // not resurrected by sync
    expect(remote.rows.get(t2.id)?.deletedAt).toBeTruthy();
    expect(await a.repo.list()).toHaveLength(0);
  });

  it("a local edit newer than a remote delete restores the trip", async () => {
    const remote = new FakeRemote(); const a = device(remote); const b = device(remote);
    const t = await makeTrip(); await a.repo.save(t); await b.repo.list();
    await a.repo.delete(t.id);
    await b.local.save(later(t, 60_000, { accommodation: "kept" }));
    await b.repo.list();
    expect(remote.rows.get(t.id)?.deletedAt).toBeNull();
    expect((await a.repo.list())).toHaveLength(1);
  });

  it("ignores unreadable remote documents and falls back to local when the server is down", async () => {
    const remote = new FakeRemote(); const a = device(remote); const t = await makeTrip();
    await a.repo.save(t);
    remote.rows.set("bad_remote", { id: "bad_remote", data: { nope: 1 }, updatedAt: new Date().toISOString(), deletedAt: null });
    expect((await a.repo.list()).map((x) => x.id)).toEqual([t.id]);
    remote.down = true;
    expect(await a.repo.list()).toHaveLength(1);
    expect(a.repo.syncState).toMatchObject({ ok: false, error: "offline" });
  });

  it("still validates on save and clear removes everything everywhere", async () => {
    const remote = new FakeRemote(); const a = device(remote); const t = await makeTrip();
    await expect(a.repo.save({ ...t, nativeCurrency: "nope" })).rejects.toThrow();
    expect(remote.rows.size).toBe(0);
    await a.repo.save(t); await a.repo.clear();
    expect(await a.repo.list()).toHaveLength(0);
    expect([...remote.rows.values()].every((r) => r.deletedAt)).toBe(true);
  });

  it("maps a trip to the database row shape", async () => {
    const t = await makeTrip();
    expect(toDbRow(t)).toMatchObject({ id: t.id, destination_name: "Athens", arrival_date: "2026-11-10", departure_date: "2026-11-13", updated_at: t.updatedAt, deleted_at: null });
    expect(toDbRow(t)).not.toHaveProperty("owner_id");
  });
});
