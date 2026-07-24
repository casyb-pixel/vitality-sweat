import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { CreatorPublishedPost } from "@/lib/video/video-studio";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Lists Hunter's most recently published Chronicles from Supabase `posts`
 * for the Video Studio SELECT_BLOG_CONTEXT step.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized — creator privileges required." },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, slug, title, excerpt, description, keywords, cover_image, published_at, body_markdown, status",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 },
      );
    }

    type PostRow = {
      id: string;
      slug: string;
      title: string;
      excerpt: string;
      description: string | null;
      keywords: string[] | null;
      cover_image: string | null;
      published_at: string | null;
      body_markdown: string | null;
    };

    const posts: CreatorPublishedPost[] = ((data ?? []) as PostRow[]).map(
      (row) => {
        const bodyMarkdown = row.body_markdown ?? "";
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt || row.description || row.title,
          description: row.description,
          keywords: row.keywords ?? [],
          coverImage: row.cover_image,
          publishedAt: row.published_at,
          bodyPreview: bodyMarkdown.slice(0, 1200),
          bodyMarkdown: bodyMarkdown.slice(0, 12000),
        };
      },
    );

    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
