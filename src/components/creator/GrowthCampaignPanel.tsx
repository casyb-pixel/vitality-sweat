"use client";

import { useMemo, useState } from "react";
import {
  campaignCtaAbsoluteUrl,
  GROWTH_CAMPAIGN_TEMPLATES,
  buildGymInvitePath,
  type GrowthCampaignTemplate,
  type GrowthCampaignTemplateId,
} from "@/lib/marketing/campaign-templates";
import { absoluteUrl } from "@/lib/seo/site";

type GrowthCampaignPanelProps = {
  onLaunchBlog: (input: {
    templateId: GrowthCampaignTemplateId;
    outline: string;
  }) => void;
  onLaunchVideo: (input: {
    templateId: GrowthCampaignTemplateId;
  }) => void;
};

export default function GrowthCampaignPanel({
  onLaunchBlog,
  onLaunchVideo,
}: GrowthCampaignPanelProps) {
  const [expandedId, setExpandedId] = useState<GrowthCampaignTemplateId | null>(
    "weekly_challenge",
  );
  const [gymSlug, setGymSlug] = useState("reds");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const expanded = useMemo(
    () => GROWTH_CAMPAIGN_TEMPLATES.find((t) => t.id === expandedId) ?? null,
    [expandedId],
  );

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  }

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-brand-orange">90-day beachhead</p>
          <h2 className="mt-1 font-display text-xl text-brand-ink">
            Growth Campaign
          </h2>
          <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
            Templates for weekly challenges, gym QR blurbs, and grocery-list
            contests. Launching Blog or Video always keeps Phase 0d growth
            packaging (Engine CTA + AdSlot / promo pack).
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {GROWTH_CAMPAIGN_TEMPLATES.map((template) => {
          const selected = template.id === expandedId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setExpandedId(template.id)}
              className={`min-h-11 border px-3 py-3 text-left transition-colors ${
                selected
                  ? "border-brand-orange bg-brand-orange/5"
                  : "border-brand-ink/10 bg-surface hover:border-brand-orange/50"
              }`}
            >
              <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                {template.cadenceHint.split(" ")[0]}
              </p>
              <p className="mt-1 font-display text-base text-brand-ink">
                {template.title}
              </p>
            </button>
          );
        })}
      </div>

      {expanded ? (
        <TemplateDetail
          template={expanded}
          gymSlug={gymSlug}
          onGymSlugChange={setGymSlug}
          copiedKey={copiedKey}
          onCopy={copyText}
          onLaunchBlog={() =>
            onLaunchBlog({
              templateId: expanded.id,
              outline: expanded.chroniclesOutline,
            })
          }
          onLaunchVideo={() => onLaunchVideo({ templateId: expanded.id })}
        />
      ) : null}
    </section>
  );
}

function TemplateDetail({
  template,
  gymSlug,
  onGymSlugChange,
  copiedKey,
  onCopy,
  onLaunchBlog,
  onLaunchVideo,
}: {
  template: GrowthCampaignTemplate;
  gymSlug: string;
  onGymSlugChange: (value: string) => void;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onLaunchBlog: () => void;
  onLaunchVideo: () => void;
}) {
  const isGym = template.id === "gym_qr";
  const ctaUrl = campaignCtaAbsoluteUrl(
    template,
    isGym ? { gym: gymSlug.trim() || "reds", src: "gym" } : undefined,
  );
  const invitePath = buildGymInvitePath(gymSlug.trim() || "reds");
  const inviteAbsolute = absoluteUrl(invitePath);

  return (
    <div className="mt-5 space-y-5 border border-brand-ink/10 bg-surface px-4 py-4">
      <div>
        <h3 className="font-display text-lg text-brand-ink">{template.title}</h3>
        <p className="mt-1 font-sans text-sm text-brand-muted">{template.blurb}</p>
        <p className="mt-1 font-sans text-xs text-brand-muted">
          {template.cadenceHint}
        </p>
      </div>

      {isGym ? (
        <label className="block font-sans text-sm text-brand-ink">
          <span className="font-semibold">Gym slug for QR / UTM</span>
          <input
            value={gymSlug}
            onChange={(e) => onGymSlugChange(e.target.value)}
            placeholder="reds"
            className="mt-1.5 w-full max-w-xs border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm outline-none focus:border-brand-orange"
          />
          <span className="mt-1 block text-xs text-brand-muted">
            Landing: {inviteAbsolute}
          </span>
        </label>
      ) : null}

      <div>
        <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
          Chronicles draft outline
        </p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap border border-brand-ink/10 bg-surface-elevated px-3 py-3 font-sans text-xs leading-relaxed text-brand-ink">
          {template.chroniclesOutline}
        </pre>
        <button
          type="button"
          onClick={() => onCopy("outline", template.chroniclesOutline)}
          className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:underline"
        >
          {copiedKey === "outline" ? "Copied" : "Copy outline"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
            ["x", "X"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="border border-brand-ink/10 bg-surface-elevated p-3">
            <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
              {label}
            </p>
            <p className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-brand-ink">
              {template.socialCaptions[key]}
            </p>
            <button
              type="button"
              onClick={() => onCopy(key, template.socialCaptions[key])}
              className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:underline"
            >
              {copiedKey === key ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>

      <div className="border border-brand-orange/30 bg-brand-orange/5 px-3 py-3">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
          In-app CTA (UTM / src)
        </p>
        <p className="mt-1 break-all font-sans text-xs text-brand-ink">{ctaUrl}</p>
        {isGym ? (
          <p className="mt-2 break-all font-sans text-xs text-brand-muted">
            Print QR → {inviteAbsolute}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onCopy("cta", isGym ? inviteAbsolute : ctaUrl)}
          className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange hover:underline"
        >
          {copiedKey === "cta" ? "Copied" : isGym ? "Copy invite URL" : "Copy CTA"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {template.launchBlog ? (
          <button
            type="button"
            onClick={onLaunchBlog}
            className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
          >
            Launch in Blog Wizard
          </button>
        ) : null}
        {template.launchVideo ? (
          <button
            type="button"
            onClick={onLaunchVideo}
            className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
          >
            Launch App invite video
          </button>
        ) : null}
      </div>
    </div>
  );
}
