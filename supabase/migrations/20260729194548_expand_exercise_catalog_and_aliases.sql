-- Expand exercise catalog: normalize equipment/category filters, aliases for
-- duplicate-aware search, and a much larger seed list.

alter table public.exercises
  add column if not exists aliases text[] not null default '{}';

-- Normalize existing equipment into the three member filters.
update public.exercises
set equipment = case
  when lower(coalesce(equipment, '')) in ('dumbbell', 'barbell', 'kettlebell', 'free_weight', 'free weight')
    then 'free_weight'
  when lower(coalesce(equipment, '')) in ('bodyweight', 'body weight', 'none')
    then 'bodyweight'
  when lower(coalesce(equipment, '')) in (
    'machine', 'cable', 'treadmill', 'bike', 'smith', 'band', 'resistance_band'
  )
    then 'machine'
  when equipment is null or trim(equipment) = ''
    then 'free_weight'
  else 'free_weight'
end;

-- Normalize categories into cardio / strength / endurance.
update public.exercises
set category = case
  when lower(coalesce(category, '')) in ('cardio') then 'cardio'
  when lower(coalesce(category, '')) in ('endurance') then 'endurance'
  when lower(coalesce(category, '')) in ('core', 'strength', 'hypertrophy') then 'strength'
  else 'strength'
end;

-- Drop loose text and enforce filter enums going forward.
alter table public.exercises
  drop constraint if exists exercises_equipment_check;
alter table public.exercises
  add constraint exercises_equipment_check
  check (equipment in ('machine', 'bodyweight', 'free_weight'));

alter table public.exercises
  drop constraint if exists exercises_category_check;
alter table public.exercises
  add constraint exercises_category_check
  check (category in ('cardio', 'strength', 'endurance'));

alter table public.exercises
  alter column equipment set not null;
alter table public.exercises
  alter column equipment set default 'free_weight';

create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_category_idx on public.exercises (category);
create index if not exists exercises_name_trgm_idx on public.exercises (lower(name));

-- Seed aliases for a few common synonym-prone lifts.
update public.exercises
set aliases = array['DB curl', 'bicep curl', 'biceps curl', 'arm curl']
where lower(name) = 'dumbbell curl';

update public.exercises
set aliases = array['bench', 'flat bench', 'BB bench press']
where lower(name) = 'barbell bench press';

update public.exercises
set aliases = array['back squat', 'BB squat', 'squat']
where lower(name) = 'barbell back squat';

update public.exercises
set aliases = array['RDL', 'stiff leg deadlift', 'straight leg deadlift']
where lower(name) = 'romanian deadlift';

update public.exercises
set aliases = array['deadlift', 'DL', 'conventional DL']
where lower(name) = 'conventional deadlift';

update public.exercises
set aliases = array['OHP', 'military press', 'shoulder press']
where lower(name) = 'overhead press';

update public.exercises
set aliases = array['chin-up', 'chinup', 'pullup']
where lower(name) = 'pull-up';

update public.exercises
set aliases = array['pushup', 'press-up']
where lower(name) = 'push-up';

update public.exercises
set aliases = array['side raise', 'DB lateral', 'dumbbell lateral raise']
where lower(name) = 'lateral raise';

update public.exercises
set aliases = array['cable face pull', 'rope face pull']
where lower(name) = 'face pull';

