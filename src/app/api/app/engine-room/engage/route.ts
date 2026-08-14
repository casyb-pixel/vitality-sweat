import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripEmDashes } from "@/lib/text/humanize-copy";

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

  const postId = typeof body.post_id === "string" ? body.post_id : "";
  const kind = body.kind;
  if (!postId || (kind !== "fire" && kind !== "spot" && kind !== "lets_go")) {
    return NextResponse.json(
      { ok: false, error: "Send post_id and kind." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("engine_room_reactions").upsert(
    { post_id: postId, user_id: user.id, kind },
    { onConflict: "post_id,user_id" },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
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
  const postId = typeof body.post_id === "string" ? body.post_id : "";
  const text = stripEmDashes(typeof body.body === "string" ? body.body.trim() : "");
  if (!postId || !text) {
    return NextResponse.json(
      { ok: false, error: "Send post_id and a comment." },
      { status: 400 },
    );
  }
  const { error } = await supabase.from("engine_room_comments").insert({
    post_id: postId,
    author_id: user.id,
    body: text,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
