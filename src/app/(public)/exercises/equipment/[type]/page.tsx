import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import { getPublicExercises } from "@/lib/fitness/public-exercises";
import { buildCanonical } from "@/lib/seo/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  return {
    title: `${type} exercises`,
    alternates: { canonical: buildCanonical(`/exercises/equipment/${type}`) },
  };
}

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const exercises = (await getPublicExercises()).filter(
    (ex) => ex.equipment === type,
  );
  return (
    <PublicPage
      eyebrow="Equipment"
      title={`${type} movements`}
      lede="Same catalog the Engine uses. Tap a name, then log it."
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
