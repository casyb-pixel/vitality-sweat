import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMemberAccess } from "@/lib/auth/member";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import type { Video } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Library",
  robots: { index: false, follow: false },
};

export default async function LibraryPage() {
  const { user } = await requireMemberAccess("/app/library");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);

  if (!isOnboardingComplete(profile)) {
    redirect("/app/onboarding");
  }

  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false });

  const list = (videos as Video[] | null) ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Learn &amp; get inspired</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Video library &amp; Chronicles
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Instructional and motivational videos from Vitality Sweat, plus
          Hunter’s Sweatlife Chronicles blogs tracking the journey.
        </p>
      </header>

      <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
        <h2 className="font-display text-xl text-brand-ink">
          The Sweatlife Chronicles
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
          Read blogs that track Hunter’s fitness journey and the discoveries he
          makes along the way.
        </p>
        <Link
          href="/chronicles"
          className="mt-4 inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
        >
          Open Chronicles
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-brand-ink">Video library</h2>
        {list.length === 0 ? (
          <p className="font-sans text-sm text-brand-muted">
            No videos published yet. Check back soon — or watch the channel at{" "}
            <a
              href="https://vitalitysweat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-orange hover:text-brand-orange-deep"
            >
              vitalitysweat.com
            </a>
            .
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((video) => (
              <article
                key={video.id}
                className="flex flex-col border border-brand-ink/10 bg-surface-elevated"
              >
                <div className="flex aspect-video items-center justify-center bg-brand-ink/5 font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
                  {video.provider}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-orange">
                    {video.category}
                  </p>
                  <h3 className="mt-1 font-display text-lg text-brand-ink">
                    {video.title}
                  </h3>
                  {video.description ? (
                    <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-brand-muted">
                      {video.description}
                    </p>
                  ) : null}
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
                  >
                    Watch
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
