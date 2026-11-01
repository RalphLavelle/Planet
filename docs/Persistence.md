# Persistence (Supabase)

Planet is local-first. Trips (itinerary + guide, one JSON document each) always live in `localStorage`; when Supabase is
configured they are also synced to a Postgres table. With no Supabase variables the app is exactly the old
localStorage-only static site (what the here.now build is).

## Turning it on
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` **at build time** (they are inlined into the static
bundle; see `.env.example`). `NEXT_PUBLIC_TRIP_REPOSITORY=local` forces localStorage-only. Never ship the `service_role` key.

## Schema (`supabase/migrations/20261101000000_trips.sql`)
`public.trips(owner_id uuid, id text, data jsonb, schema_version, destination_name, arrival_date, departure_date,
created_at, updated_at, deleted_at)`, primary key `(owner_id, id)`. `data` is the full Trip document (validated with the
zod `TripSchema` on read, with the same versioned migrations as local records). `deleted_at` is a soft-delete
tombstone (content is blanked) so other devices learn about deletions.

## Identity and security
Supabase **anonymous auth**: the first load in a browser calls `signInAnonymously()`; the session is kept in
localStorage (`planet:supabase-auth`). `owner_id` defaults to `auth.uid()` and row level security allows select/insert/
update/delete only where `owner_id = auth.uid()`; the `anon` role has no table privileges. So the public anon key
cannot read anybody's trips, and two browsers never see each other's data.

### Accounts (email + password)
The top-bar account control (`src/components/AccountMenu.tsx`, only shown when Supabase is configured) offers:
- **Create account**: while the browser has an anonymous session this calls `auth.updateUser({ email, password })`, which attaches the
  credentials to the *same* user id, so existing trips keep their `owner_id`. Supabase emails a confirmation link; after it is clicked the
  user is permanent. (With no session it falls back to `auth.signUp`.)
- **Sign in** (`signInWithPassword`) on another device: the session switches to the account, then a sync runs, which uploads every trip
  cached on this device (made anonymously or offline) into the account and downloads the account's trips. Nothing on the device is dropped.
- **Sign out**: syncs first (refuses if that fails, unless forced), ends the session on this device only, and clears the local trip cache so
  the next person/identity on a shared browser starts clean. Trips are safe in the database.
- **Forgot password**: `resetPasswordForEmail`; the link returns to the app, which shows a "Choose a new password" form.
Logic lives in `src/auth/` (`AccountController` is backend-agnostic and unit tested; `SupabaseAuth` / `SupabaseSession` talk to Supabase).
Not built: Google/OAuth, changing email, deleting an account, and cleanup of orphaned anonymous users left behind when a device signs in to an existing account.

### Supabase Auth settings this relies on
- Anonymous sign-ins: on. Email provider: on, **email confirmation: on** (`mailer_autoconfirm=false`).
- Site URL = the live app URL; redirect allow-list includes it and `http://localhost:3000/**`.
- `mailer_secure_email_change_enabled=false`: with it on, linking an email to an anonymous user fails ("Email address \"\" is invalid") because
  Supabase tries to notify the user's (empty) current email.
- Password minimum length 8 (matches the client).
- **Email limits**: the built-in Supabase mailer is capped (currently `rate_limit_email_sent` = 2 emails per hour for the whole project) and is intended for
  development; every confirmation and reset email counts. Configure custom SMTP (Project Settings > Authentication > SMTP) before real use.

## Sync rules (`src/repositories/SyncedTripRepository.ts`)
- Reads/writes go to localStorage first; `save` then upserts remotely (failure is non-fatal and recorded in `syncState`).
- `list()` (and `get()` for an unknown id) runs a sync: last-write-wins by `updatedAt`; local-only trips (e.g. created before
  Supabase was enabled) are uploaded; newer remote trips are cached locally; unreadable remote documents are ignored.
- Deletes write a local tombstone, soft-delete remotely, and retry on the next sync if offline. An edit newer than a
  remote delete restores the trip.
- Clocks are the client's, so last-write-wins assumes reasonably correct device clocks.

## Verifying
- Unit: `tests/syncedRepository.test.ts` (fake remote). Live: `tests/supabase.live.test.ts` (skipped unless the env vars are set) and
  `node scripts/supabase-smoke.mjs` (RLS isolation between two anonymous users).
- Migrations are applied with the Supabase SQL editor or the Management API `database/query` endpoint.
  Anonymous sign-ins must be enabled (Authentication > Providers, or `external_anonymous_users_enabled` in the auth config).

## Hosting
`.do/app.yaml` describes a free DigitalOcean App Platform static site built from GitHub (`npm ci && npm run build:static`, output `.next-export`).
