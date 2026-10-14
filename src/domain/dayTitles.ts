import type { ItineraryDay, Trip } from "./schemas";

/** Derive a day title from its CURRENT activities (never cached state). */
export function autoDayTitle(day: Pick<ItineraryDay, "activities">, index: number, totalDays: number, hasDepartureTime = false): string {
  const multi = totalDays > 1;
  if (index === 0 && multi) return "Arrival & first look";
  if (index === totalDays - 1 && multi && hasDepartureTime) return "Last look & departure";
  const lead = day.activities.find((a) => a.category !== "food" && a.category !== "transport") ?? day.activities[0];
  if (!lead) return `Day ${index + 1}: A free day`;
  return `Day ${index + 1}: ${lead.title.split(/[&,(]/)[0].trim()}`;
}

/** The title to display/store: user titles are kept verbatim, auto titles are recomputed. */
export function displayDayTitle(trip: Pick<Trip, "days" | "flights">, dayIndex: number): string {
  const d = trip.days[dayIndex];
  if (d.titleMode === "user" && d.title.trim()) return d.title;
  return autoDayTitle(d, dayIndex, trip.days.length, !!trip.flights?.departure?.time);
}

/** Recompute every auto-titled day. Call after any change to activities. */
export function retitle<T extends Pick<Trip, "days" | "flights">>(trip: T): T {
  return { ...trip, days: trip.days.map((d, i) => (d.titleMode === "user" && d.title.trim() ? d : { ...d, titleMode: "auto" as const, title: autoDayTitle(d, i, trip.days.length, !!trip.flights?.departure?.time) })) };
}
