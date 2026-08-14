-- Recorded Terms of Use acceptance on member profiles.

alter table public.profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_version is
  'Terms of Use version key the member last accepted (for example 2026-08-14).';
comment on column public.profiles.terms_accepted_at is
  'When the member last accepted the current Terms of Use and Release of Liability.';

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
  incoming_terms_version text;
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

  incoming_terms_version := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'terms_version',
    ''
  )), '');

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
    referred_by,
    terms_version
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
    referrer_id,
    incoming_terms_version
  )
  on conflict (id) do update
    set
      city = coalesce(public.profiles.city, excluded.city),
      zip_code = coalesce(public.profiles.zip_code, excluded.zip_code),
      region = coalesce(public.profiles.region, excluded.region),
      referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
      referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
      terms_version = coalesce(public.profiles.terms_version, excluded.terms_version);

  return new;
end;
$$;
