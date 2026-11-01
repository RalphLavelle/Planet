-- Planet persistence: one row per trip (itinerary + guide), stored as a validated JSON document.
-- Identity: Supabase anonymous auth (auth.uid()). Each browser gets its own anonymous user; RLS limits
-- every row to its owner. No sign-in screen is needed, and the anon key alone cannot read other users' rows.

create table if not exists public.trips (
  owner_id         uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id               text        not null check (id ~ '^[A-Za-z0-9_-]{3,64}$'),
  data             jsonb       not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 1000000),
  schema_version   integer     not null default 1,
  destination_name text        not null default '',
  arrival_date     date,
  departure_date   date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,               -- soft delete so other devices learn about deletions
  primary key (owner_id, id)
);

create index if not exists trips_owner_updated_idx on public.trips (owner_id, updated_at desc);

alter table public.trips enable row level security;

-- Anonymous users are authenticated users (role "authenticated") with is_anonymous = true.
drop policy if exists trips_select_own on public.trips;
create policy trips_select_own on public.trips for select to authenticated using (owner_id = auth.uid());
drop policy if exists trips_insert_own on public.trips;
create policy trips_insert_own on public.trips for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists trips_update_own on public.trips;
create policy trips_update_own on public.trips for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists trips_delete_own on public.trips;
create policy trips_delete_own on public.trips for delete to authenticated using (owner_id = auth.uid());

revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;
