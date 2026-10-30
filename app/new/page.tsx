"use client";
import type React from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Accessibility, ArrowLeft, ArrowRight, BedDouble, CalendarCheck, CalendarDays, Check, Coins, Footprints, Gauge, Heart, ListChecks, Loader2, MapPin, PiggyBank, PlaneLanding, PlaneTakeoff, RefreshCw, Salad, SlidersHorizontal, Sparkles, StickyNote, Users } from "lucide-react";
import { destinationImage } from "@/services/images";
import { resolveDestination } from "@/services/itinerary/DemoItineraryGenerator";
import { PhotoCredit } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { ActivityRow } from "@/components/ActivityRow";
import { AddItem } from "@/components/AddItem";
import * as edit from "@/services/editing";
import { DestinationHero, DestinationMotif, DestinationThemeProvider, ThemedSectionDivider } from "@/components/theme";
import { INTERESTS, PreferencesSchema, TripInputSchema, type Preferences, type Trip } from "@/domain/schemas";
import { formatDay } from "@/lib/dates";
import { getServices } from "@/services/container";
import { generateTrip, generationNotice } from "@/services/trips";
import { CATALOG } from "@/services/itinerary/catalog";

const CURRENCIES = ["GBP", "EUR", "USD", "TRY", "JPY", "AUD", "CAD", "CHF", "SEK", "NOK", "DKK"];
function isoIn(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

type Errors = Partial<Record<string, string>>;

export default function NewTrip() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [arrivalDate, setArrival] = useState(isoIn(14));
  const [departureDate, setDeparture] = useState(isoIn(17));
  const [nativeCurrency, setCurrency] = useState("GBP");
  const [accommodation, setAccommodation] = useState("");
  const [arrNum, setArrNum] = useState(""), [arrTime, setArrTime] = useState(""), [depNum, setDepNum] = useState(""), [depTime, setDepTime] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(PreferencesSchema.parse({}));
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<Trip | null>(null);
  const [seed, setSeed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edited, setEdited] = useState(false); // draft has hand edits that regenerating would discard
  const [flightsOpen, setFlightsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Prefill from ?dest= (destination cards on the home page).
  useEffect(() => { const d = new URLSearchParams(window.location.search).get("dest"); if (d) setDestination(d.slice(0, 120)); }, []);
  // Restore an unconfirmed draft from this tab's session storage.
  useEffect(() => { getServices().drafts.getDraft().then((d) => { if (d) { setDraft(d); setEdited(d.updatedAt !== d.createdAt); setDestination(d.destination.name); setArrival(d.arrivalDate); setDeparture(d.departureDate); setCurrency(d.nativeCurrency); setAccommodation(d.accommodation); setArrNum(d.flights.arrival?.number ?? ""); setArrTime(d.flights.arrival?.time ?? ""); setDepNum(d.flights.departure?.number ?? ""); setDepTime(d.flights.departure?.time ?? ""); setPrefs(d.preferences); setStep(2); } }); }, []);

  const flight = (number: string, time: string) => (number.trim() || time ? { number: number.trim() || undefined, time: time || undefined } : undefined);
  const input = { destination, arrivalDate, departureDate, nativeCurrency, accommodation, flights: { arrival: flight(arrNum, arrTime), departure: flight(depNum, depTime) }, preferences: prefs };

  function validateBasics(): boolean {
    const r = TripInputSchema.safeParse(input);
    if (r.success) { setErrors({}); return true; }
    const e: Errors = {};
    for (const i of r.error.issues) { const k = i.path.join("."); if (!e[k]) e[k] = i.message; }
    setErrors(e);
    return false;
  }

  /** Apply a hand edit to the draft preview; kept in session storage so a refresh doesn't lose it. */
  function updateDraft(next: Trip, _label: string) {
    setDraft(next); setEdited(true); setEditingId(null);
    getServices().drafts.saveDraft(next).catch(() => {});
  }

  async function generate(nextSeed = seed) {
    if (!validateBasics()) { setStep(0); return; }
    if (edited && !window.confirm("Generating again replaces the edits you made to this draft. Continue?")) return;
    setBusy(true);
    try {
      const s = getServices();
      setProgress("Drafting your itinerary…");
      const t = await generateTrip(input, s.generator, nextSeed, setProgress);
      setNotice(generationNotice(t) ?? "");
      await s.drafts.saveDraft(t);
      setDraft(t); setEdited(false); setEditingId(null); setStep(2);
    } catch { setNotice("Something went wrong while drafting — please try again."); } finally { setBusy(false); setProgress(""); }
  }

  async function save() {
    if (!draft) return;
    try {
      const s = getServices();
      await s.trips.save(draft);
      await s.drafts.clearDraft();
      router.push(`/trip/?id=${draft.id}&created=1`);
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save"); }
  }

  const toggleInterest = (i: (typeof INTERESTS)[number]) => setPrefs((p) => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter((x) => x !== i) : [...p.interests, i] }));

  const seg = <K extends "budget" | "pace" | "walking" | "party">(k: K, label: React.ReactNode, options: Preferences[K][]) => (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="seg">{options.map((o) => (
        <label key={o} className={prefs[k] === o ? "on" : ""}><input type="radio" name={k} checked={prefs[k] === o} onChange={() => setPrefs((p) => ({ ...p, [k]: o }))} />{o}</label>
      ))}</div>
    </fieldset>
  );

  return (
    <DestinationThemeProvider destination={draft?.destination}>
      <div className="page narrow">
        <DestinationHero eyebrow={`Step ${step + 1} of 3`} title={step === 0 ? "Where are you going?" : step === 1 ? "What do you enjoy?" : `Your ${draft?.destination.name ?? ""} draft`} />
        <ol className="steps" aria-label="Progress">{([["Trip basics", MapPin], ["Preferences", SlidersHorizontal], ["Preview", ListChecks]] as const).map(([s, I], i) => <li key={s} aria-current={i === step ? "step" : undefined} className={i <= step ? "done" : ""}><I size={14} aria-hidden="true" /> {s}</li>)}</ol>

        {step === 0 && (
          <form className="card form" onSubmit={(e) => { e.preventDefault(); if (validateBasics()) setStep(1); }} noValidate>
            <div className="field">
              <label htmlFor="dest"><MapPin size={15} aria-hidden="true" /> Destination <span className="req">required</span></label>
              <input id="dest" list="dest-list" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Athens" aria-invalid={!!errors.destination} aria-describedby="dest-help dest-err" autoComplete="off" />
              <datalist id="dest-list">{CATALOG.map((c) => <option key={c.key} value={c.name} />)}</datalist>
              <p id="dest-help" className="help">Any city works. Athens, Rome, Paris, Istanbul and Tokyo have richer demo content; other places get a general template.</p>
              {errors.destination && <p id="dest-err" className="err">{errors.destination}</p>}
              {(() => { const d = resolveDestination(destination || " ").destination; const img = destinationImage(d.catalogKey); return img ? <figure className="dest-preview">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img.src} alt={d.name} /><figcaption><MapPin size={14} aria-hidden="true" /> {d.name}, {d.country}</figcaption><PhotoCredit credit={img} /></figure> : null; })()}
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="arr"><CalendarDays size={15} aria-hidden="true" /> Arrival <span className="req">required</span></label><input id="arr" type="date" value={arrivalDate} onChange={(e) => setArrival(e.target.value)} aria-invalid={!!errors.arrivalDate} />{errors.arrivalDate && <p className="err">{errors.arrivalDate}</p>}</div>
              <div className="field"><label htmlFor="dep"><CalendarCheck size={15} aria-hidden="true" /> Departure <span className="req">required</span></label><input id="dep" type="date" value={departureDate} onChange={(e) => setDeparture(e.target.value)} aria-invalid={!!errors.departureDate} />{errors.departureDate && <p className="err" role="alert">{errors.departureDate}</p>}</div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="cur"><Coins size={15} aria-hidden="true" /> Your home currency <span className="req">required</span></label>
                <select id="cur" value={nativeCurrency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label htmlFor="acc"><BedDouble size={15} aria-hidden="true" /> Staying in (optional)</label><input id="acc" value={accommodation} onChange={(e) => setAccommodation(e.target.value)} placeholder="Neighbourhood or hotel name" maxLength={200} />
                <p className="help">A general area is fine. Never included in shared links unless you choose.</p></div>
            </div>
            <Collapsible id="flights" level={3} variant="inline" lazy={false} icon={<PlaneLanding size={18} />} title="Flights (optional)"
              summary={arrNum || arrTime || depNum || depTime ? [arrNum && `in ${arrNum}`, depNum && `out ${depNum}`].filter(Boolean).join(" · ") || "Times added" : "Plan around your arrival and departure times"}
              open={flightsOpen || !!errors.flights} onOpenChange={setFlightsOpen}>
              <div className="form-stack">
              <p className="help">We use these times to start day one after you land and finish the last day in time for the airport. Times are local; nothing is looked up online.</p>
              <div className="grid2">
                <div className="field"><label htmlFor="arr-fn"><PlaneLanding size={15} aria-hidden="true" /> Arrival flight</label><input id="arr-fn" value={arrNum} onChange={(e) => setArrNum(e.target.value)} placeholder="e.g. A3 601" maxLength={8} aria-invalid={!!errors["flights.arrival.number"]} />{errors["flights.arrival.number"] && <p className="err">{errors["flights.arrival.number"]}</p>}</div>
                <div className="field"><label htmlFor="arr-ft">Lands at</label><input id="arr-ft" type="time" value={arrTime} onChange={(e) => setArrTime(e.target.value)} /></div>
                <div className="field"><label htmlFor="dep-fn"><PlaneTakeoff size={15} aria-hidden="true" /> Departure flight</label><input id="dep-fn" value={depNum} onChange={(e) => setDepNum(e.target.value)} placeholder="e.g. A3 602" maxLength={8} aria-invalid={!!errors["flights.departure.number"]} />{errors["flights.departure.number"] && <p className="err">{errors["flights.departure.number"]}</p>}</div>
                <div className="field"><label htmlFor="dep-ft">Takes off at</label><input id="dep-ft" type="time" value={depTime} onChange={(e) => setDepTime(e.target.value)} /></div>
              </div>
              {errors.flights && <p className="err" role="alert">{errors.flights}</p>}
              </div>
            </Collapsible>
            <div className="row end"><button className="btn" type="submit">Next <ArrowRight size={18} aria-hidden="true" /></button></div>
          </form>
        )}

        {step === 1 && (
          <form className="card form" onSubmit={(e) => { e.preventDefault(); generate(); }}>
            <fieldset className="field"><legend><Heart size={15} aria-hidden="true" /> Interests <span className="help-inline">(optional — pick any)</span></legend>
              <div className="chips">{INTERESTS.map((i) => <label key={i} className={`chip ${prefs.interests.includes(i) ? "on" : ""}`}><input type="checkbox" checked={prefs.interests.includes(i)} onChange={() => toggleInterest(i)} />{i}</label>)}</div>
            </fieldset>
            {seg("budget", <><PiggyBank size={15} aria-hidden="true" /> Budget</>, ["shoestring", "moderate", "comfortable", "luxury"])}
            {seg("pace", <><Gauge size={15} aria-hidden="true" /> Daily pace</>, ["relaxed", "balanced", "packed"])}
            <Collapsible id="more-prefs" level={3} variant="inline" lazy={false} icon={<SlidersHorizontal size={18} />} title="More about you (optional)" summary="Walking, travelling as, diet, accessibility, notes" open={moreOpen} onOpenChange={setMoreOpen}>
              <div className="form-stack">
            {seg("walking", <><Footprints size={15} aria-hidden="true" /> Walking tolerance</>, ["low", "medium", "high"])}
            {seg("party", <><Users size={15} aria-hidden="true" /> Travelling as</>, ["solo", "couple", "family", "group"])}
            <div className="grid2">
              <div className="field"><label htmlFor="diet"><Salad size={15} aria-hidden="true" /> Dietary needs</label><input id="diet" value={prefs.dietary} maxLength={200} onChange={(e) => setPrefs({ ...prefs, dietary: e.target.value })} placeholder="e.g. vegetarian" /></div>
              <div className="field"><label htmlFor="access"><Accessibility size={15} aria-hidden="true" /> Accessibility</label><input id="access" value={prefs.accessibility} maxLength={200} onChange={(e) => setPrefs({ ...prefs, accessibility: e.target.value })} placeholder="e.g. step-free routes" /></div>
            </div>
            <div className="field"><label htmlFor="notes"><StickyNote size={15} aria-hidden="true" /> Anything else?</label><textarea id="notes" rows={3} maxLength={1000} value={prefs.notes} onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })} /></div>
              </div>
            </Collapsible>
            <div className="row between">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
              <button className="btn" type="submit" disabled={busy}><Sparkles size={18} aria-hidden="true" /> {busy ? "Drafting…" : "Generate itinerary"}</button>
            </div>
            {busy && <p className="notice gen-progress" role="status" aria-live="polite"><Loader2 size={16} className="spin" aria-hidden="true" /> {progress || "Drafting…"}{!resolveDestination(destination || " ").catalog && <span className="muted"> Finding real places can take 10–30 seconds the first time; results are then saved in this browser.</span>}</p>}
          </form>
        )}

        {step === 2 && draft && (
          <section aria-label="Preview">
            {draft.generator === "osm-discovery-v1"
              ? <p className="notice">Places in this draft are <strong>real places found on OpenStreetMap and Wikipedia</strong> near {draft.destination.name}, ranked by how notable they are. Prices and opening hours are unknown unless listed; meal slots without a named place are general suggestions. Nothing is saved until you confirm.</p>
              : <p className="notice">This draft uses <strong>demonstration content</strong>: places and price ranges are illustrative and not verified. Nothing is saved until you confirm. You can edit everything after saving.</p>}
            {notice && <p className="notice notice-warn" role="status">{notice}</p>}
            {draft.days.map((d) => (
              <Collapsible key={d.id} id={`preview-${d.id}`} level={3} defaultOpen={d.id === draft.days[0].id} className="preview-day" icon={<DestinationMotif size={18} />} title={formatDay(d.date)} summary={`${d.title} · ${d.activities.length} stops`}>
                <ul className="activities day-items" aria-label={`Items for ${formatDay(d.date)}`}>
                  {d.activities.map((a) => <ActivityRow key={a.id} trip={draft} dayId={d.id} activity={a} editing={editingId === a.id} onEditing={(o) => setEditingId(o ? a.id : null)} onChange={updateDraft} />)}
                </ul>
                {d.activities.length === 0 && <p className="muted">A free day — add something below.</p>}
                <AddItem dayId={d.id} cityName={draft.destination.name} center={draft.destination.location} base={null}
                  onAdd={(v) => v.kind === "activity" ? updateDraft(edit.addActivity(draft, d.id, v), `Added “${v.title}”`) : updateDraft(edit.addMeal(draft, d.id, v), `Added ${v.meal} at “${v.venue.name}”`)} />
              </Collapsible>
            ))}
            <ThemedSectionDivider />
            {saveError && <p className="err" role="alert">{saveError}</p>}
            <div className="row between">
              <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={18} aria-hidden="true" /> Change preferences</button>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => { const n = seed + 1; setSeed(n); generate(n); }} disabled={busy}><RefreshCw size={18} aria-hidden="true" /> Try another version</button>
                <button className="btn" onClick={save}><Check size={18} aria-hidden="true" /> Save my guide</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </DestinationThemeProvider>
  );
}
