import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import PublicPage from "@/components/public/PublicPage";
import { getNamedProgram, NAMED_PROGRAMS } from "@/lib/fitness/program-templates";
import { buildCanonical } from "@/lib/seo/site";

export function generateStaticParams() {
  return NAMED_PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = getNamedProgram(slug);
  if (!program) return { title: "Program" };
  return {
    title: program.title,
    description: program.summary,
    alternates: { canonical: buildCanonical(`/programs/${program.slug}`) },
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = getNamedProgram(slug);
  if (!program) notFound();
  return (
    <PublicPage
      eyebrow={program.level}
      title={program.title}
      lede={program.summary}
    >
      <p className="font-sans text-sm leading-relaxed text-brand-ink">
        {program.body}
      </p>
      <p className="mt-3 font-sans text-xs uppercase tracking-[0.08em] text-brand-muted">
        {program.daysPerWeek} days · {program.sessionMinutes} min ·{" "}
        {program.audience}
      </p>
      <div className="mt-8 space-y-6">
        {program.days.map((day) => (
          <article
            key={day.label}
            className="border border-brand-ink/10 bg-surface-elevated p-5"
          >
            <h2 className="font-display text-xl text-brand-ink">{day.label}</h2>
            <p className="font-sans text-sm text-brand-muted">{day.focus}</p>
            <ul className="mt-3 space-y-1 font-sans text-sm text-brand-ink">
              {day.exercises.map((ex) => (
                <li key={ex.name}>
                  {ex.sets} × {ex.repMin}-{ex.repMax} {ex.name}
                  {ex.supersetGroup ? ` (superset ${ex.supersetGroup})` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <AdSlot slotId="program-end" label="Local partner" size="banner" />
      <p className="mt-6">
        <Link
          href={`/app/workout?startProgram=${program.slug}`}
          className="inline-flex min-h-11 items-center bg-brand-orange px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
        >
          Start this in Engine
        </Link>
      </p>
    </PublicPage>
  );
}
