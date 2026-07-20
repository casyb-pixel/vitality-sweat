/**
 * Shared types for Creator Studio → Supabase `posts` writes.
 * Apply `supabase/migrations/20260720153000_create_posts.sql` in the project.
 */

export type PostStatus = "draft" | "published";

export type BlogPostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  body_blocks?: unknown;
  description: string | null;
  status: PostStatus;
  author_id: string | null;
  author_name: string;
  cover_image: string | null;
  cover_alt: string | null;
  keywords: string[];
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavePostInput = {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  status: PostStatus;
  slug?: string;
  description?: string;
  keywords?: string[];
  coverImage?: string;
  coverAlt?: string;
  featured?: boolean;
  bodyBlocks?: unknown;
};

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `draft-${Date.now().toString(36)}`;
}
