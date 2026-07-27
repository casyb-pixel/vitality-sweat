import type { BlogBlock, MigratedPost } from "@/data/posts";
import { markdownToBlocks } from "@/lib/blog/markdown-blocks";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export function mapSupabasePostToMigrated(
  row: BlogPostRecord,
): MigratedPost {
  const rawBlocks = row.body_blocks;
  const blocks =
    Array.isArray(rawBlocks) && rawBlocks.length
      ? (rawBlocks as BlogBlock[])
      : markdownToBlocks(row.body_markdown || "");

  const cover =
    row.cover_image ||
    blocks.find((b) => b.type === "image")?.src ||
    "/images/hero-strength-stamina-collage.png";

  return {
    slug: row.slug,
    title: row.title,
    description: row.description || row.excerpt || row.title,
    keywords:
      row.keywords?.length > 0
        ? row.keywords
        : ["Sweatlife Chronicles", "Vitality Sweat"],
    author: row.author_name || "Hunter",
    datePublished: row.published_at || row.created_at,
    dateModified: row.updated_at || row.published_at || row.created_at,
    ogImage: cover,
    coverImage: cover,
    coverAlt: row.cover_alt || `${row.title} — Sweatlife Chronicles`,
    excerpt: row.excerpt || row.description || row.title,
    featured: Boolean(row.featured),
    body: blocks,
  };
}

/**
 * Prefer the service-role client for public catalog reads so blog pages
 * never depend on request cookies during render / static generation.
 */
async function getReadClient() {
  const admin = createServiceRoleClient();
  if (admin) return admin;
  return await createClient();
}

export async function fetchPublishedSupabasePosts(): Promise<MigratedPost[]> {
  try {
    const supabase = await getReadClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.warn("[blog] Supabase published fetch skipped:", error.message);
      return [];
    }

    return (data as BlogPostRecord[]).map((row) =>
      mapSupabasePostToMigrated(row),
    );
  } catch (error) {
    console.warn(
      "[blog] Supabase unavailable for published posts:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export async function fetchPublishedSupabasePostBySlug(
  slug: string,
): Promise<MigratedPost | undefined> {
  try {
    const supabase = await getReadClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn("[blog] Supabase slug fetch skipped:", error.message);
      }
      return undefined;
    }

    return mapSupabasePostToMigrated(data as BlogPostRecord);
  } catch (error) {
    console.warn(
      "[blog] Supabase unavailable for slug lookup:",
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
}
