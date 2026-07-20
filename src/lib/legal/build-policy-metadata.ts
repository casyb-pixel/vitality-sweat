import type { Metadata } from "next";
import type { PolicyPage } from "@/lib/legal/policies";
import { absoluteUrl, buildCanonical, SITE_NAME } from "@/lib/seo/site";

export function buildPolicyMetadata(page: PolicyPage): Metadata {
  const path = `/${page.slug === "return-policy" ? "return-policy" : page.slug}`;
  const canonical = buildCanonical(path);
  const title = page.title;
  const description = page.description;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: absoluteUrl("/images/hero-strength-stamina-collage.png"),
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl("/images/hero-strength-stamina-collage.png")],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
