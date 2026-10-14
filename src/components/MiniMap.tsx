"use client";
import { useEffect, useRef, useState } from "react";
import { Ruler } from "lucide-react";
import type { GeoPoint } from "@/domain/schemas";
import { formatDistance, haversineKm } from "@/services/geocoding";

/** Small static-looking Leaflet map of a stop (themed pin) and the base (home icon), fitted to both. */
export function MiniMap({ stop, base, accent }: { stop: GeoPoint; base?: GeoPoint | null; accent: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let map: { remove: () => void } | null = null, cancelled = false;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import("leaflet").then((mod) => {
        if (cancelled || !ref.current) return;
        const L = mod.default ?? mod;
        const m = L.map(ref.current, { zoomSnap: 0.25, attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17 }).addTo(m);
        const pin = L.divIcon({ className: "pin", html: `<span style="background:${accent}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
        const home = L.divIcon({ className: "pin pin-home", html: `<span></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
        const pts: [number, number][] = [[stop.lat, stop.lng]];
        L.marker(pts[0], { icon: pin, keyboard: false }).addTo(m);
        if (base) { pts.push([base.lat, base.lng]); L.marker(pts[1], { icon: home, keyboard: false }).addTo(m); }
        pts.length > 1 ? m.fitBounds(L.latLngBounds(pts), { padding: [16, 16], maxZoom: 16 }) : m.setView(pts[0], 15);
        map = m;
      }).catch(() => setFailed(true));
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); map?.remove(); };
  }, [stop, base, accent]);

  const dist = base ? haversineKm(base, stop) : null;
  return (
    <div className="minimap">
      {failed ? <p className="muted">Map unavailable.</p> : <div ref={ref} className="minimap-canvas" role="img" aria-label="Map showing this stop relative to where you're staying" />}
      {dist !== null && <p className="minimap-dist"><Ruler size={12} aria-hidden="true" /> {formatDistance(dist)} as the crow flies from where you&apos;re staying</p>}
      <p className="minimap-attr">© OpenStreetMap</p>
    </div>
  );
}
