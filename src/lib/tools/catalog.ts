export type ToolSlug =
  | "tdee"
  | "macros"
  | "one-rep-max"
  | "plate-calculator"
  | "heart-rate-zones"
  | "running-pace"
  | "bmi"
  | "creatine-dose";

export type ToolDef = {
  slug: ToolSlug;
  title: string;
  eyebrow: string;
  description: string;
  keywords: string[];
  hunterNote: string;
  body: { h2: string; p: string }[];
  faqs: { q: string; a: string }[];
};

export const TOOLS: ToolDef[] = [
  {
    slug: "tdee",
    title: "TDEE Calculator",
    eyebrow: "Calories",
    description:
      "Estimate maintenance calories with Mifflin-St Jeor, then take the number into the free Vitality Engine meal plan.",
    keywords: ["TDEE", "maintenance calories", "Mifflin St Jeor", "calorie calculator"],
    hunterNote:
      "I treat this as a starting point, then adjust after two weeks of honest logging.",
    body: [
      {
        h2: "What TDEE actually is",
        p: "TDEE is an estimate of how many calories you burn in a day, training included. It is not a lab test. Use it to set a meal plan, then watch the scale and your lifts.",
      },
      {
        h2: "How a 17-25 athlete should use it",
        p: "If you lift 4 days and still play a sport, pick active, not moderate. Then open the Engine and generate a grocery list that hits the number without eating like a brochure.",
      },
    ],
    faqs: [
      {
        q: "Is this medical advice?",
        a: "No. It is a coaching estimate. Talk to a clinician if you have a medical condition.",
      },
      {
        q: "Why Mifflin-St Jeor?",
        a: "It is a standard BMR formula. Close enough to start. Your weekly average weight is the real referee.",
      },
    ],
  },
  {
    slug: "macros",
    title: "Macro Calculator",
    eyebrow: "Fuel",
    description:
      "Turn a calorie target into protein, carbs, and fat for muscle gain, fat loss, or maintenance.",
    keywords: ["macro calculator", "protein grams", "flexible dieting"],
    hunterNote:
      "Hit protein first. Carbs around training. Fat fills the rest. That is the whole speech.",
    body: [
      {
        h2: "Protein is the non-negotiable",
        p: "We set protein near 1.8-2.0 grams per kilogram. That protects muscle when you are in a deficit and feeds it when you are in a surplus.",
      },
      {
        h2: "Save it to Engine",
        p: "Create a free account and the meal planner will build a week of food around a target like this, then share a grocery list.",
      },
    ],
    faqs: [
      {
        q: "Do I need to hit these grams exactly?",
        a: "No. Get within 10% most days. Perfect macros do not beat consistent training.",
      },
    ],
  },
  {
    slug: "one-rep-max",
    title: "One-Rep Max Calculator",
    eyebrow: "Strength",
    description:
      "Estimate a 1RM from a hard set using the Epley formula. Use it to pick working weights, not to ego-load.",
    keywords: ["1RM calculator", "Epley", "estimated max"],
    hunterNote:
      "If the last rep was ugly, do not trust the number. Clean reps only.",
    body: [
      {
        h2: "Epley in plain English",
        p: "Weight times (1 + reps / 30). A 225 x 5 set estimates about 262. Best used for sets of 10 or fewer.",
      },
    ],
    faqs: [
      {
        q: "Should I test a real max?",
        a: "Most people do not need to. Estimated 1RM is enough to set percentages and track progress in Engine.",
      },
    ],
  },
  {
    slug: "plate-calculator",
    title: "Plate Calculator",
    eyebrow: "Gym floor",
    description:
      "See which plates to load on each side of a barbell so you are not doing math between sets.",
    keywords: ["plate calculator", "barbell loading", "45 lb plates"],
    hunterNote:
      "Count from the inside out. Big plates first. Then the change.",
    body: [
      {
        h2: "Standard 45 lb bar",
        p: "This assumes US plates: 45, 35, 25, 10, 5, 2.5. Change the bar if you are on a technique bar.",
      },
    ],
    faqs: [
      {
        q: "What if my gym is missing 2.5s?",
        a: "Round to the nearest 5 lb. Progress is not lost because of a tiny plate.",
      },
    ],
  },
  {
    slug: "heart-rate-zones",
    title: "Heart Rate Zone Calculator",
    eyebrow: "Conditioning",
    description:
      "Estimate easy, tempo, and interval heart rate zones from age. Useful for runs and sport conditioning.",
    keywords: ["heart rate zones", "max heart rate", "zone 2"],
    hunterNote:
      "Easy work should feel easy. If you cannot talk, you are not in the easy zone.",
    body: [
      {
        h2: "Age-based max is an estimate",
        p: "We use 208 minus 0.7 times age. Wearables beat this. Use zones to keep easy days easy.",
      },
    ],
    faqs: [
      {
        q: "Is this for baseball conditioning?",
        a: "Yes. Keep most running conversational. Save the high zone for short repeats.",
      },
    ],
  },
  {
    slug: "running-pace",
    title: "Running Pace Calculator",
    eyebrow: "Endurance",
    description:
      "Turn a distance and time into minutes per mile so your easy runs stay easy.",
    keywords: ["running pace", "min per mile", "split calculator"],
    hunterNote:
      "If you are lifting the same week, most miles should feel boring on purpose.",
    body: [
      {
        h2: "Pace is a tool, not a personality",
        p: "Plug in what you actually ran. Then decide if that was easy, tempo, or too much.",
      },
    ],
    faqs: [
      {
        q: "Kilometers?",
        a: "Enter miles for now. Convert km to miles by dividing by 1.609.",
      },
    ],
  },
  {
    slug: "bmi",
    title: "BMI Calculator",
    eyebrow: "Context",
    description:
      "Body mass index is a rough screen, not a verdict. Especially if you lift.",
    keywords: ["BMI calculator", "body mass index teens"],
    hunterNote:
      "I am a high-school athlete. BMI calls a lot of us overweight because muscle is dense. Use it as context, not a grade.",
    body: [
      {
        h2: "Why this page is careful",
        p: "BMI does not know about muscle, sport, or puberty. If the number bothers you, talk to a parent, coach, or clinician. We will not shame you with it.",
      },
    ],
    faqs: [
      {
        q: "Should teens obsess over BMI?",
        a: "No. Strength, sleep, food, and how you feel in sport matter more.",
      },
    ],
  },
  {
    slug: "creatine-dose",
    title: "Creatine Dose Calculator",
    eyebrow: "Fuel",
    description:
      "A simple daily creatine monohydrate estimate for athletes. Not medical advice.",
    keywords: ["creatine dosage", "creatine monohydrate", "3-5 grams"],
    hunterNote:
      "I take about 5 grams with a meal. Loading is optional. Water still matters.",
    body: [
      {
        h2: "Daily beats loading for most people",
        p: "3 to 5 grams of creatine monohydrate most days is the simple plan. Loading is faster, not required. Skip this if a clinician told you not to.",
      },
    ],
    faqs: [
      {
        q: "Is creatine a steroid?",
        a: "No. It is a supplement a lot of athletes use. Still not medical advice.",
      },
    ],
  },
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
