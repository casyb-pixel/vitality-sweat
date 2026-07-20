import type { User } from "@supabase/supabase-js";

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
