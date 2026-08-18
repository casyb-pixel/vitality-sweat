"use client";

import { useCallback, useEffect, useState } from "react";
import AudiencePanel from "@/components/creator/AudiencePanel";
import BlogWizard from "@/components/creator/BlogWizard";
import CreatorContentGaps from "@/components/creator/CreatorContentGaps";
import DailyBriefClient from "@/components/creator/DailyBriefClient";
import EditorialCalendarPanel from "@/components/creator/EditorialCalendarPanel";
import GrowthCampaignPanel from "@/components/creator/GrowthCampaignPanel";
import MarketingProjectsPanel from "@/components/creator/MarketingProjectsPanel";
import SponsorsPanel from "@/components/creator/SponsorsPanel";
import SocialKitPanel from "@/components/creator/SocialKitPanel";
import LiveClipsPanel from "@/components/creator/LiveClipsPanel";
import VideoWizard from "@/components/creator/VideoWizard";
import type {
  BlogArticleType,
  VideoScriptPreset,
} from "@/lib/marketing/campaign-templates";

type StudioTab =
  | "today"
  | "calendar"
  | "projects"
  | "blog"
  | "video"
  | "live"
  | "social"
  | "audience"
  | "sponsors";

type CreatorStudioProps = {
  creatorLabel: string;
  role: string;
};

const TABS: { id: StudioTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "projects", label: "Projects" },
  { id: "blog", label: "Blog Wizard" },
  { id: "video", label: "Video Studio" },
  { id: "live", label: "Live clips" },
  { id: "social", label: "Social kit" },
  { id: "sponsors", label: "Sponsors" },
  { id: "audience", label: "Audience" },
];

export default function CreatorStudio({
  creatorLabel,
  role,
}: CreatorStudioProps) {
  const [tab, setTab] = useState<StudioTab>("projects");
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const [seedNotes, setSeedNotes] = useState<string | null>(null);
  const [articleType, setArticleType] = useState<BlogArticleType>("standard");
  const [videoScriptPreset, setVideoScriptPreset] =
    useState<VideoScriptPreset>("standard");
  const [seedVideoPostId, setSeedVideoPostId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("tab");
    if (requested && TABS.some((item) => item.id === requested)) {
      setTab(requested as StudioTab);
    }
  }, []);

  const handlePublished = useCallback((slug: string) => {
    setHighlightSlug(slug);
    setSeedNotes(null);
    setArticleType("standard");
    setTab("projects");
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightSlug(null);
  }, []);

  const handleWriteAbout = useCallback((topic: string) => {
    const trimmed = topic.trim();
    setArticleType("standard");
    setSeedNotes(
      trimmed
        ? `Member Library search interest: ${trimmed}\n\nWrite a Chronicle that covers this topic for people training (treadmill-friendly tips welcome).`
        : null,
    );
    setTab("blog");
  }, []);

  const handleLaunchCampaignBlog = useCallback(
    (input: { outline: string }) => {
      setArticleType("local_growth");
      setSeedNotes(input.outline);
      setTab("blog");
    },
    [],
  );

  const handleLaunchCampaignVideo = useCallback(() => {
    setVideoScriptPreset("app_invite");
    setTab("video");
  }, []);

  const handleTagVideo = useCallback(
    (post: { id: string; slug: string; title: string }) => {
      setSeedVideoPostId(post.id);
      setTab("video");
    },
    [],
  );

  const headline =
    tab === "video"
      ? "Film the Chronicle"
      : tab === "live"
        ? "Cut Hunter gym lives into clips"
        : tab === "blog"
        ? "Log today, publish tonight"
        : tab === "social"
          ? "Paste bios. Post three times."
          : tab === "audience"
            ? "Prove local density"
            : tab === "sponsors"
              ? "Sell local slots"
              : "7-Day Marketing Projects";

  const blurb =
    tab === "video"
      ? " Pick a published post, grab a gym clip + voice-over, export a Shorts/TikTok/Reels pack."
      : tab === "live"
        ? " Paste a YouTube live or VOD, mark start and end, publish short training clips to the Library."
        : tab === "blog"
        ? " Four quick steps from gym notes to a live Chronicle. No paragraphs required."
        : tab === "social"
          ? " Approved bios, UTM invite links, logo files, and the 3-post weekly cadence. Copy, post in the native app, then mark the project done."
          : tab === "audience"
            ? " ZIP-level active members plus campaign deliverable proof for sponsorship pitches."
            : tab === "sponsors"
              ? " CRUD sponsors, flights, creatives, and slot assignments. House CTA fills unsold inventory."
              : " Growth Campaign templates + active publishes with swipe copy and a 6-item delivery checklist.";

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
          className="flex flex-wrap gap-1 border border-brand-ink/10 bg-surface p-1 sm:inline-flex sm:max-w-4xl"
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
                className={`min-h-11 flex-1 px-2.5 py-2.5 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors sm:px-3 sm:text-sm ${
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

      {tab === "today" ? (
        <div id="studio-panel-today" role="tabpanel">
          <DailyBriefClient />
        </div>
      ) : null}

      {tab === "calendar" ? (
        <div id="studio-panel-calendar" role="tabpanel">
          <EditorialCalendarPanel />
        </div>
      ) : null}

      {tab === "projects" ? (
        <div
          id="studio-panel-projects"
          role="tabpanel"
          aria-labelledby="studio-tab-projects"
          className="space-y-6"
        >
          <GrowthCampaignPanel
            onLaunchBlog={handleLaunchCampaignBlog}
            onLaunchVideo={handleLaunchCampaignVideo}
          />
          <CreatorContentGaps onWriteAbout={handleWriteAbout} />
          <MarketingProjectsPanel
            highlightSlug={highlightSlug}
            onPromosReady={clearHighlight}
            onTagVideo={handleTagVideo}
          />
        </div>
      ) : null}

      <div
        id="studio-panel-video"
        role="tabpanel"
        aria-labelledby="studio-tab-video"
        hidden={tab !== "video"}
        className={tab !== "video" ? "hidden" : undefined}
      >
        <VideoWizard
          scriptPreset={videoScriptPreset}
          onScriptPresetConsumed={() => setVideoScriptPreset("standard")}
          seedPostId={seedVideoPostId}
          onSeedPostConsumed={() => setSeedVideoPostId(null)}
        />
      </div>

      {tab === "live" ? (
        <div
          id="studio-panel-live"
          role="tabpanel"
          aria-labelledby="studio-tab-live"
        >
          <LiveClipsPanel />
        </div>
      ) : null}

      {tab === "blog" ? (
        <div
          id="studio-panel-blog"
          role="tabpanel"
          aria-labelledby="studio-tab-blog"
        >
          <BlogWizard
            onPublished={handlePublished}
            seedNotes={seedNotes}
            initialArticleType={articleType}
          />
        </div>
      ) : null}

      {tab === "social" ? (
        <div
          id="studio-panel-social"
          role="tabpanel"
          aria-labelledby="studio-tab-social"
        >
          <SocialKitPanel />
        </div>
      ) : null}

      {tab === "sponsors" ? (
        <div
          id="studio-panel-sponsors"
          role="tabpanel"
          aria-labelledby="studio-tab-sponsors"
        >
          <SponsorsPanel />
        </div>
      ) : null}

      {tab === "audience" ? (
        <div
          id="studio-panel-audience"
          role="tabpanel"
          aria-labelledby="studio-tab-audience"
        >
          <AudiencePanel />
        </div>
      ) : null}
    </div>
  );
}
