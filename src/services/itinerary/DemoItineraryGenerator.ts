import {
  ActivitySchema, ItineraryDaySchema, PlaceSchema,
  type Activity, type ActivityCategory, type Destination, type Interest, type ItineraryDay, type Place, type Preferences, type ValidTripInput,
} from "@/domain/schemas";
import { addMinutes, datesBetween } from "@/lib/dates";
import { ARRIVAL_BUFFER_MIN, DEPARTURE_BUFFER_MIN } from "@/domain/schemas";
import { newId } from "@/lib/ids";
import { findCatalogDestination, type CatalogDestination, type CatalogPlace } from "./catalog";
import type { GeneratedItinerary, ItineraryGenerator } from "./ItineraryGenerator";

const SOURCE = "Planet demo catalogue";

function hash(s: string): number { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed: number) { let a = seed || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const BUDGET_MULT: Record<Preferences["budget"], number> = { shoestring: 0.7, moderate: 1, comfortable: 1.4, luxury: 2.2 };
const SIGHT_SLOTS: Record<Preferences["pace"], number> = { relaxed: 2, balanced: 3, packed: 4 };

/** Generic templates for destinations without catalogue data: no coordinates, no prices. */
function genericPlaces(name: string): CatalogPlace[] {
  const g = (key: string, title: string, category: ActivityCategory, interests: Interest[], d: string, mins: number, indoor = false, meal?: CatalogPlace["meal"]): CatalogPlace =>
    ({ key, name: title, category, interests, description: d, durationMinutes: mins, cost: [-1, -1], indoor, meal });
  return [
    g("orientation", `Orientation walk through central ${name}`, "walk", ["architecture", "history"], "Get your bearings on foot around the historic centre. Ask your accommodation for a recommended route.", 120),
    g("main-museum", `${name}'s main history museum`, "museum", ["history", "art"], "Most cities have a flagship museum telling their story — a good rainy-day choice.", 120, true),
    g("art", `Local galleries in ${name}`, "museum", ["art"], "Seek out a contemporary gallery or two.", 90, true),
    g("market", `Morning market in ${name}`, "shopping", ["food", "shopping"], "Browse a local market for produce and snacks.", 75),
    g("park", `A green space in ${name}`, "nature", ["nature"], "A slow hour in a park or along the waterfront.", 75),
    g("viewpoint", `Viewpoint over ${name}`, "viewpoint", ["nature", "architecture"], "Find a hill, tower or rooftop for a panorama.", 60),
    g("neighbourhood", `Explore a characterful neighbourhood`, "walk", ["architecture", "shopping"], "Wander a residential district with independent shops and cafés.", 120),
    g("landmark", `${name}'s signature landmark`, "sight", ["history", "architecture"], "The sight that appears on every postcard — go early.", 120),
    g("shops", `Design and craft shops`, "shopping", ["shopping"], "Look for locally made souvenirs.", 90, true),
    g("bar", `Evening drinks in ${name}`, "nightlife", ["nightlife"], "Try a local bar or live-music venue.", 120, true),
    g("lunch1", `Lunch where the locals eat`, "food", ["food"], "Pick a busy, simple spot near your morning activity.", 75, false, "lunch"),
    g("lunch2", `Street-food lunch`, "food", ["food"], "Sample the local quick bites.", 60, false, "lunch"),
    g("dinner1", `Dinner of regional specialities`, "food", ["food"], "Ask for a dish the region is known for.", 120, true, "dinner"),
    g("dinner2", `Neighbourhood dinner`, "food", ["food"], "A relaxed meal close to where you're staying.", 105, true, "dinner"),
  ];
}

export function resolveDestination(input: string): { destination: Destination; catalog?: CatalogDestination } {
  const c = findCatalogDestination(input);
  if (!c) return { destination: { name: input.trim() } };
  return { catalog: c, destination: { name: c.name, country: c.country, countryCode: c.countryCode, location: c.location, timeZone: c.timeZone, localCurrency: c.currency, catalogKey: c.key } };
}

export class DemoItineraryGenerator implements ItineraryGenerator {
  readonly id = "demo-local-v1";

  async generate(input: ValidTripInput, opts: { seed?: number } = {}): Promise<GeneratedItinerary> {
    const { destination, catalog } = resolveDestination(input.destination);
    const prefs = input.preferences;
    const rand = rng(hash(`${destination.name}|${input.arrivalDate}|${input.departureDate}|${prefs.interests.join(",")}|${opts.seed ?? 0}`));
    const pool = catalog?.places ?? genericPlaces(destination.name);
    const currency = destination.localCurrency;

    const places: Place[] = pool.map((p) => PlaceSchema.parse({
      id: `${destination.catalogKey ?? "generic"}:${p.key}`, providerId: catalog ? `demo:${catalog.key}:${p.key}` : undefined,
      name: p.name, location: p.location, categories: [p.category], description: p.description,
      openingHoursNote: p.openingHoursNote, indoor: p.indoor, meta: { source: SOURCE, status: "demo" },
    }));
    const placeId = (p: CatalogPlace) => `${destination.catalogKey ?? "generic"}:${p.key}`;

    const score = (p: CatalogPlace) => p.interests.filter((i) => prefs.interests.includes(i)).length * 3 + (prefs.walking === "low" && p.category === "walk" ? -2 : 0) + rand();
    const sights = pool.filter((p) => !p.meal && p.category !== "nightlife" && (p.durationMinutes <= 240 || prefs.pace !== "relaxed"));
    const nightlife = pool.filter((p) => p.category === "nightlife");
    const lunches = pool.filter((p) => p.meal === "lunch" || p.meal === "any");
    const dinners = pool.filter((p) => p.meal === "dinner" || p.meal === "any");
    const ranked = [...sights].sort((a, b) => score(b) - score(a));
    const used = new Set<string>();

    const toActivity = (p: CatalogPlace, start: string, mult = 1): Activity => {
      const priced = p.cost[0] >= 0 && currency;
      const m = p.meal ? BUDGET_MULT[prefs.budget] : 1;
      return ActivitySchema.parse({
        id: newId("a_"), placeId: placeId(p), title: p.name, description: p.description, notes: "", category: p.category,
        startTime: start, durationMinutes: Math.round(p.durationMinutes * mult / 15) * 15 || 15,
        cost: priced ? { min: Math.round(p.cost[0] * m), max: Math.round(p.cost[1] * m), currency, confidence: "illustrative" } : undefined,
        location: p.location, imageRef: `category:${p.category}`, indoor: p.indoor,
        meta: { source: SOURCE, status: "demo" }, origin: "generated",
      });
    };


    const dates = datesBetween(input.arrivalDate, input.departureDate);
    const slowMult = prefs.party === "family" ? 1.15 : 1;
    const arrT = input.flights?.arrival?.time, depT = input.flights?.departure?.time;
    const toMin = (x: string) => { const [h, m] = x.split(":").map(Number); return h * 60 + m; };
    const fromMin = (n: number) => { const c = Math.max(0, Math.min(n, 23 * 60 + 59)); return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`; };
    const round15 = (n: number) => Math.ceil(n / 15) * 15;
    const defaultStart = prefs.pace === "packed" ? "08:30" : prefs.pace === "relaxed" ? "10:00" : "09:30";

    const days: ItineraryDay[] = dates.map((date, i) => {
      const acts: Activity[] = [];
      const isFirst = i === 0, isLast = i === dates.length - 1, multi = dates.length > 1;
      // Earliest start: after arrival + buffer on day 1 (or 14:00 if no time given); latest end: departure - buffer on the last day.
      let earliest = defaultStart;
      if (isFirst && arrT) earliest = fromMin(Math.max(toMin(defaultStart), round15(toMin(arrT) + ARRIVAL_BUFFER_MIN)));
      else if (isFirst && multi) earliest = "14:00";
      const latest = isLast && depT ? fromMin(toMin(depT) - DEPARTURE_BUFFER_MIN) : "23:59";
      const shortDay = (isFirst || isLast) && multi;
      const nSights = Math.max(1, SIGHT_SLOTS[prefs.pace] - (shortDay ? 1 : 0));

      let t = earliest;
      const fits = (p: CatalogPlace) => toMin(t) >= toMin(earliest) && toMin(t) + Math.round(p.durationMinutes * slowMult) <= toMin(latest);
      const takeFit = (list: CatalogPlace[], cycle: boolean) => {
        const fresh = list.find((p) => !used.has(p.key) && fits(p));
        if (fresh) { used.add(fresh.key); return fresh; }
        const any = cycle ? list.filter(fits) : [];
        return any.length ? any[Math.floor(rand() * any.length)] : undefined;
      };
      const add = (p: CatalogPlace | undefined, gap = 30) => { if (!p) return false; const a = toActivity(p, t, slowMult); acts.push(a); t = addMinutes(t, a.durationMinutes + gap); return true; };

      let s = 0;
      const morning = Math.ceil(nSights / 2);
      while (s < morning && toMin(t) < toMin("12:00")) { if (!add(takeFit(ranked, false))) break; s++; }
      if (toMin(t) <= toMin("14:30")) { if (toMin(t) < toMin("12:30")) t = "13:00"; add(takeFit(lunches, true)); }
      while (s < nSights && toMin(t) < toMin("18:00")) { if (!add(takeFit(ranked, false))) break; s++; }
      if (toMin(t) < toMin("19:30")) t = "19:30"; else t = addMinutes(t, 15);
      if (toMin(t) <= toMin("21:30")) add(takeFit(dinners, true));
      if (prefs.interests.includes("nightlife") || (prefs.pace === "packed" && rand() > 0.5)) add(takeFit(nightlife, false));

      const title = acts.find((a) => a.category !== "food")?.title;
      const dayTitle = isFirst && multi ? "Arrival & first look" : isLast && multi && depT ? "Last look & departure" : title ? `Day ${i + 1}: ${title.split(/[&,(]/)[0].trim()}` : `Day ${i + 1}`;
      return ItineraryDaySchema.parse({ id: newId("d_"), date, title: dayTitle, notes: "", activities: acts });
    });

    return { destination, days, places, generator: this.id };
  }
}
