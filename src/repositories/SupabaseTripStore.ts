import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trip } from "@/domain/schemas";
import type { RemoteTripRow, RemoteTripStore } from "./SyncedTripRepository";

const TABLE = "trips";

/** Column mapping for public.trips (see supabase/migrations). owner_id is filled by the database from auth.uid(). */
export function toDbRow(trip: Trip) {
  return {
    id: trip.id, data: trip, schema_version: trip.schemaVersion, destination_name: trip.destination.name,
    arrival_date: trip.arrivalDate, departure_date: trip.departureDate, created_at: trip.createdAt, updated_at: trip.updatedAt, deleted_at: null,
  };
}

/**
 * Supabase-backed remote store. Identity is Supabase anonymous auth: the first call creates an anonymous user whose
 * session is kept in this browser; row level security limits every query to that user's own rows.
 * supabase-js is imported lazily so the localStorage-only build never loads it.
 */
export class SupabaseTripStore implements RemoteTripStore {
  private clientP: Promise<SupabaseClient> | null = null;
  constructor(private readonly url: string, private readonly anonKey: string) {}

  private client(): Promise<SupabaseClient> {
    if (!this.clientP) {
      this.clientP = (async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const c = createClient(this.url, this.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "planet:supabase-auth" } });
        const { data } = await c.auth.getSession();
        if (!data.session) {
          const { error } = await c.auth.signInAnonymously();
          if (error) throw new Error("Supabase sign-in failed: " + error.message);
        }
        return c;
      })();
      this.clientP.catch(() => { this.clientP = null; }); // allow retry later
    }
    return this.clientP;
  }

  async fetchAll(): Promise<RemoteTripRow[]> {
    const c = await this.client();
    const { data, error } = await c.from(TABLE).select("id,data,updated_at,deleted_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ id: r.id as string, data: r.data, updatedAt: r.updated_at as string, deletedAt: (r.deleted_at as string | null) ?? null }));
  }

  async upsert(trip: Trip): Promise<void> {
    const c = await this.client();
    const { error } = await c.from(TABLE).upsert(toDbRow(trip), { onConflict: "owner_id,id" });
    if (error) throw new Error(error.message);
  }

  async softDelete(id: string, at: string): Promise<void> {
    const c = await this.client();
    const { error } = await c.from(TABLE).update({ deleted_at: at, data: {} }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}
