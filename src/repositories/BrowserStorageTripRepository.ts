import { TripSchema, type Trip } from "@/domain/schemas";
import { migrate } from "./migrations";
import type { DraftRepository, KeyValueStore, LoadIssue, TripRepository, TripSummary } from "./TripRepository";

const PREFIX = "planet:trip:";
const DRAFT_KEY = "planet:draft";

function parse(raw: string | null): { trip: Trip } | { error: string } | null {
  if (raw === null) return null;
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { error: "Not valid JSON" }; }
  const res = TripSchema.safeParse(migrate(json));
  return res.success ? { trip: res.data } : { error: res.error.issues[0]?.message ?? "Invalid trip data" };
}

/**
 * Trip repository over any KeyValueStore. The store is resolved lazily so nothing touches
 * window during server-side rendering. One record per trip: `planet:trip:<id>`.
 */
export class BrowserStorageTripRepository implements TripRepository {
  constructor(private readonly getStore: () => KeyValueStore | null) {}

  private store(): KeyValueStore {
    const s = this.getStore();
    if (!s) throw new Error("Browser storage is not available in this environment");
    return s;
  }

  private keys(): string[] {
    const s = this.store();
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k?.startsWith(PREFIX)) out.push(k); }
    return out;
  }

  async list(): Promise<TripSummary[]> {
    const out: TripSummary[] = [];
    for (const k of this.keys()) {
      const r = parse(this.store().getItem(k));
      if (r && "trip" in r) {
        const t = r.trip;
        out.push({ id: t.id, destinationName: t.destination.name, arrivalDate: t.arrivalDate, departureDate: t.departureDate, updatedAt: t.updatedAt });
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Trip | null> {
    const r = parse(this.store().getItem(PREFIX + id));
    return r && "trip" in r ? r.trip : null;
  }

  async save(trip: Trip): Promise<Trip> {
    const valid = TripSchema.parse(trip);
    try {
      this.store().setItem(PREFIX + valid.id, JSON.stringify(valid));
    } catch (e) {
      throw new Error("Could not save: browser storage is full or unavailable. " + (e instanceof Error ? e.message : ""));
    }
    return valid;
  }

  async delete(id: string): Promise<void> { this.store().removeItem(PREFIX + id); }

  async clear(): Promise<void> { for (const k of this.keys()) this.store().removeItem(k); }

  async issues(): Promise<LoadIssue[]> {
    const out: LoadIssue[] = [];
    for (const k of this.keys()) { const r = parse(this.store().getItem(k)); if (r && "error" in r) out.push({ key: k, reason: r.error }); }
    return out;
  }
}

export class LocalStorageTripRepository extends BrowserStorageTripRepository {
  constructor() { super(() => (typeof window === "undefined" ? null : window.localStorage)); }
}

/** Session-scoped drafts: a generated-but-unconfirmed itinerary should vanish with the tab. */
export class BrowserStorageDraftRepository implements DraftRepository {
  constructor(private readonly getStore: () => KeyValueStore | null) {}
  async getDraft() { const r = parse(this.getStore()?.getItem(DRAFT_KEY) ?? null); return r && "trip" in r ? r.trip : null; }
  async saveDraft(t: Trip) { this.getStore()?.setItem(DRAFT_KEY, JSON.stringify(TripSchema.parse(t))); }
  async clearDraft() { this.getStore()?.removeItem(DRAFT_KEY); }
}
export class SessionStorageDraftRepository extends BrowserStorageDraftRepository {
  constructor() { super(() => (typeof window === "undefined" ? null : window.sessionStorage)); }
}
