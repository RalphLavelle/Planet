import { z } from "zod";
import type { KeyValueStore } from "@/repositories/TripRepository";

/** Per-trip presentation preferences (e.g. collapsed days). Kept apart from trip data and from components. */
export class UiPrefs {
  constructor(private readonly store: () => KeyValueStore | null) {}
  async getCollapsedDays(tripId: string): Promise<string[]> {
    try { return z.array(z.string()).parse(JSON.parse(this.store()?.getItem(`planet:ui:collapsed:${tripId}`) ?? "[]")); } catch { return []; }
  }
  async setCollapsedDays(tripId: string, dayIds: string[]): Promise<void> {
    try { this.store()?.setItem(`planet:ui:collapsed:${tripId}`, JSON.stringify(dayIds)); } catch { /* best effort */ }
  }
}
