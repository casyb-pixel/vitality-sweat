import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseUsername } from "@/lib/engine-room/username";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if ("username" in body) {
    if (typeof body.username !== "string" || !body.username.trim()) {
      patch.username = null;
    } else {
      const parsed = parseUsername(body.username);
      if (!parsed.ok) {
        return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
      }
      patch.username = parsed.username;
    }
  }
  if (typeof body.engine_plus === "boolean") {
    patch.engine_plus = body.engine_plus;
  }
  if (typeof body.engine_room_public_opt_in === "boolean") {
    patch.engine_room_public_opt_in = body.engine_room_public_opt_in;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    const duplicate =
      error.code === "23505" || /duplicate|unique/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        error: duplicate
          ? "That username is taken."
          : error.message,
      },
      { status: duplicate ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
