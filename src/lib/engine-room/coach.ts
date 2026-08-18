import {
  NO_EM_DASH_RULE,
  stripEmDashes,
} from "@/lib/text/humanize-copy";
import type { EngineRoomGameSnapshot } from "@/lib/engine-room/snapshot";
import { formatRankLine } from "@/lib/engine-room/snapshot";

export const COACH_DAILY_LIMIT = 20;
export const COACH_HISTORY_LIMIT = 20;

export const COACH_STARTERS = [
  "How did my last session rank?",
  "What should I hit tomorrow?",
  "Keep my streak alive this week.",
] as const;

export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  created_at: string;
};

export type CoachSessionSummary = {
  startedAt: string;
  status: string;
  posted: boolean;
  lifts: string[];
};

export function buildEngineCoachPrompt(input: {
  displayName: string | null;
  goal: string | null;
  snapshot: EngineRoomGameSnapshot;
  recentSessions: CoachSessionSummary[];
}): string {
  const name = input.displayName?.trim() || "this athlete";
  const ranks =
    input.snapshot.rankHighlights.length > 0
      ? input.snapshot.rankHighlights.map((row) => formatRankLine(row)).join("\n")
      : "No banked ranks yet. They need to post a finished session.";
  const quests = input.snapshot.quests
    .map(
      (q) =>
        `- ${q.label}: ${q.done ? "done" : `${q.progress}/${q.target}`}`,
    )
    .join("\n");
  const sessions = input.recentSessions.length
    ? input.recentSessions
        .map((session) => {
          const posted = session.posted ? "ranks locked" : "not posted yet";
          return `- ${session.startedAt.slice(0, 10)} (${session.status}, ${posted}): ${session.lifts.join("; ") || "no sets"}`;
        })
        .join("\n")
    : "- none logged yet";

  return [
    "You are the Vitality Sweat Peak Training coach in The Engine Room.",
    `Talk to ${name} like a teammate in the rack. Short sentences. Direct. Encouraging.`,
    "No medical claims. Coaching suggestions only. You cannot edit their program, meals, or other members' posts.",
    "If a finished session is not posted, tell them to post it in The Engine Room to lock ranks and keep the streak.",
    "Personal ranks are training estimates from bodyweight and estimated 1RM, not a meet result.",
    NO_EM_DASH_RULE,
    "",
    `Goal: ${input.goal ?? "unspecified"}`,
    `Streak: ${input.snapshot.streak.currentCount} day(s). Last session post: ${input.snapshot.streak.lastPostedOn ?? "none"}.`,
    "Quests this week:",
    quests,
    "Recent banked ranks:",
    ranks,
    "Recent sessions:",
    sessions,
    "",
    "Reply in 1-3 short paragraphs. No bullet walls unless they asked for a list. End with one clear next action.",
  ].join("\n");
}

export function sanitizeCoachReply(text: string): string {
  const cleaned = stripEmDashes(text).trim();
  return cleaned.slice(0, 4000);
}

export function fallbackCoachReply(snapshot: EngineRoomGameSnapshot): string {
  const streak = snapshot.streak.currentCount;
  const openQuest = snapshot.quests.find((q) => !q.done);
  if (openQuest) {
    return `I looked at your last session. Streak is ${streak}. Next move: ${openQuest.label.toLowerCase()}. Post the workout when you finish so the rank actually counts.`;
  }
  if (snapshot.rankHighlights[0]) {
    const line = formatRankLine(snapshot.rankHighlights[0]);
    return `I looked at your last session. ${line}. Keep showing up this week and post it when you are done. That is how the streak stays alive.`;
  }
  return `I looked at your last session. Finish a lift, then post it in The Engine Room to lock a rank. That is the whole loop.`;
}
