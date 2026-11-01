"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check, Trash2, Undo2 } from "lucide-react";
import { DestinationThemeProvider } from "@/components/theme";
import { TripGuide } from "@/components/TripGuide";
import type { Trip } from "@/domain/schemas";
import { getServices } from "@/services/container";
import { mergeRegenerated } from "@/services/editing";
import { copy } from "@/lib/storageCopy";
import { SaveNudge } from "@/components/SaveNudge";

function TripPageInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const created = params.get("created");
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [history, setHistory] = useState<{ trip: Trip; label: string }[]>([]);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(created ? { text: copy.createdToast } : null);
  const seed = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { getServices().trips.get(id).then(setTrip).catch(() => setTrip(null)); }, [id]);
  useEffect(() => { if (toast) { clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 5000); } }, [toast]);

  async function persist(next: Trip, label: string, prev: Trip | null) {
    try {
      const saved = await getServices().trips.save(next);
      setTrip(saved);
      if (prev) setHistory((h) => [...h.slice(-19), { trip: prev, label }]);
      setToast({ text: `${label} · saved` });
    } catch (e) { setToast({ text: e instanceof Error ? e.message : "Save failed", error: true }); }
  }

  async function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    const saved = await getServices().trips.save({ ...last.trip, updatedAt: new Date().toISOString() });
    setTrip(saved);
    setToast({ text: `Undid: ${last.label}` });
  }

  async function regenerate() {
    if (!trip) return;
    const s = getServices();
    const g = await s.generator.generate({ destination: trip.destination.name, arrivalDate: trip.arrivalDate, departureDate: trip.departureDate, nativeCurrency: trip.nativeCurrency, accommodation: trip.accommodation, flights: trip.flights, preferences: trip.preferences }, { seed: seed.current++ });
    persist(mergeRegenerated(trip, g.days), "Regenerated itinerary (your edits kept)", trip);
  }

  async function remove() {
    if (!trip || !window.confirm(copy.deleteConfirm(trip.destination.name))) return;
    await getServices().trips.delete(trip.id);
    router.push("/");
  }

  if (trip === undefined) return <div className="page"><p className="muted loading">Opening your guide…</p></div>;
  if (trip === null) return (
    <div className="page narrow"><div className="card">
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <p>If someone shared this with you, ask them for the <strong>portable read-only link</strong>.</p>
      <Link className="btn" href="/">Back to home</Link>
    </div></div>
  );

  return (
    <DestinationThemeProvider destination={trip.destination}>
      <div className="page">
        {created && <SaveNudge />}
        <TripGuide trip={trip} onChange={(n, l) => persist(n, l, trip)} onRegenerate={regenerate} />
        <section className="panel row between danger-zone" aria-label="Delete">
          <p className="muted">Delete this guide.</p>
          <button className="btn btn-ghost danger" onClick={remove}><Trash2 size={16} aria-hidden="true" /> Delete trip</button>
        </section>
      </div>
      <div className={`toast ${toast ? "show" : ""} ${toast?.error ? "toast-err" : ""}`} role="status" aria-live="polite">
        {toast && <><Check size={16} aria-hidden="true" /> <span>{toast.text}</span>{history.length > 0 && !toast.error && <button className="btn btn-small btn-ghost" onClick={undo}><Undo2 size={14} aria-hidden="true" /> Undo</button>}</>}
      </div>
      {history.length > 0 && !toast && <button className="undo-fab btn btn-small" onClick={undo} aria-label={`Undo: ${history[history.length - 1].label}`}><Undo2 size={14} aria-hidden="true" /> Undo</button>}
    </DestinationThemeProvider>
  );
}

export default function TripPage() { return <Suspense fallback={<div className="page"><p className="muted">Opening your guide…</p></div>}><TripPageInner /></Suspense>; }
