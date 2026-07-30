-- Locked short-form video idea sets per creator + Chronicle.
-- Once generated, the five concepts stay put until individually replaced.

create table if not exists public.video_idea_sets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  post_slug text,
  blog_title text not null default '',
  ideas jsonb not null default '[]'::jsonb,
  locked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_idea_sets_creator_post_unique unique (creator_id, post_id)
);

create index if not exists video_idea_sets_creator_idx
  on public.video_idea_sets (creator_id, updated_at desc);

drop trigger if exists video_idea_sets_set_updated_at on public.video_idea_sets;
create trigger video_idea_sets_set_updated_at
  before update on public.video_idea_sets
  for each row execute function public.set_updated_at();

alter table public.video_idea_sets enable row level security;

drop policy if exists "Creators select own video idea sets" on public.video_idea_sets;
create policy "Creators select own video idea sets"
  on public.video_idea_sets
  for select
  to authenticated
  using (
    creator_id = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'creator')
  );

drop policy if exists "Creators insert own video idea sets" on public.video_idea_sets;
create policy "Creators insert own video idea sets"
  on public.video_idea_sets
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'creator')
  );

drop policy if exists "Creators update own video idea sets" on public.video_idea_sets;
create policy "Creators update own video idea sets"
  on public.video_idea_sets
  for update
  to authenticated
  using (
    creator_id = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  )
  with check (
    creator_id = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

drop policy if exists "Creators delete own video idea sets" on public.video_idea_sets;
create policy "Creators delete own video idea sets"
  on public.video_idea_sets
  for delete
  to authenticated
  using (
    creator_id = auth.uid()
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

comment on table public.video_idea_sets is
  'Locked Video Studio idea batches — survive gym trips and portal re-entry until individually regenerated.';
