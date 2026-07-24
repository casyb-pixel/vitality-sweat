-- Vitality Engine member app schema:
-- fitness discovery profiles, exercise catalog, workout logging,
-- meal plans, and curated video library.

-- ---------------------------------------------------------------------------
-- fitness_profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table if not exists public.fitness_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  sex text check (sex is null or sex in ('male', 'female')),
  birthdate date,
  unit_system text not null default 'imperial'
    check (unit_system in ('imperial', 'metric')),
  height_in numeric check (height_in is null or height_in > 0),
  weight_lb numeric check (weight_lb is null or weight_lb > 0),
  waist_in numeric check (waist_in is null or waist_in > 0),
  fitness_level text
    check (
      fitness_level is null
      or fitness_level in ('beginner', 'intermediate', 'advanced')
    ),
  primary_goal text
    check (
      primary_goal is null
      or primary_goal in (
        'target_weight',
        'marathon_training',
        'sports_training',
        'general_fitness',
        'muscle_gain',
        'endurance'
      )
    ),
  target_weight_lb numeric check (target_weight_lb is null or target_weight_lb > 0),
  goal_details jsonb not null default '{}'::jsonb,
  disliked_foods text[] not null default '{}',
  food_allergies text[] not null default '{}',
  health_conditions text[] not null default '{}',
  activity_restrictions text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists fitness_profiles_set_updated_at on public.fitness_profiles;
create trigger fitness_profiles_set_updated_at
  before update on public.fitness_profiles
  for each row
  execute function public.set_updated_at();

alter table public.fitness_profiles enable row level security;

drop policy if exists "Users read own fitness profile" on public.fitness_profiles;
create policy "Users read own fitness profile"
  on public.fitness_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own fitness profile" on public.fitness_profiles;
create policy "Users insert own fitness profile"
  on public.fitness_profiles
  for insert
  to authenticated
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "Users update own fitness profile" on public.fitness_profiles;
create policy "Users update own fitness profile"
  on public.fitness_profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage fitness profiles" on public.fitness_profiles;
create policy "Admins manage fitness profiles"
  on public.fitness_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.fitness_profiles to authenticated;
grant all on public.fitness_profiles to service_role;

-- ---------------------------------------------------------------------------
-- exercises (shared catalog + optional user customs)
-- ---------------------------------------------------------------------------

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'strength',
  primary_muscle text,
  equipment text,
  tracking_type text not null default 'weight_reps'
    check (tracking_type in ('weight_reps', 'reps_only', 'duration', 'distance')),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_active_idx
  on public.exercises (is_active)
  where is_active = true;

create index if not exists exercises_created_by_idx
  on public.exercises (created_by);

create unique index if not exists exercises_global_name_unique
  on public.exercises (lower(name))
  where created_by is null;

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row
  execute function public.set_updated_at();

alter table public.exercises enable row level security;

drop policy if exists "Read active or own exercises" on public.exercises;
create policy "Read active or own exercises"
  on public.exercises
  for select
  to authenticated
  using (
    is_active = true
    or created_by = auth.uid()
    or public.is_staff()
  );

drop policy if exists "Users insert own custom exercises" on public.exercises;
create policy "Users insert own custom exercises"
  on public.exercises
  for insert
  to authenticated
  with check (
    public.is_staff()
    or created_by = auth.uid()
  );

drop policy if exists "Staff manage exercises" on public.exercises;
create policy "Staff manage exercises"
  on public.exercises
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Users update own custom exercises" on public.exercises;
create policy "Users update own custom exercises"
  on public.exercises
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant select, insert, update on public.exercises to authenticated;
grant all on public.exercises to service_role;

insert into public.exercises (name, category, primary_muscle, equipment, tracking_type)
values
  ('Dumbbell Curl', 'strength', 'biceps', 'dumbbell', 'weight_reps'),
  ('Barbell Bench Press', 'strength', 'chest', 'barbell', 'weight_reps'),
  ('Incline Dumbbell Press', 'strength', 'chest', 'dumbbell', 'weight_reps'),
  ('Barbell Back Squat', 'strength', 'quads', 'barbell', 'weight_reps'),
  ('Romanian Deadlift', 'strength', 'hamstrings', 'barbell', 'weight_reps'),
  ('Conventional Deadlift', 'strength', 'posterior_chain', 'barbell', 'weight_reps'),
  ('Overhead Press', 'strength', 'shoulders', 'barbell', 'weight_reps'),
  ('Lateral Raise', 'strength', 'shoulders', 'dumbbell', 'weight_reps'),
  ('Lat Pulldown', 'strength', 'back', 'cable', 'weight_reps'),
  ('Seated Cable Row', 'strength', 'back', 'cable', 'weight_reps'),
  ('Pull-Up', 'strength', 'back', 'bodyweight', 'reps_only'),
  ('Push-Up', 'strength', 'chest', 'bodyweight', 'reps_only'),
  ('Walking Lunge', 'strength', 'quads', 'dumbbell', 'weight_reps'),
  ('Leg Press', 'strength', 'quads', 'machine', 'weight_reps'),
  ('Leg Curl', 'strength', 'hamstrings', 'machine', 'weight_reps'),
  ('Calf Raise', 'strength', 'calves', 'machine', 'weight_reps'),
  ('Plank', 'core', 'core', 'bodyweight', 'duration'),
  ('Hanging Leg Raise', 'core', 'core', 'bodyweight', 'reps_only'),
  ('Tricep Pushdown', 'strength', 'triceps', 'cable', 'weight_reps'),
  ('Face Pull', 'strength', 'rear_delts', 'cable', 'weight_reps'),
  ('Treadmill Run', 'cardio', 'cardio', 'treadmill', 'distance'),
  ('Assault Bike', 'cardio', 'cardio', 'bike', 'duration')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_idx
  on public.workout_sessions (user_id);

