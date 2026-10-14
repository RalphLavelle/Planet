import type { CurrencyCode, MoneyEstimate } from "./schemas";

export function formatMoney(amount: number, currency: CurrencyCode, locale = "en-GB"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: amount >= 100 ? 0 : 2, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatEstimate(e: MoneyEstimate): string {
  if (e.max === 0) return "Free";
  const prefix = e.confidence === "verified" ? "" : "≈ ";
  return e.min === e.max ? prefix + formatMoney(e.min, e.currency) : `${prefix}${formatMoney(e.min, e.currency)}–${formatMoney(e.max, e.currency)}`;
}

export type ConversionResult =
  | { kind: "same" }
  | { kind: "converted"; text: string; rateStatus: "live" | "cached" | "illustrative"; asOf?: string }
  | { kind: "unavailable"; reason: string };

export function convertEstimate(e: MoneyEstimate, to: CurrencyCode, rate: { value: number; status: "live" | "cached" | "illustrative"; asOf?: string } | null): ConversionResult {
  if (e.currency === to) return { kind: "same" };
  if (!rate || !Number.isFinite(rate.value) || rate.value <= 0) return { kind: "unavailable", reason: "No exchange rate available" };
  const r = (n: number) => Math.round(n * rate.value);
  return { kind: "converted", text: formatEstimate({ ...e, min: r(e.min), max: r(e.max), currency: to, confidence: "illustrative" }), rateStatus: rate.status, asOf: rate.asOf };
}

export function sumEstimates(list: MoneyEstimate[], currency: CurrencyCode): MoneyEstimate | null {
  const same = list.filter((m) => m.currency === currency);
  if (!same.length) return null;
  return { min: same.reduce((a, m) => a + m.min, 0), max: same.reduce((a, m) => a + m.max, 0), currency, confidence: "estimated" };
}
