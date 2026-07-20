import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import LegalDocument from "@/components/legal/LegalDocument";
import JsonLd from "@/components/seo/JsonLd";
import { buildPolicyMetadata } from "@/lib/legal/build-policy-metadata";
import { POLICY_PAGES } from "@/lib/legal/policies";
import { buildCanonical, SITE_NAME } from "@/lib/seo/site";

const page = POLICY_PAGES.terms;

export const metadata = buildPolicyMetadata(page);

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.title,
          description: page.description,
          url: buildCanonical("/terms"),
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
