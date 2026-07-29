-- Track member Library searches so creators can spot content gaps
-- (e.g. many "glutes" searches with zero matching Chronicles).

create table if not exists public.library_search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query_raw text not null,
  query_normalized text not null,
  result_count integer not null default 0 check (result_count >= 0),
  matched_slugs text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists library_search_events_normalized_created_idx
  on public.library_search_events (query_normalized, created_at desc);

create index if not exists library_search_events_created_idx
  on public.library_search_events (created_at desc);

create index if not exists library_search_events_gap_idx
  on public.library_search_events (created_at desc)
  where result_count = 0;

alter table public.library_search_events enable row level security;

create policy "Members insert own library searches"
  on public.library_search_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Members read own searches; creators read all"
  on public.library_search_events
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'creator')
  );

comment on table public.library_search_events is
  'Member Library topic searches — used to alert creators about content gaps.';
