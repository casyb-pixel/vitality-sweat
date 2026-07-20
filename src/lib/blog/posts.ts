import {
  MIGRATED_POSTS,
  type BlogBlock,
  type MigratedPost,
} from "@/data/posts";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export type { BlogBlock, MigratedPost as BlogFrontmatter };

/**
 * WordPress baseline article (already migrated separately) + full Blogger archive.
 */
const WORDPRESS_BASELINE: MigratedPost = {
  slug: "calorie-deficit-weight-loss-golden-rule",
  title:
    "Calorie Deficit for Weight Loss: The Golden Rule Explained (2026 Guide)",
  subtitle: "The Calorie Deficit: The Golden Rule of Weight Loss",
  description:
    "Discover how a calorie deficit for weight loss works. Learn to calculate your needs, balance macros, plan meals, and avoid pitfalls for sustainable results.",
  keywords: [
    "calorie deficit",
    "weight loss",
    "macronutrients",
    "meal planning",
    "Vitality Sweat",
    "Sweatlife Chronicles",
    "nutrition",
  ],
  author: "Hunter",
  datePublished: "2025-03-25T19:21:00.000Z",
  dateModified: "2025-03-25T19:21:00.000Z",
  ogImage: "/images/blog/calorie-deficit/cover-calorie-deficit.png",
  coverImage: "/images/blog/calorie-deficit/cover-calorie-deficit.png",
  coverAlt:
    "Calorie deficit weight loss golden rule graphic from Sweatlife Chronicles",
  excerpt:
    "Burn more than you eat — then protect muscle, balance macros, and plan meals so the deficit actually sticks.",
  featured: true,
  sourceUrl:
    "https://vitalitysweat.com/calorie-deficit-weight-loss-golden-rule/",
  body: [
    {
      type: "h2",
      text: "The Calorie Deficit: The Golden Rule of Weight Loss",
    },
    {
      type: "p",
      text: "At its core, weight loss boils down to one simple principle: you need to burn more calories than you consume. This is known as creating a calorie deficit. To lose weight, your body needs to tap into its stored energy reserves (fat) to make up for the energy shortfall. This is a fundamental concept, but it’s crucial to understand how to apply it effectively and sustainably.",
    },
    {
      type: "image",
      src: "/images/blog/calorie-deficit/diet-vs-exercise.png",
      alt: "Diet versus exercise contribution to creating a calorie deficit",
    },
    { type: "h3", text: "How to Calculate Your Calorie Needs" },
    {
      type: "p",
      text: "The first step is to determine your daily maintenance calorie needs — the number of calories you need to maintain your current weight. Several factors influence this, including your age, sex, weight, height, and activity level. You can use online calorie calculators or consult with a registered dietitian to get a personalized estimate.",
    },
    {
      type: "p",
      text: "Once you know your maintenance calorie needs, you can create a deficit by consuming fewer calories. A safe and sustainable rate of weight loss is generally 1–2 pounds per week. A deficit of 300–500 calories per day is often more effective for healthy and sustainable weight loss, especially when combined with regular exercise.",
    },
    {
      type: "h2",
      text: "Macronutrients: The Building Blocks of Your Diet",
    },
    {
      type: "p",
      text: "While calorie intake is crucial, the source of those calories also matters. Macronutrients — protein, carbohydrates, and fats — play distinct roles in your body and affect your weight loss efforts.",
    },
    {
      type: "image",
      src: "/images/blog/calorie-deficit/healthy-unhealthy-fats.png",
      alt: "Comparison of healthy fats versus unhealthy fats for weight loss nutrition",
    },
    {
      type: "image",
      src: "/images/blog/calorie-deficit/sample-meal-plan.png",
      alt: "Sample meal plan graphic for sustainable calorie deficit eating",
    },
    { type: "h3", text: "Tips for Effective Meal Planning" },
    {
      type: "ul",
      items: [
        "Set aside time each week to plan your meals.",
        "Create a shopping list based on your meal plan.",
        "Prepare meals in advance whenever possible.",
        "Utilize leftovers for the next day’s lunch.",
        "Don’t be afraid to repeat meals to reduce decision fatigue.",
        "Keep a food journal to identify patterns and adjust.",
      ],
    },
  ],
};

/** Deduped catalog: WordPress baseline first, then Blogger archive (newest → oldest). */
export const BLOG_POSTS: MigratedPost[] = (() => {
  const migrated = MIGRATED_POSTS.map((post) => ({
    ...post,
    featured: false,
  }));
  const bySlug = new Map<string, MigratedPost>();
  bySlug.set(WORDPRESS_BASELINE.slug, WORDPRESS_BASELINE);
  for (const post of migrated) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }
  return Array.from(bySlug.values()).sort(
    (a, b) =>
      new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime(),
  );
})();

export function getAllBlogPosts(): MigratedPost[] {
  return BLOG_POSTS;
}

export function getFeaturedBlogPost(): MigratedPost {
  return BLOG_POSTS.find((post) => post.featured) ?? BLOG_POSTS[0];
}

export function getBlogPostBySlug(slug: string): MigratedPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getBlogSlugs(): string[] {
  return BLOG_POSTS.map((post) => post.slug);
}

/** Static archive + published Supabase posts (Creator Studio pipeline). */
export async function getAllBlogPostsAsync(): Promise<MigratedPost[]> {
  const {
    fetchPublishedSupabasePosts,
  } = await import("@/lib/blog/supabase-catalog");
  const remote = await fetchPublishedSupabasePosts();
  const bySlug = new Map<string, MigratedPost>();
  for (const post of BLOG_POSTS) bySlug.set(post.slug, post);
  for (const post of remote) {
    if (!bySlug.has(post.slug)) bySlug.set(post.slug, post);
  }
  return Array.from(bySlug.values()).sort(
    (a, b) =>
      new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime(),
  );
}

export async function getBlogPostBySlugAsync(
  slug: string,
): Promise<MigratedPost | undefined> {
  const local = getBlogPostBySlug(slug);
  if (local) return local;
  const {
    fetchPublishedSupabasePostBySlug,
  } = await import("@/lib/blog/supabase-catalog");
  return fetchPublishedSupabasePostBySlug(slug);
}

export async function getFeaturedBlogPostAsync(): Promise<MigratedPost> {
  const all = await getAllBlogPostsAsync();
  return all.find((post) => post.featured) ?? all[0] ?? getFeaturedBlogPost();
}

export function buildArticleJsonLd(post: MigratedPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: [absoluteUrl(post.ogImage), absoluteUrl(post.coverImage)],
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/branding/logo-original-transparent.svg"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    keywords: post.keywords.join(", "),
    isPartOf: {
      "@type": "Blog",
      name: "The Sweatlife Chronicles",
      url: absoluteUrl("/chronicles"),
    },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/branding/logo-original-transparent.svg"),
    description:
      "Fitness training, nutrition coaching, and youth baseball development with Hunter Broussard.",
  };
}
