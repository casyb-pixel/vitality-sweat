import { getAllBlogPostsAsync } from "@/lib/blog/posts";
import { SITE_NAME, SITE_URL, buildCanonical } from "@/lib/seo/site";

export const revalidate = 300;

export async function GET() {
  const posts = await getAllBlogPostsAsync();
  const items = posts
    .slice(0, 40)
    .map((post) => {
      const url = buildCanonical(`/blog/${post.slug}`);
      const title = escapeXml(post.title);
      const desc = escapeXml(post.excerpt || post.description);
      return `<item>
  <title>${title}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <pubDate>${new Date(post.datePublished).toUTCString()}</pubDate>
  <description>${desc}</description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${SITE_NAME} Sweatlife Chronicles</title>
  <link>${SITE_URL}</link>
  <description>Training, fuel, and first-gym notes from Hunter Broussard.</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
