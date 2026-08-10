# Local sponsorships (Phase 2)

Direct-sold inventory for Red's, Rouses, and SWLA partners. Not AdSense.

## Schema

- `sponsors` — advertiser
- `sponsor_campaigns` — flight (`draft|active|paused|ended`), optional `target_zips`, `is_house`
- `sponsor_creatives` — assigned to registry `slot_id`
- `sponsor_ad_events` — `impression|click` (no PII; optional opaque `session_hash`)

## Slot registry

`home-below-hero`, `home-mid-content`, `chronicles-top`, `blog-inline` (covers `blog-mid-{slug}`), `blog-end`, `grocery-footer`, `app-home`.

Blog publish still writes `growth_packaging.adSlotMid = blog-mid-{slug}`; the serve layer maps those to `blog-inline` so one flight fills all Chronicles without breaking unsponsored pages (house CTA fills gaps).

## APIs

- `GET /api/ads/serve?slot=` — public creative (paid preferred, house fallback)
- `POST /api/ads/event` — impression/click log
- `GET|POST /api/creator/sponsors` — CRUD
- `GET /api/creator/sponsors/proof?campaignId=` — deliverable proof

## Studio

**Sponsors** tab: create sponsors, campaigns, creatives. **Audience** tab: deliverable proof (impressions, clicks, CTR, local actives in target ZIPs).

## Seeded demo

Red's Gym (Demo) active on home, chronicles, blog-inline, grocery-footer. House Engine CTA on all slots at lower priority.
