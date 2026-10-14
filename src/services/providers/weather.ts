import type { GeoPoint } from "@/domain/schemas";
import type { DailyWeather, ProviderResult, WeatherProvider } from "./types";

export function weatherSummary(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Thunderstorms";
}
export const isWet = (w: DailyWeather) => w.code >= 51 || (w.precipitationChance ?? 0) >= 60;

/** Live forecasts from Open-Meteo (free, no API key). Forecasts only cover ~16 days ahead. */
export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly id = "open-meteo";
  constructor(private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}
  async getDaily(loc: GeoPoint, from: string, to: string): Promise<ProviderResult<DailyWeather[]>> {
    const retrievedAt = new Date().toISOString();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`;
    try {
      const res = await this.fetchImpl(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max?: (number | null)[] } };
      const d = j.daily;
      if (!d || !Array.isArray(d.time)) throw new Error("Unexpected response");
      const days: DailyWeather[] = d.time.map((date, i) => ({ date, code: d.weather_code[i], tempMaxC: d.temperature_2m_max[i], tempMinC: d.temperature_2m_min[i], precipitationChance: d.precipitation_probability_max?.[i] ?? null, summary: weatherSummary(d.weather_code[i]) }))
        .filter((w) => w.date >= from && w.date <= to);
      return { data: days, status: days.length ? "live" : "unavailable", source: "Open-Meteo", retrievedAt, error: days.length ? undefined : "Your dates are beyond the 16-day forecast window" };
    } catch (e) {
      return { data: null, status: "unavailable", source: "Open-Meteo", retrievedAt, error: e instanceof Error ? e.message : "Request failed" };
    }
  }
}

/** Illustrative, deterministic weather. Always labelled "demo" — never shown as live. */
export class DemoWeatherProvider implements WeatherProvider {
  readonly id = "demo";
  async getDaily(loc: GeoPoint, from: string, to: string): Promise<ProviderResult<DailyWeather[]>> {
    const out: DailyWeather[] = [];
    const d = new Date(from + "T00:00:00Z"), e = new Date(to + "T00:00:00Z");
    let i = 0;
    while (d <= e) {
      const base = 28 - Math.abs(loc.lat) * 0.3 + Math.sin((d.getUTCMonth() - 3) / 12 * 2 * Math.PI) * 8;
      const code = [0, 1, 2, 3, 61, 1][(i + Math.round(loc.lng)) % 6 < 0 ? 0 : (i + Math.round(Math.abs(loc.lng))) % 6];
      out.push({ date: d.toISOString().slice(0, 10), tempMaxC: Math.round(base), tempMinC: Math.round(base - 8), precipitationChance: code >= 61 ? 70 : 10, code, summary: weatherSummary(code) });
      d.setUTCDate(d.getUTCDate() + 1); i++;
    }
    return { data: out, status: "demo", source: "Planet demo weather (illustrative)", retrievedAt: new Date().toISOString() };
  }
}
