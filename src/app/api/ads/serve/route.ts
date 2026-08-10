import { NextResponse } from "next/server";
import { serveCreativeForSlot } from "@/lib/sponsors/serve";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * Public creative serve for a registry slot (or blog-mid-* alias).
 * Prefers paid live flights; falls back to house CTA.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slotId = (searchParams.get("slot") ?? "").trim();
    if (!slotId) {
      return NextResponse.json(
        { ok: false, error: "Missing slot query param." },
        { status: 400 },
      );
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Service role unavailable.", creative: null },
        { status: 503 },
      );
    }

    const visitorZip = searchParams.get("zip");
    const creative = await serveCreativeForSlot(admin, {
      slotId,
      visitorZip,
    });

    return NextResponse.json(
      { ok: true, creative },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    console.error("[ads/serve]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error.", creative: null },
      { status: 500 },
    );
  }
}
