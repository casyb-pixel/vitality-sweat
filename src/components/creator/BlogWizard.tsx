"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type {
  BlogIdeaOption,
  BlogImagePrompt,
  BlogSeoMetadata,
  FinalizedPostResult,
} from "@/lib/blog/blog-assist";
import { markdownToBlocks } from "@/lib/blog/markdown-blocks";
import { readApiJson } from "@/lib/http/read-api-json";

type WizardPhase =
  | "PHASE_1_INPUT"
  | "PHASE_2_CHOICE"
  | "PHASE_3_DETAILS"
  | "PHASE_4_REVIEW";

const PHASE_ORDER: WizardPhase[] = [
  "PHASE_1_INPUT",
  "PHASE_2_CHOICE",
  "PHASE_3_DETAILS",
  "PHASE_4_REVIEW",
];

const PHASE_LABELS: Record<WizardPhase, string> = {
  PHASE_1_INPUT: "Today's work",
  PHASE_2_CHOICE: "Pick angle",
  PHASE_3_DETAILS: "Details",
  PHASE_4_REVIEW: "Review",
};

const FALLBACK_TALKING_POINTS = [
  "How did the weight feel? (Heavy? Smooth? A grind?)",
  "What's the #1 tip you'd give someone trying this?",
  "Any numbers worth bragging about? (Sets, reps, PRs, times)",
];

type PublishStage = "idle" | "visual" | "saving" | "done";

const bigButtonClass =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 bg-brand-orange px-5 py-4 font-sans text-base font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-brand-orange-deep active:bg-brand-orange-deep disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center border-2 border-brand-ink/20 bg-surface-elevated px-4 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

const fieldClass =
  "w-full border-2 border-brand-ink/15 bg-surface px-4 py-4 font-sans text-base leading-relaxed text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-orange focus:outline-none";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

/** Phase 3 fields come straight from the chosen option's talking points. */
function promptsForOption(option: BlogIdeaOption | null): string[] {
  const points = (option?.talkingPoints ?? [])
    .map((point) => point.trim())
    .filter(Boolean);
  return points.length ? points : FALLBACK_TALKING_POINTS;
}

type BlogWizardProps = {
  /** Fired after a successful publish so Creator Studio can open Projects. */
  onPublished?: (slug: string) => void;
  /** Prefill Phase 1 notes (e.g. from member Library search gaps). */
  seedNotes?: string | null;
};

