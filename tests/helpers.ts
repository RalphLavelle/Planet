import { MemoryStore } from "@/repositories/TripRepository";
import { BrowserStorageTripRepository } from "@/repositories/BrowserStorageTripRepository";
import { DemoItineraryGenerator } from "@/services/itinerary/DemoItineraryGenerator";
import { generateTrip } from "@/services/trips";
import type { TripInput } from "@/domain/schemas";

export const athensInput: TripInput = { destination: "Athens", arrivalDate: "2026-11-10", departureDate: "2026-11-13", nativeCurrency: "GBP", accommodation: "Koukaki", preferences: { interests: ["history", "food"] } };
export const makeTrip = (i: Partial<TripInput> = {}) => generateTrip({ ...athensInput, ...i }, new DemoItineraryGenerator());
export function makeRepo() { const store = new MemoryStore(); return { store, repo: new BrowserStorageTripRepository(() => store) }; }
