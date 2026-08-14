import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import HealthFitnessDisclaimer from "@/components/legal/HealthFitnessDisclaimer";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import {
  getPublicExercise,
  getPublicExercises,
} from "@/lib/fitness/public-exercises";
import { buildCanonical } from "@/lib/seo/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  const exercises = await getPublicExercises();
  return exercises.slice(0, 400).map((ex) => ({ slug: ex.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ex = await getPublicExercise(slug);
  if (!ex) return { title: "Exercise" };
  return {
    title: `How to ${ex.name}`,
    description: `Coaching cues for ${ex.name}. Log it in the free Vitality Engine.`,
    alternates: { canonical: buildCanonical(`/exercises/${ex.slug}`) },
  };
}

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ex = await getPublicExercise(slug);
  if (!ex) notFound();
  const cues = (ex.cues ?? []).filter(Boolean);
  return (
    <PublicPage
      eyebrow={ex.primary_muscle || "Lift"}
      title={ex.name}
      lede={
        ex.how_to ||
        "Plant, brace, own the range. Log the set in Engine when you finish."
      }
    >
      {cues.length ? (
        <ul className="list-disc space-y-1 pl-5 font-sans text-sm text-brand-ink">
          {cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 font-sans text-sm text-brand-muted">
        Tracking: {ex.tracking_type ?? "weight and reps"}. Equipment:{" "}
        {ex.equipment ?? "varies"}.
      </p>
      <AdSlot slotId="exercise-sidebar" label="Local partner" size="banner" />
      <p className="mt-6">
        <Link
          href={`/app/workout?exercise=${encodeURIComponent(ex.name)}`}
          className="inline-flex min-h-11 items-center bg-brand-orange px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
        >
          Log this in Engine
        </Link>
      </p>
      <HealthFitnessDisclaimer compact />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ExercisePlan",
          name: ex.name,
          url: buildCanonical(`/exercises/${ex.slug}`),
          exerciseType: ex.primary_muscle,
        }}
      />
    </PublicPage>
  );
}
