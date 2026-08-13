import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import { getAllBlogPostsAsync } from "@/lib/blog/posts";
import { NAMED_PROGRAMS } from "@/lib/fitness/program-templates";
import { getPublicExercises } from "@/lib/fitness/public-exercises";
import { TOOLS } from "@/lib/tools/catalog";
import { buildCanonical } from "@/lib/seo/site";
import SiteSearch from "@/components/public/SiteSearch";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Vitality Sweat tools, exercises, programs, and Chronicles.",
  alternates: { canonical: buildCanonical("/search") },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const [posts, exercises] = await Promise.all([
    getAllBlogPostsAsync(),
    getPublicExercises(),
  ]);

  const results = query
    ? [
        ...TOOLS.filter((t) =>
          `${t.title} ${t.description}`.toLowerCase().includes(query),
        ).map((t) => ({ href: `/tools/${t.slug}`, title: t.title, kind: "Tool" })),
        ...NAMED_PROGRAMS.filter((p) =>
          `${p.title} ${p.summary}`.toLowerCase().includes(query),
        ).map((p) => ({
          href: `/programs/${p.slug}`,
          title: p.title,
          kind: "Program",
        })),
        ...exercises
          .filter((e) => e.name.toLowerCase().includes(query))
          .slice(0, 20)
          .map((e) => ({
            href: `/exercises/${e.slug}`,
            title: e.name,
            kind: "Exercise",
          })),
        ...posts
          .filter((p) =>
            `${p.title} ${p.excerpt} ${p.keywords.join(" ")}`
              .toLowerCase()
              .includes(query),
          )
          .slice(0, 12)
          .map((p) => ({
            href: `/blog/${p.slug}`,
            title: p.title,
            kind: "Chronicle",
          })),
      ]
    : [];

  return (
    <PublicPage
      eyebrow="Search"
      title="Find a tool, lift, or note"
      lede="One search box for the site. Then log the work in Engine."
    >
      <SiteSearch initialQuery={q ?? ""} />
      {query ? (
        <ul className="mt-8 space-y-3">
          {results.length === 0 ? (
            <li className="font-sans text-sm text-brand-muted">
              Nothing matched. Try squat, creatine, or first gym.
            </li>
          ) : (
            results.map((row) => (
              <li key={row.href}>
                <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange">
                  {row.kind}
                </p>
                <Link
                  href={row.href}
                  className="font-sans text-sm font-semibold text-brand-ink hover:text-brand-orange"
                >
                  {row.title}
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </PublicPage>
  );
}
