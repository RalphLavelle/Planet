import { ActivitySchema, FlightsSchema, MEAL_DEFAULTS, type Activity, type GeoPoint, type Meal, type Place, type Trip, type Venue } from "@/domain/schemas";
import { newId } from "@/lib/ids";
import { retitle } from "@/domain/dayTitles";
import { withSortedDays } from "@/domain/order";

/** Pure, immutable itinerary operations. Every op returns a new Trip with updatedAt bumped. */
/**
 * Every activity change goes through here, so days are always put back in start-time order (untimed items last, in
 * their existing order) and auto day titles are recomputed from the current activities.
 */
const touch = (t: Trip, days: Trip["days"]): Trip => retitle(withSortedDays({ ...t, days, updatedAt: new Date().toISOString() }));
const findDay = (t: Trip, dayId: string) => { const i = t.days.findIndex((d) => d.id === dayId); if (i < 0) throw new Error("Day not found"); return i; };

export type ActivityPatch = Partial<Pick<Activity, "title" | "notes" | "startTime" | "durationMinutes" | "description">>;

export function updateActivity(t: Trip, dayId: string, activityId: string, patch: ActivityPatch): Trip {
  const di = findDay(t, dayId);
  const days = t.days.map((d, i) => i !== di ? d : { ...d, activities: d.activities.map((a) => a.id !== activityId ? a : ActivitySchema.parse({ ...a, ...patch, origin: a.origin === "manual" ? "manual" : "edited" })) });
  return touch(t, days);
}

export function addActivity(t: Trip, dayId: string, input: { title: string; startTime?: string; durationMinutes?: number; notes?: string }): Trip {
  const di = findDay(t, dayId);
  const a = ActivitySchema.parse({
    id: newId("a_"), title: input.title, description: "", notes: input.notes ?? "", category: "custom",
    startTime: input.startTime || undefined, durationMinutes: input.durationMinutes ?? 60, indoor: false,
    meta: { source: "You", status: "user" }, origin: "manual",
  });
  return touch(t, t.days.map((d, i) => i !== di ? d : { ...d, activities: [...d.activities, a] }));
}

/** Add a lunch/dinner at a looked-up (or manually entered) venue. Default time per meal unless given. */
export function addMeal(t: Trip, dayId: string, input: { meal: Meal; venue: Venue; location?: GeoPoint; startTime?: string; durationMinutes?: number; notes?: string }): Trip {
  const di = findDay(t, dayId);
  const d = MEAL_DEFAULTS[input.meal];
  const label = input.meal === "lunch" ? "Lunch" : "Dinner";
  const a = ActivitySchema.parse({
    id: newId("a_"), title: `${label} at ${input.venue.name}`.slice(0, 120), description: input.venue.address, notes: input.notes ?? "", category: "food",
    startTime: input.startTime || d.startTime, durationMinutes: input.durationMinutes ?? d.durationMinutes, indoor: true,
    location: input.location, meal: input.meal, venue: input.venue,
    meta: { source: input.venue.source === "osm" ? "OpenStreetMap" : "You", status: "user" }, origin: "manual",
  });
  return touch(t, t.days.map((day, i) => i !== di ? day : { ...day, activities: [...day.activities, a] }));
}

/** Add a place the trip already knows about (from `trip.places`) to a day. Nothing is invented: every field comes from the place. */
export function addPlace(t: Trip, dayId: string, place: Place, startTime?: string, durationMinutes = 60): Trip {
  const di = findDay(t, dayId);
  const a = ActivitySchema.parse({
    id: newId("a_"), placeId: place.id, title: place.name, description: place.description, notes: "", category: place.categories[0] ?? "custom",
    startTime: startTime || undefined, durationMinutes, location: place.location, imageRef: `category:${place.categories[0] ?? "custom"}`, indoor: place.indoor,
    openingHoursNote: place.openingHoursNote, meta: place.meta, origin: "manual",
  });
  return touch(t, t.days.map((d, i) => i !== di ? d : { ...d, activities: [...d.activities, a] }));
}

