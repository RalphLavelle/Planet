import type { Trip } from "@/domain/schemas";
import type { KeyValueStore } from "@/repositories/TripRepository";
import { isWet } from "./providers/weather";
import type { CurrencyRateProvider, DailyWeather, ExchangeRate, ProviderResult, WeatherProvider } from "./providers/types";

export interface Freshness<T> extends ProviderResult<T> { stale: boolean }

export interface Suggestion {
  dayId: string;
  activityId: string;
  reason: string;
  /** Indoor activity on the same trip that could be swapped in. The user decides; nothing is changed automatically. */
  swapWithActivityId?: string;
}

export interface RefreshReport {
  weather: Freshness<DailyWeather[]>;
  rate: Freshness<ExchangeRate> | null;
  suggestions: Suggestion[];
}

const STALE_MS = 6 * 3600 * 1000;

/**
 * Refreshes FACTUAL data only (weather, exchange rates). It never modifies the itinerary:
 * it returns suggestions which the UI presents for explicit user approval.
 * Designed to be callable from a future scheduled server job with server-side caches.
 */
export class RefreshService {
  constructor(
    private readonly weather: WeatherProvider,
    private readonly currency: CurrencyRateProvider,
    private readonly cache: () => KeyValueStore | null,
  ) {}

  private async withCache<T>(key: string, fetcher: () => Promise<ProviderResult<T>>): Promise<Freshness<T>> {
    const store = this.cache();
    const res = await fetcher();
    if (res.data && res.status !== "unavailable") {
      try { store?.setItem(key, JSON.stringify(res)); } catch { /* cache is best-effort */ }
      return { ...res, stale: false };
    }
    const raw = store?.getItem(key);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as ProviderResult<T>;
        if (cached.data) return { ...cached, status: cached.status === "demo" ? "demo" : "cached", stale: Date.now() - Date.parse(cached.retrievedAt) > STALE_MS, error: res.error };
      } catch { /* ignore corrupt cache */ }
    }
    return { ...res, stale: false };
  }

  async refresh(trip: Trip): Promise<RefreshReport> {
    const loc = trip.destination.location;
    const weather: Freshness<DailyWeather[]> = loc
      ? await this.withCache(`planet:cache:weather:${this.weather.id}:${loc.lat},${loc.lng}:${trip.arrivalDate}:${trip.departureDate}`, () => this.weather.getDaily(loc, trip.arrivalDate, trip.departureDate))
      : { data: null, status: "unavailable", source: "No coordinates for this destination", retrievedAt: new Date().toISOString(), stale: false };
    const local = trip.destination.localCurrency;
    const rate = local && local !== trip.nativeCurrency
      ? await this.withCache(`planet:cache:rate:${this.currency.id}:${local}:${trip.nativeCurrency}`, () => this.currency.getRate(local, trip.nativeCurrency))
      : null;
    return { weather, rate, suggestions: weatherSuggestions(trip, weather.data ?? []) };
  }
}

/** Identify outdoor activities affected by wet weather and propose (not apply) indoor swaps. */
export function weatherSuggestions(trip: Trip, weather: DailyWeather[]): Suggestion[] {
  const out: Suggestion[] = [];
  const wetDays = new Set(weather.filter(isWet).map((w) => w.date));
  const dryIndoor = trip.days.filter((d) => !wetDays.has(d.date)).flatMap((d) => d.activities.filter((a) => a.indoor && a.category !== "food"));
  let k = 0;
  for (const day of trip.days) {
    if (!wetDays.has(day.date)) continue;
    for (const a of day.activities) {
      if (a.indoor || a.category === "food" || a.category === "nightlife") continue;
      const swap = dryIndoor[k++];
      out.push({ dayId: day.id, activityId: a.id, reason: `Rain is forecast on this day and "${a.title}" is outdoors.`, swapWithActivityId: swap?.id });
    }
  }
  return out;
}
