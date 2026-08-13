import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
  if (typeof body.username === "string") {
    const u = body.username.trim().replace(/^@/, "").toLowerCase();
    patch.username = u ? u.slice(0, 32) : null;
  }
  if (typeof body.engine_plus === "boolean") {
    patch.engine_plus = body.engine_plus;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
