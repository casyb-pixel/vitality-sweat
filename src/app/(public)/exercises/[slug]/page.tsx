import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import HealthFitnessDisclaimer from "@/components/legal/HealthFitnessDisclaimer";
import JoinEngineCTA from "@/components/marketing/JoinEngineCTA";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import {
  encyclopediaSlugs,
  getEncyclopediaPage,
} from "@/lib/fitness/encyclopedia";
import {
  getPublicExercise,
  getPublicExercises,
} from "@/lib/fitness/public-exercises";
import { getTool } from "@/lib/tools/catalog";
import { buildCanonical } from "@/lib/seo/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const fromDb = await getPublicExercises();
  const slugs = new Set([
    ...fromDb.map((ex) => ex.slug),
    ...encyclopediaSlugs(),
  ]);
  return [...slugs].slice(0, 400).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getEncyclopediaPage(slug);
  const ex = await getPublicExercise(slug);
  if (!ex && !page) return { title: "Exercise" };
  const titleName = page?.name ?? ex?.name ?? "Exercise";
  const muscle = page?.primaryMuscle ?? ex?.primary_muscle;
  const equipment = page?.equipment ?? ex?.equipment;
  const description =
    page?.description ??
    `${titleName} form cues${muscle ? ` for ${muscle}` : ""}${
      equipment ? ` (${equipment})` : ""
    }. Common mistakes, setup, and how to log it in the free Vitality Engine.`;
  return {
    title: `${titleName}: Form, Cues, and Common Mistakes`,
    description,
    alternates: { canonical: buildCanonical(`/exercises/${slug}`) },
  };
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getEncyclopediaPage(slug);
  const ex = await getPublicExercise(slug);
  if (!ex && !page) notFound();

  const name = page?.name ?? ex!.name;
  const eyebrow = page?.eyebrow ?? ex?.primary_muscle ?? "Lift";
  const lede =
    page?.lede ??
    ex?.how_to ??
    "Plant, brace, own the range. Log the set in Engine when you finish.";
  const cues = (page?.cues ?? ex?.cues ?? []).filter(Boolean);
  const logName = name;
  const canonical = buildCanonical(`/exercises/${slug}`);
  const description = page?.description ?? lede;

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "ExercisePlan",
      name,
      url: canonical,
      exerciseType: page?.primaryMuscle ?? ex?.primary_muscle,
      description,
    },
  ];

  if (page && cues.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to do the ${name}`,
      description,
      step: cues.map((cue, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        text: cue,
      })),
    });
  }

  if (page?.faqs.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    });
  }

  return (
    <PublicPage eyebrow={eyebrow} title={name} lede={lede}>
      {page?.hunterNote ? (
        <p className="mb-8 max-w-2xl border-l-4 border-brand-orange pl-4 font-sans text-sm text-brand-ink">
          Hunter: {page.hunterNote}
        </p>
      ) : null}

      {cues.length ? (
        <section className="max-w-2xl">
          <h2 className="font-display text-2xl text-brand-ink">Cues</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm text-brand-ink">
            {cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {page ? (
        <>
          <section className="mt-8 max-w-2xl">
            <h2 className="font-display text-2xl text-brand-ink">Setup</h2>
            <p className="mt-3 font-sans text-base leading-relaxed text-brand-muted">
              {page.setup}
            </p>
          </section>
          {page.body.map((block) => (
            <section key={block.h2} className="mt-8 max-w-2xl">
              <h2 className="font-display text-2xl text-brand-ink">
                {block.h2}
              </h2>
              <p className="mt-3 font-sans text-base leading-relaxed text-brand-muted">
                {block.p}
              </p>
            </section>
          ))}
          <section className="mt-8 max-w-2xl">
            <h2 className="font-display text-2xl text-brand-ink">
              Common misses
            </h2>
            <p className="mt-3 font-sans text-base leading-relaxed text-brand-muted">
              {page.mistakes}
            </p>
          </section>
          <section className="mt-8 max-w-2xl">
            <h2 className="font-display text-2xl text-brand-ink">FAQ</h2>
            {page.faqs.map((faq) => (
              <div key={faq.q} className="mt-4">
                <h3 className="font-sans text-base font-semibold text-brand-ink">
                  {faq.q}
                </h3>
                <p className="mt-1 font-sans text-sm text-brand-muted">
                  {faq.a}
                </p>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p className="mt-4 font-sans text-sm text-brand-muted">
          Tracking: {ex?.tracking_type ?? "weight and reps"}. Equipment:{" "}
          {ex?.equipment ?? "varies"}.
        </p>
      )}

      <AdSlot slotId="exercise-sidebar" label="Local partner" size="banner" />

      <p className="mt-6 max-w-2xl font-sans text-sm font-semibold text-brand-ink">
        {page?.engineCta ??
          "Log this in the free Vitality Engine when you finish the set."}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SignupCtaLink
          location="exercise_end"
          label={`Create free account · ${name}`}
          nextPath={`/app/workout?exercise=${encodeURIComponent(logName)}`}
          className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
        >
          Create free account
        </SignupCtaLink>
        <Link
          href={`/app/workout?exercise=${encodeURIComponent(logName)}`}
          className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange"
        >
          Log this in Engine
        </Link>
      </div>

      {page && (page.relatedSlugs.length || page.relatedTools.length) ? (
        <nav className="mt-10 max-w-2xl" aria-label="Related pages">
          <h2 className="font-display text-2xl text-brand-ink">Related</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {page.relatedTools.map((toolSlug) => {
              const tool = getTool(toolSlug);
              return (
                <li key={toolSlug}>
                  <Link
                    href={`/tools/${toolSlug}`}
                    className="border border-brand-ink/15 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.08em]"
                  >
                    {tool?.title ?? toolSlug}
                  </Link>
                </li>
              );
            })}
            {page.relatedSlugs.map((related) => (
              <li key={related}>
                <Link
                  href={`/exercises/${related}`}
                  className="border border-brand-ink/15 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  {getEncyclopediaPage(related)?.name ?? related}
                </Link>
              </li>
            ))}
            {page.primaryMuscle ? (
              <li>
                <Link
                  href={`/exercises/muscle/${encodeURIComponent(page.primaryMuscle)}`}
                  className="border border-brand-ink/15 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  More {page.primaryMuscle}
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}

      <div className="mt-12">
        <JoinEngineCTA location="exercise_join" variant="end" />
      </div>

      <HealthFitnessDisclaimer compact />
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
    </PublicPage>
  );
}
