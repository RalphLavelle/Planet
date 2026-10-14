import { describe, expect, it } from "vitest";
import { TripInputSchema } from "@/domain/schemas";
import { convertEstimate, formatEstimate, formatMoney, sumEstimates } from "@/domain/money";
import { athensInput, makeTrip } from "./helpers";

describe("trip creation & validation", () => {
  it("accepts valid input with defaults for optional preferences", () => {
    const r = TripInputSchema.parse({ destination: "Lisbon", arrivalDate: "2026-05-01", departureDate: "2026-05-03", nativeCurrency: "USD" });
    expect(r.preferences.pace).toBe("balanced");
    expect(r.accommodation).toBe("");
  });
  it.each([
    [{ destination: "" }, "destination"],
    [{ departureDate: "2026-11-01" }, "departureDate"],
    [{ departureDate: "2026-12-30" }, "departureDate"],
    [{ nativeCurrency: "euro" }, "nativeCurrency"],
    [{ arrivalDate: "10/11/2026" }, "arrivalDate"],
  ])("rejects %o", (patch, field) => {
    const r = TripInputSchema.safeParse({ ...athensInput, ...patch });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path[0] === field)).toBe(true);
  });
  it("creates a validated trip", async () => {
    const t = await makeTrip();
    expect(t.id).toMatch(/^t_/);
    expect(t.destination.catalogKey).toBe("athens");
    expect(t.days).toHaveLength(4);
  });
});

describe("currency", () => {
  it("formats by currency code", () => {
    expect(formatMoney(12.5, "EUR")).toBe("€12.5");
    expect(formatMoney(3800, "JPY")).toContain("3,800");
    expect(formatEstimate({ min: 10, max: 20, currency: "GBP", confidence: "illustrative" })).toBe("≈ £10–£20");
    expect(formatEstimate({ min: 0, max: 0, currency: "GBP", confidence: "illustrative" })).toBe("Free");
  });
  it("handles unavailable exchange rates without inventing one", () => {
    const e = { min: 10, max: 20, currency: "EUR", confidence: "illustrative" as const };
    expect(convertEstimate(e, "GBP", null)).toEqual({ kind: "unavailable", reason: "No exchange rate available" });
    expect(convertEstimate(e, "EUR", null)).toEqual({ kind: "same" });
    const c = convertEstimate(e, "GBP", { value: 0.85, status: "live" });
    expect(c.kind === "converted" && c.text).toBe("≈ £9–£17");
  });
  it("sums only matching currencies", () => {
    expect(sumEstimates([{ min: 1, max: 2, currency: "EUR", confidence: "illustrative" }, { min: 5, max: 5, currency: "USD", confidence: "illustrative" }], "EUR")).toMatchObject({ min: 1, max: 2 });
    expect(sumEstimates([], "EUR")).toBeNull();
  });
});
