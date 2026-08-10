-- Track when a member customizes a planned day away from the AI draft.

alter table public.workout_program_days
  add column if not exists customized_at timestamptz;

comment on column public.workout_program_days.customized_at is
  'Set when the member edits exercises on this day; null means still the AI draft.';
