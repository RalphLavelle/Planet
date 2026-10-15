import { cleanWikimediaUrl, isWikimediaImageUrl, type Destination, type GeoPoint } from "@/domain/schemas";
import type { KeyValueStore } from "@/repositories/TripRepository";
import { haversineKm, nominatimThrottle } from "../geocoding";
import { overpassQuery, placesFromOsm, type DiscoveredPlace, type OsmElement } from "./osm";

export interface DiscoveryResult {
  destination: Destination;
  places: DiscoveredPlace[];
  /** Human-readable source list, e.g. ["OpenStreetMap (Overpass)", "Wikipedia", "Wikidata"]. */
  sources: string[];
  /** Non-fatal problems, e.g. "Overpass unavailable — used Wikipedia only". */
  warnings: string[];
  fetchedAt: string;
}
export interface PlaceDiscovery { discover(city: string, opts?: { onProgress?: (msg: string) => void }): Promise<DiscoveryResult | null> }

export const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const CACHE_PREFIX = "planet:cache:discover:v1:";
const TTL_MS = 14 * 24 * 3600 * 1000;
/** Wikipedia-only results (Overpass was down) are kept for a day so a later visit can get the fuller OSM set. */
const DEGRADED_TTL_MS = 24 * 3600 * 1000;
const APP_UA = "Planet travel planner (https://here.now; MVP)";

