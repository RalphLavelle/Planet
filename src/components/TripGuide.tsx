"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronsDownUp, ChevronsUpDown, Droplets, Map as MapIcon, Share2, Sparkles, ListOrdered, CloudRain, CloudSun, Copy, ExternalLink, Lightbulb, Link2, MapPin,
  PlaneLanding, PlaneTakeoff, RefreshCw, Sun, Thermometer, Wallet,
} from "lucide-react";
import type { Activity, ItineraryDay, Trip } from "@/domain/schemas";
import { convertEstimate, formatEstimate, sumEstimates } from "@/domain/money";
import { formatDay, relativeTime } from "@/lib/dates";
import { getServices } from "@/services/container";
import { findCatalogDestination } from "@/services/itinerary/catalog";
import type { RefreshReport } from "@/services/refresh";
import { createSnapshot, encodeSnapshot } from "@/services/sharing";
import * as edit from "@/services/editing";
import { DestinationHero, DestinationMotif, OrnamentRow, ThemeBullet, useDestinationTheme } from "./theme";
import { tripHeroImage } from "@/services/images";
import { ActivityRow } from "./ActivityRow";
import { FlightCard } from "./FlightCard";
import { Collapsible } from "./Collapsible";
import { DayHeader, dayBannerPhotos } from "./DayHeader";
import { displayDayTitle } from "@/domain/dayTitles";
import { AddItem } from "./AddItem";
import { copy as words } from "@/lib/storageCopy";
import type { GeoPoint } from "@/domain/schemas";
import { ActivityCategoryIcon, PhotoCredit, StatusBadge } from "./ui";

type Props = { trip: Trip; readOnly?: boolean; onChange?: (next: Trip, label: string) => void; onRegenerate?: () => void };

function WeatherIcon({ code }: { code: number }) { return code >= 51 ? <CloudRain size={18} aria-hidden="true" /> : code <= 1 ? <Sun size={18} aria-hidden="true" /> : <CloudSun size={18} aria-hidden="true" />; }

