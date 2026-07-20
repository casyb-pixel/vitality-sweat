-- Public blog visual-aid bucket for Creator Studio Gemini generations.
-- Run in Supabase SQL editor after creating the posts migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for published assets
drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Creators may upload into chronicles/
drop policy if exists "Creators upload blog images" on storage.objects;
create policy "Creators upload blog images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );

drop policy if exists "Creators update blog images" on storage.objects;
create policy "Creators update blog images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'blog-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  )
  with check (
    bucket_id = 'blog-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
  );
