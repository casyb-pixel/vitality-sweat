import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import { METROS } from "@/lib/markets/metros";
import {
  absoluteUrl,
  APP_PRODUCT_NAME,
  BRAND_DISAMBIGUATING_DESCRIPTION,
  BRAND_ENTITY_DEFINITION,
  BRAND_KNOWS_ABOUT,
  buildCanonical,
  EDITORIAL_NAME,
  FOUNDING_PERSON_NAME,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL_PROFILE_URLS,
  SWEATLIFE_SHORT,
} from "@/lib/seo/site";

const ABOUT_DESCRIPTION = BRAND_ENTITY_DEFINITION;

export const metadata: Metadata = {
  title: "About Vitality Sweat",
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: buildCanonical("/about"),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: buildCanonical("/about"),
    siteName: SITE_NAME,
    title: `About Vitality Sweat | ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/images/hunter-broussard-portrait.jpg"),
        width: 1200,
        height: 630,
        alt: "Hunter Broussard, founder of Vitality Sweat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About Vitality Sweat | ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
    images: [absoluteUrl("/images/hunter-broussard-portrait.jpg")],
  },
};

const SERVICES = [
  {
    title: "General fitness",
    copy: "On-demand training that builds strength, stamina, and consistency for athletes and families who train at home, in the gym, or outdoors.",
  },
  {
    title: "Peak nutrition",
    copy: "Heart-healthy meal planning and grocery lists shaped for real kitchens and real schedules in Southwest Louisiana.",
  },
  {
    title: "Youth baseball",
    copy: "Pitching, catching, hitting, and fielding lessons that develop confident young athletes with fundamentals that stick.",
  },
] as const;

function buildAboutJsonLd() {
  const aboutUrl = buildCanonical("/about");
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE_NAME}`,
    url: aboutUrl,
    description: ABOUT_DESCRIPTION,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: SITE_NAME,
      url: SITE_URL,
      slogan: SITE_TAGLINE,
      description: BRAND_ENTITY_DEFINITION,
      disambiguatingDescription: BRAND_DISAMBIGUATING_DESCRIPTION,
      knowsAbout: [...BRAND_KNOWS_ABOUT],
      sameAs: SOCIAL_PROFILE_URLS,
      founder: {
        "@type": "Person",
        name: FOUNDING_PERSON_NAME,
        jobTitle: "Founder and coach",
        url: aboutUrl,
      },
      areaServed: [
        {
          "@type": "AdministrativeArea",
          name: "Southwest Louisiana",
        },
        ...METROS.filter((m) => m.id !== "other-swla").map((metro) => ({
          "@type": "City",
          name: metro.shortLabel,
        })),
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "info@vitalitysweat.com",
          areaServed: "US-LA",
          availableLanguage: "English",
        },
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: "hello@vitalitysweat.com",
          areaServed: "US-LA",
          availableLanguage: "English",
        },
      ],
    },
  };
}

