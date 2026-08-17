import type { MetadataRoute } from "next";
import { getAllBlogPosts, getAllBlogPostsAsync } from "@/lib/blog/posts";
import { TOOLS } from "@/lib/tools/catalog";
import { NAMED_PROGRAMS } from "@/lib/fitness/program-templates";
import { COMPARE_PAGES } from "@/lib/marketing/compare";
import { GEAR_REVIEWS } from "@/lib/gear/catalog";
import { getStorefrontCatalog } from "@/lib/store/catalog";
import { productPath } from "@/lib/store/product-slug";
import { buildCanonical, SITE_URL } from "@/lib/seo/site";

/**
 * Brand-first public sitemap. Homepage stays priority 1 so Google prefers
 * https://vitalitysweat.com for exact-brand discovery.
 * Transactional paths (cart/checkout/order) and /invite are intentionally omitted.
 */
function toSitemapDate(value?: string | Date | null): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function blogSitemapEntries(
  posts: {
    slug: string;
    dateModified?: string;
    datePublished: string;
    featured?: boolean;
  }[],
): MetadataRoute.Sitemap {
  return posts
    .filter((post) => typeof post.slug === "string" && post.slug.trim())
    .map((post) => ({
      url: buildCanonical(`/blog/${post.slug}`),
      lastModified: toSitemapDate(post.dateModified || post.datePublished),
      changeFrequency: "monthly" as const,
      // Keep below homepage (1) and chronicles (0.9) so the brand home wins.
      priority: post.featured ? 0.85 : 0.7,
    }));
}

function safeMappedRoutes<T>(
  items: T[],
  mapFn: (item: T) => MetadataRoute.Sitemap[number],
): MetadataRoute.Sitemap {
  try {
    return items.map(mapFn);
  } catch (error) {
    console.error("[sitemap] Catalog route mapping failed.", error);
    return [];
  }
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
      // Below homepage and About: merch is secondary to the coaching brand.
      priority: 0.65,
    },
    {
      url: buildCanonical("/tools"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: buildCanonical("/exercises"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildCanonical("/programs"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildCanonical("/train"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: buildCanonical("/fuel"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: buildCanonical("/gear"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: buildCanonical("/search"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: buildCanonical("/author/hunter-broussard"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: buildCanonical("/begin"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: buildCanonical("/compete"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: buildCanonical("/advertise"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.45,
    },
    {
      url: buildCanonical("/chronicles/rss.xml"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4,
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
      url: buildCanonical("/community-guidelines"),
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

  let storeProductRoutes: MetadataRoute.Sitemap = [];
  try {
    const catalog = await getStorefrontCatalog();
    if (catalog.source === "printful") {
      storeProductRoutes = catalog.products.map((product) => ({
        url: buildCanonical(productPath(product)),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.55,
      }));
    }
  } catch (error) {
    console.error("[sitemap] Store catalog skipped.", error);
  }

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

  try {
    return [
      ...staticRoutes,
      ...safeMappedRoutes(TOOLS, (tool) => ({
        url: buildCanonical(`/tools/${tool.slug}`),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.75,
      })),
      ...safeMappedRoutes(NAMED_PROGRAMS, (program) => ({
        url: buildCanonical(`/programs/${program.slug}`),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...safeMappedRoutes(COMPARE_PAGES, (page) => ({
        url: buildCanonical(`/compare/${page.slug}`),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.55,
      })),
      ...safeMappedRoutes(GEAR_REVIEWS, (review) => ({
        url: buildCanonical(`/gear/${review.slug}`),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
      ...storeProductRoutes,
      ...blogRoutes,
    ];
  } catch (error) {
    console.error("[sitemap] Assembly failed; returning static routes only.", error);
    return staticRoutes;
  }
}
