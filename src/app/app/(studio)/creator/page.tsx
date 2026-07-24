import type { Metadata } from "next";
import CreatorStudio from "@/components/creator/CreatorStudio";
import { requireCreatorAccess } from "@/lib/auth/creator";

export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Private Vitality Sweat creator backdoor for Video Studio and AI Blog Architect.",
  robots: { index: false, follow: false },
};

export default async function CreatorPage() {
  const { user, role } = await requireCreatorAccess();

  return (
    <CreatorStudio creatorLabel={user.email ?? user.id} role={role} />
  );
}
