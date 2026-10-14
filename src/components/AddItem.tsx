"use client";
import { useState } from "react";
import { Loader2, MapPin, Plus, Search, UtensilsCrossed } from "lucide-react";
import { MEAL_DEFAULTS, type GeoPoint, type Meal, type Venue } from "@/domain/schemas";
import { formatDistance } from "@/services/geocoding";
import type { RestaurantCandidate } from "@/services/restaurants";
import { getServices } from "@/services/container";
import { CategoryOrnament } from "./theme";

export type AddPayload =
  | { kind: "activity"; title: string; startTime?: string; durationMinutes: number }
  | { kind: "meal"; meal: Meal; venue: Venue; location?: GeoPoint; startTime: string; durationMinutes: number };

type Kind = "activity" | Meal;
const KINDS: { k: Kind; label: string }[] = [{ k: "activity", label: "Activity" }, { k: "lunch", label: "Lunch" }, { k: "dinner", label: "Dinner" }];

/** "Add an item": own activity, or Lunch/Dinner at a restaurant looked up on OpenStreetMap. */
export function AddItem({ dayId, cityName, center, base, onAdd }: { dayId: string; cityName: string; center?: GeoPoint; base: GeoPoint | null; onAdd: (p: AddPayload) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("activity");
  const [title, setTitle] = useState(""), [time, setTime] = useState(""), [dur, setDur] = useState(60);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [results, setResults] = useState<RestaurantCandidate[]>([]);
  const [picked, setPicked] = useState<RestaurantCandidate | null>(null);
  const [manual, setManual] = useState(false), [manualAddr, setManualAddr] = useState("");
  const id = (s: string) => `${s}-${dayId}`;

  function choose(k: Kind) {
    setKind(k); setResults([]); setPicked(null); setManual(false); setStatus("idle");
    if (k === "activity") { setTime(""); setDur(60); } else { setTime(MEAL_DEFAULTS[k].startTime); setDur(MEAL_DEFAULTS[k].durationMinutes); }
  }
  function reset() { setOpen(false); setTitle(""); choose("activity"); setManualAddr(""); }

  async function lookUp() {
    if (title.trim().length < 2) return;
    setStatus("searching"); setPicked(null); setManual(false);
    try {
      const s = getServices();
      const c = center ?? (await s.geocoder.geocode(cityName));
      if (!c) { setResults([]); setStatus("done"); return; }
      const r = await s.restaurants.search(title, { center: c, base, cityName });
      setResults(r); setStatus("done");
      if (r.length === 1) pick(r[0]);
    } catch { setStatus("error"); }
  }
  async function pick(c: RestaurantCandidate) {
    setPicked(c);
    if (c.venue.photo !== undefined) return;
    const photo = await getServices().restaurants.photo(c);
    setPicked((p) => (p === c ? { ...c, venue: { ...c.venue, ...(photo ? { photo } : {}) } } : p));
  }

  if (!open) return <button className="btn btn-ghost btn-small add-btn" onClick={() => setOpen(true)}><Plus size={16} aria-hidden="true" /> Add an item</button>;
  const isMeal = kind !== "activity";
  const canAdd = isMeal ? !!picked || (manual && title.trim().length > 0) : title.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    if (!isMeal) onAdd({ kind: "activity", title: title.trim(), startTime: time || undefined, durationMinutes: dur });
    else {
      const venue: Venue = picked ? picked.venue : { name: title.trim().slice(0, 120), address: manualAddr.trim().slice(0, 240), source: "manual" };
      onAdd({ kind: "meal", meal: kind, venue, location: picked?.location, startTime: time || MEAL_DEFAULTS[kind].startTime, durationMinutes: dur });
    }
    reset();
  }

  return (
    <form className="editor card add-item" onSubmit={submit} aria-label="Add an item">
      <div className="seg" role="radiogroup" aria-label="Item type">
        {KINDS.map(({ k, label }) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={`seg-btn${kind === k ? " on" : ""}`} onClick={() => choose(k)}>{label}</button>)}
      </div>
      {!isMeal ? (
        <div className="field"><label htmlFor={id("new-title")}>What are you planning?</label><input id={id("new-title")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
      ) : (
        <>
          <div className="field"><label htmlFor={id("rest")}>Restaurant name</label>
            <div className="row nowrap"><input id={id("rest")} value={title} maxLength={120} placeholder="e.g. Kuzina" onChange={(e) => { setTitle(e.target.value); setStatus("idle"); setPicked(null); }} onKeyDown={(e) => { if (e.key === "Enter" && !manual) { e.preventDefault(); lookUp(); } }} autoFocus />
              <button type="button" className="btn btn-small" onClick={lookUp} disabled={status === "searching" || title.trim().length < 2}>{status === "searching" ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />} Look up</button></div>
            <small className="muted">Searched on OpenStreetMap near {base ? "where you’re staying" : cityName}.</small>
          </div>
          <div aria-live="polite">
            {status === "searching" && <p className="muted">Searching OpenStreetMap…</p>}
            {status === "error" && <p className="err">Lookup failed — you can add it manually.</p>}
            {status === "done" && results.length === 0 && <p className="muted">No match found near {cityName}.</p>}
            {results.length > 1 && (
              <fieldset className="candidates"><legend>{results.length} matches — pick one</legend>
                {results.map((c, i) => (
                  <label key={c.venue.osmUrl ?? i} className={`candidate${picked?.venue.osmUrl === c.venue.osmUrl ? " on" : ""}`}>
                    <input type="radio" name={id("cand")} checked={picked?.venue.osmUrl === c.venue.osmUrl} onChange={() => pick(c)} />
                    <span><strong>{c.venue.name}</strong><small>{c.venue.address || "Address unknown"} · {c.kind.replace("_", " ")}{c.distanceKm !== undefined ? ` · ${formatDistance(c.distanceKm)} from ${base ? "base" : "centre"}` : ""}</small></span>
                  </label>
                ))}
              </fieldset>
            )}
            {picked && <VenuePreview venue={picked.venue} meal={kind} />}
          </div>
          {(status === "done" || status === "error") && !picked && (
            manual ? <div className="field"><label htmlFor={id("addr")}>Address or area (optional)</label><input id={id("addr")} value={manualAddr} maxLength={240} onChange={(e) => setManualAddr(e.target.value)} /></div>
              : <button type="button" className="btn btn-ghost btn-small" onClick={() => setManual(true)}>Add “{title.trim()}” manually</button>
          )}
        </>
      )}
      <div className="grid2">
        <div className="field"><label htmlFor={id("new-time")}>Start time</label><input id={id("new-time")} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor={id("new-dur")}>Duration (min)</label><input id={id("new-dur")} type="number" min={5} max={1440} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></div>
      </div>
      <div className="row end"><button type="button" className="btn btn-ghost btn-small" onClick={reset}>Cancel</button><button className="btn btn-small" disabled={!canAdd}>Add {isMeal ? (kind === "lunch" ? "lunch" : "dinner") : ""}</button></div>
    </form>
  );
}

/** Restaurant card bits: licensed Wikimedia photo if OSM links one, else the themed food icon — never a stand-in stock photo. */
export function VenueThumb({ venue, alt }: { venue: Venue; alt: string }) {
  const [failed, setFailed] = useState(false);
  const p = venue.photo;
  return (
    <div className={`thumb thumb-food${p && !failed ? " thumb-photo" : ""}`}>
      {p && !failed ? (<>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        <a className="photo-credit" href={p.sourceUrl} target="_blank" rel="noopener noreferrer" title={`${p.title} — ${p.author}, ${p.license}`}>{p.author.slice(0, 32)} · {p.license}</a></>)
        : <span className="thumb-fallback" title="No photo of this place on Wikimedia — showing an icon"><CategoryOrnament category="food" size={44} /><span className="thumb-icon-small"><UtensilsCrossed size={14} aria-hidden="true" /></span></span>}
    </div>
  );
}

function VenuePreview({ venue, meal }: { venue: Venue; meal: Meal }) {
  return (
    <div className="venue-preview">
      <VenueThumb venue={venue} alt={venue.name} />
      <div><strong>{venue.name}</strong><p className="muted"><MapPin size={12} aria-hidden="true" /> {venue.address || "Address unknown"}</p>
        <small className="muted">{venue.photo ? "Photo from Wikimedia Commons (linked from OpenStreetMap)." : "No photo of this place is linked on OpenStreetMap/Wikidata — a food icon is shown."} {meal === "lunch" ? "Lunch" : "Dinner"} default: {MEAL_DEFAULTS[meal].startTime}.</small></div>
    </div>
  );
}
