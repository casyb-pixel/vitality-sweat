import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import { COMPARE_PAGES, getComparePage } from "@/lib/marketing/compare";
import { buildCanonical } from "@/lib/seo/site";

export function generateStaticParams() {
  return COMPARE_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) return { title: "Compare" };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: buildCanonical(`/compare/${page.slug}`) },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getComparePage(slug);
  if (!page) notFound();
  return (
    <PublicPage eyebrow="Honest compare" title={page.title} lede={page.description}>
      <dl className="space-y-4 font-sans text-sm text-brand-ink">
        <div>
          <dt className="font-bold">What they win on</dt>
          <dd className="mt-1 text-brand-muted">{page.theyWin}</dd>
        </div>
        <div>
          <dt className="font-bold">What we steal</dt>
          <dd className="mt-1 text-brand-muted">{page.weSteal}</dd>
        </div>
        <div>
          <dt className="font-bold">What we refuse</dt>
          <dd className="mt-1 text-brand-muted">{page.weRefuse}</dd>
        </div>
      </dl>
      <p className="mt-8">
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center bg-brand-orange px-5 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
        >
          Open the free Engine
        </Link>
      </p>
    </PublicPage>
  );
}
