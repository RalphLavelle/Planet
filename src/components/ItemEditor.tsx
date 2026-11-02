"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Activity, Trip } from "@/domain/schemas";
import { formatDay } from "@/lib/dates";
import type { ActivityPatch } from "@/services/editing";

export interface ItemEdit { patch: ActivityPatch; place?: { dayId: string } }

/**
 * Edit one itinerary item. Same form fields as "Add an item" (title, start time, duration, notes) plus a day picker and a
 * confirmed delete. Items always sit in start-time order, so there is no order picker. Opens when the item row is tapped.
 */
export function ItemEditor({ trip, dayId, activity: a, onSave, onDelete, onCancel }: {
  trip: Trip; dayId: string; activity: Activity; onSave: (e: ItemEdit) => void; onDelete: () => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(a.title), [notes, setNotes] = useState(a.notes), [time, setTime] = useState(a.startTime ?? ""), [dur, setDur] = useState(a.durationMinutes);
  const [toDay, setToDay] = useState(dayId);
  const [err, setErr] = useState("");
  const uid = (s: string) => `${s}-${a.id}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setErr("Title is required");
    if (!(dur >= 5 && dur <= 1440)) return setErr("Duration must be 5–1440 minutes");
    onSave({ patch: { title: title.trim(), notes, startTime: time || undefined, durationMinutes: dur }, place: toDay !== dayId ? { dayId: toDay } : undefined });
  }

  return (
    <form className="editor item-editor" onSubmit={submit} aria-label={`Edit ${a.title}`}>
      <div className="field"><label htmlFor={uid("t")}>Title</label><input id={uid("t")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
      <div className="grid2">
        <div className="field"><label htmlFor={uid("s")}>Start time</label><input id={uid("s")} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label htmlFor={uid("d")}>Duration (min)</label><input id={uid("d")} type="number" min={5} max={1440} step={5} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></div>
      </div>
      <div className="grid-day">
        <div className="field"><label htmlFor={uid("day")}>Day</label>
          <select id={uid("day")} value={toDay} onChange={(e) => setToDay(e.target.value)}>
            {trip.days.map((d, i) => <option key={d.id} value={d.id}>Day {i + 1} · {formatDay(d.date, { weekday: "short", day: "numeric" })}</option>)}
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
