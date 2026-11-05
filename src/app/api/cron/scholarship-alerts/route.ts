import { NextResponse } from "next/server";
import { enqueueTransactionalEmail } from "@/lib/email/transactional";
import { buildScholarshipAlert } from "@/lib/scholarships/alert-copy";
import { chicagoDate, daysUntilDeadline, isAlertWindow } from "@/lib/scholarships/dates";
import { createServiceRoleClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

async function run() {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service role unavailable." }, { status: 500 });
  }

  const today = chicagoDate();
  const { data: rows, error } = await admin
    .from("scholarships")
    .select("id, name, url, deadline, scholarship_applications(applied)")
    .not("deadline", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const due = (rows ?? []).flatMap((row) => {
    const deadline = String(row.deadline).slice(0, 10);
    const days = daysUntilDeadline(deadline, today);
    const application = Array.isArray(row.scholarship_applications)
      ? row.scholarship_applications[0]
      : row.scholarship_applications;
    if (application?.applied) return [];
    if (!isAlertWindow(days)) return [];
    return [
      {
        id: row.id as string,
        name: row.name as string,
        url: (row.url as string | null) ?? null,
        deadline,
        days,
      },
    ];
  });

  if (!due.length) {
    return NextResponse.json({ ok: true, sent: 0, today });
  }

  const { data: members } = await admin
    .from("scholarship_members")
    .select("user_id, email");

  let sent = 0;
  for (const member of members ?? []) {
    const email = member.email as string | null;
    const userId = member.user_id as string;
    if (!email) continue;
    const fresh = [];
    for (const item of due) {
      const { data: existing } = await admin
        .from("scholarship_alert_log")
        .select("id")
        .eq("scholarship_id", item.id)
        .eq("user_id", userId)
        .eq("days_before", item.days)
        .eq("deadline_on", item.deadline)
        .maybeSingle();
      if (!existing) fresh.push(item);
    }
    if (!fresh.length) continue;

    const copy = buildScholarshipAlert(fresh);
    const result = await enqueueTransactionalEmail(admin, {
      userId,
      toEmail: email,
      template: "scholarship_deadline",
      payload: { days: fresh.map((item) => item.days), slugs: fresh.map((item) => item.id) },
      subject: copy.subject,
      html: copy.html,
      text: copy.text,
    });

    if (result.status === "sent" || result.status === "pending") {
      await admin.from("scholarship_alert_log").insert(
        fresh.map((item) => ({
          scholarship_id: item.id,
          user_id: userId,
          days_before: item.days,
          deadline_on: item.deadline,
        })),
      );
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, due: due.length, today });
}

function gate(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  return gate(request) ?? run();
}

export async function POST(request: Request) {
  return gate(request) ?? run();
}
