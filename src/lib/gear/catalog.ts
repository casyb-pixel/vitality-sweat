export type GearReview = {
  slug: string;
  title: string;
  excerpt: string;
  category: "dorm" | "gym-bag" | "baseball" | "fuel" | "shoes" | "home";
  body: string;
  affiliateSlug?: string;
};

export const GEAR_REVIEWS: GearReview[] = [
  {
    slug: "dorm-dumbbell-vs-bands",
    title: "Cheap dumbbells vs bands in a dorm",
    excerpt:
      "If you have 20 square feet and a roommate, here is the math Hunter would actually run.",
    category: "dorm",
    affiliateSlug: "lifting-straps",
    body: "Start with a pair of adjustable dumbbells if you can hide them under the bed. Bands travel better. Neither replaces a gym. Both beat skipping the session. Log the work in Engine so the week still counts.",
  },
  {
    slug: "first-gym-bag",
    title: "First gym bag that is not embarrassing",
    excerpt: "Shoes, straps, a shaker, creatine, and a charger. That is the bag.",
    category: "gym-bag",
    affiliateSlug: "creatine-monohydrate",
    body: "You do not need a $200 duffel. You need dry shoes and a way to log sets with wet hands. Phone in a zipper pocket. Engine on the Home Screen.",
  },
  {
    slug: "creatine-i-use",
    title: "The creatine I actually use",
    excerpt: "Monohydrate. 5 grams. Not a medical protocol. Just what I take.",
    category: "fuel",
    affiliateSlug: "creatine-monohydrate",
    body: "This is not clinically proven copy. This is: I take creatine monohydrate, I drink water, I train. Use the creatine dose tool if you want the number written down.",
  },
];

export function getGearReview(slug: string): GearReview | undefined {
  return GEAR_REVIEWS.find((g) => g.slug === slug);
}
