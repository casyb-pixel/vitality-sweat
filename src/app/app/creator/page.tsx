import type { Metadata } from "next";
import CreatorStudio from "@/components/creator/CreatorStudio";
import { requireCreatorAccess } from "@/lib/auth/creator";
import {
  buildRecommendationsFromDrafts,
  CHRONICLE_DRAFTS,
} from "@/lib/chronicles/drafts";

export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Private Vitality Sweat creator backdoor for Video Studio and AI Blog Architect.",
  robots: { index: false, follow: false },
};

export default async function CreatorPage() {
  const { user, role } = await requireCreatorAccess();
  const drafts = CHRONICLE_DRAFTS;
  const recommendations = buildRecommendationsFromDrafts(drafts);

  return (
    <CreatorStudio
      drafts={drafts}
      recommendations={recommendations}
      creatorLabel={user.email ?? user.id}
      role={role}
    />
  );
}
