"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveReferralCampaign, PromoterRow } from "@/lib/referrals/crew";

type RewardRow = {
  id: string;
  campaign_id: string;
  promoter_id: string;
  active_count_at_award: number;
  status: string;
  prize_label: string | null;
  shipping_notes: string | null;
  created_at: string;
  promoter: {
    display_name: string | null;
    username: string | null;
    email: string | null;
  } | null;
};

const btn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const ghost =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

export default function CrewBoardClient() {
  const [campaign, setCampaign] = useState<LiveReferralCampaign | null>(null);
  const [leaderboard, setLeaderboard] = useState<PromoterRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [reports, setReports] = useState<
    { id: string; post_id: string; reason: string; created_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("Engine crew push");
  const [prize, setPrize] = useState("hoodie or pump cover");
  const [needed, setNeeded] = useState("5");
  const [endsAt, setEndsAt] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/creator/crew");
    const json = (await res.json()) as {
      ok?: boolean;
      campaign?: LiveReferralCampaign | null;
      leaderboard?: PromoterRow[];
      rewards?: RewardRow[];
      reports?: { id: string; post_id: string; reason: string; created_at: string }[];
      error?: string;
    };
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not load crew board.");
      return;
    }
    setCampaign(json.campaign ?? null);
    setLeaderboard(json.leaderboard ?? []);
    setRewards(json.rewards ?? []);
    setReports(json.reports ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCampaign() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          prize_label: prize,
          active_needed: Number(needed),
          ends_at: endsAt || null,
          end_current: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not start contest.");
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  async function patchReward(
    rewardId: string,
    patch: { status?: string; shipping_notes?: string },
  ) {
    setPending(true);
    try {
      const res = await fetch("/api/creator/crew", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: rewardId, ...patch }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not update reward.");
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <p className="eyebrow text-brand-orange">Live contest</p>
        {campaign ? (
          <div className="mt-2 space-y-1">
            <h2 className="font-display text-2xl text-brand-ink">
              {campaign.name}
            </h2>
            <p className="font-sans text-sm text-brand-muted">
              {campaign.active_needed} active joins unlock {campaign.prize_label}
              {campaign.ends_at
                ? `. Ends ${new Date(campaign.ends_at).toLocaleDateString()}.`
                : "."}
            </p>
          </div>
        ) : (
          <p className="mt-2 font-sans text-sm text-brand-muted">
            No live contest. Start one below.
          </p>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <h2 className="font-display text-xl text-brand-ink">Promoters</h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Active means they started a workout or built a meal plan. Empty
          signups do not count.
        </p>
        {leaderboard.length === 0 ? (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            No referred signups in this window yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-ink/10">
            {leaderboard.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-sans text-sm font-semibold text-brand-ink">
                    {row.display_name || row.username || row.id.slice(0, 8)}
                  </p>
                  {row.username ? (
                    <p className="font-sans text-xs text-brand-muted">
                      @{row.username}
                    </p>
                  ) : null}
                </div>
                <p className="font-sans text-sm text-brand-ink">
                  {row.active} active · {row.joined} joined
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <h2 className="font-display text-xl text-brand-ink">Fulfillment</h2>
        {rewards.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-brand-muted">
            No pending swag yet. Qualifiers show here when they hit the
            threshold.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rewards.map((row) => (
              <li key={row.id} className="border border-brand-ink/10 p-3">
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {row.promoter?.display_name ||
                    row.promoter?.username ||
                    row.promoter_id.slice(0, 8)}
                </p>
                <p className="font-sans text-xs text-brand-muted">
                  {row.prize_label ?? "swag"} · {row.active_count_at_award}{" "}
                  active · {row.status}
                  {row.promoter?.email ? ` · ${row.promoter.email}` : ""}
                </p>
                <textarea
                  defaultValue={row.shipping_notes ?? ""}
                  placeholder="Size, address, notes"
                  rows={2}
                  className="mt-2 w-full border border-brand-ink/15 px-2 py-1.5 font-sans text-sm"
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value !== (row.shipping_notes ?? "")) {
                      void patchReward(row.id, { shipping_notes: value });
                    }
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.status !== "shipped" ? (
                    <button
                      type="button"
                      className={btn}
                      disabled={pending}
                      onClick={() =>
                        void patchReward(row.id, { status: "shipped" })
                      }
                    >
                      Mark shipped
                    </button>
                  ) : null}
                  {row.status !== "void" ? (
                    <button
                      type="button"
                      className={ghost}
                      disabled={pending}
                      onClick={() =>
                        void patchReward(row.id, { status: "void" })
                      }
                    >
                      Void
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <h2 className="font-display text-xl text-brand-ink">Engine Room reports</h2>
        {reports.length === 0 ? (
          <p className="mt-2 font-sans text-sm text-brand-muted">
            No reports yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.map((row) => (
              <li key={row.id} className="font-sans text-sm text-brand-ink">
                {row.reason} · post {row.post_id.slice(0, 8)} ·{" "}
                {new Date(row.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <h2 className="font-display text-xl text-brand-ink">Start a contest</h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Ends the current live contest, then opens a new one.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="font-sans text-sm font-semibold text-brand-ink">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
            />
          </label>
          <label className="font-sans text-sm font-semibold text-brand-ink">
            Prize
            <input
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
            />
          </label>
          <label className="font-sans text-sm font-semibold text-brand-ink">
            Active joins needed
            <input
              value={needed}
              onChange={(e) => setNeeded(e.target.value)}
              type="number"
              min={1}
              className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
            />
          </label>
          <label className="font-sans text-sm font-semibold text-brand-ink">
            End date (optional)
            <input
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              type="datetime-local"
              className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          className={`${btn} mt-4`}
          disabled={pending}
          onClick={() => void createCampaign()}
        >
          {pending ? "Saving…" : "Start contest"}
        </button>
      </section>
    </div>
  );
}
