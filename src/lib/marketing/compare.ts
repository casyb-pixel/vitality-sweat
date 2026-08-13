export type ComparePage = {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  theyWin: string;
  weSteal: string;
  weRefuse: string;
};

export const COMPARE_PAGES: ComparePage[] = [
  {
    slug: "hevy",
    competitor: "Hevy",
    title: "Hevy vs Vitality Engine",
    description:
      "Hevy is fast logging. Vitality Engine is that habit plus meals, grocery share, and Hunter's site.",
    theyWin: "Hevy wins on social feed polish and years of gym-floor UX.",
    weSteal: "We copy the speed: same-as-last, rest timer, set types, PWA.",
    weRefuse: "We will not drop a noisy public feed on a high-school brand in year 1.",
  },
  {
    slug: "jefit",
    competitor: "Jefit",
    title: "Jefit vs Vitality Engine",
    description:
      "Jefit has a huge exercise list. We publish the encyclopedia in Hunter's voice and keep logging free.",
    theyWin: "Jefit wins on catalog size and older analytics.",
    weSteal: "Public /exercises pages, how-to in the runner, 400+ movements.",
    weRefuse: "We will not ship a cluttered 2012 UI just to look 'complete'.",
  },
  {
    slug: "strong",
    competitor: "Strong",
    title: "Strong vs Vitality Engine",
    description:
      "Strong paywalls routines. We keep the logger free and score train plus fuel together.",
    theyWin: "Strong wins on a clean iOS feel and a simple Strength Score.",
    weSteal: "Sweat Score: consistency, overload, fuel, recovery. Not just 1RM.",
    weRefuse: "We will not copy '3 routines then paywall'. That kills 17-25 adoption.",
  },
  {
    slug: "fitloop",
    competitor: "Fitloop",
    title: "Fitloop vs Vitality Engine",
    description:
      "Fitloop ranks because they publish programs and comparisons. We do the same, attached to a free app.",
    theyWin: "Fitloop wins on named programs and SEO comparison pages.",
    weSteal: "Public /programs, bodyweight progressions, honest comparison pages like this one.",
    weRefuse: "We will not put random ads in the workout screen.",
  },
];

export function getComparePage(slug: string): ComparePage | undefined {
  return COMPARE_PAGES.find((p) => p.slug === slug);
}
