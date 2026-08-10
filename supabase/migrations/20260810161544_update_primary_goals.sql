-- Align fitness_profiles.primary_goal with shared diet + training intents.
-- Replaces target_weight with weight_loss and adds strength.

-- Backfill before tightening the check constraint.
update public.fitness_profiles
set primary_goal = 'weight_loss'
where primary_goal = 'target_weight';

alter table public.fitness_profiles
  drop constraint if exists fitness_profiles_primary_goal_check;

alter table public.fitness_profiles
  add constraint fitness_profiles_primary_goal_check
  check (
    primary_goal is null
    or primary_goal in (
      'weight_loss',
      'muscle_gain',
      'strength',
      'endurance',
      'general_fitness',
      'sports_training',
      'marathon_training'
    )
  );
