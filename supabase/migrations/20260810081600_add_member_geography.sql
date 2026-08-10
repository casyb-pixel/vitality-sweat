-- Member geography for local ad sales (city + ZIP required for new/incomplete profiles).
-- Existing rows keep nulls; app gates incomplete profiles to onboarding/profile completion.

alter table public.profiles
  add column if not exists city text,
  add column if not exists zip_code text,
  add column if not exists region text;

comment on column public.profiles.city is 'Member city (required for new members).';
comment on column public.profiles.zip_code is 'US ZIP (##### or #####-####); required for new members.';
comment on column public.profiles.region is 'Optional parish / region (e.g. Louisiana parish).';

-- Soft format check: allow null (legacy) or US ZIP 5 / ZIP+4.
alter table public.profiles
  drop constraint if exists profiles_zip_code_format;

alter table public.profiles
  add constraint profiles_zip_code_format
  check (
    zip_code is null
    or zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'
  );

create index if not exists profiles_zip_code_idx
  on public.profiles (zip_code)
  where zip_code is not null;

create index if not exists profiles_city_idx
  on public.profiles (lower(city))
  where city is not null;

-- Copy geography from signup user_metadata when a profile row is created.
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

  insert into public.profiles (
    id,
    email,
    role,
    display_name,
    city,
    zip_code,
    region
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
    incoming_region
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Keep the older alternate trigger function in sync if it exists.
do $$
begin
  if to_regprocedure('public.handle_new_user_profile()') is not null then
    execute $fn$
      create or replace function public.handle_new_user_profile()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        incoming_city text;
        incoming_zip text;
        incoming_region text;
      begin
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

        insert into public.profiles (id, email, role, display_name, city, zip_code, region)
        values (
          new.id,
          new.email,
          coalesce(new.raw_app_meta_data ->> 'role', 'member'),
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
          incoming_city,
          incoming_zip,
          incoming_region
        )
        on conflict (id) do nothing;
        return new;
      end;
      $body$;
    $fn$;
  end if;
end;
$$;
