import { NextResponse } from "next/server";
import type { GroceryItem } from "@/lib/fitness/types";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "edge";

/**
 * Public grocery list by share token — no auth required.
 * Returns only shopping fields (no email / profile PII).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const shareToken = (token ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      shareToken,
    )
  ) {
    return NextResponse.json({ ok: false, error: "Invalid share link." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Share links are temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("meal_plans")
    .select("week_start, grocery_list, grocery_share_token")
    .eq("grocery_share_token", shareToken)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "List not found." }, { status: 404 });
  }

  const grocery = Array.isArray(data.grocery_list)
    ? (data.grocery_list as GroceryItem[])
    : [];

  return NextResponse.json({
    ok: true,
    week_start: data.week_start,
    grocery_list: grocery,
  });
}
