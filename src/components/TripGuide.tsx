"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, CalendarDays, Clock, CloudRain, CloudSun, Copy, Download, ExternalLink, Lightbulb, Link2, MapPin, Navigation, Pencil, Plus,
  RefreshCw, Sun, Thermometer, Trash2, Wallet,
} from "lucide-react";
import type { Activity, ItineraryDay, Trip } from "@/domain/schemas";
import { convertEstimate, formatEstimate, sumEstimates } from "@/domain/money";
import { formatDay, formatDuration, relativeTime } from "@/lib/dates";
import { getServices } from "@/services/container";
import { findCatalogDestination } from "@/services/itinerary/catalog";
import type { RefreshReport } from "@/services/refresh";
import { createSnapshot, encodeSnapshot } from "@/services/sharing";
import * as edit from "@/services/editing";
import { DestinationHero, DestinationMotif, ThemedSectionDivider, useDestinationTheme } from "./theme";
import { ActivityCategoryIcon, ActivityThumb, CATEGORY_LABEL, StatusBadge } from "./ui";

type Props = { trip: Trip; readOnly?: boolean; onChange?: (next: Trip, label: string) => void; onRegenerate?: () => void };

function WeatherIcon({ code }: { code: number }) { return code >= 51 ? <CloudRain size={18} aria-hidden="true" /> : code <= 1 ? <Sun size={18} aria-hidden="true" /> : <CloudSun size={18} aria-hidden="true" />; }

