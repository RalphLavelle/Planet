"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Activity, Trip } from "@/domain/schemas";
import { formatDay } from "@/lib/dates";
import type { ActivityPatch } from "@/services/editing";

export interface ItemEdit { patch: ActivityPatch; place?: { dayId: string; position: number } }

/** Number of position choices when an item sits in `toDayId`: its current day's length, or one more when moving in. */
export function positionCount(trip: Trip, fromDayId: string, toDayId: string): number {
  const n = trip.days.find((d) => d.id === toDayId)?.activities.length ?? 0;
  return fromDayId === toDayId ? n : n + 1;
}

/**
 * Edit one itinerary item. Same form fields as "Add an item" (title, start time, duration, notes) plus day and
 * position pickers and a confirmed delete. Opens when the item row is tapped.
 */
export function ItemEditor({ trip, dayId, activity: a, onSave, onDelete, onCancel }: {
  trip: Trip; dayId: string; activity: Activity; onSave: (e: ItemEdit) => void; onDelete: () => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(a.title), [notes, setNotes] = useState(a.notes), [time, setTime] = useState(a.startTime ?? ""), [dur, setDur] = useState(a.durationMinutes);
  const [toDay, setToDay] = useState(dayId);
  const currentIdx = trip.days.find((d) => d.id === dayId)?.activities.findIndex((x) => x.id === a.id) ?? 0;
  const [pos, setPos] = useState(currentIdx + 1); // 1-based in the UI
  const [err, setErr] = useState("");
  const count = positionCount(trip, dayId, toDay);
  const safePos = Math.min(pos, count);
  const uid = (s: string) => `${s}-${a.id}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setErr("Title is required");
    if (!(dur >= 5 && dur <= 1440)) return setErr("Duration must be 5–1440 minutes");
    const moved = toDay !== dayId || safePos - 1 !== currentIdx;
    onSave({ patch: { title: title.trim(), notes, startTime: time || undefined, durationMinutes: dur }, place: moved ? { dayId: toDay, position: safePos - 1 } : undefined });
  }

  return (
    <form className="editor item-editor" onSubmit={submit} aria-label={`Edit ${a.title}`}>
      <div className="field"><label htmlFor={uid("t")}>Title</label><input id={uid("t")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
      <div className="grid2">
        <div className="field"><label htmlFor={uid("s")}>Start time</label><input id={uid("s")} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor={uid("d")}>Duration (min)</label><input id={uid("d")} type="number" min={5} max={1440} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></div>
      </div>
      <div className="grid2 grid-day">
        <div className="field"><label htmlFor={uid("day")}>Day</label>
          <select id={uid("day")} value={toDay} onChange={(e) => { setToDay(e.target.value); setPos(positionCount(trip, dayId, e.target.value)); }}>
            {trip.days.map((d, i) => <option key={d.id} value={d.id}>Day {i + 1} · {formatDay(d.date, { weekday: "short", day: "numeric" })}</option>)}
          </select></div>
        <div className="field"><label htmlFor={uid("pos")}>Order in day</label>
          <select id={uid("pos")} value={safePos} onChange={(e) => setPos(Number(e.target.value))}>
            {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{i + 1} of {count}</option>)}
          </select></div>
      </div>
      <div className="field"><label htmlFor={uid("n")}>Your notes</label><textarea id={uid("n")} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row between item-editor-actions">
        <button type="button" className="btn btn-ghost btn-small danger" onClick={() => { if (window.confirm(`Remove “${a.title}” from your guide?`)) onDelete(); }}><Trash2 size={14} aria-hidden="true" /> Delete</button>
        <div className="row"><button type="button" className="btn btn-ghost btn-small" onClick={onCancel}>Cancel</button><button className="btn btn-small">Save</button></div>
      </div>
    </form>
  );
}
