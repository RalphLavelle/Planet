"use client";
import { useState } from "react";
import { Clock, Pencil, PlaneLanding, PlaneTakeoff, Plus, Timer } from "lucide-react";
import { ARRIVAL_BUFFER_MIN, DEPARTURE_BUFFER_MIN, FlightSchema, type Flight } from "@/domain/schemas";
import { addMinutes, formatDuration } from "@/lib/dates";
import { DestinationMotif } from "./theme";

function subMinutes(t: string, m: number) { const [h, mm] = t.split(":").map(Number); const v = Math.max(0, h * 60 + mm - m); return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; }

export function FlightCard({ kind, flight, readOnly, onSave }: { kind: "arrival" | "departure"; flight?: Flight; readOnly?: boolean; onSave?: (f: Flight | undefined) => void }) {
  const [editing, setEditing] = useState(false);
  const [num, setNum] = useState(flight?.number ?? ""), [time, setTime] = useState(flight?.time ?? ""), [err, setErr] = useState("");
  const Icon = kind === "arrival" ? PlaneLanding : PlaneTakeoff;
  const label = kind === "arrival" ? "Arrival flight" : "Departure flight";
  const has = !!(flight?.number || flight?.time);
  if (!has && readOnly) return null;
  if (!has && !editing) return <button className="btn btn-ghost btn-small flight-add" onClick={() => setEditing(true)}><Plus size={14} aria-hidden="true" /><Icon size={16} aria-hidden="true" /> Add {label.toLowerCase()}</button>;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!num.trim() && !time) { onSave?.(undefined); setEditing(false); return; }
    const r = FlightSchema.safeParse({ number: num.trim() || undefined, time: time || undefined });
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "Invalid flight");
    setErr(""); onSave?.(r.data); setEditing(false);
  }

  return (
    <div className={`flight-card flight-${kind}`}>
      <span className="flight-icon"><Icon size={22} aria-hidden="true" /></span>
      {editing ? (
        <form className="flight-form" onSubmit={save}>
          <div className="field"><label htmlFor={`fn-${kind}`}>{label} number</label><input id={`fn-${kind}`} value={num} onChange={(e) => setNum(e.target.value)} placeholder="A3 601" maxLength={8} autoFocus /></div>
          <div className="field"><label htmlFor={`ft-${kind}`}>{kind === "arrival" ? "Lands at" : "Takes off at"}</label><input id={`ft-${kind}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row"><button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-small">Save flight</button></div>
        </form>
      ) : (
        <div className="flight-body">
          <p className="eyebrow"><DestinationMotif size={14} /> {label}</p>
          <h4>{flight?.number ?? "Flight"}{flight?.time ? <span className="muted"> · {kind === "arrival" ? "lands" : "departs"} {flight.time}</span> : null}</h4>
          {flight?.time ? (
            <p className="flight-note"><Timer size={14} aria-hidden="true" /> {kind === "arrival"
              ? <>Plans start from about <strong>{addMinutes(flight.time, ARRIVAL_BUFFER_MIN)}</strong>, leaving {formatDuration(ARRIVAL_BUFFER_MIN)} for bags, transfer and check-in.</>
              : <>Head to the airport by about <strong>{subMinutes(flight.time, DEPARTURE_BUFFER_MIN)}</strong> ({formatDuration(DEPARTURE_BUFFER_MIN)} before take-off).</>}</p>
          ) : <p className="flight-note muted"><Clock size={14} aria-hidden="true" /> Add a time to plan the day around this flight.</p>}
          <p className="source">Entered by you · not checked against live flight data</p>
        </div>
      )}
      {!readOnly && !editing && <button className="icon-btn" onClick={() => { setNum(flight?.number ?? ""); setTime(flight?.time ?? ""); setEditing(true); }} aria-label={`Edit ${label.toLowerCase()}`}><Pencil size={16} /></button>}
    </div>
  );
}
