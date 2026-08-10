"use client";

import { useCallback, useEffect, useState } from "react";
import type { AudienceMetrics } from "@/lib/creator/audience";
import type { AudienceBriefPayload } from "@/lib/markets/audience-brief";
import { METROS, type MetroId } from "@/lib/markets/metros";
import type { CampaignProofMetrics } from "@/lib/sponsors/serve";

type CampaignOption = {
  id: string;
  name: string;
  status: string;
  is_house: boolean;
  sponsors?: { name: string } | { name: string }[] | null;
};

export default function AudiencePanel() {
  const [metrics, setMetrics] = useState<AudienceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [proof, setProof] = useState<CampaignProofMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);
  const [briefMarket, setBriefMarket] = useState<MetroId | "all">("lafayette");
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

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

  const loadProof = useCallback(async (id?: string) => {
    setProofError(null);
    try {
      const qs = id ? `?campaignId=${encodeURIComponent(id)}` : "";
      const res = await fetch(`/api/creator/sponsors/proof${qs}`);
      const json = (await res.json()) as {
        ok?: boolean;
        proof?: CampaignProofMetrics | null;
        campaigns?: CampaignOption[];
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        setProofError(json.error ?? "Could not load campaign proof.");
        return;
      }
      setCampaigns(json.campaigns ?? []);
      setProof(json.proof ?? null);
      if (json.proof?.campaignId) setCampaignId(json.proof.campaignId);
      if (!json.proof && json.message) setProofError(json.message);
    } catch {
      setProofError("Could not load campaign proof.");
    }
  }, []);

  useEffect(() => {
    void loadProof();
  }, [loadProof]);

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

  const downloadBrief = useCallback(
    async (format: "md" | "json") => {
      setBriefBusy(true);
      setBriefError(null);
      try {
        const qs = new URLSearchParams({
          market: briefMarket,
          format,
        });
        const res = await fetch(`/api/creator/audience/brief?${qs}`);
        if (format === "md") {
          if (!res.ok) {
            const json = (await res.json().catch(() => null)) as {
              error?: string;
            } | null;
            setBriefError(json?.error ?? "Could not export brief.");
            return;
          }
          const text = await res.text();
          const blob = new Blob([text], {
            type: "text/markdown;charset=utf-8",
          });
          triggerDownload(blob, `audience-brief-${briefMarket}.md`);
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          brief?: AudienceBriefPayload;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.brief) {
          setBriefError(json.error ?? "Could not export brief.");
          return;
        }
        const blob = new Blob([JSON.stringify(json.brief, null, 2)], {
          type: "application/json;charset=utf-8",
        });
        triggerDownload(blob, `audience-brief-${briefMarket}.json`);
      } catch {
        setBriefError("Could not export brief.");
      } finally {
        setBriefBusy(false);
      }
    },
    [briefMarket],
  );

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
              Audience Brief
            </h2>
            <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
              Sales one-pager export: actives by metro, engagement, top slots,
              rate-card packages. Markdown or JSON. No member PII.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="min-h-11 border border-brand-ink/15 bg-surface px-3 py-2 font-sans text-sm"
              value={briefMarket}
              onChange={(e) =>
                setBriefMarket(e.target.value as MetroId | "all")
              }
            >
              <option value="lafayette">Lafayette focus</option>
              {METROS.filter((m) => m.id !== "lafayette").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortLabel}
                </option>
              ))}
              <option value="all">All metros</option>
            </select>
            <button
              type="button"
              disabled={briefBusy}
              onClick={() => void downloadBrief("md")}
              className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-50"
            >
              Download MD
            </button>
            <button
              type="button"
              disabled={briefBusy}
              onClick={() => void downloadBrief("json")}
              className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-50"
            >
              Download JSON
            </button>
          </div>
        </div>
        {briefError ? (
          <p className="mt-3 font-sans text-sm text-red-700">{briefError}</p>
        ) : null}
        <p className="mt-3 font-sans text-xs text-brand-muted">
          Public rate card:{" "}
          <a href="/advertise" className="text-brand-orange hover:underline">
            /advertise
          </a>
        </p>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-brand-ink">
              Deliverable proof
            </h2>
            <p className="mt-1 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
              Impressions and clicks for a sponsorship flight (privacy-safe, no
              member emails). Includes local actives in target ZIPs when set.
            </p>
          </div>
          <select
            className="min-h-11 border border-brand-ink/15 bg-surface px-3 py-2 font-sans text-sm"
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              void loadProof(e.target.value);
            }}
          >
            <option value="">Select campaign…</option>
            {campaigns.map((c) => {
              const sponsorRel = c.sponsors;
              const sponsorName = Array.isArray(sponsorRel)
                ? sponsorRel[0]?.name
                : sponsorRel?.name;
              return (
                <option key={c.id} value={c.id}>
                  {sponsorName ? `${sponsorName} · ` : ""}
                  {c.name}
                  {c.is_house ? " (house)" : ""} · {c.status}
                </option>
              );
            })}
          </select>
        </div>
        {proofError ? (
          <p className="mt-3 font-sans text-sm text-brand-muted">{proofError}</p>
        ) : null}
        {proof ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Impressions" value={proof.impressions} />
              <Stat label="Clicks" value={proof.clicks} />
              <Stat
                label="CTR"
                value={Number((proof.ctr * 100).toFixed(2))}
                hint="percent"
              />
              <Stat
                label="Local actives in ZIPs"
                value={proof.localActivesInTargetZips ?? 0}
                hint={
                  proof.targetZips.length
                    ? proof.targetZips.join(", ")
                    : "no ZIP targeting"
                }
              />
            </div>
            <p className="font-sans text-xs text-brand-muted">
              {proof.sponsorName} · {proof.campaignName} · {proof.status}
              {proof.localActivesDefinition
                ? ` · ${proof.localActivesDefinition}`
                : ""}
            </p>
            {proof.bySlot.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-left font-sans text-sm">
                  <thead>
                    <tr className="border-b border-brand-ink/15 text-xs font-bold uppercase tracking-[0.08em] text-brand-muted">
                      <th className="py-2 pr-3">Slot</th>
                      <th className="py-2 pr-3">Impressions</th>
                      <th className="py-2">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proof.bySlot.map((row) => (
                      <tr
                        key={row.slotId}
                        className="border-b border-brand-ink/10"
                      >
                        <td className="py-2 pr-3 font-semibold text-brand-ink">
                          {row.slotId}
                        </td>
                        <td className="py-2 pr-3">{row.impressions}</td>
                        <td className="py-2">{row.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-sans text-sm text-brand-muted">
                No impressions yet. Open home, chronicles, a blog post, or a
                grocery share page to generate proof.
              </p>
            )}
          </div>
        ) : null}
      </section>

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
        <h3 className="font-display text-lg text-brand-ink">By metro</h3>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          ZIP → metro playbook groupings (Lafayette, Lake Charles, New Iberia,
          …).
        </p>
        {(metrics.byMetro ?? []).length === 0 ? (
          <p className="mt-4 font-sans text-sm text-brand-muted">
            No metro breakdown yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-brand-ink/15 text-xs font-bold uppercase tracking-[0.08em] text-brand-muted">
                  <th className="py-2 pr-3 font-bold">Metro</th>
                  <th className="py-2 pr-3 font-bold">Registered</th>
                  <th className="py-2 pr-3 font-bold">Active 28d</th>
                  <th className="py-2 font-bold">Referred</th>
                </tr>
              </thead>
              <tbody>
                {metrics.byMetro.map((row) => (
                  <tr
                    key={row.metroId}
                    className="border-b border-brand-ink/10 text-brand-ink"
                  >
                    <td className="py-2.5 pr-3 font-semibold">{row.label}</td>
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
