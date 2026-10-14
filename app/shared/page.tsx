"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { DestinationThemeProvider } from "@/components/theme";
import { TripGuide } from "@/components/TripGuide";
import { parseSnapshot, type Snapshot } from "@/services/sharing";

export default function SharedPage() {
  const [state, setState] = useState<{ snap?: Snapshot; error?: string } | null>(null);
  useEffect(() => {
    const data = window.location.hash.slice(1);
    if (!data) return setState({ error: "This link doesn't contain a trip snapshot." });
    const r = parseSnapshot(data);
    setState(r.ok ? { snap: r.snapshot } : { error: r.error });
  }, []);

  if (!state) return <div className="page"><p className="muted">Reading shared guide…</p></div>;
  if (state.error || !state.snap) return <div className="page narrow"><div className="card"><h1>Can&apos;t open this shared guide</h1><p className="err">{state.error}</p><Link href="/" className="btn">Go home</Link></div></div>;
  return (
    <DestinationThemeProvider destination={state.snap.trip.destination}>
      <div className="page">
        <p className="notice"><Eye size={18} aria-hidden="true" /> <span>You&apos;re viewing a <strong>read-only snapshot</strong> shared on {new Date(state.snap.createdAt).toLocaleDateString("en-GB")}. It won&apos;t update if the owner edits their trip.</span></p>
        <TripGuide trip={state.snap.trip} readOnly />
      </div>
    </DestinationThemeProvider>
  );
}
