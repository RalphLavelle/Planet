import { placeImage, type ImageCredit } from "@/services/images";

/**
 * Full-bleed home-page background photos, one per famous city. To add a city: put resized JPEGs in
 * public/images/backgrounds/, add a "<key>:background" entry (with Commons author/licence) to
 * src/services/itinerary/imageCredits.json, and append an entry here. Only Paris ships for now.
 */
export interface CityBackground {
  key: string;
  city: string;
  alt: string;
  /** Responsive JPEG variants, ascending by width. */
  variants: { src: string; width: number }[];
  /** CSS object-position so the subject survives the portrait (mobile) crop. */
  objectPosition: string;
}

export const CITY_BACKGROUNDS: CityBackground[] = [
  {
    key: "paris",
    city: "Paris",
    alt: "The Eiffel Tower and Pont Alexandre III lit up at dusk beside the Seine in Paris",
    variants: [
      { src: "/images/backgrounds/paris-960.jpg", width: 960 },
      { src: "/images/backgrounds/paris-1600.jpg", width: 1600 },
      { src: "/images/backgrounds/paris-2400.jpg", width: 2400 },
    ],
    objectPosition: "20% 50%",
  },
];

export function backgroundCredit(bg: CityBackground): ImageCredit | null { return placeImage(`${bg.key}:background`); }
/** Which background to show. Deterministic (static export, no hydration mismatch); `index` allows rotation later. */
export function pickBackground(index = 0, list: CityBackground[] = CITY_BACKGROUNDS): CityBackground | null {
  return list.length ? list[((index % list.length) + list.length) % list.length] : null;
}
export const backgroundSrcSet = (bg: CityBackground) => bg.variants.map((v) => `${v.src} ${v.width}w`).join(", ");
