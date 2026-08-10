# Growth Campaign + invite landing (Phase 1b)

## Creator Studio — Growth Campaign

On the **Projects** tab, **Growth Campaign** templates seed the 90-day beachhead cadence:

| Template | Outputs |
| --- | --- |
| Weekly challenge post | Chronicles outline, FB/IG/X captions, UTM CTA |
| Gym QR landing blurb | Outline + `/invite?src=gym&gym=…` print URL |
| Grocery-list share contest | Outline + contest captions + Engine CTA |

**Launch in Blog Wizard** sets article type **Local growth** and prefills notes. Publish always runs Phase 0d growth packaging (`includeGrowthCta`, mid AdSlot, Join CTA).

**Launch App invite video** switches to Video Studio with **App invite** script preset (hook → tip → free app CTA). Saving the social package still writes `growth_promo_pack`.

## Blog Wizard — Local growth

Phase 1 article type toggle. Biases AI prompts toward SWLA fitness, Rouses-run meal prep, and gym tracking habits. Forces Engine CTA packaging on save.

## Video Studio — App invite

Script preset on blog pick. Ideas may include `scriptBeats` { hook, tip, cta }. Growth promo pack unchanged (Phase 0d).

## Public `/invite`

Gym QR / campaign landing. Query params (`src`, `gym`, `utm_*`, optional `ref`) are stored in sessionStorage and passed into signup `user_metadata` (`campaign_src`, `campaign_gym`, `utm_*`) for later sponsor attribution. Example: `/invite?src=gym&gym=reds`.

CTA opens `/?auth=signup&next=/app&src=…&gym=…&utm_…` via existing AuthGate helpers.
