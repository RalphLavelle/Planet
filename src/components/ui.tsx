"use client";
import { useState } from "react";
import { placeImage, type ImageCredit } from "@/services/images";
import { CategoryOrnament } from "./theme";
import {
  Bed, Camera, Coffee, Footprints, Landmark, Martini, Mountain, Palmtree, PenLine, ShoppingBag, Sparkles, TrainFront, Trees, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory, DataStatus } from "@/domain/schemas";
import { relativeTime } from "@/lib/dates";

export const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  sight: Landmark, museum: Landmark, food: UtensilsCrossed, cafe: Coffee, nightlife: Martini, nature: Trees, shopping: ShoppingBag,
  walk: Footprints, viewpoint: Mountain, beach: Palmtree, rest: Bed, transport: TrainFront, custom: PenLine,
};
export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  sight: "Sight", museum: "Museum", food: "Food", cafe: "Café", nightlife: "Evening", nature: "Outdoors", shopping: "Shopping",
  walk: "Walk", viewpoint: "Viewpoint", beach: "Coast", rest: "Rest", transport: "Getting around", custom: "Your plan",
};

export function ActivityCategoryIcon({ category, size = 16 }: { category: ActivityCategory; size?: number }) {
  const I = CATEGORY_ICON[category] ?? Sparkles;
  return <I size={size} aria-hidden="true" />;
}

const STATUS_TEXT: Record<DataStatus, string> = { live: "Live", cached: "Cached", estimated: "Estimate", demo: "Demo data", unavailable: "Unavailable", user: "Added by you" };
export function StatusBadge({ status, at, stale }: { status: DataStatus; at?: string; stale?: boolean }) {
  return (
    <span className={`status status-${status}${stale ? " status-stale" : ""}`}>
      {STATUS_TEXT[status]}{stale ? " · stale" : ""}{at && status !== "demo" && status !== "user" ? ` · ${relativeTime(at)}` : ""}
    </span>
  );
}

/** Small attribution line for a licensed photo. */
export function PhotoCredit({ credit }: { credit: ImageCredit }) {
  return (
    <a className="photo-credit" href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" title={`${credit.title} — ${credit.author}, ${credit.license}`}>
      <Camera size={10} aria-hidden="true" /> {credit.author.slice(0, 32)} · {credit.license}<span className="sr-only"> (photo source on Wikimedia Commons)</span>
    </a>
  );
}

/** Image slot: licensed photo when available (via services/images), otherwise a themed illustrated placeholder. */
export function ActivityThumb({ category, placeId, alt, photo }: { category: ActivityCategory; placeId?: string; imageRef?: string; alt: string; photo?: ImageCredit }) {
  const credit = photo ?? placeImage(placeId);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`thumb thumb-${category}${credit && !failed ? " thumb-photo" : ""}`}>
      {credit && !failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={credit.src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
          <PhotoCredit credit={credit} />
        </>
      ) : (
        <span className="thumb-fallback"><CategoryOrnament category={category} size={44} /><span className="thumb-icon-small"><ActivityCategoryIcon category={category} size={14} /></span></span>
      )}
    </div>
  );
}
