import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EngineRoomProfileClient from "@/components/app/EngineRoomProfileClient";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Engine Room profile",
  robots: { index: false, follow: false },
};

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function EngineRoomUserPage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { user } = await requireMemberAccess(`/app/engine-room/u/${username}`);
  const supabase = await createClient();
  const completion = await getMemberCompletionRedirect(supabase, user.id);
  if (completion) redirect(completion);
  if (!username) redirect("/app/engine-room");
  return <EngineRoomProfileClient username={username} />;
}
