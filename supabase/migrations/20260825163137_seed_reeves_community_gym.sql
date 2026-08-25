-- Reeves Community Gym (Allen Parish Recreation District 6).
-- Public page: https://reevesla.gov/gym-and-recreation-center
-- Names and city labels only. No coordinates.

insert into public.gym_directory (name, name_key, metro)
values
  ('Reeves Community Gym', 'reeves community gym', 'Reeves')
on conflict (name_key) do nothing;
