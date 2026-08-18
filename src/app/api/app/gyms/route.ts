import { NextResponse } from "next/server";
import { lastGymName, listGymOptions } from "@/lib/gyms/resolve";
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

  const [gyms, lastGym] = await Promise.all([
    listGymOptions(supabase),
    lastGymName(supabase, user.id),
  ]);

  return NextResponse.json({ ok: true, gyms, lastGym });
}
