"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import { DestinationHero, DestinationMotif, DestinationThemeProvider, ThemedSectionDivider } from "@/components/theme";
import { ActivityCategoryIcon } from "@/components/ui";
import { INTERESTS, PreferencesSchema, TripInputSchema, type Preferences, type Trip } from "@/domain/schemas";
import { formatDay } from "@/lib/dates";
import { getServices } from "@/services/container";
import { generateTrip } from "@/services/trips";
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
  const [prefs, setPrefs] = useState<Preferences>(PreferencesSchema.parse({}));
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<Trip | null>(null);
  const [seed, setSeed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Restore an unconfirmed draft from this tab's session storage.
  useEffect(() => { getServices().drafts.getDraft().then((d) => { if (d) { setDraft(d); setDestination(d.destination.name); setArrival(d.arrivalDate); setDeparture(d.departureDate); setCurrency(d.nativeCurrency); setAccommodation(d.accommodation); setPrefs(d.preferences); setStep(2); } }); }, []);

  const input = { destination, arrivalDate, departureDate, nativeCurrency, accommodation, preferences: prefs };

  function validateBasics(): boolean {
    const r = TripInputSchema.safeParse(input);
    if (r.success) { setErrors({}); return true; }
    const e: Errors = {};
    for (const i of r.error.issues) { const k = String(i.path[0]); if (!e[k]) e[k] = i.message; }
    setErrors(e);
    return false;
  }

  async function generate(nextSeed = seed) {
    if (!validateBasics()) { setStep(0); return; }
    setBusy(true);
    try {
      const s = getServices();
      const t = await generateTrip(input, s.generator, nextSeed);
      await s.drafts.saveDraft(t);
      setDraft(t); setStep(2);
    } finally { setBusy(false); }
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

  const seg = <K extends "budget" | "pace" | "walking" | "party">(k: K, label: string, options: Preferences[K][]) => (
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
        <ol className="steps" aria-label="Progress">{["Trip basics", "Preferences", "Preview"].map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={i <= step ? "done" : ""}>{s}</li>)}</ol>

        {step === 0 && (
          <form className="card form" onSubmit={(e) => { e.preventDefault(); if (validateBasics()) setStep(1); }} noValidate>
            <div className="field">
              <label htmlFor="dest">Destination <span className="req">required</span></label>
              <input id="dest" list="dest-list" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Athens" aria-invalid={!!errors.destination} aria-describedby="dest-help dest-err" autoComplete="off" />
              <datalist id="dest-list">{CATALOG.map((c) => <option key={c.key} value={c.name} />)}</datalist>
              <p id="dest-help" className="help">Any city works. Athens, Rome, Paris, Istanbul and Tokyo have richer demo content; other places get a general template.</p>
              {errors.destination && <p id="dest-err" className="err">{errors.destination}</p>}
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="arr">Arrival <span className="req">required</span></label><input id="arr" type="date" value={arrivalDate} onChange={(e) => setArrival(e.target.value)} aria-invalid={!!errors.arrivalDate} />{errors.arrivalDate && <p className="err">{errors.arrivalDate}</p>}</div>
              <div className="field"><label htmlFor="dep">Departure <span className="req">required</span></label><input id="dep" type="date" value={departureDate} onChange={(e) => setDeparture(e.target.value)} aria-invalid={!!errors.departureDate} />{errors.departureDate && <p className="err" role="alert">{errors.departureDate}</p>}</div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="cur">Your home currency <span className="req">required</span></label>
                <select id="cur" value={nativeCurrency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
              <div className="field"><label htmlFor="acc">Staying in (optional)</label><input id="acc" value={accommodation} onChange={(e) => setAccommodation(e.target.value)} placeholder="Neighbourhood or hotel name" maxLength={200} />
                <p className="help">A general area is fine. Never included in shared links unless you choose.</p></div>
            </div>
            <div className="row end"><button className="btn" type="submit">Next <ArrowRight size={18} aria-hidden="true" /></button></div>
          </form>
        )}

        {step === 1 && (
          <form className="card form" onSubmit={(e) => { e.preventDefault(); generate(); }}>
            <fieldset className="field"><legend>Interests <span className="help-inline">(optional — pick any)</span></legend>
              <div className="chips">{INTERESTS.map((i) => <label key={i} className={`chip ${prefs.interests.includes(i) ? "on" : ""}`}><input type="checkbox" checked={prefs.interests.includes(i)} onChange={() => toggleInterest(i)} />{i}</label>)}</div>
            </fieldset>
            {seg("budget", "Budget", ["shoestring", "moderate", "comfortable", "luxury"])}
            {seg("pace", "Daily pace", ["relaxed", "balanced", "packed"])}
            {seg("walking", "Walking tolerance", ["low", "medium", "high"])}
            {seg("party", "Travelling as", ["solo", "couple", "family", "group"])}
            <div className="grid2">
              <div className="field"><label htmlFor="diet">Dietary needs</label><input id="diet" value={prefs.dietary} maxLength={200} onChange={(e) => setPrefs({ ...prefs, dietary: e.target.value })} placeholder="e.g. vegetarian" /></div>
              <div className="field"><label htmlFor="access">Accessibility</label><input id="access" value={prefs.accessibility} maxLength={200} onChange={(e) => setPrefs({ ...prefs, accessibility: e.target.value })} placeholder="e.g. step-free routes" /></div>
            </div>
            <div className="field"><label htmlFor="notes">Anything else?</label><textarea id="notes" rows={3} maxLength={1000} value={prefs.notes} onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })} /></div>
            <div className="row between">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={18} aria-hidden="true" /> Back</button>
              <button className="btn" type="submit" disabled={busy}><Sparkles size={18} aria-hidden="true" /> {busy ? "Drafting…" : "Generate itinerary"}</button>
            </div>
          </form>
        )}

        {step === 2 && draft && (
          <section aria-label="Preview">
            <p className="notice">This draft uses <strong>demonstration content</strong>: places and price ranges are illustrative and not verified. Nothing is saved until you confirm. You can edit everything after saving.</p>
            {draft.days.map((d) => (
              <article key={d.id} className="card preview-day">
                <h3><DestinationMotif size={18} /> {formatDay(d.date)} <span className="muted">· {d.title}</span></h3>
                <ul className="preview-list">{d.activities.map((a) => <li key={a.id}><span className="time">{a.startTime}</span><ActivityCategoryIcon category={a.category} /> {a.title}</li>)}</ul>
              </article>
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
