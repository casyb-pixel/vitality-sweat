import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import {
  mapPostToMarketingProject,
  type VideoProjectTargetRow,
} from "@/lib/marketing/map-project";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Lists active (published, unarchived) 7-Day Marketing Projects for Creator Studio.
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
      .select("*")
      .eq("status", "published")
      .eq("is_archived", false)
      .order("published_at", { ascending: false })
      .limit(24);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 502 },
      );
    }

    const posts = (data ?? []) as BlogPostRecord[];
    const postIds = posts.map((p) => p.id);

    let videoRows: VideoProjectTargetRow[] = [];
    if (postIds.length > 0) {
      const { data: videos, error: videoError } = await supabase
        .from("video_projects")
        .select(
          "id, post_id, checklist_key, target_section_anchor, video_path, public_video_url, embed_published",
        )
        .in("post_id", postIds);

      if (videoError) {
        return NextResponse.json(
          { ok: false, error: videoError.message },
          { status: 502 },
        );
      }
      videoRows = (videos ?? []) as VideoProjectTargetRow[];
    }

    const videosByPost = new Map<string, VideoProjectTargetRow[]>();
    for (const row of videoRows) {
      if (!row.post_id) continue;
      const list = videosByPost.get(row.post_id) ?? [];
      list.push(row);
      videosByPost.set(row.post_id, list);
    }

    const projects = posts.map((row) =>
      mapPostToMarketingProject(row, videosByPost.get(row.id) ?? []),
    );

    // Export-ready video projects that still need social checklist promotion.
    const { data: readyVideos, error: readyError } = await supabase
      .from("video_projects")
      .select(
        "id, blog_title, post_slug, status, growth_promo_pack, social_package, checklist_key, updated_at, concept",
      )
      .eq("creator_id", user.id)
      .eq("status", "social_package_ready")
      .order("updated_at", { ascending: false })
      .limit(12);

    if (readyError) {
      console.error("[marketing-projects] video queue", readyError.message);
    }

    const videoPromoQueue = (readyVideos ?? []).map((row) => {
      const concept =
        row.concept && typeof row.concept === "object"
          ? (row.concept as { title?: string })
          : {};
      const pack = row.growth_promo_pack as
        | {
            captionVariants?: { instagram?: string };
            pinnedComment?: string;
            signupUrl?: string;
          }
        | null;
      return {
        id: row.id as string,
        blogTitle: (row.blog_title as string) || "Untitled",
        postSlug: (row.post_slug as string) || null,
        conceptTitle:
          typeof concept.title === "string" ? concept.title : "Video concept",
        checklistKey: (row.checklist_key as string) || null,
        updatedAt: (row.updated_at as string) || null,
        hasGrowthPack: Boolean(row.growth_promo_pack),
        previewCaption:
          pack?.captionVariants?.instagram ||
          pack?.pinnedComment ||
          (row.social_package as { caption?: string } | null)?.caption ||
          null,
        signupUrl: pack?.signupUrl ?? null,
      };
    });

    return NextResponse.json({ ok: true, projects, videoPromoQueue });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
