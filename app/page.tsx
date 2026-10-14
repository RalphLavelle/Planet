"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Compass, Info, Map, RotateCcw, Sparkles } from "lucide-react";
import { DestinationHero, DestinationThemeProvider, ThemedSectionDivider } from "@/components/theme";
import { getServices } from "@/services/container";
import { generateTrip } from "@/services/trips";
import { resolveDestination } from "@/services/itinerary/DemoItineraryGenerator";
import type { LoadIssue, TripSummary } from "@/repositories/TripRepository";
import { formatDay } from "@/lib/dates";
import { selectTheme } from "@/themes/registry";

function isoIn(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function TripCard({ t }: { t: TripSummary }) {
  const theme = selectTheme(resolveDestination(t.destinationName).destination);
  return (
    <li>
      <Link href={`/trip/${t.id}`} className="trip-card" style={{ background: `linear-gradient(135deg, ${theme.tokens.heroFrom}, ${theme.tokens.heroTo})` }}>
        <span className="trip-card-motif"><theme.Motif size={28} /></span>
        <strong>{t.destinationName}</strong>
        <span>{formatDay(t.arrivalDate, { day: "numeric", month: "short" })} – {formatDay(t.departureDate, { day: "numeric", month: "short", year: "numeric" })}</span>
        <ArrowRight size={18} aria-hidden="true" className="trip-card-arrow" />
      </Link>
    </li>
  );
}

export default function Home() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [issues, setIssues] = useState<LoadIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const s = getServices();
    setTrips(await s.trips.list());
    setIssues(await s.trips.issues());
  }, []);
  useEffect(() => { load().catch(() => setTrips([])); }, [load]);

  async function demo() {
    setBusy(true);
    const s = getServices();
    const trip = await generateTrip({ destination: "Athens", arrivalDate: isoIn(7), departureDate: isoIn(10), nativeCurrency: "GBP", accommodation: "Koukaki", preferences: { interests: ["history", "food", "architecture"], pace: "balanced" } }, s.generator);
    await s.trips.save(trip);
    router.push(`/trip/${trip.id}`);
  }
  async function reset() {
    if (!window.confirm("Delete all trips saved in this browser? This cannot be undone.")) return;
    await getServices().trips.clear();
    await getServices().drafts.clearDraft();
    setMsg("All local trips were deleted.");
    load();
  }

  return (
    <DestinationThemeProvider>
      <div className="page">
        <DestinationHero eyebrow="Personal travel guides" title="Your trip, as a travel magazine written just for you.">
          <p className="lede">Tell Planet where you&apos;re going and what you love. It drafts a day-by-day guide with places, maps, costs and weather — then you shape it, keep it and take it with you.</p>
          <div className="row">
            <Link href="/new" className="btn"><Sparkles size={18} aria-hidden="true" /> Plan a new trip</Link>
            <button className="btn btn-ghost" onClick={demo} disabled={busy}><Compass size={18} aria-hidden="true" /> {busy ? "Creating…" : "Try the Athens demo"}</button>
          </div>
        </DestinationHero>

        <ThemedSectionDivider label="Your trips" />
        {trips === null ? <p className="muted">Loading your trips…</p> : trips.length === 0 ? (
          <div className="empty"><Map size={28} aria-hidden="true" /><p>No trips yet. Plan one, try the Athens demo, or <Link href="/import">import a shared snapshot</Link>.</p></div>
        ) : <ul className="trip-grid">{trips.map((t) => <TripCard key={t.id} t={t} />)}</ul>}
        {issues.length > 0 && <p className="notice notice-warn" role="status">{issues.length} saved record(s) could not be read and were skipped ({issues[0].reason}). Use “Reset” below to clear them.</p>}
        {msg && <p className="notice" role="status">{msg}</p>}

        <section className="features" aria-label="How it works">
          <div><h3>1 · Tell us the basics</h3><p>Destination, dates, currency and whatever preferences you care to share.</p></div>
          <div><h3>2 · Review the draft</h3><p>A varied, paced itinerary built around your interests — preview before saving.</p></div>
          <div><h3>3 · Make it yours</h3><p>Edit, reorder, move between days, add your own plans. Everything autosaves.</p></div>
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
