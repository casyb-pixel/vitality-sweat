"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_EQUIPMENT_OPTIONS,
  filterExercises,
} from "@/lib/fitness/exercises";
import {
  fetchExerciseSuggestion,
  finishWorkoutSession,
  logWorkoutSet,
  startWorkoutSession,
} from "@/lib/fitness/workout-logging";
import InviteFriendsPrompt from "@/components/auth/InviteFriendsPrompt";
import MilestoneCelebrate from "@/components/app/MilestoneCelebrate";
import WorkoutRestCoach from "@/components/app/WorkoutRestCoach";
import ExerciseHowToSheet from "@/components/app/ExerciseHowToSheet";
import type { WorkoutMilestone } from "@/lib/fitness/milestones";
import {
  DIFFICULTY_LABELS,
  WORKOUT_SET_KIND_LABELS,
  type Exercise,
  type ExerciseCategory,
  type ExerciseEquipment,
  type PrimaryGoal,
  type ProgressionSuggestion,
  type WorkoutSession,
  type WorkoutSet,
  type WorkoutSetKind,
} from "@/lib/fitness/types";
import PlateCalculator from "@/components/app/PlateCalculator";

type WorkoutTrackerProps = {
  exercises: Exercise[];
  initialSession: WorkoutSession | null;
  primaryGoal?: PrimaryGoal | null;
  onSessionChange?: (session: WorkoutSession | null) => void;
};

