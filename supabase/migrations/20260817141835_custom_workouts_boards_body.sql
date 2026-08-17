-- Custom programs, body logs, leaderboard opt-ins, cardio difficulty, session coach.

-- ---------------------------------------------------------------------------
-- fitness_profiles: opt-ins + custom split
-- ---------------------------------------------------------------------------

alter table public.fitness_profiles
  add column if not exists leaderboard_opt_in boolean not null default true,
  add column if not exists session_coach_opt_in boolean not null default true;

alter table public.fitness_profiles
  drop constraint if exists fitness_profiles_preferred_split_check;

alter table public.fitness_profiles
  add constraint fitness_profiles_preferred_split_check
  check (
    preferred_split is null
    or preferred_split in (
      'full_body',
      'upper_lower',
      'push_pull_legs',
      'ai_choose',
      'custom'
    )
  );

comment on column public.fitness_profiles.leaderboard_opt_in is
  'When false, hide Engine Room boards and exclude this member from rankings.';
comment on column public.fitness_profiles.session_coach_opt_in is
  'When false, skip start-of-workout coach comments and crossover challenges.';

-- ---------------------------------------------------------------------------
-- workout_programs.origin
-- ---------------------------------------------------------------------------

alter table public.workout_programs
  add column if not exists origin text not null default 'ai';

alter table public.workout_programs
  drop constraint if exists workout_programs_origin_check;

alter table public.workout_programs
  add constraint workout_programs_origin_check
  check (origin in ('ai', 'template', 'custom'));

comment on column public.workout_programs.origin is
  'How the program was created: ai draft, named template, or member-built split.';

-- ---------------------------------------------------------------------------
-- session snapshot + coach brief
-- ---------------------------------------------------------------------------

alter table public.workout_sessions
  add column if not exists body_weight_lb numeric,
  add column if not exists coach_brief jsonb;

comment on column public.workout_sessions.body_weight_lb is
  'Bodyweight snapshot at session start for pound-for-pound scoring.';
comment on column public.workout_sessions.coach_brief is
  'Cached start-of-workout coach payload so resume does not re-call the model.';

-- ---------------------------------------------------------------------------
-- cardio difficulty on sets
-- ---------------------------------------------------------------------------

alter table public.workout_sets
  add column if not exists incline_pct numeric,
  add column if not exists elevation_m numeric;

comment on column public.workout_sets.incline_pct is
  'Treadmill or similar incline percent for the set, nullable.';
comment on column public.workout_sets.elevation_m is
  'Elevation gain in meters for the set, nullable.';

-- ---------------------------------------------------------------------------
-- body_weight_logs
-- ---------------------------------------------------------------------------

create table if not exists public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null default (timezone('utc', now()))::date,
  weight_lb numeric not null check (weight_lb > 0 and weight_lb < 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create index if not exists body_weight_logs_user_id_idx
  on public.body_weight_logs (user_id, recorded_on desc);

drop trigger if exists body_weight_logs_set_updated_at on public.body_weight_logs;
create trigger body_weight_logs_set_updated_at
  before update on public.body_weight_logs
  for each row
  execute function public.set_updated_at();

alter table public.body_weight_logs enable row level security;

drop policy if exists "Users read own body weight logs" on public.body_weight_logs;
create policy "Users read own body weight logs"
  on public.body_weight_logs
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own body weight logs" on public.body_weight_logs;
create policy "Users insert own body weight logs"
  on public.body_weight_logs
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own body weight logs" on public.body_weight_logs;
create policy "Users update own body weight logs"
  on public.body_weight_logs
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users delete own body weight logs" on public.body_weight_logs;
create policy "Users delete own body weight logs"
  on public.body_weight_logs
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage body weight logs" on public.body_weight_logs;
create policy "Admins manage body weight logs"
  on public.body_weight_logs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.body_weight_logs to authenticated;
grant all on public.body_weight_logs to service_role;

insert into public.body_weight_logs (user_id, recorded_on, weight_lb)
select
  fp.id,
  coalesce(fp.onboarding_completed_at::date, timezone('utc', now())::date),
  fp.weight_lb
from public.fitness_profiles fp
where fp.weight_lb is not null
  and fp.weight_lb > 0
on conflict (user_id, recorded_on) do nothing;

-- ---------------------------------------------------------------------------
-- body_measurement_logs
-- ---------------------------------------------------------------------------

create table if not exists public.body_measurement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_on date not null default (timezone('utc', now()))::date,
  neck_in numeric check (neck_in is null or (neck_in > 0 and neck_in < 80)),
  shoulders_in numeric check (shoulders_in is null or (shoulders_in > 0 and shoulders_in < 120)),
  chest_in numeric check (chest_in is null or (chest_in > 0 and chest_in < 120)),
  bicep_in numeric check (bicep_in is null or (bicep_in > 0 and bicep_in < 40)),
  waist_in numeric check (waist_in is null or (waist_in > 0 and waist_in < 100)),
  hip_in numeric check (hip_in is null or (hip_in > 0 and hip_in < 120)),
  thigh_in numeric check (thigh_in is null or (thigh_in > 0 and thigh_in < 60)),
  calf_in numeric check (calf_in is null or (calf_in > 0 and calf_in < 40)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create index if not exists body_measurement_logs_user_id_idx
  on public.body_measurement_logs (user_id, recorded_on desc);

drop trigger if exists body_measurement_logs_set_updated_at on public.body_measurement_logs;
create trigger body_measurement_logs_set_updated_at
  before update on public.body_measurement_logs
  for each row
  execute function public.set_updated_at();

alter table public.body_measurement_logs enable row level security;

drop policy if exists "Users read own body measurement logs" on public.body_measurement_logs;
create policy "Users read own body measurement logs"
  on public.body_measurement_logs
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own body measurement logs" on public.body_measurement_logs;
create policy "Users insert own body measurement logs"
  on public.body_measurement_logs
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own body measurement logs" on public.body_measurement_logs;
create policy "Users update own body measurement logs"
  on public.body_measurement_logs
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users delete own body measurement logs" on public.body_measurement_logs;
create policy "Users delete own body measurement logs"
  on public.body_measurement_logs
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage body measurement logs" on public.body_measurement_logs;
create policy "Admins manage body measurement logs"
  on public.body_measurement_logs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.body_measurement_logs to authenticated;
grant all on public.body_measurement_logs to service_role;
