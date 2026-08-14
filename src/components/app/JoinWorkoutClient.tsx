"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NestedProgramDay } from "@/components/app/WorkoutAgent";
import { rememberReferralCode } from "@/lib/referrals/codes";

const primaryBtn =
  "inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange";

type JoinWorkoutClientProps = {
  token: string;
};

export default function JoinWorkoutClient({ token }: JoinWorkoutClientProps) {
  const router = useRouter();
  const [hostName, setHostName] = useState("Teammate");
  const [hostUsername, setHostUsername] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needsReplace, setNeedsReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/app/workout/pair?token=${encodeURIComponent(token)}`,
        );
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          invite?: {
            hostName?: string;
            hostUsername?: string | null;
            hostReferralCode?: string | null;
            isHost?: boolean;
            snapshot?: { label?: string; exercises?: unknown[] };
          };
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.invite) {
          setError(json.error ?? "Invite expired or not found.");
          return;
        }
        if (json.invite.hostReferralCode) {
          rememberReferralCode(json.invite.hostReferralCode);
        }
        setHostName(json.invite.hostName ?? "Teammate");
        setHostUsername(json.invite.hostUsername ?? null);
        setLabel(json.invite.snapshot?.label ?? "this workout");
        setCount(json.invite.snapshot?.exercises?.length ?? 0);
        if (json.invite.isHost) {
          setError("That is your own invite. Show the QR to a teammate.");
        }
      } catch {
        if (!cancelled) setError("Could not load invite.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function join(replace = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app/workout/pair", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, replace }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        needs_replace?: boolean;
        day?: NestedProgramDay;
      };
      if (res.status === 409 && json.needs_replace) {
        setNeedsReplace(true);
        setError("Finish or replace your current session to join.");
        return;
      }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not join workout.");
        return;
      }
      try {
        sessionStorage.setItem("vs_paired_invite_token", token);
      } catch {
        // ignore
      }
      setJoined(true);
      if (hostUsername) {
        setFollowBusy(true);
        try {
          await fetch("/api/app/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: hostUsername }),
          });
        } catch {
          // Follow is optional.
        } finally {
          setFollowBusy(false);
        }
      }
      router.push("/app/workout");
      router.refresh();
    } catch {
      setError("Could not join workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">Train together</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Jump on {hostName}&apos;s workout
        </h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-brand-muted">
          {label || "This session"}
          {count ? ` · ${count} exercises` : ""}. Your program stays yours.
          You log your own weights and reps.
        </p>
      </header>

      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={busy || joined}
          onClick={() => void join(needsReplace)}
        >
          {busy ? "Joining…" : needsReplace ? "Replace and join" : "Join this session"}
        </button>
        <button
          type="button"
          className={secondaryBtn}
          onClick={() => router.push("/app/workout")}
        >
          Cancel
        </button>
      </div>
      {followBusy ? (
        <p className="font-sans text-xs text-brand-muted">
          Following {hostName} in The Engine Room…
        </p>
      ) : null}
    </div>
  );
}
