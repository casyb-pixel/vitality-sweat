import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  getCreatorRole,
  isCreatorUser,
  type CreatorRole,
} from "@/lib/auth/roles";
import { createClient } from "@/utils/supabase/server";

export type { CreatorRole };
export { getCreatorRole, isCreatorUser };

export type CreatorSession = {
  user: User;
  role: CreatorRole;
};

/**
 * Server-side gate for Creator Studio. Redirects unauthenticated users home;
 * unauthorized sessions get a polite forbidden state.
 */
export async function requireCreatorAccess(): Promise<CreatorSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&next=/app/creator");
  }

  const access = await resolveAccessDecision(supabase, user);
  if (access.status !== "creator") {
    redirect("/?auth=forbidden&next=/app/creator");
  }

  return { user, role: access.role };
}