export default function WorkoutTracker({
  exercises: initialExercises,
  initialSession,
  primaryGoal = null,
  onSessionChange,
}: WorkoutTrackerProps) {
  const [catalog, setCatalog] = useState<Exercise[]>(initialExercises);
  const [session, setSessionState] = useState<WorkoutSession | null>(
    initialSession,
  );
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [equipment, setEquipment] = useState<ExerciseEquipment | "">("");
  const [category, setCategory] = useState<ExerciseCategory | "">("");
  const [search, setSearch] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [weightLb, setWeightLb] = useState("");
  const [reps, setReps] = useState("10");
  const [durationSec, setDurationSec] = useState("");
  const [distanceM, setDistanceM] = useState("");
  const [setKind, setSetKind] = useState<WorkoutSetKind>("working");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [lastWorking, setLastWorking] = useState<{
    weightLb: string;
    reps: string;
    durationSec: string;
    distanceM: string;
  } | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [setNumber, setSetNumber] = useState(1);
  const [loggedSets, setLoggedSets] = useState<WorkoutSet[]>([]);
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState(false);
  const [resolveChoices, setResolveChoices] = useState<Exercise[]>([]);
  const [restTrigger, setRestTrigger] = useState(0);
  const [milestone, setMilestone] = useState<WorkoutMilestone | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  function setSession(next: WorkoutSession | null) {
    setSessionState(next);
    onSessionChange?.(next);
  }

  useEffect(() => {
    setSessionState(initialSession);
  }, [initialSession]);

  const selected = useMemo(
    () => catalog.find((e) => e.id === exerciseId) ?? null,
    [catalog, exerciseId],
  );

  const filtered = useMemo(
    () =>
      filterExercises(catalog, {
        query: search,
        equipment,
        category,
      }).slice(0, 40),
    [catalog, search, equipment, category],
  );

  const loadHistory = useCallback(async (id: string) => {
    if (!id) {
      setSuggestion(null);
      return;
    }
    const result = await fetchExerciseSuggestion(id);
    if (!result.ok) {
      setSuggestion(null);
      return;
    }
    setSuggestion(result.data.suggestion);
    if (result.data.suggestion?.suggestedWeightLb != null) {
      setWeightLb(String(result.data.suggestion.suggestedWeightLb));
    }
    if (result.data.suggestion?.suggestedReps != null) {
      setReps(String(result.data.suggestion.suggestedReps));
    }
    const last = result.data.sets?.[result.data.sets.length - 1];
    if (last) {
      setLastWorking({
        weightLb: last.weight_lb != null ? String(last.weight_lb) : "",
        reps: last.reps != null ? String(last.reps) : "",
        durationSec: last.duration_sec != null ? String(last.duration_sec) : "",
        distanceM: last.distance_m != null ? String(last.distance_m) : "",
      });
    }
  }, []);

  useEffect(() => {
    void loadHistory(exerciseId);
  }, [exerciseId, loadHistory]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function selectExercise(ex: Exercise, note?: string) {
    setCatalog((prev) =>
      prev.some((p) => p.id === ex.id) ? prev : [...prev, ex].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setExerciseId(ex.id);
    setSearch(ex.name);
    setSetNumber(1);
    setPickerOpen(false);
    setResolveChoices([]);
    if (note) setMessage(note);
  }

  function startSession() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await startWorkoutSession(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(result.data.session);
      setLoggedSets([]);
      setSetNumber(1);
      setRestTrigger(0);
      setMessage(
        result.data.resumed
          ? "Resumed your active workout session."
          : "Workout started. Log your sets.",
      );
    });
  }

  function finishSession() {
    if (!session) return;
    setError(null);
    startTransition(async () => {
      const result = await finishWorkoutSession(session.id, "completed");
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSession(null);
      setLoggedSets([]);
      setSetNumber(1);
      setMessage("Workout completed. Nice work.");
      setShowInvitePrompt(true);
      void loadHistory(exerciseId);
    });
  }

  function logSet(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      setError("Start today’s workout first.");
      return;
    }
    if (!exerciseId) {
      setError("Select or look up an exercise first.");
      return;
    }
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await logWorkoutSet({
        sessionId: session.id,
        exerciseId,
        setNumber,
        weightLb: weightLb === "" ? null : Number(weightLb),
        reps: reps === "" ? null : Number(reps),
        difficulty,
        durationSec: durationSec === "" ? null : Number(durationSec),
        distanceM: distanceM === "" ? null : Number(distanceM),
        setKind,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLoggedSets((prev) => [...prev, result.data.set]);
      setSetNumber((n) => n + 1);
      setRestTrigger((n) => n + 1);
      if (result.data.milestone) {
        setMilestone(result.data.milestone);
      }
      setMessage(
        `Logged set ${result.data.set.set_number}. ${DIFFICULTY_LABELS[difficulty] ?? difficulty}.`,
      );
      setLastWorking({
        weightLb,
        reps,
        durationSec,
        distanceM,
      });
    });
  }

  async function resolveWithGemini() {
    const q = search.trim();
    if (q.length < 2) {
      setError("Type the exercise name, then tap Look up with AI.");
      return;
    }
    setError(null);
    setMessage(null);
    setResolveChoices([]);
    setResolving(true);
    try {
      const res = await fetch("/api/app/exercises/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          equipment: equipment || undefined,
          category: category || undefined,
        }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      if (
        !contentType.includes("application/json") ||
        raw.trimStart().startsWith("<!")
      ) {
        setError(
          "Exercise lookup timed out or returned an error page. Try again.",
        );
        return;
      }
      const json = JSON.parse(raw) as {
        ok?: boolean;
        created?: boolean;
        matched?: boolean;
        ambiguous?: boolean;
        reason?: string;
        exercise?: Exercise;
        candidates?: Exercise[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not resolve that exercise.");
        return;
      }

      if (json.ambiguous && json.candidates && json.candidates.length >= 2) {
        setCatalog((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          for (const c of json.candidates!) byId.set(c.id, c);
          return [...byId.values()].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
        setResolveChoices(json.candidates);
        setPickerOpen(false);
        setMessage(
          json.reason ??
            "A few library exercises could fit — pick one, or refine your search.",
        );
        return;
      }

      if (!json.exercise) {
        setError(json.error ?? "Could not resolve that exercise.");
        return;
      }
      const note = json.created
        ? `Added “${json.exercise.name}” to the library.`
        : json.reason
          ? `Using “${json.exercise.name}”. ${json.reason}`
          : `Using “${json.exercise.name}”.`;
      selectExercise(json.exercise, note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setResolving(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";
  const chipBase =
    "min-h-10 rounded-md border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {!session ? (
          <button
            type="button"
            onClick={startSession}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
          >
            {pending ? "Starting…" : "Begin today’s workout"}
          </button>
        ) : (
          <>
            <span className="rounded-full bg-brand-orange/10 px-3 py-1 font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
              Session active
            </span>
            <button
              type="button"
              onClick={finishSession}
              disabled={pending}
              className="inline-flex min-h-11 items-center justify-center border border-brand-ink/15 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
            >
              Finish workout
            </button>
          </>
        )}
      </div>

      {session ? (
        <WorkoutRestCoach
          sessionId={session.id}
          active={session.status === "active"}
          restTrigger={restTrigger}
          goal={primaryGoal}
          exerciseId={exerciseId || null}
          primaryMuscle={selected?.primary_muscle ?? null}
        />
      ) : null}

      <MilestoneCelebrate
        milestone={milestone}
        onDismiss={() => setMilestone(null)}
      />

      {showInvitePrompt ? (
        <InviteFriendsPrompt
          variant="post_workout"
          visible
          onDismiss={() => setShowInvitePrompt(false)}
        />
      ) : null}

      {suggestion ? (
        <div className="border border-brand-orange/30 bg-brand-orange/5 p-4">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
            Progression tip
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-brand-ink">
            {suggestion.message}
          </p>
          {suggestion.lastWeightLb != null ? (
            <p className="mt-1 font-sans text-xs text-brand-muted">
              Last time: {suggestion.lastWeightLb} lb × {suggestion.lastSets}{" "}
              sets
              {suggestion.lastReps != null
                ? ` of ${suggestion.lastReps}`
                : ""}{" "}
              (avg difficulty {suggestion.lastAvgDifficulty}/5)
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={logSet}
        className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6"
      >
        <fieldset>
          <legend className={labelClass}>What equipment?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEquipment("")}
              className={`${chipBase} ${
                equipment === ""
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
              }`}
            >
              Any
            </button>
            {EXERCISE_EQUIPMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEquipment(opt.value)}
                className={`${chipBase} ${
                  equipment === opt.value
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Training focus?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`${chipBase} ${
                category === ""
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
              }`}
            >
              Any
            </button>
            {EXERCISE_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`${chipBase} ${
                  category === opt.value
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div ref={pickerRef} className="relative space-y-2">
          <label htmlFor="exercise-search" className={labelClass}>
            Exercise
          </label>
          <input
            id="exercise-search"
            type="search"
            autoComplete="off"
            placeholder="Type to search — e.g. RDL, DB curl, leg press…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerOpen(true);
              setResolveChoices([]);
              if (
                selected &&
                e.target.value.trim().toLowerCase() !==
                  selected.name.toLowerCase()
              ) {
                setExerciseId("");
              }
            }}
            onFocus={() => setPickerOpen(true)}
            className={fieldClass}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void resolveWithGemini()}
              disabled={resolving || search.trim().length < 2}
              className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
            >
              {resolving ? "Looking up…" : "Look up with AI"}
            </button>
            {selected ? (
              <span className="font-sans text-xs text-brand-muted">
                Selected:{" "}
                <span className="font-semibold text-brand-ink">
                  {selected.name}
                </span>
              </span>
            ) : (
              <span className="font-sans text-xs text-brand-muted">
                Can’t find it? AI matches synonyms or asks you to choose when
                several fit.
              </span>
            )}
          </div>

          {resolveChoices.length > 0 ? (
            <div className="border border-brand-orange/35 bg-brand-orange/5 p-3">
              <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
                Did you mean…?
              </p>
              <p className="mt-1 font-sans text-sm text-brand-muted">
                Pick the exercise that matches what you’re doing, or keep
                typing if it’s something else.
              </p>
              <ul className="mt-3 space-y-1">
                {resolveChoices.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 border border-brand-ink/10 bg-surface-elevated px-3 py-2.5 text-left hover:border-brand-orange hover:bg-brand-orange/10"
                      onClick={() =>
                        selectExercise(ex, `Using “${ex.name}”.`)
                      }
                    >
                      <span className="font-sans text-sm font-semibold text-brand-ink">
                        {ex.name}
                      </span>
                      <span className="font-sans text-xs text-brand-muted">
                        {ex.category} ·{" "}
                        {ex.equipment?.replace("_", " ") ?? "—"}
                        {ex.primary_muscle ? ` · ${ex.primary_muscle}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 font-sans text-xs font-semibold text-brand-muted hover:text-brand-orange"
                onClick={() => {
                  setResolveChoices([]);
                  setPickerOpen(true);
                  setMessage(null);
                }}
              >
                None of these — I’ll keep searching
              </button>
            </div>
          ) : null}

          {pickerOpen && resolveChoices.length === 0 ? (
            <div className="z-20 max-h-64 w-full overflow-y-auto border border-brand-ink/15 bg-surface-elevated shadow-lg">
              {filtered.length === 0 ? (
                <div className="space-y-3 px-3 py-3">
                  <p className="font-sans text-sm text-brand-muted">
                    No matches in the library for these filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => void resolveWithGemini()}
                    disabled={resolving || search.trim().length < 2}
                    className="inline-flex min-h-10 w-full items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
                  >
                    {resolving ? "Looking up…" : "Look up with AI"}
                  </button>
                  <p className="font-sans text-xs text-brand-muted">
                    AI will match synonyms, offer choices when a few exercises
                    fit, or add a new library entry.
                  </p>
                </div>
              ) : (
                <ul>
                  {filtered.map((ex) => (
                    <li key={ex.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-brand-orange/10"
                        onClick={() => selectExercise(ex)}
                      >
                        <span className="font-sans text-sm font-semibold text-brand-ink">
                          {ex.name}
                        </span>
                        <span className="font-sans text-xs text-brand-muted">
                          {ex.category} ·{" "}
                          {ex.equipment?.replace("_", " ") ?? "—"}
                          {ex.primary_muscle ? ` · ${ex.primary_muscle}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {selected?.tracking_type === "duration" ? (
            <div>
              <label htmlFor="duration" className={labelClass}>
                Duration (sec)
              </label>
              <input
                id="duration"
                type="number"
                min={0}
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : selected?.tracking_type === "distance" ? (
            <div>
              <label htmlFor="distance" className={labelClass}>
                Distance (m)
              </label>
              <input
                id="distance"
                type="number"
                min={0}
                step="1"
                value={distanceM}
                onChange={(e) => setDistanceM(e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="weight" className={labelClass}>
                  Weight (lb)
                </label>
                <input
                  id="weight"
                  type="number"
                  min={0}
                  step="0.5"
                  value={weightLb}
                  onChange={(e) => setWeightLb(e.target.value)}
                  className={fieldClass}
                  placeholder={
                    selected?.tracking_type === "reps_only" ? "optional" : ""
                  }
                />
              </div>
              <div>
                <label htmlFor="reps" className={labelClass}>
                  Reps
                </label>
                <input
                  id="reps"
                  type="number"
                  min={0}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="setNumber" className={labelClass}>
              Set #
            </label>
            <input
              id="setNumber"
              type="number"
              min={1}
              value={setNumber}
              onChange={(e) => setSetNumber(Number(e.target.value) || 1)}
              className={fieldClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Set type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(WORKOUT_SET_KIND_LABELS) as WorkoutSetKind[]).map(
              (kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setSetKind(kind)}
                  className={`${chipBase} ${
                    setKind === kind
                      ? "border-brand-orange bg-brand-orange text-white"
                      : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                  }`}
                >
                  {WORKOUT_SET_KIND_LABELS[kind]}
                </button>
              ),
            )}
          </div>
        </fieldset>

        {selected ? (
          <div className="mt-2">
            <ExerciseHowToSheet exercise={selected} />
          </div>
        ) : null}

        {lastWorking ? (
          <button
            type="button"
            onClick={() => {
              setWeightLb(lastWorking.weightLb);
              setReps(lastWorking.reps);
              setDurationSec(lastWorking.durationSec);
              setDistanceM(lastWorking.distanceM);
            }}
            className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
          >
            Same as last
          </button>
        ) : null}

        {selected?.name.toLowerCase().includes("barbell") ||
        selected?.name.toLowerCase().includes("deadlift") ||
        selected?.name.toLowerCase().includes("squat") ? (
          <button
            type="button"
            onClick={() => setShowPlates((v) => !v)}
            className="block font-sans text-xs font-semibold text-brand-orange"
          >
            {showPlates ? "Hide plates" : "Plate calculator"}
          </button>
        ) : null}
        {showPlates ? (
          <PlateCalculator targetLb={Number(weightLb) || 135} />
        ) : null}

        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className="font-sans text-xs font-semibold text-brand-muted hover:text-brand-orange"
        >
          {showCustom ? "Hide custom exercise" : "Create custom exercise"}
        </button>
        {showCustom ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="My machine row"
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => {
                setSearch(customName);
                void resolveWithGemini();
              }}
              className="inline-flex min-h-10 items-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em]"
            >
              Add to library
            </button>
          </div>
        ) : null}

        <fieldset>
          <legend className={labelClass}>How did it feel?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDifficulty(n)}
                className={`min-h-11 rounded-md border px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.06em] ${
                  difficulty === n
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/15 text-brand-ink hover:border-brand-orange"
                }`}
              >
                {n} · {DIFFICULTY_LABELS[n]}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending || !session || !exerciseId}
          className="inline-flex min-h-11 items-center justify-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : "Log set"}
        </button>
      </form>

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

      {loggedSets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-brand-ink">This session</h2>
          <ul className="divide-y divide-brand-ink/10 border border-brand-ink/10 bg-surface-elevated">
            {loggedSets.map((set) => {
              const ex = catalog.find((e) => e.id === set.exercise_id);
              return (
                <li
                  key={set.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-sans text-sm"
                >
                  <span className="font-semibold text-brand-ink">
                    {ex?.name ?? "Exercise"} · set {set.set_number}
                  </span>
                  <span className="text-brand-muted">
                    {set.weight_lb != null ? `${set.weight_lb} lb × ` : ""}
                    {set.reps ?? "—"} reps ·{" "}
                    {DIFFICULTY_LABELS[set.difficulty] ?? set.difficulty}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
