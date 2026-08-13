import type { Metadata } from "next";
import PublicPage from "@/components/public/PublicPage";
import JsonLd from "@/components/seo/JsonLd";
import { FOUNDING_PERSON_NAME, buildCanonical } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Hunter Broussard",
  description:
    "Hunter Broussard is the founder of Vitality Sweat, a Southwest Louisiana athlete building the Vitality Engine and Sweatlife Chronicles in public.",
  alternates: { canonical: buildCanonical("/author/hunter-broussard") },
};

export default function AuthorPage() {
  return (
    <PublicPage
      eyebrow="Author"
      title={FOUNDING_PERSON_NAME}
      lede="High-school athlete. Shy on camera. Honest on the page. Hunter edits every Chronicle and trains in the same Engine members use."
    >
      <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-ink">
        This is not a medical review board. Hunter writes coaching notes,
        first-gym stories, baseball work, and fuel that fits a real week. If a
        parent or college athlete contributes later, they write under Hunter as
        editor. Nobody here pretends to be a doctor.
      </p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: FOUNDING_PERSON_NAME,
          url: buildCanonical("/author/hunter-broussard"),
          jobTitle: "Founder, Vitality Sweat",
        }}
      />
    </PublicPage>
  );
}
