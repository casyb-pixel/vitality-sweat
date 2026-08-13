-- Dominance roadmap foundation: logging depth, creator OS, programs, social lite, monetization.

-- ---------------------------------------------------------------------------
-- A1: set logging extras + member settings
-- ---------------------------------------------------------------------------

alter table public.workout_sets
  add column if not exists duration_sec integer
    check (duration_sec is null or duration_sec >= 0);

alter table public.workout_sets
  add column if not exists distance_m numeric
    check (distance_m is null or distance_m >= 0);

alter table public.workout_sets
  add column if not exists set_kind text not null default 'working'
    check (set_kind in ('warmup', 'working', 'drop', 'failure', 'timed'));

alter table public.fitness_profiles
  add column if not exists default_rest_sec integer
    check (default_rest_sec is null or (default_rest_sec >= 15 and default_rest_sec <= 600));

alter table public.fitness_profiles
  add column if not exists notifications_opt_in boolean not null default false;

alter table public.workout_program_exercises
  add column if not exists superset_group text;

create index if not exists workout_program_exercises_superset_idx
  on public.workout_program_exercises (day_id, superset_group)
  where superset_group is not null;

-- ---------------------------------------------------------------------------
-- Exercises: public encyclopedia fields
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column if not exists slug text;

alter table public.exercises
  add column if not exists cues text[] not null default '{}';

alter table public.exercises
  add column if not exists secondary_muscles text[] not null default '{}';

alter table public.exercises
  add column if not exists how_to text;

update public.exercises
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists exercises_slug_unique
  on public.exercises (slug)
  where slug is not null and created_by is null;

-- Public can read the shared catalog (encyclopedia + tools).
drop policy if exists "Public read shared exercises" on public.exercises;
create policy "Public read shared exercises"
  on public.exercises
  for select
  to anon, authenticated
  using (is_active = true and created_by is null);

-- ---------------------------------------------------------------------------
-- A4: editorial taxonomy + scheduled publish
-- ---------------------------------------------------------------------------

alter table public.posts
  drop constraint if exists posts_status_check;

alter table public.posts
  add constraint posts_status_check
  check (status in ('draft', 'scheduled', 'published'));

alter table public.posts
  add column if not exists cluster text
    check (
      cluster is null
      or cluster in ('train', 'fuel', 'mindset', 'baseball', 'beginner', 'gear', 'local')
    );

alter table public.posts
  add column if not exists editorial_status text not null default 'draft'
    check (
      editorial_status in ('idea', 'filming', 'draft', 'scheduled', 'published')
    );

alter table public.posts
  add column if not exists keyword_brief jsonb not null default '{}'::jsonb;

alter table public.posts
  add column if not exists due_at timestamptz;

create index if not exists posts_cluster_idx on public.posts (cluster);
create index if not exists posts_editorial_status_idx on public.posts (editorial_status);
create index if not exists posts_due_at_idx on public.posts (due_at);

-- ---------------------------------------------------------------------------
-- A4b: Hunter Daily Brief
-- ---------------------------------------------------------------------------

create table if not exists public.creator_tasks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  due_at timestamptz not null,
  kind text not null
    check (
      kind in (
        'blog_draft',
        'blog_publish',
        'film_howto',
        'film_app_invite',
        'post_instagram',
        'post_tiktok',
        'post_facebook',
        'post_x',
        'approve_covers',
        'rehearse_script'
      )
    ),
  title text not null,
  deep_link text not null default '/app/creator',
  status text not null default 'pending'
    check (status in ('pending', 'done', 'snoozed')),
  script_id uuid,
  source_post_id uuid references public.posts (id) on delete set null,
  snooze_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_tasks_creator_due_idx
  on public.creator_tasks (creator_id, due_at, status);

alter table public.creator_tasks enable row level security;

drop policy if exists "Creators manage own tasks" on public.creator_tasks;
create policy "Creators manage own tasks"
  on public.creator_tasks
  for all
  to authenticated
  using (
    creator_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  )
  with check (
    creator_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

grant select, insert, update, delete on public.creator_tasks to authenticated;
grant all on public.creator_tasks to service_role;

create table if not exists public.creator_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.creator_push_subscriptions enable row level security;

drop policy if exists "Creators manage own push" on public.creator_push_subscriptions;
create policy "Creators manage own push"
  on public.creator_push_subscriptions
  for all
  to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

grant select, insert, update, delete on public.creator_push_subscriptions to authenticated;
grant all on public.creator_push_subscriptions to service_role;

create table if not exists public.creator_calendar_tokens (
  creator_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.creator_calendar_tokens enable row level security;

drop policy if exists "Creators read own calendar token" on public.creator_calendar_tokens;
create policy "Creators read own calendar token"
  on public.creator_calendar_tokens
  for select
  to authenticated
  using (creator_id = auth.uid());

grant select on public.creator_calendar_tokens to authenticated;
grant all on public.creator_calendar_tokens to service_role;

-- ---------------------------------------------------------------------------
-- B: named program templates (public SEO + Engine start)
-- ---------------------------------------------------------------------------

create table if not exists public.program_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  days_per_week integer not null check (days_per_week between 2 and 7),
  session_minutes integer not null default 45,
  equipment text[] not null default '{}',
  audience text not null default '17-25',
  body_markdown text not null default '',
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_templates (id) on delete cascade,
  day_index integer not null,
  label text not null,
  focus text,
  notes text,
  unique (template_id, day_index)
);

create table if not exists public.program_template_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_template_days (id) on delete cascade,
  exercise_name text not null,
  sort_order integer not null default 0,
  sets integer not null default 3,
  rep_min integer,
  rep_max integer,
  rest_sec integer,
  coach_notes text,
  superset_group text
);

alter table public.program_templates enable row level security;
alter table public.program_template_days enable row level security;
alter table public.program_template_exercises enable row level security;

drop policy if exists "Public read published programs" on public.program_templates;
create policy "Public read published programs"
  on public.program_templates for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Public read program days" on public.program_template_days;
create policy "Public read program days"
  on public.program_template_days for select to anon, authenticated
  using (
    exists (
      select 1 from public.program_templates t
      where t.id = template_id and t.is_published = true
    )
  );

drop policy if exists "Public read program exercises" on public.program_template_exercises;
create policy "Public read program exercises"
  on public.program_template_exercises for select to anon, authenticated
  using (
    exists (
      select 1
      from public.program_template_days d
      join public.program_templates t on t.id = d.template_id
      where d.id = day_id and t.is_published = true
    )
  );

grant select on public.program_templates to anon, authenticated;
grant select on public.program_template_days to anon, authenticated;
grant select on public.program_template_exercises to anon, authenticated;
grant all on public.program_templates to service_role;
grant all on public.program_template_days to service_role;
grant all on public.program_template_exercises to service_role;

-- ---------------------------------------------------------------------------
-- B: Sweat Score snapshots + daily fuel log
-- ---------------------------------------------------------------------------

create table if not exists public.sweat_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  score integer not null check (score between 0 and 100),
  training_score integer not null default 0,
  overload_score integer not null default 0,
  fuel_score integer not null default 0,
  recovery_score integer not null default 0,
  streak_days integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.sweat_score_snapshots enable row level security;

drop policy if exists "Users read own sweat score" on public.sweat_score_snapshots;
create policy "Users read own sweat score"
  on public.sweat_score_snapshots for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users upsert own sweat score" on public.sweat_score_snapshots;
create policy "Users upsert own sweat score"
  on public.sweat_score_snapshots for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update own sweat score" on public.sweat_score_snapshots;
create policy "Users update own sweat score"
  on public.sweat_score_snapshots for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.sweat_score_snapshots to authenticated;
grant all on public.sweat_score_snapshots to service_role;

create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  water_oz numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

alter table public.fuel_logs enable row level security;

drop policy if exists "Users manage own fuel logs" on public.fuel_logs;
create policy "Users manage own fuel logs"
  on public.fuel_logs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.fuel_logs to authenticated;
grant all on public.fuel_logs to service_role;

-- ---------------------------------------------------------------------------
-- C: affiliates, follows, gyms, gear, Engine Plus flag
-- ---------------------------------------------------------------------------

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  partner text not null,
  network text not null default 'direct',
  label text not null,
  destination_url text not null,
  disclosure text not null default 'We may earn a commission if you buy through this link.',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.affiliate_links enable row level security;

drop policy if exists "Public read active affiliates" on public.affiliate_links;
create policy "Public read active affiliates"
  on public.affiliate_links for select to anon, authenticated
  using (is_active = true);

grant select on public.affiliate_links to anon, authenticated;
grant all on public.affiliate_links to service_role;

create table if not exists public.member_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.member_follows enable row level security;

drop policy if exists "Users manage own follows" on public.member_follows;
create policy "Users manage own follows"
  on public.member_follows for all to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

drop policy if exists "Users see who follows them" on public.member_follows;
create policy "Users see who follows them"
  on public.member_follows for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

grant select, insert, delete on public.member_follows to authenticated;
grant all on public.member_follows to service_role;

create table if not exists public.gym_locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  metro text,
  invite_code text not null unique,
  contact_email text,
  monthly_price_cents integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.gym_locations enable row level security;

drop policy if exists "Public read active gyms" on public.gym_locations;
create policy "Public read active gyms"
  on public.gym_locations for select to anon, authenticated
  using (is_active = true);

grant select on public.gym_locations to anon, authenticated;
grant all on public.gym_locations to service_role;

create table if not exists public.gear_reviews (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  category text not null default 'dorm'
    check (category in ('dorm', 'gym-bag', 'baseball', 'fuel', 'shoes', 'home')),
  affiliate_slug text,
  is_published boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.gear_reviews enable row level security;

drop policy if exists "Public read published gear" on public.gear_reviews;
create policy "Public read published gear"
  on public.gear_reviews for select to anon, authenticated
  using (is_published = true);

grant select on public.gear_reviews to anon, authenticated;
grant all on public.gear_reviews to service_role;

alter table public.profiles
  add column if not exists engine_plus boolean not null default false;

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.sponsor_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  business text,
  package_id text,
  market text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.sponsor_inquiries enable row level security;

drop policy if exists "Anyone insert sponsor inquiry" on public.sponsor_inquiries;
create policy "Anyone insert sponsor inquiry"
  on public.sponsor_inquiries for insert to anon, authenticated
  with check (true);

drop policy if exists "Creators read sponsor inquiries" on public.sponsor_inquiries;
create policy "Creators read sponsor inquiries"
  on public.sponsor_inquiries for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'));

grant insert on public.sponsor_inquiries to anon, authenticated;
grant select on public.sponsor_inquiries to authenticated;
grant all on public.sponsor_inquiries to service_role;

-- ---------------------------------------------------------------------------
-- Contributors (Phase D)
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists contributor_slug text;
