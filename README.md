# Planet — personalised travel guide MVP

Planet generates a private, editable, magazine-style travel guide for a city break: day-by-day itinerary, place descriptions, maps & directions, illustrative costs, weather and tips — with a destination-inspired visual identity (Athens/Greece fully themed, Istanbul secondary, neutral fallback elsewhere).

Specs: `docs/Overview.md` (build prompt) and `docs/Styles.md` (visual identity addendum).

## Prerequisites & running
- Node 20+, npm.
- `npm install` · `npm run dev` → http://localhost:3000
- No database, accounts or API keys needed.

| Command | What |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm test` | Vitest unit tests (30) |
| `npm run build:static` | Static export (no server) into `.next-export/` |
| `python3 scripts/publish-herenow.py` | Anonymous publish of `.next-export/` to here.now (expires in 24 h) |
| `node scripts/e2e.mjs` | Playwright flow test + screenshots into `screenshots/` (needs dev server; `npx playwright install chromium` once) |

## Environment variables (all optional) — see `.env.example`
- `NEXT_PUBLIC_WEATHER_PROVIDER` = `open-meteo` (default; live, keyless) | `demo` (illustrative, labelled "Demo data").
- `NEXT_PUBLIC_TRIP_REPOSITORY` = `local` (default). Reserved for `supabase` / `postgres`.
- `NEXT_PUBLIC_IMAGE_BASE_URL` — optional image source; `imageRef` values resolve against it, with themed illustrated placeholders as fallback.
- Future server-only secrets (never `NEXT_PUBLIC_`): LLM key for an LLM itinerary generator, Google Maps/Mapbox key for places & routing, a commercial FX key if needed.

## Architecture
```
src/domain/        Zod schemas + types (Trip, Preferences, ItineraryDay, Activity, Place, MoneyEstimate), money formatting
src/repositories/  TripRepository/DraftRepository interfaces, BrowserStorage implementations, versioned migrations
src/services/      container.ts (composition root), trips.ts, editing.ts (pure itinerary ops), sharing.ts (snapshots),
                   refresh.ts (RefreshService), itinerary/ (ItineraryGenerator + Demo impl + demo catalogue),
                   providers/ (Weather, CurrencyRate, Directions)
