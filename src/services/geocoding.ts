import type { GeoPoint } from "@/domain/schemas";
import type { KeyValueStore } from "@/repositories/TripRepository";

export interface Geocoder { geocode(query: string): Promise<GeoPoint | null> }

/** Shared politeness gate for every Nominatim call in this tab: ≥1.1 s between requests (usage policy: max 1/s). */
let lastNominatim = 0;
let gate: Promise<void> = Promise.resolve();
export function nominatimThrottle(): Promise<void> {
  const next = gate.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatim));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastNominatim = Date.now();
  });
  gate = next;
  return next;
}

/** Free, keyless OpenStreetMap Nominatim. One request per second, results cached (incl. misses). */
export class NominatimGeocoder implements Geocoder {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly cache: () => KeyValueStore | null, private readonly fetchImpl: typeof fetch = (...a) => fetch(...a), private readonly throttle: () => Promise<void> = nominatimThrottle) {}

  geocode(query: string): Promise<GeoPoint | null> {
    const q = query.trim();
    if (q.length < 2) return Promise.resolve(null);
    const key = "planet:cache:geo:" + q.toLowerCase();
    const stored = this.cache()?.getItem(key);
    if (stored !== null && stored !== undefined) { try { return Promise.resolve(JSON.parse(stored) as GeoPoint | null); } catch { /* refetch */ } }
    const run = async (): Promise<GeoPoint | null> => {
      await this.throttle();
      try {
        const res = await this.fetchImpl(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
        if (!res.ok) return null;
        const arr = (await res.json()) as { lat: string; lon: string }[];
        const hit = arr[0] ? { lat: Number(arr[0].lat), lng: Number(arr[0].lon) } : null;
        const point = hit && Number.isFinite(hit.lat) ? hit : null;
        try { this.cache()?.setItem(key, JSON.stringify(point)); } catch { /* best effort */ }
        return point;
      } catch { return null; }
    };
    const out = this.queue.then(run, run);
    this.queue = out.then(() => undefined, () => undefined);
    return out;
  }
}

/** Great-circle distance in km from real coordinates only. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
export function formatDistance(km: number): string { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }
