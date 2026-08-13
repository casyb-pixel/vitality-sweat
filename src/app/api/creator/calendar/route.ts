import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import { createClient } from "@/utils/supabase/server";

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
    .from("posts")
    .select(
      "id, title, slug, status, editorial_status, cluster, due_at, published_at, project_due_at",
    )
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const posts = (data ?? []).map((row) => ({
    ...row,
    due_at: row.due_at || row.project_due_at || row.published_at,
  }));

  return NextResponse.json({ ok: true, posts });
}
