"use client";

import { useState, useTransition } from "react";
import type {
  BlogAssistMode,
  BlogAssistSuggestion,
  StructuredArticleResult,
} from "@/lib/blog/blog-assist";
import type { PostStatus } from "@/lib/blog/supabase-posts";

type AssistState = {
  loading: boolean;
  error: string | null;
  suggestion: BlogAssistSuggestion | null;
  fingerprint?: string | null;
};

const ASSIST_MODES: { id: BlogAssistMode; label: string }[] = [
  { id: "full", label: "Full assist" },
  { id: "headlines", label: "Headlines" },
  { id: "transitions", label: "Transitions" },
  { id: "reading_flow", label: "Reading flow" },
];

const fieldClass =
  "w-full border border-brand-ink/15 bg-surface px-3 py-3 font-sans text-base leading-relaxed text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none sm:px-4 sm:text-[1.05rem]";

const labelClass =
  "mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted";

export default function BlogBuilder() {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [notes, setNotes] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assistMode, setAssistMode] = useState<BlogAssistMode>("full");
  const [assist, setAssist] = useState<AssistState>({
    loading: false,
    error: null,
    suggestion: null,
    fingerprint: null,
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualMessage, setVisualMessage] = useState<string | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  async function runAssist() {
    setAssist((prev) => ({ ...prev, loading: true, error: null }));
    setDrawerOpen(true);

    try {
      const res = await fetch("/api/creator/blog-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: assistMode,
          notes,
          title,
          excerpt,
          bodyMarkdown,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        suggestion?: BlogAssistSuggestion;
      };

      if (!res.ok || !data.ok || !data.suggestion) {
        setAssist({
          loading: false,
          error: data.error ?? "Assist request failed.",
          suggestion: null,
        });
        return;
      }

      setAssist({
        loading: false,
        error: null,
        suggestion: data.suggestion,
      });
    } catch (error) {
      setAssist({
        loading: false,
        error:
          error instanceof Error ? error.message : "Network error calling assist.",
        suggestion: null,
      });
    }
  }

  function applyHeadline(headline: string) {
    setTitle(headline);
  }

  function applyExcerpt(value: string) {
    setExcerpt(value);
  }

  function appendTransition(line: string) {
    setBodyMarkdown((prev) =>
      prev.trim() ? `${prev.trim()}\n\n${line}\n\n` : `${line}\n\n`,
    );
  }

  async function refineToArchiveStructure() {
    setStructureLoading(true);
    setVisualError(null);
    setVisualMessage(null);
    setAssist((prev) => ({ ...prev, loading: true, error: null }));
    setDrawerOpen(true);

    try {
      const res = await fetch("/api/creator/blog-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "structure",
          notes,
          title,
          excerpt,
          bodyMarkdown,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        suggestion?: BlogAssistSuggestion;
        article?: StructuredArticleResult;
        fingerprint?: { summary?: string };
      };

      if (!res.ok || !data.ok || !data.article) {
        setAssist({
          loading: false,
          error: data.error ?? "Archive structure refine failed.",
          suggestion: null,
          fingerprint: null,
        });
        setVisualError(data.error ?? "Archive structure refine failed.");
        return;
      }

      setTitle(data.article.title);
      setExcerpt(data.article.excerpt);
      setBodyMarkdown(data.article.bodyMarkdown);
      if (data.article.coverUrl) setCoverUrl(data.article.coverUrl);

      setAssist({
        loading: false,
        error: null,
        suggestion: data.suggestion ?? null,
        fingerprint:
          data.article.fingerprintSummary ?? data.fingerprint?.summary ?? null,
      });
      setVisualMessage(
        data.article.coverUrl
          ? "Archive structure applied with text-free cover background."
          : "Archive structure applied (cover image skipped).",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Network error refining structure.";
      setAssist({
        loading: false,
        error: message,
        suggestion: null,
        fingerprint: null,
      });
      setVisualError(message);
    } finally {
      setStructureLoading(false);
    }
  }

  async function generateVisualAid() {
    setVisualLoading(true);
    setVisualError(null);
    setVisualMessage(null);

    try {
      const res = await fetch("/api/creator/blog-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "visual",
          notes,
          title,
          excerpt,
          bodyMarkdown,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        markdown?: string;
        visual?: { markdown?: string; publicUrl?: string };
      };

      if (!res.ok || !data.ok) {
        setVisualError(data.error ?? "Visual generation failed.");
        return;
      }

      const snippet = data.markdown ?? data.visual?.markdown;
      if (!snippet) {
        setVisualError("No image markdown returned from Gemini.");
        return;
      }

      setBodyMarkdown((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${snippet}\n\n` : `${snippet}\n\n`,
      );
      setVisualMessage(
        data.visual?.publicUrl
          ? "Visual aid inserted into the body editor."
          : "Markdown snippet inserted into the body editor.",
      );
    } catch (error) {
      setVisualError(
        error instanceof Error
          ? error.message
          : "Network error generating visual aid.",
      );
    } finally {
      setVisualLoading(false);
    }
  }

  function savePost(status: PostStatus) {
    setSaveMessage(null);
    setSaveError(null);

    startSave(async () => {
      try {
        const res = await fetch("/api/creator/save-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            excerpt,
            bodyMarkdown,
            status,
            coverImage: coverUrl ?? undefined,
            coverAlt: title
              ? `${title} — Sweatlife Chronicles`
              : "Sweatlife Chronicles cover",
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          message?: string;
          error?: string;
          blogPath?: string | null;
        };

        if (!res.ok || !data.ok) {
          setSaveError(data.error ?? "Save failed.");
          return;
        }

        setSaveMessage(
          data.blogPath
            ? `${data.message ?? "Published."} Open ${data.blogPath}`
            : (data.message ?? "Saved."),
        );
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Network error saving post.",
        );
      }
    });
  }

  return (
    <div className="relative space-y-5 pb-24 sm:space-y-6 sm:pb-10">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">AI Blog Architect</p>
        <h1 className="font-display text-[clamp(1.85rem,6vw,2.75rem)] leading-[1.05] text-brand-ink">
          Build the next Sweatlife Chronicle
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Dump rough notes after a workout — the structural editor matches our
          migrated archive fingerprint (calorie-deficit cadence, H2/H3 layout,
          tone), then generates a text-free cover that publishes into the same{" "}
          <code className="font-mono text-xs">/blog/[slug]</code> template.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={refineToArchiveStructure}
          disabled={structureLoading || assist.loading}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-brand-orange px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-orange-deep disabled:opacity-60 sm:flex-none"
        >
          {structureLoading ? (
            <>
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              Matching archive…
            </>
          ) : (
            "Refine to Archive Structure"
          )}
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-11 flex-1 items-center justify-center border border-brand-ink/20 bg-surface-elevated px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange sm:flex-none"
        >
          Open Gemini Assistant
        </button>
        <button
          type="button"
          onClick={() => savePost("draft")}
          disabled={isSaving}
          className="inline-flex min-h-11 flex-1 items-center justify-center border border-brand-ink/20 bg-surface-elevated px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-60 sm:flex-none"
        >
          {isSaving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => savePost("published")}
          disabled={isSaving}
          className="inline-flex min-h-11 flex-1 items-center justify-center border border-brand-ink/20 bg-surface-elevated px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-60 sm:flex-none"
        >
          Publish
        </button>
      </div>

      {saveMessage ? (
        <p className="font-sans text-sm font-semibold text-brand-orange" role="status">
          {saveMessage}
        </p>
      ) : null}
      {saveError ? (
        <p className="font-sans text-sm font-semibold text-red-700" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
        <section className="space-y-5 border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
          <div>
            <label htmlFor="blog-title" className={labelClass}>
              Title
            </label>
            <input
              id="blog-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Working headline…"
              className={fieldClass}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="blog-excerpt" className={labelClass}>
              Excerpt
            </label>
            <textarea
              id="blog-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences for cards & SEO…"
              rows={3}
              className={`${fieldClass} min-h-[5.5rem] resize-y`}
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <label htmlFor="blog-body" className={`${labelClass} mb-0`}>
                Body (Markdown)
              </label>
              <button
                type="button"
                onClick={generateVisualAid}
                disabled={visualLoading}
                className="inline-flex min-h-10 items-center justify-center gap-2 border border-brand-ink/15 bg-surface px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:cursor-wait disabled:opacity-70"
              >
                {visualLoading ? (
                  <>
                    <span
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange"
                      aria-hidden
                    />
                    Generating…
                  </>
                ) : (
                  "Generate Visual Aid"
                )}
              </button>
            </div>
            <textarea
              id="blog-body"
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder={"## Section\n\nYour draft after the workout…"}
              rows={16}
              className={`${fieldClass} min-h-[18rem] resize-y font-mono text-[0.95rem] sm:min-h-[24rem]`}
            />
            {visualLoading ? (
              <p className="mt-2 font-sans text-xs text-brand-muted" role="status">
                Gemini is rendering a brand-aligned visual — this can take a
                moment…
              </p>
            ) : null}
            {visualMessage ? (
              <p
                className="mt-2 font-sans text-xs font-semibold text-brand-orange"
                role="status"
              >
                {visualMessage}
              </p>
            ) : null}
            {visualError ? (
              <p
                className="mt-2 font-sans text-xs font-semibold text-red-700"
                role="alert"
              >
                {visualError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 border border-dashed border-brand-muted/40 bg-surface p-4 sm:p-5">
          <div>
            <p className="eyebrow text-brand-orange">Quick capture</p>
            <h2 className="mt-1 font-display text-xl text-brand-ink sm:text-2xl">
              Rough notes for the structural editor
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
              Primary path: refine to our historical H2/H3 fingerprint, then
              auto-attach a text-free cover background.
            </p>
          </div>
          <textarea
            id="blog-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="- Key takeaway&#10;- Story from practice&#10;- CTA idea"
            rows={10}
            className={`${fieldClass} min-h-[12rem] resize-y`}
          />
          <button
            type="button"
            onClick={refineToArchiveStructure}
            disabled={structureLoading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-brand-orange px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-orange-deep disabled:opacity-60"
          >
            {structureLoading ? (
              <>
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Matching archive fingerprint…
              </>
            ) : (
              "Refine to Archive Structure"
            )}
          </button>
          <div className="flex flex-wrap gap-2">
            {ASSIST_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setAssistMode(mode.id)}
                className={`min-h-10 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                  assistMode === mode.id
                    ? "bg-brand-ink text-white"
                    : "border border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={runAssist}
            disabled={assist.loading || structureLoading}
            className="inline-flex min-h-12 w-full items-center justify-center border border-brand-ink/20 bg-surface-elevated px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
          >
            {assist.loading && !structureLoading
              ? "Gemini is thinking…"
              : "Ask Gemini (assist only)"}
          </button>
        </section>
      </div>

      {/* Gemini side drawer / bottom sheet */}
      <div
        className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${
          drawerOpen ? "visible" : "invisible pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-brand-ink/40 transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close Gemini assistant"
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col border-t border-brand-ink/10 bg-surface-elevated shadow-[0_-12px_40px_rgba(64,64,64,0.18)] transition-transform duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(26rem,100%)] sm:border-l sm:border-t-0 sm:shadow-[-12px_0_40px_rgba(64,64,64,0.12)] ${
            drawerOpen
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gemini-drawer-title"
        >
          <header className="flex items-start justify-between gap-3 border-b border-brand-ink/10 px-4 py-4 sm:px-5">
            <div>
              <p className="eyebrow text-brand-orange">Gemini AI Assistant</p>
              <h2
                id="gemini-drawer-title"
                className="mt-1 font-display text-2xl text-brand-ink"
              >
                Blog architect
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center border border-brand-ink/15 font-sans text-lg text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {assist.loading ? (
              <p className="font-sans text-sm text-brand-muted">
                Reviewing your notes against Sweatlife voice…
              </p>
            ) : null}

            {assist.error ? (
              <p className="font-sans text-sm font-semibold text-red-700" role="alert">
                {assist.error}
              </p>
            ) : null}

            {!assist.loading && !assist.error && !assist.suggestion ? (
              <p className="font-sans text-sm leading-relaxed text-brand-muted">
                Add rough notes or a draft, pick a mode, then tap Ask Gemini.
                Suggestions land here so you can apply them with one tap.
              </p>
            ) : null}

            {assist.suggestion ? (
              <div className="space-y-6">
                {assist.fingerprint ? (
                  <p className="border border-brand-orange/30 bg-brand-orange/5 px-3 py-2 font-sans text-xs leading-relaxed text-brand-ink">
                    {assist.fingerprint}
                  </p>
                ) : null}
                {assist.suggestion.summary ? (
                  <p className="font-sans text-sm leading-relaxed text-brand-muted">
                    {assist.suggestion.summary}
                  </p>
                ) : null}

                <SuggestionList
                  heading="SEO headlines"
                  items={assist.suggestion.headlines}
                  actionLabel="Use title"
                  onAction={applyHeadline}
                />

                {assist.suggestion.improvedExcerpt ? (
                  <div>
                    <p className="eyebrow mb-2">Improved excerpt</p>
                    <p className="font-sans text-sm leading-relaxed text-brand-ink">
                      {assist.suggestion.improvedExcerpt}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        applyExcerpt(assist.suggestion!.improvedExcerpt!)
                      }
                      className="mt-3 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange"
                    >
                      Apply excerpt
                    </button>
                  </div>
                ) : null}

                <SuggestionList
                  heading="Section transitions"
                  items={assist.suggestion.sectionTransitions}
                  actionLabel="Insert"
                  onAction={appendTransition}
                />

                <SuggestionList
                  heading="Reading flow"
                  items={assist.suggestion.readingFlowTips}
                />
              </div>
            ) : null}
          </div>

          <footer className="border-t border-brand-ink/10 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={runAssist}
              disabled={assist.loading}
              className="inline-flex min-h-11 w-full items-center justify-center bg-brand-orange px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
            >
              {assist.loading ? "Working…" : "Run assist again"}
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function SuggestionList({
  heading,
  items,
  actionLabel,
  onAction,
}: {
  heading: string;
  items: string[];
  actionLabel?: string;
  onAction?: (item: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div>
      <p className="eyebrow mb-3">{heading}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="border border-brand-ink/10 bg-surface px-3 py-3"
          >
            <p className="font-sans text-sm leading-relaxed text-brand-ink">
              {item}
            </p>
            {actionLabel && onAction ? (
              <button
                type="button"
                onClick={() => onAction(item)}
                className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange"
              >
                {actionLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