export default function AboutPage() {
  return (
    <>
      <JsonLd data={buildAboutJsonLd()} />
      <div className="bg-surface">
        <section className="relative isolate overflow-hidden bg-surface-dark text-white">
          <Image
            src="/images/gallery-battle-ropes-beach.jpg"
            alt="Athlete training outdoors with Vitality Sweat energy"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_30%] opacity-45"
          />
          <div aria-hidden className="absolute inset-0 bg-brand-ink/75" />
          <div className="site-shell relative section-y pb-16 pt-28 sm:pt-32">
            <p className="eyebrow text-brand-orange">About the brand</p>
            <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,7vw,4.25rem)] leading-[0.95] text-balance">
              Vitality Sweat
            </h1>
            <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-white/88">
              Vitality Sweat is Hunter Broussard&apos;s Southwest Louisiana
              training, coaching, nutrition, and youth baseball brand. We build
              athletes and families through sweat-honest sessions, meal plans that
              fit real kitchens, and diamond fundamentals.
            </p>
          </div>
        </section>

        <section className="section-y bg-surface-elevated">
          <div className="site-shell grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="relative aspect-[4/5] overflow-hidden lg:col-span-5">
              <Image
                src="/images/hunter-broussard-portrait.jpg"
                alt="Hunter Broussard, founder of Vitality Sweat"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-top"
              />
            </div>
            <div className="lg:col-span-7">
              <p className="eyebrow text-brand-orange">Founder</p>
              <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] text-brand-ink text-balance">
                Hunter Broussard
              </h2>
              <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-brand-muted">
                Hunter built Vitality Sweat from grit, local pride, and a
                coaching standard that rejects generic programs. Every workout,
                meal plan, and baseball lesson is meant to help people show up
                stronger in the gym, on the field, and in everyday life.
              </p>
              <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-brand-muted">
                Based in Southwest Louisiana, Hunter coaches athletes and
                families who want practical training, nutrition that fits real
                kitchens, and youth baseball development rooted in community.
              </p>
            </div>
          </div>
        </section>

        <section className="section-y">
          <div className="site-shell">
            <p className="eyebrow">What we offer</p>
            <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
              Fitness, nutrition, and youth baseball under one brand.
            </h2>
            <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {SERVICES.map((service) => (
                <li key={service.title}>
                  <h3 className="font-display text-2xl text-brand-ink">
                    {service.title}
                  </h3>
                  <p className="mt-2 font-sans leading-relaxed text-brand-muted">
                    {service.copy}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section-y bg-surface-elevated">
          <div className="site-shell max-w-3xl">
            <p className="eyebrow text-brand-orange">{APP_PRODUCT_NAME}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
              The free app inside Vitality Sweat
            </h2>
            <p className="mt-5 font-sans text-lg leading-relaxed text-brand-muted">
              The {APP_PRODUCT_NAME} is the free member app from Vitality Sweat.
              Create an account for workouts, meal plans, and shareable grocery
              lists built for how Southwest Louisiana trains and eats. Vitality
              Sweat is the brand. {APP_PRODUCT_NAME} is the product you open to
              train and fuel.
            </p>
            <p className="mt-4 font-sans text-lg leading-relaxed text-brand-muted">
              Stories and coaching notes live in {EDITORIAL_NAME} ({SWEATLIFE_SHORT}
              ). A small store carries official Vitality Sweat training gear for
              the coaching community. Merch is secondary to coaching, nutrition,
              and youth baseball.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignupCtaLink
                location="about_engine"
                label="Create free account"
                className="inline-flex items-center justify-center bg-brand-orange px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
              >
                Create free account
              </SignupCtaLink>
              <Link
                href="/chronicles"
                className="inline-flex items-center justify-center border border-brand-ink/20 px-7 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-ink"
              >
                Read The Chronicles
              </Link>
            </div>
          </div>
        </section>

        <section id="contact" className="section-y">
          <div className="site-shell grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow text-brand-orange">Contact</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
                Reach Vitality Sweat
              </h2>
              <p className="mt-5 font-sans text-lg leading-relaxed text-brand-muted">
                Questions about coaching, the {APP_PRODUCT_NAME} app, or
                partnerships? Email the Vitality Sweat team and we will point
                you to the right next step.
              </p>
              <ul className="mt-8 space-y-4 font-sans text-base text-brand-ink">
                <li>
                  <span className="block text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
                    General
                  </span>
                  <a
                    href="mailto:info@vitalitysweat.com"
                    className="mt-1 inline-block font-semibold transition-colors hover:text-brand-orange"
                  >
                    info@vitalitysweat.com
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
                    Partnerships
                  </span>
                  <a
                    href="mailto:hello@vitalitysweat.com?subject=Vitality%20Sweat%20inquiry"
                    className="mt-1 inline-block font-semibold transition-colors hover:text-brand-orange"
                  >
                    hello@vitalitysweat.com
                  </a>
                </li>
                <li>
                  <span className="block text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
                    Website
                  </span>
                  <a
                    href={SITE_URL}
                    className="mt-1 inline-block font-semibold transition-colors hover:text-brand-orange"
                  >
                    vitalitysweat.com
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow text-brand-orange">Service area</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
                Southwest Louisiana first
              </h2>
              <p className="mt-5 font-sans text-lg leading-relaxed text-brand-muted">
                Vitality Sweat is rooted in Southwest Louisiana / Acadiana. We
                serve athletes and families across our beachhead metros, with
                digital training available wherever you open the app.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {METROS.map((metro) => (
                  <li
                    key={metro.id}
                    className="border-l-2 border-brand-orange pl-4 font-sans text-base font-semibold text-brand-ink"
                  >
                    {metro.shortLabel}
                    <span className="mt-0.5 block text-sm font-medium text-brand-muted">
                      {metro.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
