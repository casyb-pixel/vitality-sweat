import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import InviteFriendsCard from "@/components/auth/InviteFriendsCard";
import ProfileGeoForm from "@/components/auth/ProfileGeoForm";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import {
  getMemberProfile,
  hasRequiredGeo,
} from "@/lib/auth/member-profile";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

type ProfilePageProps = {
  searchParams?: Promise<{ complete?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&next=/profile");
  }

  const params = searchParams ? await searchParams : {};
  const requireGeo = params.complete === "geo";
  const access = await resolveAccessDecision(supabase, user);
  const profile = await getMemberProfile(supabase, user.id);
  const geoReady = hasRequiredGeo(profile);

  const { count: referralCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", user.id);

  return (
    <>
      <Navbar />
      <main className="bg-surface">
        <div className="section-y site-shell max-w-2xl">
          <p className="eyebrow text-brand-orange">Account</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] text-brand-ink">
            Your Vitality Sweat profile
          </h1>
          <p className="mt-4 font-sans text-base leading-relaxed text-brand-muted sm:text-lg">
            Signed in as{" "}
            <span className="font-semibold text-brand-ink">
              {user.email ?? user.id}
            </span>
            .
          </p>

          {requireGeo && !geoReady ? (
            <div className="mt-6 border border-brand-orange/30 bg-brand-orange/5 p-4">
              <p className="font-sans text-sm leading-relaxed text-brand-ink">
                Add your city and ZIP to finish setting up your account.
              </p>
            </div>
          ) : null}

          {geoReady ? (
            <dl className="mt-8 grid gap-3 border border-brand-ink/10 bg-surface-elevated p-5 font-sans text-sm text-brand-muted sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em]">
                  City
                </dt>
                <dd className="mt-1 font-semibold text-brand-ink">
                  {profile?.city}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.1em]">
                  ZIP
                </dt>
                <dd className="mt-1 font-semibold text-brand-ink">
                  {profile?.zip_code}
                </dd>
              </div>
              {profile?.region ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.1em]">
                    Parish / region
                  </dt>
                  <dd className="mt-1 font-semibold text-brand-ink">
                    {profile.region}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <ProfileGeoForm
            profile={profile}
            requireGeo={requireGeo && !geoReady}
          />

          <InviteFriendsCard
            referralCode={profile?.referral_code ?? null}
            referralCount={referralCount ?? 0}
          />

          {access.status === "creator" ? (
            <div className="mt-8 border border-brand-orange/30 bg-brand-orange/5 p-5">
              <p className="font-sans text-sm font-semibold text-brand-ink">
                Creator access is active ({access.role}).
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/app"
                  className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
                >
                  Open Vitality Engine
                </Link>
                <Link
                  href="/app/creator"
                  className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                >
                  Open Creator Studio
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 border border-brand-ink/10 bg-surface-elevated p-5">
              <p className="font-sans text-sm leading-relaxed text-brand-muted">
                {geoReady
                  ? "Your member profile is ready. Open the Vitality Engine app for workouts, meal planning, and the video library."
                  : "Save your city and ZIP, then open the Vitality Engine app."}
              </p>
              {geoReady ? (
                <Link
                  href="/app"
                  className="mt-4 inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
                >
                  Open Vitality Engine
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
