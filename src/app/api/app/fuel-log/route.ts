import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

async function member() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("logged_on", today)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log: data });
}

export async function POST(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const today =
    typeof body.logged_on === "string" && body.logged_on
      ? body.logged_on
      : new Date().toISOString().slice(0, 10);
  const row = {
    user_id: user.id,
    logged_on: today,
    calories: body.calories != null ? Number(body.calories) : null,
    protein_g: body.protein_g != null ? Number(body.protein_g) : null,
    carbs_g: body.carbs_g != null ? Number(body.carbs_g) : null,
    fat_g: body.fat_g != null ? Number(body.fat_g) : null,
    water_oz: body.water_oz != null ? Number(body.water_oz) : null,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 400) : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("fuel_logs")
    .upsert(row, { onConflict: "user_id,logged_on" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log: data });
}
