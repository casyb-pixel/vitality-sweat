import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { sanitizeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Magic-link / OAuth PKCE callback — exchanges `code` for a session cookie,
 * then routes creators to Studio (when requested) and members to the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "/app");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password recovery / invite flows land here with next=/auth/update-password.
      if (next.startsWith("/auth/update-password")) {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const access = await resolveAccessDecision(supabase, user);

      if (access.status === "creator") {
        const destination = next.startsWith("/app") ? next : "/app/creator";
        return NextResponse.redirect(`${origin}${destination}`);
      }

      if (user) {
        const wantsCreator =
          next === "/app/creator" || next.startsWith("/app/creator/");
        const completion = await getMemberCompletionRedirect(supabase, user.id);
        const rawDestination =
          completion ??
          (wantsCreator
            ? "/app"
            : next.startsWith("/app") || next.startsWith("/profile")
              ? next
              : "/app");
        // Keep growth marker so AuthGate can emit signup_complete after email confirm.
        const destination =
          next.includes("joined=1") && !rawDestination.includes("joined=1")
            ? rawDestination.includes("?")
              ? `${rawDestination}&joined=1`
              : `${rawDestination}?joined=1`
            : rawDestination;
        return NextResponse.redirect(`${origin}${destination}`);
      }
    } else {
      console.error(
        "[auth/callback] exchangeCodeForSession failed:",
        error.message,
      );
    }
  }

  return NextResponse.redirect(
    `${origin}/?auth=required&next=${encodeURIComponent(next)}&error=auth_callback`,
  );
}
