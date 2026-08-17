import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import ToolCalculator from "@/components/tools/ToolCalculator";
import { getTool, TOOLS } from "@/lib/tools/catalog";
import { absoluteUrl, buildCanonical } from "@/lib/seo/site";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: buildCanonical(`/tools/${tool.slug}`) },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url: buildCanonical(`/tools/${tool.slug}`),
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const url = buildCanonical(`/tools/${tool.slug}`);

  return (
    <>
      <main className="bg-surface">
        <article className="site-shell section-y">
          <nav className="font-sans text-xs text-brand-muted">
            <Link href="/">Home</Link>
            {" / "}
            <Link href="/tools">Tools</Link>
            {" / "}
            <span>{tool.title}</span>
          </nav>
          <p className="eyebrow mt-6 text-brand-orange">{tool.eyebrow}</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.2rem)] leading-[0.95] text-brand-ink">
            {tool.title}
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-base text-brand-muted">
            {tool.description}
          </p>
          <p className="mt-3 max-w-2xl border-l-4 border-brand-orange pl-4 font-sans text-sm text-brand-ink">
            Hunter: {tool.hunterNote}
          </p>

          <div className="mt-8 max-w-xl">
            <ToolCalculator slug={tool.slug} />
          </div>

          <AdSlot slotId="tools-inline" label="Local partner" size="banner" />

          {tool.body.map((block) => (
            <section key={block.h2} className="mt-10 max-w-2xl">
              <h2 className="font-display text-2xl text-brand-ink">{block.h2}</h2>
              <p className="mt-3 font-sans text-base leading-relaxed text-brand-muted">
                {block.p}
              </p>
            </section>
          ))}

          <section className="mt-10 max-w-2xl">
            <h2 className="font-display text-2xl text-brand-ink">FAQ</h2>
            {tool.faqs.map((faq) => (
              <div key={faq.q} className="mt-4">
                <h3 className="font-sans text-base font-semibold text-brand-ink">
                  {faq.q}
                </h3>
                <p className="mt-1 font-sans text-sm text-brand-muted">{faq.a}</p>
              </div>
            ))}
          </section>

          {tool.engineCta ? (
            <p className="mt-10 max-w-2xl font-sans text-sm font-semibold text-brand-ink">
              {tool.engineCta}
            </p>
          ) : null}

          <p className="mt-4">
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center bg-brand-orange px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
            >
              Open the free Vitality Engine
            </Link>
          </p>
        </article>
      </main>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: absoluteUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Tools",
                item: absoluteUrl("/tools"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: tool.title,
                item: url,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: tool.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: tool.title,
            description: tool.description,
            url,
          },
        ]}
      />
      <SiteFooter />
    </>
  );
}
