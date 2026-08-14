import { NextResponse } from "next/server";
import { isSchoolHours, materializeCreatorTasks } from "@/lib/creator/daily-brief";
import { enqueueTransactionalEmail } from "@/lib/email/transactional";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * Morning Daily Brief: materialize tasks, email Hunter, skip school quiet hours
 * for extra pings. ICS remains the reliability path if Web Push is flaky.
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

  const pulse = request.headers.get("x-brief-pulse") ?? "morning";
  if (pulse !== "morning" && isSchoolHours()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "School quiet hours 7:20am-11:30am America/Chicago.",
    });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service role unavailable." }, { status: 500 });
  }

  const { data: creators } = await admin
    .from("profiles")
    .select("id, email, display_name")
    .not("email", "is", null)
    .limit(20);

  const results = [];
  for (const creator of creators ?? []) {
    const tasks = await materializeCreatorTasks(admin, creator.id as string);
    const pending = (tasks as { title?: string; status?: string }[]).filter(
      (t) => t.status === "pending",
    );
    if (creator.email && pending.length) {
      const tip = pending
        .slice(0, 3)
        .map((t, i) => `${i + 1}. ${t.title}`)
        .join("\n");
      await enqueueTransactionalEmail(admin, {
        userId: creator.id as string,
        toEmail: creator.email as string,
        template: "weekly_tip",
        payload: { kind: "morning_brief" },
        subject: "Daily Brief: today's three",
        html: `<p>Today's three:</p><pre>${tip}</pre><p><a href="https://vitalitysweat.com/app/creator/today">Open Today</a></p>`,
        text: `Today's three:\n${tip}\nhttps://vitalitysweat.com/app/creator/today`,
      });
    }
    results.push({ creatorId: creator.id, tasks: pending.length });
  }

  return NextResponse.json({ ok: true, results });
}
