"use client";

import ShareEngineCard from "@/components/app/ShareEngineCard";

type InviteFriendsPromptProps = {
  /** Where this prompt appears. Drives copy only. */
  variant: "post_workout" | "nutrition";
  /** When false, hide (e.g. until workout finishes). */
  visible?: boolean;
  onDismiss?: () => void;
};

/**
 * Post-workout / nutrition invite: Share the Engine pack instead of copy-link only.
 */
export default function InviteFriendsPrompt({
  visible = true,
  onDismiss,
}: InviteFriendsPromptProps) {
  if (!visible) return null;

  return (
    <div className="space-y-3 print:hidden">
      {onDismiss ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted hover:text-brand-ink"
            aria-label="Dismiss invite prompt"
          >
            Not now
          </button>
        </div>
      ) : null}
      <ShareEngineCard compact />
    </div>
  );
}
