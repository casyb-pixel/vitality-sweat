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

type RunnerExerciseEditSheetProps = {
  day: NestedProgramDay;
  exercise: NestedProgramExercise;
  catalog: Exercise[];
  onClose: () => void;
  onDayChange: (day: NestedProgramDay) => void;
};

function normalizeJoin(
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

/**
 * Compact mid-session edit sheet: swap, tweak prescription, or remove.
 * Keeps the runner focused; does not show the full day list.
 */
export default function RunnerExerciseEditSheet({
  day,
  exercise,
  catalog,
  onClose,
  onDayChange,
}: RunnerExerciseEditSheetProps) {
  const [tab, setTab] = useState<"edit" | "swap">("edit");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    sets: String(exercise.sets),
    rep_min: exercise.rep_min != null ? String(exercise.rep_min) : "",
    rep_max: exercise.rep_max != null ? String(exercise.rep_max) : "",
    rest_sec: exercise.rest_sec != null ? String(exercise.rest_sec) : "",
    set_style: (exercise.set_style in WORKOUT_SET_STYLE_LABELS
      ? exercise.set_style
      : "hypertrophy") as WorkoutSetStyle,
    coach_notes: exercise.coach_notes ?? "",
  });

  const filtered = useMemo(
    () => filterExercises(catalog, { query: search }).slice(0, 24),
    [catalog, search],
  );

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-white px-3 py-2 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";
  const tinyBtn =
    "inline-flex min-h-9 items-center justify-center border border-brand-ink/15 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";
  const primaryBtn =
    "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] text-white hover:bg-brand-orange-deep disabled:opacity-60";

  function patchExercises(
    next: NestedProgramExercise[],
    customizedAt?: string | null,
  ) {
    onDayChange({
      ...day,
      customized_at: customizedAt ?? day.customized_at ?? new Date().toISOString(),
      exercises: next.map((ex, i) => ({ ...ex, sort_order: i })),
    });
  }

  function saveEdit() {
    const sets = Number(draft.sets);
    const repMin = draft.rep_min === "" ? null : Number(draft.rep_min);
    const repMax = draft.rep_max === "" ? null : Number(draft.rep_max);
    const restSec = draft.rest_sec === "" ? null : Number(draft.rest_sec);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/exercises/${exercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets,
          rep_min: repMin,
          rep_max: repMax,
          rest_sec: restSec,
          set_style: draft.set_style,
          coach_notes: draft.coach_notes.trim() || null,
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
      patchExercises(
        (day.exercises ?? []).map((row) =>
          row.id === exercise.id
            ? {
                ...row,
                ...json.exercise!,
                exercise:
                  normalizeJoin(json.exercise!.exercise) ?? row.exercise,
              }
            : row,
        ),
        json.day_customized_at,
      );
      onClose();
    });
  }

  function swapTo(picked: Exercise) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/exercises/${exercise.id}`, {
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
      patchExercises(
        (day.exercises ?? []).map((row) =>
          row.id === exercise.id
            ? {
                ...row,
                ...json.exercise!,
                exercise:
                  normalizeJoin(json.exercise!.exercise) ??
                  normalizeJoin(picked),
              }
            : row,
        ),
        json.day_customized_at,
      );
      onClose();
    });
  }

  function removeExercise() {
    if (
      !window.confirm(
        `Remove ${exercise.exercise?.name ?? "this exercise"} from ${day.label}?`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/app/workout/plan/exercises/${exercise.id}`, {
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
      patchExercises(
        (day.exercises ?? []).filter((row) => row.id !== exercise.id),
        json.day_customized_at,
      );
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="runner-edit-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-brand-orange">Edit exercise</p>
            <h3
              id="runner-edit-title"
              className="font-display text-xl text-brand-ink"
            >
              {exercise.exercise?.name ?? "Exercise"}
            </h3>
          </div>
          <button type="button" className={tinyBtn} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className={`${tinyBtn} ${tab === "edit" ? "border-brand-orange text-brand-orange" : ""}`}
            onClick={() => setTab("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${tinyBtn} ${tab === "swap" ? "border-brand-orange text-brand-orange" : ""}`}
            onClick={() => setTab("swap")}
          >
            Swap
          </button>
          <button
            type="button"
            className={tinyBtn}
            disabled={pending}
            onClick={removeExercise}
          >
            Remove
          </button>
        </div>

        {tab === "edit" ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Sets
                <input
                  className={fieldClass}
                  type="number"
                  min={1}
                  value={draft.sets}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sets: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Style
                <select
                  className={fieldClass}
                  value={draft.set_style}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      set_style: e.target.value as WorkoutSetStyle,
                    }))
                  }
                >
                  {Object.entries(WORKOUT_SET_STYLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Rep min
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  value={draft.rep_min}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, rep_min: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Rep max
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  value={draft.rep_max}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, rep_max: e.target.value }))
                  }
                />
              </label>
              <label className={labelClass}>
                Rest (sec)
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  value={draft.rest_sec}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, rest_sec: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className={labelClass}>
              Coach notes
              <input
                className={fieldClass}
                value={draft.coach_notes}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, coach_notes: e.target.value }))
                }
              />
            </label>
            <button
              type="button"
              className={primaryBtn}
              disabled={pending}
              onClick={saveEdit}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className={labelClass}>
              Find replacement
              <input
                className={fieldClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalog"
              />
            </label>
            <ul className="max-h-56 divide-y divide-brand-ink/10 overflow-y-auto border border-brand-ink/10">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left font-sans text-sm hover:bg-brand-orange/5"
                    disabled={pending}
                    onClick={() => swapTo(ex)}
                  >
                    <span className="font-semibold text-brand-ink">
                      {ex.name}
                    </span>
                    <span className="text-xs text-brand-muted">
                      {ex.primary_muscle ?? ex.equipment}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error ? (
          <p className="mt-3 font-sans text-xs text-red-700">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
