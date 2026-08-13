export type HubSlug = "train" | "fuel" | "compete" | "begin" | "gear";

export type TopicHub = {
  slug: HubSlug;
  title: string;
  eyebrow: string;
  description: string;
  cluster: "train" | "fuel" | "baseball" | "beginner" | "gear";
  relatedTools: string[];
};

export const TOPIC_HUBS: TopicHub[] = [
  {
    slug: "train",
    title: "Train like you already belong",
    eyebrow: "Train",
    description:
      "Lifts, programs, and gym-floor cues for 17-25 year olds, and anyone chasing that age in energy.",
    cluster: "train",
    relatedTools: ["one-rep-max", "plate-calculator"],
  },
  {
    slug: "fuel",
    title: "Fuel that fits a real week",
    eyebrow: "Fuel",
    description:
      "Protein, groceries, creatine, and meal-plan notes. Not a barcode encyclopedia. Not medical advice.",
    cluster: "fuel",
    relatedTools: ["tdee", "macros", "creatine-dose"],
  },
  {
    slug: "compete",
    title: "Baseball and sports work",
    eyebrow: "Compete",
    description:
      "In-season lifting, speed, and tryout prep from a high-school athlete building in public.",
    cluster: "baseball",
    relatedTools: ["heart-rate-zones", "running-pace"],
  },
  {
    slug: "begin",
    title: "First gym, first plan",
    eyebrow: "Begin",
    description:
      "What to do in 45 minutes, how to not look lost, and dorm workouts that still count.",
    cluster: "beginner",
    relatedTools: ["bmi", "tdee"],
  },
  {
    slug: "gear",
    title: "First setup, not a $3k rack",
    eyebrow: "Gear",
    description:
      "Dorm gyms, first gym bag, cheap dumbbell vs membership math. Hunter only reviews what he actually uses.",
    cluster: "gear",
    relatedTools: ["plate-calculator"],
  },
];

export function getHub(slug: string): TopicHub | undefined {
  return TOPIC_HUBS.find((h) => h.slug === slug);
}
