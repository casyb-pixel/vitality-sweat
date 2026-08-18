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

export async function GET() {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("member_follows")
    .select("following_id, follower_id, created_at")
    .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, follows: data ?? [] });
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
  const username =
    typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : "";
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!username && !userId) {
    return NextResponse.json({ ok: false, error: "Send a username." }, { status: 400 });
  }
  const targetQuery = supabase
    .from("engine_room_members")
    .select("id, username");
  const { data: target } = userId
    ? await targetQuery.eq("id", userId).maybeSingle()
    : await targetQuery.ilike("username", username).maybeSingle();
  if (!target?.id || target.id === user.id) {
    return NextResponse.json(
      { ok: false, error: "No member with that username." },
      { status: 404 },
    );
  }
  const { error } = await supabase.from("member_follows").insert({
    follower_id: user.id,
    following_id: target.id,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const followingId = url.searchParams.get("following_id") ?? "";
  if (!followingId) {
    return NextResponse.json({ ok: false, error: "following_id required." }, { status: 400 });
  }
  await supabase
    .from("member_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);
  return NextResponse.json({ ok: true });
}
