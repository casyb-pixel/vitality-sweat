import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import LegalDocument from "@/components/legal/LegalDocument";
import JsonLd from "@/components/seo/JsonLd";
import { buildPolicyMetadata } from "@/lib/legal/build-policy-metadata";
import { COMMUNITY_GUIDELINES_PAGE } from "@/lib/legal/terms-2026-08-14";
import { buildCanonical, SITE_NAME } from "@/lib/seo/site";

const page = COMMUNITY_GUIDELINES_PAGE;

export const metadata = buildPolicyMetadata(page);

export default function CommunityGuidelinesPage() {
  return (
    <>
      <Navbar />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.title,
          description: page.description,
          url: buildCanonical("/community-guidelines"),
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: buildCanonical("/"),
          },
        }}
      />
      <main className="bg-surface">
        <div className="section-y site-shell">
          <LegalDocument page={page} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
