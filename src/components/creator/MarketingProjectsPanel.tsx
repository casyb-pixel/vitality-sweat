"use client";

import { useCallback, useEffect, useState } from "react";
import {
  checklistProgress,
  MARKETING_CHECKLIST_ITEMS,
  type MarketingChecklistKey,
  type MarketingProject,
} from "@/lib/marketing/project";

const primaryBtn =
  "inline-flex min-h-11 w-full items-center justify-center bg-brand-orange px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-orange-deep disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";
const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center border-2 border-brand-ink/20 bg-surface-elevated px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-50";

type MarketingProjectsPanelProps = {
  /** After Blog Wizard publishes, jump focus + generate promos for this slug. */
  highlightSlug?: string | null;
  onPromosReady?: () => void;
};

export default function MarketingProjectsPanel({
  highlightSlug = null,
  onPromosReady,
}: MarketingProjectsPanelProps) {
  const [projects, setProjects] = useState<MarketingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [promoLoadingId, setPromoLoadingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/creator/marketing-projects");
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        projects?: MarketingProject[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not load marketing projects.");
        return;
      }
      setProjects(data.projects ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error loading projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // After publish: ensure the new project is listed and promo copy is generated.
  useEffect(() => {
    if (!highlightSlug) return;

    let cancelled = false;

    async function bootstrapPromos() {
      setPromoLoadingId("pending");
      setError(null);
      try {
        const res = await fetch("/api/creator/marketing-projects");
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          projects?: MarketingProject[];
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Could not load marketing projects.");
          return;
        }
        const list = data.projects ?? [];
        setProjects(list);
        setLoading(false);

        const match = list.find((p) => p.slug === highlightSlug);
        if (!match) return;

        if (match.generatedPromos) {
          onPromosReady?.();
          return;
        }

        setPromoLoadingId(match.id);
        const promoRes = await fetch("/api/creator/marketing-promos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: match.id, slug: match.slug }),
        });
        const promoData = (await promoRes.json()) as {
          ok: boolean;
          error?: string;
          project?: MarketingProject;
        };
        if (cancelled) return;
        if (promoRes.ok && promoData.ok && promoData.project) {
          setProjects((prev) =>
            upsertProject(prev, promoData.project as MarketingProject),
          );
          onPromosReady?.();
        } else {
          setError(promoData.error ?? "Promo copy generation failed.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Network error generating promo copy.",
          );
        }
      } finally {
        if (!cancelled) {
          setPromoLoadingId(null);
          setLoading(false);
        }
      }
    }

    void bootstrapPromos();
    return () => {
      cancelled = true;
    };
  }, [highlightSlug, onPromosReady]);

  async function toggleChecklist(
    project: MarketingProject,
    key: MarketingChecklistKey,
    done: boolean,
  ) {
    setBusyId(project.id);
    setError(null);
    try {
      const res = await fetch("/api/creator/marketing-projects/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: project.id, checklistKey: key, done }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        project?: MarketingProject;
      };
      if (!res.ok || !data.ok || !data.project) {
        setError(data.error ?? "Could not update checklist.");
        return;
      }
      setProjects((prev) => upsertProject(prev, data.project!));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error updating checklist.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function archiveProject(project: MarketingProject) {
    setBusyId(project.id);
    setError(null);
    try {
      const res = await fetch("/api/creator/marketing-projects/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: project.id, archive: true }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not archive project.");
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error archiving project.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function regeneratePromos(project: MarketingProject) {
    setPromoLoadingId(project.id);
    setError(null);
    try {
      const res = await fetch("/api/creator/marketing-promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: project.id }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        project?: MarketingProject;
      };
      if (!res.ok || !data.ok || !data.project) {
        setError(data.error ?? "Could not regenerate promo copy.");
        return;
      }
      setProjects((prev) => upsertProject(prev, data.project!));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error regenerating promo copy.",
      );
    } finally {
      setPromoLoadingId(null);
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setError("Clipboard permission blocked — long-press to copy manually.");
    }
  }

  if (loading && projects.length === 0) {
    return (
      <section className="space-y-3 border-2 border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
        <p className="eyebrow text-brand-orange">7-Day Marketing Projects</p>
        <p className="font-sans text-sm text-brand-muted">
          Loading active projects…
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="eyebrow text-brand-orange">7-Day Marketing Projects</p>
        <h2 className="font-display text-[clamp(1.45rem,4vw,1.85rem)] leading-[1.1] text-brand-ink">
          Keep the Chronicle circulating
        </h2>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
          Each published post becomes a 7-day push: 3 social captions + 3 short
          videos. Check items off as you post — archive when the loop is done.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-l-4 border-red-600 bg-red-50 px-3 py-2 font-sans text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-brand-ink/15 bg-surface p-5">
          <p className="font-sans text-sm text-brand-muted">
            No active marketing projects yet. Publish a Chronicle from the Blog
            Wizard and it will land here with swipe-ready promo copy.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {projects.map((project) => {
            const progress = checklistProgress(project);
            const dueLabel = formatDue(project.projectDueAt);
            const highlighted = highlightSlug === project.slug;
            const promoBusy =
              promoLoadingId === project.id ||
              (promoLoadingId === "pending" && highlighted);
            const rowBusy = busyId === project.id;

            return (
              <li
                key={project.id}
                className={`border-2 bg-surface-elevated p-4 sm:p-5 ${
                  highlighted
                    ? "border-brand-orange"
                    : "border-brand-ink/15"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-muted">
                      Due {dueLabel} · {progress.done}/{progress.total} done
                    </p>
                    <h3 className="font-display text-xl leading-tight text-brand-ink sm:text-2xl">
                      {project.title}
                    </h3>
                    <a
                      href={`/blog/${project.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex font-sans text-sm font-semibold text-brand-orange hover:text-brand-orange-deep"
                    >
                      Open live post →
                    </a>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-brand-ink/10 sm:mt-2 sm:max-w-[10rem]">
                    <div
                      className="h-full bg-brand-orange transition-all"
                      style={{
                        width: `${(progress.done / progress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
                      Social posts
                    </p>
                    <ChecklistGroup
                      project={project}
                      group="social"
                      disabled={rowBusy}
                      onToggle={toggleChecklist}
                    />
                    <p className="pt-2 font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
                      Video deliverables
                    </p>
                    <ChecklistGroup
                      project={project}
                      group="video"
                      disabled={rowBusy}
                      onToggle={toggleChecklist}
                    />
                  </div>

                  <div className="space-y-3 border-t border-brand-ink/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
                        Swipe copy
                      </p>
                      <button
                        type="button"
                        className={secondaryBtn}
                        disabled={promoBusy}
                        onClick={() => regeneratePromos(project)}
                      >
                        {promoBusy ? "Writing…" : "Regen"}
                      </button>
                    </div>

                    {promoBusy && !project.generatedPromos ? (
                      <div className="space-y-2 border border-brand-ink/10 bg-surface p-3">
                        <p className="font-sans text-sm text-brand-muted">
                          Gemini is drafting Facebook, Instagram, and X
                          captions…
                        </p>
                        <div className="h-1.5 w-full animate-pulse bg-brand-orange/40" />
                      </div>
                    ) : null}

                    {project.generatedPromos ? (
                      <div className="space-y-3">
                        {(
                          [
                            ["facebook", "Facebook", project.generatedPromos.facebook],
                            [
                              "instagram",
                              "Instagram",
                              project.generatedPromos.instagram,
                            ],
                            ["x", "X", project.generatedPromos.x],
                          ] as const
                        ).map(([id, label, text]) => {
                          const copyId = `${project.id}-${id}`;
                          return (
                            <div
                              key={id}
                              className="border border-brand-ink/10 bg-surface p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink">
                                  {label}
                                </p>
                                <button
                                  type="button"
                                  className={secondaryBtn}
                                  onClick={() => copyText(copyId, text)}
                                >
                                  {copiedKey === copyId ? "Copied" : "Copy"}
                                </button>
                              </div>
                              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-brand-muted">
                                {text}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : !promoBusy ? (
                      <button
                        type="button"
                        className={primaryBtn}
                        onClick={() => regeneratePromos(project)}
                      >
                        Generate swipe copy
                      </button>
                    ) : null}
                  </div>
                </div>

                {progress.complete ? (
                  <div className="mt-5 border-t border-brand-ink/10 pt-4">
                    <button
                      type="button"
                      className={primaryBtn}
                      disabled={rowBusy}
                      onClick={() => archiveProject(project)}
                    >
                      {rowBusy ? "Archiving…" : "Archive Project"}
                    </button>
                    <p className="mt-2 font-sans text-xs text-brand-muted">
                      All 6 deliverables checked — archive clears it from the
                      active board.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ChecklistGroup({
  project,
  group,
  disabled,
  onToggle,
}: {
  project: MarketingProject;
  group: "social" | "video";
  disabled: boolean;
  onToggle: (
    project: MarketingProject,
    key: MarketingChecklistKey,
    done: boolean,
  ) => void;
}) {
  const items = MARKETING_CHECKLIST_ITEMS.filter((i) => i.group === group);
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const checked = flagFor(project, item.key);
        return (
          <li key={item.key}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-brand-ink/10 bg-surface px-3 py-2">
              <input
                type="checkbox"
                className="size-5 accent-brand-orange"
                checked={checked}
                disabled={disabled}
                onChange={(e) =>
                  onToggle(project, item.key, e.target.checked)
                }
              />
              <span className="font-sans text-sm font-semibold text-brand-ink">
                {item.label}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function flagFor(
  project: MarketingProject,
  key: MarketingChecklistKey,
): boolean {
  switch (key) {
    case "fb_post_done":
      return project.fbPostDone;
    case "ig_post_done":
      return project.igPostDone;
    case "x_post_done":
      return project.xPostDone;
    case "video_1_done":
      return project.video1Done;
    case "video_2_done":
      return project.video2Done;
    case "video_3_done":
      return project.video3Done;
  }
}

function upsertProject(
  list: MarketingProject[],
  next: MarketingProject,
): MarketingProject[] {
  const idx = list.findIndex((p) => p.id === next.id);
  if (idx === -1) return [next, ...list];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}

function formatDue(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}