const CURRENCY: Record<string, string> = { AU: "AUD", NZ: "NZD", US: "USD", CA: "CAD", GB: "GBP", IE: "EUR", PT: "EUR", ES: "EUR", FR: "EUR", DE: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", GR: "EUR", FI: "EUR", SI: "EUR", SK: "EUR", HR: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", CY: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", IS: "ISK", TR: "TRY", JP: "JPY", CN: "CNY", HK: "HKD", SG: "SGD", TH: "THB", KR: "KRW", IN: "INR", ID: "IDR", MY: "MYR", PH: "PHP", ZA: "ZAR", MX: "MXN", BR: "BRL", IL: "ILS", AE: "AED" };

type Fetch = typeof fetch;
const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const FREE = /^(cc0|cc[ -]by|cc[ -]by-sa|public domain|pd|attribution|gfdl|no restrictions)/i;

/**
 * Free, keyless place discovery for any city:
 * Nominatim (geocode, ≤1 req/s shared gate; Photon fallback) → Overpass (POIs; 3 public endpoints in turn)
 * → Wikidata (sitelinks for notability, P18 image) → Wikipedia (intro extracts, geosearch) → Commons (licence + author).
 * Whole result cached per destination in localStorage for 14 days.
 */
export class OsmPlaceDiscovery implements PlaceDiscovery {
  constructor(private readonly cache: () => KeyValueStore | null, private readonly fetchImpl: Fetch = (...a) => fetch(...a),
    private readonly throttle: () => Promise<void> = nominatimThrottle, private readonly endpoints = OVERPASS_ENDPOINTS, private readonly timeoutMs = 25000) {}

  private async get(url: string, init: RequestInit = {}, ms = this.timeoutMs): Promise<Response> {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms) : undefined;
    try { return await this.fetchImpl(url, { ...init, signal: ctl?.signal }); } finally { if (timer) clearTimeout(timer); }
  }
  private async json<T>(url: string, init?: RequestInit): Promise<T> { const r = await this.get(url, init); if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as T; }
  private wm<T>(url: string) { return this.json<T>(url + (url.includes("?") ? "&" : "?") + "format=json&origin=*", { headers: { "Api-User-Agent": APP_UA } }); }

  /** Enrichment calls: one failed batch shouldn't lose the rest. */
  private failed = 0;
  private wmSafe<T>(url: string): Promise<T> { return this.wm<T>(url).catch(() => { this.failed++; return {} as T; }); }

  async discover(city: string, opts: { onProgress?: (msg: string) => void } = {}): Promise<DiscoveryResult | null> {
    const q = city.trim();
    if (q.length < 2) return null;
    const say = opts.onProgress ?? (() => {});
    const key = CACHE_PREFIX + q.toLowerCase();
    try { const c = this.cache()?.getItem(key); if (c) { const v = JSON.parse(c) as DiscoveryResult; if (Date.now() - Date.parse(v.fetchedAt) < (v.warnings.length ? DEGRADED_TTL_MS : TTL_MS)) { say("Using saved places for " + q); return v; } } } catch { /* refetch */ }

    say(`Finding ${q} on the map…`);
    const geo = await this.geocode(q);
    if (!geo) return null;
    const warnings: string[] = [], sources = [geo.source];
    const radius = Math.max(2500, Math.min(12000, geo.radiusKm * 1000));

    say("Looking up places on OpenStreetMap…");
    let places: DiscoveredPlace[] = [];
    const osm = await this.overpass(overpassQuery(geo.point, radius));
    if (osm) { places = placesFromOsm(osm); sources.push("OpenStreetMap (Overpass)"); }
    else warnings.push("OpenStreetMap's Overpass service didn't respond, so places come from Wikipedia only.");

    say("Checking Wikipedia for notable sights…");
    try {
      // Wikipedia geosearch returns the 100 nearest articles, so large cities get extra probes around the centre.
      const probes = [geo.point];
      if (radius > 4000) { const dLat = (radius * 0.55) / 111320, dLng = dLat / Math.cos((geo.point.lat * Math.PI) / 180); probes.push(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => ({ lat: geo.point.lat + a * dLat, lng: geo.point.lng + b * dLng }))); }
      const seenT = new Set<string>(), geoTitles: Awaited<ReturnType<OsmPlaceDiscovery["geosearch"]>> = [];
      for (const pr of probes) for (const g of await this.geosearch(pr, Math.min(10000, radius * (probes.length > 1 ? 0.5 : 1))).catch(() => [])) if (!seenT.has(g.title)) { seenT.add(g.title); geoTitles.push(g); }
      const have = new Set(places.map((p) => (p.wikipedia ?? "").replace(/^en:/, "").toLowerCase()));
      for (const g of geoTitles) {
        const hit = places.find((p) => p.wikipedia?.replace(/^en:/, "").toLowerCase() === g.title.toLowerCase());
        if (hit) hit.notability += 1;
        else if (!osm && !have.has(g.title.toLowerCase())) places.push({ ...placeFromWikiTitle(g), wikidata: g.qid });
      }
      if (geoTitles.length) sources.push("Wikipedia");
    } catch { warnings.push("Wikipedia geosearch unavailable."); }
    if (!places.length) return null;

    say("Adding descriptions and photos…");
    await this.enrich(places, geo.wikidata).then((cityPhoto) => { if (cityPhoto) geo.photo = cityPhoto; sources.push("Wikidata", "Wikimedia Commons"); }).catch(() => warnings.push("Wikidata/Wikipedia enrichment failed; places shown without descriptions or photos."));

    if (this.failed) { warnings.push(`${this.failed} Wikipedia/Wikidata lookup(s) failed; some places lack descriptions or photos.`); this.failed = 0; }
    places = places.filter((p) => haversineKm(geo.point, p.location) <= radius / 1000 + 1).sort((a, b) => b.notability - a.notability).filter((p) => p.notability > -1 || p.meal).slice(0, 150);
    const cc = geo.countryCode?.toUpperCase();
    const destination: Destination = { name: q.slice(0, 120), country: geo.country?.slice(0, 80), countryCode: cc && cc.length === 2 ? cc : undefined, location: geo.point,
      localCurrency: cc ? CURRENCY[cc] : undefined, photo: geo.photo ?? places.find((p) => p.photo && p.category !== "food" && p.category !== "cafe")?.photo };
    const result: DiscoveryResult = { destination, places, sources: [...new Set(sources)], warnings, fetchedAt: new Date().toISOString() };
    try { this.cache()?.setItem(key, JSON.stringify(result)); } catch { /* storage full: best effort */ }
    return result;
  }

  private async geocode(q: string): Promise<{ point: GeoPoint; radiusKm: number; country?: string; countryCode?: string; wikidata?: string; source: string; photo?: DiscoveredPlace["photo"] } | null> {
    try {
      await this.throttle();
      const arr = await this.json<{ lat: string; lon: string; boundingbox?: string[]; address?: Record<string, string>; extratags?: Record<string, string> | null }[]>(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&extratags=1&accept-language=en&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const h = arr[0];
      if (h) {
        const point = { lat: Number(h.lat), lng: Number(h.lon) };
        const [s, n, w, e] = (h.boundingbox ?? []).map(Number);
        const radiusKm = Number.isFinite(s) ? haversineKm({ lat: s, lng: w }, { lat: n, lng: e }) / 2 : 6;
        return { point, radiusKm, country: h.address?.country, countryCode: h.address?.country_code, wikidata: h.extratags?.wikidata, source: "OpenStreetMap Nominatim" };
      }
    } catch { /* fall through to Photon */ }
    try {
      const j = await this.json<{ features?: { geometry: { coordinates: [number, number] }; properties: { country?: string; countrycode?: string; extent?: number[] } }[] }>(`https://photon.komoot.io/api/?limit=1&lang=en&q=${encodeURIComponent(q)}`);
      const f = j.features?.[0];
      if (!f) return null;
      const [lng, lat] = f.geometry.coordinates, ex = f.properties.extent;
      return { point: { lat, lng }, radiusKm: ex ? haversineKm({ lat: ex[1], lng: ex[0] }, { lat: ex[3], lng: ex[2] }) / 2 : 6, country: f.properties.country, countryCode: f.properties.countrycode, source: "Photon (OpenStreetMap)" };
    } catch { return null; }
  }

  /** Try each public Overpass instance in turn; null when all fail. */
  private async overpass(query: string): Promise<OsmElement[] | null> {
    for (const ep of this.endpoints) {
      try {
        const r = await this.get(ep, { method: "POST", body: "data=" + encodeURIComponent(query), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        if (!r.ok) continue;
        const j = (await r.json()) as { elements?: OsmElement[]; remark?: string };
        if (j.elements && (j.elements.length || !j.remark)) return j.elements;
      } catch { /* next endpoint */ }
    }
    return null;
  }

  private async geosearch(c: GeoPoint, radiusM: number) {
    type Pg = { title: string; coordinates?: { lat: number; lon: number }[]; pageprops?: { wikibase_item?: string } };
    const j = await this.wm<{ query?: { pages?: Record<string, Pg> } }>(
      `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${c.lat}|${c.lng}&ggsradius=${Math.round(radiusM)}&ggslimit=100&prop=coordinates|pageprops&ppprop=wikibase_item&colimit=100`);
    return Object.values(j.query?.pages ?? {}).filter((p) => p.coordinates?.[0]).map((p) => ({ title: p.title, lat: p.coordinates![0].lat, lon: p.coordinates![0].lon, qid: p.pageprops?.wikibase_item }));
  }

  /** Wikidata sitelinks/P18/descriptions → Wikipedia extracts → Commons licence data. Mutates places; returns the city photo. */
  private async enrich(places: DiscoveredPlace[], cityQid?: string): Promise<DiscoveredPlace["photo"] | undefined> {
    places.sort((a, b) => b.notability - a.notability);
    const withQ = places.filter((p) => p.wikidata).slice(0, 300);
    const files = new Map<string, DiscoveredPlace[]>();
    const enTitle = new Map<DiscoveredPlace, string>();
    let cityFile: string | undefined;
    for (const ids of chunk([...new Set([...withQ.map((p) => p.wikidata!), ...(cityQid ? [cityQid] : [])])], 50)) {
      type Ent = { claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[]; P31?: { mainsnak?: { datavalue?: { value?: { id?: string } } } }[] }; sitelinks?: Record<string, { title: string }>; descriptions?: { en?: { value: string } } };
      const j = await this.wmSafe<{ entities?: Record<string, Ent> }>(`https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|sitelinks|descriptions&languages=en&ids=${ids.join("|")}`);
      for (const [id, ent] of Object.entries(j.entities ?? {})) {
        const file = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (id === cityQid) { cityFile = file; continue; }
        const links = Object.keys(ent.sitelinks ?? {}).filter((k) => k.endsWith("wiki") && !k.includes("commons")).length;
        const types = (ent.claims?.P31 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[];
        for (const p of withQ.filter((x) => x.wikidata === id)) {
          if (!p.osmUrl) applyWikidataType(p, types); // Wikipedia-only places: classify from "instance of"
          p.notability += Math.min(8, Math.log2(1 + links) * 1.6);
          const en = ent.sitelinks?.enwiki?.title;
          if (en) enTitle.set(p, en);
          const d = ent.descriptions?.en?.value;
          if (d && !/^(building|human settlement|park|beach) in /i.test(d)) p.description = capital(d) + ".";
          if (file && p.category !== "food" && p.category !== "cafe") (files.get(file) ?? files.set(file, []).get(file)!).push(p);
        }
      }
    }
    for (const p of places) {
      if (p.wikipedia?.startsWith("en:") && !enTitle.has(p)) enTitle.set(p, p.wikipedia.slice(3));
      const f = commonsFile(p.imageTag);
      if (f && !p.photo && ![...files.values()].some((l) => l.includes(p))) (files.get(f) ?? files.set(f, []).get(f)!).push(p);
    }
    // Intro extracts for the most notable places with an English article.
    const top = [...enTitle.entries()].sort((a, b) => b[0].notability - a[0].notability).slice(0, 40);
    for (const group of chunk(top, 20)) {
      const j = await this.wmSafe<{ query?: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages?: Record<string, { title: string; extract?: string }> } }>(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=2&exlimit=20&redirects=1&titles=${encodeURIComponent(group.map(([, t]) => t).join("|"))}`);
      const alias = new Map<string, string>();
      for (const n of [...(j.query?.normalized ?? []), ...(j.query?.redirects ?? [])]) alias.set(n.from, alias.get(n.to) ?? n.to);
      const byTitle = new Map(Object.values(j.query?.pages ?? {}).map((pg) => [pg.title, pg.extract ?? ""]));
      for (const [p, t] of group) {
        let tt = t; for (let i = 0; i < 3 && alias.has(tt); i++) tt = alias.get(tt)!;
        const ex = byTitle.get(tt)?.trim();
        if (ex && ex.length > 30) { p.description = shortExtract(ex); p.sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(tt.replace(/ /g, "_"))}`; }
      }
    }
    // Photos: only for the most notable places, with real licence + author from Commons.
    const wanted = [...files.entries()].sort((a, b) => Math.max(...b[1].map((p) => p.notability)) - Math.max(...a[1].map((p) => p.notability))).slice(0, 45);
    if (cityFile) wanted.unshift([cityFile, []]);
    let cityPhoto: DiscoveredPlace["photo"] | undefined;
    for (const group of chunk(wanted, 10)) { // small batches: extmetadata responses are otherwise truncated
      const titles = group.map(([f]) => "File:" + f);
      type Info = { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> };
      const j = await this.wmSafe<{ query?: { normalized?: { from: string; to: string }[]; pages?: Record<string, { title: string; imageinfo?: Info[] }> } }>(
        `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=720&titles=${encodeURIComponent(titles.join("|"))}`);
      const norm = new Map((j.query?.normalized ?? []).map((n) => [n.from, n.to]));
      const pages = new Map(Object.values(j.query?.pages ?? {}).map((pg) => [pg.title, pg.imageinfo?.[0]]));
      for (const [f, ps] of group) {
        const t = "File:" + f, info = pages.get(norm.get(t) ?? t);
        const photo = toPhoto(f, info);
        if (!photo) continue;
        if (f === cityFile && !ps.length) cityPhoto = photo;
        for (const p of ps) { p.photo = photo; p.notability += 0.5; }
      }
    }
    return cityPhoto;
  }
}

