import Link from "next/link";
import PublicPage from "@/components/public/PublicPage";
import { getAllBlogPostsAsync } from "@/lib/blog/posts";
import { getHub, type HubSlug } from "@/lib/content/hubs";
import { NAMED_PROGRAMS } from "@/lib/fitness/program-templates";
import { TOOLS } from "@/lib/tools/catalog";

function hubKeywords(cluster: string): string[] {
  if (cluster === "train") return ["gym", "lift", "squat", "bench", "workout"];
  if (cluster === "fuel") return ["calorie", "protein", "meal", "creatine"];
  if (cluster === "baseball") return ["baseball", "pitch", "hitting"];
  if (cluster === "beginner") return ["beginner", "first gym", "dorm"];
  return ["gear", "dumbbell", "bag"];
}

export default async function TopicHubView({ slug }: { slug: HubSlug }) {
  const found = getHub(slug);
  if (!found) return null;
  const keys = hubKeywords(found.cluster);
  const posts = (await getAllBlogPostsAsync()).filter((post) => {
    const hay = `${post.title} ${post.keywords.join(" ")} ${post.excerpt}`.toLowerCase();
    return keys.some((k) => hay.includes(k));
  });
  const tools = TOOLS.filter((t) => found.relatedTools.includes(t.slug));
  const programs =
    found.slug === "begin"
      ? NAMED_PROGRAMS.filter((p) => p.level === "beginner")
      : found.slug === "compete"
        ? NAMED_PROGRAMS.filter((p) => p.slug.includes("baseball"))
        : NAMED_PROGRAMS.slice(0, 3);

  return (
    <PublicPage eyebrow={found.eyebrow} title={found.title} lede={found.description}>
      {tools.length ? (
        <section className="mb-10">
          <h2 className="font-display text-2xl text-brand-ink">Tools</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="border border-brand-ink/15 px-3 py-2 font-sans text-sm font-semibold"
                >
                  {tool.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mb-10">
        <h2 className="font-display text-2xl text-brand-ink">Programs</h2>
        <ul className="mt-3 space-y-2">
          {programs.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/programs/${p.slug}`}
                className="font-sans text-sm font-semibold text-brand-orange"
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl text-brand-ink">Chronicles</h2>
        <ul className="mt-3 space-y-3">
          {posts.slice(0, 8).map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="font-sans text-sm font-semibold text-brand-ink hover:text-brand-orange"
              >
                {post.title}
              </Link>
            </li>
          ))}
          {posts.length === 0 ? (
            <li className="font-sans text-sm text-brand-muted">
              More notes coming. Follow RSS at /chronicles/rss.xml
            </li>
          ) : null}
        </ul>
      </section>
    </PublicPage>
  );
}
