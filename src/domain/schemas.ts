import { z } from "zod";

/** Current schema version of persisted trips. Bump + add a migration in repositories/migrations.ts. */
export const TRIP_SCHEMA_VERSION = 1;

export const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code, e.g. EUR");
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/** Money is always an estimate range in minor-agnostic decimal units, with explicit currency + confidence. */
export const MoneyEstimateSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  currency: CurrencyCodeSchema,
  confidence: z.enum(["verified", "estimated", "illustrative"]),
});
export type MoneyEstimate = z.infer<typeof MoneyEstimateSchema>;

export const DataStatusSchema = z.enum(["live", "cached", "estimated", "demo", "unavailable", "user"]);
export type DataStatus = z.infer<typeof DataStatusSchema>;

export const SourceMetaSchema = z.object({
  source: z.string(),
  status: DataStatusSchema,
  retrievedAt: z.string().datetime().optional(),
});
export type SourceMeta = z.infer<typeof SourceMetaSchema>;

export const GeoPointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

export const InterestSchema = z.enum(["history", "food", "art", "architecture", "nightlife", "nature", "shopping"]);
export type Interest = z.infer<typeof InterestSchema>;
export const INTERESTS = InterestSchema.options;

export const ActivityCategorySchema = z.enum([
  "sight", "museum", "food", "cafe", "nightlife", "nature", "shopping", "walk", "viewpoint", "beach", "rest", "transport", "custom",
]);
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;

export const PreferencesSchema = z.object({
  interests: z.array(InterestSchema).default([]),
  budget: z.enum(["shoestring", "moderate", "comfortable", "luxury"]).default("moderate"),
  pace: z.enum(["relaxed", "balanced", "packed"]).default("balanced"),
  walking: z.enum(["low", "medium", "high"]).default("medium"),
  party: z.enum(["solo", "couple", "family", "group"]).default("couple"),
  dietary: z.string().max(200).default(""),
  accessibility: z.string().max(200).default(""),
  notes: z.string().max(1000).default(""),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const PlaceSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  name: z.string(),
  location: GeoPointSchema.optional(),
  categories: z.array(ActivityCategorySchema),
  description: z.string(),
  website: z.string().url().optional(),
  openingHoursNote: z.string().optional(),
  indoor: z.boolean().default(false),
  meta: SourceMetaSchema,
});
export type Place = z.infer<typeof PlaceSchema>;

/** Wikimedia's image hosts (Commons thumbnails are served from either). */
export const isWikimediaImageUrl = (u: string) => /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(u);
/** Drop tracking query params Commons appends to thumbnail URLs. */
export const cleanWikimediaUrl = (u: string) => u.replace(/\?utm_[^#]*$/, "");
/** Only Wikimedia-hosted images are ever rendered for venues (licensed, attributable). */
export const VenuePhotoSchema = z.object({
  src: z.string().url().refine(isWikimediaImageUrl, "Venue photos must come from Wikimedia"),
  title: z.string().max(300), author: z.string().max(300), license: z.string().max(80), licenseUrl: z.string().max(300), sourceUrl: z.string().max(400),
});
/** A real place the user looked up (e.g. a restaurant from OpenStreetMap), or a manual entry. */
export const VenueSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(240).default(""),
  osmUrl: z.string().url().optional(),
  source: z.enum(["osm", "manual"]),
  photo: VenuePhotoSchema.optional(),
});
export type Venue = z.infer<typeof VenueSchema>;
export const MealSchema = z.enum(["lunch", "dinner"]);
export type Meal = z.infer<typeof MealSchema>;
/** Sensible defaults; always editable. */
export const MEAL_DEFAULTS: Record<Meal, { startTime: string; durationMinutes: number }> = {
  lunch: { startTime: "13:00", durationMinutes: 75 },
  dinner: { startTime: "20:00", durationMinutes: 105 },
};