export default function BlogWizard({
  onPublished,
  seedNotes = null,
}: BlogWizardProps) {
  const [phase, setPhase] = useState<WizardPhase>("PHASE_1_INPUT");

  // Phase 1
  const [notes, setNotes] = useState(() => seedNotes?.trim() || "");

  useEffect(() => {
    const next = seedNotes?.trim();
    if (!next) return;
    setNotes(next);
    setPhase("PHASE_1_INPUT");
  }, [seedNotes]);

  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  // Phase 2
  const [options, setOptions] = useState<BlogIdeaOption[]>([]);
  const [trendSummary, setTrendSummary] = useState("");
  const [researchWarning, setResearchWarning] = useState<string | null>(null);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);

  // Phase 3
  const [answers, setAnswers] = useState<string[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Phase 4
  const [article, setArticle] = useState<FinalizedPostResult | null>(null);
  const [draftConfirmed, setDraftConfirmed] = useState(false);
  const [includeGrowthCta, setIncludeGrowthCta] = useState(true);
  const [publishStage, setPublishStage] = useState<PublishStage>("idle");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishWarning, setPublishWarning] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedStatus, setPublishedStatus] = useState<
    "published" | "draft" | null
  >(null);
  const [growthChecklist, setGrowthChecklist] = useState<{
    cta: boolean;
    promoCopy: boolean;
    slotId: string | null;
  } | null>(null);

  const chosen = chosenIndex !== null ? options[chosenIndex] : null;
  const talkingPoints = promptsForOption(chosen);

  const stepIndex = PHASE_ORDER.indexOf(phase);

  async function findTrendingAngles() {
    setTrendsLoading(true);
    setTrendsError(null);

    try {
      const res = await fetch("/api/creator/blog-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_ideas", notes }),
      });
      const parsed = await readApiJson<{
        ok: boolean;
        error?: string;
        summary?: string;
        options?: BlogIdeaOption[];
        researchWarning?: string | null;
      }>(res);

      if (!parsed.ok) {
        setTrendsError(parsed.error);
        return;
      }

      const data = parsed.data;
      if (!res.ok || !data.ok || !data.options?.length) {
        setTrendsError(
          data.error ?? "Couldn't find trending angles. Try again.",
        );
        return;
      }

      setOptions(data.options);
      setTrendSummary(data.summary ?? "");
      setResearchWarning(data.researchWarning ?? null);
      setChosenIndex(null);
      setPhase("PHASE_2_CHOICE");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Network error. Try again.";
      setTrendsError(
        /did not match the expected pattern/i.test(message)
          ? "The AI service timed out or returned a bad response. Tap Find Trending Angles again."
          : message,
      );
    } finally {
      setTrendsLoading(false);
    }
  }

  function chooseOption(index: number) {
    setChosenIndex(index);
    setAnswers(promptsForOption(options[index]).map(() => ""));
    setDraftError(null);
    setPhase("PHASE_3_DETAILS");
  }

  /** Appends a fresh "- " bullet line so he can keep tapping out fragments. */
  function addBullet(index: number) {
    setAnswers((prev) => {
      const next = [...prev];
      const current = next[index] ?? "";
      next[index] = current.trim() ? `${current.replace(/\s+$/, "")}\n- ` : "- ";
      return next;
    });
  }

  async function writeArticle() {
    if (!chosen) return;
    setDraftLoading(true);
    setDraftError(null);

    try {
      const res = await fetch("/api/creator/blog-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finalize_post",
          title: chosen.title,
          notes,
          targetAudience: chosen.targetAudience,
          talkingPoints,
          answers: talkingPoints.map((prompt, i) => ({
            prompt,
            answer: answers[i] ?? "",
          })),
        }),
      });
      const parsed = await readApiJson<{
        ok: boolean;
        error?: string;
        article?: FinalizedPostResult;
      }>(res);

      if (!parsed.ok) {
        setDraftError(parsed.error);
        return;
      }

      const data = parsed.data;
      if (!res.ok || !data.ok || !data.article) {
        setDraftError(data.error ?? "Article generation failed. Try again.");
        return;
      }

      setArticle(data.article);
      setDraftConfirmed(false);
      setPublishStage("idle");
      setPublishError(null);
      setPublishWarning(null);
      setPublishedSlug(null);
      setPublishedStatus(null);
      setPhase("PHASE_4_REVIEW");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Network error. Try again.";
      setDraftError(
        /did not match the expected pattern/i.test(message)
          ? "The AI service timed out or returned a bad response. Try again."
          : message,
      );
    } finally {
      setDraftLoading(false);
    }
  }

  async function publishArticle(status: "published" | "draft") {
    if (!article) return;
    setPublishError(null);
    setPublishWarning(null);

    const seo = article.seoMetadata;
    // SEO fields own the searchable columns; editorial title stays on the cover alt.
    const publishTitle = seo.metaTitle || article.title;
    const publishDescription = seo.metaDescription || article.description;
    const publishKeywords =
      seo.keywords.length > 0 ? seo.keywords : article.keywords;
    const publishSlug = seo.slug || undefined;

    let bodyMarkdown = article.bodyMarkdown;
    let coverImage: string | undefined;
    const coverAlt = `${article.title} — Sweatlife Chronicles`;

    if (status === "published") {
      setPublishStage("visual");
      try {
        const res = await fetch("/api/creator/blog-visual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: publishTitle,
            excerpt: article.excerpt,
            imagePrompt: article.imagePrompt.prompt,
            altHint: coverAlt,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          visual?: { publicUrl?: string; markdown?: string; alt?: string };
        };
        if (res.ok && data.ok && data.visual?.publicUrl) {
          coverImage = data.visual.publicUrl;
          bodyMarkdown = `![${data.visual.alt ?? coverAlt}](${data.visual.publicUrl})\n\n${bodyMarkdown}`;
        } else {
          setPublishWarning(
            "Visual generation didn't come through — publishing without a cover. You can add one later.",
          );
        }
      } catch {
        setPublishWarning(
          "Visual generation didn't come through — publishing without a cover. You can add one later.",
        );
      }
    }

    setPublishStage("saving");
    try {
      const res = await fetch("/api/creator/save-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publishTitle,
          excerpt: article.excerpt || publishDescription,
          bodyMarkdown,
          description: publishDescription,
          keywords: publishKeywords,
          slug: publishSlug,
          status,
          coverImage,
          coverAlt: coverImage ? coverAlt : undefined,
          includeGrowthCta,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        promosWarning?: string;
        growthPackaging?: {
          ctaEnabled?: boolean;
          adSlotMid?: string;
        };
        post?: {
          slug?: string;
          generated_promos?: unknown;
        };
      };

      if (!res.ok || !data.ok) {
        setPublishError(data.error ?? "Save failed. Try again.");
        setPublishStage("idle");
        return;
      }

      setPublishedSlug(data.post?.slug ?? publishSlug ?? null);
      setPublishedStatus(status);
      setGrowthChecklist({
        cta: data.growthPackaging?.ctaEnabled !== false && includeGrowthCta,
        promoCopy: Boolean(data.post?.generated_promos) || status === "draft",
        slotId: data.growthPackaging?.adSlotMid ?? null,
      });
      if (data.promosWarning) {
        setPublishWarning((prev) =>
          prev
            ? `${prev} Promos: ${data.promosWarning}`
            : `Promos: ${data.promosWarning}`,
        );
      }
      setPublishStage("done");
      const liveSlug = data.post?.slug ?? publishSlug ?? null;
      if (status === "published" && liveSlug) {
        onPublished?.(liveSlug);
      }
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Network error saving post.",
      );
      setPublishStage("idle");
    }
  }

  function startOver() {
    setPhase("PHASE_1_INPUT");
    setNotes("");
    setTrendsError(null);
    setOptions([]);
    setTrendSummary("");
    setResearchWarning(null);
    setChosenIndex(null);
    setAnswers([]);
    setDraftError(null);
    setArticle(null);
    setDraftConfirmed(false);
    setIncludeGrowthCta(true);
    setPublishStage("idle");
    setPublishError(null);
    setPublishWarning(null);
    setPublishedSlug(null);
    setPublishedStatus(null);
    setGrowthChecklist(null);
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-24">
      <StepIndicator activeIndex={stepIndex} />

      {phase === "PHASE_1_INPUT" ? (
        <section className="space-y-4" aria-label="Step 1: Today's work">
          <label
            htmlFor="wizard-notes"
            className="block font-display text-[clamp(1.6rem,6vw,2.2rem)] leading-tight text-brand-ink"
          >
            What did you crush today?
          </label>
          <p className="font-sans text-sm leading-relaxed text-brand-muted">
            Workouts, incline bench PRs, meals, mental wins... quick fragments
            are perfect. No paragraphs needed.
          </p>
          <textarea
            id="wizard-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              "- incline bench 185x5 PR\n- 2 scoops rice + chicken after\n- felt slow on sprints, pushed through"
            }
            rows={9}
            className={`${fieldClass} min-h-[14rem] resize-y`}
            autoComplete="off"
          />
          {trendsError ? (
            <p
              className="font-sans text-sm font-semibold text-red-700"
              role="alert"
            >
              {trendsError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={findTrendingAngles}
            disabled={trendsLoading || !notes.trim()}
            className={bigButtonClass}
          >
            {trendsLoading ? (
              <>
                <Spinner />
                Scanning what&apos;s trending…
              </>
            ) : (
              "Find Trending Angles"
            )}
          </button>
        </section>
      ) : null}

      {phase === "PHASE_2_CHOICE" ? (
        <section className="space-y-4" aria-label="Step 2: Pick your angle">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Pick your angle
          </h2>
          {trendSummary ? (
            <p className="border-l-4 border-brand-orange bg-brand-orange/5 px-3 py-2 font-sans text-sm leading-relaxed text-brand-ink">
              {trendSummary}
            </p>
          ) : null}
          {researchWarning ? (
            <p className="font-sans text-xs text-brand-muted">
              {researchWarning}
            </p>
          ) : null}

          <div className="space-y-3">
            {options.map((option, index) => (
              <button
                key={option.title}
                type="button"
                onClick={() => chooseOption(index)}
                className="block w-full border-2 border-brand-ink/15 bg-surface-elevated p-4 text-left transition-colors hover:border-brand-orange focus:border-brand-orange focus:outline-none active:border-brand-orange"
              >
                <p className="font-display text-lg leading-snug text-brand-ink">
                  {option.title}
                </p>
                {option.talkingPoints.length ? (
                  <div className="mt-3">
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
                      Things to cover
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {option.talkingPoints.slice(0, 3).map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 font-sans text-sm leading-snug text-brand-muted"
                        >
                          <span className="text-brand-orange" aria-hidden>
                            •
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {option.targetAudience ? (
                  <p className="mt-3 font-sans text-xs leading-relaxed text-brand-muted">
                    <span className="font-bold text-brand-ink">For: </span>
                    {option.targetAudience}
                  </p>
                ) : null}
                <span className="mt-3 inline-block font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
                  Write this one →
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPhase("PHASE_1_INPUT")}
            className={secondaryButtonClass}
          >
            ← Back to notes
          </button>
        </section>
      ) : null}

      {phase === "PHASE_3_DETAILS" && chosen ? (
        <section className="space-y-4" aria-label="Step 3: Quick details">
          <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
            Quick details
          </h2>
          <p className="border-l-4 border-brand-orange bg-brand-orange/5 px-3 py-2 font-display text-base leading-snug text-brand-ink">
            {chosen.title}
          </p>
          <p className="font-sans text-sm leading-relaxed text-brand-muted">
            Answer what you can in raw bullets or quick fragments — the AI turns
            them into full sentences for you.
          </p>

          <div className="space-y-5">
            {talkingPoints.map((prompt, index) => (
              <div key={prompt}>
                <label
                  htmlFor={`wizard-answer-${index}`}
                  className="mb-2 flex gap-2 font-sans text-sm font-bold leading-snug text-brand-ink"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center bg-brand-orange/10 font-mono text-xs text-brand-orange"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  {prompt}
                </label>
                <textarea
                  id={`wizard-answer-${index}`}
                  value={answers[index] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value;
                      return next;
                    })
                  }
                  placeholder="- quick fragment&#10;- another thought"
                  rows={3}
                  className={`${fieldClass} min-h-[5.5rem] resize-y`}
                />
                <button
                  type="button"
                  onClick={() => addBullet(index)}
                  className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 px-1 font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange"
                >
                  + Add bullet
                </button>
              </div>
            ))}
          </div>

          {draftError ? (
            <p
              className="font-sans text-sm font-semibold text-red-700"
              role="alert"
            >
              {draftError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={writeArticle}
            disabled={draftLoading || answers.every((a) => !a.trim())}
            className={bigButtonClass}
          >
            {draftLoading ? (
              <>
                <Spinner />
                Polishing &amp; designing…
              </>
            ) : (
              "Polish My Post & Create Graphics"
            )}
          </button>
          {draftLoading ? (
            <p
              className="text-center font-sans text-xs text-brand-muted"
              role="status"
            >
              Editing your notes into a full article and designing the cover
              artwork — about 20–30 seconds.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setPhase("PHASE_2_CHOICE")}
            disabled={draftLoading}
            className={secondaryButtonClass}
          >
            ← Pick a different angle
          </button>
        </section>
      ) : null}

      {phase === "PHASE_4_REVIEW" && article ? (
        <section className="space-y-5" aria-label="Step 4: Review and publish">
          {publishStage === "done" ? (
            <div className="space-y-3 border-2 border-brand-orange bg-brand-orange/5 p-4">
              <p className="font-display text-xl text-brand-ink">
                {publishedStatus === "published"
                  ? "It's live. Nice work."
                  : "Draft saved."}
              </p>
              {publishWarning ? (
                <p className="font-sans text-sm text-brand-muted">
                  {publishWarning}
                </p>
              ) : null}
              {publishedStatus === "published" && publishedSlug ? (
                <>
                  <a href={`/blog/${publishedSlug}`} className={bigButtonClass}>
                    View the post
                  </a>
                  {growthChecklist ? (
                    <ul className="space-y-1 font-sans text-sm text-brand-ink">
                      <li>
                        ✓ Growth packaging applied
                        {growthChecklist.cta
                          ? " — end CTA on"
                          : " — end CTA opted out"}
                      </li>
                      <li>
                        {growthChecklist.promoCopy ? "✓" : "…"} Promo copy
                        (free app + SWLA angle)
                      </li>
                      <li>
                        ✓ Mid AdSlot id:{" "}
                        <span className="font-semibold">
                          {growthChecklist.slotId ?? "blog-mid-…"}
                        </span>
                      </li>
                    </ul>
                  ) : null}
                  <p className="font-sans text-sm text-brand-muted">
                    Marketing project is on the Projects tab — swipe copy is
                    ready for local promotion.
                  </p>
                </>
              ) : null}
              <button
                type="button"
                onClick={startOver}
                className={secondaryButtonClass}
              >
                Log another day
              </button>
            </div>
          ) : (
            <h2 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
              Does this look right?
            </h2>
          )}

          <ArticlePreview article={article} />

          <SeoMetadataCard seo={article.seoMetadata} />

          <ImageSchemeCard imagePrompt={article.imagePrompt} />

          {publishStage === "done" ? null : (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 border-2 border-brand-ink/15 bg-surface-elevated p-4">
                <input
                  type="checkbox"
                  checked={draftConfirmed}
                  onChange={(e) => setDraftConfirmed(e.target.checked)}
                  disabled={publishStage !== "idle"}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-brand-orange"
                />
                <span className="font-sans text-sm font-bold leading-snug text-brand-ink">
                  The article and cover artwork plan look good — commit this to
                  the blog.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 border-2 border-brand-ink/15 bg-surface p-4">
                <input
                  type="checkbox"
                  checked={includeGrowthCta}
                  onChange={(e) => setIncludeGrowthCta(e.target.checked)}
                  disabled={publishStage !== "idle"}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-brand-orange"
                />
                <span className="font-sans text-sm leading-snug text-brand-ink">
                  <span className="font-bold">Growth packaging</span> — append
                  free Vitality Engine CTA, mid AdSlot id from slug, and
                  generate SWLA-friendly promo captions on publish.
                </span>
              </label>

              {publishError ? (
                <p
                  className="font-sans text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {publishError}
                </p>
              ) : null}
              {publishWarning ? (
                <p className="font-sans text-sm text-brand-muted" role="status">
                  {publishWarning}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => publishArticle("published")}
                disabled={publishStage !== "idle" || !draftConfirmed}
                className={bigButtonClass}
              >
                {publishStage === "visual" ? (
                  <>
                    <Spinner />
                    Rendering cover artwork…
                  </>
                ) : publishStage === "saving" ? (
                  <>
                    <Spinner />
                    Publishing…
                  </>
                ) : (
                  "Confirm & Publish"
                )}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => publishArticle("draft")}
                  disabled={publishStage !== "idle"}
                  className={secondaryButtonClass}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={writeArticle}
                  disabled={publishStage !== "idle" || draftLoading}
                  className={secondaryButtonClass}
                >
                  {draftLoading ? "Rewriting…" : "Rewrite it"}
                </button>
              </div>

              {publishStage === "idle" ? (
                <button
                  type="button"
                  onClick={() => setPhase("PHASE_3_DETAILS")}
                  className={secondaryButtonClass}
                >
                  ← Back to details
                </button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <ol
      className="flex items-start justify-between gap-1"
      aria-label={`Step ${activeIndex + 1} of ${PHASE_ORDER.length}: ${PHASE_LABELS[PHASE_ORDER[activeIndex]]}`}
    >
      {PHASE_ORDER.map((phase, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={phase}
            className="flex flex-1 flex-col items-center gap-1.5"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full font-sans text-sm font-bold ${
                done
                  ? "bg-brand-orange text-white"
                  : active
                    ? "border-[3px] border-brand-orange bg-surface text-brand-orange"
                    : "border-2 border-brand-ink/20 bg-surface text-brand-muted"
              }`}
              aria-hidden
            >
              {done ? "✓" : index + 1}
            </span>
            <span
              className={`text-center font-sans text-[0.62rem] font-bold uppercase tracking-[0.1em] ${
                active ? "text-brand-orange" : "text-brand-muted"
              }`}
            >
              {PHASE_LABELS[phase]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ArticlePreview({ article }: { article: FinalizedPostResult }) {
  const blocks = markdownToBlocks(article.bodyMarkdown);
  const wordCount = article.bodyMarkdown
    .replace(/[#*->]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <article className="border-2 border-brand-ink/10 bg-surface-elevated">
      <header className="space-y-3 border-b border-brand-ink/10 p-5 sm:p-7">
        <p className="eyebrow text-brand-orange">
          Polished draft · ~{wordCount} words
        </p>
        <h3 className="font-display text-[clamp(1.5rem,5.5vw,2rem)] leading-tight text-brand-ink">
          {article.title}
        </h3>
        <p className="font-sans text-base italic leading-relaxed text-brand-muted">
          {article.excerpt}
        </p>
      </header>

      <div className="space-y-5 p-5 sm:p-7">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "h2":
              return (
                <h4
                  key={index}
                  className="pt-2 font-display text-[1.4rem] leading-snug text-brand-ink"
                >
                  {block.text}
                </h4>
              );
            case "h3":
              return (
                <h5
                  key={index}
                  className="font-display text-[1.15rem] leading-snug text-brand-ink"
                >
                  {block.text}
                </h5>
              );
            case "ul":
              return (
                <ul key={index} className="space-y-2">
                  {block.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 font-sans text-[1.05rem] leading-[1.7] text-brand-ink"
                    >
                      <span className="text-brand-orange" aria-hidden>
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              );
            case "image":
              return (
                <Image
                  key={index}
                  src={block.src}
                  alt={block.alt || article.title}
                  width={1280}
                  height={720}
                  className="h-auto w-full"
                />
              );
            default:
              return (
                <p
                  key={index}
                  className="font-sans text-[1.05rem] leading-[1.75] text-brand-ink"
                >
                  {block.text}
                </p>
              );
          }
        })}
      </div>

      {article.keywords.length ? (
        <footer className="flex flex-wrap gap-1.5 border-t border-brand-ink/10 px-5 py-4 sm:px-7">
          {article.keywords.map((keyword) => (
            <span
              key={keyword}
              className="bg-brand-ink/5 px-2 py-1 font-sans text-[0.7rem] uppercase tracking-[0.08em] text-brand-muted"
            >
              {keyword}
            </span>
          ))}
        </footer>
      ) : null}
    </article>
  );
}

/**
 * Auto-generated SEO fields — read-only confirmation before Supabase commit.
 */
function SeoMetadataCard({ seo }: { seo: BlogSeoMetadata }) {
  return (
    <section
      className="border-2 border-brand-ink/10 bg-surface p-5 sm:p-6"
      aria-label="SEO metadata"
    >
      <p className="eyebrow text-brand-orange">SEO · auto-filled</p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
        These go straight into the post on publish — no tags to fill out.
      </p>

      <dl className="mt-4 space-y-3">
        <div>
          <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
            Meta title · {seo.metaTitle.length}/60
          </dt>
          <dd className="mt-0.5 font-sans text-sm font-semibold leading-snug text-brand-ink">
            {seo.metaTitle}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
            Meta description · {seo.metaDescription.length}/160
          </dt>
          <dd className="mt-0.5 font-sans text-sm leading-relaxed text-brand-ink">
            {seo.metaDescription}
          </dd>
        </div>
        <div>
          <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
            URL slug
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-brand-ink">
            /blog/{seo.slug}
          </dd>
        </div>
      </dl>

      {seo.keywords.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-brand-ink/10 pt-3">
          {seo.keywords.map((keyword) => (
            <span
              key={keyword}
              className="bg-brand-ink/5 px-2 py-1 font-sans text-[0.7rem] uppercase tracking-[0.08em] text-brand-muted"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Shows the text-free visual scheme Gemini planned for the cover so Hunter can
 * sanity-check it before the image model actually renders it at publish time.
 */
function ImageSchemeCard({ imagePrompt }: { imagePrompt: BlogImagePrompt }) {
  const rows: { label: string; value: string }[] = [
    { label: "Subject", value: imagePrompt.subject },
    { label: "Lighting", value: imagePrompt.lighting },
    { label: "Framing", value: imagePrompt.composition },
    { label: "Look", value: imagePrompt.style },
    { label: "Never include", value: imagePrompt.negativeConstraints },
  ].filter((row) => row.value.trim());

  return (
    <section
      className="border-2 border-brand-ink/10 bg-surface p-5 sm:p-6"
      aria-label="Cover artwork plan"
    >
      <p className="eyebrow text-brand-orange">Cover artwork plan</p>
      <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
        Generated at publish time from these parameters — text-free, 16:9, brand
        graded.
      </p>

      <div
        className="mt-4 flex aspect-video items-center justify-center border-2 border-dashed border-brand-ink/20 bg-brand-ink/5 px-4 text-center"
        aria-hidden
      >
        <span className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-brand-muted">
          16:9 background · no text
        </span>
      </div>

      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-orange">
              {row.label}
            </dt>
            <dd className="mt-0.5 font-sans text-sm leading-relaxed text-brand-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {imagePrompt.prompt.trim() ? (
        <details className="mt-4 border-t border-brand-ink/10 pt-3">
          <summary className="cursor-pointer font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
            View full image prompt
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-brand-muted">
            {imagePrompt.prompt}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
