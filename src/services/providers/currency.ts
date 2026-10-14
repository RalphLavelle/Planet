import type { CurrencyRateProvider, ExchangeRate, ProviderResult } from "./types";

/** Live ECB reference rates via frankfurter.dev (free, no key). Falls back to "unavailable" — never a hard-coded rate. */
export class FrankfurterCurrencyRateProvider implements CurrencyRateProvider {
  readonly id = "frankfurter";
  constructor(private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}
  async getRate(from: string, to: string): Promise<ProviderResult<ExchangeRate>> {
    const retrievedAt = new Date().toISOString();
    if (from === to) return { data: { from, to, value: 1, asOf: retrievedAt.slice(0, 10) }, status: "live", source: "identity", retrievedAt };
    try {
      const res = await this.fetchImpl(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as { date?: string; rates?: Record<string, number> };
      const v = j.rates?.[to];
      if (typeof v !== "number") throw new Error(`No rate for ${from}→${to}`);
      return { data: { from, to, value: v, asOf: j.date ?? retrievedAt.slice(0, 10) }, status: "live", source: "Frankfurter (ECB reference rates)", retrievedAt };
    } catch (e) {
      return { data: null, status: "unavailable", source: "Frankfurter", retrievedAt, error: e instanceof Error ? e.message : "Request failed" };
    }
  }
}

export class UnavailableCurrencyRateProvider implements CurrencyRateProvider {
  readonly id = "none";
  async getRate(): Promise<ProviderResult<ExchangeRate>> {
    return { data: null, status: "unavailable", source: "No exchange-rate provider configured", retrievedAt: new Date().toISOString() };
  }
}
