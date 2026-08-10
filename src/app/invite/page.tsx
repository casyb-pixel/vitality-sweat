import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import InviteLandingClient from "@/components/marketing/InviteLandingClient";

export const metadata: Metadata = {
  title: "Join Vitality Engine",
  description:
    "Create a free Vitality Engine account — workouts, meal plans, and grocery lists for Southwest Louisiana.",
  robots: { index: true, follow: true },
};

type InvitePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = searchParams ? await searchParams : {};
  const src = firstParam(params.src);
  const gym = firstParam(params.gym);
  const utmSource = firstParam(params.utm_source);
  const utmMedium = firstParam(params.utm_medium);
  const utmCampaign = firstParam(params.utm_campaign);
  const utmContent = firstParam(params.utm_content);
  const ref = firstParam(params.ref);

  return (
    <>
      <Navbar />
      <main className="bg-surface">
        <Suspense fallback={null}>
          <InviteLandingClient
            src={src}
            gym={gym}
            utmSource={utmSource}
            utmMedium={utmMedium}
            utmCampaign={utmCampaign}
            utmContent={utmContent}
            refCode={ref}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
