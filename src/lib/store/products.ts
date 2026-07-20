import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "One Size";

export type StoreProduct = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  price: string;
  currency: string;
  sku: string;
  category: string;
  sizes: ProductSize[];
  featured?: boolean;
  availability: "https://schema.org/InStock" | "https://schema.org/PreOrder";
};

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: "vs-performance-hoodie",
    name: "Performance Hoodie",
    description:
      "Midweight training hoodie with Vitality Sweat mark — warm-up ready, Louisiana-humidity smart.",
    image: "/images/stock/fitness/studio-group-stretch.jpg",
    imageAlt: "Athletes stretching in training apparel",
    price: "68.00",
    currency: "USD",
    sku: "VS-HOOD-001",
    category: "Apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    featured: true,
    availability: "https://schema.org/PreOrder",
  },
  {
    id: "vs-everyday-gym-tee",
    name: "Everyday Gym Tee",
    description:
      "Breathable everyday tee for lifts, lessons, and long days — charcoal wordmark, orange energy.",
    image: "/images/gallery-fitness-gear-flatlay.jpg",
    imageAlt: "Fitness gear flat lay with training apparel",
    price: "32.00",
    currency: "USD",
    sku: "VS-TEE-001",
    category: "Apparel",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    featured: true,
    availability: "https://schema.org/PreOrder",
  },
  {
    id: "vs-insulated-bottle",
    name: "Insulated Water Bottle",
    description:
      "Double-wall bottle that keeps hydration cold through practice, cardio blocks, and road trips.",
    image: "/images/stock/graphics/make-every-drop-count.png",
    imageAlt: "Vitality Sweat make every drop count hydration graphic",
    price: "36.00",
    currency: "USD",
    sku: "VS-BTL-001",
    category: "Accessories",
    sizes: ["One Size"],
    featured: true,
    availability: "https://schema.org/InStock",
  },
  {
    id: "sweatlife-cap",
    name: "Sweatlife Cap",
    description:
      "Structured cap for early lifts and late practices — clean mark, high-impact orange accent.",
    image: "/images/stock/fitness/gear-wakeup-flatlay.jpg",
    imageAlt: "Athlete gear flat lay including cap and training essentials",
    price: "28.00",
    currency: "USD",
    sku: "VS-CAP-001",
    category: "Apparel",
    sizes: ["One Size"],
    availability: "https://schema.org/PreOrder",
  },
  {
    id: "baseball-session-pack",
    name: "Youth Baseball Session Pack",
    description:
      "Digital lesson pack covering pitching, catching, hitting, and fielding fundamentals.",
    image: "/images/stock/sports/baseball-softball-gear.jpg",
    imageAlt: "Baseball and softball gear ready for practice",
    price: "49.00",
    currency: "USD",
    sku: "VS-BASE-PACK",
    category: "Digital Training",
    sizes: ["One Size"],
    availability: "https://schema.org/InStock",
  },
];

export function getFeaturedGear(limit = 4): StoreProduct[] {
  const featured = STORE_PRODUCTS.filter((p) => p.featured);
  const pool = featured.length ? featured : STORE_PRODUCTS;
  return pool.slice(0, limit);
}

export function buildStoreCollectionJsonLd(products: StoreProduct[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${SITE_NAME} Store`,
    description:
      "Official Vitality Sweat branded merchandise — performance hoodies, gym tees, bottles, and training packs.",
    url: absoluteUrl("/store"),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.name,
          description: product.description,
          sku: product.sku,
          image: absoluteUrl(product.image),
          category: product.category,
          brand: {
            "@type": "Brand",
            name: SITE_NAME,
          },
          offers: {
            "@type": "Offer",
            url: absoluteUrl("/store"),
            priceCurrency: product.currency,
            price: product.price,
            availability: product.availability,
          },
        },
      })),
    },
  };
}
