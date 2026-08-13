import type { Metadata } from "next";
import TopicHubView from "@/components/public/TopicHubView";
import { getHub } from "@/lib/content/hubs";
import { buildCanonical } from "@/lib/seo/site";

const hub = getHub("compete")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: buildCanonical("/compete") },
};

export default function CompeteHubPage() {
  return <TopicHubView slug="compete" />;
}
