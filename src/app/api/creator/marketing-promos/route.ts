import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import {
  formatGeminiError,
  getGeminiApiKey,
  isLikelyConnectionError,
} from "@/lib/ai/gemini";
import { generateMarketingPromos } from "@/lib/marketing/generate-promos";
import {
  mapPostToMarketingProject,
  type VideoProjectTargetRow,
} from "@/lib/marketing/map-project";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  postId?: string;
  slug?: string;
};

/**
 * Generates (or regenerates) Facebook / Instagram / X promo captions
 * for a published post and stores them on `generated_promos`.
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

    if (!getGeminiApiKey()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GEMINI_API_KEY is not configured on the server. Add it to .env.local / Vercel and restart.",
        },
        { status: 503 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const postId = body.postId?.trim();
    const slug = body.slug?.trim();
    if (!postId && !slug) {
      return NextResponse.json(
        { ok: false, error: "Send `postId` or `slug`." },
        { status: 400 },
      );
    }

    let query = supabase.from("posts").select("*").eq("status", "published");
    query = postId ? query.eq("id", postId) : query.eq("slug", slug!);

    const { data: row, error: fetchError } = await query.maybeSingle();
    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: fetchError.message },
        { status: 502 },
      );
    }
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Published post not found." },
        { status: 404 },
      );
    }

    const post = row as BlogPostRecord;

    try {
      const promos = await generateMarketingPromos({
        title: post.title,
        excerpt: post.excerpt,
        bodyMarkdown: post.body_markdown,
        slug: post.slug,
      });

      const { data: updated, error: updateError } = await supabase
        .from("posts")
        .update({
          generated_promos: promos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message, promos },
          { status: 502 },
        );
      }

      const { data: videos } = await supabase
        .from("video_projects")
        .select(
          "id, post_id, checklist_key, target_section_anchor, video_path, public_video_url, embed_published",
        )
        .eq("post_id", post.id);

      return NextResponse.json({
        ok: true,
        promos,
        project: mapPostToMarketingProject(
          updated as BlogPostRecord,
          (videos ?? []) as VideoProjectTargetRow[],
        ),
      });
    } catch (error) {
      const connection = isLikelyConnectionError(error);
      return NextResponse.json(
        {
          ok: false,
          error: connection
            ? "Gemini connection dropped or timed out. Retry in a moment."
            : formatGeminiError(error),
          connectionError: connection,
        },
        { status: connection ? 504 : 502 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
