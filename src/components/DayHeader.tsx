"use client";
import { useState } from "react";
import { Check, ChevronDown, ListChecks, Pencil, RotateCcw, X } from "lucide-react";
import type { ItineraryDay } from "@/domain/schemas";
import { formatDay } from "@/lib/dates";
import { placeImage } from "@/services/images";
import { CategoryOrnament, DestinationMotif } from "./theme";
import { PhotoCredit } from "./ui";

/** Picks the most evocative photo for a day: first sight/museum/viewpoint with a photo, then any photo. */
export function dayBannerPhoto(day: ItineraryDay, exclude: Set<string> = new Set()) {
  const withImg = day.activities.map((a) => ({ a, img: placeImage(a.placeId) })).filter((x) => x.img && !exclude.has(x.img.src));
  return (withImg.find((x) => !["food", "cafe", "nightlife"].includes(x.a.category)) ?? withImg[0])?.img ?? null;
}

type Props = {
  day: ItineraryDay; index: number; title: string; photo?: ReturnType<typeof dayBannerPhoto>; weather?: React.ReactNode; collapsed: boolean; readOnly?: boolean;
  onToggle: () => void; onRename: (title: string) => void; onReset: () => void;
};

export function DayHeader({ day, index, title, photo = null, weather, collapsed, readOnly, onToggle, onRename, onReset }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const bodyId = `day-body-${day.id}`;
  const times = (day.activities.map((a) => a.startTime).filter(Boolean) as string[]).sort();

  const save = () => { onRename(value); setEditing(false); };

  return (
    <header className={`day-banner${photo ? " has-photo" : ""}${collapsed ? " is-collapsed" : ""}`}>
      {photo && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img className="day-banner-img" src={photo.src} alt="" loading="lazy" /><PhotoCredit credit={photo} /></>}
      <div className="day-banner-inner">
        <span className="day-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className="day-banner-text">
          <p className="eyebrow"><DestinationMotif size={14} /> {formatDay(day.date)}{weather}</p>
          {editing ? (
            <form className="title-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <label className="sr-only" htmlFor={`title-${day.id}`}>Day {index + 1} title</label>
              <input id={`title-${day.id}`} value={value} maxLength={120} onChange={(e) => setValue(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === "Escape") { setValue(title); setEditing(false); } }} />
              <button className="icon-btn" aria-label="Save title"><Check size={16} /></button>
              <button type="button" className="icon-btn" aria-label="Cancel" onClick={() => { setValue(title); setEditing(false); }}><X size={16} /></button>
            </form>
          ) : (
            <h3 id={`h-${day.id}`} className="day-title">
              {title}
              {!readOnly && <button className="icon-btn title-btn" onClick={() => { setValue(title); setEditing(true); }} aria-label={`Rename day ${index + 1}`}><Pencil size={14} /></button>}
              {!readOnly && day.titleMode === "user" && <button className="btn btn-small btn-ghost title-reset" onClick={onReset}><RotateCcw size={12} aria-hidden="true" /> Auto title</button>}
            </h3>
          )}
          {collapsed && (
            <div className="day-summary">
              <span className="day-count"><ListChecks size={14} aria-hidden="true" /> {day.activities.length} {day.activities.length === 1 ? "stop" : "stops"}{times.length ? ` · ${times[0]}–${times[times.length - 1]}` : ""}</span>
              <ul className="thumb-strip" aria-label="Stops">
                {day.activities.slice(0, 6).map((a) => {
                  const img = placeImage(a.placeId);
                  return <li key={a.id} title={a.title}>{img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img.src} alt={a.title} loading="lazy" /> : <span className="strip-fallback" role="img" aria-label={a.title}><CategoryOrnament category={a.category} size={20} /></span>}</li>;
                })}
                {day.activities.length > 6 && <li className="strip-more">+{day.activities.length - 6}</li>}
              </ul>
            </div>
          )}
        </div>
        <button className="icon-btn day-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-controls={bodyId} aria-label={`${collapsed ? "Expand" : "Collapse"} day ${index + 1}`}>
          <ChevronDown size={18} className={collapsed ? "" : "rot"} />
        </button>
      </div>
    </header>
  );
}

/** Banner photos for all days, avoiding repeats where possible. */
export function dayBannerPhotos(days: ItineraryDay[]) {
  const used = new Set<string>();
  return days.map((d) => { const p = dayBannerPhoto(d, used) ?? dayBannerPhoto(d); if (p) used.add(p.src); return p; });
}
