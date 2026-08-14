import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const username = new URL(request.url).searchParams
    .get("username")
    ?.trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (!username) {
    return NextResponse.json({ ok: false, error: "username required." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .ilike("username", username)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json(
      { ok: false, error: "No member with that username." },
      { status: 404 },
    );
  }

  const { data: follow } = await supabase
    .from("member_follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", profile.id)
    .maybeSingle();

  const { data: posts } = await supabase
    .from("engine_room_posts")
    .select("id, kind, body, created_at")
    .eq("author_id", profile.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      username: profile.username,
      following: Boolean(follow),
      isSelf: profile.id === user.id,
    },
    posts: posts ?? [],
  });
}
