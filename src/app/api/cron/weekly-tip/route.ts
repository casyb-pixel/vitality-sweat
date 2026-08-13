import { NextResponse } from "next/server";
import {
  enqueueWeeklyTipStub,
} from "@/lib/email/transactional";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * Weekly tip stub hook for a future cron (Render / GitHub Actions).
 * Auth: Authorization: Bearer $CRON_SECRET
 * Never marks emails sent without RESEND_API_KEY.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Service role unavailable." },
      { status: 500 },
    );
  }

  // Light stub: tip the 50 most recently created members with email.
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, display_name")
    .not("email", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const { data: latest } = await admin
    .from("posts")
    .select("title, slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tip = latest?.title
    ? `This week: log one honest workout, then read "${latest.title}". Open Engine after.`
    : "This week: log one honest workout and rate one meal. Consistency beats intensity.";

  const results = [];
  for (const profile of profiles ?? []) {
    if (!profile.email) continue;
    const result = await enqueueWeeklyTipStub(admin, {
      userId: profile.id as string,
      toEmail: profile.email as string,
      displayName: (profile.display_name as string | null) ?? null,
      tip,
      chronicleSlug: (latest?.slug as string | null) ?? null,
    });
    results.push({ userId: profile.id, ...result });
  }

  return NextResponse.json({
    ok: true,
    enqueued: results.length,
    results,
  });
}
