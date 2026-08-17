import type { NextConfig } from "next";

/**
 * Known WordPress / Blogger permalinks that now live under /blog/{slug}.
 * Include both slash and no-slash sources. Google still holds trailing-slash
 * ghosts from the old site.
 */
const WORDPRESS_LEGACY_SLUGS = [
  "calorie-deficit-weight-loss-golden-rule",
  "fuel-engine-of-change-mastering-your",
  "fuel-vs-fire-science-of-weight-loss-and",
  "meal-prep-made-easy-step-by-step-guide",
  "splash-into-fun-creative-pool-games-for",
  "unlock-health-benefits-of-fish-rich",
  "infused-water-refreshing-and-nutritious",
  "discover-joy-of-kayaking-ultimate-guide",
  "enhancing-fitness-through-active",
  "the-food-pyramid-critical-look-at-usda",
  "cardio-crush-timing-your-top",
  "glute-goals-transform-your-glutes-with",
  "embrace-your-childs-energy-foster",
  "get-in-game-empower-your-kids-through",
] as const;

function slashPair(source: string, destination: string) {
  const trimmed = source.replace(/\/$/, "") || "/";
  const dest = destination.replace(/\/$/, "") || "/";
  return [
    { source: trimmed, destination: dest, permanent: true as const },
    { source: `${trimmed}/`, destination: dest, permanent: true as const },
  ];
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.cdn.printful.com",
      },
      {
        protocol: "https",
        hostname: "printful-upload.s3-accelerate.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "gjlvqgkgwoqhbonlfkti.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // Prefer apex host with a permanent 301 (not the platform default 307).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vitalitysweat.com" }],
        destination: "https://vitalitysweat.com/:path*",
        statusCode: 301,
      },
      ...slashPair("/contact", "/about"),
      ...slashPair("/hello-world", "/"),
      ...slashPair("/checkout", "/store"),
      ...WORDPRESS_LEGACY_SLUGS.flatMap((slug) =>
        slashPair(`/${slug}`, `/blog/${slug}`),
      ),
      // Blogger dated permalinks, e.g. /2025/03/fuel-engine-of-change-mastering-your.html
      {
        source: "/:year(\\d{4})/:month(\\d{2})/:slug.html",
        destination: "/blog/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
