-- Training preferences for AI workout generation (Workout Agent).
-- Left nullable / empty at onboarding; agent or settings UI fills later.

alter table public.fitness_profiles
  add column if not exists days_per_week integer
    check (days_per_week is null or (days_per_week >= 1 and days_per_week <= 7)),
  add column if not exists session_minutes integer
    check (session_minutes is null or (session_minutes >= 5 and session_minutes <= 180)),
  add column if not exists equipment text[] not null default '{}',
  add column if not exists focus_muscles text[] not null default '{}',
  add column if not exists avoidances text,
  add column if not exists preferred_split text
    check (
      preferred_split is null
      or preferred_split in (
        'full_body',
        'upper_lower',
        'push_pull_legs',
        'ai_choose'
      )
    );

comment on column public.fitness_profiles.days_per_week is
  'Target training days per week (1-7) for AI workout planning.';
comment on column public.fitness_profiles.session_minutes is
  'Typical session length in minutes for AI workout planning.';
comment on column public.fitness_profiles.equipment is
  'Available equipment tags (gym, home, free_weight, machine, bodyweight, bands, etc.).';
comment on column public.fitness_profiles.focus_muscles is
  'Muscle groups to emphasize in generated workouts.';
comment on column public.fitness_profiles.avoidances is
  'Free-text movements, injuries, or constraints to avoid.';
comment on column public.fitness_profiles.preferred_split is
  'Preferred program split: full_body, upper_lower, push_pull_legs, or ai_choose.';
