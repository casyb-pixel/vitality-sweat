import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type MemberSession = {
  user: User;
};

/**
 * Server-side gate for the member Vitality Engine app.
 * Any authenticated user qualifies (free access). Anonymous users
 * are sent home with the auth modal open.
 */
export async function requireMemberAccess(
  nextPath = "/app",
): Promise<MemberSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=required&next=${encodeURIComponent(nextPath)}`);
  }

  return { user };
}
