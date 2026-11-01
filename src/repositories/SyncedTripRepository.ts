import { TripSchema, type Trip } from "@/domain/schemas";
import { migrate } from "./migrations";
import type { KeyValueStore, LoadIssue, TripRepository, TripSummary } from "./TripRepository";

/** One trip as the remote database sees it. `data` is the raw JSON document (validated here, not trusted). */
export interface RemoteTripRow { id: string; data: unknown; updatedAt: string; deletedAt: string | null }

/** Minimal remote contract, implemented by SupabaseTripStore and by test fakes. All methods may reject (offline etc.). */
export interface RemoteTripStore {
  fetchAll(): Promise<RemoteTripRow[]>;
  /** Insert or replace; also un-deletes. */
  upsert(trip: Trip): Promise<void>;
  /** Soft delete: keeps a tombstone so other devices learn about it, and drops the document content. */
  softDelete(id: string, at: string): Promise<void>;
}

/** Outcome of one reconcile run. `pushed` = trips uploaded, `pulled` = trips saved locally from the server, `removed` = trips deleted locally because they were deleted elsewhere. */
export type SyncResult = { ok: true; pushed: number; pulled: number; removed: number } | { ok: false; error: string };

export type SyncState = { ok: true; at: string } | { ok: false; at: string; error: string } | null;

const TOMB = "planet:tombstone:";
const ts = (iso: string) => { const n = Date.parse(iso); return Number.isNaN(n) ? 0 : n; };

function parseTrip(raw: unknown): Trip | null {
  const r = TripSchema.safeParse(migrate(raw));
  return r.success ? r.data : null;
}

/**
 * Local-first trip repository. localStorage (via `local`) is the source the UI reads and writes; the remote
 * database is synced on top: last-write-wins by `updatedAt`, soft-delete tombstones, and anything saved while
 * offline is pushed on the next sync. If the remote is unreachable everything keeps working locally.
 */
export class SyncedTripRepository implements TripRepository {
  syncState: SyncState = null;
  private inflight: Promise<SyncResult> | null = null;

  /** `meta` holds pending-delete tombstones (normally localStorage); optional. */
  constructor(private readonly local: TripRepository, private readonly remote: RemoteTripStore, private readonly meta: () => KeyValueStore | null = () => null) {}

  private tombs(): { id: string; at: string }[] {
    const s = this.meta(); const out: { id: string; at: string }[] = [];
    if (!s) return out;
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k?.startsWith(TOMB)) out.push({ id: k.slice(TOMB.length), at: s.getItem(k) ?? "" }); }
    return out;
  }

  /** Reconcile local and remote. Never throws; failure is recorded in `syncState` and returned. Concurrent calls share one run. */
  sync(): Promise<SyncResult> {
    if (!this.inflight) this.inflight = this.runSync().finally(() => { this.inflight = null; });
    return this.inflight;
  }

  private async runSync(): Promise<SyncResult> {
    let pushed = 0, pulled = 0, removed = 0;
    try {
      // 1. Flush deletions made while offline.
      for (const t of this.tombs()) { await this.remote.softDelete(t.id, t.at); this.meta()?.removeItem(TOMB + t.id); }
      const rows = new Map((await this.remote.fetchAll()).map((r) => [r.id, r]));
      const locals = new Map<string, Trip>();
      for (const s of await this.local.list()) { const t = await this.local.get(s.id); if (t) locals.set(s.id, t); }

      for (const [id, row] of rows) {
        const l = locals.get(id);
        if (row.deletedAt) {
          if (!l) continue;
          if (ts(l.updatedAt) <= ts(row.deletedAt)) { await this.local.delete(id); locals.delete(id); removed++; }
          else { await this.remote.upsert(l); pushed++; } // edited locally after it was deleted elsewhere: keep it
          continue;
        }
        const r = parseTrip(row.data);
        if (!r) continue; // unreadable remote doc: never overwrite local with it
        if (!l || ts(r.updatedAt) > ts(l.updatedAt)) { await this.local.save(r); pulled++; }
        else if (ts(l.updatedAt) > ts(r.updatedAt)) { await this.remote.upsert(l); pushed++; }
      }
      // 2. Local-only trips (including those created before Supabase was configured) go up.
      for (const [id, l] of locals) if (!rows.has(id)) { await this.remote.upsert(l); pushed++; }
      this.syncState = { ok: true, at: new Date().toISOString() };
      return { ok: true, pushed, pulled, removed };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.syncState = { ok: false, at: new Date().toISOString(), error };
      return { ok: false, error };
    }
  }

  async list(): Promise<TripSummary[]> { await this.sync(); return this.local.list(); }

  async get(id: string): Promise<Trip | null> {
    const t = await this.local.get(id);
    if (t) return t;
    await this.sync(); // e.g. opening a trip created on another device
    return this.local.get(id);
  }

  async save(trip: Trip): Promise<Trip> {
    const saved = await this.local.save(trip); // validates; throws on invalid
    try { await this.remote.upsert(saved); this.syncState = { ok: true, at: new Date().toISOString() }; }
    catch (e) { this.syncState = { ok: false, at: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) }; } // retried by next sync (local is newer)
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.local.delete(id);
    const at = new Date().toISOString();
    this.meta()?.setItem(TOMB + id, at);
    try { await this.remote.softDelete(id, at); this.meta()?.removeItem(TOMB + id); }
    catch (e) { this.syncState = { ok: false, at, error: e instanceof Error ? e.message : String(e) }; }
  }

  async clear(): Promise<void> {
    await this.sync(); // pull anything only on the server so it is cleared too
    for (const s of await this.local.list()) await this.delete(s.id);
    await this.local.clear(); // also removes unreadable local records
  }

  /**
   * Forget everything cached on this device without touching the server (used on sign-out, so the next identity
   * on a shared browser never inherits, or uploads, the previous account's trips).
   */
  async clearLocal(): Promise<void> {
    await this.local.clear();
    const m = this.meta();
    for (const t of this.tombs()) m?.removeItem(TOMB + t.id);
  }

  issues(): Promise<LoadIssue[]> { return this.local.issues(); }
}
