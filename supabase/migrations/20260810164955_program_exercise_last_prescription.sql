-- Snapshot of the last coached prescription for faster next-load display.
-- Source of truth for load math remains progression.ts + live set history.

alter table public.workout_program_exercises
  add column if not exists last_prescription jsonb;

comment on column public.workout_program_exercises.last_prescription is
  'Last coached targets (weight/reps/message/source) from the runner; optional cache only.';
