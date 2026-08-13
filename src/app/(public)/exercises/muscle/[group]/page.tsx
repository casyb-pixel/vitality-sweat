import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import { getPublicExercises } from "@/lib/fitness/public-exercises";
import { buildCanonical } from "@/lib/seo/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string }>;
}): Promise<Metadata> {
  const { group } = await params;
  return {
    title: `${group} exercises`,
    alternates: { canonical: buildCanonical(`/exercises/muscle/${group}`) },
  };
}

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const exercises = (await getPublicExercises()).filter(
    (ex) => ex.primary_muscle === group,
  );
  return (
    <PublicPage
      eyebrow="Muscle"
      title={`${group} movements`}
      lede="Filter the encyclopedia, then log the work in Engine."
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {exercises.map((ex) => (
          <li key={ex.id}>
            <Link
              href={`/exercises/${ex.slug}`}
              className="block border border-brand-ink/10 px-4 py-3 font-sans text-sm font-semibold hover:border-brand-orange"
            >
              {ex.name}
            </Link>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}
