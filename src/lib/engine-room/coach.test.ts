import test from "node:test";
import assert from "node:assert/strict";
import { buildEngineCoachPrompt, fallbackCoachReply } from "./coach";

test("coach prompt includes snapshot and bans medical claims", () => {
  const prompt = buildEngineCoachPrompt({
    displayName: "Hunter",
    goal: "Strength",
    snapshot: {
      weekStart: "2026-08-17",
      streak: { currentCount: 4, lastPostedOn: "2026-08-18" },
      quests: [
        {
          id: "post_two",
          label: "Post 2 sessions this week",
          done: true,
          progress: 2,
          target: 2,
        },
      ],
      rankHighlights: [
        {
          exerciseName: "Barbell Bench Press",
          band: "silver",
          detail: "0.82x BW · 185 lb x 5",
        },
      ],
    },
    recentSessions: [
      {
        startedAt: "2026-08-18T12:00:00.000Z",
        status: "completed",
        posted: true,
        lifts: ["Barbell Bench Press 185 lb 5 reps"],
      },
    ],
  });
  assert.match(prompt, /Hunter/);
  assert.match(prompt, /4 day/);
  assert.match(prompt, /No medical claims/);
  assert.match(prompt, /Barbell Bench Press/);
});

test("fallback coach reply points at an open quest", () => {
  const reply = fallbackCoachReply({
    weekStart: "2026-08-17",
    streak: { currentCount: 1, lastPostedOn: "2026-08-18" },
    quests: [
      {
        id: "post_two",
        label: "Post 2 sessions this week",
        done: false,
        progress: 1,
        target: 2,
      },
    ],
    rankHighlights: [],
  });
  assert.match(reply, /post 2 sessions this week/i);
});
