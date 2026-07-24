"use client";

import { useState } from "react";
import type {
  ChronicleDraft,
  VideoRecommendation,
} from "@/lib/chronicles/drafts";
import AiDirector from "@/components/creator/AiDirector";
import BlogWizard from "@/components/creator/BlogWizard";
import VideoCanvas from "@/components/creator/VideoCanvas";

type StudioTab = "video" | "blog";

type CreatorStudioProps = {
  drafts: ChronicleDraft[];
  recommendations: VideoRecommendation[];
  creatorLabel: string;
  role: string;
};

const TABS: { id: StudioTab; label: string }[] = [
  { id: "blog", label: "Blog Wizard" },
  { id: "video", label: "Video Studio" },
];

export default function CreatorStudio({
  drafts,
  recommendations,
  creatorLabel,
  role,
}: CreatorStudioProps) {
  const [tab, setTab] = useState<StudioTab>("blog");
  const [caption, setCaption] = useState("");
  const [activeRecTitle, setActiveRecTitle] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-10 pt-4 sm:space-y-8 sm:pt-6">
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Creator studio backdoor</p>
        <h1 className="font-display text-[clamp(1.85rem,6vw,2.75rem)] leading-[1.05] text-brand-ink">
          {tab === "video"
            ? "Direct the next Sweatlife clip"
            : "Log today, publish tonight"}
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Signed in as{" "}
          <span className="font-semibold text-brand-ink">{creatorLabel}</span>{" "}
          · {role} access.
          {tab === "video"
            ? " Draft-aware recommendations on the left energy, phone-first canvas below for capture and captions."
            : " Four quick steps from gym notes to a live Chronicle — no paragraphs required."}
        </p>

        <div
          role="tablist"
          aria-label="Creator studio mode"
          className="flex gap-1 border border-brand-ink/10 bg-surface p-1 sm:inline-flex sm:max-w-md"
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
                className={`min-h-11 flex-1 px-3 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.1em] transition-colors sm:px-5 sm:text-sm ${
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

      {tab === "video" ? (
        <div
          id="studio-panel-video"
          role="tabpanel"
          aria-labelledby="studio-tab-video"
          className="space-y-6 sm:space-y-8"
        >
          <AiDirector
            drafts={drafts}
            recommendations={recommendations}
            onApplyCaption={setCaption}
            onSelectRecommendation={(rec) => setActiveRecTitle(rec.draftTitle)}
          />

          <VideoCanvas
            caption={caption}
            onCaptionChange={setCaption}
            recommendationLabel={activeRecTitle}
          />
        </div>
      ) : (
        <div
          id="studio-panel-blog"
          role="tabpanel"
          aria-labelledby="studio-tab-blog"
        >
          <BlogWizard />
        </div>
      )}
    </div>
  );
}
