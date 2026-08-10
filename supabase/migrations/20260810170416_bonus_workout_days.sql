-- Bonus / extra workout days that sit beside the mapped weekly plan.
--
-- Approach:
-- - scheduled days keep day_index (0..n-1) and drive the N-day plan UI.
-- - bonus days use day_index = null and scheduled_date for calendar ordering.
-- - Unique (program_id, day_index) only applies to scheduled days.
-- - Adding a bonus never changes days_per_week or renumbers scheduled days.

alter table public.workout_program_days
  drop constraint if exists workout_program_days_program_id_day_index_key;

alter table public.workout_program_days
  alter column day_index drop not null;

alter table public.workout_program_days
  drop constraint if exists workout_program_days_day_index_check;

alter table public.workout_program_days
  add column if not exists day_kind text not null default 'scheduled',
  add column if not exists scheduled_date date,
  add column if not exists source text not null default 'program';

alter table public.workout_program_days
  drop constraint if exists workout_program_days_day_kind_check;

alter table public.workout_program_days
  add constraint workout_program_days_day_kind_check
  check (day_kind in ('scheduled', 'bonus'));

alter table public.workout_program_days
  drop constraint if exists workout_program_days_source_check;

alter table public.workout_program_days
  add constraint workout_program_days_source_check
  check (source in ('program', 'bonus_agent'));

alter table public.workout_program_days
  drop constraint if exists workout_program_days_kind_shape_check;

alter table public.workout_program_days
  add constraint workout_program_days_kind_shape_check
  check (
    (
      day_kind = 'scheduled'
      and day_index is not null
      and day_index >= 0
    )
    or (
      day_kind = 'bonus'
      and day_index is null
      and scheduled_date is not null
    )
  );

create unique index if not exists workout_program_days_scheduled_index_uidx
  on public.workout_program_days (program_id, day_index)
  where day_kind = 'scheduled' and day_index is not null;

create index if not exists workout_program_days_bonus_date_idx
  on public.workout_program_days (program_id, scheduled_date desc)
  where day_kind = 'bonus';

comment on column public.workout_program_days.day_kind is
  'scheduled = mapped weekly plan day; bonus = extra session that does not renumber the plan.';
comment on column public.workout_program_days.scheduled_date is
  'Calendar date for bonus days; null for scheduled template days.';
comment on column public.workout_program_days.source is
  'program = AI weekly plan; bonus_agent = extra-session generator.';
comment on column public.workout_program_days.day_index is
  'Order within the mapped plan for scheduled days; null for bonus days.';
