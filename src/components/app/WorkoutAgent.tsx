"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type {
  Exercise,
  PreferredSplit,
  TrainingEquipment,
  TrainingPreferences,
  WorkoutProgram,
  WorkoutProgramDay,
  WorkoutProgramExercise,
} from "@/lib/fitness/types";
import {
  FOCUS_MUSCLE_OPTIONS,
  PREFERRED_SPLIT_LABELS,
  TRAINING_EQUIPMENT_LABELS,
  TRAINING_EQUIPMENT_OPTIONS,
} from "@/lib/fitness/types";
import ProgramDayEditor from "@/components/app/ProgramDayEditor";

export type NestedProgramExercise = WorkoutProgramExercise & {
  exercise?: Pick<
    Exercise,
    | "id"
    | "name"
    | "category"
    | "primary_muscle"
    | "equipment"
    | "youtube_url"
  > | null;
};

export type NestedProgramDay = WorkoutProgramDay & {
  exercises: NestedProgramExercise[];
};

export type NestedWorkoutProgram = WorkoutProgram & {
  days: NestedProgramDay[];
};

type AgentMode = "view" | "wizard" | "review";

type WizardStep =
  | "days"
  | "minutes"
  | "equipment"
  | "focus"
  | "avoidances"
  | "split";

const STEPS: WizardStep[] = [
  "days",
  "minutes",
  "equipment",
  "focus",
  "avoidances",
  "split",
];

const STEP_LABELS: Record<WizardStep, string> = {
  days: "Days per week",
  minutes: "Session length",
  equipment: "Equipment",
  focus: "Focus areas",
  avoidances: "Avoidances",
  split: "Split",
};

