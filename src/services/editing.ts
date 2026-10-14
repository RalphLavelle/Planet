import { ActivitySchema, type Activity, type Trip } from "@/domain/schemas";
import { newId } from "@/lib/ids";

/** Pure, immutable itinerary operations. Every op returns a new Trip with updatedAt bumped. */
const touch = (t: Trip, days: Trip["days"]): Trip => ({ ...t, days, updatedAt: new Date().toISOString() });
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

export function removeActivity(t: Trip, dayId: string, activityId: string): Trip {
  const di = findDay(t, dayId);
  return touch(t, t.days.map((d, i) => i !== di ? d : { ...d, activities: d.activities.filter((a) => a.id !== activityId) }));
}

export function reorderActivity(t: Trip, dayId: string, activityId: string, delta: -1 | 1): Trip {
  const di = findDay(t, dayId);
  const acts = [...t.days[di].activities];
  const i = acts.findIndex((a) => a.id === activityId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= acts.length) return t;
  [acts[i], acts[j]] = [acts[j], acts[i]];
  return touch(t, t.days.map((d, k) => k !== di ? d : { ...d, activities: acts }));
}

export function moveActivity(t: Trip, fromDayId: string, activityId: string, toDayId: string): Trip {
  if (fromDayId === toDayId) return t;
  const fi = findDay(t, fromDayId), ti = findDay(t, toDayId);
  const a = t.days[fi].activities.find((x) => x.id === activityId);
  if (!a) throw new Error("Activity not found");
  return touch(t, t.days.map((d, k) => k === fi ? { ...d, activities: d.activities.filter((x) => x.id !== activityId) } : k === ti ? { ...d, activities: [...d.activities, { ...a, origin: a.origin === "manual" ? "manual" : "edited" as const }] } : d));
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
    return { ...nd, id: old?.id ?? nd.id, notes: old?.notes ?? nd.notes, activities: [...nd.activities.filter((a) => !a.placeId || !keptPlaces.has(a.placeId)), ...kept].sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99")) };
  });
  return touch(current, days);
}

export { newId };
