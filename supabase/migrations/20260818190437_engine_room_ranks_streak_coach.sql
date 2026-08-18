-- Engine Room personal ranks, posting streak, and coach thread.

alter table public.engine_room_posts
  add column if not exists session_id uuid references public.workout_sessions (id) on delete set null;

alter table public.engine_room_posts
  drop constraint if exists engine_room_posts_kind_check;

alter table public.engine_room_posts
  add constraint engine_room_posts_kind_check
  check (kind in ('text', 'photo', 'win', 'promo', 'session'));

create unique index if not exists engine_room_posts_session_unique
  on public.engine_room_posts (author_id, session_id)
  where kind = 'session' and deleted_at is null and session_id is not null;

create table if not exists public.engine_room_session_ranks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  score numeric not null,
  band text check (band is null or band in ('bronze', 'silver', 'gold')),
  detail text not null,
  kind text not null check (kind in ('loaded', 'bodyweight')),
  created_at timestamptz not null default now(),
  unique (user_id, session_id, exercise_id)
);

create index if not exists engine_room_session_ranks_user_idx
  on public.engine_room_session_ranks (user_id, created_at desc);

create table if not exists public.engine_room_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  last_posted_on date,
  updated_at timestamptz not null default now()
);

create table if not exists public.engine_room_coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists engine_room_coach_messages_user_idx
  on public.engine_room_coach_messages (user_id, created_at desc);

alter table public.engine_room_session_ranks enable row level security;
alter table public.engine_room_streaks enable row level security;
alter table public.engine_room_coach_messages enable row level security;

drop policy if exists "Users read own Engine Room ranks" on public.engine_room_session_ranks;
create policy "Users read own Engine Room ranks"
  on public.engine_room_session_ranks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own Engine Room ranks" on public.engine_room_session_ranks;
create policy "Users insert own Engine Room ranks"
  on public.engine_room_session_ranks
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users read own Engine Room streak" on public.engine_room_streaks;
create policy "Users read own Engine Room streak"
  on public.engine_room_streaks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users upsert own Engine Room streak" on public.engine_room_streaks;
create policy "Users upsert own Engine Room streak"
  on public.engine_room_streaks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users read own Engine Room coach" on public.engine_room_coach_messages;
create policy "Users read own Engine Room coach"
  on public.engine_room_coach_messages
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own Engine Room coach" on public.engine_room_coach_messages;
create policy "Users insert own Engine Room coach"
  on public.engine_room_coach_messages
  for insert to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.engine_room_session_ranks to authenticated;
grant all on public.engine_room_session_ranks to service_role;

grant select, insert, update, delete on public.engine_room_streaks to authenticated;
grant all on public.engine_room_streaks to service_role;

grant select, insert on public.engine_room_coach_messages to authenticated;
grant all on public.engine_room_coach_messages to service_role;

comment on table public.engine_room_session_ranks is
  'Personal lift ranks banked when a completed session is posted to The Engine Room.';
comment on table public.engine_room_streaks is
  'Posting streak for Engine Room session posts. 3-day grace, rest days count.';
comment on table public.engine_room_coach_messages is
  'Persistent Engine coach thread. Member to Engine only, not member DMs.';
