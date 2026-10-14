import { z } from "zod";
import { TripSchema, type Trip } from "@/domain/schemas";
import { migrate } from "@/repositories/migrations";
import { newId } from "@/lib/ids";

/** Portable, read-only snapshot. Accommodation is stripped unless explicitly included. */
export const SnapshotSchema = z.object({ kind: z.literal("planet-snapshot"), version: z.literal(1), createdAt: z.string().datetime(), trip: TripSchema });
export type Snapshot = z.infer<typeof SnapshotSchema>;

export function createSnapshot(trip: Trip, opts: { includeAccommodation?: boolean } = {}): Snapshot {
  const clean: Trip = { ...trip, accommodation: opts.includeAccommodation ? trip.accommodation : "", sharing: { mode: "snapshot", includeAccommodation: !!opts.includeAccommodation }, preferences: { ...trip.preferences, notes: "" } };
  return { kind: "planet-snapshot", version: 1, createdAt: new Date().toISOString(), trip: TripSchema.parse(clean) };
}

const b64urlEncode = (s: string) => { const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const b64urlDecode = (s: string) => { const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/")); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };

export function encodeSnapshot(s: Snapshot): string { return b64urlEncode(JSON.stringify(s)); }

export const MAX_SNAPSHOT_BYTES = 200_000;

export function parseSnapshot(text: string): { ok: true; snapshot: Snapshot } | { ok: false; error: string } {
  if (text.length > MAX_SNAPSHOT_BYTES) return { ok: false, error: "Snapshot is too large" };
  let json: unknown;
  try { json = JSON.parse(text); } catch { try { json = JSON.parse(b64urlDecode(text.trim())); } catch { return { ok: false, error: "This doesn't look like a Planet snapshot" }; } }
  if (json && typeof json === "object" && "trip" in json) (json as { trip: unknown }).trip = migrate((json as { trip: unknown }).trip);
  const r = SnapshotSchema.safeParse(json);
  return r.success ? { ok: true, snapshot: r.data } : { ok: false, error: "Snapshot failed validation: " + (r.error.issues[0]?.message ?? "invalid") };
}

/** Imported trips get a fresh local id so they never overwrite an existing trip. */
export function tripFromSnapshot(s: Snapshot): Trip {
  const now = new Date().toISOString();
  return TripSchema.parse({ ...s.trip, id: newId("t_"), sharing: { mode: "private", includeAccommodation: false }, createdAt: now, updatedAt: now });
}
