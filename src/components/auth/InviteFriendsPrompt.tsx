"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildInviteUrl,
  normalizeReferralCode,
} from "@/lib/referrals/codes";

type InviteFriendsPromptProps = {
  /** Where this prompt appears — drives copy only. */
  variant: "post_workout" | "nutrition";
  /** When false, hide (e.g. until workout finishes). */
  visible?: boolean;
  onDismiss?: () => void;
};

/**
 * Soft invite affordance for logged-in members (copy personal invite link).
 */
export default function InviteFriendsPrompt({
  variant,
  visible = true,
  onDismiss,
}: InviteFriendsPromptProps) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const json = (await res.json()) as {
          ok?: boolean;
          profile?: { referral_code?: string | null };
        };
        if (cancelled || !res.ok || !json.ok) return;
        setCode(normalizeReferralCode(json.profile?.referral_code ?? null));
      } catch {
        // Non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const inviteUrl = useMemo(
    () => (code ? buildInviteUrl(code) : null),
    [code],
  );

  if (!visible || hidden) return null;

  const headline =
    variant === "post_workout"
      ? "Invite a training partner"
      : "Invite friends to plan with you";
  const body =
    variant === "post_workout"
      ? "Session done — share your free invite link. When they join, you get a soft shoutout on your profile."
      : "Share your grocery list and your free invite. Soft shoutout on your profile when friends join — no paid credits.";

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function dismiss() {
    setHidden(true);
    onDismiss?.();
  }

  return (
    <aside className="border border-brand-orange/30 bg-brand-orange/5 px-4 py-4 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
            Invite friends
          </p>
          <p className="mt-1 font-display text-lg text-brand-ink">{headline}</p>
          <p className="mt-1 max-w-xl font-sans text-sm leading-relaxed text-brand-muted">
            {body}
          </p>
          {code ? (
            <p className="mt-2 font-sans text-xs text-brand-muted">
              Code{" "}
              <span className="font-semibold text-brand-ink">{code}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted hover:text-brand-ink"
          aria-label="Dismiss invite prompt"
        >
          Not now
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyInvite()}
          disabled={!inviteUrl}
          className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-50"
        >
          {copied ? "Invite link copied" : "Copy invite link"}
        </button>
        <a
          href="/profile"
          className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
        >
          Profile invites
        </a>
      </div>
    </aside>
  );
}
