"use client";

import { useState } from "react";
import Link from "next/link";
import { postSessionToEngineRoom } from "@/lib/engine-room/post-session";
import {
  RANK_BAND_LABEL,
  type PersonalLiftRank,
} from "@/lib/engine-room/ranks";

const primaryBtn =
  "inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

export default function PostSessionRanks({
  sessionId,
  onDone,
}: {
  sessionId: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranks, setRanks] = useState<PersonalLiftRank[] | null>(null);
  const [streakCount, setStreakCount] = useState<number | null>(null);

  async function postSession() {
    setPending(true);
    setError(null);
    const result = await postSessionToEngineRoom({ sessionId });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not post this session.");
      return;
    }
    setRanks(result.ranks ?? []);
    setStreakCount(result.streakCount ?? null);
  }

  if (ranks) {
    return (
      <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
          Ranks locked
        </p>
        <h2 className="mt-2 font-display text-2xl text-brand-ink">
          {streakCount && streakCount > 0
            ? `${streakCount}-day streak`
            : "Session posted"}
        </h2>
        {ranks.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-brand-muted">
            Session is on the feed. Log bodyweight to rank loaded lifts next
            time.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {ranks.map((rank) => (
              <li key={rank.exerciseId} className="font-sans text-sm text-brand-ink">
                <span className="font-semibold text-brand-orange">
                  {rank.band ? RANK_BAND_LABEL[rank.band] : "Unranked"}
                </span>
                {" · "}
                {rank.exerciseName}: {rank.detail}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/app/engine-room" className={primaryBtn}>
            Open Engine Room
          </Link>
          <button type="button" className={secondaryBtn} onClick={onDone}>
            Continue
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
        Lock it in
      </p>
      <h2 className="mt-2 font-display text-2xl text-brand-ink">
        Post this session to lock ranks
      </h2>
      <p className="mt-2 font-sans text-sm text-brand-muted">
        The log is saved. Ranks, streak, and weekly quests count when you post
        it to The Engine Room.
      </p>
      {error ? (
        <p className="mt-3 font-sans text-sm text-red-700">
          {error}{" "}
          {error.toLowerCase().includes("username") ? (
            <Link href="/app/engine-room" className="font-semibold text-brand-orange">
              Set a username
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={pending}
          onClick={() => void postSession()}
        >
          {pending ? "Posting…" : "Post this session to lock ranks"}
        </button>
        <button type="button" className={secondaryBtn} onClick={onDone}>
          Skip for now
        </button>
      </div>
    </section>
  );
}
