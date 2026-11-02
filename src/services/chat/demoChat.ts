import type { Activity, ItineraryDay, Place, Trip } from "@/domain/schemas";
import { sortActivities } from "@/domain/order";
import * as edit from "@/services/editing";

/**
 * DEMO ONLY. A scripted stand-in for a future AI assistant: no network, no API key, no model. Replies are picked by
 * keyword. A reply may propose ONE change, and every change reuses what the trip already has: its own items, or a
 * place from `trip.places` (the places looked up when the trip was drafted). It never makes up a place.
 */
export const DEMO_LABEL = "Demo reply";

export type ChatScope = { kind: "trip" } | { kind: "day"; dayId: string };

export type Change =
  | { kind: "retime"; dayId: string; activityId: string; startTime: string }
  | { kind: "move"; fromDayId: string; activityId: string; toDayId: string }
  | { kind: "add"; dayId: string; placeId: string; startTime: string };

export interface Proposal { summary: string; change: Change }
export interface DemoReply { text: string; proposal?: Proposal }

export const PROMPTS: Record<ChatScope["kind"], string[]> = {
  trip: ["Make day 2 start later", "Move something to a quieter day", "Add one more place"],
  day: ["Start later", "Move something to another day", "Add a place"],
};

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => { const c = Math.max(0, Math.min(n, 23 * 60 + 45)); return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`; };
const round15 = (n: number) => Math.round(n / 15) * 15;
const dayLabel = (t: Trip, d: ItineraryDay) => `Day ${t.days.findIndex((x) => x.id === d.id) + 1}`;
const timed = (d: ItineraryDay) => sortActivities(d.activities).filter((a) => a.startTime);

function scopeDays(t: Trip, scope: ChatScope): ItineraryDay[] {
  return scope.kind === "day" ? t.days.filter((d) => d.id === scope.dayId) : t.days;
}

function retime(t: Trip, scope: ChatScope, delta: number): DemoReply {
  // Trip level: day 2 if there is one (a day that is not the arrival day), otherwise the first day with a timed item.
  const days = scopeDays(t, scope).filter((d) => timed(d).length);
  const day = scope.kind === "trip" ? days.find((d) => d.id === t.days[1]?.id) ?? days[0] : days[0];
  const first = day && timed(day)[0];
  if (!day || !first) return { text: "There is nothing with a start time to move." };
  const startTime = fromMin(round15(toMin(first.startTime!) + delta));
  if (startTime === first.startTime) return { text: "That one can't move any further." };
  const word = delta > 0 ? "later" : "earlier";
  return {
    text: `Here is one way to start ${dayLabel(t, day)} ${word}. The other stops stay as they are.`,
    proposal: { summary: `${dayLabel(t, day)}: move “${first.title}” from ${first.startTime} to ${startTime}.`, change: { kind: "retime", dayId: day.id, activityId: first.id, startTime } },
  };
}

function lightestOther(t: Trip, not: string): ItineraryDay | undefined {
  return [...t.days].filter((d) => d.id !== not).sort((a, b) => a.activities.length - b.activities.length)[0];
}

function move(t: Trip, scope: ChatScope): DemoReply {
  if (t.days.length < 2) return { text: "This trip has one day, so there is nowhere to move things." };
  const from = scope.kind === "day" ? t.days.find((d) => d.id === scope.dayId) : [...t.days].sort((a, b) => b.activities.length - a.activities.length)[0];
  const to = from && lightestOther(t, from.id);
  const candidates = from ? sortActivities(from.activities).filter((a) => a.category !== "food" && !a.meal) : [];
  const item = candidates[candidates.length - 1];
  if (!from || !to || !item) return { text: "I could not find anything to move." };
  return {
    text: `${dayLabel(t, to)} is the lightest day. You could move one stop there.`,
    proposal: { summary: `Move “${item.title}” from ${dayLabel(t, from)} to ${dayLabel(t, to)}${item.startTime ? ` (still ${item.startTime})` : ""}.`, change: { kind: "move", fromDayId: from.id, activityId: item.id, toDayId: to.id } },
  };
}

/** Places the trip already knows (looked up when it was drafted) that no day uses yet. */
export function unusedPlaces(t: Trip): Place[] {
  const used = new Set(t.days.flatMap((d) => d.activities.map((a) => a.placeId).filter(Boolean)));
  return t.places.filter((p) => !used.has(p.id));
}

function add(t: Trip, scope: ChatScope): DemoReply {
  const pool = unusedPlaces(t);
  const place = pool.find((p) => !p.categories.includes("food") && !p.categories.includes("nightlife")) ?? pool[0];
  if (!place) return { text: "Every place I know about is already in your trip." };
  const day = scope.kind === "day" ? t.days.find((d) => d.id === scope.dayId) : [...t.days].sort((a, b) => a.activities.length - b.activities.length)[0];
  if (!day) return { text: "I could not find that day." };
  const last = sortActivities(day.activities).filter((a) => a.startTime).pop();
  const after = last ? round15(toMin(last.startTime!) + last.durationMinutes + 30) : toMin("10:00");
  const startTime = after <= toMin("20:30") ? fromMin(after) : "09:00";
  return {
    text: `“${place.name}” is already in this trip's places, but not on any day yet.`,
    proposal: { summary: `Add “${place.name}” to ${dayLabel(t, day)} at ${startTime}.`, change: { kind: "add", dayId: day.id, placeId: place.id, startTime } },
  };
}

export function demoReply(trip: Trip, scope: ChatScope, message: string): DemoReply {
  const m = message.toLowerCase();
  if (/\b(earlier|early)\b/.test(m)) return retime(trip, scope, -60);
  if (/\b(later|lie in|sleep|slower)\b/.test(m)) return retime(trip, scope, 60);
  if (/\b(move|another day|quiet|lighter|busy|too much|full)\b/.test(m)) return move(trip, scope);
  if (/\b(add|more|another|place|idea|visit|see|suggest)\b/.test(m)) return add(trip, scope);
  return { text: "I only know a few scripted tricks. Try one of the buttons below." };
}

/** Apply a proposed change to the CURRENT trip. Throws if what it refers to has since gone. */
export function applyChange(trip: Trip, c: Change): Trip {
  const find = (dayId: string, id: string): Activity => {
    const a = trip.days.find((d) => d.id === dayId)?.activities.find((x) => x.id === id);
    if (!a) throw new Error("That item has changed since. Ask again.");
    return a;
  };
  switch (c.kind) {
    case "retime": find(c.dayId, c.activityId); return edit.updateActivity(trip, c.dayId, c.activityId, { startTime: c.startTime });
    case "move": find(c.fromDayId, c.activityId); return edit.moveActivity(trip, c.fromDayId, c.activityId, c.toDayId);
    case "add": {
      const place = trip.places.find((p) => p.id === c.placeId);
      if (!place || !trip.days.some((d) => d.id === c.dayId)) throw new Error("That place is no longer in the trip. Ask again.");
      if (trip.days.some((d) => d.activities.some((a) => a.placeId === place.id))) throw new Error("That place is already on a day.");
      return edit.addPlace(trip, c.dayId, place, c.startTime);
    }
  }
}