export const ActivitySchema = z.object({
  id: z.string(),
  placeId: z.string().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  notes: z.string().max(1000).default(""),
  category: ActivityCategorySchema,
  startTime: TimeSchema.optional(),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  cost: MoneyEstimateSchema.optional(),
  location: GeoPointSchema.optional(),
  imageRef: z.string().optional(),
  indoor: z.boolean().default(false),
  meta: SourceMetaSchema,
  origin: z.enum(["generated", "edited", "manual"]),
  meal: MealSchema.optional(),
  venue: VenueSchema.optional(),
  /** Licensed Wikimedia photo of this exact place (from discovery); bundled photos are looked up by placeId instead. */
  photo: VenuePhotoSchema.optional(),
  /** Where the facts came from, e.g. an OpenStreetMap or Wikipedia URL. */
  sourceUrl: z.string().url().max(400).optional(),
  openingHoursNote: z.string().max(200).optional(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const ItineraryDaySchema = z.object({
  id: z.string(),
  date: IsoDateSchema,
  title: z.string().max(120).default(""),
  /** "auto": title is derived from the day's activities and recomputed after edits; "user": typed by the traveller, kept. */
  titleMode: z.enum(["auto", "user"]).default("auto"),
  notes: z.string().max(1000).default(""),
  activities: z.array(ActivitySchema),
});
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const DestinationSchema = z.object({
  name: z.string().min(1).max(120),
  country: z.string().max(80).optional(),
  countryCode: z.string().length(2).optional(),
  location: GeoPointSchema.optional(),
  timeZone: z.string().optional(),
  localCurrency: CurrencyCodeSchema.optional(),
  catalogKey: z.string().optional(),
  /** Licensed Wikimedia photo for destinations without bundled imagery (from place discovery). */
  photo: VenuePhotoSchema.optional(),
});
export type Destination = z.infer<typeof DestinationSchema>;

/** IATA-style flight number: 2-char airline code + 1–4 digits (+ optional suffix), e.g. "A3 601". */
export const FLIGHT_NUMBER_RE = /^([A-Z0-9]{2})\s?(\d{1,4}[A-Z]?)$/;
export function normalizeFlightNumber(v: string): string {
  const m = v.trim().toUpperCase().replace(/\s+/g, " ").match(FLIGHT_NUMBER_RE);
  return m ? `${m[1]} ${m[2]}` : v.trim().toUpperCase();
}
export const FlightSchema = z.object({
  number: z.string().transform(normalizeFlightNumber).pipe(z.string().regex(FLIGHT_NUMBER_RE, "Use a flight number like A3 601")).optional(),
  /** Local time at the destination airport (arrival) / departure time (departure). */
  time: TimeSchema.optional(),
});
export type Flight = z.infer<typeof FlightSchema>;
export const FlightsSchema = z.object({ arrival: FlightSchema.optional(), departure: FlightSchema.optional() });
export type Flights = z.infer<typeof FlightsSchema>;

/** Buffers used to shape first/last days around flights. */
export const ARRIVAL_BUFFER_MIN = 150; // baggage, transfer, check-in
export const DEPARTURE_BUFFER_MIN = 180; // leave for the airport ~3 h before take-off

export const SharingSchema = z.object({
  mode: z.enum(["private", "snapshot"]).default("private"),
  includeAccommodation: z.boolean().default(false),
  includeFlights: z.boolean().default(false),
  /** Reserved for a future server-backed share token. Not used for access control in the browser MVP. */
  accessToken: z.string().optional(),
});

export const TripSchema = z.object({
  schemaVersion: z.literal(TRIP_SCHEMA_VERSION),
  id: z.string().min(6),
  destination: DestinationSchema,
  arrivalDate: IsoDateSchema,
  departureDate: IsoDateSchema,
  nativeCurrency: CurrencyCodeSchema,
  accommodation: z.string().max(200).default(""),
  flights: FlightsSchema.default({}),
  preferences: PreferencesSchema,
  days: z.array(ItineraryDaySchema),
  places: z.array(PlaceSchema).default([]),
  sharing: SharingSchema.prefault({}),
  generator: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Trip = z.infer<typeof TripSchema>;

export const MAX_TRIP_DAYS = 21;

/** Input from the creation wizard. */
export const TripInputSchema = z
  .object({
    destination: z.string().trim().min(2, "Enter a destination").max(120),
    arrivalDate: IsoDateSchema,
    departureDate: IsoDateSchema,
    nativeCurrency: CurrencyCodeSchema,
    accommodation: z.string().trim().max(200).default(""),
    flights: FlightsSchema.default({}),
    preferences: PreferencesSchema.prefault({}),
  })
  .superRefine((v, ctx) => {
    const a = Date.parse(v.arrivalDate), d = Date.parse(v.departureDate);
    if (Number.isNaN(a) || Number.isNaN(d)) return;
    const days = Math.round((d - a) / 86400000) + 1;
    if (d < a) ctx.addIssue({ code: "custom", path: ["departureDate"], message: "Departure must be on or after arrival" });
    else if (days > MAX_TRIP_DAYS)
      ctx.addIssue({ code: "custom", path: ["departureDate"], message: `Trips can be at most ${MAX_TRIP_DAYS} days in this version` });
    const at = v.flights.arrival?.time, dt = v.flights.departure?.time;
    if (days === 1 && at && dt && dt <= at)
      ctx.addIssue({ code: "custom", path: ["flights"], message: "On a same-day trip the departure flight must be after the arrival flight" });
  });
export type TripInput = z.input<typeof TripInputSchema>;
export type ValidTripInput = z.output<typeof TripInputSchema>;
