import { buildExercisePrescription } from "./prescription";
import { suggestProgression } from "./progression";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("suggestProgression", () => {
  it("bumps weight ~10% when last sets felt easy", () => {
    const tip = suggestProgression("ex-1", [
      { weight_lb: 135, reps: 8, difficulty: 2, set_number: 1 },
      { weight_lb: 135, reps: 8, difficulty: 2, set_number: 2 },
      { weight_lb: 135, reps: 8, difficulty: 1, set_number: 3 },
    ]);
    assert.ok(tip);
    assert.equal(tip.suggestedWeightLb, 150);
    assert.equal(tip.lastWeightLb, 135);
    assert.equal(tip.lastReps, 8);
  });

  it("holds weight when last session is over 10 days ago", () => {
    const tip = suggestProgression(
      "ex-1",
      [
        { weight_lb: 135, reps: 8, difficulty: 1, set_number: 1 },
        { weight_lb: 135, reps: 8, difficulty: 1, set_number: 2 },
      ],
      {
        lastSessionAt: "2026-01-01T12:00:00.000Z",
        now: new Date("2026-01-20T12:00:00.000Z"),
      },
    );
    assert.ok(tip);
    assert.equal(tip.heldForMissedWeek, true);
    assert.equal(tip.suggestedWeightLb, 135);
    assert.equal(tip.suggestedReps, 8);
    assert.match(tip.message, /10 days/i);
  });
});

describe("buildExercisePrescription", () => {
  it("merges progression targets with plan set-style coaching copy", () => {
    const rx = buildExercisePrescription({
      exerciseId: "ex-1",
      exerciseName: "Barbell Bench Press",
      setStyle: "hypertrophy",
      baselineWeightLb: 115,
      baselineReps: 10,
      repMin: 8,
      repMax: 12,
      recentSets: [
        { weight_lb: 135, reps: 8, difficulty: 2, set_number: 1 },
        { weight_lb: 135, reps: 8, difficulty: 2, set_number: 2 },
        { weight_lb: 135, reps: 8, difficulty: 1, set_number: 3 },
      ],
    });

    assert.equal(rx.source, "progression");
    assert.equal(rx.targetWeightLb, 150);
    assert.match(rx.message, /135/i);
    assert.match(rx.message, /150/);
    assert.match(rx.message, /hypertrophy/i);
    assert.equal(rx.suggestion?.suggestedWeightLb, 150);
  });

  it("falls back to baseline when there is no history", () => {
    const rx = buildExercisePrescription({
      exerciseId: "ex-2",
      exerciseName: "Romanian Deadlift",
      setStyle: "strength_heavy",
      baselineWeightLb: 185,
      baselineReps: 5,
      repMin: 3,
      repMax: 6,
      recentSets: [],
    });

    assert.equal(rx.source, "baseline");
    assert.equal(rx.targetWeightLb, 185);
    assert.equal(rx.targetReps, 5);
    assert.match(rx.message, /baseline/i);
    assert.equal(rx.suggestion, null);
  });

  it("does not invent different load math than suggestProgression", () => {
    const sets = [
      { weight_lb: 200, reps: 5, difficulty: 5, set_number: 1 },
      { weight_lb: 200, reps: 4, difficulty: 5, set_number: 2 },
    ];
    const tip = suggestProgression("ex-3", sets);
    const rx = buildExercisePrescription({
      exerciseId: "ex-3",
      exerciseName: "Squat",
      setStyle: "strength_heavy",
      baselineWeightLb: 225,
      baselineReps: 5,
      repMin: 3,
      repMax: 6,
      recentSets: sets,
    });

    assert.ok(tip);
    assert.equal(rx.targetWeightLb, tip.suggestedWeightLb);
  });

  it("holds load with hold_stale when last session is over 10 days ago", () => {
    const rx = buildExercisePrescription({
      exerciseId: "ex-stale",
      exerciseName: "Bench Press",
      setStyle: "hypertrophy",
      baselineWeightLb: 115,
      baselineReps: 10,
      repMin: 8,
      repMax: 12,
      recentSets: [
        { weight_lb: 135, reps: 8, difficulty: 1, set_number: 1 },
      ],
      lastSessionAt: "2026-01-01T12:00:00.000Z",
      now: new Date("2026-01-20T12:00:00.000Z"),
    });
    assert.equal(rx.source, "hold_stale");
    assert.equal(rx.targetWeightLb, 135);
    assert.equal(rx.suggestion?.heldForMissedWeek, true);
  });

  it("coaches bodyweight work from sets and reps with no load", () => {
    const rx = buildExercisePrescription({
      exerciseId: "ex-push",
      exerciseName: "Push-Up",
      setStyle: "hypertrophy",
      baselineWeightLb: null,
      baselineReps: 12,
      repMin: 8,
      repMax: 15,
      plannedSets: 3,
      repsBased: true,
      recentSets: [
        { weight_lb: null, reps: 12, difficulty: 2, set_number: 1 },
        { weight_lb: null, reps: 12, difficulty: 1, set_number: 2 },
        { weight_lb: null, reps: 11, difficulty: 2, set_number: 3 },
      ],
    });
    assert.equal(rx.source, "progression");
    assert.equal(rx.targetWeightLb, null);
    assert.equal(rx.targetReps, 14);
    assert.equal(rx.targetSets, 3);
    assert.match(rx.message, /3×1[12]/);
    assert.doesNotMatch(rx.message, /lb/i);
  });

  it("uses a bodyweight baseline of reps and sets when there is no history", () => {
    const rx = buildExercisePrescription({
      exerciseId: "ex-push-base",
      exerciseName: "Push-Up",
      setStyle: "hypertrophy",
      baselineWeightLb: null,
      baselineReps: 10,
      repMin: 8,
      repMax: 12,
      plannedSets: 4,
      repsBased: true,
      recentSets: [],
    });
    assert.equal(rx.source, "baseline");
    assert.equal(rx.targetWeightLb, null);
    assert.equal(rx.targetReps, 10);
    assert.equal(rx.targetSets, 4);
    assert.match(rx.message, /4×10/);
  });
});

describe("suggestProgression bodyweight", () => {
  it("adds reps when bodyweight sets felt easy", () => {
    const tip = suggestProgression("ex-push", [
      { weight_lb: null, reps: 10, difficulty: 2, set_number: 1 },
      { weight_lb: null, reps: 10, difficulty: 1, set_number: 2 },
      { weight_lb: null, reps: 10, difficulty: 2, set_number: 3 },
    ]);
    assert.ok(tip);
    assert.equal(tip.suggestedWeightLb, null);
    assert.equal(tip.suggestedReps, 12);
    assert.equal(tip.suggestedSets, 3);
    assert.equal(tip.lastSets, 3);
  });

  it("adds a set when high-rep bodyweight work felt easy", () => {
    const tip = suggestProgression("ex-push-hi", [
      { weight_lb: null, reps: 16, difficulty: 1, set_number: 1 },
      { weight_lb: null, reps: 16, difficulty: 2, set_number: 2 },
      { weight_lb: null, reps: 15, difficulty: 2, set_number: 3 },
    ]);
    assert.ok(tip);
    assert.equal(tip.suggestedSets, 4);
    assert.equal(tip.suggestedWeightLb, null);
  });
});
