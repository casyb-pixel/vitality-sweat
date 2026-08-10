import { NextResponse } from "next/server";
import { buildInviteUrl } from "@/lib/referrals/codes";
import {
  buildWelcomeEmail,
  enqueueTransactionalEmail,
} from "@/lib/email/transactional";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Enqueue (and send when Resend is configured) the welcome email for the
 * authenticated member. Idempotent per user.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Server misconfigured — service role key unavailable.",
        },
        { status: 500 },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, referral_code")
      .eq("id", user.id)
      .maybeSingle();

    const inviteUrl = profile?.referral_code
      ? buildInviteUrl(profile.referral_code as string)
      : null;
    const content = buildWelcomeEmail({
      displayName: (profile?.display_name as string | null) ?? user.email,
      inviteUrl,
    });

    const result = await enqueueTransactionalEmail(admin, {
      userId: user.id,
      toEmail: user.email,
      template: "welcome",
      payload: { inviteUrl },
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[emails/welcome]", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error." },
      { status: 500 },
    );
  }
}
