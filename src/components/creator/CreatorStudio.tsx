"use client";

import { useState } from "react";
import type {
  ChronicleDraft,
  VideoRecommendation,
} from "@/lib/chronicles/drafts";
import AiDirector from "@/components/creator/AiDirector";
import VideoCanvas from "@/components/creator/VideoCanvas";

type CreatorStudioProps = {
  drafts: ChronicleDraft[];
  recommendations: VideoRecommendation[];
  creatorLabel: string;
  role: string;
};

export default function CreatorStudio({
  drafts,
  recommendations,
  creatorLabel,
  role,
}: CreatorStudioProps) {
  const [caption, setCaption] = useState("");
  const [activeRecTitle, setActiveRecTitle] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-10 pt-4 sm:space-y-8 sm:pt-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">Creator studio backdoor</p>
        <h1 className="font-display text-[clamp(1.85rem,6vw,2.75rem)] leading-[1.05] text-brand-ink">
          Direct the next Sweatlife clip
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Signed in as{" "}
          <span className="font-semibold text-brand-ink">{creatorLabel}</span>{" "}
          · {role} access. Draft-aware recommendations on the left energy,
          phone-first canvas below for capture and captions.
        </p>
      </header>

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
  );
}
