import type { MetadataRoute } from "next";
import { getAllBlogPosts, getAllBlogPostsAsync } from "@/lib/blog/posts";
import { buildCanonical, SITE_URL } from "@/lib/seo/site";

/**
 * Brand-first public sitemap. Homepage stays priority 1 so Google prefers
 * https://vitalitysweat.com for exact-brand discovery.
 * Transactional paths (cart/checkout/order) and /invite are intentionally omitted.
 */
function blogSitemapEntries(
  posts: {
    slug: string;
    dateModified?: string;
    datePublished: string;
    featured?: boolean;
  }[],
): MetadataRoute.Sitemap {
  return posts.map((post) => ({
    url: buildCanonical(`/blog/${post.slug}`),
    lastModified: new Date(post.dateModified || post.datePublished),
    changeFrequency: "monthly" as const,
    // Keep below homepage (1) and chronicles (0.9) so the brand home wins.
    priority: post.featured ? 0.85 : 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: buildCanonical("/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: buildCanonical("/chronicles"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: buildCanonical("/store"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildCanonical("/advertise"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: buildCanonical("/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildCanonical("/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: buildCanonical("/return-policy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllBlogPostsAsync();
    blogRoutes = blogSitemapEntries(posts);
  } catch (error) {
    console.error(
      "[sitemap] Remote blog catalog failed; falling back to local archive.",
      error,
    );
    try {
      blogRoutes = blogSitemapEntries(getAllBlogPosts());
    } catch (fallbackError) {
      console.error(
        "[sitemap] Local blog archive also failed; static routes only.",
        fallbackError,
      );
    }
  }

  return [...staticRoutes, ...blogRoutes];
}
