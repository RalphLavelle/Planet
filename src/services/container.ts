import { LocalStorageTripRepository, SessionStorageDraftRepository } from "@/repositories/BrowserStorageTripRepository";
import { SyncedTripRepository } from "@/repositories/SyncedTripRepository";
import { SupabaseTripStore } from "@/repositories/SupabaseTripStore";
import { SupabaseSession } from "@/auth/SupabaseSession";
import { SupabaseAuth } from "@/auth/SupabaseAuth";
import { AccountController } from "@/auth/AccountController";
import type { DraftRepository, TripRepository } from "@/repositories/TripRepository";
import { DemoItineraryGenerator } from "./itinerary/DemoItineraryGenerator";
import type { ItineraryGenerator } from "./itinerary/ItineraryGenerator";
import { FrankfurterCurrencyRateProvider } from "./providers/currency";
import { ExternalLinkDirectionsProvider } from "./providers/directions";
import { DemoWeatherProvider, OpenMeteoWeatherProvider } from "./providers/weather";
import type { DirectionsProvider } from "./providers/types";
import { RefreshService } from "./refresh";
import { UiPrefs } from "./uiPrefs";
import { NominatimGeocoder, type Geocoder } from "./geocoding";
import { OsmPlaceDiscovery } from "./discovery/PlaceDiscovery";
import { OsmRestaurantFinder, type RestaurantFinder } from "./restaurants";

/**
 * THE composition root. The only place concrete repositories/providers are chosen.
 * Persistence: localStorage always; when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are both set at
 * build time, trips additionally sync to Supabase (local-first). Without them the app is localStorage-only.
 */
export interface Services {
  trips: TripRepository;
  /** Email+password account (null when Supabase is not configured: the app is then localStorage-only). */
  account: AccountController | null;
  drafts: DraftRepository;
  generator: ItineraryGenerator;
  directions: DirectionsProvider;
  refresh: RefreshService;
  geocoder: Geocoder;
  restaurants: RestaurantFinder;
  uiPrefs: UiPrefs;
  persistenceLabel: string;
}

let instance: Services | null = null;

export function getServices(): Services {
  if (instance) return instance;
  // NEXT_PUBLIC_* must be referenced literally so Next.js can inline them.
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const local = new LocalStorageTripRepository();
  const synced = !!supaUrl && !!supaKey && process.env.NEXT_PUBLIC_TRIP_REPOSITORY !== "local";
  const lsOrNull = () => (typeof window === "undefined" ? null : window.localStorage);
  let trips: TripRepository = local;
  let account: AccountController | null = null;
  if (synced) {
    const session = new SupabaseSession(supaUrl, supaKey);
    const repo = new SyncedTripRepository(local, new SupabaseTripStore(session), lsOrNull);
    trips = repo;
    account = new AccountController(new SupabaseAuth(session), repo);
  }
  const weather = process.env.NEXT_PUBLIC_WEATHER_PROVIDER === "demo" ? new DemoWeatherProvider() : new OpenMeteoWeatherProvider();
  const ls = () => (typeof window === "undefined" ? null : window.localStorage);
  instance = {
    trips,
    account,
    drafts: new SessionStorageDraftRepository(),
    generator: new DemoItineraryGenerator(new OsmPlaceDiscovery(ls), new NominatimGeocoder(ls)),
    directions: new ExternalLinkDirectionsProvider(),
    refresh: new RefreshService(weather, new FrankfurterCurrencyRateProvider(), () => (typeof window === "undefined" ? null : window.localStorage)),
    uiPrefs: new UiPrefs(() => (typeof window === "undefined" ? null : window.localStorage)),
    restaurants: new OsmRestaurantFinder(() => (typeof window === "undefined" ? null : window.localStorage)),
    geocoder: new NominatimGeocoder(() => (typeof window === "undefined" ? null : window.localStorage)),
    persistenceLabel: synced ? "Saved to your Planet database (Supabase) and cached in this browser" : "This browser only (localStorage)",
  };
  return instance;
}
