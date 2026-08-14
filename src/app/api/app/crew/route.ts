import { NextResponse } from "next/server";
import { getCrewStats } from "@/lib/referrals/crew";
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
  const stats = await getCrewStats(supabase, user.id);
  return NextResponse.json({ ok: true, stats });
}
