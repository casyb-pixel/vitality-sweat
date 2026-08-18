export type WeeklyQuest = {
  id: "post_two" | "improve_or_three";
  label: string;
  done: boolean;
  progress: number;
  target: number;
};

export type RankScore = {
  exerciseId: string;
  score: number;
};

export function weeklyQuests(input: {
  sessionPostCount: number;
  hasPriorRanks: boolean;
  priorBestByExercise: Record<string, number>;
  thisWeekRanks: RankScore[];
}): WeeklyQuest[] {
  const posts = Math.max(0, Math.floor(input.sessionPostCount) || 0);
  const postTwo: WeeklyQuest = {
    id: "post_two",
    label: "Post 2 sessions this week",
    done: posts >= 2,
    progress: Math.min(posts, 2),
    target: 2,
  };

  if (!input.hasPriorRanks) {
    return [
      postTwo,
      {
        id: "improve_or_three",
        label: "Post 3 sessions this week to set a baseline",
        done: posts >= 3,
        progress: Math.min(posts, 3),
        target: 3,
      },
    ];
  }

  const improved = input.thisWeekRanks.some((rank) => {
    const prior = input.priorBestByExercise[rank.exerciseId];
    return prior == null || rank.score > prior;
  });

  return [
    postTwo,
    {
      id: "improve_or_three",
      label: "Improve any lift vs your last banked rank",
      done: improved,
      progress: improved ? 1 : 0,
      target: 1,
    },
  ];
}
