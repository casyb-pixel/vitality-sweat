-- AI-generated workout programs linked to the exercise catalog and set logging.

-- ---------------------------------------------------------------------------
-- workout_programs
-- ---------------------------------------------------------------------------

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  primary_goal text
    check (
      primary_goal is null
      or primary_goal in (
        'weight_loss',
        'muscle_gain',
        'strength',
        'endurance',
        'general_fitness',
        'sports_training',
        'marathon_training'
      )
    ),
  days_per_week integer
    check (days_per_week is null or (days_per_week >= 1 and days_per_week <= 7)),
  session_minutes integer
    check (session_minutes is null or (session_minutes >= 5 and session_minutes <= 180)),
  summary text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_programs_user_id_idx
  on public.workout_programs (user_id);

create index if not exists workout_programs_status_idx
  on public.workout_programs (user_id, status);

drop trigger if exists workout_programs_set_updated_at on public.workout_programs;
create trigger workout_programs_set_updated_at
  before update on public.workout_programs
  for each row
  execute function public.set_updated_at();

alter table public.workout_programs enable row level security;

drop policy if exists "Users read own workout programs" on public.workout_programs;
create policy "Users read own workout programs"
  on public.workout_programs
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own workout programs" on public.workout_programs;
create policy "Users insert own workout programs"
  on public.workout_programs
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own workout programs" on public.workout_programs;
create policy "Users update own workout programs"
  on public.workout_programs
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users delete own workout programs" on public.workout_programs;
create policy "Users delete own workout programs"
  on public.workout_programs
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage workout programs" on public.workout_programs;
create policy "Admins manage workout programs"
  on public.workout_programs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.workout_programs to authenticated;
grant all on public.workout_programs to service_role;

-- ---------------------------------------------------------------------------
-- workout_program_days
-- ---------------------------------------------------------------------------

create table if not exists public.workout_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null
    references public.workout_programs (id) on delete cascade,
  day_index integer not null check (day_index >= 0),
  label text not null,
  focus text,
  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, day_index)
);

create index if not exists workout_program_days_program_id_idx
  on public.workout_program_days (program_id);

drop trigger if exists workout_program_days_set_updated_at on public.workout_program_days;
create trigger workout_program_days_set_updated_at
  before update on public.workout_program_days
  for each row
  execute function public.set_updated_at();

alter table public.workout_program_days enable row level security;

drop policy if exists "Users read own workout program days" on public.workout_program_days;
create policy "Users read own workout program days"
  on public.workout_program_days
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_programs p
      where p.id = workout_program_days.program_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own workout program days" on public.workout_program_days;
create policy "Users insert own workout program days"
  on public.workout_program_days
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_programs p
      where p.id = workout_program_days.program_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users update own workout program days" on public.workout_program_days;
create policy "Users update own workout program days"
  on public.workout_program_days
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_programs p
      where p.id = workout_program_days.program_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_programs p
      where p.id = workout_program_days.program_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete own workout program days" on public.workout_program_days;
create policy "Users delete own workout program days"
  on public.workout_program_days
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_programs p
      where p.id = workout_program_days.program_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage workout program days" on public.workout_program_days;
create policy "Admins manage workout program days"
  on public.workout_program_days
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.workout_program_days to authenticated;
grant all on public.workout_program_days to service_role;

-- ---------------------------------------------------------------------------
-- workout_program_exercises
-- ---------------------------------------------------------------------------

create table if not exists public.workout_program_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null
    references public.workout_program_days (id) on delete cascade,
  exercise_id uuid not null
    references public.exercises (id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  sets integer not null check (sets > 0),
  rep_min integer check (rep_min is null or rep_min > 0),
  rep_max integer check (rep_max is null or rep_max > 0),
  set_style text not null default 'hypertrophy'
    check (
      set_style in (
        'strength_heavy',
        'hypertrophy',
        'endurance_light',
        'metabolic'
      )
    ),
  rest_sec integer check (rest_sec is null or rest_sec >= 0),
  coach_notes text,
  baseline_weight_lb numeric check (baseline_weight_lb is null or baseline_weight_lb >= 0),
  baseline_reps integer check (baseline_reps is null or baseline_reps >= 0),
  created_at timestamptz not null default now(),
  check (rep_max is null or rep_min is null or rep_max >= rep_min)
);

create index if not exists workout_program_exercises_day_id_idx
  on public.workout_program_exercises (day_id);

create index if not exists workout_program_exercises_exercise_id_idx
  on public.workout_program_exercises (exercise_id);

create index if not exists workout_program_exercises_day_sort_idx
  on public.workout_program_exercises (day_id, sort_order);

alter table public.workout_program_exercises enable row level security;

drop policy if exists "Users read own workout program exercises" on public.workout_program_exercises;
create policy "Users read own workout program exercises"
  on public.workout_program_exercises
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = workout_program_exercises.day_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own workout program exercises" on public.workout_program_exercises;
create policy "Users insert own workout program exercises"
  on public.workout_program_exercises
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = workout_program_exercises.day_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users update own workout program exercises" on public.workout_program_exercises;
create policy "Users update own workout program exercises"
  on public.workout_program_exercises
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = workout_program_exercises.day_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = workout_program_exercises.day_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete own workout program exercises" on public.workout_program_exercises;
create policy "Users delete own workout program exercises"
  on public.workout_program_exercises
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_program_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = workout_program_exercises.day_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage workout program exercises" on public.workout_program_exercises;
create policy "Admins manage workout program exercises"
  on public.workout_program_exercises
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.workout_program_exercises to authenticated;
grant all on public.workout_program_exercises to service_role;

-- ---------------------------------------------------------------------------
-- Link logged sessions to a planned program day
-- ---------------------------------------------------------------------------

alter table public.workout_sessions
  add column if not exists program_day_id uuid
    references public.workout_program_days (id) on delete set null;

create index if not exists workout_sessions_program_day_id_idx
  on public.workout_sessions (program_day_id)
  where program_day_id is not null;

-- Tighten session write checks so program_day_id must belong to the same user.
drop policy if exists "Users insert own workout sessions" on public.workout_sessions;
create policy "Users insert own workout sessions"
  on public.workout_sessions
  for insert
  to authenticated
  with check (
    (user_id = auth.uid() or public.is_admin())
    and (
      program_day_id is null
      or public.is_admin()
      or exists (
        select 1
        from public.workout_program_days d
        join public.workout_programs p on p.id = d.program_id
        where d.id = program_day_id
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users update own workout sessions" on public.workout_sessions;
create policy "Users update own workout sessions"
  on public.workout_sessions
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (
    (user_id = auth.uid() or public.is_admin())
    and (
      program_day_id is null
      or public.is_admin()
      or exists (
        select 1
        from public.workout_program_days d
        join public.workout_programs p on p.id = d.program_id
        where d.id = program_day_id
          and p.user_id = auth.uid()
      )
    )
  );
