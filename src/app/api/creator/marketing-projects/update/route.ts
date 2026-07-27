import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import { mapPostToMarketingProject } from "@/lib/marketing/map-project";
import {
  isChecklistKey,
  type MarketingChecklistKey,
} from "@/lib/marketing/project";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type PatchBody = {
  postId?: string;
  checklistKey?: string;
  done?: boolean;
  archive?: boolean;
};

/**
 * Updates a marketing checklist flag or archives a completed project.
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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.archive === true) {
      const row = existing as BlogPostRecord & Record<string, boolean>;
      const allDone =
        Boolean(row.fb_post_done) &&
        Boolean(row.ig_post_done) &&
        Boolean(row.x_post_done) &&
        Boolean(row.video_1_done) &&
        Boolean(row.video_2_done) &&
        Boolean(row.video_3_done);
      if (!allDone) {
        return NextResponse.json(
          {
            ok: false,
            error: "Finish all 6 checklist items before archiving.",
          },
          { status: 400 },
        );
      }
      updates.is_archived = true;
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
          error: "Send `checklistKey` + `done`, or `archive: true`.",
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      project: mapPostToMarketingProject(updated as BlogPostRecord),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
