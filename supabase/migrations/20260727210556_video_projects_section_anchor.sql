-- Blog-section targeting + public embed fields for Creator Studio video projects.

alter table public.video_projects
  add column if not exists target_section_anchor text,
  add column if not exists checklist_key text,
  add column if not exists thumbnail_url text,
  add column if not exists public_video_url text,
  add column if not exists embed_published boolean not null default false;

alter table public.video_projects
  drop constraint if exists video_projects_checklist_key_check;

alter table public.video_projects
  add constraint video_projects_checklist_key_check
  check (
    checklist_key is null
    or checklist_key in ('video_1_done', 'video_2_done', 'video_3_done')
  );

comment on column public.video_projects.target_section_anchor is
  'Slug matching an h2/h3 id in the parent blog post (e.g. bicep-curls-for-peak-biceps).';

comment on column public.video_projects.checklist_key is
  'Optional link to a 7-day marketing video checklist item on posts.';

comment on column public.video_projects.embed_published is
  'When true (and playback media exists), inject this video under target_section_anchor on the live blog.';

create index if not exists video_projects_embed_lookup_idx
  on public.video_projects (post_id, embed_published)
  where embed_published = true
    and target_section_anchor is not null;

create index if not exists video_projects_slug_embed_idx
  on public.video_projects (post_slug, embed_published)
  where embed_published = true
    and target_section_anchor is not null;

create unique index if not exists video_projects_post_checklist_uidx
  on public.video_projects (post_id, checklist_key)
  where post_id is not null
    and checklist_key is not null;
