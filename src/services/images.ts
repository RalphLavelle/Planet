import credits from "./itinerary/imageCredits.json";

export interface ImageCredit { src: string; title: string; author: string; license: string; licenseUrl: string; sourceUrl: string }
const CREDITS = credits as Record<string, ImageCredit>;

/**
 * Image source abstraction. MVP: freely licensed Wikimedia Commons photos bundled in /public/images/places,
 * keyed by place id ("athens:acropolis") or destination hero ("athens:hero"). Returns null → UI shows a themed fallback.
 * A future provider (e.g. Unsplash/Google Places photos) can replace this without touching components.
 */
export function placeImage(placeId?: string): ImageCredit | null { return (placeId && CREDITS[placeId]) || null; }
export function destinationImage(catalogKey?: string): ImageCredit | null { return (catalogKey && CREDITS[`${catalogKey}:hero`]) || null; }
export function allImageCredits(): [string, ImageCredit][] { return Object.entries(CREDITS); }


/** Photo for an activity: its own discovered Wikimedia photo, else the bundled one for its catalogue place. */
export function activityImage(a: { photo?: ImageCredit; placeId?: string }): ImageCredit | null { return a.photo ?? placeImage(a.placeId); }
/** Hero photo: bundled destination photo, else the discovered one. */
export function tripHeroImage(d: { catalogKey?: string; photo?: ImageCredit }): ImageCredit | null { return destinationImage(d.catalogKey) ?? d.photo ?? null; }
