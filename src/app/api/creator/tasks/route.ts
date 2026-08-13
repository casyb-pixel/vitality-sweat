import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import { materializeCreatorTasks } from "@/lib/creator/daily-brief";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !getCreatorRole(user)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("creator_tasks")
    .select("*")
    .eq("creator_id", user.id)
    .order("due_at", { ascending: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tasks: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !getCreatorRole(user)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { action?: string; id?: string; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.action === "materialize") {
    const admin = createServiceRoleClient() ?? supabase;
    const tasks = await materializeCreatorTasks(admin, user.id);
    return NextResponse.json({ ok: true, tasks });
  }

  if (body.id && body.status) {
    const { data, error } = await supabase
      .from("creator_tasks")
      .update({
        status: body.status,
        snooze_until:
          body.status === "snoozed"
            ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
            : null,
      })
      .eq("id", body.id)
      .eq("creator_id", user.id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, task: data });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
