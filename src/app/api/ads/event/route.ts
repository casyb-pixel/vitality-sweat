import { NextResponse } from "next/server";
import { resolveInventorySlotId } from "@/lib/sponsors/slots";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Privacy-safe impression/click logging. No emails or IPs stored.
 * session_hash is an opaque client token (optional).
 */
export async function POST(request: Request) {
  try {
    let body: {
      creativeId?: string;
      campaignId?: string;
      slotId?: string;
      eventType?: string;
      pagePath?: string;
      sessionHash?: string;
      market?: string | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
    }

    const eventType = body.eventType === "click" ? "click" : "impression";
    const slotId = (body.slotId ?? "").trim();
    if (!slotId) {
      return NextResponse.json(
        { ok: false, error: "slotId required." },
        { status: 400 },
      );
    }

    const { normalizeMarketParam } = await import("@/lib/markets/metros");
    const market = normalizeMarketParam(body.market ?? null);

    const admin = createServiceRoleClient();
    // Prefer service role; fall back to user/anon client for insert policy.
    const client = admin ?? (await createClient());

    const { error } = await client.from("sponsor_ad_events").insert({
      creative_id: body.creativeId || null,
      campaign_id: body.campaignId || null,
      slot_id: resolveInventorySlotId(slotId),
      event_type: eventType,
      page_path: (body.pagePath ?? "").slice(0, 300) || null,
      session_hash: (body.sessionHash ?? "").slice(0, 64) || null,
      market,
    });

    if (error) {
      console.error("[ads/event]", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not log event." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ads/event]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