/** Put a trip back to an earlier version as a NEW edit (later updatedAt), so sync keeps the revert. */
export function restoreTrip(previous: Trip, current: Trip): Trip {
  const at = Math.max(Date.now(), Date.parse(current.updatedAt) + 1);
  return { ...previous, updatedAt: new Date(at).toISOString() };
}

export function removeActivity(t: Trip, dayId: string, activityId: string): Trip {
  const di = findDay(t, dayId);
  return touch(t, t.days.map((d, i) => i !== di ? d : { ...d, activities: d.activities.filter((a) => a.id !== activityId) }));
}

export function moveActivity(t: Trip, fromDayId: string, activityId: string, toDayId: string): Trip {
  if (fromDayId === toDayId) return t;
  const fi = findDay(t, fromDayId), ti = findDay(t, toDayId);
  const a = t.days[fi].activities.find((x) => x.id === activityId);
  if (!a) throw new Error("Activity not found");
  return touch(t, t.days.map((d, k) => k === fi ? { ...d, activities: d.activities.filter((x) => x.id !== activityId) } : k === ti ? { ...d, activities: [...d.activities, { ...a, origin: a.origin === "manual" ? "manual" : "edited" as const }] } : d));
}

/** One save from the item editor: field edits, then (optionally) a move to another day. Order is always by time. */
export function applyItemEdit(t: Trip, dayId: string, activityId: string, patch: ActivityPatch, place?: { dayId: string }): Trip {
  const next = updateActivity(t, dayId, activityId, patch);
  return place && place.dayId !== dayId ? moveActivity(next, dayId, activityId, place.dayId) : next;
}

/** Swap two activities' positions (possibly across days) — used for user-approved weather suggestions. */
export function swapActivities(t: Trip, aId: string, bId: string): Trip {
  const loc = (id: string) => { for (const [di, d] of t.days.entries()) { const ai = d.activities.findIndex((a) => a.id === id); if (ai >= 0) return [di, ai] as const; } throw new Error("Activity not found"); };
  const [d1, a1] = loc(aId), [d2, a2] = loc(bId);
  const days = t.days.map((d) => ({ ...d, activities: [...d.activities] }));
  const A = days[d1].activities[a1], B = days[d2].activities[a2];
  days[d1].activities[a1] = { ...B, startTime: A.startTime, origin: B.origin === "manual" ? "manual" : "edited" };
  days[d2].activities[a2] = { ...A, startTime: B.startTime, origin: A.origin === "manual" ? "manual" : "edited" };
  return touch(t, days);
}

/** Merge a regenerated itinerary while preserving user-edited/manual activities on matching dates. */
export function mergeRegenerated(current: Trip, regenerated: Trip["days"]): Trip {
  const days = regenerated.map((nd) => {
    const old = current.days.find((d) => d.date === nd.date);
    const kept = old?.activities.filter((a) => a.origin !== "generated") ?? [];
    const keptPlaces = new Set(kept.map((a) => a.placeId).filter(Boolean));
    const keepTitle = old?.titleMode === "user" ? { title: old.title, titleMode: "user" as const } : {};
    return { ...nd, ...keepTitle, id: old?.id ?? nd.id, notes: old?.notes ?? nd.notes, activities: [...nd.activities.filter((a) => !a.placeId || !keptPlaces.has(a.placeId)), ...kept] };
  });
  return touch(current, days);
}

export { newId };

/** Update flight details. Does NOT re-plan the itinerary; the UI offers "Regenerate" to refit days. */
export function updateFlights(t: Trip, flights: Trip["flights"]): Trip {
  return retitle({ ...t, flights: FlightsSchema.parse(flights), updatedAt: new Date().toISOString() });
}

/** Inline title edit: an empty string resets to the automatic title. */
export function renameDay(t: Trip, dayId: string, title: string): Trip {
  const di = findDay(t, dayId);
  const clean = title.trim().slice(0, 120);
  return touch(t, t.days.map((d, i) => i !== di ? d : clean ? { ...d, title: clean, titleMode: "user" as const } : { ...d, titleMode: "auto" as const }));
}
export function resetDayTitle(t: Trip, dayId: string): Trip { return renameDay(t, dayId, ""); }
