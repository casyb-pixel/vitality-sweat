import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import AdvertiseInquiryForm from "@/components/marketing/AdvertiseInquiryForm";
import { RATE_CARD_PACKAGES } from "@/lib/markets/audience-brief";
import { METROS } from "@/lib/markets/metros";
import { buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Advertise with Vitality Sweat",
  description:
    "Local sponsorship packages for Lafayette / SWLA: home, Chronicles, blog, and grocery share inventory. Free consumer app stays free.",
  alternates: {
    canonical: buildCanonical("/advertise"),
  },
};

export default function AdvertisePage() {
  return (
    <>
      <main className="bg-surface">
        <section className="relative isolate overflow-hidden bg-surface-dark text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-brand-ink via-brand-ink to-brand-orange/40"
          />
          <div className="site-shell relative section-y pb-16 pt-28 sm:pt-32">
            <p className="eyebrow text-brand-orange">Local sponsorships</p>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,7vw,4.25rem)] leading-[0.95] text-balance">
              Rate card
            </h1>
            <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-white/88">
              Direct-sold flights for gyms and grocery partners. No AdSense.
              Consumer Engine stays free; this page packages inventory for sales
              conversations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:hello@vitalitysweat.com?subject=Sponsorship%20inquiry"
                className="inline-flex items-center justify-center bg-brand-orange px-6 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
              >
                Talk sponsorships
              </a>
              <Link
                href="/?market=lafayette"
                className="inline-flex items-center justify-center border border-white/40 px-6 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white hover:border-white"
              >
                Preview Lafayette landing
              </Link>
            </div>
          </div>
        </section>

        <section className="section-y site-shell">
          <h2 className="font-display text-2xl text-brand-ink sm:text-3xl">
            Impression packages
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
            Planning estimates for beachhead metros. Live proof (impressions /
            clicks) ships from Creator Studio Audience Briefs once flights run.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {RATE_CARD_PACKAGES.map((pkg) => (
              <article
                key={pkg.id}
                className="border border-brand-ink/10 bg-surface-elevated px-5 py-6"
              >
                <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange">
                  {pkg.id}
                </p>
                <h3 className="mt-2 font-display text-xl text-brand-ink">
                  {pkg.name}
                </h3>
                <p className="mt-4 font-sans text-sm font-semibold text-brand-ink">
                  {pkg.impressions}
                </p>
                <p className="mt-2 font-sans text-sm text-brand-muted">
                  Slots: {pkg.slots}
                </p>
                <p className="mt-3 font-sans text-sm leading-relaxed text-brand-muted">
                  {pkg.notes}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-6 font-sans text-xs text-brand-muted">
            *Impression ranges are planning estimates until live events
            accumulate. No payments are processed on this site.
          </p>
        </section>

        <section className="border-t border-brand-ink/10 bg-surface-elevated section-y">
          <div className="site-shell">
            <h2 className="font-display text-2xl text-brand-ink">
              City playbook markets
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm text-brand-muted">
              Use{" "}
              <code className="text-brand-ink">?market=lafayette</code> (or
              another metro id) on the home page for localized hero / CTA copy
              without forking the site.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METROS.map((metro) => (
                <li key={metro.id}>
                  <Link
                    href={`/?market=${metro.id}`}
                    className="block border border-brand-ink/10 bg-surface px-4 py-4 transition-colors hover:border-brand-orange"
                  >
                    <p className="font-display text-lg text-brand-ink">
                      {metro.shortLabel}
                    </p>
                    <p className="mt-1 font-sans text-xs text-brand-muted">
                      {metro.zips.length} mapped ZIPs · ?market={metro.id}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section-y site-shell">
          <h2 className="font-display text-2xl text-brand-ink">
            Keep the Engine free
          </h2>
          <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-brand-muted">
            Sponsorships fund local density. Members still get workouts, meal
            plans, and grocery lists at no charge.
          </p>
          <SignupCtaLink
            location="advertise_footer"
            label="Create free account"
            className="mt-6 inline-flex items-center justify-center bg-brand-orange px-6 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep"
          >
            Create free account
          </SignupCtaLink>
          <AdvertiseInquiryForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
