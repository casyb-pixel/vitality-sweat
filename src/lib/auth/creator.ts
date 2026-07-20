import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CreatorRole = "admin" | "creator";

const CREATOR_ROLES = new Set<string>(["admin", "creator"]);

/**
 * Privileges must live in app_metadata (server-managed), never user_metadata.
 */
export function getCreatorRole(user: User | null): CreatorRole | null {
  if (!user) return null;
  const role = user.app_metadata?.role;
  if (typeof role === "string" && CREATOR_ROLES.has(role)) {
    return role as CreatorRole;
  }
  return null;
}

export function isCreatorUser(user: User | null): boolean {
  return getCreatorRole(user) !== null;
}

export type CreatorSession = {
  user: User;
  role: CreatorRole;
};

/**
 * Server-side gate for Creator Studio. Redirects unauthenticated users home;
 * returns null role handling via redirect for unauthorized sessions.
 */
export async function requireCreatorAccess(): Promise<CreatorSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&next=/app/creator");
  }

  const role = getCreatorRole(user);
  if (!role) {
    redirect("/?auth=forbidden");
  }

  return { user, role };
}
