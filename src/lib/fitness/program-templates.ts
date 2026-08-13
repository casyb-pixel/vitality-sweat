export type NamedProgramDay = {
  label: string;
  focus: string;
  exercises: {
    name: string;
    sets: number;
    repMin: number;
    repMax: number;
    restSec: number;
    supersetGroup?: string;
  }[];
};

export type NamedProgram = {
  slug: string;
  title: string;
  summary: string;
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string[];
  audience: string;
  body: string;
  days: NamedProgramDay[];
};

export const NAMED_PROGRAMS: NamedProgram[] = [
  {
    slug: "first-gym-3-day",
    title: "First Gym 3-day",
    summary: "Show up three days, leave in 45 minutes, know exactly what to do.",
    level: "beginner",
    daysPerWeek: 3,
    sessionMinutes: 45,
    equipment: ["barbell", "dumbbell", "machine"],
    audience: "17-25",
    body: "This is the plan if the gym still feels like someone else's building. Full body, simple cues, log it in Engine.",
    days: [
      {
        label: "Day 1 · Squat + push",
        focus: "Legs and chest",
        exercises: [
          { name: "Goblet Squat", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Barbell Bench Press", sets: 3, repMin: 6, repMax: 8, restSec: 120 },
          { name: "Lat Pulldown Wide", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Dumbbell Romanian Deadlift", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Plank", sets: 3, repMin: 30, repMax: 40, restSec: 45 },
        ],
      },
      {
        label: "Day 2 · Hinge + pull",
        focus: "Back and posterior",
        exercises: [
          { name: "Trap Bar Deadlift", sets: 3, repMin: 5, repMax: 5, restSec: 150 },
          { name: "Chest-Supported Dumbbell Row", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Dumbbell Overhead Press", sets: 3, repMin: 6, repMax: 8, restSec: 90 },
          { name: "Walking Lunge Bodyweight", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Dead Bug", sets: 3, repMin: 8, repMax: 10, restSec: 45 },
        ],
      },
      {
        label: "Day 3 · Full body",
        focus: "Conditioning mix",
        exercises: [
          { name: "Goblet Squat", sets: 3, repMin: 10, repMax: 12, restSec: 75 },
          { name: "Push-Up", sets: 3, repMin: 8, repMax: 12, restSec: 60 },
          { name: "Lat Pulldown Neutral", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Hip Thrust", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Farmer Carry", sets: 3, repMin: 20, repMax: 30, restSec: 60 },
        ],
      },
    ],
  },
  {
    slug: "dorm-bodyweight",
    title: "Dorm Bodyweight",
    summary: "No rack, no excuses. Progressions you can do between classes.",
    level: "beginner",
    daysPerWeek: 4,
    sessionMinutes: 30,
    equipment: ["bodyweight"],
    audience: "17-25",
    body: "Push, pull, squat, carry patterns with a bed, a doorframe, and a backpack.",
    days: [
      {
        label: "Push",
        focus: "Pressing",
        exercises: [
          { name: "Incline Push-Up", sets: 4, repMin: 8, repMax: 12, restSec: 60 },
          { name: "Pike Push-Up", sets: 3, repMin: 6, repMax: 10, restSec: 60 },
          { name: "Bench Dip", sets: 3, repMin: 8, repMax: 12, restSec: 45 },
          { name: "RKC Plank", sets: 3, repMin: 20, repMax: 30, restSec: 45 },
        ],
      },
      {
        label: "Pull",
        focus: "Rows and hangs",
        exercises: [
          { name: "Doorframe Row", sets: 4, repMin: 8, repMax: 12, restSec: 60 },
          { name: "Dead Hang", sets: 3, repMin: 20, repMax: 40, restSec: 60 },
          { name: "Superman Hold", sets: 3, repMin: 20, repMax: 30, restSec: 45 },
          { name: "Band Pull-Apart", sets: 3, repMin: 12, repMax: 15, restSec: 45 },
        ],
      },
      {
        label: "Legs",
        focus: "Squat and hinge",
        exercises: [
          { name: "Bodyweight Squat", sets: 4, repMin: 12, repMax: 15, restSec: 60 },
          { name: "Reverse Lunge", sets: 3, repMin: 8, repMax: 10, restSec: 60 },
          { name: "Single-Leg Glute Bridge", sets: 3, repMin: 8, repMax: 12, restSec: 45 },
          { name: "Wall Sit", sets: 3, repMin: 30, repMax: 45, restSec: 45 },
        ],
      },
      {
        label: "Engine",
        focus: "Conditioning",
        exercises: [
          { name: "Burpee", sets: 4, repMin: 6, repMax: 10, restSec: 45 },
          { name: "Mountain Climber", sets: 3, repMin: 20, repMax: 30, restSec: 30 },
          { name: "Jumping Jack", sets: 3, repMin: 30, repMax: 40, restSec: 30 },
          { name: "Hollow Hold", sets: 3, repMin: 20, repMax: 30, restSec: 45 },
        ],
      },
    ],
  },
  {
    slug: "push-pull-legs",
    title: "Push Pull Legs",
    summary: "The split everyone asks for, written so you can log it wet-handed.",
    level: "intermediate",
    daysPerWeek: 6,
    sessionMinutes: 55,
    equipment: ["barbell", "dumbbell", "cable"],
    audience: "17-25",
    body: "Six days if school allows. If not, run three and repeat next week.",
    days: [
      {
        label: "Push",
        focus: "Chest shoulders triceps",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, repMin: 5, repMax: 8, restSec: 150 },
          { name: "Overhead Press", sets: 3, repMin: 6, repMax: 8, restSec: 120 },
          { name: "Incline Dumbbell Bench Press", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Cable Pushdown Rope", sets: 3, repMin: 10, repMax: 12, restSec: 60 },
          { name: "Dumbbell Lateral Raise", sets: 3, repMin: 12, repMax: 15, restSec: 45 },
        ],
      },
      {
        label: "Pull",
        focus: "Back and biceps",
        exercises: [
          { name: "Pendlay Row", sets: 4, repMin: 5, repMax: 8, restSec: 120 },
          { name: "Lat Pulldown Wide", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Chest-Supported Dumbbell Row", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Face Pull", sets: 3, repMin: 12, repMax: 15, restSec: 45 },
          { name: "EZ-Bar Curl", sets: 3, repMin: 8, repMax: 12, restSec: 60 },
        ],
      },
      {
        label: "Legs",
        focus: "Squat hinge calves",
        exercises: [
          { name: "Back Squat", sets: 4, repMin: 5, repMax: 8, restSec: 150 },
          { name: "Romanian Deadlift", sets: 3, repMin: 6, repMax: 8, restSec: 120 },
          { name: "Walking Lunge", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Leg Curl", sets: 3, repMin: 10, repMax: 12, restSec: 60 },
          { name: "Standing Calf Raise", sets: 3, repMin: 10, repMax: 15, restSec: 45 },
        ],
      },
    ],
  },
  {
    slug: "upper-lower",
    title: "Upper Lower",
    summary: "Four days. Enough volume to grow, enough rest to stay in school.",
    level: "intermediate",
    daysPerWeek: 4,
    sessionMinutes: 50,
    equipment: ["barbell", "dumbbell"],
    audience: "17-25",
    body: "Upper / lower twice. Log every working set. Rest inside supersets is skipped.",
    days: [
      {
        label: "Upper A",
        focus: "Press and row",
        exercises: [
          { name: "Barbell Bench Press", sets: 4, repMin: 5, repMax: 8, restSec: 150 },
          { name: "Chest-Supported Dumbbell Row", sets: 4, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Overhead Press", sets: 3, repMin: 6, repMax: 8, restSec: 120 },
          { name: "Lat Pulldown Neutral", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "EZ-Bar Curl", sets: 3, repMin: 8, repMax: 12, restSec: 60, supersetGroup: "A" },
          { name: "Cable Pushdown Rope", sets: 3, repMin: 10, repMax: 12, restSec: 60, supersetGroup: "A" },
        ],
      },
      {
        label: "Lower A",
        focus: "Squat pattern",
        exercises: [
          { name: "Back Squat", sets: 4, repMin: 5, repMax: 8, restSec: 150 },
          { name: "Romanian Deadlift", sets: 3, repMin: 6, repMax: 8, restSec: 120 },
          { name: "Bulgarian Split Squat", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Leg Curl", sets: 3, repMin: 10, repMax: 12, restSec: 60 },
        ],
      },
    ],
  },
  {
    slug: "5x5-strength",
    title: "5x5 Strength",
    summary: "Three big lifts. Add a little when the bar feels honest.",
    level: "intermediate",
    daysPerWeek: 3,
    sessionMinutes: 50,
    equipment: ["barbell"],
    audience: "17-25",
    body: "Simple strength. If you miss reps, repeat the weight. Log it so Engine remembers.",
    days: [
      {
        label: "A",
        focus: "Squat bench row",
        exercises: [
          { name: "Back Squat", sets: 5, repMin: 5, repMax: 5, restSec: 180 },
          { name: "Barbell Bench Press", sets: 5, repMin: 5, repMax: 5, restSec: 180 },
          { name: "Barbell Row", sets: 5, repMin: 5, repMax: 5, restSec: 150 },
        ],
      },
      {
        label: "B",
        focus: "Squat press deadlift",
        exercises: [
          { name: "Back Squat", sets: 5, repMin: 5, repMax: 5, restSec: 180 },
          { name: "Overhead Press", sets: 5, repMin: 5, repMax: 5, restSec: 150 },
          { name: "Deadlift", sets: 1, repMin: 5, repMax: 5, restSec: 180 },
        ],
      },
    ],
  },
  {
    slug: "baseball-in-season",
    title: "Baseball In-Season",
    summary: "Keep power without frying the arm. Two lifts, one speed day.",
    level: "intermediate",
    daysPerWeek: 3,
    sessionMinutes: 40,
    equipment: ["dumbbell", "med ball", "bodyweight"],
    audience: "17-25",
    body: "In-season means you still train. You just do not bury yourself before a start.",
    days: [
      {
        label: "Power",
        focus: "Hinge and throw",
        exercises: [
          { name: "Trap Bar Deadlift", sets: 3, repMin: 3, repMax: 5, restSec: 150 },
          { name: "Medicine Ball Slam", sets: 4, repMin: 5, repMax: 6, restSec: 60 },
          { name: "Rotational Med Ball Throw", sets: 4, repMin: 4, repMax: 6, restSec: 60 },
          { name: "Single-Leg RDL", sets: 3, repMin: 6, repMax: 8, restSec: 75 },
        ],
      },
      {
        label: "Speed",
        focus: "Jumps and skips",
        exercises: [
          { name: "A-Skip", sets: 4, repMin: 10, repMax: 12, restSec: 45 },
          { name: "Lateral Bound", sets: 4, repMin: 6, repMax: 8, restSec: 60 },
          { name: "Box Jump", sets: 4, repMin: 3, repMax: 5, restSec: 75 },
          { name: "Copenhagen Plank", sets: 3, repMin: 20, repMax: 30, restSec: 45 },
        ],
      },
      {
        label: "Upper keep",
        focus: "Scap and press",
        exercises: [
          { name: "Landmine Press", sets: 3, repMin: 6, repMax: 8, restSec: 90 },
          { name: "Cable Face Pull", sets: 3, repMin: 12, repMax: 15, restSec: 45 },
          { name: "Band Pull-Apart", sets: 3, repMin: 15, repMax: 20, restSec: 30 },
          { name: "Dead Hang", sets: 3, repMin: 20, repMax: 40, restSec: 45 },
        ],
      },
    ],
  },
  {
    slug: "feel-18-rebuild",
    title: "Feel-18 Rebuild",
    summary: "For the parent, teacher, or coach who wants that engine back.",
    level: "beginner",
    daysPerWeek: 3,
    sessionMinutes: 40,
    equipment: ["dumbbell", "machine"],
    audience: "feel-that-age",
    body: "Same lifts the 17-25 crowd uses. Slightly more rest. No shame BMI talk. Rebuild the engine.",
    days: [
      {
        label: "Full body A",
        focus: "Squat press row",
        exercises: [
          { name: "Goblet Squat", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Dumbbell Bench Press", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Chest-Supported Dumbbell Row", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Farmer Carry", sets: 3, repMin: 20, repMax: 40, restSec: 60 },
        ],
      },
      {
        label: "Full body B",
        focus: "Hinge and carry",
        exercises: [
          { name: "Dumbbell Romanian Deadlift", sets: 3, repMin: 8, repMax: 10, restSec: 90 },
          { name: "Dumbbell Overhead Press", sets: 3, repMin: 6, repMax: 8, restSec: 90 },
          { name: "Lat Pulldown Neutral", sets: 3, repMin: 8, repMax: 10, restSec: 75 },
          { name: "Dead Bug", sets: 3, repMin: 8, repMax: 10, restSec: 45 },
        ],
      },
    ],
  },
];

export function getNamedProgram(slug: string): NamedProgram | undefined {
  return NAMED_PROGRAMS.find((p) => p.slug === slug);
}
