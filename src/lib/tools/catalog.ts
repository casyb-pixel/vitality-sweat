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
  engineCta?: string;
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
      "I treat this as a starting point, then adjust after two weeks of honest logging. I do not treat it like a lab printout.",
    engineCta:
      "Save the number in the free Vitality Engine and build a meal plan from it. Do not screenshot and forget.",
    body: [
      {
        h2: "What TDEE actually is",
        p: "TDEE is an estimate of how many calories you burn in a day, training included. It is not a lab test. Use it to set a meal plan, then watch your weekly average weight and your lifts. If both stall for a few weeks, you adjust food or steps. That is coaching, not a clinic.",
      },
      {
        h2: "How a 17-25 athlete should use it",
        p: "If you lift 4 days and still play a sport, pick active, not moderate. Sitting in class does not cancel practice. Plug the number, then open Engine and generate a grocery list that hits it without eating like a brochure. Rouses-run food still counts.",
      },
      {
        h2: "A worked example",
        p: "Say you are 18, about 170 pounds, 5 foot 10, lifting and practicing most days. The calculator will spit a maintenance estimate. Eat near that for two weeks while you log training. If weight trends down and lifts feel like trash, eat more. If weight trends up faster than you wanted and you are not trying to grow, shave a bit. Two weeks. Not two days.",
      },
      {
        h2: "What this page will not do",
        p: "We will not write a clinic plan. We will not sell a shame goal. We will not grade you with a calorie number. If you have a condition that needs a clinician, talk to them. This tool is for athletes who need a starting calorie target they can actually cook from.",
      },
      {
        h2: "Take it into Engine",
        p: "The number is useless if it lives in your camera roll. Create a free Vitality Engine account, set the target, and let the meal planner build a week. Share the grocery list if you cook with a parent or a roommate. That is the loop.",
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
      {
        q: "Should I eat less than this on rest days?",
        a: "Keep it simple the first month. Same target most days. You can split training-day carbs later.",
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
    engineCta:
      "Put the protein target in the free Vitality Engine meal plan, then share the grocery list.",
    body: [
      {
        h2: "Protein is the non-negotiable",
        p: "We set protein near 1.8-2.0 grams per kilogram. That is a coaching range, not a prescription. It gives your training something to grab onto when you are in a deficit, and it feeds the work when you are in a surplus. You do not need a shake in every class period. You need a number you can hit with food you already buy.",
      },
      {
        h2: "Carbs around the work",
        p: "If you lift after school, put more carbs near that session. Rice, fruit, potatoes, cereal, whatever you will actually eat. Rest-day carbs can be a little lower if you want. Do not turn it into a personality. Training still happens if the grams are close.",
      },
      {
        h2: "Fat fills the rest",
        p: "After protein and carbs, fat takes the leftover calories. Peanut butter, eggs, oil on a pan. You do not need to fear it and you do not need to chug it. If the calculator looks spicy, check that you did not set calories too low for a high-school day that already includes practice.",
      },
      {
        h2: "A week-one way to use this",
        p: "Run TDEE first. Then this page. Then cook from the Engine grocery list. Log the gym in the same app. If you miss a gram target, you did not fail the sport. You missed a target. Hit it tomorrow.",
      },
    ],
    faqs: [
      {
        q: "Do I need to hit these grams exactly?",
        a: "No. Get within 10% most days. Perfect macros do not beat consistent training.",
      },
      {
        q: "Is this for cutting?",
        a: "It can be. It can also be maintenance or a slow surplus. Pick the goal in the calculator. We do not shame either direction.",
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
      "If the last rep was ugly, do not trust the number. Clean reps only. I do not max in week one of a new lift.",
    engineCta:
      "Use the estimate to pick next week's working sets, then log those sets in the free Vitality Engine.",
    body: [
      {
        h2: "Epley in plain English",
        p: "Weight times (1 + reps / 30). A 225 x 5 set estimates about 262. Best used for sets of 10 or fewer. If you ground out 12 sloppy reps, this formula will lie to you in the direction your ego likes.",
      },
      {
        h2: "What I actually do with it",
        p: "I take a hard, clean set of 5, run the number, then pick working weights as a slice of that estimate. I do not walk over to the bar and test a true single because a calculator felt spicy. Estimated max is for programming. Real singles are a later conversation with a coach.",
      },
      {
        h2: "First gym month",
        p: "You probably do not need this yet. Goblet squats and machines need logged working sets, not a 1RM personality. When you have a barbell movement you can own for 5, then this page earns its keep. Pair it with the plate calculator so you are not doing math with wet hands.",
      },
      {
        h2: "Ugly reps void the estimate",
        p: "Hips shooting up, bar bouncing off the chest, hitching a deadlift: that is not the set to plug in. Film a silent set if you need a parent to check. Then use a clean one. The Engine log of actual working sets still matters more than a theoretical max.",
      },
    ],
    faqs: [
      {
        q: "Should I test a real max?",
        a: "Most people do not need to. Estimated 1RM is enough to set percentages and track progress in Engine.",
      },
      {
        q: "Is this safe for high school?",
        a: "The formula is just math. Maxing out is a coaching choice. When in doubt, log working sets and skip the single.",
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
      "Count from the inside out. Big plates first. Then the change. I still mix this up when I am tired. That is why the tool exists.",
    engineCta:
      "Load the bar, then log the working weight in the free Vitality Engine before the next set starts.",
    body: [
      {
        h2: "Standard 45 lb bar",
        p: "This assumes US plates: 45, 35, 25, 10, 5, 2.5. Change the bar weight if you are on a technique bar or a trap bar. The gym in Lafayette is not required to match a video from somewhere else. Read the bar. Then load.",
      },
      {
        h2: "Wet hands, no math class",
        p: "Between sets you should be breathing, not doing algebra on the platform. Punch the target, see each side, load big plates first. If you dumped the bar because you lost count, that is a setup miss, not a toughness badge.",
      },
      {
        h2: "A worked example",
        p: "You want 185. Bar is 45. That is 140 to split, 70 a side. A 45 and a 25 on each side. If the calculator shows 2.5s you do not have, round. Next week, log 185 or 190 as what you actually lifted. Engine does not need the fantasy load.",
      },
      {
        h2: "Machines and dumbbells",
        p: "If you are on a chest-press machine or goblet squats, you do not need this page. You need the pin number or the bell weight in the log. Come back when a barbell is in the session.",
      },
    ],
    faqs: [
      {
        q: "What if my gym is missing 2.5s?",
        a: "Round to the nearest 5 lb. Progress is not lost because of a tiny plate.",
      },
      {
        q: "Kilos?",
        a: "This tool is built for pounds. If your gym is kilos, convert or load by the plates you can see and log what was on the bar.",
      },
    ],
  },
  {
    slug: "heart-rate-zones",
    title: "Heart Rate Zone Calculator",
    eyebrow: "Conditioning",
    description:
      "Estimate easy, tempo, and interval heart rate zones from age. A coaching range for runs and sport work, not a clinic reading.",
    keywords: ["heart rate zones", "max heart rate", "zone 2", "easy run"],
    hunterNote:
      "Easy work should feel easy. If you cannot talk in a sentence, you are not in the easy zone. I do not chase a number on a watch to prove the day counted.",
    engineCta:
      "Keep easy days easy, then log the lift in the free Vitality Engine. Conditioning is not a substitute for the working sets.",
    body: [
      {
        h2: "Age-based max is an estimate",
        p: "We use 208 minus 0.7 times age. That is a formula, not a lab test. A watch that measured you on a hard day will beat this page. Use the zones to keep easy days easy, not to grade your heart.",
      },
      {
        h2: "What I actually do with it",
        p: "Most of the week should live in the easy range. Talk in a sentence. Save the high zone for short repeats if a coach asked for them. If you lift the same day, do not turn the run into a second max-out. Tired legs make ugly squats.",
      },
      {
        h2: "Sport days",
        p: "Baseball and gym class already spike you. That is not a reason to add a long tempo because a chart had three colors. Log practice as practice. Use this tool when you pick a run on purpose.",
      },
      {
        h2: "What this page will not do",
        p: "We will not read a heart condition off a calculator. If something feels off, tell a parent, coach, or clinician. This is a pace-keeping tool for athletes who keep mixing easy and hard until both get worse.",
      },
    ],
    faqs: [
      {
        q: "Is this medical advice?",
        a: "No. It is a coaching estimate from age. Talk to a clinician if you have a heart or health question.",
      },
      {
        q: "Do I need a chest strap?",
        a: "No. Wrist watches drift. Perceived effort still counts. If you can talk, you are probably easy. If you are gasping, you are not.",
      },
      {
        q: "Can I use this for baseball conditioning?",
        a: "Yes. Keep most running conversational. Save the high zone for short repeats a coach actually programmed.",
      },
    ],
  },
  {
    slug: "running-pace",
    title: "Running Pace Calculator",
    eyebrow: "Endurance",
    description:
      "Turn a distance and time into minutes per mile so your easy runs stay easy, especially in a lift week.",
    keywords: ["running pace", "min per mile", "split calculator", "easy run"],
    hunterNote:
      "If I am lifting the same week, most miles should feel boring on purpose. Fast for no reason is how I show up cooked for squats.",
    engineCta:
      "Plug the pace, then log the lift in the free Vitality Engine. Do not let a random run erase the working sets.",
    body: [
      {
        h2: "Pace is a tool, not a personality",
        p: "Plug in the distance and time you actually ran. The page gives minutes per mile. Then you decide if that was easy, a workout, or too much for a lift week. Strava does not get a vote on your squat day.",
      },
      {
        h2: "Lift weeks stay boring on purpose",
        p: "If you goblet squat or press later today, keep the run conversational. You can still move. You do not need a personal record on the sidewalk. Log the run if you want. Log the lift either way.",
      },
      {
        h2: "A worked example",
        p: "You jog 2 miles in 20 minutes. That is 10:00 per mile. If you could talk the whole way, that was easy. If you had to stop and fold over, that was not easy, no matter what a color-coded chart said. Next time, slow down or shorten it.",
      },
      {
        h2: "What this page will not do",
        p: "We will not write a marathon plan. We will not tell you to suffer for a screenshot. If running hurts in a way that is not normal tired, stop and tell a parent or coach.",
      },
    ],
    faqs: [
      {
        q: "Kilometers?",
        a: "Enter miles for now. Convert km to miles by dividing by 1.609, then plug that in.",
      },
      {
        q: "Do I have to run if I lift?",
        a: "No. This page is for when you already ran and want the pace. Walking still counts as moving.",
      },
    ],
  },
  {
    slug: "bmi",
    title: "BMI Calculator",
    eyebrow: "Context",
    description:
      "Body mass index from height and weight. A rough screen, not a grade, especially if you lift or you are still growing.",
    keywords: ["BMI calculator", "body mass index teens", "height weight"],
    hunterNote:
      "I am a high-school athlete. BMI calls a lot of lifters heavy because muscle is dense. I use this as context. I do not use it as a report card.",
    engineCta:
      "If you came here worried about a number, log the lifts and the meals in the free Vitality Engine instead. Training and food you can repeat beat a BMI screenshot.",
    body: [
      {
        h2: "Why this page is careful",
        p: "BMI is weight over height squared. It does not know about muscle, sport, bone, or puberty. Two people can share a number and live totally different weeks. We show the math because people search it. We will not shame you with it.",
      },
      {
        h2: "If you lift, read this twice",
        p: "Strength work adds muscle. Muscle is heavy for the space it takes. A chart built for office populations will often flag athletes as high. That is a limit of the chart, not a character review. Watch your lifts, your sleep, and how you feel in sport.",
      },
      {
        h2: "Teens and growing athletes",
        p: "If you are still growing, a single BMI snapshot is an even weaker story. Do not go hunting a smaller number because a website colored a box. Talk to a parent, a coach, or a clinician if the number is stuck in your head. This page will not put you on a crash plan.",
      },
      {
        h2: "What to do instead",
        p: "Log training. Eat enough to recover. Repeat next week. If you want a calorie starting point, use the TDEE tool, then cook from Engine. That loop has a next action. BMI does not.",
      },
    ],
    faqs: [
      {
        q: "Should teens obsess over BMI?",
        a: "No. Strength, sleep, food, and how you feel in sport matter more. This number is context, not a verdict.",
      },
      {
        q: "Is this medical advice?",
        a: "No. If a number worries you, talk to a parent, coach, or clinician. We will not grade your body here.",
      },
      {
        q: "Why include this tool at all?",
        a: "People search it. Better they land on a careful page than a shame chart. Use Engine for the work that actually moves.",
      },
    ],
  },
  {
    slug: "creatine-dose",
    title: "Creatine Dose Calculator",
    eyebrow: "Fuel",
    description:
      "A simple daily creatine monohydrate estimate from body weight. Coaching math, not medical advice.",
    keywords: ["creatine dosage", "creatine monohydrate", "3-5 grams", "creatine loading"],
    hunterNote:
      "I take about 5 grams with a meal most days. I do not load. I drink water like a person who trains. That is the whole routine.",
    engineCta:
      "Creatine is optional. The work still has to get logged in the free Vitality Engine. Powder does not replace the set.",
    body: [
      {
        h2: "Daily beats loading for most people",
        p: "3 to 5 grams of creatine monohydrate most days is the simple plan. The calculator scales a bit with body weight. Loading is faster, not required. Skip this page if a clinician told you not to use it.",
      },
      {
        h2: "What I actually do",
        p: "One scoop, about 5 grams, with a meal. I do not cycle it like a comic-book supplement. I do not mix it with five other tubs because a video stacked them. If I miss a day, I take it the next day. That is it.",
      },
      {
        h2: "What this is not",
        p: "Creatine is not a steroid. It is not a personality. It will not fix skipped sleep or skipped meals. It will not replace protein you already needed. If someone promised a new body from a tub, they were selling.",
      },
      {
        h2: "Take it into Engine",
        p: "If you use it, keep training logged. The scoop does not show up as a PR by itself. Working sets do. Grocery list still matters. Water still matters. Parents can see the same log if you share the week.",
      },
    ],
    faqs: [
      {
        q: "Is creatine a steroid?",
        a: "No. It is a common supplement a lot of athletes use. Still not medical advice.",
      },
      {
        q: "Do I have to load?",
        a: "No. Daily use is enough for most people. Loading is optional and often just upsets a stomach.",
      },
      {
        q: "Should high-school athletes take it?",
        a: "That is a parent and clinician conversation, not a calculator's job. This page only does the gram math.",
      },
    ],
  },
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
