import { NextResponse } from "next/server";
import {
  getMemberProfile,
  validateMemberGeoInput,
} from "@/lib/auth/member-profile";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/terms-2026-08-14";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const PROFILE_SELECT =
  "id, email, role, display_name, avatar_url, city, zip_code, region, referral_code, referred_by, terms_version, terms_accepted_at, created_at, updated_at";

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

    const row = body as Record<string, unknown>;
    const acceptTerms = row.accept_terms === true;
    const validated = validateMemberGeoInput(body);
    const displayName =
      typeof row.display_name === "string" ? row.display_name.trim() : undefined;

    if (!acceptTerms && !validated.ok && displayName === undefined) {
      return NextResponse.json(
        { ok: false, error: validated.ok ? "Nothing to update." : validated.error },
        { status: 400 },
      );
    }

    if (!acceptTerms && !validated.ok) {
      return NextResponse.json(
        { ok: false, error: validated.error },
        { status: 400 },
      );
    }

    const payload: Record<string, string | null> = {};
    if (validated.ok) {
      payload.city = validated.data.city;
      payload.zip_code = validated.data.zip_code;
      payload.region = validated.data.region ?? null;
    }
    if (displayName !== undefined) {
      payload.display_name = displayName || null;
    }
    if (acceptTerms) {
      payload.terms_version = CURRENT_TERMS_VERSION;
      payload.terms_accepted_at = new Date().toISOString();
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nothing to update." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select(PROFILE_SELECT)
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
