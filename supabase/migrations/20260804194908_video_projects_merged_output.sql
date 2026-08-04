-- Store browser-synced gym clip + voiceover output, and allow merged_ready status.

alter table public.video_projects
  add column if not exists merged_path text;

comment on column public.video_projects.merged_path is
  'Private storage path for the browser-synced clip (video + voiceover, gym audio muted).';

alter table public.video_projects
  drop constraint if exists video_projects_status_check;

alter table public.video_projects
  add constraint video_projects_status_check
  check (
    status in (
      'collecting_assets',
      'assets_ready',
      'merged_ready',
      'social_package_ready',
      'exported',
      'archived'
    )
  );
