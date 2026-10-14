import { TRIP_SCHEMA_VERSION, TripInputSchema, TripSchema, type Trip, type TripInput } from "@/domain/schemas";
import { newId } from "@/lib/ids";
import type { ItineraryGenerator } from "./itinerary/ItineraryGenerator";

export async function generateTrip(input: TripInput, generator: ItineraryGenerator, seed = 0): Promise<Trip> {
  const valid = TripInputSchema.parse(input);
  const g = await generator.generate(valid, { seed });
  const now = new Date().toISOString();
  return TripSchema.parse({
    schemaVersion: TRIP_SCHEMA_VERSION, id: newId("t_"), destination: g.destination, arrivalDate: valid.arrivalDate, departureDate: valid.departureDate,
    nativeCurrency: valid.nativeCurrency, accommodation: valid.accommodation, preferences: valid.preferences, days: g.days, places: g.places,
    sharing: { mode: "private", includeAccommodation: false }, generator: g.generator, createdAt: now, updatedAt: now,
  });
}
