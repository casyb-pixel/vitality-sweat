export type AffiliatePick = {
  slug: string;
  partner: string;
  network: string;
  label: string;
  destinationUrl: string;
  disclosure: string;
};

export const AFFILIATE_PICKS: AffiliatePick[] = [
  {
    slug: "creatine-monohydrate",
    partner: "Amazon",
    network: "amazon",
    label: "Creatine monohydrate Hunter uses",
    destinationUrl: "https://www.amazon.com/s?k=creatine+monohydrate",
    disclosure:
      "We may earn a commission if you buy through this link. Hunter only lists stuff he actually uses.",
  },
  {
    slug: "whey-protein",
    partner: "Amazon",
    network: "amazon",
    label: "Budget whey for dorm fridges",
    destinationUrl: "https://www.amazon.com/s?k=whey+protein+isolate",
    disclosure:
      "We may earn a commission if you buy through this link. Hunter only lists stuff he actually uses.",
  },
  {
    slug: "electrolyte",
    partner: "Amazon",
    network: "amazon",
    label: "Electrolyte mix for hot SWLA sessions",
    destinationUrl: "https://www.amazon.com/s?k=electrolyte+powder",
    disclosure:
      "We may earn a commission if you buy through this link. Hunter only lists stuff he actually uses.",
  },
  {
    slug: "lifting-straps",
    partner: "Amazon",
    network: "amazon",
    label: "Lifting straps for heavy hinges",
    destinationUrl: "https://www.amazon.com/s?k=lifting+straps",
    disclosure:
      "We may earn a commission if you buy through this link. Hunter only lists stuff he actually uses.",
  },
];

export function getAffiliate(slug: string): AffiliatePick | undefined {
  return AFFILIATE_PICKS.find((p) => p.slug === slug);
}
