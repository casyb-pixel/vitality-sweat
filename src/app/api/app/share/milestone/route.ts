import { NextResponse } from "next/server";
import type { MilestoneType } from "@/lib/fitness/milestones";
import {
  buildMilestoneSharePayload,
} from "@/lib/share/milestone-caption";
import {
  pngBufferToDataUrl,
  renderMilestoneCardPng,
} from "@/lib/share/milestone-card-image";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type MilestoneBody = {
  type?: MilestoneType;
  title?: string;
  detail?: string;
  exercise_id?: string;
  stats?: Record<string, unknown>;
  /** Ignored for storage. Phase 1 never persists member photos. */
  photo_data_url?: string | null;
};

/**
 * Build a soft share caption + branded card image for a confirmed milestone.
 * Does not auto-post. Does not store photos.
 */
export async function POST(request: Request) {
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

    let body: MilestoneBody;
    try {
      body = (await request.json()) as MilestoneBody;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const type = body.type;
    const title = (body.title ?? "").trim();
    const detail = (body.detail ?? "").trim();

    const allowed: MilestoneType[] = [
      "personal_best",
      "goal_weight",
      "streak",
      "program_week",
      "custom",
    ];
    if (!type || !allowed.includes(type)) {
      return NextResponse.json(
        { ok: false, error: "Send a valid milestone type." },
        { status: 400 },
      );
    }
    if (!title || !detail) {
      return NextResponse.json(
        { ok: false, error: "Send title and detail." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .maybeSingle();

    const payload = buildMilestoneSharePayload(
      { type, title, detail },
      typeof profile?.referral_code === "string" ? profile.referral_code : null,
    );

    let image: string | null = null;
    try {
      const png = await renderMilestoneCardPng(payload.card);
      image = pngBufferToDataUrl(png);
    } catch (err) {
      console.error("[share/milestone] card render failed:", err);
      // Caption + URL still usable with client fallback.
    }

    return NextResponse.json({
      ok: true,
      caption: payload.caption,
      shareUrl: payload.shareUrl,
      card: payload.card,
      image,
      // Phase 1: never persist photo_data_url (see oauth-publish.stub.ts for Phase 2).
      photo_stored: false,
    });
  } catch (err) {
    console.error("[share/milestone]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
