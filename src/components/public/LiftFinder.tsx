"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import {
  EQUIPMENT_ORDER,
  encyclopediaMuscleGroups,
  equipmentLabel,
  muscleLabel,
  searchEncyclopedia,
  type EncyclopediaEquipment,
  type EncyclopediaSearchHit,
} from "@/lib/fitness/encyclopedia-search";

const FULL_LIMIT = 8;
const COMPACT_LIMIT = 4;

type LiftFinderProps = {
  index: EncyclopediaSearchHit[];
  featured: EncyclopediaSearchHit[];
  variant?: "full" | "compact";
  contained?: boolean;
  eyebrow?: string;
  headline?: string;
};

function optionId(listId: string, slug: string): string {
  return `${listId}-${slug}`;
}

export default function LiftFinder({
  index,
  featured,
  variant = "full",
  contained = false,
  eyebrow = "Form guides",
  headline,
}: LiftFinderProps) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState<EncyclopediaEquipment | "">("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const compact = variant === "compact";
  const title =
    headline ??
    (compact
      ? "Need cues, not a number?"
      : "Name the lift. I'll give you the cues.");
  const idleCount = compact ? 2 : 4;
  const limit = compact ? COMPACT_LIMIT : FULL_LIMIT;
  const muscles = useMemo(() => encyclopediaMuscleGroups(index), [index]);

  const browsing = Boolean(query.trim() || muscle || equipment);
  const results = useMemo(
    () =>
      searchEncyclopedia(index, query, {
        muscle: muscle || undefined,
        equipment: equipment || undefined,
      }),
    [index, query, muscle, equipment],
  );

  const idleCards = featured.slice(0, idleCount);
  const matches = browsing ? results : idleCards;
  const clipped = browsing && !showAll && matches.length > limit;
  const visible = clipped ? matches.slice(0, limit) : matches;
  const activeSlug = visible[activeIndex]?.slug;

  function clearBrowseState() {
    setShowAll(false);
    setActiveIndex(0);
  }

  function toggleMuscle(value: string) {
    setMuscle((current) => (current === value ? "" : value));
    clearBrowseState();
  }

  function toggleEquipment(value: EncyclopediaEquipment) {
    setEquipment((current) => (current === value ? "" : value));
    clearBrowseState();
  }

  function goTo(slug: string) {
    router.push(`/exercises/${slug}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visible.length) return;
      setActiveIndex((i) => (i + 1) % visible.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!visible.length) return;
      setActiveIndex((i) => (i - 1 + visible.length) % visible.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = visible[activeIndex] ?? visible[0];
      if (hit) goTo(hit.slug);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        setQuery("");
        clearBrowseState();
        return;
      }
      setMuscle("");
      setEquipment("");
      clearBrowseState();
    }
  }

  const inner = (
    <>
      <p className="eyebrow text-brand-orange">{eyebrow}</p>
      <h2
        className={`mt-3 max-w-3xl font-display leading-[1.05] text-balance text-white ${
          compact
            ? "text-[clamp(1.6rem,4vw,2.4rem)]"
            : "text-[clamp(2rem,5vw,3.4rem)]"
        }`}
      >
        {title}
      </h2>

      <div
        className={`mt-8 border-b-2 border-white/25 transition-colors focus-within:border-brand-orange ${
          compact ? "max-w-xl" : "max-w-3xl"
        }`}
      >
        <label htmlFor={inputId} className="sr-only">
          Find a lift
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            clearBrowseState();
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          placeholder="Goblet squat, cable row, first press..."
          className={`w-full bg-transparent font-display text-white caret-brand-orange outline-none placeholder:text-white/35 ${
            compact
              ? "py-3 text-xl sm:text-2xl"
              : "py-4 text-[clamp(1.5rem,3.5vw,2.35rem)]"
          }`}
          role="combobox"
          aria-expanded={visible.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            activeSlug ? optionId(listId, activeSlug) : undefined
          }
          aria-autocomplete="list"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {muscles.map((group) => {
          const selected = muscle === group;
          return (
            <button
              key={group}
              type="button"
              onClick={() => toggleMuscle(group)}
              aria-pressed={selected}
              className={`border px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                selected
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-white/20 text-white/80 hover:border-white hover:text-white"
              }`}
            >
              {muscleLabel(group)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {EQUIPMENT_ORDER.map((value) => {
          const selected = equipment === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleEquipment(value)}
              aria-pressed={selected}
              className={`border px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                selected
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-white/20 text-white/80 hover:border-white hover:text-white"
              }`}
            >
              {equipmentLabel(value)}
            </button>
          );
        })}
      </div>

      <p className="mt-4 font-sans text-sm text-white/60">
        {browsing
          ? results.length
            ? `${results.length} lift${results.length === 1 ? "" : "s"}`
            : "Nothing matched that."
          : "Or tap a muscle and browse."}
      </p>

      {browsing && results.length === 0 ? (
        <p className="mt-6 max-w-xl font-sans text-base text-white/75">
          Nothing in the encyclopedia for that. Try squat, row, or a muscle
          name.{" "}
          <Link
            href="/exercises"
            className="font-semibold text-brand-orange hover:text-white"
          >
            Browse every lift
          </Link>
        </p>
      ) : (
        <ul
          id={listId}
          role="listbox"
          aria-label="Lift matches"
          className={`mt-6 grid gap-3 ${
            compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-2"
          }`}
        >
          {visible.map((hit, index) => {
            const selected = hit.slug === activeSlug;
            return (
              <li key={hit.slug} role="presentation">
                <Link
                  id={optionId(listId, hit.slug)}
                  href={`/exercises/${hit.slug}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`block h-full border px-4 py-4 transition-colors ${
                    selected
                      ? "border-brand-orange bg-white/10"
                      : "border-white/15 bg-white/5 hover:border-brand-orange"
                  }`}
                >
                  <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange">
                    {hit.eyebrow}
                  </p>
                  <p className="mt-1 font-display text-2xl text-white">
                    {hit.name}
                  </p>
                  <p className="mt-1 font-sans text-xs uppercase tracking-[0.08em] text-white/55">
                    {muscleLabel(hit.primaryMuscle)} ·{" "}
                    {equipmentLabel(hit.equipment)}
                  </p>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-white/78">
                    {hit.cue}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {clipped ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-6 font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange hover:text-white"
        >
          See all {results.length} matching lifts
        </button>
      ) : null}

      <p className="mt-8">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange hover:text-white"
        >
          Browse every lift
          <span aria-hidden>→</span>
        </Link>
      </p>
    </>
  );

  if (contained) {
    return (
      <section className="relative overflow-hidden bg-surface-dark px-5 py-8 text-white sm:px-8 sm:py-10">
        {inner}
      </section>
    );
  }

  return (
    <section className="relative isolate overflow-hidden bg-surface-dark py-[var(--section-y)] text-white">
      <p
        aria-hidden
        className="pointer-events-none absolute -right-6 top-4 hidden select-none font-display text-[min(28vw,14rem)] leading-none text-white/[0.04] sm:block"
      >
        Lifts
      </p>
      <div className="site-shell relative">{inner}</div>
    </section>
  );
}
