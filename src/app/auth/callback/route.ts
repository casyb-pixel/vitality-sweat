import { NextResponse } from "next/server";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import { sanitizeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Magic-link / OAuth PKCE callback — exchanges `code` for a session cookie,
 * then routes creators to `next` and members to the profile screen.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"), "/app/creator");

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
        const destination = next.startsWith("/app/") ? next : "/app/creator";
        return NextResponse.redirect(`${origin}${destination}`);
      }

      if (user) {
        return NextResponse.redirect(`${origin}/profile`);
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
