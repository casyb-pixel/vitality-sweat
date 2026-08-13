import type { Metadata } from "next";
import DailyBriefClient from "@/components/creator/DailyBriefClient";
import { requireCreatorAccess } from "@/lib/auth/creator";

export const metadata: Metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

export default async function CreatorTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireCreatorAccess();
  const { view } = await searchParams;
  return <DailyBriefClient coachView={view === "coach"} />;
}
