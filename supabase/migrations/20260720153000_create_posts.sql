-- Vitality Sweat Creator Studio: blog posts CMS table
-- Run in Supabase SQL editor (or via CLI) before using /api/creator/save-post.

create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  author_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Hunter',
  cover_image text,
  cover_alt text,
  keywords text[] not null default '{}',
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_slug_unique unique (slug)
);

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_published_at_idx on public.posts (published_at desc nulls last);

create or replace function public.set_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_posts_updated_at();

alter table public.posts enable row level security;

-- Public can read published posts only.
drop policy if exists "Public read published posts" on public.posts;
create policy "Public read published posts"
  on public.posts
  for select
  to anon, authenticated
  using (status = 'published');

-- Creators (app_metadata.role) can manage their drafts + published rows.
drop policy if exists "Creators select own posts" on public.posts;
create policy "Creators select own posts"
  on public.posts
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

drop policy if exists "Creators insert posts" on public.posts;
create policy "Creators insert posts"
  on public.posts
  for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
    and author_id = auth.uid()
  );

drop policy if exists "Creators update posts" on public.posts;
create policy "Creators update posts"
  on public.posts
  for update
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );
