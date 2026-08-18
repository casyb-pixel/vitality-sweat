-- Gym check-in (name only, no geolocation) and YouTube live clip metadata.

create table if not exists public.gym_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  metro text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gym_directory_name_idx
  on public.gym_directory (name);

alter table public.gym_directory enable row level security;

drop policy if exists "Members read gym directory" on public.gym_directory;
create policy "Members read gym directory"
  on public.gym_directory
  for select to authenticated
  using (true);

drop policy if exists "Members insert gym directory" on public.gym_directory;
create policy "Members insert gym directory"
  on public.gym_directory
  for insert to authenticated
  with check (created_by = auth.uid());

grant select, insert on public.gym_directory to authenticated;
grant all on public.gym_directory to service_role;

comment on table public.gym_directory is
  'Member-entered gym names for check-in. No coordinates. Partner gyms stay in gym_locations.';

alter table public.workout_sessions
  add column if not exists gym_location_id uuid
    references public.gym_locations (id) on delete set null;

alter table public.workout_sessions
  add column if not exists gym_directory_id uuid
    references public.gym_directory (id) on delete set null;

alter table public.workout_sessions
  add column if not exists gym_name text;

comment on column public.workout_sessions.gym_name is
  'Display name of the gym the member checked into. Typed or picked. No GPS.';

alter table public.videos
  add column if not exists start_sec integer
    check (start_sec is null or start_sec >= 0);

alter table public.videos
  add column if not exists end_sec integer
    check (end_sec is null or end_sec >= 0);

alter table public.videos
  add column if not exists source_url text;

alter table public.videos
  add column if not exists gym_name text;

alter table public.videos
  add column if not exists exercise_id uuid
    references public.exercises (id) on delete set null;

comment on column public.videos.source_url is
  'YouTube live or VOD this clip was cut from. Playback uses start_sec/end_sec on the embed.';
