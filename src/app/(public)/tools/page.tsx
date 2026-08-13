import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { TOOLS } from "@/lib/tools/catalog";
import { buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Fitness calculators and tools",
  description:
    "Free TDEE, macros, 1RM, plate, heart rate, pace, BMI, and creatine tools from Vitality Sweat. Save the number in the Vitality Engine.",
  alternates: { canonical: buildCanonical("/tools") },
};

export default function ToolsHubPage() {
  return (
    <>
      <main className="bg-surface">
        <section className="site-shell section-y">
          <p className="eyebrow text-brand-orange">Tools</p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.8rem)] leading-[0.95] text-brand-ink">
            Numbers you can actually use
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-base text-brand-muted">
            Calculators for training and fuel. Then log the work in the free
            Vitality Engine. These are estimates, not medical advice.
          </p>
          <AdSlot slotId="tools-inline" label="Local partner" size="banner" />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="block h-full border border-brand-ink/10 bg-surface-elevated p-5 hover:border-brand-orange"
                >
                  <p className="eyebrow text-brand-orange">{tool.eyebrow}</p>
                  <h2 className="mt-2 font-display text-2xl text-brand-ink">
                    {tool.title}
                  </h2>
                  <p className="mt-2 font-sans text-sm text-brand-muted">
                    {tool.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vitality Sweat fitness tools",
          url: buildCanonical("/tools"),
        }}
      />
      <SiteFooter />
    </>
  );
}
