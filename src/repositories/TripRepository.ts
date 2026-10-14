import type { Trip } from "@/domain/schemas";

export interface TripSummary {
  id: string;
  destinationName: string;
  arrivalDate: string;
  departureDate: string;
  updatedAt: string;
}

export interface LoadIssue { key: string; reason: string }

/** Persistence-agnostic contract. Implementations: LocalStorageTripRepository (now), Supabase/Postgres (future). */
export interface TripRepository {
  list(): Promise<TripSummary[]>;
  get(id: string): Promise<Trip | null>;
  /** Insert or replace a trip. Implementations must validate before writing. */
  save(trip: Trip): Promise<Trip>;
  delete(id: string): Promise<void>;
  /** Remove every trip this repository manages (reset / clear demo data). */
  clear(): Promise<void>;
  /** Records that could not be read (corrupt or unknown version), for user-facing diagnostics. */
  issues(): Promise<LoadIssue[]>;
}

/** Short-lived drafts (e.g. a generated itinerary awaiting confirmation). */
export interface DraftRepository {
  getDraft(): Promise<Trip | null>;
  saveDraft(trip: Trip): Promise<void>;
  clearDraft(): Promise<void>;
}

/** Minimal synchronous key/value storage, satisfied by window.localStorage / sessionStorage and test fakes. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
}
