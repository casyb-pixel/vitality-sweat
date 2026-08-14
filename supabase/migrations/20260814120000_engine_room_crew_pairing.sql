-- Crew contests, train-together pairing, and The Engine Room.

-- ---------------------------------------------------------------------------
-- Train together
-- ---------------------------------------------------------------------------

create table if not exists public.workout_session_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  host_session_id uuid references public.workout_sessions (id) on delete set null,
  host_program_day_id uuid references public.workout_program_days (id) on delete set null,
  host_referral_code text,
  day_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists workout_session_invites_host_idx
  on public.workout_session_invites (host_user_id, created_at desc);

create index if not exists workout_session_invites_token_idx
  on public.workout_session_invites (token);

alter table public.workout_sessions
  add column if not exists session_source text not null default 'solo';

alter table public.workout_sessions
  add column if not exists paired_invite_id uuid;

do $$
begin
  alter table public.workout_sessions
    add constraint workout_sessions_source_check
    check (session_source in ('solo', 'paired', 'freeform'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.workout_sessions
    add constraint workout_sessions_paired_invite_fk
    foreign key (paired_invite_id)
    references public.workout_session_invites (id)
    on delete set null;
exception
  when duplicate_object then null;
end $$;

alter table public.workout_session_invites enable row level security;

drop policy if exists "Hosts manage own workout invites" on public.workout_session_invites;
create policy "Hosts manage own workout invites"
  on public.workout_session_invites
  for all to authenticated
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

drop policy if exists "Members read unexpired workout invites" on public.workout_session_invites;
create policy "Members read unexpired workout invites"
  on public.workout_session_invites
  for select to authenticated
  using (expires_at > now());

grant select, insert, update on public.workout_session_invites to authenticated;
grant all on public.workout_session_invites to service_role;

-- ---------------------------------------------------------------------------
-- Crew contests
-- ---------------------------------------------------------------------------

create table if not exists public.referral_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prize_label text not null,
  active_needed integer not null check (active_needed >= 1),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active'
    check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.referral_campaigns (id) on delete cascade,
  promoter_id uuid not null references auth.users (id) on delete cascade,
  active_count_at_award integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'shipped', 'void')),
  prize_label text,
  shipping_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, promoter_id)
);

alter table public.referral_campaigns enable row level security;
alter table public.referral_rewards enable row level security;

drop policy if exists "Members read live referral campaigns" on public.referral_campaigns;
create policy "Members read live referral campaigns"
  on public.referral_campaigns
  for select to authenticated
  using (true);

drop policy if exists "Creators manage referral campaigns" on public.referral_campaigns;
create policy "Creators manage referral campaigns"
  on public.referral_campaigns
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'));

drop policy if exists "Members read own referral rewards" on public.referral_rewards;
create policy "Members read own referral rewards"
  on public.referral_rewards
  for select to authenticated
  using (
    promoter_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

drop policy if exists "Creators manage referral rewards" on public.referral_rewards;
create policy "Creators manage referral rewards"
  on public.referral_rewards
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'));

grant select on public.referral_campaigns to authenticated;
grant select on public.referral_rewards to authenticated;
grant insert, update, delete on public.referral_campaigns to authenticated;
grant insert, update, delete on public.referral_rewards to authenticated;
grant all on public.referral_campaigns to service_role;
grant all on public.referral_rewards to service_role;

-- ---------------------------------------------------------------------------
-- The Engine Room
-- ---------------------------------------------------------------------------

create table if not exists public.member_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.engine_room_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('text', 'photo', 'win', 'promo')),
  body text not null default '',
  image_path text,
  milestone_payload jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists engine_room_posts_author_idx
  on public.engine_room_posts (author_id, created_at desc)
  where deleted_at is null;

create table if not exists public.engine_room_reactions (
  post_id uuid not null references public.engine_room_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('fire', 'spot', 'lets_go')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.engine_room_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.engine_room_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.engine_room_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.engine_room_posts (id) on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now()
);

