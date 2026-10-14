"use client";
import {
  Bed, Coffee, Footprints, Landmark, Martini, Mountain, Palmtree, PenLine, ShoppingBag, Sparkles, TrainFront, Trees, UtensilsCrossed,
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

/** Image slot: resolves imageRef via a configurable source; falls back to a themed illustrated placeholder. */
export function ActivityThumb({ category, imageRef, alt }: { category: ActivityCategory; imageRef?: string; alt: string }) {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  const src = base && imageRef && !imageRef.startsWith("category:") ? `${base}/${encodeURIComponent(imageRef)}` : null;
  return (
    <div className={`thumb thumb-${category}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={(e) => { e.currentTarget.style.display = "none"; }} />
      ) : (
        <span className="thumb-icon"><ActivityCategoryIcon category={category} size={30} /></span>
      )}
    </div>
  );
}
