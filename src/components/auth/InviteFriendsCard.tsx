"use client";

import { useMemo, useState } from "react";
import ShareEngineCard from "@/components/app/ShareEngineCard";
import {
  buildInviteUrl,
  referralBadgeForCount,
} from "@/lib/referrals/codes";

type InviteFriendsCardProps = {
  referralCode: string | null;
  referralCount: number;
};

export default function InviteFriendsCard({
  referralCode,
  referralCount,
}: InviteFriendsCardProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = useMemo(
    () => (referralCode ? buildInviteUrl(referralCode) : null),
    [referralCode],
  );
  const badge = referralBadgeForCount(referralCount);

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

  return (
    <div className="mt-8 space-y-4">
      <ShareEngineCard />

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <p className="eyebrow text-brand-orange">Your invite code</p>
        <h2 className="mt-2 font-display text-xl text-brand-ink">
          Grow the local crew
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
          Friends who join through this code count toward your crew and any live
          swag contest. Soft shoutout on this profile. No paid credits.
        </p>

        {badge ? (
          <div className="mt-4 border border-brand-orange/30 bg-brand-orange/5 px-3 py-3">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
              {badge.label}
            </p>
            <p className="mt-1 font-sans text-sm text-brand-ink">
              Brought {referralCount} friend{referralCount === 1 ? "" : "s"} ·{" "}
              {badge.description}
            </p>
          </div>
        ) : (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            Brought 0 friends so far. Be the first spark in your ZIP.
          </p>
        )}

        {referralCode ? (
          <div className="mt-4 space-y-2">
            <p className="font-display text-2xl tracking-wide text-brand-ink">
              {referralCode}
            </p>
            <p className="break-all font-sans text-xs text-brand-muted">
              {inviteUrl}
            </p>
            <button
              type="button"
              onClick={() => void copyInvite()}
              className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
            >
              {copied ? "Invite link copied" : "Copy invite link"}
            </button>
          </div>
        ) : (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            Your invite code is still generating. Refresh in a moment.
          </p>
        )}
      </section>
    </div>
  );
}