src/themes/        DestinationTheme config: athens.tsx, istanbul.tsx, neutral.tsx, registry.ts
src/components/    theme.tsx (DestinationThemeProvider, DestinationHero, DestinationMotif, ThemedSectionDivider), ui.tsx (ActivityCategoryIcon, StatusBadge, ActivityThumb), TripGuide.tsx
app/               Next.js App Router pages: / , /new (3-step wizard), /trip?id=<id>, /shared (#snapshot), /import
```
- **Components never touch storage.** All persistence goes through `getServices()` in `src/services/container.ts`, the single place where implementations are chosen. (`rg localStorage app src/components` returns nothing.)
- Repository methods are async; storage is resolved lazily so SSR never touches `window`.
- Every read is Zod-validated; corrupt/unknown records are skipped and reported (`issues()`), with a "Reset" action on the home page. Records carry `schemaVersion`; `repositories/migrations.ts` upgrades old records on read.

### Browser persistence
- **localStorage** (`planet:trip:<id>`, one record per trip): saved trips. Survive reloads/restarts in this browser.
- **sessionStorage** (`planet:draft`): the generated-but-unconfirmed draft in the wizard — disappears with the tab, by design.
- **localStorage cache** (`planet:cache:*`): last weather/FX responses so the guide can show cached/stale data when offline.
- Limitations (also shown in the UI): per-browser & per-device; cleared with browser data; not encrypted / not for confidential info; a local link does not work on another device; no sync.

### Adding a database later
1. Implement `TripRepository` in e.g. `src/repositories/SupabaseTripRepository.ts` (same async methods; validate with `TripSchema` on read; the domain model maps naturally to tables `trips`, `itinerary_days`, `activities`, `places`).
2. Add `case "supabase": trips = new SupabaseTripRepository(client)` in `container.ts`, set `NEXT_PUBLIC_TRIP_REPOSITORY=supabase`.
3. No UI changes required. For server-backed sharing, populate `trip.sharing.accessToken` and resolve `/trip?id=<id>?token=…` server-side with access control.

### Itinerary generation
`ItineraryGenerator` interface; `DemoItineraryGenerator` is deterministic (seeded by destination/dates/interests/seed), varies sights across days, respects interests, pace, walking, party and budget, and labels everything "Demo data". Destinations in the demo catalogue (Athens — 20 places, Rome, Paris, Istanbul, Tokyo) get named places with approximate coordinates and illustrative price ranges; others get a generic template with **no** coordinates or prices. Add an LLM generator by implementing the interface behind a Next.js route handler (key stays server-side) and validating output with `ItineraryDaySchema`/`PlaceSchema` before saving.

### Live vs demo data
| Integration | Status |
|---|---|
| Weather | **Live** — Open-Meteo (keyless), 16-day horizon; otherwise "Unavailable"; cached/stale fallback |
| Exchange rates | **Live** — Frankfurter (ECB reference rates, keyless); "conversion unavailable" on failure; never hard-coded |
| Places, prices, opening hours, tips | **Demo** catalogue, labelled; prices are "≈ illustrative" ranges |
| Map | Keyless OpenStreetMap embed (bounding box of the day's stops) + Google Maps deep links for directions; no fabricated route times/distances |
| Images | Illustrated themed placeholders; optional `NEXT_PUBLIC_IMAGE_BASE_URL` |

### Refresh
`RefreshService.refresh(trip)` runs when a guide opens and on "Update". It refreshes facts only, records source/status/timestamp per provider, falls back to cache (flagging stale after 6 h), and returns *suggestions* (e.g. rain on a day with outdoor plans → offer a swap with an indoor activity). Swaps only happen when the user clicks. It is a plain class so a future scheduled server job can call it.

### Sharing
- **Local guide link** `/trip/?id=<id>` — this browser only (explained in UI).
- **Portable read-only link** `/shared#<base64url snapshot>` — the itinerary travels inside the URL fragment (never sent to a server). Accommodation and personal notes are stripped unless the user ticks "Include where I'm staying". Recipients can "Save a copy" (new id). Also **Export file** (.json) and `/import`. Snapshots are size-limited and Zod-validated.

### Visual identity
`DestinationTheme` = tokens (CSS custom properties), CSS/SVG patterns, divider strip, hero illustration, small motif, sprig. Selection uses structured metadata (`catalogKey`/ISO country), so "Athens, Georgia" gets the neutral theme. Athens: Parthenon-on-hill hero with sun & cypresses, evil-eye (mati) motifs on day headers/nav/badges, Greek-key meander dividers and subtle background, olive sprigs, Aegean/limestone/terracotta/olive palette. Functional icons are Lucide throughout. Add a theme by creating `src/themes/<x>.tsx` and registering it in `registry.ts`.

## Known limitations
- Local-only storage; no auth or cross-device sync (by design for the MVP).
- OSM embed shows the area of the day's stops but not individual numbered pins (the stops list has per-stop map links). A JS map library or paid provider can be added behind `DirectionsProvider`.
- Undo history is in-memory (last 20 edits) and resets on reload.
- Demo catalogue is small; non-catalogue cities get generic suggestions.
- Reordering is via up/down buttons and a "Move to…" select (accessible) rather than drag-and-drop.

## Deployment
The app is fully client-side, so it ships as a static export (`npm run build:static`). Trip pages use `/trip/?id=…` (query param) instead of a dynamic `/trip/[id]` segment so they work on any static host without rewrites. Remember that trips live in each visitor's browser storage, scoped to the site's origin.