-- Expand catalog (idempotent via unique lower(name) where created_by is null).
insert into public.exercises (name, category, primary_muscle, equipment, tracking_type, aliases)
values
  ('Dumbbell Bench Press', 'strength', 'chest', 'free_weight', 'weight_reps', array['DB bench', 'flat DB press']),
  ('Dumbbell Shoulder Press', 'strength', 'shoulders', 'free_weight', 'weight_reps', array['DB OHP', 'seated DB press']),
  ('Dumbbell Row', 'strength', 'back', 'free_weight', 'weight_reps', array['DB row', 'one-arm row', 'single arm row']),
  ('Dumbbell Fly', 'strength', 'chest', 'free_weight', 'weight_reps', array['DB flye', 'chest fly']),
  ('Dumbbell Romanian Deadlift', 'strength', 'hamstrings', 'free_weight', 'weight_reps', array['DB RDL']),
  ('Goblet Squat', 'strength', 'quads', 'free_weight', 'weight_reps', array['kettlebell squat', 'DB goblet squat']),
  ('Barbell Row', 'strength', 'back', 'free_weight', 'weight_reps', array['bent over row', 'BB row', 'pendlay row']),
  ('Barbell Hip Thrust', 'strength', 'glutes', 'free_weight', 'weight_reps', array['hip thrust', 'glute bridge bar']),
  ('Front Squat', 'strength', 'quads', 'free_weight', 'weight_reps', array['BB front squat']),
  ('Sumo Deadlift', 'strength', 'posterior_chain', 'free_weight', 'weight_reps', array['sumo DL']),
  ('Bulgarian Split Squat', 'strength', 'quads', 'free_weight', 'weight_reps', array['BSS', 'rear foot elevated split squat']),
  ('Hammer Curl', 'strength', 'biceps', 'free_weight', 'weight_reps', array['DB hammer curl']),
  ('Skull Crusher', 'strength', 'triceps', 'free_weight', 'weight_reps', array['lying tricep extension', 'EZ bar skullcrusher']),
  ('Dumbbell Tricep Kickback', 'strength', 'triceps', 'free_weight', 'weight_reps', array['kickback']),
  ('Kettlebell Swing', 'strength', 'posterior_chain', 'free_weight', 'weight_reps', array['KB swing', 'russian swing']),
  ('Chest Press Machine', 'strength', 'chest', 'machine', 'weight_reps', array['machine chest press', 'seated chest press']),
  ('Shoulder Press Machine', 'strength', 'shoulders', 'machine', 'weight_reps', array['machine OHP']),
  ('Seated Row Machine', 'strength', 'back', 'machine', 'weight_reps', array['machine row']),
  ('Pec Deck', 'strength', 'chest', 'machine', 'weight_reps', array['butterfly machine', 'chest fly machine']),
  ('Cable Fly', 'strength', 'chest', 'machine', 'weight_reps', array['cable crossover', 'cable chest fly']),
  ('Cable Lateral Raise', 'strength', 'shoulders', 'machine', 'weight_reps', array[]::text[]),
  ('Cable Bicep Curl', 'strength', 'biceps', 'machine', 'weight_reps', array['cable curl']),
  ('Leg Extension', 'strength', 'quads', 'machine', 'weight_reps', array['quad extension']),
  ('Seated Leg Curl', 'strength', 'hamstrings', 'machine', 'weight_reps', array['hamstring curl']),
  ('Hack Squat', 'strength', 'quads', 'machine', 'weight_reps', array['hack squat machine']),
  ('Smith Machine Squat', 'strength', 'quads', 'machine', 'weight_reps', array['smith squat']),
  ('Smith Machine Bench Press', 'strength', 'chest', 'machine', 'weight_reps', array['smith bench']),
  ('Assisted Pull-Up', 'strength', 'back', 'machine', 'weight_reps', array['assisted chin-up']),
  ('Dip Machine', 'strength', 'triceps', 'machine', 'weight_reps', array['assisted dip', 'chest dip machine']),
  ('Ab Crunch Machine', 'strength', 'core', 'machine', 'weight_reps', array['crunch machine']),
  ('Bodyweight Squat', 'strength', 'quads', 'bodyweight', 'reps_only', array['air squat']),
  ('Walking Lunge (Bodyweight)', 'strength', 'quads', 'bodyweight', 'reps_only', array['bodyweight lunge']),
  ('Dip', 'strength', 'chest', 'bodyweight', 'reps_only', array['parallel bar dip', 'bench dip']),
  ('Chin-Up', 'strength', 'biceps', 'bodyweight', 'reps_only', array['underhand pull-up']),
  ('Inverted Row', 'strength', 'back', 'bodyweight', 'reps_only', array['australian pull-up', 'body row']),
  ('Glute Bridge', 'strength', 'glutes', 'bodyweight', 'reps_only', array['hip bridge']),
  ('Mountain Climber', 'strength', 'core', 'bodyweight', 'reps_only', array[]::text[]),
  ('Burpee', 'strength', 'full_body', 'bodyweight', 'reps_only', array[]::text[]),
  ('Side Plank', 'strength', 'core', 'bodyweight', 'duration', array[]::text[]),
  ('Hollow Body Hold', 'strength', 'core', 'bodyweight', 'duration', array['hollow hold']),
  ('Jumping Jack', 'cardio', 'cardio', 'bodyweight', 'duration', array[]::text[]),
  ('High Knees', 'cardio', 'cardio', 'bodyweight', 'duration', array[]::text[]),
  ('Jump Rope', 'cardio', 'cardio', 'bodyweight', 'duration', array['skipping']),
  ('Rowing Machine', 'cardio', 'cardio', 'machine', 'distance', array['erg', 'concept2', 'rower']),
  ('Elliptical', 'cardio', 'cardio', 'machine', 'duration', array['cross trainer']),
  ('Stair Climber', 'cardio', 'cardio', 'machine', 'duration', array['stairmaster', 'stepmill']),
  ('Stationary Bike', 'cardio', 'cardio', 'machine', 'duration', array['spin bike', 'upright bike']),
  ('Treadmill Incline Walk', 'cardio', 'cardio', 'machine', 'distance', array['incline walk', '12-3-30']),
  ('Outdoor Run', 'endurance', 'cardio', 'bodyweight', 'distance', array['jog', 'road run', 'easy run']),
  ('Outdoor Bike Ride', 'endurance', 'cardio', 'machine', 'distance', array['cycling', 'road bike']),
  ('Farmer Carry', 'endurance', 'full_body', 'free_weight', 'distance', array['farmer walk', 'loaded carry']),
  ('Sled Push', 'endurance', 'full_body', 'machine', 'distance', array['prowler push']),
  ('Battle Ropes', 'endurance', 'full_body', 'free_weight', 'duration', array['rope waves']),
  ('Box Jump', 'strength', 'legs', 'bodyweight', 'reps_only', array['plyo box jump']),
  ('Medicine Ball Slam', 'strength', 'full_body', 'free_weight', 'reps_only', array['med ball slam', 'slam ball'])
on conflict do nothing;
