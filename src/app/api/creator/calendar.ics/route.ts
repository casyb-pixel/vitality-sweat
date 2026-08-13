import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import { absoluteUrl } from "@/lib/seo/site";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** JSON with subscribe URL for the Daily Brief UI. Feed itself is public via token. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (token) {
    const admin = createServiceRoleClient();
    if (!admin) {
      return new NextResponse("Service unavailable", { status: 503 });
    }
    const { data: row } = await admin
      .from("creator_calendar_tokens")
      .select("creator_id")
      .eq("token", token)
      .maybeSingle();
    if (!row) {
      return new NextResponse("Not found", { status: 404 });
    }
    const { data: tasks } = await admin
      .from("creator_tasks")
      .select("id, title, due_at, kind, status")
      .eq("creator_id", row.creator_id)
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(20);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vitality Sweat//Daily Brief//EN",
      ...(tasks ?? []).flatMap((task) => {
        const start = new Date(task.due_at as string);
        const stamp = start.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
        return [
          "BEGIN:VEVENT",
          `UID:${task.id}@vitalitysweat.com`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${stamp}`,
          `SUMMARY:${String(task.title).replace(/\n/g, " ")}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=vitality-brief.ics",
      },
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !getCreatorRole(user)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = createServiceRoleClient() ?? supabase;
  const { data: existing } = await admin
    .from("creator_calendar_tokens")
    .select("token")
    .eq("creator_id", user.id)
    .maybeSingle();

  let tokenOut = existing?.token as string | undefined;
  if (!tokenOut) {
    tokenOut = randomToken();
    await admin.from("creator_calendar_tokens").insert({
      creator_id: user.id,
      token: tokenOut,
    });
  }

  return NextResponse.json({
    ok: true,
    url: absoluteUrl(`/api/creator/calendar.ics?token=${tokenOut}`),
  });
}
