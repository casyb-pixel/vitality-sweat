import { NextResponse } from "next/server";
import {
  getMemberProfile,
  validateMemberGeoInput,
} from "@/lib/auth/member-profile";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const profile = await getMemberProfile(supabase, user.id);
  return NextResponse.json({ ok: true, profile });
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const validated = validateMemberGeoInput(body);
    if (!validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    const row = body as Record<string, unknown>;
    const displayName =
      typeof row.display_name === "string" ? row.display_name.trim() : undefined;

    const payload: Record<string, string | null> = {
      city: validated.data.city,
      zip_code: validated.data.zip_code,
      region: validated.data.region ?? null,
    };
    if (displayName !== undefined) {
      payload.display_name = displayName || null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select(
        "id, email, role, display_name, avatar_url, city, zip_code, region, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error("[api/profile]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
