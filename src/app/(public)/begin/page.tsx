import type { Metadata } from "next";
import TopicHubView from "@/components/public/TopicHubView";
import { getHub } from "@/lib/content/hubs";
import { buildCanonical } from "@/lib/seo/site";

const hub = getHub("begin")!;

export const metadata: Metadata = {
  title: hub.title,
  description: hub.description,
  alternates: { canonical: buildCanonical("/begin") },
};

export default function BeginHubPage() {
  return <TopicHubView slug="begin" />;
}
