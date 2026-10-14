import { describe, expect, it } from "vitest";
import { FlightSchema, TripInputSchema, normalizeFlightNumber } from "@/domain/schemas";
import { createSnapshot } from "@/services/sharing";
import { updateFlights } from "@/services/editing";
import { haversineKm, formatDistance, NominatimGeocoder } from "@/services/geocoding";
import { MemoryStore } from "@/repositories/TripRepository";
import { athensInput, makeTrip } from "./helpers";

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

describe("flights", () => {
  it("validates and normalises flight numbers", () => {
    expect(normalizeFlightNumber("a3601")).toBe("A3 601");
    expect(FlightSchema.parse({ number: " ba  2490 " }).number).toBe("BA 2490");
    expect(FlightSchema.parse({ number: "U28123" }).number).toBe("U2 8123");
    expect(FlightSchema.safeParse({ number: "HELLO" }).success).toBe(false);
    expect(FlightSchema.safeParse({ number: "A3 12345" }).success).toBe(false);
    expect(FlightSchema.safeParse({ time: "25:00" }).success).toBe(false);
    expect(FlightSchema.parse({}).number).toBeUndefined();
  });
  it("rejects a same-day departure before arrival", () => {
    const r = TripInputSchema.safeParse({ ...athensInput, departureDate: athensInput.arrivalDate, flights: { arrival: { time: "15:00" }, departure: { time: "10:00" } } });
    expect(r.success).toBe(false);
  });
  it("starts day 1 after arrival + buffer and ends the last day 3h before departure", async () => {
    const t = await makeTrip({ flights: { arrival: { number: "A3 601", time: "11:20" }, departure: { number: "A3 602", time: "18:30" } } });
    const first = t.days[0].activities, last = t.days.at(-1)!.activities;
    expect(first.length).toBeGreaterThan(0);
    expect(Math.min(...first.map((a) => toMin(a.startTime!)))).toBeGreaterThanOrEqual(toMin("11:20") + 150);
    expect(Math.max(...last.map((a) => toMin(a.startTime!) + a.durationMinutes))).toBeLessThanOrEqual(toMin("18:30") - 180);
    expect(t.flights.arrival?.number).toBe("A3 601");
  });
  it("handles late arrivals, early departures and missing times gracefully", async () => {
    const late = await makeTrip({ flights: { arrival: { time: "22:45" }, departure: { time: "07:00" } } });
    expect(late.days[0].activities).toHaveLength(0);
    expect(late.days.at(-1)!.activities).toHaveLength(0);
    const noTimes = await makeTrip({ flights: { arrival: { number: "A3 601" } } });
    expect(noTimes.days[0].activities.every((a) => a.startTime! >= "14:00")).toBe(true);
  });
  it("excludes flights from snapshots unless opted in, and edits keep the itinerary", async () => {
    const t = await makeTrip({ flights: { arrival: { number: "A3 601", time: "11:20" } } });
    expect(createSnapshot(t).trip.flights).toEqual({});
    expect(createSnapshot(t, { includeFlights: true }).trip.flights.arrival?.number).toBe("A3 601");
    const u = updateFlights(t, { arrival: { number: "oa 123", time: "09:00" } });
    expect(u.flights.arrival?.number).toBe("OA 123");
    expect(u.days).toEqual(t.days);
    expect(() => updateFlights(t, { arrival: { number: "nope!" } })).toThrow();
  });
});

describe("distance & geocoding", () => {
  it("computes great-circle distance", () => {
    const d = haversineKm({ lat: 37.9715, lng: 23.7257 }, { lat: 37.9685, lng: 23.7286 });
    expect(d).toBeGreaterThan(0.3); expect(d).toBeLessThan(0.5);
    expect(formatDistance(0.42)).toBe("420 m"); expect(formatDistance(3.26)).toBe("3.3 km");
  });
  it("caches Nominatim results including misses and survives network errors", async () => {
    const store = new MemoryStore(); let calls = 0;
    const f = (async () => { calls++; return new Response(JSON.stringify([{ lat: "37.96", lon: "23.72" }])); }) as unknown as typeof fetch;
    const g = new NominatimGeocoder(() => store, f);
    expect(await g.geocode("Koukaki, Athens")).toEqual({ lat: 37.96, lng: 23.72 });
    expect(await g.geocode("koukaki, athens")).toEqual({ lat: 37.96, lng: 23.72 });
    expect(calls).toBe(1);
    const boom = new NominatimGeocoder(() => new MemoryStore(), (async () => { throw new Error("offline"); }) as unknown as typeof fetch);
    expect(await boom.geocode("Nowhere")).toBeNull();
  });
});
