import type { DataStatus, GeoPoint } from "@/domain/schemas";

export interface ProviderResult<T> {
  data: T | null;
  status: DataStatus; // live | cached | demo | unavailable
  source: string;
  retrievedAt: string;
  error?: string;
}

export interface DailyWeather { date: string; tempMaxC: number; tempMinC: number; precipitationChance: number | null; code: number; summary: string }
export interface WeatherProvider { readonly id: string; getDaily(location: GeoPoint, from: string, to: string): Promise<ProviderResult<DailyWeather[]>> }

export interface ExchangeRate { from: string; to: string; value: number; asOf: string }
export interface CurrencyRateProvider { readonly id: string; getRate(from: string, to: string): Promise<ProviderResult<ExchangeRate>> }

export interface DirectionsProvider {
  readonly id: string;
  /** External deep link; never fabricates a route, distance or duration. */
  directionsUrl(to: GeoPoint, from?: GeoPoint | string, mode?: "walking" | "transit" | "driving"): string;
  placeUrl(p: GeoPoint, label?: string): string;
  /** Optional embeddable map (keyless OSM). null when not supported. */
  embedUrl(points: GeoPoint[]): string | null;
}
