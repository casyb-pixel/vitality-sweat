import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { getFeaturedBlogPost } from "@/lib/blog/posts";
import { buildCanonical, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} | Train. Fuel. Compete.`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: buildCanonical("/"),
  },
  openGraph: {
    url: buildCanonical("/"),
    title: `${SITE_NAME} | Train. Fuel. Compete.`,
    description: DEFAULT_DESCRIPTION,
  },
};

const PILLARS = [
  {
    title: "General Fitness",
    copy: "On-demand training that builds strength, stamina, and consistency — wherever you train.",
    image: "/images/pillar-general-fitness.png",
    alt: "Athlete training for general fitness",
  },
  {
    title: "Peak Nutrition",
    copy: "Heart-healthy plans that fuel performance without sacrificing real life in Southwest Louisiana.",
    image: "/images/pillar-nutrition-heart-healthy.png",
    alt: "Heart-healthy nutrition guidance",
  },
  {
    title: "Youth Baseball",
    copy: "Pitching, catching, hitting, and fielding lessons that develop confident young athletes.",
    image: "/images/pillar-youth-baseball-lessons.png",
    alt: "Youth baseball lessons",
  },
] as const;

export default function HomePage() {
  const featuredPost = getFeaturedBlogPost();

  return (
    <>
      {/* HERO — one composition: brand, headline, support, CTAs, full-bleed media */}
      <section className="relative isolate min-h-[min(92vh,56rem)] overflow-hidden bg-surface-dark text-white">
        <Image
          src="/images/gallery-battle-ropes-beach.jpg"
          alt="Athlete driving battle ropes on the sand — raw effort, focused sweat"
          fill
          priority
          sizes="100vw"
          className="animate-hero-media object-cover object-[center_30%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/55 to-black/35"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25"
        />

        <div className="site-shell relative flex min-h-[min(92vh,56rem)] flex-col justify-end pb-16 pt-28 sm:pb-20 sm:pt-32">
          <p className="animate-fade-up eyebrow text-white/75">
            Hunter Broussard · Southwest Louisiana
          </p>
          <h1 className="animate-fade-up-delay mt-4 max-w-3xl font-display text-[clamp(2.75rem,8vw,5.25rem)] leading-[0.95] tracking-tight text-balance">
            Vitality Sweat
          </h1>
          <p className="animate-fade-up-delay-2 mt-5 max-w-xl font-sans text-lg leading-relaxed text-white/88 sm:text-xl">
            Train with purpose. Eat for performance. Build the next generation of
            athletes — one sweat-honest session at a time.
          </p>
          <div className="animate-fade-up-delay-2 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="#launch"
              className="inline-flex items-center justify-center bg-brand-orange px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
            >
              Launch App
            </Link>
            <Link
              href="/chronicles"
              className="inline-flex items-center justify-center border border-white/40 bg-white/5 px-7 py-3.5 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/15"
            >
              Read The Chronicles
            </Link>
          </div>
        </div>
      </section>

      <div className="section-y site-shell">
        <AdSlot slotId="home-below-hero" size="leaderboard" />
      </div>

      {/* INTRO — Hunter&apos;s journey */}
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
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-ink/40 to-transparent"
            />
          </div>

          <div className="lg:col-span-7">
            <p className="eyebrow text-brand-orange">The journey</p>
            <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] text-brand-ink text-balance">
              Built from grit, coached with heart.
            </h2>
            <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-brand-muted">
              Vitality Sweat is Hunter Broussard&apos;s platform for athletes and
              families who want more than generic programs — real coaching,
              nutrition that fits your kitchen, and youth baseball development
              rooted in Southwest Louisiana.
            </p>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-brand-muted">
              From the first workout plan to the Sweatlife Chronicles, every
              piece is designed to help you show up stronger — in the gym, on
              the field, and in everyday life.
            </p>
            <Link
              href="/chronicles"
              className="mt-8 inline-flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange transition-colors hover:text-brand-orange-deep"
            >
              Explore Sweatlife Chronicles
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Brand collage strip — live-site hero asset as visual proof */}
      <section className="overflow-hidden bg-brand-ink">
        <div className="relative mx-auto aspect-[16/9] max-h-[28rem] w-full sm:aspect-[21/9] sm:max-h-[32rem]">
          <Image
            src="/images/hero-strength-stamina-collage.png"
            alt="Strength training, mobility, and youth baseball — the Vitality Sweat pillars in one frame"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      </section>

      {/* Pillars */}
      <section className="section-y">
        <div className="site-shell">
          <div className="max-w-2xl">
            <p className="eyebrow">How we train</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
              Three paths. One standard: show up and sweat.
            </h2>
          </div>

          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="group">
                <div className="relative mb-5 aspect-[4/3] overflow-hidden bg-brand-ink/5">
                  <Image
                    src={pillar.image}
                    alt={pillar.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-display text-2xl text-brand-ink">
                  {pillar.title}
                </h3>
                <p className="mt-2 font-sans leading-relaxed text-brand-muted">
                  {pillar.copy}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="site-shell pb-[var(--section-y)]">
        <AdSlot slotId="home-mid-content" size="banner" className="mx-auto" />
      </div>

      {/* Field culture */}
      <section className="section-y bg-surface-elevated">
        <div className="site-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow text-brand-orange">On the diamond</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
              Youth baseball with local pride.
            </h2>
            <p className="mt-5 font-sans text-lg leading-relaxed text-brand-muted">
              Lessons in pitching, catching, hitting, and fielding — built for
              young athletes who want fundamentals that stick and confidence
              that shows up on game day.
            </p>
          </div>
          <div className="relative order-1 aspect-[5/4] overflow-hidden lg:order-2">
            <Image
              src="/images/stock/sports/baseball-softball-gear.jpg"
              alt="Baseball and softball gear ready for practice"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Field culture */}
      <section className="section-y bg-surface-elevated">
        <div className="site-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow text-brand-orange">On the diamond</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
              Youth baseball with local pride.
            </h2>
            <p className="mt-5 font-sans text-lg leading-relaxed text-brand-muted">
              Lessons in pitching, catching, hitting, and fielding — built for
              young athletes who want fundamentals that stick and confidence
              that shows up on game day.
            </p>
          </div>
          <div className="relative order-1 aspect-[5/4] overflow-hidden lg:order-2">
            <Image
              src="/images/stock/sports/baseball-softball-gear.jpg"
              alt="Baseball and softball gear ready for practice"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Featured Chronicles */}
      <section className="section-y">
        <div className="site-shell">
          <p className="eyebrow text-brand-orange">Sweatlife Chronicles</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-brand-ink text-balance">
            Featured from The Sweatlife Chronicles
          </h2>
          <p className="mt-3 max-w-xl font-sans text-lg text-brand-muted">
            {featuredPost.excerpt}
          </p>

          <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="relative min-h-[18rem] overflow-hidden bg-brand-ink/5 lg:col-span-7 lg:min-h-[24rem]">
              <Image
                src={featuredPost.coverImage}
                alt={featuredPost.coverAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center lg:col-span-5">
              <p className="eyebrow">Weight loss · Nutrition</p>
              <h3 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-brand-ink text-balance">
                {featuredPost.title}
              </h3>
              {featuredPost.subtitle ? (
                <p className="mt-3 font-display text-lg text-brand-orange">
                  {featuredPost.subtitle}
                </p>
              ) : null}
              <p className="mt-4 font-sans leading-relaxed text-brand-muted">
                {featuredPost.description}
              </p>
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="mt-8 inline-flex w-fit items-center justify-center bg-brand-orange px-7 py-3.5 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep"
              >
                Read Article
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Launch CTA */}
      <section
        id="launch"
        className="relative isolate overflow-hidden bg-surface-dark py-[var(--section-y)] text-white"
      >
        <Image
          src="/images/stock/fitness/stair-runners.jpg"
          alt="Athletes charging stairs together"
          fill
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div aria-hidden className="absolute inset-0 bg-brand-ink/75" />
        <div className="site-shell relative max-w-3xl text-center">
          <p className="eyebrow text-brand-orange">Ready when you are</p>
          <h2 className="mt-3 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-balance">
            Launch the Vitality Sweat app experience.
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-sans text-lg leading-relaxed text-white/85">
            Training videos, nutrition plans, and baseball lessons — organized
            for the way you actually live and train.
          </p>
          <Link
            href="https://vitalitysweat.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-9 inline-flex items-center justify-center bg-brand-orange px-8 py-4 font-sans text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-orange-deep"
          >
            Launch App
          </Link>
        </div>
      </section>

      <footer className="border-t border-brand-ink/10 bg-surface-elevated py-10">
        <div className="site-shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Image
            src="/branding/logo-black-transparent.svg"
            alt="Vitality Sweat"
            width={140}
            height={40}
            sizes="140px"
            className="h-9 w-auto"
          />
          <p className="font-sans text-sm text-brand-muted">
            © {new Date().getFullYear()} Vitality Sweat. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
