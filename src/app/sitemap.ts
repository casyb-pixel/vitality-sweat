import type { MetadataRoute } from "next";
import { getAllBlogPosts, getAllBlogPostsAsync } from "@/lib/blog/posts";
import { SITE_URL } from "@/lib/seo/site";

function blogSitemapEntries(
  posts: { slug: string; dateModified?: string; datePublished: string; featured?: boolean }[],
): MetadataRoute.Sitemap {
  return posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified || post.datePublished),
    changeFrequency: "monthly" as const,
    priority: post.featured ? 0.9 : 0.7,
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
      url: `${SITE_URL}/chronicles`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/store`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/advertise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/return-policy`,
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
