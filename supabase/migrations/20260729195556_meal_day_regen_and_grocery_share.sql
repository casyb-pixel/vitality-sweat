-- Meal-plan day feedback + printable/shareable grocery lists.

alter table public.fitness_profiles
  add column if not exists meal_rejects text[] not null default '{}';

comment on column public.fitness_profiles.meal_rejects is
  'Short meal descriptions the member rejected; never suggest these again.';

alter table public.meal_plans
  add column if not exists grocery_share_token uuid;

update public.meal_plans
set grocery_share_token = gen_random_uuid()
where grocery_share_token is null;

alter table public.meal_plans
  alter column grocery_share_token set default gen_random_uuid();

alter table public.meal_plans
  alter column grocery_share_token set not null;

create unique index if not exists meal_plans_grocery_share_token_uidx
  on public.meal_plans (grocery_share_token);

-- Public grocery share reads go through service-role API (token in URL).
-- No anon RLS expansion needed.
