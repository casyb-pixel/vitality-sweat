-- Phase 2: direct-sold local sponsorship inventory (sponsors, flights, creatives, events).

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  contact_email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  target_zips text[] not null default '{}',
  notes text,
  is_house boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsor_campaigns_status_idx
  on public.sponsor_campaigns (status);
create index if not exists sponsor_campaigns_sponsor_idx
  on public.sponsor_campaigns (sponsor_id);
create index if not exists sponsor_campaigns_dates_idx
  on public.sponsor_campaigns (starts_at, ends_at);

create table if not exists public.sponsor_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete cascade,
  -- Canonical slot id from app registry (e.g. home-below-hero, blog-inline).
  slot_id text not null,
  headline text not null,
  body text,
  image_url text,
  click_url text not null,
  cta_label text not null default 'Learn more',
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsor_creatives_slot_idx
  on public.sponsor_creatives (slot_id)
  where is_active = true;
create index if not exists sponsor_creatives_campaign_idx
  on public.sponsor_creatives (campaign_id);

-- Privacy-safe delivery proof: no emails, names, or IPs. Optional opaque session hash only.
create table if not exists public.sponsor_ad_events (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid references public.sponsor_creatives (id) on delete set null,
  campaign_id uuid references public.sponsor_campaigns (id) on delete set null,
  slot_id text not null,
  event_type text not null check (event_type in ('impression', 'click')),
  page_path text,
  session_hash text,
  created_at timestamptz not null default now()
);

create index if not exists sponsor_ad_events_campaign_idx
  on public.sponsor_ad_events (campaign_id, event_type, created_at desc);
create index if not exists sponsor_ad_events_slot_idx
  on public.sponsor_ad_events (slot_id, created_at desc);
create index if not exists sponsor_ad_events_created_idx
  on public.sponsor_ad_events (created_at desc);

comment on table public.sponsors is
  'Local advertisers (gyms, grocery, etc.) sold direct — not AdSense.';
comment on table public.sponsor_campaigns is
  'Flight windows + optional ZIP targeting for sponsorship pitches.';
comment on table public.sponsor_creatives is
  'Creatives assigned to registry slot ids (blog-inline covers blog-mid-* aliases).';
comment on table public.sponsor_ad_events is
  'Impression/click logs for sales proof. No PII.';

alter table public.sponsors enable row level security;
alter table public.sponsor_campaigns enable row level security;
alter table public.sponsor_creatives enable row level security;
alter table public.sponsor_ad_events enable row level security;

-- Public can read active inventory (serve path may also use service role).
create policy "Public read active sponsors"
  on public.sponsors for select
  to anon, authenticated
  using (is_active = true or public.is_staff());