create index if not exists workout_sessions_status_idx
  on public.workout_sessions (user_id, status);

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row
  execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

drop policy if exists "Users read own workout sessions" on public.workout_sessions;
create policy "Users read own workout sessions"
  on public.workout_sessions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own workout sessions" on public.workout_sessions;
create policy "Users insert own workout sessions"
  on public.workout_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own workout sessions" on public.workout_sessions;
create policy "Users update own workout sessions"
  on public.workout_sessions
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage workout sessions" on public.workout_sessions;
create policy "Admins manage workout sessions"
  on public.workout_sessions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.workout_sessions to authenticated;
grant all on public.workout_sessions to service_role;

-- ---------------------------------------------------------------------------
-- workout_sets
-- ---------------------------------------------------------------------------

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null
    references public.exercises (id) on delete restrict,
  set_number integer not null check (set_number > 0),
  weight_lb numeric check (weight_lb is null or weight_lb >= 0),
  reps integer check (reps is null or reps >= 0),
  difficulty integer not null check (difficulty between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_session_id_idx
  on public.workout_sets (session_id);

create index if not exists workout_sets_exercise_id_idx
  on public.workout_sets (exercise_id);

alter table public.workout_sets enable row level security;

drop policy if exists "Users read own workout sets" on public.workout_sets;
create policy "Users read own workout sets"
  on public.workout_sets
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = workout_sets.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own workout sets" on public.workout_sets;
create policy "Users insert own workout sets"
  on public.workout_sets
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = workout_sets.session_id
        and s.user_id = auth.uid()
        and s.status = 'active'
    )
  );

drop policy if exists "Users update own workout sets" on public.workout_sets;
create policy "Users update own workout sets"
  on public.workout_sets
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = workout_sets.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = workout_sets.session_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete own workout sets" on public.workout_sets;
create policy "Users delete own workout sets"
  on public.workout_sets
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_sessions s
      where s.id = workout_sets.session_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.workout_sets to authenticated;
grant all on public.workout_sets to service_role;

-- ---------------------------------------------------------------------------
-- meal_plans
-- ---------------------------------------------------------------------------

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  plan jsonb not null default '{}'::jsonb,
  grocery_list jsonb not null default '[]'::jsonb,
  snacks jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_plans_user_id_idx
  on public.meal_plans (user_id);

create index if not exists meal_plans_week_start_idx
  on public.meal_plans (user_id, week_start desc);

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
  before update on public.meal_plans
  for each row
  execute function public.set_updated_at();

alter table public.meal_plans enable row level security;

drop policy if exists "Users read own meal plans" on public.meal_plans;
create policy "Users read own meal plans"
  on public.meal_plans
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own meal plans" on public.meal_plans;
create policy "Users insert own meal plans"
  on public.meal_plans
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users update own meal plans" on public.meal_plans;
create policy "Users update own meal plans"
  on public.meal_plans
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage meal plans" on public.meal_plans;
create policy "Admins manage meal plans"
  on public.meal_plans
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.meal_plans to authenticated;
grant all on public.meal_plans to service_role;

-- ---------------------------------------------------------------------------
-- videos (curated YouTube/Vimeo catalog)
-- ---------------------------------------------------------------------------

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  provider text not null
    check (provider in ('youtube', 'vimeo')),
  video_url text not null,
  thumbnail_url text,
  category text not null default 'training',
  published_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_active_idx
  on public.videos (is_active)
  where is_active = true;

create index if not exists videos_category_idx
  on public.videos (category);

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row
  execute function public.set_updated_at();

alter table public.videos enable row level security;

drop policy if exists "Read active videos" on public.videos;
create policy "Read active videos"
  on public.videos
  for select
  to authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Staff manage videos" on public.videos;
create policy "Staff manage videos"
  on public.videos
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.videos to authenticated;
grant insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;

insert into public.videos (
  title,
  description,
  provider,
  video_url,
  thumbnail_url,
  category,
  published_at,
  is_active
)
values
  (
    'Train with purpose — Vitality Sweat intro',
    'Hunter Broussard on showing up stronger in the gym, on the field, and in everyday life.',
    'youtube',
    'https://www.youtube.com/@vitalitysweat',
    null,
    'motivation',
    now(),
    true
  ),
  (
    'Sweatlife training session',
    'Instructional and motivational training content from the Vitality Sweat channel.',
    'youtube',
    'https://www.youtube.com/@vitalitysweat',
    null,
    'training',
    now(),
    true
  ),
  (
    'Fuel for performance',
    'Nutrition-minded tips that fit real life in Southwest Louisiana.',
    'youtube',
    'https://www.youtube.com/@vitalitysweat',
    null,
    'nutrition',
    now(),
    true
  )
on conflict do nothing;
