import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { CreatorPublishedPost } from "@/lib/video/video-studio";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Lists Hunter's most recently published Chronicles from Supabase `posts`
 * for the Video Studio SELECT_BLOG_CONTEXT step.
 */
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const includeId = url.searchParams.get("id")?.trim() || null;

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, slug, title, excerpt, description, keywords, cover_image, published_at, body_markdown, status",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(40);

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

    const rows = (data ?? []) as PostRow[];

    if (includeId && !rows.some((row) => row.id === includeId)) {
      const { data: extra, error: extraError } = await supabase
        .from("posts")
        .select(
          "id, slug, title, excerpt, description, keywords, cover_image, published_at, body_markdown, status",
        )
        .eq("id", includeId)
        .eq("status", "published")
        .maybeSingle();
      if (extraError) {
        return NextResponse.json(
          { ok: false, error: extraError.message },
          { status: 502 },
        );
      }
      if (extra) rows.unshift(extra as PostRow);
    }

    const posts: CreatorPublishedPost[] = rows.map((row) => {
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
    });

    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
