# City playbook (Phase 3)

Scale Lafayette density toward ~5,000 actives with a repeatable metro playbook. Consumer Engine stays free; this layer is reporting + packaging.

## Markets

Config: `src/lib/markets/metros.ts` (ZIP → metro). IDs:

- `lafayette`, `lake-charles`, `new-iberia`, `opelousas`, `crowley`, `other-swla`

## Public landing

- Home / Chronicles: `?market=lafayette` localizes hero + Join Engine CTA (no site fork).
- Invite: `/invite?market=lafayette&gym=reds&…` remembers market with referral/UTM attribution (`campaign_market` on signup metadata).
- Rate card: `/advertise`

## Studio packaging

- Blog Wizard + Video Studio + Growth Campaign: **Market playbook** selector → localized CTA / promo pack.
- Sponsors: market preset fills target ZIPs + stores `target_markets`.
- Ad events optionally log `market` from `?market=` / remembered attribution.

## Audience Brief

Creator Studio → Audience → Download MD / JSON (`/api/creator/audience/brief?market=lafayette&format=md|json`).

Sample from current live shape: `docs/sample-lafayette-audience-brief.md`.
