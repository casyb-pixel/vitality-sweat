import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicExercises } from "@/lib/fitness/public-exercises";
import { featuredEncyclopediaPages } from "@/lib/fitness/encyclopedia";
import { buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "How to do the lifts",
  description:
    "Simple cues for first-gym and everyday lifts. Log every set in the free Vitality Engine.",
  alternates: { canonical: buildCanonical("/exercises") },
};

export const revalidate = 3600;

export default async function ExercisesHubPage() {
  const exercises = await getPublicExercises();
  const muscles = [
    ...new Set(exercises.map((e) => e.primary_muscle).filter(Boolean)),
  ];
  return (
    <PublicPage
      eyebrow="Exercises"
      title="Pick a lift. Own the reps."
      lede="How-to pages for the gym floor, not a challenge board. Read the cues, do the set, log it in Engine. Coaching notes, not medical advice."
    >
      <section className="max-w-2xl">
        <h2 className="font-display text-2xl text-brand-ink">
          If the gym still feels huge, start here
        </h2>
        <p className="mt-2 font-sans text-sm text-brand-muted">
          These are week-one lifts. Goblet squat, a press you can control, a
          row, a hinge, a carry. Not a contest. A place to start.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {featuredEncyclopediaPages().map((page) => (
            <li key={page.slug}>
              <Link
                href={`/exercises/${page.slug}`}
                className="block border border-brand-orange/40 bg-surface-elevated px-4 py-3 hover:border-brand-orange"
              >
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {page.name}
                </p>
                <p className="font-sans text-xs text-brand-muted">
                  {page.eyebrow}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-2xl text-brand-ink">All lifts</h2>
        <p className="mt-2 font-sans text-sm text-brand-muted">
          Same idea: tap a name, read the cues, log the set.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {muscles.slice(0, 16).map((m) => (
            <Link
              key={m}
              href={`/exercises/muscle/${m}`}
              className="border border-brand-ink/15 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-[0.08em]"
            >
              {m}
            </Link>
          ))}
        </div>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <Link
                href={`/exercises/${ex.slug}`}
                className="block border border-brand-ink/10 bg-surface-elevated px-4 py-3 hover:border-brand-orange"
              >
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {ex.name}
                </p>
                <p className="font-sans text-xs text-brand-muted">
                  {ex.primary_muscle} · {ex.equipment}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vitality Sweat lifts",
          url: buildCanonical("/exercises"),
        }}
      />
    </PublicPage>
  );
}
