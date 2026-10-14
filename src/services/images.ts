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

/** Photos for a destination collage: hero + gallery + catalogue places, de-duplicated. */
export function destinationGallery(catalogKey?: string, limit = 7): ImageCredit[] {
  if (!catalogKey) return [];
  const all = Object.entries(CREDITS).filter(([k]) => k.startsWith(catalogKey + ":"));
  const order = (k: string) => (k.endsWith(":hero") ? 0 : k.includes(":gallery-") ? 1 : 2);
  const seen = new Set<string>();
  return all.sort((a, b) => order(a[0]) - order(b[0])).map(([, c]) => c).filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true))).slice(0, limit);
}
