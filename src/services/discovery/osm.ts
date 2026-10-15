import type { ActivityCategory, GeoPoint, Interest } from "@/domain/schemas";
import type { CatalogPlace } from "../itinerary/catalog";

/** Raw OSM element from Overpass `out center tags`. */
export interface OsmElement { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export interface DiscoveredPlace extends CatalogPlace {
  location: GeoPoint;
  osmUrl: string;
  wikidata?: string;
  wikipedia?: string; // "en:Title"
  imageTag?: string;
  website?: string;
  /** Higher = more notable (wikidata/wikipedia links, sitelinks, type). */
  notability: number;
  photo?: { src: string; title: string; author: string; license: string; licenseUrl: string; sourceUrl: string };
  sourceUrl?: string;
}

type Rule = { category: ActivityCategory; interests: Interest[]; minutes: number; indoor: boolean; weight: number; meal?: CatalogPlace["meal"]; label: string };

/** OSM tag → app category/interests/indoor/rough duration. Durations are rough planning defaults, not facts. */
export function classify(tags: Record<string, string>): Rule | null {
  const t = tags.tourism, l = tags.leisure, n = tags.natural, h = tags.historic, a = tags.amenity, sh = tags.shop;
  if (t === "museum") return { category: "museum", interests: ["history", "art"], minutes: 120, indoor: true, weight: 3, label: "Museum" };
  if (t === "gallery") return { category: "museum", interests: ["art"], minutes: 90, indoor: true, weight: 2, label: "Gallery" };
  if (t === "aquarium") return { category: "museum", interests: ["nature"], minutes: 150, indoor: true, weight: 2, label: "Aquarium" };
  if (t === "zoo") return { category: "nature", interests: ["nature"], minutes: 180, indoor: false, weight: 2, label: "Zoo / wildlife park" };
  if (t === "theme_park") return { category: "sight", interests: ["nightlife", "nature"], minutes: 240, indoor: false, weight: 2, label: "Theme park" };
  if (t === "viewpoint") return { category: "viewpoint", interests: ["nature", "architecture"], minutes: 45, indoor: false, weight: 1, label: "Viewpoint" };
  if (n === "beach" || l === "beach_resort") return { category: "beach", interests: ["nature"], minutes: 120, indoor: false, weight: 2, label: "Beach" };
  if (l === "nature_reserve" || tags.boundary === "national_park") return { category: "nature", interests: ["nature"], minutes: 150, indoor: false, weight: 2, label: "Nature reserve" };
  if (l === "park" || l === "garden") return { category: "nature", interests: ["nature"], minutes: 75, indoor: false, weight: 1, label: l === "garden" ? "Garden" : "Park" };
  if (h) {
    const arch = ["castle", "palace", "fort", "monastery", "church", "cathedral", "building", "manor", "city_gate", "tower"].includes(h);
    return { category: "sight", interests: arch ? ["history", "architecture"] : ["history"], minutes: arch ? 75 : 40, indoor: false, weight: 1, label: "Historic " + h.replace(/_/g, " ") };
  }
  if (a === "place_of_worship") return { category: "sight", interests: ["architecture", "history"], minutes: 45, indoor: true, weight: 1, label: "Place of worship" };
  if (a === "theatre" || a === "arts_centre") return { category: "nightlife", interests: ["art", "nightlife"], minutes: 150, indoor: true, weight: 1, label: a === "theatre" ? "Theatre" : "Arts centre" };
  if (a === "marketplace") return { category: "shopping", interests: ["shopping", "food"], minutes: 75, indoor: false, weight: 1, label: "Market" };
  if (sh === "mall" || sh === "department_store") return { category: "shopping", interests: ["shopping"], minutes: 90, indoor: true, weight: 0, label: "Shopping centre" };
  if (a === "restaurant") return { category: "food", interests: ["food"], minutes: 90, indoor: true, weight: 0, meal: "any", label: "Restaurant" };
  if (a === "cafe") return { category: "cafe", interests: ["food"], minutes: 60, indoor: true, weight: 0, meal: "lunch", label: "Café" };
  if (a === "bar" || a === "pub" || a === "nightclub") return { category: "nightlife", interests: ["nightlife"], minutes: 120, indoor: true, weight: 0, label: a === "pub" ? "Pub" : "Bar" };
  if (t === "attraction") return { category: "sight", interests: ["history", "architecture"], minutes: 75, indoor: false, weight: 1, label: "Attraction" };
  return null;
}

const NOISE = /\b(toilet|parking|car park|playground|dog park|skate|bbq|reserve \d+|lot \d+)\b/i;

/** OSM → DiscoveredPlace, deduped by name, with a first-pass notability score from tags alone. */
export function placesFromOsm(elements: OsmElement[], lang = "en"): DiscoveredPlace[] {
  const out = new Map<string, DiscoveredPlace>();
  for (const e of elements) {
    const tags = e.tags ?? {};
    const name = (tags[`name:${lang}`] || tags.name || "").trim();
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    if (!name || lat === undefined || lon === undefined || NOISE.test(name)) continue;
    const rule = classify(tags);
    if (!rule) continue;
    const wiki = tags.wikipedia, wd = tags.wikidata;
    const notability = rule.weight + (wd ? 3 : 0) + (wiki ? 3 : 0) + (tags.image || tags.wikimedia_commons ? 1 : 0) + (tags.website ? 0.5 : 0);
    const cuisine = tags.cuisine ? ` · ${tags.cuisine.split(";").slice(0, 2).join(", ").replace(/_/g, " ")}` : "";
    const area = tags["addr:suburb"] || tags["addr:city"] || "";
    const p: DiscoveredPlace = {
      key: `${e.type[0]}${e.id}`, name: name.slice(0, 120), category: rule.category, interests: rule.interests,
      description: `${rule.label}${cuisine}${area ? ` in ${area}` : ""}.`, durationMinutes: rule.minutes, cost: [-1, -1], indoor: rule.indoor,
      location: { lat, lng: lon }, meal: rule.meal, osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      wikidata: wd && /^Q\d+$/.test(wd) ? wd : undefined, wikipedia: wiki, imageTag: tags.image || tags.wikimedia_commons,
      website: /^https?:\/\//.test(tags.website ?? "") ? tags.website : undefined,
      // Real OSM opening_hours only — never invented. Shown as "listed on OpenStreetMap", may be outdated.
      openingHoursNote: tags.opening_hours ? `Listed hours (OpenStreetMap, may be outdated): ${tags.opening_hours.slice(0, 120)}` : undefined,
      notability,
    };
    const k = name.toLowerCase();
    const prev = out.get(k);
    if (!prev || prev.notability < p.notability) out.set(k, p);
  }
  return [...out.values()];
}

/** Overpass QL: notable sights within radius, plus a capped set of restaurants/cafés/bars nearer the centre. */
export function overpassQuery(c: GeoPoint, radiusM: number): string {
  const r = Math.round(radiusM), rf = Math.round(Math.min(radiusM, 6000));
  const at = (sel: string, rad = r) => `nwr${sel}["name"](around:${rad},${c.lat.toFixed(5)},${c.lng.toFixed(5)});`;
  return `[out:json][timeout:25];
(
${at('["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|theme_park|aquarium)$"]')}
${at('["natural"="beach"]')}
${at('["leisure"="beach_resort"]')}
${at('["leisure"~"^(park|garden|nature_reserve)$"]["wikidata"]')}
${at('["historic"]["wikidata"]')}
${at('["amenity"~"^(place_of_worship|theatre|arts_centre)$"]["wikidata"]')}
${at('["amenity"="marketplace"]')}
${at('["shop"="mall"]["wikidata"]')}
)->.sights;
.sights out center tags 400;
(
${at('["amenity"~"^(restaurant|cafe)$"]', rf)}
)->.food;
.food out center tags 80;
(
${at('["amenity"~"^(bar|pub)$"]', rf)}
)->.bars;
.bars out center tags 25;`;
}
