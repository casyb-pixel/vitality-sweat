"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  NestedProgramDay,
  NestedProgramExercise,
} from "@/components/app/WorkoutAgent";
import { filterExercises } from "@/lib/fitness/exercises";
import {
  WORKOUT_SET_STYLE_LABELS,
  type Exercise,
  type WorkoutSetStyle,
} from "@/lib/fitness/types";

type ProgramDayEditorProps = {
  day: NestedProgramDay;
  catalog: Exercise[];
  /** Show Start button in view mode. */
  onStartDay?: (day: NestedProgramDay) => void;
  running?: boolean;
  onDayChange: (day: NestedProgramDay) => void;
  /** Hide day-level regenerate (e.g. bonus extras). */
  allowRegenerate?: boolean;
};

type EditMode = null | "edit" | "swap" | "add";

function formatPrescription(ex: NestedProgramExercise): string {
  const reps =
    ex.rep_min != null && ex.rep_max != null
      ? ex.rep_min === ex.rep_max
        ? `${ex.rep_min} reps`
        : `${ex.rep_min}-${ex.rep_max} reps`
      : ex.rep_min != null
        ? `${ex.rep_min}+ reps`
        : ex.rep_max != null
          ? `up to ${ex.rep_max} reps`
          : null;
  const parts = [`${ex.sets} sets`, reps].filter(Boolean);
  if (ex.rest_sec != null) parts.push(`${ex.rest_sec}s rest`);
  return parts.join(" · ");
}

function styleLabel(style: WorkoutSetStyle | string): string {
  if (style in WORKOUT_SET_STYLE_LABELS) {
    return WORKOUT_SET_STYLE_LABELS[style as WorkoutSetStyle];
  }
  return String(style);
}

function normalizeExerciseJoin(
  exercise: NestedProgramExercise["exercise"] | Exercise | null | undefined,
): NestedProgramExercise["exercise"] {
  if (!exercise) return null;
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    primary_muscle: exercise.primary_muscle,
    equipment: exercise.equipment,
  };
}

