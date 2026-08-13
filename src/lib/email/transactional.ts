/**
 * Transactional email foundation for Vitality Engine.
 *
 * - Welcome + weekly tip templates live here.
 * - Sends go through Resend when `RESEND_API_KEY` is set.
 * - Otherwise rows stay in `email_outbox` as `pending` (never fake-sent).
 *
 * Env:
 *   RESEND_API_KEY       - required for live sends
 *   EMAIL_FROM           - e.g. "Vitality Sweat <hello@vitalitysweat.com>"
 *   EMAIL_REPLY_TO       - optional
 *
 * Copy note: never use em dashes in subject/body (see humanize-copy.ts).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { absoluteUrl } from "@/lib/seo/site";

export type EmailTemplate = "welcome" | "weekly_tip";

export type EmailSendResult =
  | { status: "sent"; outboxId: string; providerMessageId: string }
  | { status: "pending"; outboxId: string; reason: string }
  | { status: "skipped"; outboxId: string; reason: string }
  | { status: "failed"; outboxId: string; error: string };

function emailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Vitality Sweat <onboarding@resend.dev>"
  );
}

function hasResendKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function buildWelcomeEmail(input: {
  displayName?: string | null;
  inviteUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const name = input.displayName?.trim() || "athlete";
  const appUrl = absoluteUrl("/app");
  const invite = input.inviteUrl?.trim();
  const subject = "Welcome to Vitality Engine - Train. Fuel. Compete.";
  const text = [
    `Hey ${name},`,
    "",
    "Welcome to the Vitality Engine: free workouts, meal plans, and grocery lists built for how Southwest Louisiana trains and eats.",
    "",
    `Open your dashboard: ${appUrl}`,
    invite
      ? `Invite a training partner (soft shoutout on your profile when they join): ${invite}`
      : null,
    "",
    "Train. Fuel. Compete.",
    "- Hunter / Vitality Sweat",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#404040;max-width:560px">
      <p>Hey ${escapeHtml(name)},</p>
      <p>Welcome to the <strong>Vitality Engine</strong>: free workouts, meal plans, and grocery lists built for how Southwest Louisiana trains and eats.</p>
      <p><a href="${appUrl}" style="background:#E85D04;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700;display:inline-block">Open your dashboard</a></p>
      ${
        invite
          ? `<p>Invite a training partner and you'll get a soft shoutout on your profile when they join:<br/><a href="${invite}">${escapeHtml(invite)}</a></p>`
          : ""
      }
      <p>Train. Fuel. Compete.<br/>- Hunter / Vitality Sweat</p>
    </div>
  `.trim();

  return { subject, html, text };
}

/** Stub copy for optional weekly tips. Enqueue only until a cron is wired. */
export function buildWeeklyTipEmail(input: {
  displayName?: string | null;
  tip?: string | null;
}): { subject: string; html: string; text: string } {
  const name = input.displayName?.trim() || "athlete";
  const tip =
    input.tip?.trim() ||
    "This week: log one honest workout and rate one meal. Consistency beats intensity.";
  const appUrl = absoluteUrl("/app");
  const subject = "Vitality Engine tip - show up this week";
  const text = [
    `Hey ${name},`,
    "",
    tip,
    "",
    `Jump back in: ${appUrl}`,
    "",
    "Train. Fuel. Compete.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#404040;max-width:560px">
      <p>Hey ${escapeHtml(name)},</p>
      <p>${escapeHtml(tip)}</p>
      <p><a href="${appUrl}">Open Vitality Engine</a></p>
      <p>Train. Fuel. Compete.</p>
    </div>
  `.trim();
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Insert outbox row and attempt Resend delivery when configured.
 * Dedupes welcome emails per user (one successful/pending welcome).
 */
export async function enqueueTransactionalEmail(
  admin: SupabaseClient,
  input: {
    userId: string;
    toEmail: string;
    template: EmailTemplate;
    payload?: Record<string, unknown>;
    subject: string;
    html: string;
    text: string;
  },
): Promise<EmailSendResult> {
  if (input.template === "welcome") {
    const { data: existing } = await admin
      .from("email_outbox")
      .select("id, status")
      .eq("user_id", input.userId)
      .eq("template", "welcome")
      .in("status", ["pending", "sent"])
      .maybeSingle();
    if (existing) {
      return {
        status: "skipped",
        outboxId: existing.id as string,
        reason: "Welcome email already queued or sent.",
      };
    }
  }

  const { data: row, error: insertError } = await admin
    .from("email_outbox")
    .insert({
      user_id: input.userId,
      to_email: input.toEmail,
      template: input.template,
      payload: input.payload ?? {},
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return {
      status: "failed",
      outboxId: "",
      error: insertError?.message ?? "Could not enqueue email.",
    };
  }

  const outboxId = row.id as string;

  if (!hasResendKey()) {
    return {
      status: "pending",
      outboxId,
      reason:
        "RESEND_API_KEY not set; email stays pending in email_outbox (not fake-sent).",
    };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const result = await resend.emails.send({
      from: emailFrom(),
      to: input.toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    });

    if (result.error) {
      await admin
        .from("email_outbox")
        .update({
          status: "failed",
          provider: "resend",
          error: result.error.message,
        })
        .eq("id", outboxId);
      return { status: "failed", outboxId, error: result.error.message };
    }

    const providerMessageId = result.data?.id ?? "unknown";
    await admin
      .from("email_outbox")
      .update({
        status: "sent",
        provider: "resend",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", outboxId);

    return { status: "sent", outboxId, providerMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed.";
    await admin
      .from("email_outbox")
      .update({
        status: "failed",
        provider: "resend",
        error: message,
      })
      .eq("id", outboxId);
    return { status: "failed", outboxId, error: message };
  }
}

/**
 * Weekly tip stub. Call from a future cron / Render job.
 * Enqueues only; does not invent sends without Resend.
 */
export async function enqueueWeeklyTipStub(
  admin: SupabaseClient,
  input: {
    userId: string;
    toEmail: string;
    displayName?: string | null;
    tip?: string | null;
    chronicleSlug?: string | null;
  },
): Promise<EmailSendResult> {
  const content = buildWeeklyTipEmail({
    displayName: input.displayName,
    tip: input.tip,
  });
  return enqueueTransactionalEmail(admin, {
    userId: input.userId,
    toEmail: input.toEmail,
    template: "weekly_tip",
    payload: { stub: false, chronicleSlug: input.chronicleSlug ?? null },
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