function toPhoto(file: string, info?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }): DiscoveredPlace["photo"] | undefined {
  const m = info?.extmetadata ?? {};
  const license = stripHtml(m.LicenseShortName?.value);
  if (!info?.thumburl || !isWikimediaImageUrl(info.thumburl) || !FREE.test(license) || /non-free|fair use/i.test(license)) return undefined;
  return { src: cleanWikimediaUrl(info.thumburl), title: file.slice(0, 300), author: (stripHtml(m.Artist?.value) || "Wikimedia Commons contributor").slice(0, 300), license: license.slice(0, 80),
    licenseUrl: (m.LicenseUrl?.value ?? "").slice(0, 300), sourceUrl: (info.descriptionurl ?? "").slice(0, 400) };
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function commonsFile(tag?: string): string | null {
  if (!tag) return null;
  const m = tag.match(/^(?:File|Image):(.+)$/i) ?? tag.match(/commons\.wikimedia\.org\/wiki\/(?:File|Image):([^?#]+)/i) ?? tag.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).replace(/_/g, " ") : null;
}

/** Wikipedia-only fallback: guess the category from the article title. */
export function placeFromWikiTitle(g: { title: string; lat: number; lon: number }): DiscoveredPlace {
  const t = g.title;
  const rule: [RegExp, DiscoveredPlace["category"], DiscoveredPlace["interests"], number, boolean][] = [
    [/museum|gallery/i, "museum", ["history", "art"], 120, true], [/beach/i, "beach", ["nature"], 120, false], [/park|garden|reserve|forest/i, "nature", ["nature"], 75, false],
    [/church|cathedral|basilica|monastery|temple|mosque|chapel|synagogue/i, "sight", ["architecture", "history"], 45, true], [/castle|palace|fort|tower|bridge|monument/i, "sight", ["history", "architecture"], 60, false],
    [/market|mall|shopping/i, "shopping", ["shopping"], 75, false], [/theatre|theater|opera/i, "nightlife", ["art", "nightlife"], 150, true],
  ];
  const hit = rule.find(([re]) => re.test(t));
  if (!hit || /station|school|university|hospital|street|road|avenue|suburb|district|parish|electoral/i.test(t)) {
    return { key: "w" + encodeURIComponent(t), name: t, category: "sight", interests: ["history"], description: "", durationMinutes: 45, cost: [-1, -1], indoor: false, location: { lat: g.lat, lng: g.lon }, osmUrl: "", wikipedia: "en:" + t, notability: -5 };
  }
  return { key: "w" + encodeURIComponent(t), name: t.slice(0, 120), category: hit[1], interests: hit[2], description: "", durationMinutes: hit[3], cost: [-1, -1], indoor: hit[4], location: { lat: g.lat, lng: g.lon }, osmUrl: "", wikipedia: "en:" + t, notability: 2 };
}

/** Wikidata "instance of" (P31) → category for Wikipedia-sourced places. Unknown/non-visitable types are dropped. */
const P31: Record<string, [DiscoveredPlace["category"], DiscoveredPlace["interests"], number, boolean]> = {
  Q33506: ["museum", ["history", "art"], 120, true], Q207694: ["museum", ["art"], 120, true], Q1007870: ["museum", ["art"], 90, true], Q2281788: ["museum", ["nature"], 150, true],
  Q40080: ["beach", ["nature"], 120, false], Q22698: ["nature", ["nature"], 75, false], Q167346: ["nature", ["nature"], 90, false], Q179049: ["nature", ["nature"], 150, false], Q46169: ["nature", ["nature"], 180, false],
  Q43501: ["nature", ["nature"], 180, false], Q194195: ["sight", ["nature", "nightlife"], 240, false], Q6017969: ["viewpoint", ["nature"], 45, false], Q39715: ["viewpoint", ["history", "nature"], 60, false],
  Q16970: ["sight", ["architecture", "history"], 45, true], Q2977: ["sight", ["architecture", "history"], 60, true], Q44613: ["sight", ["architecture", "history"], 60, true], Q32815: ["sight", ["architecture", "history"], 45, true], Q44539: ["sight", ["architecture", "history"], 45, true],
  Q23413: ["sight", ["history", "architecture"], 90, false], Q16560: ["sight", ["history", "architecture"], 75, true], Q57821: ["sight", ["history"], 75, false], Q4989906: ["sight", ["history"], 30, false], Q575759: ["sight", ["history"], 30, false],
  Q12280: ["sight", ["architecture"], 30, false], Q174782: ["walk", ["architecture", "history"], 30, false], Q11315: ["shopping", ["shopping"], 90, true], Q330284: ["shopping", ["shopping", "food"], 75, false], Q1076486: ["shopping", ["food", "shopping"], 75, true],
  Q1088552: ["sight", ["architecture", "history"], 45, true], Q108325: ["sight", ["architecture", "history"], 30, true], Q56242215: ["sight", ["architecture", "history"], 60, true], Q160742: ["sight", ["history", "architecture"], 75, true],
  Q2087181: ["museum", ["history"], 75, true], Q17431399: ["museum", ["history", "art"], 120, true], Q3329412: ["museum", ["history"], 120, true], Q588140: ["museum", ["nature"], 120, true], Q1970365: ["museum", ["nature", "history"], 120, true],
  Q1440300: ["viewpoint", ["architecture", "nature"], 60, false], Q12518: ["sight", ["architecture", "history"], 45, false],
  Q24354: ["nightlife", ["art", "nightlife"], 150, true], Q153562: ["nightlife", ["art", "nightlife"], 150, true], Q570116: ["sight", ["history"], 60, false], Q839954: ["sight", ["history"], 60, false], Q811979: ["sight", ["architecture"], 45, false],
};
export function applyWikidataType(p: DiscoveredPlace, types: string[]): void {
  const hit = types.map((t) => P31[t]).find(Boolean);
  if (hit) { [p.category, p.interests, p.durationMinutes, p.indoor] = [hit[0], hit[1], hit[2], hit[3]]; p.notability = Math.max(p.notability, 2); }
  else if (p.notability < 0 || types.length) p.notability = -50; // settlements, events, organisations, people, unknown types
}

/** First 1–2 sentences, without parenthetical pronunciations/translations, ≤ 280 chars. */
export function shortExtract(ex: string): string {
  let t = ex.replace(/\s*\((?:[^()]|\([^()]*\))*\)/g, "").replace(/\s+([,.;])/g, "$1").replace(/\s{2,}/g, " ").trim();
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t];
  t = sentences[0].trim();
  if (sentences[1] && t.length + sentences[1].length < 280) t += " " + sentences[1].trim();
  return t.length > 280 ? t.slice(0, 277).replace(/\s+\S*$/, "") + "…" : t;
}
