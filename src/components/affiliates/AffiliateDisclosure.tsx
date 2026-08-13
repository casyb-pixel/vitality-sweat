export const AFFILIATE_DISCLOSURE =
  "Some links are affiliates. We may earn a commission if you buy. Hunter only recommends gear and fuel he actually uses. Logging in the Vitality Engine stays free.";

export default function AffiliateDisclosure({
  extra,
}: {
  extra?: string;
}) {
  return (
    <p className="font-sans text-xs leading-relaxed text-brand-muted">
      {extra?.trim() || AFFILIATE_DISCLOSURE}
    </p>
  );
}
