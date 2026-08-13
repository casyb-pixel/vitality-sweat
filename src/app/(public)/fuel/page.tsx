import type { Metadata } from "next";
import TopicHubView from "@/components/public/TopicHubView";
import { getHub } from "@/lib/content/hubs";
import { buildCanonical } from "@/lib/seo/site";

const hub = getHub("fuel")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: buildCanonical("/fuel") },
};

export default function FuelHubPage() {
  return <TopicHubView slug="fuel" />;
}
