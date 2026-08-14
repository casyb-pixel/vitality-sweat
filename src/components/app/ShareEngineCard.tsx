"use client";

import { useCallback, useEffect, useState } from "react";
import SharePackSheet, {
  type SharePackPayload,
} from "@/components/app/SharePackSheet";
import {
  ENGINE_PROMO_VARIANTS,
  type EnginePromoVariant,
} from "@/lib/share/engine-promo";
import type { CrewStats } from "@/lib/referrals/crew";

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

type ShareEngineCardProps = {
  autoOpen?: boolean;
  compact?: boolean;
  onDismissAuto?: () => void;
};

export default function ShareEngineCard({
  autoOpen = false,
  compact = false,
  onDismissAuto,
}: ShareEngineCardProps) {
  const [stats, setStats] = useState<CrewStats | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pack, setPack] = useState<SharePackPayload | null>(null);
  const [caption, setCaption] = useState("");
  const [variant, setVariant] = useState<EnginePromoVariant>("gym");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/app/crew");
      const json = (await res.json()) as {
        ok?: boolean;
        stats?: CrewStats;
      };
      if (res.ok && json.ok && json.stats) setStats(json.stats);
    } catch {
      // Non-blocking.
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const openPack = useCallback(
    async (nextVariant: EnginePromoVariant = variant) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/app/share/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant: nextVariant }),
        });
        const json = (await res.json()) as SharePackPayload & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Could not prepare share pack.");
          return;
        }
        setPack({
          caption: json.caption,
          shareUrl: json.shareUrl,
          card: json.card,
          image: json.image,
        });
        setCaption(json.caption);
        setSheetOpen(true);
      } catch {
        setError("Could not prepare share pack.");
      } finally {
        setBusy(false);
      }
    },
    [variant],
  );

  useEffect(() => {
    if (autoOpen) void openPack("first_week");
  }, [autoOpen, openPack]);

  async function changeVariant(next: EnginePromoVariant) {
    setVariant(next);
    if (sheetOpen) await openPack(next);
  }

  const contest = stats?.campaign;

  return (
    <section className="border border-brand-orange/30 bg-brand-orange/5 p-5 sm:p-6">
      <p className="eyebrow text-brand-orange">Share the Engine</p>
      <h2 className="mt-2 font-display text-2xl text-brand-ink">
        {compact ? "Post that you joined" : "Bring your crew in"}
      </h2>
      <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
        {compact
          ? "It is free, and your link brings your crew in. Caption and graphic are ready."
          : "One tap builds a branded graphic, a caption, and your personal invite link. Post it on Facebook, Instagram, or X."}
      </p>

      {stats ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Joined through your link" value={String(stats.joined)} />
          <Stat label="Training" value={String(stats.active)} />
          {contest ? (
            <Stat
              label={contest.prize_label}
              value={`${stats.progress} of ${contest.active_needed}`}
            />
          ) : (
            <Stat label="Live contest" value="None yet" />
          )}
        </div>
      ) : null}

      {contest ? (
        <p className="mt-3 font-sans text-sm text-brand-ink">
          {contest.name}: bring {contest.active_needed} active training
          partners
          {contest.ends_at
            ? ` by ${new Date(contest.ends_at).toLocaleDateString()}`
            : ""}
          . Unlock {contest.prize_label}.
          {stats?.qualified ? " You qualified. Hunter will ship swag." : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {ENGINE_PROMO_VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === variant ? primaryBtn : secondaryBtn}
            onClick={() => void changeVariant(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={busy}
          onClick={() => void openPack()}
        >
          {busy ? "Preparing…" : "Share the Engine"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 font-sans text-xs text-red-700">{error}</p>
      ) : null}

      <SharePackSheet
        open={sheetOpen}
        title="Share the Engine"
        eyebrow="Invite"
        pack={pack}
        caption={caption}
        onCaptionChange={setCaption}
        onClose={() => {
          setSheetOpen(false);
          onDismissAuto?.();
        }}
        filename="vitality-engine-invite.png"
        eventKind="engine_promo"
      />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-ink/10 bg-surface-elevated p-3">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-brand-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-xl text-brand-ink">{value}</p>
    </div>
  );
}
