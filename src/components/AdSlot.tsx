"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import HousePromoCard from "@/components/HousePromoCard";
import type { ServedCreative } from "@/lib/sponsors/serve";
import {
  housePromoHref,
  isMemberAppPath,
  pickHousePromo,
} from "@/lib/sponsors/house-promos";
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

function isPaidCreative(creative: ServedCreative | null): creative is ServedCreative {
  return Boolean(creative && !creative.isHouse);
}

/**
 * Direct-sold local sponsorship renderer.
 * Paid flights win when live. Unsold inventory is an Engine Room or Fuel house promo.
 */
export default function AdSlot({
  slotId,
  label,
  size,
  className = "",
}: AdSlotProps) {
  const def = getSlotDefinition(slotId);
  const resolvedSize = size ?? def?.size ?? "banner";
  const pathname = usePathname();
  const promo = pickHousePromo(slotId);
  const [creative, setCreative] = useState<ServedCreative | null>(null);
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  const paid = isPaidCreative(creative) ? creative : null;

  useEffect(() => {
    if (!paid || impressed.current) return;
    impressed.current = true;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creativeId: paid.creativeId,
        campaignId: paid.campaignId,
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
  }, [paid, slotId]);

  async function onClick() {
    if (!paid) return;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creativeId: paid.creativeId,
        campaignId: paid.campaignId,
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

  const ariaLabel = paid
    ? (label ?? `Sponsored · ${paid.sponsorName}`)
    : (label ?? promo.eyebrow);

  if (!paid) {
    const href = housePromoHref(promo, {
      memberApp: isMemberAppPath(pathname),
      slotId,
    });
    return (
      <aside
        aria-label={ariaLabel}
        data-ad-slot={slotId}
        data-ad-house="1"
        className={`mx-auto w-full ${className}`}
      >
        <HousePromoCard
          promo={promo}
          href={href}
          slotId={slotId}
          size={resolvedSize}
        />
      </aside>
    );
  }

  return (
    <aside
      aria-label={ariaLabel}
      data-ad-slot={slotId}
      data-ad-inventory={paid.inventorySlotId}
      data-ad-house="0"
      className={`mx-auto w-full ${SIZE_CLASS[resolvedSize]} ${className}`}
    >
      <a
        href={paid.clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => void onClick()}
        className="block h-full min-h-[inherit] w-full border border-brand-ink/10 bg-surface-elevated px-4 py-4 transition-colors hover:border-brand-orange/40"
      >
        <p className="eyebrow mb-2 text-[0.65rem] text-brand-muted/80">
          Sponsored · {paid.sponsorName}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {paid.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={paid.imageUrl}
              alt=""
              className="h-16 w-16 shrink-0 object-contain"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-snug text-brand-ink">
              {paid.headline}
            </p>
            {paid.body ? (
              <p className="mt-1 font-sans text-sm leading-relaxed text-brand-muted">
                {paid.body}
              </p>
            ) : null}
            <span className="mt-3 inline-flex font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
              {paid.ctaLabel} →
            </span>
          </div>
        </div>
      </a>
    </aside>
  );
}
