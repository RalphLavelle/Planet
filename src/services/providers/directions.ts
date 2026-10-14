import type { GeoPoint } from "@/domain/schemas";
import type { DirectionsProvider } from "./types";

const ll = (p: GeoPoint) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/** Deep links to Google Maps (universal URLs, no key) + keyless OpenStreetMap embed. */
export class ExternalLinkDirectionsProvider implements DirectionsProvider {
  readonly id = "google-maps-links+osm-embed";
  directionsUrl(to: GeoPoint, from?: GeoPoint | string, mode: "walking" | "transit" | "driving" = "walking") {
    const o = from ? `&origin=${encodeURIComponent(typeof from === "string" ? from : ll(from))}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${ll(to)}${o}&travelmode=${mode}`;
  }
  placeUrl(p: GeoPoint, label?: string) {
    return `https://www.google.com/maps/search/?api=1&query=${label ? encodeURIComponent(label) : ll(p)}`;
  }
  embedUrl(points: GeoPoint[]) {
    if (!points.length) return null;
    const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
    const pad = 0.01;
    const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].map((n) => n.toFixed(4)).join(",");
    const marker = points.length === 1 ? `&marker=${ll(points[0])}` : "";
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
  }
}
