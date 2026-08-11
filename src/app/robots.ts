import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * Public brand pages (/, /store, /chronicles, /blog/*, /advertise, legal)
 * stay crawlable. Member, API, and transactional store paths stay blocked.
 * /invite uses meta robots noindex (not Disallow) so Google can honor noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/api/",
        "/profile",
        "/grocery/",
        "/store/cart",
        "/store/checkout",
        "/store/order/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
