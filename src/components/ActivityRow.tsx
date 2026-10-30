"use client";
import { ChevronRight, Clock, CloudRain, Home, MapPin, Navigation, Pencil, Trees, Wallet } from "lucide-react";
import type { Activity, GeoPoint, Trip } from "@/domain/schemas";
import { formatEstimate } from "@/domain/money";
import { formatDuration } from "@/lib/dates";
import { getServices } from "@/services/container";
import * as edit from "@/services/editing";
import { activityImage } from "@/services/images";
import { VenueThumb } from "./AddItem";
import { Collapsible } from "./Collapsible";
import { ItemEditor } from "./ItemEditor";
import { MiniMap } from "./MiniMap";
import { CategoryOrnament, useDestinationTheme } from "./theme";
import { ActivityCategoryIcon, ActivityThumb, CATEGORY_LABEL, StatusBadge } from "./ui";

export interface RowSuggestion { reason: string; swapWithActivityId?: string }
export interface ActivityRowProps {
  trip: Trip;
  dayId: string;
  activity: Activity;
  /** Shared read-only view: no tap-to-edit, no cue, no editor. */
  readOnly?: boolean;
  editing: boolean;
  onEditing: (open: boolean) => void;
  onChange: (next: Trip, label: string) => void;
  base?: GeoPoint | null;
  /** Converts a cost to the traveller's currency, or null when no rate is available. */
  conv?: (c: NonNullable<Activity["cost"]>) => string | null;
  suggestion?: RowSuggestion;
  swapTitle?: string;
}

const photoOf = (a: Activity) => (a.venue ? a.venue.photo ?? null : activityImage(a));

/**
 * One itinerary row on the shared fixed grid (time | thumbnail | content). Used by the saved guide and by the
 * wizard's draft preview so both look and behave the same. Tapping the row opens the item editor.
 */
export function ActivityRow({ trip, dayId, activity: a, readOnly, editing, onEditing, onChange, base = null, conv, suggestion, swapTitle }: ActivityRowProps) {
  const theme = useDestinationTheme();
  const day = { id: dayId };
  return (
    <li className="activity">
      <div className="activity-time"><Clock size={14} aria-hidden="true" className="muted" /><span>{a.startTime ?? "—"}</span><small>{formatDuration(a.durationMinutes)}</small></div>
      {editing && !readOnly ? (
        <article className="activity-card is-editing">
          <ItemEditor trip={trip} dayId={day.id} activity={a} onCancel={() => onEditing(false)}
            onSave={({ patch, place }) => { onChange(edit.applyItemEdit(trip, day.id, a.id, patch, place), `Edited “${patch.title ?? a.title}”${place && place.dayId !== day.id ? " (moved day)" : ""}`); onEditing(false); }}
            onDelete={() => { onChange(edit.removeActivity(trip, day.id, a.id), `Removed “${a.title}”`); onEditing(false); }} />
        </article>
      ) : (
      <article className={`activity-card${readOnly ? "" : " is-editable"}`}>
        {a.venue ? <VenueThumb venue={a.venue} alt={a.venue.name} /> : <ActivityThumb category={a.category} placeId={a.placeId} imageRef={a.imageRef} alt={a.title} photo={a.photo} />}
        <div className="activity-body">
          <p className="badge-row">
            <span className="cat-badge"><CategoryOrnament category={a.category} size={18} /><ActivityCategoryIcon category={a.category} size={14} /> {a.meal ? (a.meal === "lunch" ? "Lunch" : "Dinner") : CATEGORY_LABEL[a.category]}</span>
            {a.origin !== "generated" ? <StatusBadge status="user" /> : <StatusBadge status={a.meta.status} />}
            {a.indoor ? <span className="tag"><Home size={12} aria-hidden="true" /> Indoors</span> : a.origin === "generated" ? <span className="tag"><Trees size={12} aria-hidden="true" /> Outdoors</span> : null}
          </p>
          <>
              {readOnly ? <h4>{a.title}</h4> : (
                <h4><button type="button" className="activity-open" onClick={() => onEditing(true)} aria-label={`Edit ${a.title}`}>{a.title}</button></h4>
              )}
              {a.venue && <p className="desc venue-addr"><MapPin size={14} aria-hidden="true" /> {a.venue.address || "Address unknown"}{a.venue.osmUrl && <> · <a href={a.venue.osmUrl} target="_blank" rel="noopener noreferrer">OpenStreetMap</a></>}{a.venue.source === "manual" && <span className="muted"> · entered manually</span>}</p>}
              {a.notes && <p className="notes"><Pencil size={14} aria-hidden="true" /> {a.notes}</p>}
              <ul className="facts">
                {a.cost ? <li><Wallet size={14} aria-hidden="true" /> {formatEstimate(a.cost)}{conv?.(a.cost) ? <span className="muted"> ({conv?.(a.cost)})</span> : null} <span className="muted">illustrative</span></li>
                  : a.origin === "generated" ? <li className="muted"><Wallet size={14} aria-hidden="true" /> Cost unknown</li> : null}
                {a.location && <li><a href={getServices().directions.directionsUrl(a.location, trip.accommodation ? `${trip.accommodation}, ${trip.destination.name}` : undefined)} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" /> Directions<span className="sr-only"> to {a.title} (opens Google Maps)</span></a></li>}
              </ul>
              {(!a.venue && a.description) || (a.origin === "generated" && a.meta.status !== "demo") || a.location || photoOf(a) ? (
                <Collapsible id={`act-${a.id}`} scope={trip.id} level={5} variant="inline" title="Details" summary={a.venue ? undefined : a.description ? a.description.slice(0, 70) + (a.description.length > 70 ? "…" : "") : a.location ? "Map, opening hours" : undefined}>
                  {!a.venue && a.description && <p className="desc">{a.description}</p>}
                  {a.origin === "generated" && a.meta.status !== "demo" && (
                    <p className="src-line muted">{a.openingHoursNote ?? "Opening hours unknown — check before you go."}{a.sourceUrl && <> · <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">{a.sourceUrl.includes("wikipedia.org") ? "Wikipedia" : "OpenStreetMap"}</a></>}</p>
                  )}
                  {photoOf(a) && <p className="src-line muted">Photo: {photoOf(a)!.author} · {photoOf(a)!.license} · <a href={photoOf(a)!.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></p>}
                  {a.location && <MiniMap stop={a.location} base={base} accent={theme.tokens.secondary} />}
                </Collapsible>
              ) : null}
              {suggestion && !readOnly && (
                <div className="suggest" role="note"><CloudRain size={16} aria-hidden="true" /> {suggestion.reason}{swapTitle ? <> Swap with <strong>{swapTitle}</strong>?</> : null}
                  {suggestion.swapWithActivityId && <button className="btn btn-small btn-ghost" onClick={() => onChange(edit.swapActivities(trip, a.id, suggestion.swapWithActivityId!), `Swapped “${a.title}” for “${swapTitle}”`)}>Swap</button>}
                </div>
              )}
            </>
        </div>
        {!readOnly && <span className="row-cue" aria-hidden="true"><span className="row-cue-label">Edit</span><ChevronRight size={20} /></span>}
      </article>
      )}
    </li>
  );
}
