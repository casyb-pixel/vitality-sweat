import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LibraryBrowser from "@/components/app/LibraryBrowser";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import { getAllBlogPostsAsync } from "@/lib/blog/posts";
import {
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import type { Video } from "@/lib/fitness/types";
import { toLibraryPostSummary } from "@/lib/library/search";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Library",
  robots: { index: false, follow: false },
};

export default async function LibraryPage() {
  const { user } = await requireMemberAccess("/app/library");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) {
    redirect(completion);
  }

  const [{ data: videos }, posts] = await Promise.all([
    supabase
      .from("videos")
      .select("*")
      .eq("is_active", true)
      .order("published_at", { ascending: false }),
    getAllBlogPostsAsync(),
  ]);

  const list = (videos as Video[] | null) ?? [];
  const summaries = posts.map(toLibraryPostSummary);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Learn mid-stride</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Library
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Browse Sweatlife Chronicles and training clips. Search a topic while
          you walk — tap a post to read, or watch embeds and the YouTube
          channel without leaving the Engine.
        </p>
      </header>

      <LibraryBrowser posts={summaries} videos={list} />
    </div>
  );
}
