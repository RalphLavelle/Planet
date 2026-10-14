import { LocalStorageTripRepository, SessionStorageDraftRepository } from "@/repositories/BrowserStorageTripRepository";
import type { DraftRepository, TripRepository } from "@/repositories/TripRepository";
import { DemoItineraryGenerator } from "./itinerary/DemoItineraryGenerator";
import type { ItineraryGenerator } from "./itinerary/ItineraryGenerator";
import { FrankfurterCurrencyRateProvider } from "./providers/currency";
import { ExternalLinkDirectionsProvider } from "./providers/directions";
import { DemoWeatherProvider, OpenMeteoWeatherProvider } from "./providers/weather";
import type { DirectionsProvider } from "./providers/types";
import { RefreshService } from "./refresh";
import { NominatimGeocoder, type Geocoder } from "./geocoding";

/**
 * THE composition root. The only place concrete repositories/providers are chosen.
 * To switch persistence, add a case for e.g. "supabase" returning new SupabaseTripRepository(...).
 */
export interface Services {
  trips: TripRepository;
  drafts: DraftRepository;
  generator: ItineraryGenerator;
  directions: DirectionsProvider;
  refresh: RefreshService;
  geocoder: Geocoder;
  persistenceLabel: string;
}

let instance: Services | null = null;

export function getServices(): Services {
  if (instance) return instance;
  const repoKind = process.env.NEXT_PUBLIC_TRIP_REPOSITORY ?? "local";
  let trips: TripRepository;
  switch (repoKind) {
    case "local":
    default:
      trips = new LocalStorageTripRepository();
  }
  const weather = process.env.NEXT_PUBLIC_WEATHER_PROVIDER === "demo" ? new DemoWeatherProvider() : new OpenMeteoWeatherProvider();
  instance = {
    trips,
    drafts: new SessionStorageDraftRepository(),
    generator: new DemoItineraryGenerator(),
    directions: new ExternalLinkDirectionsProvider(),
    refresh: new RefreshService(weather, new FrankfurterCurrencyRateProvider(), () => (typeof window === "undefined" ? null : window.localStorage)),
    geocoder: new NominatimGeocoder(() => (typeof window === "undefined" ? null : window.localStorage)),
    persistenceLabel: "This browser only (localStorage)",
  };
  return instance;
}
