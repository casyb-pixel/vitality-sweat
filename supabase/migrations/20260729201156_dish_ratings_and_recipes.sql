-- Per-dish ratings used to bias future meal-plan frequency.

alter table public.fitness_profiles
  add column if not exists dish_ratings jsonb not null default '{}'::jsonb;

comment on column public.fitness_profiles.dish_ratings is
  'Map of normalized dish key → { title, rating 1-5, count, updated_at }. Higher ratings increase suggestion frequency.';