export default function ProgramDayEditor({
  day,
  catalog,
  onStartDay,
  running = false,
  onDayChange,
  allowRegenerate = true,
}: ProgramDayEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>(null);
  const [search, setSearch] = useState("");
  const [editDraft, setEditDraft] = useState<{
    sets: string;
    rep_min: string;
    rep_max: string;
    rest_sec: string;
    set_style: WorkoutSetStyle;
    coach_notes: string;
    superset_group: string;
  } | null>(null);

  const exercises = useMemo(
    () =>
      [...(day.exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [day.exercises],
  );

  const filtered = useMemo(
    () => filterExercises(catalog, { query: search }).slice(0, 30),
    [catalog, search],
  );

  const customized = Boolean(day.customized_at);

  function patchDay(
    nextExercises: NestedProgramExercise[],
    customizedAt?: string | null,
  ) {
    onDayChange({
      ...day,
      customized_at: customizedAt ?? day.customized_at ?? new Date().toISOString(),
      exercises: nextExercises.map((ex, i) => ({ ...ex, sort_order: i })),
    });
  }

  function openEdit(ex: NestedProgramExercise) {
    setActiveId(ex.id);
    setMode("edit");
    setError(null);
    setEditDraft({
      sets: String(ex.sets),
      rep_min: ex.rep_min != null ? String(ex.rep_min) : "",
      rep_max: ex.rep_max != null ? String(ex.rep_max) : "",
      rest_sec: ex.rest_sec != null ? String(ex.rest_sec) : "",
      set_style: (ex.set_style in WORKOUT_SET_STYLE_LABELS
        ? ex.set_style
        : "hypertrophy") as WorkoutSetStyle,
      coach_notes: ex.coach_notes ?? "",
      superset_group: ex.superset_group ?? "",
    });
  }

  function openSwap(ex: NestedProgramExercise) {
    setActiveId(ex.id);
    setMode("swap");
    setSearch("");
    setError(null);
  }

  function openAdd(afterId: string | null = null) {
    setActiveId(afterId);
    setMode("add");
    setSearch("");
    setError(null);
  }

  function closePanels() {
    setMode(null);
    setActiveId(null);
    setEditDraft(null);
    setSearch("");
  }

  function regenerateDay() {
    if (day.day_kind === "bonus") {
      setError(
        "Bonus extras stay outside the mapped plan. Add a new extra instead of regenerating this one into the schedule.",
      );
      return;
    }
    const wipeNote = customized
      ? "Regenerate this day with AI? Your customizations on this day will be replaced. Other days stay the same."
      : "Regenerate this day's exercises with AI? Other days and your days-per-week stay the same.";
    if (!window.confirm(wipeNote)) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/app/workout/plan/days/${day.id}/regenerate`,
        { method: "POST" },
      );
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      if (
        !contentType.includes("application/json") ||
        raw.trimStart().startsWith("<!")
      ) {
        setError(
          res.status === 503
            ? "GEMINI_API_KEY is missing on the server. Add it and restart Next.js."
            : "Day regenerate failed. Try again.",
        );
        return;
      }
      let json: {
        ok?: boolean;
        error?: string;
        day?: NestedProgramDay;
        summary?: string;
      };
      try {
        json = JSON.parse(raw) as typeof json;
      } catch {
        setError("Day regenerate returned bad JSON.");
        return;
      }
      if (!res.ok || !json.ok || !json.day) {
        setError(json.error ?? "Could not regenerate this day.");
        return;
      }
      onDayChange({
        ...json.day,
        exercises: [...(json.day.exercises ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      });
      closePanels();
    });
  }

  function removeExercise(ex: NestedProgramExercise) {
    if (
      !window.confirm(
        `Remove ${ex.exercise?.name ?? "this exercise"} from ${day.label}?`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/exercises/${ex.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        day_customized_at?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not remove exercise.");
        return;
      }
      patchDay(
        exercises.filter((row) => row.id !== ex.id),
        json.day_customized_at,
      );
      closePanels();
    });
  }

  function saveEdit(ex: NestedProgramExercise) {
    if (!editDraft) return;
    const sets = Number(editDraft.sets);
    const repMin =
      editDraft.rep_min === "" ? null : Number(editDraft.rep_min);
    const repMax =
      editDraft.rep_max === "" ? null : Number(editDraft.rep_max);
    const restSec =
      editDraft.rest_sec === "" ? null : Number(editDraft.rest_sec);

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/exercises/${ex.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets,
          rep_min: repMin,
          rep_max: repMax,
          rest_sec: restSec,
          set_style: editDraft.set_style,
          coach_notes: editDraft.coach_notes.trim() || null,
          superset_group: editDraft.superset_group.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        exercise?: NestedProgramExercise;
        day_customized_at?: string;
      };
      if (!res.ok || !json.ok || !json.exercise) {
        setError(json.error ?? "Could not save changes.");
        return;
      }
      patchDay(
        exercises.map((row) =>
          row.id === ex.id
            ? {
                ...row,
                ...json.exercise!,
                exercise:
                  normalizeExerciseJoin(json.exercise!.exercise) ??
                  row.exercise,
              }
            : row,
        ),
        json.day_customized_at,
      );
      closePanels();
    });
  }

  function pickCatalogExercise(picked: Exercise) {
    if (mode === "swap" && activeId) {
      setError(null);
      startTransition(async () => {
        const res = await fetch(`/api/app/workout/plan/exercises/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise_id: picked.id }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          exercise?: NestedProgramExercise;
          day_customized_at?: string;
        };
        if (!res.ok || !json.ok || !json.exercise) {
          setError(json.error ?? "Could not swap exercise.");
          return;
        }
        patchDay(
          exercises.map((row) =>
            row.id === activeId
              ? {
                  ...row,
                  ...json.exercise!,
                  exercise:
                    normalizeExerciseJoin(json.exercise!.exercise) ??
                    normalizeExerciseJoin(picked),
                }
              : row,
          ),
          json.day_customized_at,
        );
        closePanels();
      });
      return;
    }

    if (mode === "add") {
      setError(null);
      startTransition(async () => {
        const res = await fetch(
          `/api/app/workout/plan/days/${day.id}/exercises`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exercise_id: picked.id,
              after_id: activeId,
            }),
          },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          exercise?: NestedProgramExercise;
          day_customized_at?: string;
        };
        if (!res.ok || !json.ok || !json.exercise) {
          setError(json.error ?? "Could not add exercise.");
          return;
        }
        const inserted: NestedProgramExercise = {
          ...json.exercise,
          exercise:
            normalizeExerciseJoin(json.exercise.exercise) ??
            normalizeExerciseJoin(picked),
        };
        const afterIdx = activeId
          ? exercises.findIndex((row) => row.id === activeId)
          : -1;
        const next =
          afterIdx >= 0
            ? [
                ...exercises.slice(0, afterIdx + 1),
                inserted,
                ...exercises.slice(afterIdx + 1),
              ]
            : [...exercises, inserted];
        patchDay(next, json.day_customized_at);
        closePanels();
      });
    }
  }

  async function resolveAndPick() {
    const q = search.trim();
    if (q.length < 2) {
      setError("Type at least 2 characters to look up an exercise.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/app/exercises/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        exercise?: Exercise;
        candidates?: Exercise[];
        ambiguous?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not resolve that exercise.");
        return;
      }
      if (json.ambiguous && json.candidates?.[0]) {
        // Prefer first candidate for customization flow; list still shows below.
        setError("A few exercises fit. Pick one from the list.");
        return;
      }
      if (!json.exercise) {
        setError(json.error ?? "Could not resolve that exercise.");
        return;
      }
      pickCatalogExercise(json.exercise);
    });
  }

  function move(ex: NestedProgramExercise, direction: -1 | 1) {
    const idx = exercises.findIndex((row) => row.id === ex.id);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= exercises.length) return;
    const ordered = [...exercises];
    const tmp = ordered[idx]!;
    ordered[idx] = ordered[swapWith]!;
    ordered[swapWith] = tmp;
    const orderedIds = ordered.map((row) => row.id);

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/days/${day.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        exercises?: NestedProgramExercise[];
        day_customized_at?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not reorder.");
        return;
      }
      const next = (json.exercises ?? ordered).map((row) => ({
        ...row,
        exercise:
          normalizeExerciseJoin(row.exercise) ??
          ordered.find((o) => o.id === row.id)?.exercise ??
          null,
      }));
      patchDay(next, json.day_customized_at);
    });
  }

  const fieldClass =
    "mt-1 w-full border border-brand-ink/15 bg-surface-elevated px-2.5 py-2 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const tinyBtn =
    "border border-brand-ink/15 px-2 py-1 font-sans text-[0.65rem] font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-50";

  return (
    <article
      className={`border bg-surface-elevated p-4 ${
        running ? "border-brand-orange" : "border-brand-ink/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-sans text-sm font-bold uppercase tracking-[0.1em] text-brand-orange">
              {day.label}
            </h3>
            {customized ? (
              <span className="border border-brand-orange/40 bg-brand-orange/10 px-2 py-0.5 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-orange">
                Your version
              </span>
            ) : (
              <span className="font-sans text-[0.65rem] uppercase tracking-[0.08em] text-brand-muted">
                AI draft
              </span>
            )}
          </div>
          {day.focus ? (
            <p className="mt-1 font-sans text-xs text-brand-muted">
              Focus: {day.focus}
              {day.estimated_minutes ? ` · ~${day.estimated_minutes} min` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {allowRegenerate && day.day_kind !== "bonus" ? (
            <button
              type="button"
              onClick={regenerateDay}
              disabled={pending}
              className="border border-brand-ink/15 px-3 py-2 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
            >
              {pending ? "Working…" : "Regenerate day"}
            </button>
          ) : null}
          {onStartDay ? (
            <button
              type="button"
              onClick={() => onStartDay(day)}
              className="border border-brand-orange bg-brand-orange px-3 py-2 font-sans text-[0.65rem] font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
            >
              {running ? "Running" : "Start"}
            </button>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {exercises.map((ex, index) => (
          <li
            key={ex.id}
            className="border border-brand-ink/10 bg-white/40 p-3 dark:bg-transparent"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {ex.exercise?.name ?? "Exercise"}
                </p>
                <p className="text-xs text-brand-muted">
                  {styleLabel(ex.set_style)} · {formatPrescription(ex)}
                  {ex.superset_group
                    ? ` · superset ${ex.superset_group}`
                    : ""}
                </p>
                {ex.coach_notes ? (
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {ex.coach_notes}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button
                  type="button"
                  className={tinyBtn}
                  disabled={pending || index === 0}
                  onClick={() => move(ex, -1)}
                  aria-label="Move up"
                >
                  Up
                </button>
                <button
                  type="button"
                  className={tinyBtn}
                  disabled={pending || index === exercises.length - 1}
                  onClick={() => move(ex, 1)}
                  aria-label="Move down"
                >
                  Down
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={tinyBtn}
                disabled={pending}
                onClick={() => openSwap(ex)}
              >
                Swap
              </button>
              <button
                type="button"
                className={tinyBtn}
                disabled={pending}
                onClick={() => openEdit(ex)}
              >
                Edit
              </button>
              <button
                type="button"
                className={tinyBtn}
                disabled={pending}
                onClick={() => removeExercise(ex)}
              >
                Remove
              </button>
              <button
                type="button"
                className={tinyBtn}
                disabled={pending}
                onClick={() => openAdd(ex.id)}
              >
                Add after
              </button>
            </div>

            {mode === "edit" && activeId === ex.id && editDraft ? (
              <div className="mt-3 space-y-2 border border-brand-orange/25 bg-brand-orange/5 p-3">
                <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                  Edit prescription
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="font-sans text-xs text-brand-muted">
                    Sets
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      max={12}
                      value={editDraft.sets}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, sets: e.target.value })
                      }
                    />
                  </label>
                  <label className="font-sans text-xs text-brand-muted">
                    Rep min
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      value={editDraft.rep_min}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, rep_min: e.target.value })
                      }
                    />
                  </label>
                  <label className="font-sans text-xs text-brand-muted">
                    Rep max
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      value={editDraft.rep_max}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, rep_max: e.target.value })
                      }
                    />
                  </label>
                  <label className="font-sans text-xs text-brand-muted">
                    Rest (sec)
                    <input
                      className={fieldClass}
                      type="number"
                      min={0}
                      max={600}
                      value={editDraft.rest_sec}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          rest_sec: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="block font-sans text-xs text-brand-muted">
                  Superset group (same letter = pair, skip rest in between)
                  <input
                    className={fieldClass}
                    value={editDraft.superset_group}
                    placeholder="A"
                    onChange={(e) =>
                      setEditDraft({
                        ...editDraft,
                        superset_group: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="block font-sans text-xs text-brand-muted">
                  Set style
                  <select
                    className={fieldClass}
                    value={editDraft.set_style}
                    onChange={(e) =>
                      setEditDraft({
                        ...editDraft,
                        set_style: e.target.value as WorkoutSetStyle,
                      })
                    }
                  >
                    {(
                      Object.keys(WORKOUT_SET_STYLE_LABELS) as WorkoutSetStyle[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {WORKOUT_SET_STYLE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-sans text-xs text-brand-muted">
                  Coach notes
                  <input
                    className={fieldClass}
                    value={editDraft.coach_notes}
                    onChange={(e) =>
                      setEditDraft({
                        ...editDraft,
                        coach_notes: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="bg-brand-orange px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
                    disabled={pending}
                    onClick={() => saveEdit(ex)}
                  >
                    {pending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className={tinyBtn}
                    disabled={pending}
                    onClick={closePanels}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {(mode === "swap" && activeId === ex.id) ||
            (mode === "add" && activeId === ex.id) ? (
              <ExercisePickPanel
                title={mode === "swap" ? "Swap for…" : "Add after this…"}
                search={search}
                setSearch={setSearch}
                filtered={filtered}
                pending={pending}
                fieldClass={fieldClass}
                tinyBtn={tinyBtn}
                onPick={pickCatalogExercise}
                onResolve={() => void resolveAndPick()}
                onCancel={closePanels}
              />
            ) : null}
          </li>
        ))}
      </ul>

      {mode === "add" && activeId === null ? (
        <ExercisePickPanel
          title="Add exercise"
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          pending={pending}
          fieldClass={fieldClass}
          tinyBtn={tinyBtn}
          onPick={pickCatalogExercise}
          onResolve={() => void resolveAndPick()}
          onCancel={closePanels}
        />
      ) : (
        <button
          type="button"
          className={`${tinyBtn} mt-3`}
          disabled={pending}
          onClick={() => openAdd(null)}
        >
          Add exercise
        </button>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 font-sans text-xs text-red-800"
        >
          {error}
        </p>
      ) : null}
    </article>
  );
}

function ExercisePickPanel(props: {
  title: string;
  search: string;
  setSearch: (v: string) => void;
  filtered: Exercise[];
  pending: boolean;
  fieldClass: string;
  tinyBtn: string;
  onPick: (ex: Exercise) => void;
  onResolve: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 space-y-2 border border-brand-orange/25 bg-brand-orange/5 p-3">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
        {props.title}
      </p>
      <input
        type="search"
        value={props.search}
        onChange={(e) => props.setSearch(e.target.value)}
        placeholder="Search catalog or type a name…"
        className={props.fieldClass}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-brand-orange px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
          disabled={props.pending || props.search.trim().length < 2}
          onClick={props.onResolve}
        >
          {props.pending ? "Looking up…" : "Look up with AI"}
        </button>
        <button
          type="button"
          className={props.tinyBtn}
          disabled={props.pending}
          onClick={props.onCancel}
        >
          Cancel
        </button>
      </div>
      <ul className="max-h-48 overflow-y-auto border border-brand-ink/10 bg-surface-elevated">
        {props.filtered.length === 0 ? (
          <li className="px-3 py-2 font-sans text-xs text-brand-muted">
            No catalog matches. Try Look up with AI.
          </li>
        ) : (
          props.filtered.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-brand-orange/10"
                disabled={props.pending}
                onClick={() => props.onPick(ex)}
              >
                <span className="font-sans text-sm font-semibold text-brand-ink">
                  {ex.name}
                </span>
                <span className="font-sans text-xs text-brand-muted">
                  {ex.category} · {ex.equipment?.replace(/_/g, " ") ?? "any"}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
