import type { Metadata } from "next";
import { redirect } from "next/navigation";
import JoinWorkoutClient from "@/components/app/JoinWorkoutClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Train together",
  robots: { index: false, follow: false },
};

type JoinPageProps = {
  params: Promise<{ token: string }>;
};

export default async function JoinWorkoutPage({ params }: JoinPageProps) {
  const { token } = await params;
  if (!token) redirect("/app/workout");
  const { user } = await requireMemberAccess(`/app/workout/join/${token}`);
  const supabase = await createClient();
  const completion = await getMemberCompletionRedirect(supabase, user.id);
  if (completion) redirect(completion);
  return <JoinWorkoutClient token={token} />;
}
