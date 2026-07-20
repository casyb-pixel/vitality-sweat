-- Add structured body blocks for /blog/[slug] renderer parity with migrated posts.
alter table public.posts
  add column if not exists body_blocks jsonb;

comment on column public.posts.body_blocks is
  'Archive-compatible BlogBlock[] JSON used by src/app/blog/[slug]/page.tsx';
