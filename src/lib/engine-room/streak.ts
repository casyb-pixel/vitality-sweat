import { daysBetween, isWithinPostingGrace } from "@/lib/engine-room/calendar";

export type StreakState = {
  currentCount: number;
  lastPostedOn: string | null;
};

export function nextStreakState(input: {
  currentCount: number;
  lastPostedOn: string | null;
  postedOn: string;
}): StreakState {
  const current = Math.max(0, Math.floor(input.currentCount) || 0);
  if (!input.lastPostedOn) {
    return { currentCount: 1, lastPostedOn: input.postedOn };
  }
  const gap = daysBetween(input.lastPostedOn, input.postedOn);
  if (gap == null || gap < 0) {
    return {
      currentCount: current,
      lastPostedOn: input.lastPostedOn,
    };
  }
  if (gap === 0) {
    return {
      currentCount: Math.max(current, 1),
      lastPostedOn: input.postedOn,
    };
  }
  if (!isWithinPostingGrace(input.lastPostedOn, input.postedOn)) {
    return { currentCount: 1, lastPostedOn: input.postedOn };
  }
  return {
    currentCount: current + gap,
    lastPostedOn: input.postedOn,
  };
}
