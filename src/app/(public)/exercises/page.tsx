import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicExercises } from "@/lib/fitness/public-exercises";
import { buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Exercise encyclopedia",
  description:
    "How to do the lifts in Hunter's voice. Log every one in the free Vitality Engine.",
  alternates: { canonical: buildCanonical("/exercises") },
};

export const revalidate = 3600;

export default async function ExercisesHubPage() {
  const exercises = await getPublicExercises();
  const muscles = [...new Set(exercises.map((e) => e.primary_muscle).filter(Boolean))];
  return (
    <PublicPage
      eyebrow="Exercises"
      title="Every lift gets a URL"
      lede="Cues, tracking type, and a button to log it in Engine. These are coaching notes, not medical advice."
    >
      <p className="font-sans text-sm text-brand-muted">
        {exercises.length} movements in the shared catalog.
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
      <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vitality Sweat exercise encyclopedia",
          url: buildCanonical("/exercises"),
        }}
      />
    </PublicPage>
  );
}
