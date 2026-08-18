-- Public Engine Room opt-in, per-post visibility, and a username directory.

alter table public.profiles
  add column if not exists engine_room_public_opt_in boolean not null default false;

comment on column public.profiles.engine_room_public_opt_in is
  'When true, the member can see and publish public Engine Room posts with other opted-in members.';

alter table public.engine_room_posts
  add column if not exists visibility text not null default 'followers';

alter table public.engine_room_posts
  drop constraint if exists engine_room_posts_visibility_check;

alter table public.engine_room_posts
  add constraint engine_room_posts_visibility_check
  check (visibility in ('followers', 'public'));

comment on column public.engine_room_posts.visibility is
  'followers: author plus people who follow them. public: also visible to other members who opted into public Engine Room posts.';

create index if not exists engine_room_posts_public_created_idx
  on public.engine_room_posts (created_at desc)
  where deleted_at is null and visibility = 'public';

create or replace function public.engine_room_user_is_public(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.engine_room_public_opt_in
      from public.profiles p
      where p.id = p_user_id
    ),
    false
  );
$$;

revoke all on function public.engine_room_user_is_public(uuid) from public, anon;
grant execute on function public.engine_room_user_is_public(uuid) to authenticated;

drop policy if exists "Engine Room posts visible to followers" on public.engine_room_posts;
create policy "Engine Room posts visible to followers"
  on public.engine_room_posts
  for select to authenticated
  using (
    deleted_at is null
    and not exists (
      select 1 from public.member_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
    and (
      author_id = auth.uid()
      or exists (
        select 1 from public.member_follows f
        where f.follower_id = auth.uid()
          and f.following_id = author_id
      )
      or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creator')
      or (
        visibility = 'public'
        and public.engine_room_user_is_public(auth.uid())
        and public.engine_room_user_is_public(author_id)
      )
    )
  );

drop policy if exists "Users insert own Engine Room posts" on public.engine_room_posts;
create policy "Users insert own Engine Room posts"
  on public.engine_room_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      visibility = 'followers'
      or public.engine_room_user_is_public(auth.uid())
    )
  );

drop view if exists public.engine_room_members;

create table if not exists public.engine_room_members (
  id uuid primary key references public.profiles (id) on delete cascade,
  username text not null,
  display_name text,
  engine_room_public_opt_in boolean not null default false
);

create unique index if not exists engine_room_members_username_lower
  on public.engine_room_members (lower(username));

alter table public.engine_room_members enable row level security;

drop policy if exists "Authenticated read Engine Room directory" on public.engine_room_members;
create policy "Authenticated read Engine Room directory"
  on public.engine_room_members
  for select to authenticated
  using (true);

grant select on public.engine_room_members to authenticated;
grant all on public.engine_room_members to service_role;

create or replace function public.sync_engine_room_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is null then
    delete from public.engine_room_members where id = new.id;
    return new;
  end if;
  insert into public.engine_room_members (
    id, username, display_name, engine_room_public_opt_in
  )
  values (
    new.id,
    new.username,
    new.display_name,
    coalesce(new.engine_room_public_opt_in, false)
  )
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        engine_room_public_opt_in = excluded.engine_room_public_opt_in;
  return new;
end;
$$;

drop trigger if exists profiles_sync_engine_room_member on public.profiles;
create trigger profiles_sync_engine_room_member
  after insert or update of username, display_name, engine_room_public_opt_in
  on public.profiles
  for each row
  execute function public.sync_engine_room_member();

revoke all on function public.sync_engine_room_member() from public, anon, authenticated;

insert into public.engine_room_members (
  id, username, display_name, engine_room_public_opt_in
)
select
  p.id,
  p.username,
  p.display_name,
  p.engine_room_public_opt_in
from public.profiles p
where p.username is not null
on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      engine_room_public_opt_in = excluded.engine_room_public_opt_in;
