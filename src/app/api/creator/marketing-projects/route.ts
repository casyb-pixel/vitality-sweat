import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import type { BlogPostRecord } from "@/lib/blog/supabase-posts";
import { mapPostToMarketingProject } from "@/lib/marketing/map-project";
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

    const projects = ((data ?? []) as BlogPostRecord[]).map((row) =>
      mapPostToMarketingProject(row),
    );

    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
