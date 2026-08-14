import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

async function member() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action;
  if (action === "report") {
    const postId = typeof body.post_id === "string" ? body.post_id : "";
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "other";
    if (!postId) {
      return NextResponse.json({ ok: false, error: "post_id required." }, { status: 400 });
    }
    const { error } = await supabase.from("engine_room_reports").insert({
      reporter_id: user.id,
      post_id: postId,
      reason,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "block") {
    const blockedId =
      typeof body.user_id === "string" ? body.user_id : "";
    if (!blockedId || blockedId === user.id) {
      return NextResponse.json({ ok: false, error: "user_id required." }, { status: 400 });
    }
    const { error } = await supabase.from("member_blocks").insert({
      blocker_id: user.id,
      blocked_id: blockedId,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    await supabase
      .from("member_follows")
      .delete()
      .or(
        `and(follower_id.eq.${user.id},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${user.id})`,
      );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
