import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const NEXT_PATH = "/app/scholarships";

export function scholarshipAllowlist(): string[] {
  return (process.env.SCHOLARSHIP_ACCESS_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isScholarshipEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = scholarshipAllowlist();
  if (!allow.length) return false;
  return allow.includes(email.trim().toLowerCase());
}

/**
 * Household gate. Email must be on SCHOLARSHIP_ACCESS_EMAILS.
 * A matching member row is upserted so row level security can see the desk.
 */
export async function requireScholarshipAccess(): Promise<{ user: User }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=required&next=${NEXT_PATH}`);
  }

  if (!isScholarshipEmail(user.email)) {
    redirect(`/?auth=forbidden&next=${NEXT_PATH}`);
  }

  const admin = createServiceRoleClient();
  if (admin && user.email) {
    await admin.from("scholarship_members").upsert({
      user_id: user.id,
      email: user.email.trim().toLowerCase(),
    });
  }

  return { user };
}

export async function scholarshipNavVisible(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return isScholarshipEmail(user?.email);
  } catch {
    return false;
  }
}
