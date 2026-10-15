import { cleanWikimediaUrl, isWikimediaImageUrl, type GeoPoint, type Venue } from "@/domain/schemas";
import type { KeyValueStore } from "@/repositories/TripRepository";
import { haversineKm, nominatimThrottle } from "./geocoding";

export interface RestaurantCandidate { venue: Venue; location: GeoPoint; distanceKm?: number; kind: string; wikidata?: string; image?: string }
export interface RestaurantFinder {
  search(name: string, near: { center: GeoPoint; base?: GeoPoint | null; cityName: string }): Promise<RestaurantCandidate[]>;
  /** Licensed Wikimedia photo for a candidate, only from its own OSM wikidata/image tags. Null when none. */
  photo(c: RestaurantCandidate): Promise<Venue["photo"] | null>;
}

const FOOD_TYPES = new Set(["restaurant", "cafe", "fast_food", "bar", "pub", "food_court", "biergarten", "ice_cream", "bakery", "deli", "confectionery"]);
type NominatimHit = { lat: string; lon: string; osm_type?: string; osm_id?: number; category?: string; class?: string; type?: string; name?: string; display_name?: string;
  address?: Record<string, string>; extratags?: Record<string, string> | null };

/** "18 Mitropoleos, Plaka" style short address from Nominatim addressdetails. */
export function shortAddress(h: NominatimHit): string {
  const a = h.address ?? {};
  const street = [a.road ?? a.pedestrian ?? a.footway ?? a.square, a.house_number].filter(Boolean).join(" ");
  const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? a.city ?? a.town ?? "";
  const s = [street, area].filter(Boolean).join(", ");
  return s || (h.display_name ?? "").split(",").slice(1, 3).join(",").trim();
}

/** Keep only food & drink POIs; nearest to the base (else city centre) first. */
export function parseCandidates(hits: NominatimHit[], ref: GeoPoint): RestaurantCandidate[] {
  const seen = new Set<string>();
  return hits
    .filter((h) => (h.category ?? h.class) === "amenity" || (h.category ?? h.class) === "shop" ? FOOD_TYPES.has(h.type ?? "") : false)
    .map((h) => {
      const location = { lat: Number(h.lat), lng: Number(h.lon) };
      const name = (h.name || h.display_name?.split(",")[0] || "").trim().slice(0, 120);
      const osmUrl = h.osm_type && h.osm_id ? `https://www.openstreetmap.org/${h.osm_type}/${h.osm_id}` : undefined;
      return { venue: { name, address: shortAddress(h).slice(0, 240), osmUrl, source: "osm" as const }, location, distanceKm: haversineKm(ref, location), kind: h.type ?? "restaurant",
        wikidata: h.extratags?.wikidata, image: h.extratags?.image ?? h.extratags?.wikimedia_commons };
    })
    .filter((c) => c.venue.name && Number.isFinite(c.location.lat) && !seen.has(c.venue.osmUrl ?? c.venue.name) && !!seen.add(c.venue.osmUrl ?? c.venue.name))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/** Commons file title from an OSM image/wikimedia_commons tag, or null for non-Wikimedia URLs (unknown licence → never shown). */
export function commonsFileFromTag(tag?: string): string | null {
  if (!tag) return null;
  const t = tag.trim();
  const m = t.match(/^(?:File|Image):(.+)$/i) ?? t.match(/commons\.wikimedia\.org\/wiki\/(?:File|Image):([^?#]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/_/g, " ");
  const up = t.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
  return up ? decodeURIComponent(up[1]).replace(/_/g, " ") : null;
}

const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/** Keyless: OSM Nominatim (≤1 req/s shared with the geocoder, cached) + Wikidata/Commons APIs for licensed photos. */
export class OsmRestaurantFinder implements RestaurantFinder {
  constructor(private readonly cache: () => KeyValueStore | null, private readonly fetchImpl: typeof fetch = (...a) => fetch(...a), private readonly throttle: () => Promise<void> = nominatimThrottle) {}

  private cached<T>(key: string): T | undefined { const v = this.cache()?.getItem(key); if (v == null) return undefined; try { return JSON.parse(v) as T; } catch { return undefined; } }
  private put(key: string, v: unknown) { try { this.cache()?.setItem(key, JSON.stringify(v)); } catch { /* best effort */ } }

  async search(name: string, near: { center: GeoPoint; base?: GeoPoint | null; cityName: string }): Promise<RestaurantCandidate[]> {
    const q = name.trim();
    if (q.length < 2) return [];
    const ref = near.base ?? near.center;
    const key = `planet:cache:food:${q.toLowerCase()}@${ref.lat.toFixed(3)},${ref.lng.toFixed(3)}`;
    const hit = this.cached<RestaurantCandidate[]>(key);
    if (hit) return hit;
    const box = (p: GeoPoint, d: number) => [p.lng - d, p.lat + d, p.lng + d, p.lat - d].map((n) => n.toFixed(4)).join(",");
    const url = (params: string) => `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&extratags=1&${params}`;
    // 1) bounded search around the base/centre (~15 km); 2) fallback: name + city text.
    const attempts = [url(`q=${encodeURIComponent(q)}&viewbox=${box(ref, 0.14)}&bounded=1`), url(`q=${encodeURIComponent(`${q}, ${near.cityName}`)}`)];
    let out: RestaurantCandidate[] = [];
    for (const u of attempts) {
      await this.throttle();
      try {
        const res = await this.fetchImpl(u, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        out = parseCandidates((await res.json()) as NominatimHit[], ref).filter((c) => haversineKm(near.center, c.location) < 40).slice(0, 6);
      } catch { continue; }
      if (out.length) break;
    }
    this.put(key, out);
    return out;
  }

  async photo(c: RestaurantCandidate): Promise<Venue["photo"] | null> {
    const id = c.venue.osmUrl ?? c.venue.name;
    const key = "planet:cache:foodimg:" + id;
    const hit = this.cached<Venue["photo"] | null>(key);
    if (hit !== undefined) return hit;
    let file = commonsFileFromTag(c.image);
    try {
      if (!file && c.wikidata && /^Q\d+$/.test(c.wikidata)) {
        const r = await this.fetchImpl(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${c.wikidata}&property=P18&format=json&origin=*`);
        const j = (await r.json()) as { claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] } };
        file = j.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
      }
      let photo: Venue["photo"] | null = null;
      if (file) {
        const r = await this.fetchImpl(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent("File:" + file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&format=json&origin=*`);
        const j = (await r.json()) as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }> } };
        const info = Object.values(j.query?.pages ?? {})[0]?.imageinfo?.[0];
        const m = info?.extmetadata ?? {};
        if (info?.thumburl && isWikimediaImageUrl(info.thumburl)) {
          photo = { src: cleanWikimediaUrl(info.thumburl), title: file.slice(0, 300), author: (stripHtml(m.Artist?.value) || "Wikimedia Commons contributor").slice(0, 300),
            license: (stripHtml(m.LicenseShortName?.value) || "see source").slice(0, 80), licenseUrl: (m.LicenseUrl?.value ?? "").slice(0, 300), sourceUrl: (info.descriptionurl ?? "").slice(0, 400) };
        }
      }
      this.put(key, photo);
      return photo;
    } catch { return null; }
  }
}
