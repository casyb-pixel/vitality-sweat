import Navbar from "@/components/Navbar";
import JsonLd from "@/components/seo/JsonLd";
import { buildCanonical, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {children}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${buildCanonical("/search")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </>
  );
}
