"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Ruler } from "lucide-react";
import type { GeoPoint } from "@/domain/schemas";
import { formatDistance, haversineKm } from "@/services/geocoding";

/**
 * Map of one stop on free OpenStreetMap tiles (Leaflet, loaded on demand). Collapsed it is a small static-looking
 * preview that opens when tapped; expanded it is a larger interactive panel. Only rendered for stops that have real
 * coordinates, and the map is created only when it scrolls near the viewport.
 */
export function MiniMap({ stop, base, accent, title }: { stop: GeoPoint; base?: GeoPoint | null; accent: string; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let map: { remove: () => void } | null = null, cancelled = false;
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import("leaflet").then((mod) => {
        if (cancelled || !ref.current) return;
        const L = mod.default ?? mod;
        const m = L.map(ref.current, expanded
          ? { zoomSnap: 0.25, attributionControl: true, zoomControl: true, scrollWheelZoom: false }
          : { zoomSnap: 0.25, attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
        if (expanded) m.attributionControl.setPrefix(false);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(m);
        const pin = L.divIcon({ className: "pin", html: `<span style="background:${accent}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
        const home = L.divIcon({ className: "pin pin-home", html: `<span></span>`, iconSize: [18, 18], iconAnchor: [9, 9] });
        const pts: [number, number][] = [[stop.lat, stop.lng]];
        L.marker(pts[0], { icon: pin, keyboard: false }).addTo(m);
        if (base) { pts.push([base.lat, base.lng]); L.marker(pts[1], { icon: home, keyboard: false }).addTo(m); }
        pts.length > 1 ? m.fitBounds(L.latLngBounds(pts), { padding: [expanded ? 32 : 16, expanded ? 32 : 16], maxZoom: expanded ? 17 : 16 }) : m.setView(pts[0], expanded ? 16 : 15);
        map = m;
        requestAnimationFrame(() => { if (!cancelled) m.invalidateSize(); });
      }).catch(() => setFailed(true));
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); map?.remove(); };
  }, [stop, base, accent, expanded]);

  const dist = base ? haversineKm(base, stop) : null;
  const name = title ?? "this stop";
  return (
    <div className={`minimap${expanded ? " is-expanded" : ""}`}>
      {failed ? <p className="muted">Map unavailable.</p> : (
        <div className="minimap-frame">
          <div ref={ref} className="minimap-canvas" role="img" aria-label={`Map of ${name}${base ? " and where you're staying" : ""}`} />
          <button type="button" className="minimap-toggle" aria-expanded={expanded} aria-label={`${expanded ? "Close" : "Expand"} map of ${name}`} onClick={() => setExpanded((v) => !v)}>
            <span className="minimap-pill">{expanded ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}{expanded ? "Close" : "Expand"}</span>
          </button>
          {!expanded && <a className="minimap-attr" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>}
        </div>
      )}
      {expanded && dist !== null && <p className="minimap-dist"><Ruler size={12} aria-hidden="true" /> {formatDistance(dist)} as the crow flies from where you&apos;re staying</p>}
    </div>
  );
}
