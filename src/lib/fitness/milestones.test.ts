import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectGoalWeight,
  detectPersonalBest,
  milestoneChipPrompt,
} from "@/lib/fitness/milestones";
import { buildMilestoneCaption } from "@/lib/share/milestone-caption";

describe("detectPersonalBest", () => {
  it("returns null without prior sets", () => {
    const m = detectPersonalBest({
      exerciseId: "ex1",
      exerciseName: "Bench Press",
      weightLb: 185,
      reps: 5,
      priorSets: [],
    });
    assert.equal(m, null);
  });

  it("detects a weight PR", () => {
    const m = detectPersonalBest({
      exerciseId: "ex1",
      exerciseName: "Bench Press",
      weightLb: 185,
      reps: 5,
      priorSets: [{ weight_lb: 175, reps: 5 }],
    });
    assert.ok(m);
    assert.equal(m!.type, "personal_best");
    assert.match(m!.title, /Bench Press/);
    assert.equal(m!.stats.weight_lb, 185);
  });

  it("detects a volume PR when weight is not higher", () => {
    const m = detectPersonalBest({
      exerciseId: "ex1",
      exerciseName: "Squat",
      weightLb: 200,
      reps: 8,
      priorSets: [{ weight_lb: 200, reps: 5 }],
    });
    assert.ok(m);
    assert.match(m!.title, /volume PR/i);
  });

  it("ignores non-PRs", () => {
    const m = detectPersonalBest({
      exerciseId: "ex1",
      weightLb: 135,
      reps: 5,
      priorSets: [{ weight_lb: 185, reps: 5 }],
    });
    assert.equal(m, null);
  });
});

describe("detectGoalWeight", () => {
  it("fires for weight_loss when crossing target", () => {
    const m = detectGoalWeight({
      previousWeightLb: 182,
      currentWeightLb: 179,
      targetWeightLb: 180,
      primaryGoal: "weight_loss",
    });
    assert.ok(m);
    assert.equal(m!.type, "goal_weight");
  });

  it("fires for muscle_gain when crossing target", () => {
    const m = detectGoalWeight({
      previousWeightLb: 168,
      currentWeightLb: 171,
      targetWeightLb: 170,
      primaryGoal: "muscle_gain",
    });
    assert.ok(m);
    assert.equal(m!.type, "goal_weight");
  });

  it("skips when already past target", () => {
    const m = detectGoalWeight({
      previousWeightLb: 175,
      currentWeightLb: 174,
      targetWeightLb: 180,
      primaryGoal: "weight_loss",
    });
    assert.equal(m, null);
  });
});

describe("share caption", () => {
  it("builds soft CTA without em dashes", () => {
    const caption = buildMilestoneCaption(
      {
        type: "personal_best",
        title: "New PR on Bench Press",
        detail: "185 lb × 5 beats your prior best of 175 lb.",
      },
      "https://vitalitysweat.com/?auth=signup&utm_source=member_share",
    );
    assert.doesNotMatch(caption, /\u2014|\u2013/);
    assert.match(caption, /Join free/);
    assert.match(caption, /utm_source=member_share/);
  });

  it("chip prompt invites share", () => {
    const prompt = milestoneChipPrompt({
      type: "personal_best",
      title: "New PR on Bench Press",
      detail: "185 lb",
      stats: {},
    });
    assert.match(prompt, /Share it\?/);
  });
});
