import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import type {
  GeneratedPromos,
  MarketingProject,
} from "@/lib/marketing/project";

type MarketingRow = BlogPostRecord & {
  fb_post_done?: boolean;
  ig_post_done?: boolean;
  x_post_done?: boolean;
  video_1_done?: boolean;
  video_2_done?: boolean;
  video_3_done?: boolean;
  is_archived?: boolean;
  project_due_at?: string | null;
  generated_promos?: GeneratedPromos | null;
};

export function mapPostToMarketingProject(row: MarketingRow): MarketingProject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    publishedAt: row.published_at,
    projectDueAt: row.project_due_at ?? null,
    isArchived: Boolean(row.is_archived),
    fbPostDone: Boolean(row.fb_post_done),
    igPostDone: Boolean(row.ig_post_done),
    xPostDone: Boolean(row.x_post_done),
    video1Done: Boolean(row.video_1_done),
    video2Done: Boolean(row.video_2_done),
    video3Done: Boolean(row.video_3_done),
    generatedPromos: normalizePromos(row.generated_promos),
  };
}

function normalizePromos(value: unknown): GeneratedPromos | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const facebook =
    typeof row.facebook === "string" ? row.facebook.trim() : "";
  const instagram =
    typeof row.instagram === "string" ? row.instagram.trim() : "";
  const x = typeof row.x === "string" ? row.x.trim() : "";
  const blogUrl =
    typeof row.blogUrl === "string" ? row.blogUrl.trim() : "";
  if (!facebook || !instagram || !x) return null;
  return {
    facebook,
    instagram,
    x,
    blogUrl,
    generatedAt:
      typeof row.generatedAt === "string"
        ? row.generatedAt
        : new Date().toISOString(),
    model: typeof row.model === "string" ? row.model : undefined,
  };
}
