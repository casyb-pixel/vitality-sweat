"use client";

import { useEffect, useRef, useState } from "react";
import type { ServedCreative } from "@/lib/sponsors/serve";
import {
  getSlotDefinition,
  type SponsorSlotSize,
} from "@/lib/sponsors/slots";
import { readRememberedCampaignAttribution } from "@/lib/marketing/campaign-attribution";
import { normalizeMarketParam } from "@/lib/markets/metros";

type AdSlotProps = {
  slotId: string;
  label?: string;
  size?: SponsorSlotSize;
  className?: string;
};

const SIZE_CLASS: Record<SponsorSlotSize, string> = {
  banner: "min-h-[90px] max-w-[728px]",
  rectangle: "min-h-[250px] max-w-[300px]",
  leaderboard: "min-h-[90px] w-full max-w-[970px]",
};

const SESSION_KEY = "vs_ad_session";

function getSessionHash(): string {
  try {
    let hash = window.sessionStorage.getItem(SESSION_KEY);
    if (!hash) {
      hash = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      window.sessionStorage.setItem(SESSION_KEY, hash);
    }
    return hash;
  } catch {
    return "anon";
  }
}

function resolveEventMarket(): string | null {
  try {
    const fromUrl = normalizeMarketParam(
      new URLSearchParams(window.location.search).get("market"),
    );
    if (fromUrl) return fromUrl;
    const remembered = readRememberedCampaignAttribution();
    return normalizeMarketParam(remembered?.market ?? null);
  } catch {
    return null;
  }
}

/**
 * Direct-sold local sponsorship renderer.
 * Fetches live creative (paid preferred, house CTA fallback) and logs
 * privacy-safe impressions/clicks. Placeholder when nothing is live.
 */
export default function AdSlot({
  slotId,
  label = "Local partner",
  size,
  className = "",
}: AdSlotProps) {
  const def = getSlotDefinition(slotId);
  const resolvedSize = size ?? def?.size ?? "banner";
  const [creative, setCreative] = useState<ServedCreative | null>(null);
  const [loaded, setLoaded] = useState(false);
  const impressed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ads/serve?slot=${encodeURIComponent(slotId)}`,
        );
        const json = (await res.json()) as {
          ok?: boolean;
          creative?: ServedCreative | null;
        };
        if (cancelled) return;
        setCreative(json.creative ?? null);
      } catch {
        if (!cancelled) setCreative(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  useEffect(() => {
    if (!creative || impressed.current) return;
    impressed.current = true;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creativeId: creative.creativeId,
        campaignId: creative.campaignId,
        slotId,
        eventType: "impression",
        pagePath:
          typeof window !== "undefined" ? window.location.pathname : undefined,
        sessionHash: getSessionHash(),
        market: resolveEventMarket(),
      }),
    }).catch(() => {
      // non-blocking
    });
  }, [creative, slotId]);

  async function onClick() {
    if (!creative) return;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creativeId: creative.creativeId,
        campaignId: creative.campaignId,
        slotId,
        eventType: "click",
        pagePath: window.location.pathname,
        sessionHash: getSessionHash(),
        market: resolveEventMarket(),
      }),
    }).catch(() => {
      // non-blocking
    });
  }

  return (
    <aside
      aria-label={label}
      data-ad-slot={slotId}
      data-ad-inventory={creative?.inventorySlotId}
      data-ad-house={creative?.isHouse ? "1" : "0"}
      className={`mx-auto w-full ${SIZE_CLASS[resolvedSize]} ${className}`}
    >
      {!loaded ? (
        <div className="flex h-full min-h-[inherit] w-full items-center justify-center border border-dashed border-brand-muted/25 bg-surface-elevated/50 px-4 py-6">
          <p className="font-sans text-xs text-brand-muted">Loading placement…</p>
        </div>
      ) : creative ? (
        <a
          href={creative.clickUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => void onClick()}
          className="block h-full min-h-[inherit] w-full border border-brand-ink/10 bg-surface-elevated px-4 py-4 transition-colors hover:border-brand-orange/40"
        >
          <p className="eyebrow mb-2 text-[0.65rem] text-brand-muted/80">
            {creative.isHouse ? "Vitality Engine" : `Sponsored · ${creative.sponsorName}`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {creative.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creative.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-snug text-brand-ink">
                {creative.headline}
              </p>
              {creative.body ? (
                <p className="mt-1 font-sans text-sm leading-relaxed text-brand-muted">
                  {creative.body}
                </p>
              ) : null}
              <span className="mt-3 inline-flex font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                {creative.ctaLabel} →
              </span>
            </div>
          </div>
        </a>
      ) : (
        <div className="flex h-full min-h-[inherit] w-full flex-col items-center justify-center border border-dashed border-brand-muted/35 bg-surface-elevated/70 px-4 py-6 text-center">
          <p className="eyebrow mb-2 text-[0.7rem] text-brand-muted/80">
            {label}
          </p>
          <p className="max-w-xs font-sans text-sm text-brand-muted">
            Local sponsorship slot{" "}
            <span className="font-semibold text-brand-ink/70">{slotId}</span>
            {" - "}available for Red&apos;s, Rouses, and SWLA partners.
          </p>
        </div>
      )}
    </aside>
  );
}