create policy "Staff manage sponsors"
  on public.sponsors for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Public read live campaigns"
  on public.sponsor_campaigns for select
  to anon, authenticated
  using (
    public.is_staff()
    or (
      status = 'active'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

create policy "Staff manage campaigns"
  on public.sponsor_campaigns for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Public read active creatives on live campaigns"
  on public.sponsor_creatives for select
  to anon, authenticated
  using (
    public.is_staff()
    or (
      is_active = true
      and exists (
        select 1
        from public.sponsor_campaigns c
        where c.id = campaign_id
          and c.status = 'active'
          and (c.starts_at is null or c.starts_at <= now())
          and (c.ends_at is null or c.ends_at >= now())
      )
    )
  );

create policy "Staff manage creatives"
  on public.sponsor_creatives for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Events: insert for anon (logging) + staff read for proof. No public select.
create policy "Anyone insert ad events"
  on public.sponsor_ad_events for insert
  to anon, authenticated
  with check (true);

create policy "Staff read ad events"
  on public.sponsor_ad_events for select
  to authenticated
  using (public.is_staff());

grant select on public.sponsors to anon, authenticated;
grant all on public.sponsors to service_role;
grant select on public.sponsor_campaigns to anon, authenticated;
grant all on public.sponsor_campaigns to service_role;
grant select on public.sponsor_creatives to anon, authenticated;
grant all on public.sponsor_creatives to service_role;
grant insert on public.sponsor_ad_events to anon, authenticated;
grant select on public.sponsor_ad_events to authenticated;
grant all on public.sponsor_ad_events to service_role;

-- House inventory: always-on Engine CTA when no paid sponsor is live.
insert into public.sponsors (name, slug, website_url, notes, is_active)
values (
  'Vitality Engine (House)',
  'vitality-engine-house',
  'https://vitalitysweat.com/?auth=signup&next=%2Fapp',
  'House fallback creative — never sold as inventory.',
  true
)
on conflict (slug) do nothing;

insert into public.sponsor_campaigns (
  sponsor_id, name, status, starts_at, ends_at, is_house, notes
)
select
  s.id,
  'House · Free Engine CTA',
  'active',
  now() - interval '1 day',
  null,
  true,
  'Fills unsponsored slots with free signup CTA.'
from public.sponsors s
where s.slug = 'vitality-engine-house'
  and not exists (
    select 1 from public.sponsor_campaigns c
    where c.sponsor_id = s.id and c.is_house = true
  );

insert into public.sponsor_creatives (
  campaign_id, slot_id, headline, body, click_url, cta_label, priority, is_active
)
select
  c.id,
  slot.slot_id,
  'Train. Fuel. Compete. — free.',
  'Create a free Vitality Engine account for workouts, meal plans, and grocery lists built for SWLA.',
  'https://vitalitysweat.com/?auth=signup&next=%2Fapp&utm_source=house&utm_medium=sponsor_slot&utm_campaign=engine_cta',
  'Create free account',
  1000,
  true
from public.sponsor_campaigns c
join public.sponsors s on s.id = c.sponsor_id
cross join (
  values
    ('home-below-hero'),
    ('home-mid-content'),
    ('chronicles-top'),
    ('blog-inline'),
    ('blog-end'),
    ('grocery-footer'),
    ('app-home')
) as slot(slot_id)
where s.slug = 'vitality-engine-house'
  and c.is_house = true
  and not exists (
    select 1 from public.sponsor_creatives sc
    where sc.campaign_id = c.id and sc.slot_id = slot.slot_id
  );

-- Demo paid flight: Red's (local gym pitch).
insert into public.sponsors (name, slug, website_url, notes, is_active)
values (
  'Red''s Gym (Demo)',
  'reds-gym-demo',
  'https://vitalitysweat.com/invite?src=gym&gym=reds',
  'Demo sponsor for Phase 2 pitch decks — replace with real creative when sold.',
  true
)
on conflict (slug) do nothing;

insert into public.sponsor_campaigns (
  sponsor_id, name, status, starts_at, ends_at, target_zips, is_house, notes
)
select
  s.id,
  'Red''s · SWLA Beachhead Demo',
  'active',
  now() - interval '1 day',
  now() + interval '90 days',
  array['70501','70503','70506','70508'],
  false,
  'Demo campaign across home, chronicles, blog-inline, grocery-footer.'
from public.sponsors s
where s.slug = 'reds-gym-demo'
  and not exists (
    select 1 from public.sponsor_campaigns c
    where c.sponsor_id = s.id and c.name = 'Red''s · SWLA Beachhead Demo'
  );

insert into public.sponsor_creatives (
  campaign_id, slot_id, headline, body, click_url, cta_label, priority, is_active
)
select
  c.id,
  slot.slot_id,
  'Train at Red''s — then log it free',
  'Partner with Vitality Sweat. Scan the gym QR for a free Vitality Engine account built for Lafayette athletes.',
  'https://vitalitysweat.com/invite?src=gym&gym=reds&utm_source=sponsor&utm_medium=display&utm_campaign=reds_demo',
  'Join free via Red''s',
  10,
  true
from public.sponsor_campaigns c
join public.sponsors s on s.id = c.sponsor_id
cross join (
  values
    ('home-below-hero'),
    ('home-mid-content'),
    ('chronicles-top'),
    ('blog-inline'),
    ('grocery-footer')
) as slot(slot_id)
where s.slug = 'reds-gym-demo'
  and c.is_house = false
  and not exists (
    select 1 from public.sponsor_creatives sc
    where sc.campaign_id = c.id and sc.slot_id = slot.slot_id
  );
