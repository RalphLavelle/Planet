"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CloudSun, Info, Map, MapPin, PenLine, RotateCcw, Share2, Sparkles, Wand2 } from "lucide-react";
import { destinationImage } from "@/services/images";
import { DestinationThemeProvider } from "@/components/theme";
import { Collapsible } from "@/components/Collapsible";
import { getServices } from "@/services/container";
import { resolveDestination } from "@/services/itinerary/DemoItineraryGenerator";
import type { LoadIssue, TripSummary } from "@/repositories/TripRepository";
import { formatDay } from "@/lib/dates";
import { selectTheme } from "@/themes/registry";
import { backgroundCredit, backgroundSrcSet, pickBackground } from "@/content/cityBackgrounds";

function HomeHero() {
  const bg = pickBackground(0);
  const credit = bg ? backgroundCredit(bg) : null;
  return (
    <header className={`home-hero${bg ? " has-bg" : ""}`}>
      {bg && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="home-hero-img" src={bg.variants[1].src} srcSet={backgroundSrcSet(bg)} sizes="(orientation: portrait) 160vh, 100vw" alt="" width={1600} height={1025} fetchPriority="high" decoding="async" style={{ objectPosition: bg.objectPosition }} /></>}
      <div className="home-hero-inner"><div className="home-hero-col">
        <p className="eyebrow">Personal travel guides</p>
        <h1>Your trip, as a travel magazine written just for you.</h1>
        <ul className="hero-facts"><li><MapPin size={16} aria-hidden="true" /> Any destination</li><li><CloudSun size={16} aria-hidden="true" /> Live weather &amp; exchange rates</li></ul>
        <p className="lede">Tell Planet where you&apos;re going and what you love. It drafts a day-by-day guide with places, maps, costs and weather — then you shape it, keep it and take it with you.</p>
        <div className="row">
          <Link href="/new" className="btn"><Sparkles size={18} aria-hidden="true" /> Plan a new trip</Link>
        </div>
      </div></div>
      {bg && credit && <p className="home-hero-credit">{bg.city} · Photo: {credit.author} · {credit.license} · <Link href="/credits">credits</Link></p>}
    </header>
  );
}

function TripCard({ t }: { t: TripSummary }) {
  const dest = resolveDestination(t.destinationName).destination;
  const theme = selectTheme(dest);
  const photo = destinationImage(dest.catalogKey);
  return (
    <li>
      <Link href={`/trip/?id=${t.id}`} className={`trip-card${photo ? " has-photo" : ""}`} style={{ background: `linear-gradient(135deg, ${theme.tokens.heroFrom}, ${theme.tokens.heroTo})` }}>
        {photo && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="trip-card-img" src={photo.src} alt="" loading="lazy" /></>}
        <span className="trip-card-motif"><theme.Motif size={28} /></span>
        <span className="trip-card-text">
          <strong>{t.destinationName}</strong>
          <span><CalendarDays size={14} aria-hidden="true" /> {formatDay(t.arrivalDate, { day: "numeric", month: "short" })} – {formatDay(t.departureDate, { day: "numeric", month: "short", year: "numeric" })}</span>
          {dest.country && <span><MapPin size={14} aria-hidden="true" /> {dest.country}</span>}
        </span>
        <ArrowRight size={18} aria-hidden="true" className="trip-card-arrow" />
      </Link>
    </li>
  );
}

export default function Home() {
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [issues, setIssues] = useState<LoadIssue[]>([]);
  const [msg, setMsg] = useState("");
  const [synced, setSynced] = useState(false);
  useEffect(() => { setSynced(!!getServices().account); }, []);

  const load = useCallback(async () => {
    const s = getServices();
    setTrips(await s.trips.list());
    setIssues(await s.trips.issues());
  }, []);
  useEffect(() => { load().catch(() => setTrips([])); }, [load]);
  // Signing in/out (or confirming an email) changes which trips this device shows.
  useEffect(() => getServices().account?.onChange((_u, ev) => { if (ev !== "updated") load().catch(() => setTrips([])); }), [load]);

  async function reset() {
    if (!window.confirm(synced ? "Delete ALL your trips, here and in your Planet database (so on every device)? This cannot be undone." : "Delete all trips saved in this browser? This cannot be undone.")) return;
    await getServices().trips.clear();
    await getServices().drafts.clearDraft();
    setMsg(synced ? "All your trips were deleted." : "All local trips were deleted.");
    load();
  }

  return (
    <DestinationThemeProvider>
      <HomeHero />
      <div className="page">
        <Collapsible id="trips" scope="home" defaultOpen icon={<Map size={20} />} title="Your trips" summary={trips === null ? "Loading…" : synced ? `${trips.length} on this device` : `${trips.length} saved in this browser`}>
          {trips === null ? <p className="muted">Loading your trips…</p> : trips.length === 0 ? (
            <div className="empty"><Map size={28} aria-hidden="true" /><p>No trips yet. <Link href="/new">Plan your first trip</Link>.</p></div>
          ) : <ul className="trip-grid">{trips.map((t) => <TripCard key={t.id} t={t} />)}</ul>}
          {issues.length > 0 && <p className="notice notice-warn" role="status">{issues.length} saved record(s) could not be read and were skipped ({issues[0].reason}). Use “Reset” in “Where your trips live” to clear them.</p>}
          {msg && <p className="notice" role="status">{msg}</p>}
        </Collapsible>

        <Collapsible id="how" scope="home" icon={<Wand2 size={20} />} title="How it works" summary="Tell us the basics, review the draft, make it yours">
          <section className="features" aria-label="How it works">
            <div><span className="feature-icon"><PenLine size={22} aria-hidden="true" /></span><h3>1 · Tell us the basics</h3><p>Destination, dates, currency and whatever preferences you care to share.</p></div>
            <div><span className="feature-icon"><Wand2 size={22} aria-hidden="true" /></span><h3>2 · Review the draft</h3><p>A varied, paced itinerary built around your interests — preview before saving.</p></div>
            <div><span className="feature-icon"><Share2 size={22} aria-hidden="true" /></span><h3>3 · Make it yours</h3><p>Edit, reorder, move between days, add your own plans. Everything autosaves.</p></div>
          </section>
        </Collapsible>

        <Collapsible id="storage" scope="home" icon={<Info size={20} />} title="Where your trips live" summary={synced ? "This browser, plus your account when signed in" : "Saved in this browser only"}>
          <aside aria-label="About storage">
            {synced
              ? <p>Trips are saved in this browser and copied to your Planet database. Sign in with your email and password (top right) to open the same trips on your phone and laptop. Without signing in, your trips belong to this browser only and clearing browser data loses access to them. Storage isn&apos;t end-to-end encrypted, so don&apos;t store confidential details. To share a guide, use the portable snapshot link on a trip page.</p>
              : <p>Trips are saved in this browser&apos;s local storage on this device only. Clearing browser data deletes them, they don&apos;t sync to other devices, and storage isn&apos;t encrypted — don&apos;t store confidential details. To share a guide, use the portable snapshot link on a trip page.</p>}
            <div className="row"><button className="btn btn-ghost btn-small" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Reset — delete all trips</button></div>
          </aside>
        </Collapsible>
      </div>
    </DestinationThemeProvider>
  );
}
