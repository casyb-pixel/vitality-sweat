-- Seeds and contributor slug for dominance roadmap phases B-D.

alter table public.profiles
  add column if not exists contributor_slug text;

insert into public.gym_locations (slug, name, metro, invite_code, contact_email, monthly_price_cents)
values
  ('reds', 'Red''s', 'lafayette', 'reds', 'hello@vitalitysweat.com', 14900)
on conflict (slug) do nothing;

insert into public.affiliate_links (slug, partner, network, label, destination_url)
values
  ('creatine-monohydrate', 'Amazon', 'amazon', 'Creatine monohydrate Hunter uses', 'https://www.amazon.com/s?k=creatine+monohydrate'),
  ('whey-protein', 'Amazon', 'amazon', 'Budget whey for dorm fridges', 'https://www.amazon.com/s?k=whey+protein+isolate'),
  ('electrolyte', 'Amazon', 'amazon', 'Electrolyte mix for hot SWLA sessions', 'https://www.amazon.com/s?k=electrolyte+powder'),
  ('lifting-straps', 'Amazon', 'amazon', 'Lifting straps for heavy hinges', 'https://www.amazon.com/s?k=lifting+straps')
on conflict (slug) do nothing;

insert into public.gear_reviews (slug, title, excerpt, body_markdown, category, affiliate_slug, is_published, published_at)
values
  (
    'dorm-dumbbell-vs-bands',
    'Cheap dumbbells vs bands in a dorm',
    'If you have 20 square feet and a roommate, here is the math Hunter would actually run.',
    'Start with a pair of adjustable dumbbells if you can hide them under the bed. Bands travel better.',
    'dorm',
    'lifting-straps',
    true,
    now()
  ),
  (
    'first-gym-bag',
    'First gym bag that is not embarrassing',
    'Shoes, straps, a shaker, creatine, and a charger. That is the bag.',
    'You do not need a $200 duffel. You need dry shoes and a way to log sets with wet hands.',
    'gym-bag',
    'creatine-monohydrate',
    true,
    now()
  ),
  (
    'creatine-i-use',
    'The creatine I actually use',
    'Monohydrate. 5 grams. Not a medical protocol. Just what I take.',
    'This is not clinically proven copy. This is: I take creatine monohydrate, I drink water, I train.',
    'fuel',
    'creatine-monohydrate',
    true,
    now()
  )
on conflict (slug) do nothing;
