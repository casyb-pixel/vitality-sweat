import { NextResponse } from "next/server";
import type { ShortFormVideoIdea } from "@/lib/video/video-studio";
import {
  normalizeVideoIdeas,
  serializeVideoIdea,
} from "@/lib/video/normalize-idea";
import { getCreatorRole } from "@/lib/auth/creator";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type IdeaSetRow = {
  id: string;
  post_id: string;
  post_slug: string | null;
  blog_title: string;
  ideas: unknown;
  locked_at: string;
  updated_at: string;
};

type SaveBody = {
  action?: "get" | "save" | "replace_one";
  postId?: string;
  postSlug?: string;
  blogTitle?: string;
  ideas?: ShortFormVideoIdea[];
  index?: number;
  idea?: ShortFormVideoIdea;
};

function normalizeIdeas(value: unknown): ShortFormVideoIdea[] {
  return normalizeVideoIdeas(value, 5).map(serializeVideoIdea);
}

/**
 * Persist / load locked Video Studio idea batches so gym trips don't wipe them.
 * Batches are 5 ideas: 3 blog-related + 2 strength exercise how-tos.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized - creator privileges required." },
        { status: 401 },
      );
    }

    const postId = new URL(request.url).searchParams.get("postId")?.trim();
    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Provide postId." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("video_idea_sets")
      .select("id, post_id, post_slug, blog_title, ideas, locked_at, updated_at")
      .eq("creator_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ ok: true, locked: false, ideas: [] });
    }

    const row = data as IdeaSetRow;
    return NextResponse.json({
      ok: true,
      locked: true,
      id: row.id,
      ideas: normalizeIdeas(row.ideas),
      lockedAt: row.locked_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !getCreatorRole(user)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized - creator privileges required." },
        { status: 401 },
      );
    }

    let body: SaveBody;
    try {
      body = (await request.json()) as SaveBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const action = body.action ?? "save";
    const postId = (body.postId ?? "").trim();
    if (!postId) {
      return NextResponse.json(
        { ok: false, error: "Provide postId." },
        { status: 400 },
      );
    }

    if (action === "get") {
      const { data, error } = await supabase
        .from("video_idea_sets")
        .select(
          "id, post_id, post_slug, blog_title, ideas, locked_at, updated_at",
        )
        .eq("creator_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      if (!data) {
        return NextResponse.json({ ok: true, locked: false, ideas: [] });
      }
      const row = data as IdeaSetRow;
      return NextResponse.json({
        ok: true,
        locked: true,
        id: row.id,
        ideas: normalizeIdeas(row.ideas),
        lockedAt: row.locked_at,
        updatedAt: row.updated_at,
      });
    }

    if (action === "replace_one") {
      const index = Number(body.index);
      const replacement = body.idea;
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index > 4 ||
        !replacement?.title?.trim()
      ) {
        return NextResponse.json(
          { ok: false, error: "Provide index (0–4) and a replacement idea." },
          { status: 400 },
        );
      }

      const { data: existing, error: loadError } = await supabase
        .from("video_idea_sets")
        .select("id, ideas")
        .eq("creator_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (loadError) {
        return NextResponse.json(
          { ok: false, error: loadError.message },
          { status: 500 },
        );
      }
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "No locked idea set for this Chronicle yet." },
          { status: 404 },
        );
      }

      const ideas = normalizeIdeas(existing.ideas);
      while (ideas.length < 5) {
        ideas.push(
          serializeVideoIdea({
            title: `Idea ${ideas.length + 1}`,
            videoHook: "",
            shootingConcept: "",
            kind: ideas.length >= 3 ? "exercise_howto" : "blog",
          }),
        );
      }
      ideas[index] = serializeVideoIdea(replacement);

      const { data: updated, error: updateError } = await supabase
        .from("video_idea_sets")
        .update({ ideas })
        .eq("id", existing.id)
        .eq("creator_id", user.id)
        .select("id, ideas, locked_at, updated_at")
        .single();

      if (updateError || !updated) {
        return NextResponse.json(
          { ok: false, error: updateError?.message ?? "Could not update ideas." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        locked: true,
        id: updated.id,
        ideas: normalizeIdeas(updated.ideas),
        lockedAt: updated.locked_at,
        updatedAt: updated.updated_at,
      });
    }

    // save — lock a fresh batch (upsert)
    const ideas = normalizeIdeas(body.ideas);
    if (ideas.length < 1) {
      return NextResponse.json(
        { ok: false, error: "Provide at least one idea to lock." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("video_idea_sets")
      .upsert(
        {
          creator_id: user.id,
          post_id: postId,
          post_slug: (body.postSlug ?? "").trim() || null,
          blog_title: (body.blogTitle ?? "").trim() || "Sweatlife Chronicle",
          ideas,
          locked_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,post_id" },
      )
      .select("id, ideas, locked_at, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not lock ideas." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      locked: true,
      id: data.id,
      ideas: normalizeIdeas(data.ideas),
      lockedAt: data.locked_at,
      updatedAt: data.updated_at,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
