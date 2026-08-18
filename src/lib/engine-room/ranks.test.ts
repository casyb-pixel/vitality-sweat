import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  chicagoWeekStart,
  daysBetween,
  isWithinPostingGrace,
} from "./calendar";
import {
  bandFromP4p,
  bandFromReps,
  rankExercise,
  rankSessionExercises,
} from "./ranks";
import { nextStreakState } from "./streak";
import { weeklyQuests } from "./quests";

test("p4p bands hit published cutoffs", () => {
  assert.equal(bandFromP4p(0.49), null);
  assert.equal(bandFromP4p(0.5), "bronze");
  assert.equal(bandFromP4p(0.75), "silver");
  assert.equal(bandFromP4p(1), "gold");
});

test("reps bands hit published cutoffs", () => {
  assert.equal(bandFromReps(7), null);
  assert.equal(bandFromReps(8), "bronze");
  assert.equal(bandFromReps(15), "silver");
  assert.equal(bandFromReps(25), "gold");
});

test("loaded lift ranks from e1RM over bodyweight", () => {
  const rank = rankExercise({
    exercise: {
      id: "bench",
      name: "Barbell Bench Press",
      trackingType: "weight_reps",
      category: "strength",
      equipment: "free_weight",
    },
    sets: [
      { weightLb: 135, reps: 5, setKind: "warmup" },
      { weightLb: 135, reps: 5, setKind: "working" },
    ],
    bodyWeightLb: 200,
  });
  assert.ok(rank);
  assert.equal(rank!.kind, "loaded");
  assert.equal(rank!.band, "silver");
  assert.match(rank!.detail, /135 lb x 5/);
});

test("loaded lift needs bodyweight", () => {
  const rank = rankExercise({
    exercise: {
      id: "squat",
      name: "Back Squat",
      trackingType: "weight_reps",
      category: "strength",
      equipment: "free_weight",
    },
    sets: [{ weightLb: 225, reps: 5 }],
    bodyWeightLb: null,
  });
  assert.equal(rank, null);
});

test("bodyweight lift ranks from reps", () => {
  const rank = rankExercise({
    exercise: {
      id: "pushup",
      name: "Push-Up",
      trackingType: "reps_only",
      category: "strength",
      equipment: "bodyweight",
    },
    sets: [{ weightLb: null, reps: 16 }],
    bodyWeightLb: 180,
  });
  assert.ok(rank);
  assert.equal(rank!.kind, "bodyweight");
  assert.equal(rank!.band, "silver");
  assert.equal(rank!.detail, "16 reps");
});

test("skips endurance work", () => {
  const ranks = rankSessionExercises({
    bodyWeightLb: 180,
    exercises: [
      {
        exercise: {
          id: "run",
          name: "Treadmill Run",
          trackingType: "distance",
          category: "endurance",
          equipment: "machine",
        },
        sets: [{ weightLb: null, reps: null }],
      },
    ],
  });
  assert.equal(ranks.length, 0);
});

test("streak starts at 1 and rest days count", () => {
  const first = nextStreakState({
    currentCount: 0,
    lastPostedOn: null,
    postedOn: "2026-08-17",
  });
  assert.equal(first.currentCount, 1);

  const wednesday = nextStreakState({
    currentCount: first.currentCount,
    lastPostedOn: first.lastPostedOn,
    postedOn: "2026-08-19",
  });
  assert.equal(wednesday.currentCount, 3);

  const sameDay = nextStreakState({
    currentCount: wednesday.currentCount,
    lastPostedOn: wednesday.lastPostedOn,
    postedOn: "2026-08-19",
  });
  assert.equal(sameDay.currentCount, 3);
});

test("streak breaks after three-day grace", () => {
  assert.equal(isWithinPostingGrace("2026-08-17", "2026-08-20"), true);
  assert.equal(isWithinPostingGrace("2026-08-17", "2026-08-21"), false);
  const broken = nextStreakState({
    currentCount: 8,
    lastPostedOn: "2026-08-17",
    postedOn: "2026-08-21",
  });
  assert.equal(broken.currentCount, 1);
});

test("Monday week start and day math", () => {
  assert.equal(chicagoWeekStart("2026-08-18"), "2026-08-17");
  assert.equal(daysBetween("2026-08-17", "2026-08-19"), 2);
  assert.equal(addDays("2026-08-17", 3), "2026-08-20");
});

test("weekly quests: two posts plus improve", () => {
  const quests = weeklyQuests({
    sessionPostCount: 2,
    hasPriorRanks: true,
    priorBestByExercise: { bench: 0.8 },
    thisWeekRanks: [{ exerciseId: "bench", score: 0.82 }],
  });
  assert.equal(quests[0]?.done, true);
  assert.equal(quests[1]?.done, true);
});

test("weekly quests: no prior ranks needs three posts", () => {
  const quests = weeklyQuests({
    sessionPostCount: 2,
    hasPriorRanks: false,
    priorBestByExercise: {},
    thisWeekRanks: [],
  });
  assert.equal(quests[0]?.done, true);
  assert.equal(quests[1]?.done, false);
  assert.equal(quests[1]?.target, 3);
});