export function TripGuide({ trip, readOnly, onChange, onRegenerate }: Props) {
  const theme = useDestinationTheme();
  const services = getServices();
  const [report, setReport] = useState<RefreshReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(trip.days[0]?.id);
  const [includeAcc, setIncludeAcc] = useState(false);
  const [includeFlights, setIncludeFlights] = useState(false);
  const [flightsChanged, setFlightsChanged] = useState(false);
  const [base, setBase] = useState<GeoPoint | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>(() => trip.days.slice(1).map((d) => d.id)); // first day open by default
  useEffect(() => {
    let live = true;
    services.uiPrefs.hasCollapsedDays(trip.id).then(async (has) => { const ids = has ? await services.uiPrefs.getCollapsedDays(trip.id) : trip.days.slice(1).map((d) => d.id); if (live) setCollapsed(ids); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);
  const isCollapsed = (id: string) => collapsed.includes(id);
  const persistCollapsed = (ids: string[]) => { setCollapsed(ids); services.uiPrefs.setCollapsedDays(trip.id, ids); };
  const toggleDay = (id: string) => persistCollapsed(isCollapsed(id) ? collapsed.filter((x) => x !== id) : [...collapsed, id]);
  const setCollapsedAll = (all: boolean) => persistCollapsed(all ? trip.days.map((d) => d.id) : []);
  useEffect(() => {
    let live = true;
    if (!trip.accommodation) { setBase(null); return; }
    services.geocoder.geocode(`${trip.accommodation}, ${trip.destination.name}${trip.destination.country ? ", " + trip.destination.country : ""}`).then((p) => live && setBase(p));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.accommodation, trip.destination.name]);
  const [copied, setCopied] = useState("");
  const banners = dayBannerPhotos(trip.days);
  const heroPhoto = tripHeroImage(trip.destination);
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
  const flightPanel = (kind: "arrival" | "departure") => {
    const flight = trip.flights[kind];
    const card = <FlightCard kind={kind} flight={flight} readOnly={readOnly} onSave={(f) => { apply(edit.updateFlights(trip, { ...trip.flights, [kind]: f }), `Updated ${kind} flight`); setFlightsChanged(true); }} />;
    if (!(flight?.number || flight?.time)) return card;
    const Icon = kind === "arrival" ? PlaneLanding : PlaneTakeoff;
    const summary = [flight.number, flight.time ? `${kind === "arrival" ? "lands" : "departs"} ${flight.time}` : ""].filter(Boolean).join(" · ");
    return <Collapsible id={`flight-${kind}`} scope={trip.id} level={3} className="flight-collapsible" icon={<Icon size={20} />} title={kind === "arrival" ? "Arrival flight" : "Departure flight"} summary={summary}>{card}</Collapsible>;
  };

  async function copy(text: string, which: string) {
    try { await navigator.clipboard.writeText(text); setCopied(which); } catch { setCopied(which + "-fail"); }
    setTimeout(() => setCopied(""), 2500);
  }
  const localUrl = typeof window !== "undefined" ? `${window.location.origin}/trip/?id=${trip.id}` : "";
  const snapshotUrl = () => `${window.location.origin}/shared#${encodeSnapshot(createSnapshot(trip, { includeAccommodation: includeAcc, includeFlights }))}`;

  const renderActivity = (day: ItineraryDay, a: Activity) => {
    const sugg = report?.suggestions.find((s) => s.activityId === a.id);
    const swapTitle = sugg?.swapWithActivityId ? trip.days.flatMap((d) => d.activities).find((x) => x.id === sugg.swapWithActivityId)?.title : undefined;
    return <ActivityRow key={a.id} trip={trip} dayId={day.id} activity={a} readOnly={readOnly} editing={editing === a.id} onEditing={(o) => setEditing(o ? a.id : null)}
      onChange={apply} base={base} conv={conv} suggestion={sugg} swapTitle={swapTitle} />;
  };

  return (
    <div className="guide">
      <DestinationHero eyebrow={`${trip.destination.country ? trip.destination.country + " · " : ""}${theme.tagline}`} title={trip.destination.name}
        photo={heroPhoto ? <figure className="hero-photo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={heroPhoto.src} alt={`${trip.destination.name}`} /><PhotoCredit credit={heroPhoto} /></figure> : undefined}>
        <p className="lede">{catalog?.intro ?? (trip.generator === "osm-discovery-v1" ? `Your personalised guide to ${trip.destination.name}, built from real places mapped on OpenStreetMap and described on Wikipedia. Prices and opening hours aren't known unless listed — check before you go.` : `Your personalised guide to ${trip.destination.name}. This destination uses Planet's general template — swap in your own finds as you go.`)}</p>
        <ul className="hero-facts">
          <li><CalendarDays size={16} aria-hidden="true" /> {formatDay(trip.arrivalDate, { day: "numeric", month: "short" })} – {formatDay(trip.departureDate, { day: "numeric", month: "short", year: "numeric" })} · {trip.days.length} day{trip.days.length > 1 ? "s" : ""}</li>
          {trip.accommodation && <li><MapPin size={16} aria-hidden="true" /> Staying in {trip.accommodation}</li>}
          {total && <li><Wallet size={16} aria-hidden="true" /> {formatEstimate(total)} in activities &amp; meals per person (illustrative)</li>}
        </ul>
        <OrnamentRow />
      </DestinationHero>

      <Collapsible id="weather" scope={trip.id} icon={<Thermometer size={20} />} title="Weather & currency"
        summary={report?.weather.data?.length ? `${report.weather.data.length}-day forecast${report.rate?.data ? ` · 1 ${report.rate.data.from} = ${report.rate.data.value.toFixed(report.rate.data.value < 1 ? 4 : 2)} ${report.rate.data.to}` : ""}` : report ? "No forecast available" : "Fetching forecast…"}>
        <div className="weather">
        <div className="panel-head">
          <div className="row">
            {report ? <StatusBadge status={report.weather.status} at={report.weather.retrievedAt} stale={report.weather.stale} /> : <span className="status">Loading…</span>}
            <button className="btn btn-ghost btn-small" onClick={refresh} disabled={refreshing} aria-label="Refresh weather and exchange rates"><RefreshCw size={14} aria-hidden="true" className={refreshing ? "spin" : ""} /> {refreshing ? "Updating…" : "Update"}</button>
          </div>
        </div>
        {report?.weather.data?.length ? (
          <ul className="wx-strip">{report.weather.data.map((w) => <li key={w.date}><span>{formatDay(w.date, { weekday: "short", day: "numeric" })}</span><WeatherIcon code={w.code} /><strong>{Math.round(w.tempMaxC)}°</strong><small>{Math.round(w.tempMinC)}° · {w.summary}</small>{w.precipitationChance != null && <small><Droplets size={11} aria-hidden="true" /> {w.precipitationChance}%</small>}</li>)}</ul>
        ) : report ? <p className="muted">No forecast available{report.weather.error ? ` — ${report.weather.error}` : ""}. {report.weather.source}</p> : <p className="muted">Fetching forecast…</p>}
        <p className="source">Source: {report?.weather.source ?? "—"}{report?.rate ? <> · Currency: {report.rate.data ? `1 ${report.rate.data.from} = ${report.rate.data.value.toFixed(report.rate.data.value < 1 ? 4 : 2)} ${report.rate.data.to} (${report.rate.status}, ${report.rate.data.asOf})` : `conversion unavailable (${report.rate.error ?? report.rate.source})`}</> : null}</p>
        {!!report?.suggestions.length && !readOnly && <p className="notice notice-warn"><CloudRain size={16} aria-hidden="true" /> Rain may affect {report.suggestions.length} outdoor plan(s). Suggestions are shown on those activities — nothing has been changed.</p>}
        </div>
      </Collapsible>

      <nav className="day-nav" aria-label="Days">
        {trip.days.map((d, i) => (
          <a key={d.id} href={`#day-${d.id}`} className={d.id === activeDay ? "on" : ""} onClick={() => { setActiveDay(d.id); if (isCollapsed(d.id)) toggleDay(d.id); }}>
            <span className="day-nav-motif"><DestinationMotif size={14} /></span><span className="day-nav-title"><CalendarDays size={13} aria-hidden="true" /> Day {i + 1}</span><small>{formatDay(d.date, { weekday: "short", day: "numeric" })}</small>
          </a>
        ))}
      </nav>
      <div className="row between day-controls">
        <p className="muted small-print"><DestinationMotif size={14} /> {trip.days.length} days · {trip.days.reduce((n, d) => n + d.activities.length, 0)} stops</p>
        <div className="row">
          <button className="btn btn-ghost btn-small" onClick={() => setCollapsedAll(false)} disabled={collapsed.length === 0}><ChevronsUpDown size={14} aria-hidden="true" /> Expand all</button>
          <button className="btn btn-ghost btn-small" onClick={() => setCollapsedAll(true)} disabled={collapsed.length === trip.days.length}><ChevronsDownUp size={14} aria-hidden="true" /> Collapse all</button>
        </div>
      </div>

      {trip.days.map((day, i) => {
        const w = weatherByDate.get(day.date);
        return (
          <section key={day.id} id={`day-${day.id}`} className={`day${isCollapsed(day.id) ? " collapsed" : ""}`} aria-labelledby={`h-${day.id}`}>
            <DayHeader day={day} index={i} photo={banners[i]} title={displayDayTitle(trip, i)} collapsed={isCollapsed(day.id)} readOnly={readOnly}
              weather={w ? <> · <WeatherIcon code={w.code} /> {Math.round(w.tempMaxC)}° {w.summary}</> : null}
              onToggle={() => toggleDay(day.id)}
              onRename={(t) => apply(edit.renameDay(trip, day.id, t), t.trim() ? `Renamed day ${i + 1}` : `Day ${i + 1} title reset`)}
              onReset={() => apply(edit.resetDayTitle(trip, day.id), `Day ${i + 1} title reset to automatic`)} />
            <div id={`day-body-${day.id}`} className="day-body" hidden={isCollapsed(day.id)}>
            {i === 0 && flightPanel("arrival")}
            {i === 0 && flightsChanged && !readOnly && <p className="notice notice-warn">Flight times changed. Your plans haven&apos;t been moved. {onRegenerate && <button className="btn btn-small btn-ghost" onClick={() => { setFlightsChanged(false); onRegenerate(); }}>Refit itinerary to flights</button>}</p>}
            {day.activities.length === 0 ? (
              <div className="empty small"><DestinationMotif size={28} /><p>A free day. Wander, rest, or add something below.</p></div>
            ) : <ol className="activities">{day.activities.map((a) => renderActivity(day, a))}</ol>}
            {i === trip.days.length - 1 && flightPanel("departure")}
            {!readOnly && <AddItem dayId={day.id} cityName={trip.destination.name} center={trip.destination.location} base={base} onAdd={(v) => v.kind === "activity" ? apply(edit.addActivity(trip, day.id, v), `Added “${v.title}”`) : apply(edit.addMeal(trip, day.id, v), `Added ${v.meal} at “${v.venue.name}”`)} />}
            </div>
          </section>
        );
      })}

      <Collapsible id="map" scope={trip.id} icon={<MapIcon size={20} />} title="Map & directions" summary={`${points.length} pinned stop${points.length === 1 ? "" : "s"} · open in Maps`}>
        <div className="map-panel">
        <div className="map-header" aria-hidden="true"><theme.HeroArt /></div>
        <div className="row tabs" role="group" aria-label="Map day">
          {trip.days.map((d, i) => <button key={d.id} className={`chip ${d.id === activeDayObj?.id ? "on" : ""}`} aria-pressed={d.id === activeDayObj?.id} onClick={() => setActiveDay(d.id)}>Day {i + 1}</button>)}
        </div>
        {mapUrl ? (
          <>
            <iframe className="map" title={`Map of ${trip.destination.name}`} src={services.directions.embedUrl(dayPoints.length ? dayPoints.map((a) => a.location!) : points) ?? mapUrl} loading="lazy" />
            <p className="source">Map © OpenStreetMap contributors. {trip.generator === "osm-discovery-v1" ? "Pins are OpenStreetMap positions" : "Pins are approximate demo-catalogue positions"}; no route times are calculated.</p>
          </>
        ) : <div className="empty small"><MapPin size={24} aria-hidden="true" /><p>No coordinates for these activities yet. Use the search links below to find them in your maps app.</p></div>}
        <h3 className="panel-sub"><ListOrdered size={16} aria-hidden="true" /> Stops for this day</h3>
        <ol className="stops">
          {(activeDayObj?.activities ?? []).map((a, i) => (
            <li key={a.id}><span className="stop-n">{i + 1}</span><ActivityCategoryIcon category={a.category} size={15} /> {a.title}
              {a.location ? <a href={services.directions.directionsUrl(a.location)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Open in Maps<span className="sr-only"> for {a.title}</span></a>
                : <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.title}, ${trip.destination.name}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Search in Maps</a>}
            </li>
          ))}
        </ol>
        </div>
      </Collapsible>

      <Collapsible id="tips" scope={trip.id} icon={<Lightbulb size={20} />} title="Good to know" summary="Local tips">
        <div className="tips">
        <ul>{(catalog?.tips ?? ["Check official sites for opening hours and prices before you go.", "Keep a photo of your passport and booking confirmations offline.", "Learn a few words of the local language — it goes a long way."]).map((t) => <li key={t}><ThemeBullet size={16} /> {t}</li>)}</ul>
        <p className="source">Tips from the Planet demo catalogue · general guidance, not live information.</p>
        </div>
      </Collapsible>

      {!readOnly && (
        <>
          <Collapsible id="share" scope={trip.id} icon={<Share2 size={20} />} title="Share & keep" summary="Links and regenerate">
            <div className="share">
            <div className="share-col">
              <h3><Link2 size={16} aria-hidden="true" /> {words.localLinkTitle}</h3>
              <p className="muted">{words.localLinkBody}</p>
              <button className="btn btn-ghost btn-small" onClick={() => copy(localUrl, "local")}><Copy size={14} aria-hidden="true" /> {copied === "local" ? "Copied!" : words.localLinkButton}</button>
            </div>
            <div className="share-col">
              <h3><ExternalLink size={16} aria-hidden="true" /> Portable read-only link</h3>
              <p className="muted">Packs a snapshot of the itinerary into the link itself, so it works anywhere. Later edits aren&apos;t included — share again after changes. Your notes are removed; accommodation and flights are left out unless you tick them.</p>
              <label className="check"><input type="checkbox" checked={includeAcc} onChange={(e) => setIncludeAcc(e.target.checked)} /> Include where I&apos;m staying</label>
              <label className="check"><input type="checkbox" checked={includeFlights} onChange={(e) => setIncludeFlights(e.target.checked)} /> Include my flight details</label>
              <div className="row">
                <button className="btn btn-small" onClick={() => copy(snapshotUrl(), "snap")}><Copy size={14} aria-hidden="true" /> {copied === "snap" ? "Copied!" : "Copy portable link"}</button>
              </div>
              {copied.endsWith("-fail") && <p className="err">Couldn&apos;t access the clipboard — select and copy the link manually.</p>}
            </div>
            </div>
            <div className="row between revise">
            <p className="muted"><Sparkles size={16} aria-hidden="true" /> Want a fresh take? Regenerating keeps anything you&apos;ve added or edited.</p>
            {onRegenerate && <button className="btn btn-ghost" onClick={onRegenerate}><RefreshCw size={16} aria-hidden="true" /> Regenerate itinerary</button>}
            </div>
          </Collapsible>
          <p className="source">Last edited {relativeTime(trip.updatedAt)} · generated by {trip.generator}</p>
        </>
      )}
    </div>
  );
}
