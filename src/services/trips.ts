import { TRIP_SCHEMA_VERSION, TripInputSchema, TripSchema, type Trip, type TripInput } from "@/domain/schemas";
import { newId } from "@/lib/ids";
import type { ItineraryGenerator } from "./itinerary/ItineraryGenerator";

const notices = new WeakMap<Trip, string>();
/** User-facing note from the last generation of this draft (e.g. discovery fallback), if any. */
export function generationNotice(t: Trip): string | undefined { return notices.get(t); }

export async function generateTrip(input: TripInput, generator: ItineraryGenerator, seed = 0, onProgress?: (msg: string) => void): Promise<Trip> {
  const valid = TripInputSchema.parse(input);
  const g = await generator.generate(valid, { seed, onProgress });
  const now = new Date().toISOString();
  const trip = TripSchema.parse({
    schemaVersion: TRIP_SCHEMA_VERSION, id: newId("t_"), destination: g.destination, arrivalDate: valid.arrivalDate, departureDate: valid.departureDate,
    nativeCurrency: valid.nativeCurrency, accommodation: valid.accommodation, flights: valid.flights, preferences: valid.preferences, days: g.days, places: g.places,
    sharing: { mode: "private", includeAccommodation: false }, generator: g.generator, createdAt: now, updatedAt: now,
  });
  if (g.notice) notices.set(trip, g.notice);
  return trip;
}
