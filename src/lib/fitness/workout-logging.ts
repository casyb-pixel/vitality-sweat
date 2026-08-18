import type {
  ProgressionSuggestion,
  WorkoutSession,
  WorkoutSet,
} from "@/lib/fitness/types";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function readJson<T>(res: Response): Promise<{
  status: number;
  json: T | null;
  errorPage: boolean;
}> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (
    !contentType.includes("application/json") ||
    raw.trimStart().startsWith("<!")
  ) {
    return { status: res.status, json: null, errorPage: true };
  }
  try {
    return { status: res.status, json: JSON.parse(raw) as T, errorPage: false };
  } catch {
    return { status: res.status, json: null, errorPage: true };
  }
}

export async function startWorkoutSession(
  programDayId?: string | null,
): Promise<
  ApiResult<{ session: WorkoutSession; resumed: boolean }>
> {
  const res = await fetch("/api/app/workout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      programDayId ? { program_day_id: programDayId } : {},
    ),
  });
  const { json, errorPage, status } = await readJson<{
    ok?: boolean;
    session?: WorkoutSession;
    resumed?: boolean;
    error?: string;
  }>(res);

  if (errorPage || !json) {
    return {
      ok: false,
      error:
        status === 504 || status === 408
          ? "Session request timed out. Try again."
          : "Could not start workout session.",
    };
  }
  if (!res.ok || !json.ok || !json.session) {
    return { ok: false, error: json.error ?? "Could not start workout." };
  }
  return {
    ok: true,
    data: { session: json.session, resumed: Boolean(json.resumed) },
  };
}

export async function finishWorkoutSession(
  sessionId: string,
  status: "completed" | "cancelled" = "completed",
): Promise<ApiResult<{ session: WorkoutSession }>> {
  const res = await fetch("/api/app/workout/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, status }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    session?: WorkoutSession;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.session) {
    return { ok: false, error: json.error ?? "Could not finish workout." };
  }
  return { ok: true, data: { session: json.session } };
}

export async function logWorkoutSet(input: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLb: number | null;
  reps: number | null;
  difficulty: number;
  durationSec?: number | null;
  distanceM?: number | null;
  inclinePct?: number | null;
  elevationM?: number | null;
  setKind?: string | null;
}): Promise<
  ApiResult<{
    set: WorkoutSet;
    milestone: import("@/lib/fitness/milestones").WorkoutMilestone | null;
  }>
> {
  const res = await fetch("/api/app/workout/sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: input.sessionId,
      exercise_id: input.exerciseId,
      set_number: input.setNumber,
      weight_lb: input.weightLb,
      reps: input.reps,
      difficulty: input.difficulty,
      duration_sec: input.durationSec ?? null,
      distance_m: input.distanceM ?? null,
      incline_pct: input.inclinePct ?? null,
      elevation_m: input.elevationM ?? null,
      set_kind: input.setKind ?? "working",
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    set?: WorkoutSet;
    milestone?: import("@/lib/fitness/milestones").WorkoutMilestone | null;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.set) {
    return { ok: false, error: json.error ?? "Could not log set." };
  }
  return {
    ok: true,
    data: { set: json.set, milestone: json.milestone ?? null },
  };
}

export async function fetchExerciseSuggestion(
  exerciseId: string,
): Promise<
  ApiResult<{
    suggestion: ProgressionSuggestion | null;
    sets: WorkoutSet[];
    lastSessionAt: string | null;
  }>
> {
  const res = await fetch(
    `/api/app/workout/sets?exercise_id=${encodeURIComponent(exerciseId)}`,
  );
  const json = (await res.json()) as {
    ok?: boolean;
    suggestion?: ProgressionSuggestion | null;
    sets?: WorkoutSet[];
    last_session_at?: string | null;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    return { ok: false, error: json.error ?? "Could not load history." };
  }
  return {
    ok: true,
    data: {
      suggestion: json.suggestion ?? null,
      sets: json.sets ?? [],
      lastSessionAt: json.last_session_at ?? null,
    },
  };
}

export async function fetchSessionSets(
  sessionId: string,
): Promise<ApiResult<{ sets: WorkoutSet[] }>> {
  const res = await fetch(
    `/api/app/workout/sets?session_id=${encodeURIComponent(sessionId)}`,
  );
  const json = (await res.json()) as {
    ok?: boolean;
    sets?: WorkoutSet[];
    error?: string;
  };
  if (!res.ok || !json.ok) {
    return { ok: false, error: json.error ?? "Could not load session sets." };
  }
  return { ok: true, data: { sets: json.sets ?? [] } };
}

export async function saveProgramExerciseBaseline(input: {
  id: string;
  baselineWeightLb: number | null;
  baselineReps: number;
}): Promise<
  ApiResult<{
    baseline_weight_lb: number | null;
    baseline_reps: number;
  }>
> {
  const res = await fetch("/api/app/workout/program-exercise", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      baseline_weight_lb: input.baselineWeightLb,
      baseline_reps: input.baselineReps,
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    exercise?: {
      baseline_weight_lb: number | null;
      baseline_reps: number | null;
    };
    error?: string;
  };
  if (!res.ok || !json.ok || !json.exercise) {
    return { ok: false, error: json.error ?? "Could not save baseline." };
  }
  return {
    ok: true,
    data: {
      baseline_weight_lb:
        json.exercise.baseline_weight_lb == null
          ? null
          : Number(json.exercise.baseline_weight_lb),
      baseline_reps: Number(json.exercise.baseline_reps),
    },
  };
}

export async function saveProgramExercisePrescription(input: {
  id: string;
  lastPrescription: {
    weight_lb: number | null;
    reps: number | null;
    sets?: number | null;
    set_style: string;
    message: string;
    source: string;
    updated_at: string;
  };
}): Promise<ApiResult<{ saved: true }>> {
  const res = await fetch("/api/app/workout/program-exercise", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.id,
      last_prescription: input.lastPrescription,
    }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    return { ok: false, error: json.error ?? "Could not save prescription." };
  }
  return { ok: true, data: { saved: true } };
}
