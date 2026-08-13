## Verdict

On-page brand basics on the homepage are mostly fine (H1, title, OG title, Organization JSON-LD all say **Vitality Sweat**). You are likely losing exact-brand SERPs mainly to **name collision with [shopvitality.com](https://shopvitality.com/)**, **thin entity/off-site signals**, **migration equity breaks (old WP URLs 404)**, and **three public brand names** (Vitality Sweat / Vitality Engine / Sweatlife). Code is not noindexing the homepage.

---

## (a) Top reasons you may not surface for “vitalitysweat” / “vitality sweat”

1. **SERP collision with a dominant “Vitality” athletic brand**  
   Unrestricted searches for those queries currently surface Vitality Athletic Apparel (`shopvitality.com`), not you. “Vitality” + “sweat” reads as apparel language to Google. Exact-match domain helps, but entity authority does not yet win.

2. **Legacy WordPress URL equity is broken**  
   Featured/migrated post `sourceUrl` is `https://vitalitysweat.com/calorie-deficit-weight-loss-golden-rule/`. Live that path 308s to `/calorie-deficit-weight-loss-golden-rule`, which **404s**. Canonical content lives at `/blog/calorie-deficit-weight-loss-golden-rule`. Old indexed WP URLs are dead ends.

3. **Triple-brand naming dilutes the entity**  
   - Public brand: **Vitality Sweat** (`SITE_NAME`)  
   - App / CTAs / invite: **Vitality Engine**  
   - Editorial: **Sweatlife Chronicles**  
   Homepage H1 is correct, but bottom CTA is “Create your free Vitality Engine account.” Invite is indexable as “Join Vitality Engine.” Google may not confidently map all three to one brand homepage.

4. **No About / Contact entity page**  
   No `/about` or `/contact`. Footer is legal + social only. Weak “who is this brand?” surface for Knowledge Panel / brand SERP features.

5. **Schema is thin for brand discovery**  
   Root injects `Organization` only (name, url, logo, description, sameAs). Missing: `WebSite`, `alternateName` (`vitalitysweat`, `Vitality Engine`), `founder`/`Person`, `LocalBusiness`/NAP, `SearchAction`. Blog Article authors are often just `"Hunter"`, not a strong linked Person.

6. **Meta description does not lead with the brand**  
   Default description starts with “On-demand fitness training…” and never says “Vitality Sweat.” Title/H1 do; snippet text does not reinforce exact brand.

7. **Host / crawl polish issues (secondary)**  
   - `www` → apex is **307 Temporary**, not 301 Permanent.  
   - Sitemap works now (homepage priority 1, store 0.8), but an earlier fetch returned **500** (possible flaky `/sitemap.xml` when Supabase catalog fails).  
   - `/advertise` exists and is indexable but is **not** in the sitemap.  
   - Live homepage HTML is missing `og:site_name` (layout sets it; homepage `openGraph` override appears to drop it).

8. **Store is not the main problem, but it feeds the apparel confusion**  
   `/store` clearly says “Vitality Sweat Store.” That reinforces brand, but also pushes “merch/apparel” interpretation next to shopvitality.com. Cart/checkout are correctly `noindex`.

**What is already OK (not the blocker):**  
robots allow `/`, disallow `/app/` and `/api/`; root `robots` index/follow; homepage canonical `https://vitalitysweat.com`; H1 = “Vitality Sweat”; title/OG title = “Vitality Sweat | Train. Fuel. Compete.”; social `sameAs` wired; member app areas noindexed.

---

## (b) Ranked fix list

| Rank | Fix | Why |
|------|-----|-----|
| 1 | **301 old WP paths → `/blog/{slug}`** (at least calorie-deficit; ideally full WP map) | Recover brand + content equity currently 404ing |
| 2 | **GSC: property verification, sitemap submit, inspect homepage, request indexing, check “Vitality Sweat” queries / Coverage** | Confirm crawl/index state post-migration |
| 3 | **Off-site entity: Google Business Profile + consistent NAP + social bios all say Vitality Sweat + link to apex** | Brand SERPs are mostly entity, not on-page |
| 4 | **Add About (and Contact) page** with clear “Vitality Sweat is…”, Hunter, location, links to Engine/Chronicles/Store as products | Creates a durable brand entity URL |
| 5 | **Enrich JSON-LD**: `WebSite` + `Organization` with `alternateName`, founder `Person`, optional `LocalBusiness`; use full author name | Helps Google bind names to one org |
| 6 | **Naming policy on public pages**: lead with Vitality Sweat; treat Engine/Chronicles as product lines in copy/titles | Reduce entity split |
| 7 | **Rewrite default meta/OG description** to start with “Vitality Sweat…”; restore `og:site_name` on homepage | Stronger brand snippet signals |
| 8 | **www → apex as 301**; harden sitemap so catalog failures cannot 500 the whole file | Cleaner host + crawl reliability |
| 9 | **Invite: noindex** (or explicit self-canonical); keep Engine wording off primary brand landing titles | Stop secondary brand page competing |
| 10 | **Store**: keep, but frame as “official Vitality Sweat gear” under coaching brand, not as primary identity | Limit apparel-SERP confusion |
| 11 | **Off-site mentions**: directories, local press, Linktree, YouTube About, Instagram name = Vitality Sweat (not only @handle) | Exact-brand discovery fuel |
| 12 | Add `/advertise` to sitemap only if you want it indexed | Completeness, low brand impact |

---

## (c) Code vs Google / off-site

| Bucket | Items |
|--------|--------|
| **Code** | WP→`/blog` redirects; About/Contact pages; richer JSON-LD; meta description + `og:site_name`; naming cleanup on homepage/invite/CTA; invite `noindex`; sitemap harden + optional `/advertise`; prefer 301 for www (Vercel/DNS or Next redirects) |
| **GSC / Search** | Verify both www and apex (or domain property); submit sitemap; URL Inspection on `/` and key blog URLs; monitor 404s for old WP paths; brand query tracking |
| **Business Profile / off-site** | GBP (if local coaching applies); Facebook/IG/YouTube/X name consistency; citations and backlinks using exact “Vitality Sweat”; avoid leading public identity with “Vitality Engine” alone |
| **Not primarily code** | Beating shopvitality.com on fuzzy “vitality + sweat” without strong entity + citations; that is authority/entity work |

---

**Bottom line:** The homepage already says Vitality Sweat where it matters most. Exact-brand ranking is blocked more by **competitor entity collision**, **dead WP URLs**, **missing About/entity schema**, and **Vitality Engine / Sweatlife name split** than by robots/noindex. I have not implemented anything; say if you want a phased implementation PR starting with redirects + schema + meta.