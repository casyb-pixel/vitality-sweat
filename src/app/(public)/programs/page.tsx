import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import { NAMED_PROGRAMS } from "@/lib/fitness/program-templates";
import { buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "Named plans you can start in the free Vitality Engine: first gym, dorm, PPL, 5x5, baseball, feel-18 rebuild.",
  alternates: { canonical: buildCanonical("/programs") },
};

export default function ProgramsHubPage() {
  return (
    <PublicPage
      eyebrow="Programs"
      title="Start from a proven plan"
      lede="AI still writes custom weeks. These named templates are for people who want a starting lineup."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {NAMED_PROGRAMS.map((program) => (
          <li key={program.slug}>
            <Link
              href={`/programs/${program.slug}`}
              className="block h-full border border-brand-ink/10 bg-surface-elevated p-5 hover:border-brand-orange"
            >
              <p className="eyebrow text-brand-orange">{program.level}</p>
              <h2 className="mt-2 font-display text-2xl text-brand-ink">
                {program.title}
              </h2>
              <p className="mt-2 font-sans text-sm text-brand-muted">
                {program.summary}
              </p>
              <p className="mt-3 font-sans text-xs uppercase tracking-[0.08em] text-brand-muted">
                {program.daysPerWeek} days · {program.sessionMinutes} min
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <AdSlot slotId="program-end" label="Local partner" size="banner" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vitality Sweat programs",
          url: buildCanonical("/programs"),
        }}
      />
    </PublicPage>
  );
}