function ActivityEditor({ a, onSave, onCancel }: { a: Activity; onSave: (p: edit.ActivityPatch) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(a.title), [notes, setNotes] = useState(a.notes), [time, setTime] = useState(a.startTime ?? ""), [dur, setDur] = useState(a.durationMinutes);
  const [err, setErr] = useState("");
  return (
    <form className="editor" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return setErr("Title is required"); if (dur < 5 || dur > 1440) return setErr("Duration must be 5–1440 minutes"); onSave({ title: title.trim(), notes, startTime: time || undefined, durationMinutes: dur }); }}>
      <div className="field"><label htmlFor={`t-${a.id}`}>Title</label><input id={`t-${a.id}`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
      <div className="grid2">
        <div className="field"><label htmlFor={`s-${a.id}`}>Start time</label><input id={`s-${a.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor={`d-${a.id}`}>Duration (min)</label><input id={`d-${a.id}`} type="number" min={5} max={1440} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></div>
      </div>
      <div className="field"><label htmlFor={`n-${a.id}`}>Your notes</label><textarea id={`n-${a.id}`} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row end"><button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>Cancel</button><button className="btn btn-small">Save</button></div>
    </form>
  );
}

function AddActivity({ onAdd }: { onAdd: (v: { title: string; startTime?: string; durationMinutes: number }) => void }) {
  const [open, setOpen] = useState(false), [title, setTitle] = useState(""), [time, setTime] = useState(""), [dur, setDur] = useState(60);
  if (!open) return <button className="btn btn-ghost btn-small add-btn" onClick={() => setOpen(true)}><Plus size={16} aria-hidden="true" /> Add your own activity</button>;
  return (
    <form className="editor card" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; onAdd({ title: title.trim(), startTime: time || undefined, durationMinutes: dur }); setTitle(""); setTime(""); setOpen(false); }}>
      <div className="field"><label htmlFor="new-title">What are you planning?</label><input id="new-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus required /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="new-time">Start time</label><input id="new-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor="new-dur">Duration (min)</label><input id="new-dur" type="number" min={5} max={1440} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></div>
      </div>
      <div className="row end"><button type="button" className="btn btn-ghost btn-small" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-small">Add</button></div>
    </form>
  );
}

export function TripGuide({ trip, readOnly, onChange, onRegenerate }: Props) {
  const theme = useDestinationTheme();
  const services = getServices();
  const [report, setReport] = useState<RefreshReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(trip.days[0]?.id);
  const [includeAcc, setIncludeAcc] = useState(false);
  const [copied, setCopied] = useState("");
  const catalog = trip.destination.catalogKey ? findCatalogDestination(trip.destination.catalogKey) : undefined;

  async function refresh() {
    setRefreshing(true);
    try { setReport(await services.refresh.refresh(trip)); } finally { setRefreshing(false); }
  }
  // Refresh factual data when the guide opens. Never touches the itinerary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [trip.id]);

  const weatherByDate = useMemo(() => new Map((report?.weather.data ?? []).map((w) => [w.date, w])), [report]);
  const local = trip.destination.localCurrency;
  const total = local ? sumEstimates(trip.days.flatMap((d) => d.activities.map((a) => a.cost).filter((c): c is NonNullable<typeof c> => !!c)), local) : null;
  const rate = report?.rate?.data ? { value: report.rate.data.value, status: (report.rate.status === "live" ? "live" : "cached") as "live" | "cached", asOf: report.rate.data.asOf } : null;
  const conv = (c: NonNullable<Activity["cost"]>) => { const r = convertEstimate(c, trip.nativeCurrency, rate); return r.kind === "converted" ? r.text : null; };
  const points = trip.days.flatMap((d) => d.activities).filter((a) => a.location).map((a) => a.location!);
  const mapUrl = services.directions.embedUrl(points);
  const activeDayObj = trip.days.find((d) => d.id === activeDay) ?? trip.days[0];
  const dayPoints = activeDayObj?.activities.filter((a) => a.location) ?? [];

  const apply = (next: Trip, label: string) => onChange?.(next, label);

  async function copy(text: string, which: string) {
    try { await navigator.clipboard.writeText(text); setCopied(which); } catch { setCopied(which + "-fail"); }
    setTimeout(() => setCopied(""), 2500);
  }
  const localUrl = typeof window !== "undefined" ? `${window.location.origin}/trip/${trip.id}` : "";
  const snapshotUrl = () => `${window.location.origin}/shared#${encodeSnapshot(createSnapshot(trip, { includeAccommodation: includeAcc }))}`;
  function download() {
    const blob = new Blob([JSON.stringify(createSnapshot(trip, { includeAccommodation: includeAcc }), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `planet-${trip.destination.name.toLowerCase().replace(/\W+/g, "-")}-${trip.arrivalDate}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  const renderActivity = (day: ItineraryDay, a: Activity, idx: number) => {
    const sugg = report?.suggestions.find((s) => s.activityId === a.id);
    const swapTitle = sugg?.swapWithActivityId && trip.days.flatMap((d) => d.activities).find((x) => x.id === sugg.swapWithActivityId)?.title;
    return (
      <li key={a.id} className="activity">
        <div className="activity-time"><span>{a.startTime ?? "—"}</span><small>{formatDuration(a.durationMinutes)}</small></div>
        <article className="activity-card">
          <ActivityThumb category={a.category} imageRef={a.imageRef} alt={a.title} />
          <div className="activity-body">
            <p className="badge-row">
              <span className="cat-badge"><ActivityCategoryIcon category={a.category} size={14} /> {CATEGORY_LABEL[a.category]}</span>
              {a.origin !== "generated" ? <StatusBadge status="user" /> : <StatusBadge status={a.meta.status} />}
              {a.indoor && <span className="tag">Indoors</span>}
            </p>
            {editing === a.id && !readOnly ? (
              <ActivityEditor a={a} onCancel={() => setEditing(null)} onSave={(p) => { apply(edit.updateActivity(trip, day.id, a.id, p), `Edited “${p.title}”`); setEditing(null); }} />
            ) : (
              <>
                <h4>{a.title}</h4>
                {a.description && <p className="desc">{a.description}</p>}
                {a.notes && <p className="notes"><Pencil size={14} aria-hidden="true" /> {a.notes}</p>}
                <ul className="facts">
                  <li><Clock size={14} aria-hidden="true" /> {a.startTime ? `${a.startTime} · ` : ""}{formatDuration(a.durationMinutes)}</li>
                  {a.cost ? <li><Wallet size={14} aria-hidden="true" /> {formatEstimate(a.cost)}{conv(a.cost) ? <span className="muted"> ({conv(a.cost)})</span> : null} <span className="muted">illustrative</span></li>
                    : a.origin === "generated" ? <li className="muted"><Wallet size={14} aria-hidden="true" /> Cost unknown</li> : null}
                  {a.location && <li><a href={services.directions.directionsUrl(a.location, trip.accommodation ? `${trip.accommodation}, ${trip.destination.name}` : undefined)} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Directions<span className="sr-only"> to {a.title} (opens Google Maps)</span></a></li>}
                </ul>
                {sugg && !readOnly && (
                  <div className="suggest" role="note"><CloudRain size={16} aria-hidden="true" /> {sugg.reason}{swapTitle ? <> Swap with <strong>{swapTitle}</strong>?</> : null}
                    {sugg.swapWithActivityId && <button className="btn btn-small btn-ghost" onClick={() => apply(edit.swapActivities(trip, a.id, sugg.swapWithActivityId!), `Swapped “${a.title}” for “${swapTitle}”`)}>Swap</button>}
                  </div>
                )}
              </>
            )}
          </div>
          {!readOnly && editing !== a.id && (
            <div className="activity-tools" role="group" aria-label={`Actions for ${a.title}`}>
              <button className="icon-btn" onClick={() => setEditing(a.id)} aria-label={`Edit ${a.title}`} title="Edit"><Pencil size={16} /></button>
              <button className="icon-btn" onClick={() => apply(edit.reorderActivity(trip, day.id, a.id, -1), `Moved “${a.title}” up`)} disabled={idx === 0} aria-label={`Move ${a.title} earlier`} title="Move up"><ArrowUp size={16} /></button>
              <button className="icon-btn" onClick={() => apply(edit.reorderActivity(trip, day.id, a.id, 1), `Moved “${a.title}” down`)} disabled={idx === day.activities.length - 1} aria-label={`Move ${a.title} later`} title="Move down"><ArrowDown size={16} /></button>
              {trip.days.length > 1 && (
                <select className="move-select" aria-label={`Move ${a.title} to another day`} value="" onChange={(e) => e.target.value && apply(edit.moveActivity(trip, day.id, a.id, e.target.value), `Moved “${a.title}” to ${formatDay(trip.days.find((d) => d.id === e.target.value)!.date, { weekday: "long" })}`)}>
                  <option value="">Move to…</option>
                  {trip.days.filter((d) => d.id !== day.id).map((d) => <option key={d.id} value={d.id}>{formatDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</option>)}
                </select>
              )}
              <button className="icon-btn danger" onClick={() => apply(edit.removeActivity(trip, day.id, a.id), `Removed “${a.title}”`)} aria-label={`Remove ${a.title}`} title="Remove"><Trash2 size={16} /></button>
            </div>
          )}
        </article>
      </li>
    );
  };

  return (
    <div className="guide">
      <DestinationHero eyebrow={`${trip.destination.country ? trip.destination.country + " · " : ""}${theme.tagline}`} title={trip.destination.name}>
        <p className="lede">{catalog?.intro ?? `Your personalised guide to ${trip.destination.name}. This destination uses Planet's general template — swap in your own finds as you go.`}</p>
        <ul className="hero-facts">
          <li><CalendarDays size={16} aria-hidden="true" /> {formatDay(trip.arrivalDate, { day: "numeric", month: "short" })} – {formatDay(trip.departureDate, { day: "numeric", month: "short", year: "numeric" })} · {trip.days.length} day{trip.days.length > 1 ? "s" : ""}</li>
          {trip.accommodation && <li><MapPin size={16} aria-hidden="true" /> Staying in {trip.accommodation}</li>}
          {total && <li><Wallet size={16} aria-hidden="true" /> {formatEstimate(total)} in activities &amp; meals per person (illustrative)</li>}
        </ul>
      </DestinationHero>

      <section className="panel weather" aria-labelledby="wx-h">
        <div className="panel-head">
          <h2 id="wx-h"><Thermometer size={18} aria-hidden="true" /> Weather</h2>
          <div className="row">
            {report ? <StatusBadge status={report.weather.status} at={report.weather.retrievedAt} stale={report.weather.stale} /> : <span className="status">Loading…</span>}
            <button className="btn btn-ghost btn-small" onClick={refresh} disabled={refreshing} aria-label="Refresh weather and exchange rates"><RefreshCw size={14} aria-hidden="true" className={refreshing ? "spin" : ""} /> {refreshing ? "Updating…" : "Update"}</button>
          </div>
        </div>
        {report?.weather.data?.length ? (
          <ul className="wx-strip">{report.weather.data.map((w) => <li key={w.date}><span>{formatDay(w.date, { weekday: "short", day: "numeric" })}</span><WeatherIcon code={w.code} /><strong>{Math.round(w.tempMaxC)}°</strong><small>{Math.round(w.tempMinC)}° · {w.summary}{w.precipitationChance != null ? ` · ${w.precipitationChance}%` : ""}</small></li>)}</ul>
        ) : report ? <p className="muted">No forecast available{report.weather.error ? ` — ${report.weather.error}` : ""}. {report.weather.source}</p> : <p className="muted">Fetching forecast…</p>}
        <p className="source">Source: {report?.weather.source ?? "—"}{report?.rate ? <> · Currency: {report.rate.data ? `1 ${report.rate.data.from} = ${report.rate.data.value.toFixed(report.rate.data.value < 1 ? 4 : 2)} ${report.rate.data.to} (${report.rate.status}, ${report.rate.data.asOf})` : `conversion unavailable (${report.rate.error ?? report.rate.source})`}</> : null}</p>
        {!!report?.suggestions.length && !readOnly && <p className="notice notice-warn"><CloudRain size={16} aria-hidden="true" /> Rain may affect {report.suggestions.length} outdoor plan(s). Suggestions are shown on those activities — nothing has been changed.</p>}
      </section>

      <nav className="day-nav" aria-label="Days">
        {trip.days.map((d, i) => (
          <a key={d.id} href={`#day-${d.id}`} className={d.id === activeDay ? "on" : ""} onClick={() => setActiveDay(d.id)}>
            <span className="day-nav-motif"><DestinationMotif size={14} /></span>Day {i + 1}<small>{formatDay(d.date, { weekday: "short", day: "numeric" })}</small>
          </a>
        ))}
      </nav>

      {trip.days.map((day, i) => {
        const w = weatherByDate.get(day.date);
        return (
          <section key={day.id} id={`day-${day.id}`} className="day" aria-labelledby={`h-${day.id}`}>
            <header className="day-head">
              <span className="day-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="eyebrow">{formatDay(day.date)}{w ? <> · <WeatherIcon code={w.code} /> {Math.round(w.tempMaxC)}° {w.summary}</> : null}</p>
                <h3 id={`h-${day.id}`}>{day.title || `Day ${i + 1}`}</h3>
              </div>
              <span className="day-motif"><DestinationMotif size={34} /></span>
            </header>
            {day.activities.length === 0 ? (
              <div className="empty small"><DestinationMotif size={28} /><p>A free day. Wander, rest, or add something below.</p></div>
            ) : <ol className="activities">{day.activities.map((a, idx) => renderActivity(day, a, idx))}</ol>}
            {!readOnly && <AddActivity onAdd={(v) => apply(edit.addActivity(trip, day.id, v), `Added “${v.title}”`)} />}
          </section>
        );
      })}

      <ThemedSectionDivider label="Map & directions" />
      <section className="panel" aria-label="Map">
        <div className="row tabs" role="group" aria-label="Map day">
          {trip.days.map((d, i) => <button key={d.id} className={`chip ${d.id === activeDayObj?.id ? "on" : ""}`} aria-pressed={d.id === activeDayObj?.id} onClick={() => setActiveDay(d.id)}>Day {i + 1}</button>)}
        </div>
        {mapUrl ? (
          <>
            <iframe className="map" title={`Map of ${trip.destination.name}`} src={services.directions.embedUrl(dayPoints.length ? dayPoints.map((a) => a.location!) : points) ?? mapUrl} loading="lazy" />
            <p className="source">Map © OpenStreetMap contributors. Pins are approximate demo-catalogue positions; no route times or distances are calculated.</p>
          </>
        ) : <div className="empty small"><MapPin size={24} aria-hidden="true" /><p>No coordinates for these activities yet. Use the search links below to find them in your maps app.</p></div>}
        <ol className="stops">
          {(activeDayObj?.activities ?? []).map((a, i) => (
            <li key={a.id}><span className="stop-n">{i + 1}</span> {a.title}
              {a.location ? <a href={services.directions.directionsUrl(a.location)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Open in Maps<span className="sr-only"> for {a.title}</span></a>
                : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.title}, ${trip.destination.name}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Search in Maps</a>}
            </li>
          ))}
        </ol>
      </section>

      <ThemedSectionDivider label="Good to know" />
      <section className="panel tips" aria-label="Travel tips">
        <ul>{(catalog?.tips ?? ["Check official sites for opening hours and prices before you go.", "Keep a photo of your passport and booking confirmations offline.", "Learn a few words of the local language — it goes a long way."]).map((t) => <li key={t}><Lightbulb size={16} aria-hidden="true" /> {t}</li>)}</ul>
        <p className="source">Tips from the Planet demo catalogue · general guidance, not live information.</p>
      </section>

      {!readOnly && (
        <>
          <ThemedSectionDivider label="Share & keep" />
          <section className="panel share" aria-label="Sharing">
            <div className="share-col">
              <h3><Link2 size={16} aria-hidden="true" /> Local guide link</h3>
              <p className="muted">Reopens this trip <strong>in this browser on this device only</strong>. Sending it to someone else won&apos;t show them anything.</p>
              <button className="btn btn-ghost btn-small" onClick={() => copy(localUrl, "local")}><Copy size={14} aria-hidden="true" /> {copied === "local" ? "Copied!" : "Copy local link"}</button>
            </div>
            <div className="share-col">
              <h3><ExternalLink size={16} aria-hidden="true" /> Portable read-only link</h3>
              <p className="muted">Packs a snapshot of the itinerary into the link itself, so it works anywhere. Later edits aren&apos;t included — share again after changes. Your notes are removed.</p>
              <label className="check"><input type="checkbox" checked={includeAcc} onChange={(e) => setIncludeAcc(e.target.checked)} /> Include where I&apos;m staying</label>
              <div className="row">
                <button className="btn btn-small" onClick={() => copy(snapshotUrl(), "snap")}><Copy size={14} aria-hidden="true" /> {copied === "snap" ? "Copied!" : "Copy portable link"}</button>
                <button className="btn btn-ghost btn-small" onClick={download}><Download size={14} aria-hidden="true" /> Export file</button>
              </div>
              {copied.endsWith("-fail") && <p className="err">Couldn&apos;t access the clipboard — try Export file instead.</p>}
            </div>
          </section>
          <section className="panel row between" aria-label="Revise">
            <p className="muted">Want a fresh take? Regenerating keeps anything you&apos;ve added or edited.</p>
            {onRegenerate && <button className="btn btn-ghost" onClick={onRegenerate}><RefreshCw size={16} aria-hidden="true" /> Regenerate itinerary</button>}
          </section>
          <p className="source">Last edited {relativeTime(trip.updatedAt)} · generated by {trip.generator}</p>
        </>
      )}
    </div>
  );
}
