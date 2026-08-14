import { NextResponse } from "next/server";
import {
  buildEnginePromoPack,
  type EnginePromoVariant,
} from "@/lib/share/engine-promo";
import {
  pngBufferToDataUrl,
  renderMilestoneCardPng,
} from "@/lib/share/milestone-card-image";
import { getLiveCampaign } from "@/lib/referrals/crew";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function asVariant(value: unknown): EnginePromoVariant {
  if (value === "athlete" || value === "first_week" || value === "gym") {
    return value;
  }
  return "gym";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let variant: EnginePromoVariant = "gym";
    try {
      const body = (await request.json()) as { variant?: unknown };
      variant = asVariant(body.variant);
    } catch {
      variant = "gym";
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const code =
      typeof profile?.referral_code === "string" ? profile.referral_code : null;
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Invite code is not ready yet." },
        { status: 400 },
      );
    }

    const campaign = await getLiveCampaign(supabase);
    const contestLine = campaign
      ? `Live push: bring ${campaign.active_needed} active training partners for ${campaign.prize_label}.`
      : null;

    const payload = buildEnginePromoPack({
      variant,
      referralCode: code,
      displayName:
        typeof profile?.display_name === "string" ? profile.display_name : null,
      contestLine,
    });

    let image: string | null = null;
    try {
      const png = await renderMilestoneCardPng(payload.card, "Share the Engine");
      image = pngBufferToDataUrl(png);
    } catch (err) {
      console.error("[share/engine] card render failed:", err);
    }

    return NextResponse.json({
      ok: true,
      caption: payload.caption,
      shareUrl: payload.shareUrl,
      card: payload.card,
      image,
      variant: payload.variant,
    });
  } catch (err) {
    console.error("[share/engine]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
