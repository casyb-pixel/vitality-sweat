import { NextResponse } from "next/server";
import {
  computeSweatScore,
  persistSweatScore,
} from "@/lib/fitness/sweat-score";
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
  const breakdown = await computeSweatScore(supabase, user.id);
  await persistSweatScore(supabase, user.id, breakdown);
  return NextResponse.json({ ok: true, score: breakdown });
}
