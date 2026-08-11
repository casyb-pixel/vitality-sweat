import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import {
  mapPostToMarketingProject,
  type VideoProjectTargetRow,
} from "@/lib/marketing/map-project";
import {
  isChecklistKey,
  isVideoChecklistKey,
  type MarketingChecklistKey,
  type MarketingVideoChecklistKey,
} from "@/lib/marketing/project";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type PatchBody = {
  postId?: string;
  checklistKey?: string;
  done?: boolean;
  archive?: boolean;
  /** Set / clear the blog heading anchor for a video checklist item. */
  targetSectionAnchor?: string | null;
};

/**
 * Updates a marketing checklist flag, archives / unarchives a project,
 * or sets Target Blog Section for a video deliverable.
 */
export async function PATCH(request: Request) {
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

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const postId = body.postId?.trim();
    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Send `postId`." },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: fetchError.message },
        { status: 502 },
      );
    }
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Published project not found." },
        { status: 404 },
      );
    }

    const post = existing as BlogPostRecord;

    if (body.targetSectionAnchor !== undefined) {
      if (!body.checklistKey || !isVideoChecklistKey(body.checklistKey)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Target Blog Section requires a video checklist key (video_1_done, video_2_done, or video_3_done).",
          },
          { status: 400 },
        );
      }

      const sectionError = await upsertVideoSectionTarget(supabase, user.id, {
        post,
        checklistKey: body.checklistKey,
        targetSectionAnchor:
          typeof body.targetSectionAnchor === "string"
            ? body.targetSectionAnchor.trim() || null
            : null,
      });
      if (sectionError) {
        return NextResponse.json(
          { ok: false, error: sectionError },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        project: await loadMarketingProject(supabase, postId),
      });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.archive === true) {
      updates.is_archived = true;
    } else if (body.archive === false) {
      updates.is_archived = false;
    } else if (body.checklistKey) {
      if (!isChecklistKey(body.checklistKey)) {
        return NextResponse.json(
          { ok: false, error: "Unknown checklist key." },
          { status: 400 },
        );
      }
      if (typeof body.done !== "boolean") {
        return NextResponse.json(
          { ok: false, error: "Send boolean `done`." },
          { status: 400 },
        );
      }
      const key = body.checklistKey as MarketingChecklistKey;
      updates[key] = body.done;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Send `checklistKey` + `done`, `targetSectionAnchor`, or `archive: true|false`.",
        },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      project: await loadMarketingProject(supabase, postId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function upsertVideoSectionTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: {
    post: BlogPostRecord;
    checklistKey: MarketingVideoChecklistKey;
    targetSectionAnchor: string | null;
  },
): Promise<string | null> {
  const { data: existing, error: findError } = await supabase
    .from("video_projects")
    .select("id, video_path, public_video_url")
    .eq("post_id", input.post.id)
    .eq("checklist_key", input.checklistKey)
    .maybeSingle();

  if (findError) return findError.message;

  const hasMedia = (row: {
    video_path?: string | null;
    public_video_url?: string | null;
  }) => Boolean(row.video_path?.trim() || row.public_video_url?.trim());

  if (existing) {
    const embedPublished =
      Boolean(input.targetSectionAnchor) && hasMedia(existing);
    const { error } = await supabase
      .from("video_projects")
      .update({
        target_section_anchor: input.targetSectionAnchor,
        embed_published: embedPublished,
        post_slug: input.post.slug,
        blog_title: input.post.title,
      })
      .eq("id", existing.id);
    return error?.message ?? null;
  }

  const label =
    input.checklistKey === "video_1_done"
      ? "Instagram Reel"
      : input.checklistKey === "video_2_done"
        ? "TikTok video"
        : "YouTube Short";

  const { error } = await supabase.from("video_projects").insert({
    creator_id: userId,
    post_id: input.post.id,
    post_slug: input.post.slug,
    blog_title: input.post.title,
    checklist_key: input.checklistKey,
    target_section_anchor: input.targetSectionAnchor,
    embed_published: false,
    concept: {
      title: label,
      videoHook: "",
      shootingConcept: `Short-form clip for ${input.post.title}`,
    },
    status: "collecting_assets",
  });

  return error?.message ?? null;
}

async function loadMarketingProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Project not found after update.");
  }

  const { data: videos, error: videoError } = await supabase
    .from("video_projects")
    .select(
      "id, post_id, checklist_key, target_section_anchor, video_path, public_video_url, embed_published",
    )
    .eq("post_id", postId);

  if (videoError) throw new Error(videoError.message);

  return mapPostToMarketingProject(
    data as BlogPostRecord,
    (videos ?? []) as VideoProjectTargetRow[],
  );
}
