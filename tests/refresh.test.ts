import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/repositories/TripRepository";
import { RefreshService } from "@/services/refresh";
import { OpenMeteoWeatherProvider, DemoWeatherProvider } from "@/services/providers/weather";
import { FrankfurterCurrencyRateProvider, UnavailableCurrencyRateProvider } from "@/services/providers/currency";
import type { DailyWeather, ProviderResult, WeatherProvider } from "@/services/providers/types";
import { makeTrip } from "./helpers";

const ok = (days: DailyWeather[]): ProviderResult<DailyWeather[]> => ({ data: days, status: "live", source: "fake", retrievedAt: new Date().toISOString() });
const fail: ProviderResult<DailyWeather[]> = { data: null, status: "unavailable", source: "fake", retrievedAt: new Date().toISOString(), error: "down" };
class Fake implements WeatherProvider { id = "fake"; constructor(public next: ProviderResult<DailyWeather[]>) {} async getDaily() { return this.next; } }

describe("refresh service", () => {
  it("returns live data then falls back to cached, flagging stale", async () => {
    const t = await makeTrip();
    const day: DailyWeather = { date: t.days[1].date, tempMaxC: 20, tempMinC: 12, precipitationChance: 90, code: 63, summary: "Rain" };
    const store = new MemoryStore();
    const w = new Fake(ok([day]));
    const svc = new RefreshService(w, new UnavailableCurrencyRateProvider(), () => store);
    expect((await svc.refresh(t)).weather.status).toBe("live");
    w.next = fail;
    const r2 = await svc.refresh(t);
    expect(r2.weather).toMatchObject({ status: "cached", stale: false, error: "down" });
    // age the cache
    const k = store.key(0)!; const c = JSON.parse(store.getItem(k)!); c.retrievedAt = new Date(Date.now() - 864e5).toISOString(); store.setItem(k, JSON.stringify(c));
    expect((await svc.refresh(t)).weather.stale).toBe(true);
    expect(r2.rate?.status).toBe("unavailable");
  });
  it("reports unavailable without cache and suggests (never applies) indoor swaps", async () => {
    const t = await makeTrip();
    const before = JSON.stringify(t);
    const svc = new RefreshService(new Fake(fail), new UnavailableCurrencyRateProvider(), () => new MemoryStore());
    expect((await svc.refresh(t)).weather.status).toBe("unavailable");
    const rainy = t.days.map((d, i) => ({ date: d.date, tempMaxC: 18, tempMinC: 10, precipitationChance: i === 1 ? 90 : 0, code: i === 1 ? 63 : 0, summary: "" }));
    const r = await new RefreshService(new Fake(ok(rainy)), new UnavailableCurrencyRateProvider(), () => new MemoryStore()).refresh(t);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.every((s) => s.dayId === t.days[1].id)).toBe(true);
    expect(JSON.stringify(t)).toBe(before);
  });
  it("Open-Meteo/Frankfurter providers degrade gracefully on network errors", async () => {
    const boom = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect((await new OpenMeteoWeatherProvider(boom).getDaily({ lat: 1, lng: 1 }, "2026-01-01", "2026-01-02")).status).toBe("unavailable");
    expect((await new FrankfurterCurrencyRateProvider(boom).getRate("EUR", "GBP")).data).toBeNull();
    expect((await new DemoWeatherProvider().getDaily({ lat: 38, lng: 23 }, "2026-01-01", "2026-01-03")).status).toBe("demo");
  });
});
