-- Growth / ad-sales packaging metadata for Chronicles + Video Studio.

alter table public.posts
  add column if not exists growth_packaging jsonb;

comment on column public.posts.growth_packaging is
  'Publish-time growth packaging: { ctaEnabled, adSlotMid, appliedAt }. Page renders JoinEngineCTA + AdSlot from this.';

alter table public.video_projects
  add column if not exists growth_promo_pack jsonb;

comment on column public.video_projects.growth_promo_pack is
  'Auto growth promo pack on social_package_ready: caption variants, pinned comment, companion post prompt, signup URL.';
