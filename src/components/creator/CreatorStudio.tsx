"use client";

import { useCallback, useState } from "react";
import BlogWizard from "@/components/creator/BlogWizard";
import CreatorContentGaps from "@/components/creator/CreatorContentGaps";
import MarketingProjectsPanel from "@/components/creator/MarketingProjectsPanel";
import VideoWizard from "@/components/creator/VideoWizard";

type StudioTab = "projects" | "blog" | "video";

type CreatorStudioProps = {
  creatorLabel: string;
  role: string;
};

const TABS: { id: StudioTab; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "blog", label: "Blog Wizard" },
  { id: "video", label: "Video Studio" },
];

export default function CreatorStudio({
  creatorLabel,
  role,
}: CreatorStudioProps) {
  const [tab, setTab] = useState<StudioTab>("projects");
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const [seedNotes, setSeedNotes] = useState<string | null>(null);

  const handlePublished = useCallback((slug: string) => {
    setHighlightSlug(slug);
    setSeedNotes(null);
    setTab("projects");
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightSlug(null);
  }, []);

  const handleWriteAbout = useCallback((topic: string) => {
    const trimmed = topic.trim();
    setSeedNotes(
      trimmed
        ? `Member Library search interest: ${trimmed}\n\nWrite a Chronicle that covers this topic for people training (treadmill-friendly tips welcome).`
        : null,
    );
    setTab("blog");
  }, []);

  const headline =
    tab === "video"
      ? "Film the Chronicle"
      : tab === "blog"
        ? "Log today, publish tonight"
        : "7-Day Marketing Projects";

  const blurb =
    tab === "video"
      ? " Pick a published post, grab a gym clip + voice-over, export a Shorts/TikTok/Reels pack."
      : tab === "blog"
        ? " Four quick steps from gym notes to a live Chronicle — no paragraphs required."
        : " Active publishes stay on the board with swipe copy + a 6-item delivery checklist.";

  return (
    <div className="space-y-6 pb-10 pt-4 sm:space-y-8 sm:pt-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Creator studio</p>
        <h1 className="font-display text-[clamp(1.85rem,6vw,2.75rem)] leading-[1.05] text-brand-ink">
          {headline}
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Signed in as{" "}
          <span className="font-semibold text-brand-ink">{creatorLabel}</span>{" "}
          · {role} access.
          {blurb}
        </p>

        <div
          role="tablist"
          aria-label="Creator studio mode"
          className="flex gap-1 border border-brand-ink/10 bg-surface p-1 sm:inline-flex sm:max-w-xl"
        >
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`studio-tab-${item.id}`}
                aria-controls={`studio-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`min-h-11 flex-1 px-2.5 py-2.5 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors sm:px-4 sm:text-sm ${
                  selected
                    ? "bg-brand-orange text-white"
                    : "bg-transparent text-brand-ink hover:text-brand-orange"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {tab === "projects" ? (
        <div
          id="studio-panel-projects"
          role="tabpanel"
          aria-labelledby="studio-tab-projects"
          className="space-y-6"
        >
          <CreatorContentGaps onWriteAbout={handleWriteAbout} />
          <MarketingProjectsPanel
            highlightSlug={highlightSlug}
            onPromosReady={clearHighlight}
          />
        </div>
      ) : null}

      {/* Keep Video Studio mounted so mid-session state survives tab switches;
          locked ideas also persist in the database for gym trips. */}
      <div
        id="studio-panel-video"
        role="tabpanel"
        aria-labelledby="studio-tab-video"
        hidden={tab !== "video"}
        className={tab === "video" ? undefined : "hidden"}
      >
        <VideoWizard />
      </div>

      {tab === "blog" ? (
        <div
          id="studio-panel-blog"
          role="tabpanel"
          aria-labelledby="studio-tab-blog"
        >
          <BlogWizard onPublished={handlePublished} seedNotes={seedNotes} />
        </div>
      ) : null}
    </div>
  );
}
