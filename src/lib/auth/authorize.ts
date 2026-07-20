import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getCreatorRole, type CreatorRole } from "@/lib/auth/roles";

export type AccessDecision =
  | { status: "creator"; role: CreatorRole }
  | { status: "member" }
  | { status: "anonymous" };

/**
 * Resolves Creator Studio access from JWT app_metadata (authoritative)
 * and optionally a public.profiles.role row when present.
 * Never trusts user_metadata for authorization.
 */
export async function resolveAccessDecision(
  supabase: SupabaseClient,
  user: User | null,
): Promise<AccessDecision> {
  if (!user) return { status: "anonymous" };

  const metaRole = getCreatorRole(user);
  if (metaRole) {
    return { status: "creator", role: metaRole };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data && typeof data.role === "string") {
      if (data.role === "admin" || data.role === "creator") {
        return { status: "creator", role: data.role };
      }
    }
  } catch {
    // profiles table may not exist yet — ignore
  }

  return { status: "member" };
}
