import type { NextConfig } from "next";

/** Known WordPress permalinks that now live under /blog/{slug}. */
const WORDPRESS_LEGACY_SLUGS = [
  "calorie-deficit-weight-loss-golden-rule",
] as const;

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
      ...WORDPRESS_LEGACY_SLUGS.map((slug) => ({
        source: `/${slug}`,
        destination: `/blog/${slug}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
