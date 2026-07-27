import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import {
  slugifyTitle,
  type PostStatus,
  type SavePostInput,
} from "@/lib/blog/supabase-posts";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type SavePostBody = {
  title?: string;
  excerpt?: string;
  bodyMarkdown?: string;
  body_markdown?: string;
  status?: PostStatus;
  slug?: string;
  description?: string;
  keywords?: string[];
  coverImage?: string;
  cover_image?: string;
  coverAlt?: string;
  cover_alt?: string;
  featured?: boolean;
};

/**
 * Persist a Creator Studio article draft to Supabase `public.posts`.
 * Requires authenticated admin/creator (app_metadata.role).
 */
export async function POST(request: Request) {
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

    let body: SavePostBody;
    try {
      body = (await request.json()) as SavePostBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parsed = validateSaveBody(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const slug = input.slug?.trim() || slugifyTitle(input.title);
    const now = new Date().toISOString();
    const description =
      input.description?.trim() ||
      input.excerpt.trim() ||
      input.title.trim();

    const row: Record<string, unknown> = {
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      body_markdown: input.bodyMarkdown,
      description,
      status: input.status,
      author_id: user.id,
      author_name:
        typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()
          ? user.user_metadata.full_name.trim()
          : "Hunter",
      cover_image: input.coverImage?.trim() || null,
      cover_alt: input.coverAlt?.trim() || null,
      keywords: input.keywords ?? ["Sweatlife Chronicles", "Vitality Sweat"],
      featured: Boolean(input.featured),
      published_at: input.status === "published" ? now : null,
      updated_at: now,
    };

    // Fresh marketing project window when publishing (trigger also sets due date).
    if (input.status === "published") {
      row.fb_post_done = false;
      row.ig_post_done = false;
      row.x_post_done = false;
      row.video_1_done = false;
      row.video_2_done = false;
      row.video_3_done = false;
      row.is_archived = false;
      row.generated_promos = null;
      row.project_due_at = new Date(
        Date.parse(now) + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const { data, error } = await supabase
      .from("posts")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();

    if (error) {
      const missingTable =
        error.message.toLowerCase().includes("could not find the table") ||
        error.code === "42P01" ||
        error.message.toLowerCase().includes("schema cache");

      return NextResponse.json(
        {
          ok: false,
          error: missingTable
            ? "Supabase `posts` table is missing. Run supabase/migrations/20260720153000_create_posts.sql first."
            : error.message,
          code: error.code,
        },
        { status: missingTable ? 503 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        input.status === "published"
          ? "Post published to Supabase."
          : "Draft saved to Supabase.",
      post: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function validateSaveBody(
  body: SavePostBody,
): { ok: true; data: SavePostInput } | { ok: false; error: string } {
  const title = (body.title ?? "").trim();
  const excerpt = (body.excerpt ?? "").trim();
  const bodyMarkdown = (body.bodyMarkdown ?? body.body_markdown ?? "").trim();
  const status = body.status;

  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  if (!bodyMarkdown) {
    return { ok: false, error: "Body markdown is required." };
  }
  if (status !== "draft" && status !== "published") {
    return {
      ok: false,
      error: "Status must be 'draft' or 'published'.",
    };
  }

  return {
    ok: true,
    data: {
      title,
      excerpt,
      bodyMarkdown,
      status,
      slug: body.slug,
      description: body.description,
      keywords: Array.isArray(body.keywords)
        ? body.keywords.filter((k) => typeof k === "string" && k.trim())
        : undefined,
      coverImage: body.coverImage ?? body.cover_image,
      coverAlt: body.coverAlt ?? body.cover_alt,
      featured: body.featured,
    },
  };
}
