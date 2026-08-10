-- Phase 3: market playbook attribution on sponsorship flights + ad events.

alter table public.sponsor_campaigns
  add column if not exists target_markets text[] not null default '{}';

comment on column public.sponsor_campaigns.target_markets is
  'Metro playbook ids (lafayette, lake-charles, …). ZIPs usually derived from metro map.';

alter table public.sponsor_ad_events
  add column if not exists market text;

comment on column public.sponsor_ad_events.market is
  'Optional metro id from ?market= / remembered attribution when the event was logged.';

create index if not exists sponsor_ad_events_market_idx
  on public.sponsor_ad_events (market, created_at desc)
  where market is not null;
