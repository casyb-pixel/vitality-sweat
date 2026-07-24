import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { resolveAccessDecision } from "@/lib/auth/authorize";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required&next=/profile");
  }

  const access = await resolveAccessDecision(supabase, user);

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
                Your member profile is ready. Open the Vitality Engine app for
                workouts, meal planning, and the video library.
              </p>
              <Link
                href="/app"
                className="mt-4 inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
              >
                Open Vitality Engine
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
