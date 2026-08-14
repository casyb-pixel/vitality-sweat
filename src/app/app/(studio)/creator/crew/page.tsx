import type { Metadata } from "next";
import CrewBoardClient from "@/components/creator/CrewBoardClient";
import { requireCreatorAccess } from "@/lib/auth/creator";

export const metadata: Metadata = {
  title: "Crew",
  robots: { index: false, follow: false },
};

export default async function CreatorCrewPage() {
  await requireCreatorAccess();
  return (
    <div className="space-y-6 py-8">
      <header>
        <p className="eyebrow text-brand-orange">Promoters</p>
        <h1 className="font-display text-3xl text-brand-ink">Crew board</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-brand-muted">
          Credit the invite link, count people who actually train, then ship VS
          swag. Fulfillment is manual in this pass.
        </p>
      </header>
      <CrewBoardClient />
    </div>
  );
}
