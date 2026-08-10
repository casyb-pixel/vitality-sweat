-- Phase 1a: referral codes + email outbox for welcome / weekly tip stubs.

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles (id) on delete set null;

create unique index if not exists profiles_referral_code_uidx
  on public.profiles (referral_code)
  where referral_code is not null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by)
  where referred_by is not null;

comment on column public.profiles.referral_code is
  'Public invite code (e.g. VS-AB12CD) used in /?auth=signup&ref=CODE links.';
comment on column public.profiles.referred_by is
  'Profile id of the member who invited this user (soft attribution).';

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
begin
  loop
    candidate := 'VS';
    for i in 1..6 loop
      candidate := candidate || substr(
        alphabet,
        1 + (floor(random() * length(alphabet)))::int,
        1
      );
    end loop;
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- Backfill codes for existing members.
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

alter table public.profiles
  alter column referral_code set default public.generate_referral_code();

-- Keep signup trigger in sync: geo + referral attribution from user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_role text;
  incoming_city text;
  incoming_zip text;
  incoming_region text;
  incoming_ref text;
  referrer_id uuid;
  new_code text;
begin
  incoming_role := coalesce(new.raw_app_meta_data ->> 'role', 'user');
  if incoming_role not in ('user', 'creator', 'admin') then
    incoming_role := 'user';
  end if;

  incoming_city := nullif(trim(coalesce(new.raw_user_meta_data ->> 'city', '')), '');
  incoming_zip := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'zip_code',
    new.raw_user_meta_data ->> 'zip',
    ''
  )), '');
  incoming_region := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'region',
    new.raw_user_meta_data ->> 'parish',
    ''
  )), '');

  if incoming_zip is not null and incoming_zip !~ '^[0-9]{5}(-[0-9]{4})?$' then
    incoming_zip := null;
  end if;

  incoming_ref := upper(nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'ref',
    new.raw_user_meta_data ->> 'referral_code',
    ''
  )), ''));

  if incoming_ref is not null then
    select p.id into referrer_id
    from public.profiles p
    where p.referral_code = incoming_ref
    limit 1;
  end if;

  -- Never self-refer (shouldn't happen on insert, but guard metadata mistakes).
  if referrer_id = new.id then
    referrer_id := null;
  end if;

  new_code := public.generate_referral_code();

  insert into public.profiles (
    id,
    email,
    role,
    display_name,
    city,
    zip_code,
    region,
    referral_code,
    referred_by
  )
  values (
    new.id,
    new.email,
    incoming_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'member'), '@', 1)
    ),
    incoming_city,
    incoming_zip,
    incoming_region,
    new_code,
    referrer_id
  )
  on conflict (id) do update
    set
      city = coalesce(public.profiles.city, excluded.city),
      zip_code = coalesce(public.profiles.zip_code, excluded.zip_code),
      region = coalesce(public.profiles.region, excluded.region),
      referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
      referred_by = coalesce(public.profiles.referred_by, excluded.referred_by);

  return new;
end;
$$;

-- Outbox for transactional email (welcome / weekly tip). Real sends via Resend when configured.
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  to_email text not null,
  template text not null
    check (template in ('welcome', 'weekly_tip')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider text,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_outbox_status_created_idx
  on public.email_outbox (status, created_at);

create index if not exists email_outbox_user_template_idx
  on public.email_outbox (user_id, template);

alter table public.email_outbox enable row level security;

drop policy if exists "Users read own email outbox" on public.email_outbox;
create policy "Users read own email outbox"
  on public.email_outbox
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.email_outbox to authenticated;
grant all on public.email_outbox to service_role;

comment on table public.email_outbox is
  'Transactional email queue. Process with RESEND_API_KEY via /api/app/emails or a worker. Never fake sends.';
