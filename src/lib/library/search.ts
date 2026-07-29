import type { MigratedPost } from "@/data/posts";

export type LibraryPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  datePublished: string;
  keywords: string[];
};

export function toLibraryPostSummary(post: MigratedPost): LibraryPostSummary {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage:
      post.coverImage?.trim() ||
      "/images/stock/graphics/blog-workout-plan-energy.png",
    coverAlt: post.coverAlt || post.title,
    datePublished: post.datePublished,
    keywords: post.keywords ?? [],
  };
}

/** Collapse punctuation/spacing so "glutes!" and "Glutes" share a key. */
export function normalizeLibraryQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function haystack(post: LibraryPostSummary): string {
  return [
    post.title,
    post.excerpt,
    post.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Client-side Library filter — snappy enough for treadmill browsing.
 * Matches title, excerpt, and keywords; requires every token to appear.
 */
export function filterLibraryPosts(
  posts: LibraryPostSummary[],
  query: string,
): LibraryPostSummary[] {
  const normalized = normalizeLibraryQuery(query);
  if (!normalized) return posts;

  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length) return posts;

  return posts.filter((post) => {
    const text = haystack(post);
    return tokens.every((token) => text.includes(token));
  });
}
