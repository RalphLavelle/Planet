"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CloudSun, Info, Map, MapPin, PenLine, RotateCcw, Share2, Sparkles, Wand2 } from "lucide-react";
import { destinationImage } from "@/services/images";
import { DestinationThemeProvider, ThemedSectionDivider } from "@/components/theme";
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

  const load = useCallback(async () => {
    const s = getServices();
    setTrips(await s.trips.list());
    setIssues(await s.trips.issues());
  }, []);
  useEffect(() => { load().catch(() => setTrips([])); }, [load]);

  async function reset() {
    if (!window.confirm("Delete all trips saved in this browser? This cannot be undone.")) return;
    await getServices().trips.clear();
    await getServices().drafts.clearDraft();
    setMsg("All local trips were deleted.");
    load();
  }

  return (
    <DestinationThemeProvider>
      <HomeHero />
      <div className="page">
        <ThemedSectionDivider label="Your trips" icon={<Map size={20} aria-hidden="true" />} />
        {trips === null ? <p className="muted">Loading your trips…</p> : trips.length === 0 ? (
          <div className="empty"><Map size={28} aria-hidden="true" /><p>No trips yet. <Link href="/new">Plan your first trip</Link>.</p></div>
        ) : <ul className="trip-grid">{trips.map((t) => <TripCard key={t.id} t={t} />)}</ul>}
        {issues.length > 0 && <p className="notice notice-warn" role="status">{issues.length} saved record(s) could not be read and were skipped ({issues[0].reason}). Use “Reset” below to clear them.</p>}
        {msg && <p className="notice" role="status">{msg}</p>}

        <section className="features" aria-label="How it works">
          <div><span className="feature-icon"><PenLine size={22} aria-hidden="true" /></span><h3>1 · Tell us the basics</h3><p>Destination, dates, currency and whatever preferences you care to share.</p></div>
          <div><span className="feature-icon"><Wand2 size={22} aria-hidden="true" /></span><h3>2 · Review the draft</h3><p>A varied, paced itinerary built around your interests — preview before saving.</p></div>
          <div><span className="feature-icon"><Share2 size={22} aria-hidden="true" /></span><h3>3 · Make it yours</h3><p>Edit, reorder, move between days, add your own plans. Everything autosaves.</p></div>
        </section>

        <aside className="notice" aria-label="About storage">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Where your trips live.</strong> Trips are saved in this browser&apos;s local storage on this device only. Clearing browser data deletes them, they don&apos;t sync to other devices, and storage isn&apos;t encrypted — don&apos;t store confidential details. To share a guide, use the portable snapshot link on a trip page.
            <div className="row" style={{ marginTop: 8 }}><button className="btn btn-ghost btn-small" onClick={reset}><RotateCcw size={16} aria-hidden="true" /> Reset — delete all local trips</button></div>
          </div>
        </aside>
      </div>
    </DestinationThemeProvider>
  );
}
