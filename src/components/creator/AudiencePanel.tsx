"use client";

import { useCallback, useEffect, useState } from "react";
import type { AudienceMetrics } from "@/lib/creator/audience";

export default function AudiencePanel() {
  const [metrics, setMetrics] = useState<AudienceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/creator/audience");
        const json = (await res.json()) as {
          ok?: boolean;
          metrics?: AudienceMetrics;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok || !json.metrics) {
          setError(json.error ?? "Could not load audience metrics.");
          setMetrics(null);
          return;
        }
        setMetrics(json.metrics);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Could not load audience metrics.");
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copySummary = useCallback(async () => {
    if (!metrics?.pitchSummary) return;
    try {
      await navigator.clipboard.writeText(metrics.pitchSummary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [metrics?.pitchSummary]);

  if (loading) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <p className="font-sans text-sm text-brand-muted">
          Loading local audience density…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h2 className="font-display text-xl text-brand-ink">Local audience</h2>
        <p className="mt-2 font-sans text-sm text-brand-muted">{error}</p>
      </section>
    );
  }

  if (!metrics) {
    return null;
  }

  const emptyGeo = metrics.registeredWithZip === 0;
  const emptyActivity =
    metrics.activeUsers28d === 0 &&
    metrics.workoutsLogged28d === 0 &&
    metrics.groceryListsCreated28d === 0;

  return (
    <div className="space-y-6">
      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-brand-ink">
              Local Ads · Audience density
            </h2>
            <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
              Real aggregates for gym / grocery sponsorship pitches. No member
              emails. Window: last {metrics.windowDays} days (since{" "}
              {new Date(metrics.since).toLocaleDateString()}).
            </p>
          </div>
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex min-h-11 shrink-0 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
          >
            {copied ? "Copied" : "Copy pitch summary"}
          </button>
        </div>

        <p className="mt-4 border border-brand-ink/10 bg-surface px-3 py-3 font-sans text-xs leading-relaxed text-brand-muted">
          {metrics.activeDefinition}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Registered w/ ZIP"
            value={metrics.registeredWithZip}
            hint={`of ${metrics.registeredTotal} total`}
          />
          <Stat
            label="Active (28d)"
            value={metrics.activeUsers28d}
            hint={`${metrics.activeUsersWithZip28d} with ZIP`}
          />
          <Stat
            label="Referred signups"
            value={metrics.referredTotal}
            hint={`${metrics.referredWithZip} with ZIP`}
          />
          <Stat
            label="Grocery lists"
            value={metrics.groceryListsCreated28d}
            hint={`${metrics.groceryListsShareable28d} shareable`}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Workouts logged"
            value={metrics.workoutsLogged28d}
            hint="sessions started"
          />
          <Stat
            label="Active in 70501–70508"
            value={metrics.lafayetteCoreActive28d}
            hint="Lafayette core"
          />
          <Stat
            label="Active in Acadiana focus"
            value={metrics.acadianaFocusActive28d}
            hint="Extended Lafayette-area ZIPs"
          />
        </div>

        {(emptyGeo || emptyActivity) && (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            {emptyGeo
              ? "No members have a ZIP on file yet — counts stay at zero until Phase 0a geo is collected."
              : "No workout or meal-plan activity in the last 28 days yet."}
          </p>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h3 className="font-display text-lg text-brand-ink">Pitch summary</h3>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border border-brand-ink/10 bg-surface px-3 py-3 font-sans text-sm leading-relaxed text-brand-ink">
          {metrics.pitchSummary}
        </pre>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h3 className="font-display text-lg text-brand-ink">By ZIP</h3>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Focus ZIPs (Acadiana / Lafayette) sort first. Aggregates only.
        </p>
        {metrics.byZip.length === 0 ? (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            No ZIP breakdown yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-brand-ink/15 text-xs font-bold uppercase tracking-[0.08em] text-brand-muted">
                  <th className="py-2 pr-3 font-bold">ZIP</th>
                  <th className="py-2 pr-3 font-bold">City</th>
                  <th className="py-2 pr-3 font-bold">Registered</th>
                  <th className="py-2 pr-3 font-bold">Active 28d</th>
                  <th className="py-2 font-bold">Referred</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byZip.map((row) => (
                  <tr
                    key={row.zipCode}
                    className="border-b border-brand-ink/10 text-brand-ink"
                  >
                    <td className="py-2.5 pr-3 font-semibold">
                      {row.zipCode}
                      {row.isFocus ? (
                        <span className="ml-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-orange">
                          Focus
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-brand-muted">
                      {row.city ?? "—"}
                      {row.region ? (
                        <span className="block text-xs">{row.region}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3">{row.registered}</td>
                    <td className="py-2.5 pr-3">{row.active28d}</td>
                    <td className="py-2.5">{row.referred}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <h3 className="font-display text-lg text-brand-ink">By city</h3>
        {metrics.byCity.length === 0 ? (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            No city breakdown yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-brand-ink/15 text-xs font-bold uppercase tracking-[0.08em] text-brand-muted">
                  <th className="py-2 pr-3 font-bold">City</th>
                  <th className="py-2 pr-3 font-bold">Registered</th>
                  <th className="py-2 pr-3 font-bold">Active 28d</th>
                  <th className="py-2 font-bold">Referred</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byCity.map((row) => (
                  <tr
                    key={row.city}
                    className="border-b border-brand-ink/10 text-brand-ink"
                  >
                    <td className="py-2.5 pr-3 font-semibold">{row.city}</td>
                    <td className="py-2.5 pr-3">{row.registered}</td>
                    <td className="py-2.5 pr-3">{row.active28d}</td>
                    <td className="py-2.5">{row.referred}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="border border-brand-ink/10 bg-surface px-3 py-3">
      <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-brand-ink">{value}</p>
      {hint ? (
        <p className="mt-0.5 font-sans text-xs text-brand-muted">{hint}</p>
      ) : null}
    </div>
  );
}
