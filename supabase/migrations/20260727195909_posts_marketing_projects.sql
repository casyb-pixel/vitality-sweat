-- 7-Day Marketing Projects: checklist + promo copy on published posts

alter table public.posts
  add column if not exists fb_post_done boolean not null default false,
  add column if not exists ig_post_done boolean not null default false,
  add column if not exists x_post_done boolean not null default false,
  add column if not exists video_1_done boolean not null default false,
  add column if not exists video_2_done boolean not null default false,
  add column if not exists video_3_done boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists project_due_at timestamptz,
  add column if not exists generated_promos jsonb;

comment on column public.posts.fb_post_done is 'Marketing project: Facebook promo post completed';
comment on column public.posts.ig_post_done is 'Marketing project: Instagram promo post completed';
comment on column public.posts.x_post_done is 'Marketing project: X (Twitter) promo post completed';
comment on column public.posts.video_1_done is 'Marketing project: Instagram Reels video deliverable completed';
comment on column public.posts.video_2_done is 'Marketing project: TikTok video deliverable completed';
comment on column public.posts.video_3_done is 'Marketing project: YouTube Shorts video deliverable completed';
comment on column public.posts.is_archived is 'Hide from Creator Studio active marketing projects';
comment on column public.posts.project_due_at is '7 days after published_at — marketing project deadline';
comment on column public.posts.generated_promos is 'Gemini-generated platform captions: { facebook, instagram, x, blogUrl, generatedAt }';

-- Backfill due dates for already-published posts (7 days from publish).
update public.posts
set project_due_at = published_at + interval '7 days'
where status = 'published'
  and published_at is not null
  and project_due_at is null;

create index if not exists posts_marketing_active_idx
  on public.posts (status, is_archived, project_due_at)
  where status = 'published' and is_archived = false;

-- Keep project_due_at aligned when a post is (re)published.
create or replace function public.set_posts_project_due_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is not null then
    if new.project_due_at is null
      or tg_op = 'INSERT'
      or old.published_at is distinct from new.published_at
      or old.status is distinct from new.status then
      new.project_due_at := new.published_at + interval '7 days';
    end if;
  elsif new.status = 'draft' then
    new.project_due_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_set_project_due_at on public.posts;
create trigger posts_set_project_due_at
  before insert or update of status, published_at
  on public.posts
  for each row
  execute function public.set_posts_project_due_at();