type WorkoutAgentProps = {
  initialProgram: NestedWorkoutProgram | null;
  initialPrefs: TrainingPreferences;
  catalog?: Exercise[];
  onProgramChange?: (program: NestedWorkoutProgram | null) => void;
  onStartDay?: (day: NestedProgramDay) => void;
  runningDayId?: string | null;
};

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function WorkoutAgent({
  initialProgram,
  initialPrefs,
  catalog = [],
  onProgramChange,
  onStartDay,
  runningDayId = null,
}: WorkoutAgentProps) {
  const router = useRouter();
  const [program, setProgramState] = useState<NestedWorkoutProgram | null>(
    initialProgram,
  );

  function setProgram(next: NestedWorkoutProgram | null) {
    setProgramState(next);
    onProgramChange?.(next);
  }
  const [mode, setMode] = useState<AgentMode>(
    initialProgram ? "view" : "wizard",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [daysPerWeek, setDaysPerWeek] = useState(
    initialPrefs.days_per_week ?? 3,
  );
  const [sessionMinutes, setSessionMinutes] = useState(
    initialPrefs.session_minutes ?? 45,
  );
  const [equipment, setEquipment] = useState<TrainingEquipment[]>(
    (initialPrefs.equipment.filter((item): item is TrainingEquipment =>
      (TRAINING_EQUIPMENT_OPTIONS as readonly string[]).includes(item),
    ) as TrainingEquipment[]) ?? [],
  );
  const [focusMuscles, setFocusMuscles] = useState<string[]>(
    initialPrefs.focus_muscles ?? [],
  );
  const [avoidances, setAvoidances] = useState(
    initialPrefs.avoidances ?? "",
  );
  const [preferredSplit, setPreferredSplit] = useState<PreferredSplit>(
    initialPrefs.preferred_split ?? "ai_choose",
  );
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusFocus, setBonusFocus] = useState("");
  const [bonusMinutes, setBonusMinutes] = useState(
    initialPrefs.session_minutes ?? 45,
  );

  useEffect(() => {
    setProgramState(initialProgram);
    if (initialProgram && mode === "view") {
      // keep view
    } else if (!initialProgram && mode === "view") {
      setMode("wizard");
    }
    // Only sync when server props change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProgram]);

  const step = STEPS[stepIndex] ?? "days";
  const isLastStep = stepIndex >= STEPS.length - 1;

  const scheduledDays = useMemo(() => {
    if (!program?.days) return [];
    return [...program.days]
      .filter((d) => (d.day_kind ?? "scheduled") === "scheduled")
      .sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0))
      .map((day) => ({
        ...day,
        exercises: [...(day.exercises ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));
  }, [program]);

  const bonusDays = useMemo(() => {
    if (!program?.days) return [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = weekAgo.toISOString().slice(0, 10);
    return [...program.days]
      .filter((d) => d.day_kind === "bonus")
      .filter((d) => !d.scheduled_date || d.scheduled_date >= cutoff)
      .sort((a, b) =>
        String(b.scheduled_date ?? "").localeCompare(
          String(a.scheduled_date ?? ""),
        ),
      )
      .map((day) => ({
        ...day,
        exercises: [...(day.exercises ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));
  }, [program]);

  const todayDay = useMemo(() => {
    if (scheduledDays.length === 0) return null;
    const idx = new Date().getDay() % scheduledDays.length;
    return scheduledDays[idx] ?? scheduledDays[0] ?? null;
  }, [scheduledDays]);

  function toggleEquipment(value: TrainingEquipment) {
    setEquipment((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }

  function toggleFocus(value: string) {
    setFocusMuscles((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  }

  function startNewPlan() {
    setError(null);
    setMessage(null);
    setStepIndex(0);
    setMode("wizard");
  }

  function validateStep(): string | null {
    if (step === "days" && (daysPerWeek < 1 || daysPerWeek > 7)) {
      return "Pick 1 to 7 training days.";
    }
    if (step === "minutes" && (sessionMinutes < 5 || sessionMinutes > 180)) {
      return "Session length should be between 5 and 180 minutes.";
    }
    if (step === "equipment" && equipment.length === 0) {
      return "Select at least one equipment option.";
    }
    return null;
  }

  function goNext() {
    const issue = validateStep();
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    if (isLastStep) {
      generatePlan();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    if (stepIndex === 0) {
      if (program) setMode("view");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function savePrefs(): Promise<boolean> {
    const res = await fetch("/api/app/fitness-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days_per_week: daysPerWeek,
        session_minutes: sessionMinutes,
        equipment,
        focus_muscles: focusMuscles,
        avoidances: avoidances.trim() || null,
        preferred_split: preferredSplit,
      }),
    });
    const raw = await res.text();
    const json = parseJsonSafe<{ ok?: boolean; error?: string }>(raw);
    if (!res.ok || !json?.ok) {
      setError(json?.error ?? "Could not save training preferences.");
      return false;
    }
    return true;
  }

  async function requestPlan(): Promise<NestedWorkoutProgram | null> {
    const res = await fetch("/api/app/workout/plan", { method: "POST" });
    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();

    if (
      !contentType.includes("application/json") ||
      raw.trimStart().startsWith("<!")
    ) {
      setError(
        res.status === 504 || res.status === 408
          ? "Workout generation timed out. Please try again in a moment."
          : `Workout request failed (${res.status || "unknown"}). Try again, or check that GEMINI_API_KEY is set.`,
      );
      return null;
    }

    const json = parseJsonSafe<{
      ok?: boolean;
      program?: NestedWorkoutProgram;
      error?: string;
    }>(raw);

    if (!res.ok || !json?.ok || !json.program) {
      setError(json?.error ?? "Could not generate a workout program.");
      return null;
    }
    return json.program;
  }

  function generatePlan() {
    const hasCustom = (program?.days ?? []).some((d) => Boolean(d.customized_at));
    if (program && hasCustom) {
      const ok = window.confirm(
        "Replace your customizations? Building a new plan archives the current program and discards day edits.",
      );
      if (!ok) return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const saved = await savePrefs();
      if (!saved) return;

      const next = await requestPlan();
      if (!next) return;

      setProgram(next);
      setMode("review");
      setMessage("Review your plan, then use it or regenerate.");
      router.refresh();
    });
  }

  function regenerate() {
    const hasCustom = (program?.days ?? []).some((d) => Boolean(d.customized_at));
    if (hasCustom) {
      const ok = window.confirm(
        "Replace your customizations? Regenerating builds a new AI draft and discards edits on this plan.",
      );
      if (!ok) return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      // Prefs already saved; regenerate with current stored prefs.
      const next = await requestPlan();
      if (!next) return;
      setProgram(next);
      setMode("review");
      setMessage("New plan ready. Customize freely, then use it or regenerate again.");
      router.refresh();
    });
  }

  function updateDay(nextDay: NestedProgramDay) {
    if (!program) return;
    setProgram({
      ...program,
      days: program.days.map((d) => (d.id === nextDay.id ? nextDay : d)),
    });
  }

  function requestBonus(replaceExisting = false) {
    if (!program) {
      setError("Build a workout plan first, then you can add an extra session.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/app/workout/plan/bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus_hint: bonusFocus.trim() || undefined,
          minutes: bonusMinutes,
          replace_existing: replaceExisting,
        }),
      });
      const raw = await res.text();
      const json = parseJsonSafe<{
        ok?: boolean;
        error?: string;
        code?: string;
        bonusDay?: NestedProgramDay;
        note?: string;
      }>(raw);

      if (res.status === 409 && json?.code === "bonus_exists") {
        const ok = window.confirm(
          "You already have an extra session for today. Replace that draft bonus?",
        );
        if (ok) {
          requestBonus(true);
        }
        return;
      }

      if (!res.ok || !json?.ok || !json.bonusDay) {
        setError(json?.error ?? "Could not build an extra workout.");
        return;
      }

      setProgram({
        ...program,
        days: [
          ...program.days.filter(
            (d) =>
              d.id !== json.bonusDay!.id &&
              !(
                d.day_kind === "bonus" &&
                d.scheduled_date &&
                d.scheduled_date === json.bonusDay!.scheduled_date
              ),
          ),
          json.bonusDay,
        ],
      });
      setBonusOpen(false);
      setBonusFocus("");
      setMessage(
        json.note ??
          `Extra session ready. Your ${program.days_per_week ?? scheduledDays.length}-day plan is unchanged.`,
      );
      router.refresh();
    });
  }

  function useThisPlan() {
    setError(null);
    setMessage("Plan is active. Customize any day, then start when you are ready.");
    setMode("view");
    router.refresh();
  }

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";
  const chipBase =
    "border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] transition-colors";
  const primaryBtn =
    "inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
  const secondaryBtn =
    "inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

  function renderPlanDays(cta?: ReactNode) {
    if (!program) return null;
    return (
      <div className="space-y-4">
        {program.summary ? (
          <p className="border border-brand-orange/30 bg-brand-orange/5 p-4 font-sans text-sm leading-relaxed text-brand-ink">
            {program.summary}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {cta}
          <span className="font-sans text-xs text-brand-muted">
            {program.days_per_week ?? scheduledDays.length} days
            {program.session_minutes
              ? ` · ~${program.session_minutes} min`
              : ""}
            {program.primary_goal
              ? ` · ${program.primary_goal.replace(/_/g, " ")}`
              : ""}
          </span>
        </div>

        <p className="font-sans text-sm text-brand-muted">
          The AI draft is a starting point. Swap, edit, add, or remove exercises
          anytime. Your runner always uses this customized list.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          {scheduledDays.map((day) => (
            <ProgramDayEditor
              key={day.id}
              day={day}
              catalog={catalog}
              running={runningDayId === day.id}
              onStartDay={mode === "view" ? onStartDay : undefined}
              onDayChange={updateDay}
              allowRegenerate
            />
          ))}
        </div>

        {mode === "view" ? (
          <div className="space-y-3 border border-brand-ink/10 bg-surface-elevated p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg text-brand-ink">
                  Extras this week
                </h3>
                <p className="font-sans text-xs text-brand-muted">
                  Bonus sessions sit beside your mapped plan. They do not
                  renumber days or change tomorrow&apos;s workout.
                </p>
              </div>
              <button
                type="button"
                className={secondaryBtn}
                disabled={pending}
                onClick={() => {
                  setBonusOpen((open) => !open);
                  setError(null);
                }}
              >
                Add an extra workout
              </button>
            </div>

            {bonusOpen ? (
              <div className="space-y-3 border border-brand-orange/25 bg-brand-orange/5 p-3">
                <p className="font-sans text-sm text-brand-ink">
                  Optional focus and duration for today&apos;s extra session.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Focus hint (optional)
                    <input
                      className={fieldClass}
                      value={bonusFocus}
                      onChange={(e) => setBonusFocus(e.target.value)}
                      placeholder="e.g. core, arms, easy conditioning"
                    />
                  </label>
                  <label className={labelClass}>
                    Minutes
                    <input
                      className={fieldClass}
                      type="number"
                      min={5}
                      max={180}
                      value={bonusMinutes}
                      onChange={(e) =>
                        setBonusMinutes(Number(e.target.value) || 45)
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={pending}
                    onClick={() => requestBonus(false)}
                  >
                    {pending ? "Building extra…" : "Generate extra session"}
                  </button>
                  <button
                    type="button"
                    className={secondaryBtn}
                    disabled={pending}
                    onClick={() => setBonusOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {bonusDays.length === 0 ? (
              <p className="font-sans text-sm text-brand-muted">
                No extras yet this week.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {bonusDays.map((day) => (
                  <div key={day.id} className="space-y-2">
                    <p className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">
                      Extra session
                      {day.scheduled_date ? ` · ${day.scheduled_date}` : ""}
                      {" - "}
                      your {program.days_per_week ?? scheduledDays.length}-day
                      plan is unchanged
                    </p>
                    <ProgramDayEditor
                      day={day}
                      catalog={catalog}
                      running={runningDayId === day.id}
                      onStartDay={onStartDay}
                      onDayChange={updateDay}
                      allowRegenerate={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-sans text-sm text-brand-muted">{message}</p>
      ) : null}

      {mode === "view" && program ? (
        runningDayId ? (
          <section className="border border-brand-ink/10 bg-surface-elevated px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
                  Plan minimized
                </p>
                <p className="font-sans text-sm text-brand-ink">
                  Running{" "}
                  <span className="font-semibold">
                    {scheduledDays.find((d) => d.id === runningDayId)?.label ??
                      bonusDays.find((d) => d.id === runningDayId)?.label ??
                      "workout"}
                  </span>
                  . Other days are hidden so you can focus.
                </p>
              </div>
              <a
                href="#log-workout"
                className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              >
                Jump to session
              </a>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {todayDay && onStartDay ? (
                <button
                  type="button"
                  onClick={() => onStartDay(todayDay)}
                  className={primaryBtn}
                >
                  Start today’s workout ({todayDay.label})
                </button>
              ) : (
                <a href="#log-workout" className={primaryBtn}>
                  Log freeform workout
                </a>
              )}
              <button
                type="button"
                onClick={startNewPlan}
                disabled={pending}
                className={secondaryBtn}
              >
                Build new plan
              </button>
            </div>
            <h2 className="font-display text-xl text-brand-ink">
              Your active program
            </h2>
            <p className="font-sans text-sm text-brand-muted">
              Customize any day, then tap Start to run it with baselines and
              set-by-set coaching.
            </p>
            {renderPlanDays()}
          </section>
        )
      ) : null}

      {mode === "view" && !program ? (
        <section className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
          <h2 className="font-display text-xl text-brand-ink">
            Workout Agent
          </h2>
          <p className="font-sans text-sm text-brand-muted">
            Answer a few quick questions and we will build a training plan
            matched to your goal and equipment.
          </p>
          <button type="button" onClick={startNewPlan} className={primaryBtn}>
            Build my plan
          </button>
        </section>
      ) : null}

      {mode === "wizard" ? (
        <section className="space-y-5 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
          <div className="space-y-1">
            <p className="eyebrow text-brand-orange">Workout Agent</p>
            <h2 className="font-display text-xl text-brand-ink">
              {STEP_LABELS[step]}
            </h2>
            <p className="font-sans text-xs text-brand-muted">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>

          <div className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-1 flex-1 ${
                  i <= stepIndex ? "bg-brand-orange" : "bg-brand-ink/10"
                }`}
              />
            ))}
          </div>

          {step === "days" ? (
            <div>
              <label htmlFor="days-per-week" className={labelClass}>
                How many days per week can you train?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDaysPerWeek(n)}
                    className={`${chipBase} ${
                      daysPerWeek === n
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === "minutes" ? (
            <div>
              <label htmlFor="session-minutes" className={labelClass}>
                Minutes per session
              </label>
              <input
                id="session-minutes"
                type="number"
                min={5}
                max={180}
                step={5}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
                className={fieldClass}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[30, 45, 60, 75].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSessionMinutes(n)}
                    className={`${chipBase} ${
                      sessionMinutes === n
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                    }`}
                  >
                    {n} min
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === "equipment" ? (
            <div>
              <p className={labelClass}>Where / what can you train with?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAINING_EQUIPMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleEquipment(opt)}
                    className={`${chipBase} ${
                      equipment.includes(opt)
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                    }`}
                  >
                    {TRAINING_EQUIPMENT_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === "focus" ? (
            <div>
              <p className={labelClass}>
                Focus muscles or areas (optional)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOCUS_MUSCLE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleFocus(opt)}
                    className={`${chipBase} ${
                      focusMuscles.includes(opt)
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === "avoidances" ? (
            <div>
              <label htmlFor="avoidances" className={labelClass}>
                Anything to avoid? (optional)
              </label>
              <textarea
                id="avoidances"
                rows={3}
                value={avoidances}
                onChange={(e) => setAvoidances(e.target.value)}
                placeholder="e.g. no overhead pressing, sensitive left knee, skip burpees"
                className={fieldClass}
              />
            </div>
          ) : null}

          {step === "split" ? (
            <div>
              <p className={labelClass}>Preferred split</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(Object.keys(PREFERRED_SPLIT_LABELS) as PreferredSplit[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPreferredSplit(opt)}
                      className={`border px-4 py-3 text-left font-sans text-sm ${
                        preferredSplit === opt
                          ? "border-brand-orange bg-brand-orange/10 text-brand-ink"
                          : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                      }`}
                    >
                      <span className="font-semibold">
                        {PREFERRED_SPLIT_LABELS[opt]}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              className={secondaryBtn}
            >
              {stepIndex === 0 && program ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={pending}
              className={primaryBtn}
            >
              {pending
                ? "Building plan…"
                : isLastStep
                  ? "Generate plan"
                  : "Next"}
            </button>
          </div>
        </section>
      ) : null}

      {mode === "review" && program ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="eyebrow text-brand-orange">Review</p>
            <h2 className="font-display text-xl text-brand-ink">
              Your proposed program
            </h2>
            <p className="font-sans text-sm text-brand-muted">
              This plan is saved as your active program. Confirm it, regenerate,
              or tweak preferences.
            </p>
          </div>
          {renderPlanDays(
            <>
              <button
                type="button"
                onClick={useThisPlan}
                disabled={pending}
                className={primaryBtn}
              >
                Use this plan
              </button>
              <button
                type="button"
                onClick={regenerate}
                disabled={pending}
                className={secondaryBtn}
              >
                {pending ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={startNewPlan}
                disabled={pending}
                className={secondaryBtn}
              >
                Edit preferences
              </button>
            </>,
          )}
        </section>
      ) : null}
    </div>
  );
}
