-- How-to Shorts: link posted YouTube videos back to strength exercises.
alter table public.exercises
  add column if not exists youtube_url text,
  add column if not exists youtube_posted_at timestamptz;

comment on column public.exercises.youtube_url is
  'Public YouTube watch/Shorts URL for Hunter how-to demos; null means no video yet.';
comment on column public.exercises.youtube_posted_at is
  'When the how-to Short was confirmed posted and linked.';

create index if not exists exercises_strength_needs_video_idx
  on public.exercises (category, name)
  where is_active = true
    and category = 'strength'
    and (youtube_url is null or btrim(youtube_url) = '');

alter table public.video_projects
  add column if not exists exercise_id uuid references public.exercises (id) on delete set null;

create index if not exists video_projects_exercise_id_idx
  on public.video_projects (exercise_id)
  where exercise_id is not null;
