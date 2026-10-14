import type { Destination, ItineraryDay, Place, ValidTripInput } from "@/domain/schemas";

export interface GeneratedItinerary {
  destination: Destination;
  days: ItineraryDay[];
  places: Place[];
  generator: string;
}

/**
 * Strategy interface. Implementations: DemoItineraryGenerator (local, deterministic).
 * Future: LlmItineraryGenerator calling a Next.js route handler (API key stays server-side),
 * whose output MUST be validated with ItineraryDaySchema/PlaceSchema before use.
 */
export interface ItineraryGenerator {
  readonly id: string;
  generate(input: ValidTripInput, opts?: { seed?: number }): Promise<GeneratedItinerary>;
}
