-- Private media storage + project tracking for Creator Studio Video Wizard.

create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  post_slug text,
  blog_title text not null,
  concept jsonb not null default '{}'::jsonb,
  status text not null default 'collecting_assets'
    check (
      status in (
        'collecting_assets',
        'assets_ready',
        'social_package_ready',
        'exported',
        'archived'
      )
    ),
  video_path text,
  voiceover_path text,
  social_package jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_projects_creator_idx
  on public.video_projects (creator_id, updated_at desc);
create index if not exists video_projects_post_idx
  on public.video_projects (post_id);

drop trigger if exists video_projects_set_updated_at on public.video_projects;
create trigger video_projects_set_updated_at
  before update on public.video_projects
  for each row execute function public.set_updated_at();

alter table public.video_projects enable row level security;

drop policy if exists "Creators select own video projects" on public.video_projects;
create policy "Creators select own video projects"
  on public.video_projects for select to authenticated
  using (creator_id = auth.uid() or public.is_admin());

drop policy if exists "Creators insert own video projects" on public.video_projects;
create policy "Creators insert own video projects"
  on public.video_projects for insert to authenticated
  with check (creator_id = auth.uid() and public.is_staff());

drop policy if exists "Creators update own video projects" on public.video_projects;
create policy "Creators update own video projects"
  on public.video_projects for update to authenticated
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "Creators delete own video projects" on public.video_projects;
create policy "Creators delete own video projects"
  on public.video_projects for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.video_projects to authenticated;
grant all on public.video_projects to service_role;

-- Private: raw phone media is only accessed through authenticated downloads
-- or short-lived signed URLs. Store paths, never expiring signed URLs, in DB.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'creator-video-assets',
  'creator-video-assets',
  false,
  262144000,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/ogg'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Creators upload own video assets" on storage.objects;
create policy "Creators upload own video assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'creator-video-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_staff()
  );

drop policy if exists "Creators read own video assets" on storage.objects;
create policy "Creators read own video assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'creator-video-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Creators update own video assets" on storage.objects;
create policy "Creators update own video assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'creator-video-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'creator-video-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Creators delete own video assets" on storage.objects;
create policy "Creators delete own video assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'creator-video-assets'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