alter table public.member_blocks enable row level security;
alter table public.engine_room_posts enable row level security;
alter table public.engine_room_reactions enable row level security;
alter table public.engine_room_comments enable row level security;
alter table public.engine_room_reports enable row level security;

drop policy if exists "Users manage own blocks" on public.member_blocks;
create policy "Users manage own blocks"
  on public.member_blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

drop policy if exists "Engine Room posts visible to followers" on public.engine_room_posts;
create policy "Engine Room posts visible to followers"
  on public.engine_room_posts
  for select to authenticated
  using (
    deleted_at is null
    and not exists (
      select 1 from public.member_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
    and (
      author_id = auth.uid()
      or exists (
        select 1 from public.member_follows f
        where f.follower_id = auth.uid()
          and f.following_id = author_id
      )
      or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
    )
  );

drop policy if exists "Users insert own Engine Room posts" on public.engine_room_posts;
create policy "Users insert own Engine Room posts"
  on public.engine_room_posts
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Users update own Engine Room posts" on public.engine_room_posts;
create policy "Users update own Engine Room posts"
  on public.engine_room_posts
  for update to authenticated
  using (
    author_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  )
  with check (
    author_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

drop policy if exists "Engine Room reactions visible with posts" on public.engine_room_reactions;
create policy "Engine Room reactions visible with posts"
  on public.engine_room_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.engine_room_posts p
      where p.id = post_id
    )
  );

drop policy if exists "Users manage own Engine Room reactions" on public.engine_room_reactions;
create policy "Users manage own Engine Room reactions"
  on public.engine_room_reactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Engine Room comments visible with posts" on public.engine_room_comments;
create policy "Engine Room comments visible with posts"
  on public.engine_room_comments
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.engine_room_posts p
      where p.id = post_id
    )
  );

drop policy if exists "Users insert own Engine Room comments" on public.engine_room_comments;
create policy "Users insert own Engine Room comments"
  on public.engine_room_comments
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Users update own Engine Room comments" on public.engine_room_comments;
create policy "Users update own Engine Room comments"
  on public.engine_room_comments
  for update to authenticated
  using (
    author_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

drop policy if exists "Users insert Engine Room reports" on public.engine_room_reports;
create policy "Users insert Engine Room reports"
  on public.engine_room_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "Creators read Engine Room reports" on public.engine_room_reports;
create policy "Creators read Engine Room reports"
  on public.engine_room_reports
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator'));

grant select, insert, delete on public.member_blocks to authenticated;
grant select, insert, update on public.engine_room_posts to authenticated;
grant select, insert, update, delete on public.engine_room_reactions to authenticated;
grant select, insert, update on public.engine_room_comments to authenticated;
grant select, insert on public.engine_room_reports to authenticated;
grant all on public.member_blocks to service_role;
grant all on public.engine_room_posts to service_role;
grant all on public.engine_room_reactions to service_role;
grant all on public.engine_room_comments to service_role;
grant all on public.engine_room_reports to service_role;

-- ---------------------------------------------------------------------------
-- Photo storage (signed URLs; followers can read via policy)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'engine-room',
  'engine-room',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members upload Engine Room photos" on storage.objects;
create policy "Members upload Engine Room photos"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'engine-room'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Followers read Engine Room photos" on storage.objects;
create policy "Followers read Engine Room photos"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'engine-room'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.member_follows f
        where f.follower_id = auth.uid()
          and f.following_id::text = (storage.foldername(name))[1]
      )
      or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
    )
  );

drop policy if exists "Members delete own Engine Room photos" on storage.objects;
create policy "Members delete own Engine Room photos"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'engine-room'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

insert into public.referral_campaigns (name, prize_label, active_needed, status)
select
  'Engine crew push',
  'hoodie or pump cover',
  5,
  'active'
where not exists (
  select 1 from public.referral_campaigns where status = 'active'
);
