import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  exercisesToInsert,
  isSyntheticProgramDayId,
  resolveRepeatTargetDayId,
  sessionExercisesFromSets,
  suggestedScheduledDay,
} from "./save-session-to-day";

describe("isSyntheticProgramDayId", () => {
  it("skips paired invite days", () => {
    assert.equal(isSyntheticProgramDayId("paired-abc"), true);
    assert.equal(isSyntheticProgramDayId("real-uuid"), false);
    assert.equal(isSyntheticProgramDayId(null), false);
  });
});

describe("sessionExercisesFromSets", () => {
  it("seeds an empty day from logged working sets in first-seen order", () => {
    const drafts = sessionExercisesFromSets([
      { exercise_id: "bench", set_kind: "warmup", reps: 10 },
      { exercise_id: "bench", set_kind: "working", reps: 8 },
      { exercise_id: "bench", set_kind: "working", reps: 6 },
      { exercise_id: "row", set_kind: "working", reps: 10 },
      { exercise_id: "row", set_kind: "working", reps: 10 },
      { exercise_id: "row", set_kind: "working", reps: 12 },
    ]);
    assert.deepEqual(drafts, [
      { exercise_id: "bench", sets: 2, rep_min: 6, rep_max: 8 },
      { exercise_id: "row", sets: 3, rep_min: 10, rep_max: 12 },
    ]);
  });

  it("treats missing set_kind as working and ignores warmup-only exercises", () => {
    const drafts = sessionExercisesFromSets([
      { exercise_id: "curl", set_kind: "warmup", reps: 12 },
      { exercise_id: "press", reps: 8 },
      { exercise_id: "press", set_kind: null, reps: 9 },
    ]);
    assert.deepEqual(drafts, [
      { exercise_id: "press", sets: 2, rep_min: 8, rep_max: 9 },
    ]);
  });

  it("returns no drafts when there are no sets", () => {
    assert.deepEqual(sessionExercisesFromSets([]), []);
  });

  it("clamps set count to 12", () => {
    const sets = Array.from({ length: 15 }, () => ({
      exercise_id: "squat",
      set_kind: "working" as const,
      reps: 5,
    }));
    const drafts = sessionExercisesFromSets(sets);
    assert.equal(drafts[0]?.sets, 12);
  });
});

describe("exercisesToInsert", () => {
  it("keeps existing movements and only appends new ones", () => {
    const logged = sessionExercisesFromSets([
      { exercise_id: "bench", set_kind: "working", reps: 8 },
      { exercise_id: "fly", set_kind: "working", reps: 12 },
    ]);
    const toAdd = exercisesToInsert(logged, ["bench", "row"]);
    assert.deepEqual(toAdd, [
      { exercise_id: "fly", sets: 1, rep_min: 12, rep_max: 12 },
    ]);
  });
});

describe("suggestedScheduledDay", () => {
  it("picks by calendar weekday among scheduled days", () => {
    const days = [
      { id: "d0", day_kind: "scheduled" as const },
      { id: "d1", day_kind: "scheduled" as const },
      { id: "bonus", day_kind: "bonus" as const },
    ];
    const sunday = new Date("2026-09-06T15:00:00");
    assert.equal(suggestedScheduledDay(days, sunday)?.id, "d0");
  });
});

describe("resolveRepeatTargetDayId", () => {
  const days = [
    { id: "push", day_kind: "scheduled" as const },
    { id: "pull", day_kind: "scheduled" as const },
  ];

  it("uses the session day when it still exists on the active split", () => {
    assert.equal(
      resolveRepeatTargetDayId({
        sessionProgramDayId: "pull",
        activeDays: days,
      }),
      "pull",
    );
  });

  it("falls back to today's scheduled day when the session was freeform", () => {
    const sunday = new Date("2026-09-06T15:00:00");
    assert.equal(
      resolveRepeatTargetDayId({
        sessionProgramDayId: null,
        activeDays: days,
        now: sunday,
      }),
      "push",
    );
  });

  it("is a no-op without a program day or active split", () => {
    assert.equal(
      resolveRepeatTargetDayId({
        sessionProgramDayId: null,
        activeDays: [],
      }),
      null,
    );
    assert.equal(
      resolveRepeatTargetDayId({
        sessionProgramDayId: "paired-x",
        activeDays: days,
        now: new Date("2026-09-06T15:00:00"),
      }),
      "push",
    );
  });
});
